import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Zero-dependency .env file loader for local development
def _load_env_file():
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k, v = k.strip(), v.strip()
                        if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                            v = v[1:-1]
                        if k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

_load_env_file()

DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
ANNOTATED_DIR = DATA_DIR / "annotated"
CLEANED_DIR = DATA_DIR / "cleaned"
REPORTS_DIR = DATA_DIR / "reports"

# Ensure directories exist
for directory in [DATA_DIR, UPLOAD_DIR, ANNOTATED_DIR, CLEANED_DIR, REPORTS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'marineguard.db'}")

# Default Dataset Path
DEFAULT_DATASET_PATH = DATA_DIR / "noaa_marine_microplastics.csv"

# AI Model Configuration
CV_CONFIDENCE_DEFAULT = float(os.getenv("CV_CONFIDENCE_DEFAULT", "0.35"))
YOLO_MODEL_NAME = os.getenv("YOLO_MODEL_NAME", "yolov8n.pt")

# Waste / Marine debris class mappings for YOLO/COCO
# COCO standard categories related to waste, plastic, and maritime debris
WASTE_CLASS_MAPPING = {
    # Plastic & packaging waste
    "bottle": {"category": "Plastic Bottle", "group": "Plastic Waste", "danger_weight": 0.8},
    "cup": {"category": "Plastic/Disposable Cup", "group": "Plastic Waste", "danger_weight": 0.75},
    "fork": {"category": "Plastic Cutlery", "group": "Plastic Waste", "danger_weight": 0.7},
    "knife": {"category": "Plastic Cutlery", "group": "Plastic Waste", "danger_weight": 0.7},
    "spoon": {"category": "Plastic Cutlery", "group": "Plastic Waste", "danger_weight": 0.7},
    "bowl": {"category": "Plastic Container", "group": "Plastic Waste", "danger_weight": 0.75},
    "toothbrush": {"category": "Plastic Hygiene Waste", "group": "Plastic Waste", "danger_weight": 0.85},
    
    # Synthetic & debris litter
    "handbag": {"category": "Synthetic Bag / Fabric", "group": "General Debris", "danger_weight": 0.6},
    "backpack": {"category": "Synthetic Gear", "group": "General Debris", "danger_weight": 0.6},
    "sports ball": {"category": "Polymer/Rubber Litter", "group": "Polymer Waste", "danger_weight": 0.65},
    
    # Maritime vessels & coastal observation context
    "boat": {"category": "Vessel / Patrol Context", "group": "Observation Context", "danger_weight": 0.0},
    "surfboard": {"category": "Recreational Context", "group": "Observation Context", "danger_weight": 0.0},
    "bird": {"category": "Avian Wildlife (Ecosystem Monitor)", "group": "Fauna Context", "danger_weight": 0.0},
}

# Severity Configuration Defaults
SEVERITY_THRESHOLDS = {
    "LOW": 25.0,
    "MEDIUM": 50.0,
    "HIGH": 75.0,
    "CRITICAL": 100.0,
}

# Hotspot DBSCAN defaults
DBSCAN_EPS_KM_DEFAULT = float(os.getenv("DBSCAN_EPS_KM_DEFAULT", "150.0"))  # 150 km cluster radius
DBSCAN_MIN_SAMPLES_DEFAULT = int(os.getenv("DBSCAN_MIN_SAMPLES_DEFAULT", "5"))

