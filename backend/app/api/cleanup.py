from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from datetime import datetime

from backend.app.core.database import get_db_connection
from backend.app.models.schemas import CleanupTaskCreate, CleanupTaskUpdate, CleanupTaskOut

router = APIRouter(prefix="/cleanup", tags=["Cleanup Planning and Recommendations"])

@router.get("")
async def get_cleanup_tasks(status: Optional[str] = None):
    """Retrieves list of cleanup remediation tasks with status filtering."""
    conn = get_db_connection()
    cursor = conn.cursor()

    if status:
        cursor.execute("SELECT * FROM cleanup_tasks WHERE status = ? ORDER BY id DESC", (status.upper(),))
    else:
        cursor.execute("SELECT * FROM cleanup_tasks ORDER BY id DESC")
    
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.post("", status_code=201)
async def create_cleanup_task(task: CleanupTaskCreate):
    """Creates a new targeted cleanup operation."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO cleanup_tasks (
        title, hotspot_id, latitude, longitude, ocean, region,
        target_date, assigned_team, priority_level, status, evidence_summary, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PLANNED', ?, ?)
    """, (
        task.title,
        task.hotspot_id,
        task.latitude,
        task.longitude,
        task.ocean,
        task.region,
        task.target_date or datetime.now().strftime("%Y-%m-%d"),
        task.assigned_team or "Ocean Clean Response Unit",
        task.priority_level or "HIGH",
        task.evidence_summary or "Field observation prioritized for shoreline remediation.",
        task.notes
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "task_id": new_id,
        "message": f"Cleanup task '{task.title}' planned successfully."
    }

@router.put("/{task_id}")
async def update_cleanup_task(task_id: int, update: CleanupTaskUpdate):
    """Updates cleanup task progress (PLANNED -> IN_PROGRESS -> COMPLETED), team assignment, or notes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM cleanup_tasks WHERE id = ?", (task_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Cleanup task not found.")

    fields = []
    params = []

    if update.status:
        fields.append("status = ?")
        params.append(update.status.upper())
        if update.status.upper() == "COMPLETED":
            fields.append("completed_at = CURRENT_TIMESTAMP")
    if update.assigned_team is not None:
        fields.append("assigned_team = ?")
        params.append(update.assigned_team)
    if update.target_date is not None:
        fields.append("target_date = ?")
        params.append(update.target_date)
    if update.notes is not None:
        fields.append("notes = ?")
        params.append(update.notes)

    if not fields:
        conn.close()
        return {"status": "no change"}

    params.append(task_id)
    cursor.execute(f"UPDATE cleanup_tasks SET {', '.join(fields)} WHERE id = ?", params)
    conn.commit()
    conn.close()

    return {"status": "success", "message": f"Cleanup task #{task_id} updated successfully."}

@router.delete("/{task_id}")
async def delete_cleanup_task(task_id: int):
    """Deletes a cleanup task."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM cleanup_tasks WHERE id = ?", (task_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Cleanup task not found.")
    return {"status": "success", "message": f"Task #{task_id} deleted."}
