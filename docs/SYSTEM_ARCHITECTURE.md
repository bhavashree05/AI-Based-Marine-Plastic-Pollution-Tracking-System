# MarineGuard AI – System Architecture & Technical Specification

## 1. High-Level Architectural Overview

MarineGuard AI employs a decoupled client-server architecture designed for high-throughput spatial query processing, deep-learning computer vision inference, and responsive geospatial map visualization.

```mermaid
graph TD
    subgraph Client ["Frontend Client (React + Vite + TypeScript)"]
        UI_Nav["Sidebar & Navigation Shell"]
        UI_Map["Leaflet GIS Map (OpenStreetMap / CartoDB)"]
        UI_CV["AI Detection Studio (YOLOv8 Interface)"]
        UI_Analytics["Recharts Diagnostic Charts & Missingness Profiler"]
        UI_Hotspots["DBSCAN Hotspot Parameter Tuning Panel"]
        UI_Cleanup["Remediation Task Management (Kanban)"]
        UI_Alerts["Alert Notification Engine & PDF Exporter"]
    end

    subgraph Server ["Backend Application (Python + FastAPI)"]
        API_Gateway["FastAPI ASGI Gateway (CORS, Lifespan, Pydantic v2)"]
        
        subgraph Services ["Analytical & Model Services"]
            CV_Service["cv_detector.py (Ultralytics YOLOv8n + OpenCV)"]
            Hotspot_Service["hotspot_engine.py (DBSCAN + Haversine Radius)"]
            Severity_Service["severity_engine.py (Multi-Criteria Heuristic)"]
            Data_Service["data_processor.py (Pandas Cleaning & Validation)"]
            Report_Service["report_generator.py (ReportLab PDF & CSV Engine)"]
        end
    end

    subgraph Storage ["Persistence & Data Assets"]
        DB[(SQLite3 Database / PostGIS Compatible)]
        NOAA_CSV["NOAA Marine Microplastics Dataset (22,530 Records)"]
        Uploads_Dir["Image Uploads & Annotated Cache"]
        Reports_Dir["Executive Environmental Briefings (.pdf, .csv)"]
    end

    Client -->|RESTful JSON & Multipart HTTP| API_Gateway
    API_Gateway --> Services
    Services --> Storage
```

## 2. Core Architectural Layers

### 2.1 Presentation Layer (Frontend)
- **Framework**: React 19 with Vite bundler and TypeScript.
- **Styling**: Tailwind CSS v4 with `@tailwindcss/vite` integration.
- **Visual Design**: Dark marine aesthetic (deep navy `#060b13`, cyan/teal accents, glassmorphic card overlays, customized scrollbars, and accessible typography).
- **Geospatial Rendering**: Leaflet with custom color-coded circle markers for severity levels (Emerald: Low, Amber: Medium, Orange: High, Rose: Critical).
- **Analytics Visualization**: Recharts library for bar charts, pie donuts, and historical trend timelines.

### 2.2 Application Services Layer (Backend)
- **ASGI Web Engine**: FastAPI running on Uvicorn.
- **Computer Vision Subsystem**: Ultralytics YOLOv8n single-stage neural network with OpenCV/Pillow annotation pipeline.
- **Spatial Clustering Engine**: Scikit-learn DBSCAN with Haversine spherical distance metric (radians converted using earth radius $R = 6,371\text{ km}$).
- **Transparent Severity Evaluator**: Rule-based scoring engine attributing points to concentration magnitude, marine setting sensitivity, computer vision plastic count, and observation recency.
- **Data Preprocessor**: Pandas DataFrame ingestion, coordinate bounds checks $(-90 \le \text{lat} \le 90, -180 \le \text{lon} \le 180)$, missingness analysis, and duplicate purge.
- **Report Engine**: ReportLab PDF document compilation and CSV streaming.

### 2.3 Persistence Layer
- **Relational Database**: SQLite3 with thread-safe connection pooling, row factories, and indexed spatial/severity columns.
- **Database Schema**:
  1. `observations`: Coordinate survey records, ocean basin, concentration class, severity score, verified status, and provenance tags.
  2. `detection_records`: Image metadata, detected bounding boxes JSON, confidence threshold, inference latency ms, and plastic counts.
  3. `hotspots`: Clustered geographic sectors, observation count, priority score (0-100), evidence summary, and cleanup status.
  4. `cleanup_tasks`: Actionable remediation operations, assigned teams, target deadlines, and status workflow (PLANNED -> IN_PROGRESS -> COMPLETED).
  5. `alerts`: In-app notification triggers with deduplication hashes.
