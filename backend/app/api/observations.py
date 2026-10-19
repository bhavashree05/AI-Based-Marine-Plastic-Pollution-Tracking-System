from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from backend.app.core.database import get_db_connection
from backend.app.models.schemas import ObservationCreate, ObservationOut
from backend.app.services.severity_engine import calculate_severity_score

router = APIRouter(prefix="/observations", tags=["Geographical Pollution Tracking"])

@router.get("")
async def get_observations(
    ocean: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    marine_setting: Optional[str] = None,
    source_type: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Retrieves paginated list of pollution observations with filtering capabilities."""
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = [
        "latitude IS NOT NULL",
        "longitude IS NOT NULL",
        "latitude BETWEEN -90.0 AND 90.0",
        "longitude BETWEEN -180.0 AND 180.0",
        "NOT (latitude = 0.0 AND longitude = 0.0)"
    ]
    params: List[Any] = []

    if ocean:
        conditions.append("ocean = ?")
        params.append(ocean)
    if severity:
        conditions.append("severity_level = ?")
        params.append(severity.upper())
    if category:
        conditions.append("concentration_class = ?")
        params.append(category)
    if marine_setting:
        conditions.append("marine_setting LIKE ?")
        params.append(f"%{marine_setting}%")
    if source_type:
        conditions.append("source_type = ?")
        params.append(source_type)
    if year_from:
        conditions.append("sample_date >= ?")
        params.append(f"{year_from}-01-01")
    if year_to:
        conditions.append("sample_date <= ?")
        params.append(f"{year_to}-12-31")
    if search:
        conditions.append("(region LIKE ? OR country LIKE ? OR organization LIKE ? OR ocean LIKE ?)")
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param, search_param])

    where_clause = " WHERE " + " AND ".join(conditions)

    # Count total
    cursor.execute(f"SELECT COUNT(*) as count FROM observations {where_clause}", params)
    total_count = cursor.fetchone()['count']

    # Fetch rows
    query = f"""
    SELECT id, object_id, latitude, longitude, ocean, region, subregion, country, state,
           marine_setting, measurement, unit, concentration_class, severity_score,
           severity_level, sample_date, source_type, organization, short_reference,
           detection_id, notes, verified_status, created_at
    FROM observations
    {where_clause}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "data": rows
    }

@router.get("/map-markers")
async def get_map_markers(
    ocean: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    marine_setting: Optional[str] = None,
    source_type: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(2500, ge=1, le=10000)
):
    """
    Lightweight coordinates endpoint optimized for fast Leaflet mapping,
    marker clustering, and heatmap rendering with full metadata for popups.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = [
        "latitude IS NOT NULL",
        "longitude IS NOT NULL",
        "latitude BETWEEN -90.0 AND 90.0",
        "longitude BETWEEN -180.0 AND 180.0",
        "NOT (latitude = 0.0 AND longitude = 0.0)"
    ]
    params: List[Any] = []

    if ocean:
        conditions.append("ocean = ?")
        params.append(ocean)
    if severity:
        conditions.append("severity_level = ?")
        params.append(severity.upper())
    if category:
        conditions.append("concentration_class = ?")
        params.append(category)
    if marine_setting:
        conditions.append("marine_setting LIKE ?")
        params.append(f"%{marine_setting}%")
    if source_type:
        conditions.append("source_type = ?")
        params.append(source_type)
    if year_from:
        conditions.append("sample_date >= ?")
        params.append(f"{year_from}-01-01")
    if year_to:
        conditions.append("sample_date <= ?")
        params.append(f"{year_to}-12-31")
    if search:
        conditions.append("(region LIKE ? OR country LIKE ? OR ocean LIKE ?)")
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param])

    where_clause = " WHERE " + " AND ".join(conditions)
    cursor.execute(f"""
    SELECT id, latitude, longitude, ocean, region, country, marine_setting,
           measurement, unit, concentration_class, severity_score, severity_level,
           sample_date, source_type, organization, verified_status, notes
    FROM observations
    {where_clause}
    LIMIT ?
    """, params + [limit])
    
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.get("/{obs_id}")
async def get_observation_by_id(obs_id: int):
    """Returns detailed information for a single observation record."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM observations WHERE id = ?", (obs_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Observation not found.")
    return dict(row)

@router.post("", status_code=201)
async def create_observation(obs: ObservationCreate):
    """
    Creates a new pollution observation with strict coordinate validation,
    transparent severity computation, and source recording.
    """
    # Strict coordinate validation
    if not (-90.0 <= obs.latitude <= 90.0 and -180.0 <= obs.longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90; Longitude between -180 and 180.")

    if obs.latitude == 0.0 and obs.longitude == 0.0:
        raise HTTPException(status_code=400, detail="Coordinates (0.0, 0.0) are rejected as invalid placeholder locations.")

    # Calculate severity score
    sev = calculate_severity_score(
        concentration_class=obs.concentration_class,
        measurement=obs.measurement,
        marine_setting=obs.marine_setting,
        detected_plastics_count=0,
        observation_age_years=0.0
    )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO observations (
        latitude, longitude, ocean, region, subregion, country, state,
        marine_setting, measurement, unit, concentration_class, severity_score,
        severity_level, sample_date, source_type, organization, notes, verified_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        obs.latitude,
        obs.longitude,
        obs.ocean or "Coastal / Nearshore",
        obs.region,
        obs.subregion,
        obs.country,
        obs.state,
        obs.marine_setting,
        obs.measurement,
        obs.unit,
        obs.concentration_class,
        sev["severity_score"],
        sev["severity_level"],
        obs.sample_date or "2026-04-15",
        obs.source_type or "USER_UPLOAD",
        obs.organization or "Field Observer",
        obs.notes,
        obs.verified_status or "USER_SUBMITTED"
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "id": new_id,
        "severity_score": sev["severity_score"],
        "severity_level": sev["severity_level"],
        "message": f"Observation created successfully with {sev['severity_level']} severity."
    }

@router.delete("/{obs_id}")
async def delete_observation(obs_id: int):
    """Deletes an observation record."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM observations WHERE id = ?", (obs_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Observation not found.")
    return {"status": "success", "message": f"Observation #{obs_id} deleted."}
