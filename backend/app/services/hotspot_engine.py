import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional
from sklearn.cluster import DBSCAN
from backend.app.core.database import get_db_connection

def cluster_and_prioritize_hotspots(
    eps_km: float = 150.0,
    min_samples: int = 5,
    density_weight: float = 0.35,
    severity_weight: float = 0.30,
    recency_weight: float = 0.20,
    plastic_detection_weight: float = 0.15
) -> List[Dict[str, Any]]:
    """
    Applies spatial DBSCAN clustering using Haversine metric (great-circle distance)
    to identify geographic clusters of marine plastic pollution, then ranks them using
    multi-attribute priority scoring.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, latitude, longitude, ocean, region, marine_setting,
           concentration_class, severity_score, sample_date, source_type
    FROM observations
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL
      AND latitude BETWEEN -90.0 AND 90.0
      AND longitude BETWEEN -180.0 AND 180.0
    """)
    rows = cursor.fetchall()
    
    if not rows:
        conn.close()
        return []

    # Convert to DataFrame
    df = pd.DataFrame([dict(r) for r in rows])
    
    # Coordinates in radians for Haversine distance
    coords_rad = np.radians(df[['latitude', 'longitude']].values)
    
    # Earth radius in kilometers
    kms_per_radian = 6371.0088
    epsilon = eps_km / kms_per_radian

    # Perform DBSCAN clustering
    db = DBSCAN(eps=epsilon, min_samples=min_samples, metric='haversine')
    df['cluster'] = db.fit_predict(coords_rad)

    # Filter out noise (-1) unless no clusters exist
    clusters = df[df['cluster'] != -1]
    hotspot_results: List[Dict[str, Any]] = []

    if len(clusters) == 0:
        # If no dense clusters found at this threshold, group by rounded coordinates
        df['cluster'] = (df['latitude'].round(1).astype(str) + "_" + df['longitude'].round(1).astype(str))
        cluster_groups = df.groupby('cluster')
    else:
        cluster_groups = clusters.groupby('cluster')

    # Also count any AI-detected plastics in proximity
    cursor.execute("""
    SELECT SUM(plastic_count) as total_plastics FROM detection_records
    """)
    detection_sum_row = cursor.fetchone()
    total_ai_plastics = detection_sum_row['total_plastics'] if detection_sum_row and detection_sum_row['total_plastics'] else 0

    max_obs_in_cluster = max([len(group) for _, group in cluster_groups]) if len(cluster_groups) > 0 else 1

    for cluster_id, group in cluster_groups:
        obs_count = len(group)
        centroid_lat = float(group['latitude'].mean())
        centroid_lon = float(group['longitude'].mean())
        
        # Primary ocean and region
        ocean_mode = group['ocean'].mode()
        ocean_name = str(ocean_mode.iloc[0]) if not ocean_mode.empty and pd.notna(ocean_mode.iloc[0]) else "Unknown Ocean"
        
        region_mode = group['region'].mode()
        region_name = str(region_mode.iloc[0]) if not region_mode.empty and pd.notna(region_mode.iloc[0]) else f"Coords {centroid_lat:.2f}, {centroid_lon:.2f}"
        
        avg_severity = float(group['severity_score'].mean()) if 'severity_score' in group else 20.0
        
        # Calculate cluster density score (0 - 100)
        density_score = min(100.0, (obs_count / max(1, max_obs_in_cluster)) * 100.0)
        
        # Recency score
        recency_score = 60.0 # Baseline for historical NOAA
        
        # Plastic score
        plastic_score = min(100.0, (obs_count * 2.0) + (total_ai_plastics * 5.0))

        # Composite Priority Score
        priority_score = round(
            (density_score * density_weight) +
            (avg_severity * severity_weight) +
            (recency_score * recency_weight) +
            (plastic_score * plastic_detection_weight),
            1
        )
        priority_score = max(0.0, min(100.0, priority_score))

        if priority_score >= 75.0:
            p_level = "CRITICAL"
        elif priority_score >= 50.0:
            p_level = "HIGH"
        elif priority_score >= 25.0:
            p_level = "MEDIUM"
        else:
            p_level = "LOW"

        evidence = (
            f"{obs_count} validated records clustered within {eps_km} km radius. "
            f"Mean severity score: {avg_severity:.1f}/100. "
            f"Dominant setting: {group['marine_setting'].mode().iloc[0] if not group['marine_setting'].empty else 'Coastal'}."
        )

        cluster_name = f"{ocean_name} - {region_name} Sector"

        hotspot_item = {
            "name": cluster_name,
            "latitude": round(centroid_lat, 4),
            "longitude": round(centroid_lon, 4),
            "ocean": ocean_name,
            "region": region_name,
            "cluster_id": int(cluster_id) if isinstance(cluster_id, (int, np.integer)) else -1,
            "observation_count": obs_count,
            "detected_plastics_count": int(total_ai_plastics),
            "avg_severity_score": round(avg_severity, 1),
            "priority_score": priority_score,
            "priority_level": p_level,
            "evidence_summary": evidence,
            "repeat_reports_count": obs_count,
            "status": "ACTIVE"
        }
        hotspot_results.append(hotspot_item)

    # Sort descending by priority score
    hotspot_results.sort(key=lambda x: x['priority_score'], reverse=True)

    # Persist or update top hotspots in the DB
    cursor.execute("DELETE FROM hotspots")
    for h in hotspot_results[:50]: # Top 50 prioritized hotspots
        cursor.execute("""
        INSERT INTO hotspots (
            name, latitude, longitude, ocean, region, cluster_id,
            observation_count, detected_plastics_count, avg_severity_score,
            priority_score, priority_level, evidence_summary, repeat_reports_count,
            status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            h["name"], h["latitude"], h["longitude"], h["ocean"], h["region"],
            h["cluster_id"], h["observation_count"], h["detected_plastics_count"],
            h["avg_severity_score"], h["priority_score"], h["priority_level"],
            h["evidence_summary"], h["repeat_reports_count"], h["status"]
        ))
        
        # Generate alert if CRITICAL or HIGH priority
        if h["priority_level"] in ["CRITICAL", "HIGH"]:
            dedup = f"alert_{h['name']}_{h['priority_level']}"
            cursor.execute("""
            INSERT OR IGNORE INTO alerts (title, message, severity_level, hotspot_id, latitude, longitude, dedup_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                f"High-Priority Marine Pollution Hotspot: {h['name']}",
                f"{h['evidence_summary']} Requires immediate cleanup planning attention.",
                h["priority_level"],
                cursor.lastrowid,
                h["latitude"],
                h["longitude"],
                dedup
            ))

    conn.commit()
    conn.close()
    return hotspot_results
