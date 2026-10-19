from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any

# Observation schemas
class ObservationBase(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate between -90 and 90")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate between -180 and 180")
    ocean: Optional[str] = None
    region: Optional[str] = None
    subregion: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    marine_setting: Optional[str] = "Ocean water"
    measurement: Optional[float] = None
    unit: Optional[str] = "pieces/m3"
    concentration_class: Optional[str] = "Medium"
    sample_date: Optional[str] = None
    source_type: Optional[str] = "USER_UPLOAD" # NOAA_DATASET, USER_UPLOAD, AI_DETECTION
    organization: Optional[str] = "MarineGuard Contributor"
    notes: Optional[str] = None
    verified_status: Optional[str] = "USER_SUBMITTED" # VERIFIED_SCIENTIFIC, USER_SUBMITTED, AI_PREDICTION

class ObservationCreate(ObservationBase):
    pass

class ObservationOut(ObservationBase):
    id: int
    severity_score: float
    severity_level: str
    detection_id: Optional[int] = None
    created_at: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

# AI Computer Vision schemas
class DetectedObject(BaseModel):
    class_id: int
    class_name: str
    mapped_category: str
    danger_group: str
    confidence: float
    bbox: List[float] # [x1, y1, x2, y2] normalized or pixels
    is_waste: bool

class DetectionResponse(BaseModel):
    image_filename: str
    annotated_image_url: str
    width: int
    height: int
    confidence_threshold: float
    total_detections: int
    plastic_count: int
    organic_count: int
    other_count: int
    detections: List[DetectedObject]
    inference_time_ms: float
    model_name: str
    provenance_disclaimer: str
    detection_record_id: Optional[int] = None

# Severity Assessment Schemas
class SeverityFactorBreakdown(BaseModel):
    concentration_pts: float
    marine_setting_pts: float
    recency_frequency_pts: float
    visual_plastic_pts: float
    total_score: float
    severity_level: str
    calculation_formula: str
    scientific_disclaimer: str

# Hotspot Prioritization Schemas
class HotspotItem(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    ocean: Optional[str] = None
    region: Optional[str] = None
    cluster_id: Optional[int] = None
    observation_count: int
    detected_plastics_count: int
    avg_severity_score: float
    priority_score: float
    priority_level: str
    evidence_summary: str
    repeat_reports_count: int
    status: str
    updated_at: Optional[str] = None

class HotspotPrioritizationConfig(BaseModel):
    eps_km: float = 150.0
    min_samples: int = 5
    density_weight: float = 0.35
    severity_weight: float = 0.30
    recency_weight: float = 0.20
    plastic_detection_weight: float = 0.15

# Cleanup Management Schemas
class CleanupTaskCreate(BaseModel):
    title: str
    hotspot_id: Optional[int] = None
    latitude: float
    longitude: float
    ocean: Optional[str] = None
    region: Optional[str] = None
    target_date: Optional[str] = None
    assigned_team: Optional[str] = "Marine Response Unit"
    priority_level: Optional[str] = "HIGH"
    notes: Optional[str] = None
    evidence_summary: Optional[str] = None

class CleanupTaskUpdate(BaseModel):
    status: Optional[str] = None # PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
    assigned_team: Optional[str] = None
    target_date: Optional[str] = None
    notes: Optional[str] = None

class CleanupTaskOut(BaseModel):
    id: int
    title: str
    hotspot_id: Optional[int] = None
    latitude: float
    longitude: float
    ocean: Optional[str] = None
    region: Optional[str] = None
    target_date: Optional[str] = None
    assigned_team: Optional[str] = None
    priority_level: str
    status: str
    evidence_summary: Optional[str] = None
    notes: Optional[str] = None
    completed_at: Optional[str] = None
    created_at: Optional[str] = None

# In-App Alerts Schemas
class AlertOut(BaseModel):
    id: int
    title: str
    message: str
    severity_level: str
    hotspot_id: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_read: int
    created_at: str

# Dataset Analytics Schemas
class DatasetStats(BaseModel):
    total_records: int
    valid_coordinates_count: int
    invalid_coordinates_count: int
    missing_values_by_column: Dict[str, int]
    duplicate_rows_count: int
    oceans_distribution: Dict[str, int]
    marine_settings_distribution: Dict[str, int]
    concentration_classes_distribution: Dict[str, int]
    date_range: Dict[str, Optional[str]]
    cleaned_dataset_filename: Optional[str] = None
