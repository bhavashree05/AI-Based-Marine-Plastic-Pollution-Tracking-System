# MarineGuard AI – Intelligent Marine Plastic Pollution Monitoring & Tracking System

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_Vite_TS-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![YOLOv8](https://img.shields.io/badge/AI_Inference-Ultralytics_YOLOv8-FF7F00?logo=github&logoColor=white)](https://github.com/ultralytics/ultralytics)
[![Leaflet](https://img.shields.io/badge/Mapping-Leaflet_OpenStreetMap-199900?logo=leaflet&logoColor=white)](https://leafletjs.com)
[![Dataset](https://img.shields.io/badge/Data-NOAA_NCEI_Microplastics-005596?logo=satellite&logoColor=white)](https://www.ncei.noaa.gov)

> **College Project Name**: MarineGuard AI – Intelligent Marine Plastic Pollution Monitoring and Tracking System  
> **Target Audience**: Environmental Research Organizations, Coastal Municipal Cleanup Units, B.Tech Project Guides & Viva Examiners.

---

## 1. Project Abstract

Marine plastic pollution is one of the most critical anthropogenic threats to oceanic ecosystems, food webs, and coastal economies. Traditional debris monitoring suffers from fragmented reporting, delayed scientific surveys, lack of spatial clustering, and subjective visual estimations. 

**MarineGuard AI** is a full-stack, production-ready environmental decision-support system. It integrates:
1. **Computer Vision (YOLOv8n)** for single-stage object detection of macroscopic plastic waste (bottles, cups, cutlery, containers, and synthetic packaging).
2. **Geographical Information Systems (GIS)** via Leaflet and OpenStreetMap, loaded with the authentic NOAA NCEI Global Marine Microplastics Dataset ($22,530+$ observations).
3. **Spatial Machine Learning** utilizing DBSCAN with great-circle Haversine spherical distance to identify persistent oceanic and coastal pollution hotspots.
4. **Transparent Multi-Criteria Severity Modeling** attributing environmental points across concentration magnitude, habitat ecological sensitivity, computer vision debris counts, and temporal recency.
5. **Operational Cleanup Management** with an interactive Kanban workflow, task assignments, and 1-click executive PDF report generation.

---

## 2. Key Modules & Features

| Module | Feature Set | Technologies |
|---|---|---|
| **Module 1: AI Plastic Detection** | Photograph upload (JPG/PNG), YOLOv8 neural inference, class mapping to marine debris categories, confidence slider ($10-95\%$), bounding box visualization, annotated image export, and coordinate linking. | Ultralytics YOLOv8n, OpenCV, Pillow |
| **Module 2: Geographical Tracking** | Interactive dark marine map, $2,500+$ real-time markers, color-coded severity tiers, ocean/severity filters, coordinate click inspector, and observation logging. | Leaflet, OpenStreetMap, CartoDB |
| **Module 3: Dataset Integration & Analytics** | CSV dataset upload, missingness profiling (% null per column), duplicate detection, coordinate bounds validation, and automated data cleaning pipeline. | Pandas, NumPy, Recharts |
| **Module 4: Severity Assessment** | Transparent multi-criteria heuristic ($0-100$ pts) across 4 documented components (Concentration, Habitat, Visual Waste, Recency). Clear mathematical breakdown without blackbox claims. | Python Core Engine |
| **Module 5: Hotspot Prioritization** | Spherical DBSCAN clustering with tunable cluster radius $\epsilon$ ($30-500\text{ km}$), minimum samples, and multi-attribute weights. Evidence summaries for every sector. | Scikit-learn DBSCAN (Haversine) |
| **Module 6: Trend Analysis** | Historical survey cruise trends ($1980\text{s}-2026$), decade distributions, regional comparisons, and clearly labeled experimental forecast simulations. | Pandas, Recharts |
| **Module 7: Cleanup Orchestration** | Actionable remediation tracking (Planned $\rightarrow$ In Progress $\rightarrow$ Completed), team assignment, target dates, confetti celebration on completion, and progress indicators. | Canvas-Confetti, React State |
| **Module 8: Alerts & Reports** | In-app alerts for critical hotspots, deduplication hash protection, and 1-click Executive PDF Briefing generator with methodology and limitations notes. | ReportLab, CSV Exporter |
| **Module 9: Viva Voce & Architecture** | Complete B.Tech viva cheat sheet (10 examiner questions & answers), interactive architectural block diagrams, and academic report documentation. | Markdown, Lucide React |

---

## 3. Technology Stack Rationale

- **Frontend**: React 19, TypeScript, and Vite for modern reactive state management and instant HMR bundling.
- **Styling**: Tailwind CSS v4 using `@tailwindcss/vite` with a curated deep marine palette (`#060b13`, ocean blue, teal, emerald, amber, rose) and glassmorphism.
- **Backend**: Python 3.13 with FastAPI for asynchronous ASGI request handling, native Pydantic v2 validation schemas, and automated Swagger OpenAPI documentation at `/docs`.
- **Computer Vision**: Ultralytics YOLOv8n. Chosen for its single-stage CSPDarknet architecture that balances fast forward-pass latency ($\approx 30-60\text{ ms}$) with robust detection of consumer plastic items.
- **Spatial Clustering**: Scikit-learn DBSCAN with Haversine metric, calculating spherical great-circle distances across the Earth's curvature ($R = 6,371\text{ km}$).
- **Database**: SQLite with indexed spatial coordinates and thread-safe row factories, designed with a clean data-access layer ready for immediate PostgreSQL + PostGIS scaling.
- **Reporting**: ReportLab for executive PDF compilation.

---

## 4. Directory & Folder Structure

```text
AI-Based Marine Plastic Pollution Tracking System/
├── backend/
│   ├── app/
│   │   ├── api/                   # REST API Routers
│   │   │   ├── detection.py       # YOLOv8 Upload, Sample Test, Coordinate Link
│   │   │   ├── observations.py    # CRUD & Optimized Map Markers
│   │   │   ├── analytics.py       # CSV Upload, Missingness, Cleaning
│   │   │   ├── hotspots.py        # DBSCAN Clustered Hotspots API
│   │   │   ├── trends.py          # Historical Timeline & Regional Breakdown
│   │   │   ├── cleanup.py         # Task Status Management & Assignments
│   │   │   ├── alerts.py          # In-App Notifications & Acknowledgment
│   │   │   └── reports.py         # Executive PDF & CSV Report Generators
│   │   ├── core/
│   │   │   ├── config.py          # Paths, Class Mappings, Thresholds
│   │   │   └── database.py        # SQLite Connection & Table Migrations
│   │   ├── models/
│   │   │   └── schemas.py         # Pydantic v2 Request/Response Schemas
│   │   ├── services/
│   │   │   ├── cv_detector.py     # YOLOv8 Inference & OpenCV Annotation
│   │   │   ├── data_processor.py  # Pandas Profiling, Cleaning, NOAA Seeder
│   │   │   ├── hotspot_engine.py  # DBSCAN + Haversine Prioritization
│   │   │   ├── severity_engine.py # Multi-Criteria Environmental Scoring
│   │   │   └── report_generator.py# ReportLab PDF Document Builder
│   │   └── main.py                # FastAPI Application & Lifespan Handler
│   ├── data/                      # Active Datasets & Static File Storage
│   │   ├── noaa_marine_microplastics.csv # Authentic NOAA NCEI Dataset (16.5 MB)
│   │   ├── sample_images/         # Verified Coastal Beach Plastic Photographs
│   │   ├── uploads/               # User-submitted Photographs
│   │   ├── annotated/             # Computer Vision Bounding Box Outputs
│   │   ├── cleaned/               # Preprocessed & Validated CSV Exports
│   │   └── reports/               # Compiled Executive PDF Documents
│   └── tests/                     # Comprehensive Backend Pytest Suite
│       ├── test_api.py            # API Endpoint Integration Tests
│       ├── test_data_processing.py# Missingness, Duplicates & Coordinates
│       └── test_scoring.py        # Severity Engine Factor Breakdown Tests
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI Elements (Navbar, Sidebar, Map, Badges)
│   │   ├── pages/                 # 8 Dedicated Application Views
│   │   ├── services/              # Typed Fetch API Client (api.ts)
│   │   ├── types/                 # TypeScript Data Contracts (index.ts)
│   │   ├── App.tsx                # Main Application Shell
│   │   ├── main.tsx               # DOM Mounting Entrypoint
│   │   └── index.css              # Tailwind v4 Theme & Glassmorphic CSS
│   ├── package.json
│   ├── tsconfig.app.json
│   └── vite.config.ts             # Tailwind v4 & Backend API Proxy Configuration
├── docs/                          # Academic Defense Documentation
│   ├── SYSTEM_ARCHITECTURE.md     # Architecture Diagrams & Layer Descriptions
│   ├── DATA_FLOW.md               # End-to-End Sequence Diagrams
│   ├── UML_USE_CASE.md            # UML Actors & Use Case Diagrams
│   └── VIVA_QUESTIONS_AND_ANSWERS.md # 10 Critical Examiner Q&A Guide
├── run_backend.py                 # Convenience Python Runner
├── requirements.txt               # Backend Python Dependencies
├── .env.example                   # Environment Variables Template
└── README.md                      # Comprehensive Project Documentation
```

---

## 5. Installation & Execution Guide

### Prerequisites
- Python 3.10+ (Tested on Python 3.13)
- Node.js 18+ (Tested on Node.js v24)
- Git

### Step 1: Clone or Open Workspace
```bash
cd "AI-Based Marine Plastic Pollution Tracking System"
```

### Step 2: Backend Setup
```bash
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Run backend test suite (verify 100% test pass)
python -m pytest backend/tests -v -p no:cacheprovider

# 3. Start the FastAPI backend server
python run_backend.py
```
*The backend will automatically initialize `marineguard.db`, seed real baseline NOAA records, and run initial spatial clustering on start.*  
*Backend will be running at:* `http://127.0.0.1:8000` (Swagger UI at `http://127.0.0.1:8000/docs`).

### Step 3: Frontend Setup
Open a separate terminal window:
```bash
cd frontend

# 1. Install frontend packages
npm install

# 2. Verify TypeScript build
npm run build

# 3. Start Vite development server
npm run dev
```
*Frontend application will be live at:* `http://127.0.0.1:5173/`.

---

## 6. Testing & Quality Verification

MarineGuard AI includes automated test suites covering data processing, severity attribution, and API status codes:

```bash
python -m pytest backend/tests -v -p no:cacheprovider
```

**Test Coverage Highlights:**
- `test_health_endpoint`: Asserts database, YOLO model, and DBSCAN readiness.
- `test_analytics_overview`: Validates KPI aggregation calculations.
- `test_map_markers`: Asserts lightweight coordinates serialization for high-performance mapping.
- `test_observations_pagination`: Tests pagination and boundary limits.
- `test_hotspots_endpoint`: Tests DBSCAN cluster retrieval.
- `test_alerts_endpoint`: Tests notification retrieval and deduplication.
- `test_create_observation_validation_error`: Asserts coordinate bounds validation (rejects latitude $> 90^{\circ}$).
- `test_data_inspection`: Validates missingness percentages and duplicate detection.
- `test_data_cleaning`: Tests automated purging of empty columns and duplicates.
- `test_severity_score_critical`: Tests scoring boundaries for severe pollution.
- `test_severity_score_low`: Tests lower boundary score conditions.
- `test_factor_breakdown_bounds`: Tests that mathematical components remain bounded within $[0, 100]$.

---

## 7. College Project Report Sections

### 7.1 Existing System Limitations
1. **Disjointed Observations**: Coastal cleanup programs frequently rely on paper logbooks or scattered spreadsheets without unified GIS coordinates.
2. **Subjective Severity Ratings**: Existing platforms use uncalibrated user ratings that classify minor litter as "extreme" and vice-versa.
3. **No Visual Object Localization**: Traditional survey tools cannot automatically identify what types of plastic (bottles vs. cups vs. packaging) are present in submitted photographs.
4. **Flat Spatial Assumptions**: Many clustering algorithms assume flat planar coordinates rather than spherical geodetic geometry, distorting distances in higher latitudes.

### 7.2 Proposed System Advantages
1. **Authentic Data Foundation**: Pre-seeded with $22,530+$ verified observations from NOAA National Centers for Environmental Information (NCEI).
2. **Neural Detection Pipeline**: Integrates YOLOv8 to automatically detect and classify floating debris with bounding boxes and confidence scores.
3. **Scientific Transparency**: Clearly marks predictions as `AI_PREDICTION` vs. scientific data (`VERIFIED_SCIENTIFIC`), preventing falsified scientific claims.
4. **Spherical DBSCAN Clustering**: Uses the Haversine formula on spherical coordinates to locate real-world accumulation sectors.
5. **Closed-Loop Action**: Seamlessly transitions from hotspot identification to team assignment, target dates, and progress tracking.

### 7.3 Conclusion & Future Scope
MarineGuard AI establishes a demonstrable standard for environmental software engineering. By merging deep learning, GIS, and transparent multi-attribute scoring, it provides decision-makers with an operational, trustworthy tool to monitor and protect marine habitats.

**Future Scope:**
1. Integration with European Space Agency (ESA) Sentinel-2 satellite multi-spectral imagery using the Floating Debris Index (FDI).
2. Ocean hydrodynamic drift simulation using Lagrangian particle tracking (OceanParcels) driven by Copernicus ocean current vectors.
3. Quantized ONNX edge deployment on autonomous surface vessels (ASVs) and underwater ROVs.

---

## 8. License & Acknowledgments
- **Dataset**: NOAA NCEI Marine Microplastics Database (Public Domain, US Government).
- **Object Detection**: Ultralytics YOLOv8 (AGPL-3.0 / Enterprise).
- **Basemaps**: OpenStreetMap contributors & CARTO.
- **Academic Context**: Developed for undergraduate B.Tech Computer Science / AI & ML major project defense.
