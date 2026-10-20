import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.database import init_db
from backend.app.core.config import UPLOAD_DIR, ANNOTATED_DIR, CLEANED_DIR, REPORTS_DIR
from backend.app.services.data_processor import seed_database_from_noaa, seed_tamil_nadu_coastal_observations
from backend.app.services.hotspot_engine import cluster_and_prioritize_hotspots

# Import API Routers
from backend.app.api.detection import router as detection_router
from backend.app.api.observations import router as observations_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.hotspots import router as hotspots_router
from backend.app.api.trends import router as trends_router
from backend.app.api.cleanup import router as cleanup_router
from backend.app.api.alerts import router as alerts_router
from backend.app.api.reports import router as reports_router

from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import Request
from fastapi.responses import JSONResponse
from backend.app.core.database import backup_database, get_db_connection

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes tables, seeds dataset if needed, and computes initial hotspots."""
    print("[MarineGuard] Initializing database schema...")
    init_db()

    print("[MarineGuard] Checking NOAA baseline dataset...")
    seeded = seed_database_from_noaa()
    tn_seeded = seed_tamil_nadu_coastal_observations()
    print(f"[MarineGuard] Database active with {seeded} validated observations ({tn_seeded} TN coastal stations).")

    print("[MarineGuard] Running initial spatial hotspot prioritization...")
    try:
        hotspots = cluster_and_prioritize_hotspots(eps_km=150.0, min_samples=5)
        print(f"[MarineGuard] Generated {len(hotspots)} prioritized pollution hotspots.")
    except Exception as e:
        print(f"[MarineGuard Warning] Hotspot clustering during startup deferred: {e}")
    yield

app = FastAPI(
    title="MarineGuard AI – Marine Plastic Pollution Tracking System",
    description="Intelligent marine debris monitoring, YOLO computer vision inference, DBSCAN hotspot clustering, and cleanup orchestration backend.",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Middleware configuration
# Supports ALLOWED_ORIGINS or CORS_ORIGINS from environment, with default fallback to wildcard
allowed_origins_raw = os.getenv("ALLOWED_ORIGINS") or os.getenv("CORS_ORIGINS") or "*"
origins = [o.strip() for o in allowed_origins_raw.split(",") if o.strip()] if allowed_origins_raw != "*" else ["*"]

if origins == ["*"]:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[MarineGuard Unhandled Error on {request.url.path}]: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred while processing the marine pollution tracking request.",
            "error_type": type(exc).__name__,
            "path": str(request.url.path),
            "timestamp": datetime.now().isoformat()
        }
    )

# Include Subrouters under /api
app.include_router(detection_router, prefix="/api")
app.include_router(observations_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(hotspots_router, prefix="/api")
app.include_router(trends_router, prefix="/api")
app.include_router(cleanup_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(reports_router, prefix="/api")

@app.get("/")
def root():
    return {
        "system": "MarineGuard AI – Marine Plastic Pollution Monitoring API",
        "status": "Operational",
        "documentation": "/docs",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/health")
def health_check():
    """Detailed health check endpoint reporting DB connectivity and AI inference status."""
    db_status = "connected"
    total_obs = 0
    total_hotspots = 0
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as cnt FROM observations")
        total_obs = cursor.fetchone()['cnt']
        cursor.execute("SELECT COUNT(*) as cnt FROM hotspots")
        total_hotspots = cursor.fetchone()['cnt']
        conn.close()
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"

    from backend.app.services.cv_detector import _YOLO_MODEL
    ai_status = "loaded_in_cache" if _YOLO_MODEL is not None else "ready_on_demand"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": {
            "status": db_status,
            "total_observations": total_obs,
            "total_hotspots": total_hotspots
        },
        "ai_engine": {
            "model_name": "yolov8n.pt",
            "status": ai_status,
            "framework": "ultralytics_yolo"
        },
        "spatial_clustering": "scikit_learn_dbscan_haversine",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/admin/backup")
def trigger_backup():
    """Triggers an instantaneous, recoverable snapshot of the database."""
    try:
        backup_file = backup_database()
        return {
            "status": "success",
            "backup_file": backup_file,
            "timestamp": datetime.now().isoformat(),
            "message": "Database backup created successfully."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database backup failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8000, reload=True)
