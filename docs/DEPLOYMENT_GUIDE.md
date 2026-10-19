# MarineGuard AI – Production Deployment, Backup & Recovery Guide

## 1. System Overview & Architecture
MarineGuard AI is an integrated full-stack environmental monitoring platform:
- **Backend**: FastAPI (Python 3.10+ / 3.13), Uvicorn ASGI, SQLite 3.27+ with WAL indexing, Ultralytics YOLOv8n object detection, scikit-learn DBSCAN (Haversine spatial metric), ReportLab PDF compilation.
- **Frontend**: React 19 + TypeScript, Tailwind CSS v4, Leaflet with Hardware-Accelerated Canvas Rendering, Recharts, Lucide Icons.
- **Data Layer**: 22,530 validated NOAA NCEI marine survey records stored persistently in `marineguard.db` with indexed spatial coordinates, ISO dates, and concentration tiers.

---

## 2. Environment Variables Configuration

Create a `.env` file in the project root:

```env
# Server Binding
HOST=0.0.0.0
PORT=8000
DEBUG=False

# Database Persistence
DATABASE_URL=sqlite:///backend/marineguard.db

# AI Computer Vision
YOLO_MODEL_NAME=yolov8n.pt
CV_CONFIDENCE_DEFAULT=0.35

# Spatial DBSCAN Defaults
DBSCAN_EPS_KM_DEFAULT=150.0
DBSCAN_MIN_SAMPLES_DEFAULT=5

# Production CORS Allowed Origins (Comma-separated)
ALLOWED_ORIGINS=https://marineguard.yourdomain.com,http://localhost:5173
```

---

## 3. Local Execution Commands

### A. Run Backend:
```bash
python run_backend.py
```
*API serves on: `http://127.0.0.1:8000` (Interactive API docs at `http://127.0.0.1:8000/docs`)*

### B. Run Frontend:
```bash
cd frontend
npm install
npm run dev
```
*Frontend dev server serves on: `http://localhost:5173`*

### C. Run Test Suite:
```bash
python -m pytest backend/tests
```

### D. Build Production Frontend:
```bash
cd frontend
npm run build
```
*Output compiled to `frontend/dist/` in < 3 seconds.*

---

## 4. Production Deployment Recommendation

### Recommended Architecture: Single Virtual Machine or Container Service
Because MarineGuard AI includes both a Python ASGI service (FastAPI) and an AI inference engine (PyTorch/YOLOv8n), the simplest and most reliable deployment arrangement is:
1. **Host**: DigitalOcean Droplet, AWS EC2 (t3.medium or larger, minimum 2GB RAM), Google Cloud Compute Engine, or Render/Railway container.
2. **Web Server / Reverse Proxy**: Nginx handling HTTPS/SSL termination and serving `frontend/dist/` static assets, proxying `/api` requests to Uvicorn running on port 8000.
3. **Process Manager**: Systemd or Supervisor managing the Uvicorn process.

### Production Start Command:
```bash
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers 2 --timeout-keep-alive 60
```

---

## 5. Database Backup and Recovery Strategy

### Automated Backup Endpoint:
An administrative snapshot endpoint is provided:
```bash
curl -X POST http://127.0.0.1:8000/api/admin/backup
```
This triggers an instantaneous SQLite `VACUUM INTO` snapshot saved to:
`backend/backups/marineguard_backup_YYYYMMDD_HHMMSS.db`

### Manual Backup Command:
```bash
python -c "from backend.app.core.database import backup_database; print(backup_database())"
```

### Recovery Procedure:
To restore from any backup snapshot:
1. Stop the backend process:
   ```bash
   kill $(pgrep -f "backend.app.main") # Linux
   ```
2. Replace `backend/marineguard.db` with the verified backup:
   ```bash
   cp backend/backups/marineguard_backup_YYYYMMDD_HHMMSS.db backend/marineguard.db
   ```
3. Verify integrity:
   ```bash
   python -c "import sqlite3; conn=sqlite3.connect('backend/marineguard.db'); print('Total rows:', conn.execute('SELECT count(*) FROM observations').fetchone()[0])"
   ```
4. Restart backend:
   ```bash
   python run_backend.py
   ```

---

## 6. Health Check and Monitoring

Endpoint: `GET /api/health`
Returns:
```json
{
  "status": "healthy",
  "database": {
    "status": "connected",
    "total_observations": 22530,
    "total_hotspots": 176
  },
  "ai_engine": {
    "model_name": "yolov8n.pt",
    "status": "loaded_in_cache",
    "framework": "ultralytics_yolo"
  },
  "spatial_clustering": "scikit_learn_dbscan_haversine",
  "version": "2.0.0",
  "timestamp": "2026-10-19T22:20:00.000000"
}
```

---

## 7. Pre-Deployment Verification Checklist

- [x] All 22,530 NOAA microplastic records validated with strictly non-zero, finite WGS 84 coordinates.
- [x] Dates standardized to ISO 8601 `YYYY-MM-DD`.
- [x] DBSCAN spatial clustering executed across all 5 major global ocean basins.
- [x] Leaflet map upgraded with hardware-accelerated Canvas rendering, Points / Clusters / Heatmap toggles.
- [x] Reset-to-extent, tile error handling, and loading state fully implemented.
- [x] Global exception handling and strict coordinate validation active.
- [x] React ErrorBoundary protection wrapped around application pages.
- [x] Pytest suite (18 automated tests) passing with 100% success.
- [x] Frontend TypeScript compilation and Vite production bundle generated without errors.
