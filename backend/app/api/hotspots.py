from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any

from backend.app.core.database import get_db_connection
from backend.app.models.schemas import HotspotPrioritizationConfig
from backend.app.services.hotspot_engine import cluster_and_prioritize_hotspots

router = APIRouter(prefix="/hotspots", tags=["Intelligent Hotspot Prioritization"])

@router.get("")
async def get_hotspots(
    priority_level: Optional[str] = None,
    ocean: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100)
):
    """Retrieves prioritized marine pollution hotspots sorted by priority score."""
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = []
    params = []

    if priority_level:
        conditions.append("priority_level = ?")
        params.append(priority_level.upper())
    if ocean:
        conditions.append("ocean = ?")
        params.append(ocean)

    where_clause = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    query = f"""
    SELECT id, name, latitude, longitude, ocean, region, cluster_id,
           observation_count, detected_plastics_count, avg_severity_score,
           priority_score, priority_level, evidence_summary, repeat_reports_count,
           status, updated_at
    FROM hotspots
    {where_clause}
    ORDER BY priority_score DESC
    LIMIT ?
    """
    params.append(limit)
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    # If database has no hotspots yet, calculate them on-the-fly
    if not rows and not priority_level and not ocean:
        rows = cluster_and_prioritize_hotspots()[:limit]

    return rows

@router.post("/recalculate")
async def recalculate_hotspots(config: HotspotPrioritizationConfig):
    """
    Reruns spatial DBSCAN clustering and priority scoring using user-configured
    parameters (eps_km radius, min_samples, and multi-attribute weights).
    """
    try:
        results = cluster_and_prioritize_hotspots(
            eps_km=config.eps_km,
            min_samples=config.min_samples,
            density_weight=config.density_weight,
            severity_weight=config.severity_weight,
            recency_weight=config.recency_weight,
            plastic_detection_weight=config.plastic_detection_weight
        )
        return {
            "status": "success",
            "message": f"Successfully clustered and prioritized {len(results)} hotspots.",
            "hotspots_count": len(results),
            "top_hotspots": results[:10]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Hotspot recalculation error: {str(e)}")

@router.post("/{hotspot_id}/schedule-cleanup")
async def schedule_cleanup_from_hotspot(hotspot_id: int):
    """Creates a planned cleanup task directly from a prioritized hotspot."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM hotspots WHERE id = ?", (hotspot_id,))
    hotspot = cursor.fetchone()
    if not hotspot:
        conn.close()
        raise HTTPException(status_code=404, detail="Hotspot not found.")

    title = f"Coastal Remediation - {hotspot['name']}"
    cursor.execute("""
    INSERT INTO cleanup_tasks (
        title, hotspot_id, latitude, longitude, ocean, region,
        target_date, assigned_team, priority_level, status, evidence_summary, notes
    ) VALUES (?, ?, ?, ?, ?, ?, date('now', '+14 days'), 'Marine Response Team Alpha', ?, 'PLANNED', ?, ?)
    """, (
        title,
        hotspot_id,
        hotspot['latitude'],
        hotspot['longitude'],
        hotspot['ocean'],
        hotspot['region'],
        hotspot['priority_level'],
        hotspot['evidence_summary'],
        f"Generated from Prioritized Hotspot #{hotspot_id} with score {hotspot['priority_score']}."
    ))
    task_id = cursor.lastrowid
    
    # Update hotspot status
    cursor.execute("UPDATE hotspots SET status = 'CLEANUP_SCHEDULED' WHERE id = ?", (hotspot_id,))
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "task_id": task_id,
        "message": f"Cleanup task #{task_id} successfully scheduled for {hotspot['name']}."
    }
