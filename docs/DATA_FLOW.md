# MarineGuard AI – Data Flow Specification

## 1. End-to-End Data Ingestion and Inference Pipeline

The following sequence details how photographs and tabular ocean survey records travel from client upload through AI inference, database persistence, and spatial visualization.

```mermaid
sequenceDiagram
    autonumber
    actor User as Environmental Researcher / Cleanup Lead
    participant Web as React Frontend (Vite)
    participant API as FastAPI Backend Gateway
    participant CV as YOLOv8 Computer Vision Engine
    participant DB as SQLite / PostGIS Storage
    participant Cluster as DBSCAN Hotspot Engine

    %% Module 1: Image Upload & AI Inference
    Note over User, CV: Module 1: Image Upload & Computer Vision Inference
    User->>Web: Upload Beach Photograph (JPG/PNG) & Set Threshold (e.g., 35%)
    Web->>API: POST /api/detection/upload (multipart/form-data)
    API->>API: Validate file magic bytes, format, & dimensions
    API->>CV: Execute YOLOv8 forward pass (predict bounding boxes)
    CV->>CV: Map COCO classes to Marine Debris categories
    CV->>CV: Draw high-contrast bounding boxes & info banner
    CV->>DB: INSERT into detection_records (classes, counts, latency)
    CV-->>API: Return JSON (detections, plastic_count, annotated_url)
    API-->>Web: Render Annotated Image & Detections Table

    %% Link to Map
    opt Convert Detection into Observation
        User->>Web: Click "Save as Observation" + Enter Coordinates
        Web->>API: POST /api/detection/convert-to-observation
        API->>DB: INSERT into observations (source='AI_DETECTION')
    end

    %% Module 2: Spatial Clustering & Prioritization
    Note over User, Cluster: Module 5: Spatial Clustering & Prioritization
    User->>Web: Adjust DBSCAN Radius (eps_km) & Min Samples
    Web->>API: POST /api/hotspots/recalculate
    API->>Cluster: Execute DBSCAN with Haversine distance
    Cluster->>Cluster: Compute Cluster Centroids, Density, & Priority Score
    Cluster->>DB: REPLACE INTO hotspots & INSERT critical alerts
    Cluster-->>Web: Return Ranked Hotspots with Evidence Summaries

    %% Module 3: Remediation Workflow
    Note over User, DB: Module 7: Cleanup Orchestration
    User->>Web: Click "Schedule Cleanup" from Hotspot Card
    Web->>API: POST /api/cleanup
    API->>DB: INSERT INTO cleanup_tasks (status='PLANNED')
    Web-->>User: Trigger Interactive Celebration (Confetti on COMPLETED)
```

## 2. Tabular Dataset Data Processing Flow

1. **Ingestion**: User uploads a CSV file via `POST /api/analytics/upload-csv`.
2. **Schema & Missingness Inspection**:
   - Computes null count and percentage per column.
   - Detects entirely empty columns.
   - Checks duplicate rows using hash comparison.
3. **Coordinate Bounds Validation**:
   - Validates latitude in $[-90.0, 90.0]$ and longitude in $[-180.0, 180.0]$.
   - Filters malformed entries while recording provenance.
4. **Data Cleaning & Standardization**:
   - Parses dates into standardized ISO datetime formats.
   - Saves cleaned dataset copy to `backend/data/cleaned/` with instant download URL.
