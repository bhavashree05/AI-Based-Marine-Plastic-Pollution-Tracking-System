from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from typing import Optional, List, Dict, Any
from pathlib import Path

from backend.app.core.config import UPLOAD_DIR, ANNOTATED_DIR, CV_CONFIDENCE_DEFAULT, DATA_DIR
from backend.app.core.database import get_db_connection
from backend.app.services.cv_detector import validate_image_file, run_plastic_detection
from backend.app.services.severity_engine import calculate_severity_score

SAMPLE_DIR = DATA_DIR / "sample_images"

router = APIRouter(prefix="/detection", tags=["AI Plastic Detection"])

@router.get("/sample-images")
async def list_sample_images():
    """Lists available pre-loaded sample marine debris images for instant evaluation."""
    samples = []
    if SAMPLE_DIR.exists():
        for img in SAMPLE_DIR.glob("*.jpg"):
            samples.append({
                "name": img.name,
                "label": "Coastal Beach Plastic & Styrofoam Debris",
                "url": f"/api/detection/sample-image/{img.name}"
            })
    return samples

@router.get("/sample-image/{filename}")
async def get_sample_image(filename: str):
    """Serves sample test images."""
    file_path = SAMPLE_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Sample image not found.")
    return FileResponse(path=file_path, media_type="image/jpeg")

@router.post("/detect-sample")
async def detect_sample_image(
    filename: str = "beach_plastic_sample.jpg",
    confidence_threshold: float = Form(CV_CONFIDENCE_DEFAULT)
):
    """Executes YOLO detection directly on a pre-loaded sample image."""
    file_path = SAMPLE_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Sample '{filename}' not found.")
    
    with open(file_path, "rb") as f:
        content = f.read()

    return run_plastic_detection(
        image_bytes=content,
        original_filename=filename,
        confidence_threshold=confidence_threshold
    )

@router.post("/upload")
async def detect_plastics(
    file: UploadFile = File(...),
    confidence_threshold: float = Form(CV_CONFIDENCE_DEFAULT)
):
    """
    Validates uploaded image, runs YOLOv8 model inference for plastic waste identification,
    generates annotated image with bounding boxes, and logs detection record.
    """
    if not (0.05 <= confidence_threshold <= 0.99):
        raise HTTPException(status_code=400, detail="Confidence threshold must be between 0.05 and 0.99")

    content = await file.read()
    is_valid, msg, dims = validate_image_file(content, file.filename or "upload.jpg")
    if not is_valid:
        raise HTTPException(status_code=400, detail=msg)

    try:
        result = run_plastic_detection(
            image_bytes=content,
            original_filename=file.filename or "marine_debris.jpg",
            confidence_threshold=confidence_threshold
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI Computer Vision inference failed: {str(e)}")

@router.get("/history")
async def get_detection_history(limit: int = 20):
    """Returns recent AI detection inferences with plastic counts and latency."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, image_filename, annotated_filename, confidence_threshold,
           total_detections, plastic_count, other_count, inference_time_ms,
           model_name, created_at
    FROM detection_records
    ORDER BY id DESC
    LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.get("/image/{filename}")
async def get_annotated_image(filename: str):
    """Serves the annotated image with computer vision bounding boxes."""
    file_path = ANNOTATED_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Annotated image file not found.")
    return FileResponse(path=file_path, media_type="image/jpeg")

@router.get("/image/raw/{filename}")
async def get_raw_image(filename: str):
    """Serves the original uploaded image."""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Original image file not found.")
    return FileResponse(path=file_path, media_type="image/jpeg")

@router.post("/convert-to-observation")
async def convert_detection_to_observation(
    detection_id: int = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    ocean: Optional[str] = Form(None),
    region: Optional[str] = Form(None),
    marine_setting: Optional[str] = Form("Beach"),
    notes: Optional[str] = Form(None)
):
    """Allows user to attach coordinates to an AI detection result and store it as a verified observation."""
    if not (-90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Invalid coordinates.")

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM detection_records WHERE id = ?", (detection_id,))
    det = cursor.fetchone()
    if not det:
        conn.close()
        raise HTTPException(status_code=404, detail="Detection record not found.")

    plastic_count = det['plastic_count']
    sev = calculate_severity_score(
        concentration_class="High" if plastic_count >= 5 else "Medium" if plastic_count >= 1 else "Low",
        marine_setting=marine_setting,
        detected_plastics_count=plastic_count,
        observation_age_years=0.0
    )

    cursor.execute("""
    INSERT INTO observations (
        latitude, longitude, ocean, region, marine_setting,
        measurement, unit, concentration_class, severity_score, severity_level,
        sample_date, source_type, organization, detection_id, notes, verified_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, ?, ?)
    """, (
        latitude,
        longitude,
        ocean or "Coastal Waters",
        region or "Observation Sector",
        marine_setting,
        float(plastic_count),
        "visual_objects",
        "High" if plastic_count >= 5 else "Medium",
        sev["severity_score"],
        sev["severity_level"],
        "AI_DETECTION",
        "MarineGuard Drone / Field Cam",
        detection_id,
        notes or f"Observation created from AI detection #{detection_id} with {plastic_count} plastic objects identified.",
        "AI_PREDICTION"
    ))
    obs_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "observation_id": obs_id,
        "message": f"Detection converted into Observation #{obs_id} with severity {sev['severity_level']}."
    }
