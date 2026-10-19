from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any

from backend.app.core.database import get_db_connection

router = APIRouter(prefix="/alerts", tags=["In-App Alerts"])

@router.get("")
async def get_alerts(
    severity: Optional[str] = None,
    unread_only: bool = False,
    limit: int = Query(50, ge=1, le=100)
):
    """Retrieves in-app pollution alerts for critical and high-priority hotspots."""
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = []
    params = []

    if severity:
        conditions.append("severity_level = ?")
        params.append(severity.upper())
    if unread_only:
        conditions.append("is_read = 0")

    where_clause = (" WHERE " + " AND ".join(conditions)) if conditions else ""
    query = f"""
    SELECT id, title, message, severity_level, hotspot_id, latitude, longitude, is_read, created_at
    FROM alerts
    {where_clause}
    ORDER BY id DESC
    LIMIT ?
    """
    params.append(limit)
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.put("/{alert_id}/read")
async def mark_alert_read(alert_id: int):
    """Marks an alert as acknowledged/read."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE alerts SET is_read = 1 WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()
    return {"status": "success", "alert_id": alert_id}

@router.put("/mark-all-read")
async def mark_all_alerts_read():
    """Marks all pending alerts as read."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE alerts SET is_read = 1 WHERE is_read = 0")
    count = cursor.rowcount
    conn.commit()
    conn.close()
    return {"status": "success", "marked_count": count}
