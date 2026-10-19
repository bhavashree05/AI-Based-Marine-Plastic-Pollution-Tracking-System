from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path

from backend.app.core.config import REPORTS_DIR
from backend.app.services.report_generator import (
    generate_pdf_environmental_report,
    generate_csv_export
)

router = APIRouter(prefix="/reports", tags=["Reporting and Exports"])

@router.post("/generate-pdf")
async def create_pdf_report():
    """Generates an executive PDF report containing metrics, hotspot analysis, and scientific limitations."""
    try:
        pdf_path = generate_pdf_environmental_report()
        return {
            "status": "success",
            "filename": pdf_path.name,
            "download_url": f"/api/reports/download-pdf/{pdf_path.name}",
            "message": "PDF Environmental Report successfully compiled."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF report generation error: {str(e)}")

@router.get("/download-pdf/{filename}")
async def download_pdf_report(filename: str):
    """Serves the generated PDF report."""
    file_path = REPORTS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found.")
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf"
    )

@router.get("/export-csv")
async def export_csv_observations():
    """Generates and serves a CSV dump of recorded observations."""
    try:
        csv_path = generate_csv_export()
        return FileResponse(
            path=csv_path,
            filename=csv_path.name,
            media_type="text/csv"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"CSV export failed: {str(e)}")

@router.get("/list")
async def list_available_reports():
    """Lists previously generated PDF and CSV reports."""
    reports = []
    if REPORTS_DIR.exists():
        for f in sorted(REPORTS_DIR.glob("*.*"), key=lambda p: p.stat().st_mtime, reverse=True):
            reports.append({
                "filename": f.name,
                "size_kb": round(f.stat().st_size / 1024, 1),
                "type": "PDF" if f.suffix == ".pdf" else "CSV",
                "download_url": f"/api/reports/download-pdf/{f.name}" if f.suffix == ".pdf" else f"/api/reports/download-cleaned/{f.name}"
            })
    return reports
