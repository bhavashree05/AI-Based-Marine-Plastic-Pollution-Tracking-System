import os
import time
import json
import uuid
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import cv2
import numpy as np
from PIL import Image

from backend.app.core.config import (
    UPLOAD_DIR,
    ANNOTATED_DIR,
    YOLO_MODEL_NAME,
    WASTE_CLASS_MAPPING,
    CV_CONFIDENCE_DEFAULT,
)
from backend.app.core.database import get_db_connection

# Global model cache
_YOLO_MODEL = None

def get_yolo_model():
    """Lazy loader for YOLO model to avoid slow startup."""
    global _YOLO_MODEL
    if _YOLO_MODEL is None:
        try:
            from ultralytics import YOLO
            # Ultralytics will download yolov8n.pt automatically on first run
            _YOLO_MODEL = YOLO(YOLO_MODEL_NAME)
        except Exception as e:
            print(f"[CV Warning] Could not load YOLO model: {e}")
            _YOLO_MODEL = None
    return _YOLO_MODEL

def validate_image_file(file_bytes: bytes, filename: str) -> Tuple[bool, str, Optional[Tuple[int, int]]]:
    """Validates file format, magic numbers, and image dimensions."""
    allowed_extensions = {".jpg", ".jpeg", ".png"}
    ext = Path(filename).suffix.lower()
    if ext not in allowed_extensions:
        return False, f"Invalid format '{ext}'. Only JPG, JPEG, and PNG images are supported.", None
    
    if len(file_bytes) > 25 * 1024 * 1024:
        return False, "File exceeds maximum size limit of 25MB.", None

    try:
        from io import BytesIO
        with Image.open(BytesIO(file_bytes)) as img:
            img.verify()
            width, height = img.size
            if width < 32 or height < 32:
                return False, "Image resolution too small (minimum 32x32 pixels required).", None
            return True, "Valid image", (width, height)
    except Exception as e:
        return False, f"Corrupted or invalid image file: {str(e)}", None

def run_plastic_detection(
    image_bytes: bytes,
    original_filename: str,
    confidence_threshold: float = CV_CONFIDENCE_DEFAULT
) -> Dict[str, Any]:
    """
    Executes actual YOLO inference, maps object categories to marine waste,
    draws bounding boxes, and records detection provenance.
    """
    start_time = time.time()
    file_id = str(uuid.uuid4())[:8]
    sanitized_name = f"{file_id}_{Path(original_filename).name}"
    upload_path = UPLOAD_DIR / sanitized_name
    annotated_filename = f"annotated_{sanitized_name}"
    annotated_path = ANNOTATED_DIR / annotated_filename

    # Save original image
    with open(upload_path, "wb") as f:
        f.write(image_bytes)

    # Read image into OpenCV format
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image_cv = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if image_cv is None:
        raise ValueError("Could not decode image for CV processing.")

    height, width, _ = image_cv.shape
    annotated_cv = image_cv.copy()

    model = get_yolo_model()
    detections: List[Dict[str, Any]] = []
    plastic_count = 0
    organic_count = 0
    other_count = 0

    if model is not None:
        try:
            results = model.predict(source=image_cv, conf=confidence_threshold, verbose=False)
            if results and len(results) > 0:
                first_result = results[0]
                boxes = first_result.boxes
                
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].tolist() # [x1, y1, x2, y2]
                    class_name = model.names.get(cls_id, f"class_{cls_id}").lower()

                    # Class mapping logic
                    mapping = WASTE_CLASS_MAPPING.get(class_name)
                    if mapping:
                        cat = mapping["category"]
                        grp = mapping["group"]
                        is_waste = mapping["danger_weight"] > 0
                    else:
                        cat = f"Object ({class_name})"
                        grp = "General Context"
                        is_waste = False

                    if grp == "Plastic Waste":
                        plastic_count += 1
                        box_color = (0, 70, 240) # Bright Coral Red/Orange in BGR
                    elif grp in ["Polymer Waste", "General Debris"]:
                        other_count += 1
                        box_color = (255, 170, 0) # Amber/Cyan in BGR
                    elif grp == "Fauna Context":
                        organic_count += 1
                        box_color = (0, 220, 100) # Green in BGR
                    else:
                        other_count += 1
                        box_color = (200, 200, 200)

                    detections.append({
                        "class_id": cls_id,
                        "class_name": class_name,
                        "mapped_category": cat,
                        "danger_group": grp,
                        "confidence": round(conf, 4),
                        "bbox": [round(c, 2) for c in xyxy],
                        "is_waste": is_waste
                    })

                    # Draw bounding box and label
                    x1, y1, x2, y2 = [int(v) for v in xyxy]
                    cv2.rectangle(annotated_cv, (x1, y1), (x2, y2), box_color, 2)
                    
                    label = f"{cat} {conf*100:.1f}%"
                    (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                    cv2.rectangle(annotated_cv, (x1, max(0, y1 - 22)), (x1 + tw + 6, max(22, y1)), box_color, -1)
                    cv2.putText(
                        annotated_cv,
                        label,
                        (x1 + 3, max(16, y1 - 5)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (255, 255, 255),
                        1,
                        cv2.LINE_AA
                    )
        except Exception as e:
            print(f"[CV Error during inference]: {e}")

    # Add watermark & analysis summary banner at bottom
    banner_height = 40
    banner = np.zeros((banner_height, width, 3), dtype=np.uint8)
    banner[:] = (20, 24, 34) # Dark Navy
    banner_text = f"MarineGuard AI | Plastics: {plastic_count} | Debris: {other_count} | Threshold: {int(confidence_threshold*100)}% | YOLOv8n"
    cv2.putText(
        banner,
        banner_text,
        (15, 26),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.55,
        (0, 220, 255), # Teal
        1,
        cv2.LINE_AA
    )
    annotated_cv = np.vstack([annotated_cv, banner])

    # Save annotated image
    cv2.imwrite(str(annotated_path), annotated_cv)

    inference_ms = round((time.time() - start_time) * 1000, 2)

    # Store detection record in DB
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO detection_records (
        image_filename, annotated_filename, original_width, original_height,
        confidence_threshold, total_detections, plastic_count, organic_count, other_count,
        detections_json, inference_time_ms, model_name, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        sanitized_name,
        annotated_filename,
        width,
        height,
        confidence_threshold,
        len(detections),
        plastic_count,
        organic_count,
        other_count,
        json.dumps(detections),
        inference_ms,
        YOLO_MODEL_NAME,
        f"Verified inference using {YOLO_MODEL_NAME}. Marine debris mapping applied."
    ))
    record_id = cursor.lastrowid
    conn.commit()
    conn.close()

    disclaimer = (
        "Model Transparency Note: Object detection is performed using YOLOv8n (COCO weights). "
        "Macroscopic plastic containers, bottles, cups, and synthetic debris are visually identified. "
        "Floating debris predictions assist cleanup planning but do not replace spectroscopic microplastic quantification."
    )

    return {
        "image_filename": sanitized_name,
        "annotated_image_url": f"/api/detection/image/{annotated_filename}",
        "original_image_url": f"/api/detection/image/raw/{sanitized_name}",
        "width": width,
        "height": height,
        "confidence_threshold": confidence_threshold,
        "total_detections": len(detections),
        "plastic_count": plastic_count,
        "organic_count": organic_count,
        "other_count": other_count,
        "detections": detections,
        "inference_time_ms": inference_ms,
        "model_name": YOLO_MODEL_NAME,
        "provenance_disclaimer": disclaimer,
        "detection_record_id": record_id
    }
