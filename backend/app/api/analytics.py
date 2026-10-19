from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from typing import Dict, Any, List
from pathlib import Path
import tempfile

from backend.app.core.config import UPLOAD_DIR, CLEANED_DIR
from backend.app.core.database import get_db_connection
from backend.app.services.data_processor import (
    inspect_dataset_file,
    clean_and_process_dataset,
    seed_database_from_noaa
)

router = APIRouter(prefix="/analytics", tags=["Dataset Integration and Analytics"])

@router.get("/overview")
async def get_analytics_overview():
    """Returns high-level KPI metrics for the overview dashboard."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Total observations
    cursor.execute("SELECT COUNT(*) as cnt FROM observations")
    total_obs = cursor.fetchone()['cnt']

    # 2. Distinct locations
    cursor.execute("SELECT COUNT(DISTINCT (ROUND(latitude, 1) || '_' || ROUND(longitude, 1))) as cnt FROM observations")
    distinct_locs = cursor.fetchone()['cnt']

    # 3. Model inferences and detected objects
    cursor.execute("SELECT COUNT(*) as total_inferences, SUM(plastic_count) as total_plastics FROM detection_records")
    cv_row = cursor.fetchone()
    total_inferences = cv_row['total_inferences'] or 0
    total_detected_plastics = cv_row['total_plastics'] or 0

    # 4. High-priority hotspots
    cursor.execute("SELECT COUNT(*) as cnt FROM hotspots WHERE priority_level IN ('CRITICAL', 'HIGH')")
    high_priority_hotspots = cursor.fetchone()['cnt']

    # 5. Cleanup tasks summary
    cursor.execute("SELECT status, COUNT(*) as cnt FROM cleanup_tasks GROUP BY status")
    cleanup_tasks = {r['status']: r['cnt'] for r in cursor.fetchall()}
    total_cleanups = sum(cleanup_tasks.values())
    completed_cleanups = cleanup_tasks.get("COMPLETED", 0)

    # 6. Unread alerts
    cursor.execute("SELECT COUNT(*) as cnt FROM alerts WHERE is_read = 0")
    unread_alerts = cursor.fetchone()['cnt']

    conn.close()

    return {
        "total_observations": total_obs,
        "distinct_locations": distinct_locs,
        "total_ai_inferences": total_inferences,
        "total_detected_plastics": total_detected_plastics,
        "high_priority_hotspots": high_priority_hotspots,
        "total_cleanup_tasks": total_cleanups,
        "completed_cleanups": completed_cleanups,
        "unread_alerts": unread_alerts,
        "provenance_note": "Metrics aggregate verified NOAA NCEI marine survey data and real-time AI computer vision inferences."
    }

@router.get("/distributions")
async def get_distributions():
    """Returns distributions across ocean basins, concentration classes, and marine settings."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Ocean distribution
    cursor.execute("""
    SELECT COALESCE(ocean, 'Unknown') as name, COUNT(*) as count
    FROM observations
    GROUP BY ocean
    ORDER BY count DESC
    LIMIT 10
    """)
    oceans = [dict(r) for r in cursor.fetchall()]

    # Concentration class distribution
    cursor.execute("""
    SELECT COALESCE(concentration_class, 'Unclassified') as name, COUNT(*) as count
    FROM observations
    GROUP BY concentration_class
    ORDER BY count DESC
    """)
    conc_classes = [dict(r) for r in cursor.fetchall()]

    # Marine setting distribution
    cursor.execute("""
    SELECT COALESCE(marine_setting, 'Unspecified') as name, COUNT(*) as count
    FROM observations
    GROUP BY marine_setting
    ORDER BY count DESC
    LIMIT 10
    """)
    marine_settings = [dict(r) for r in cursor.fetchall()]

    # Severity distribution
    cursor.execute("""
    SELECT severity_level as name, COUNT(*) as count
    FROM observations
    GROUP BY severity_level
    ORDER BY CASE severity_level
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
        ELSE 5 END
    """)
    severities = [dict(r) for r in cursor.fetchall()]

    conn.close()

    return {
        "oceans": oceans,
        "concentration_classes": conc_classes,
        "marine_settings": marine_settings,
        "severity_levels": severities
    }

@router.post("/upload-csv")
async def upload_csv_dataset(file: UploadFile = File(...)):
    """Handles dataset upload, validates CSV schema, inspects missing values and duplicates."""
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV format is supported.")

    content = await file.read()
    temp_path = UPLOAD_DIR / f"uploaded_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(content)

    try:
        report = inspect_dataset_file(temp_path)
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to inspect CSV dataset: {str(e)}")

@router.post("/clean-csv")
async def clean_csv_dataset(filename: str):
    """Executes data cleaning pipeline on an uploaded CSV file."""
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found.")

    try:
        result = clean_and_process_dataset(filepath)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Data cleaning failed: {str(e)}")

@router.get("/download-cleaned/{filename}")
async def download_cleaned_dataset(filename: str):
    """Serves the cleaned and validated dataset for download."""
    clean_path = CLEANED_DIR / filename
    if not clean_path.exists():
        raise HTTPException(status_code=404, detail="Cleaned file not found.")
    return FileResponse(path=clean_path, filename=filename, media_type="text/csv")
