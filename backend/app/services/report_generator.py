import os
import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

from backend.app.core.config import REPORTS_DIR
from backend.app.core.database import get_db_connection

def generate_pdf_environmental_report() -> Path:
    """Generates a comprehensive scientific and operational PDF report with metrics and limitations."""
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_filename = f"MarineGuard_Executive_Report_{timestamp_str}.pdf"
    pdf_path = REPORTS_DIR / pdf_filename

    conn = get_db_connection()
    cursor = conn.cursor()

    # Query statistics
    cursor.execute("SELECT COUNT(*) as total_obs FROM observations")
    total_obs = cursor.fetchone()['total_obs']

    cursor.execute("SELECT COUNT(DISTINCT ocean) as total_oceans FROM observations WHERE ocean IS NOT NULL")
    total_oceans = cursor.fetchone()['total_oceans']

    cursor.execute("SELECT COUNT(*) as total_detects, SUM(plastic_count) as total_plastics FROM detection_records")
    det_row = cursor.fetchone()
    total_detects = det_row['total_detects'] or 0
    total_plastics = det_row['total_plastics'] or 0

    cursor.execute("SELECT COUNT(*) as total_hotspots, SUM(CASE WHEN priority_level='CRITICAL' THEN 1 ELSE 0 END) as crit_hotspots FROM hotspots")
    hot_row = cursor.fetchone()
    total_hotspots = hot_row['total_hotspots'] or 0
    crit_hotspots = hot_row['crit_hotspots'] or 0

    cursor.execute("SELECT status, COUNT(*) as count FROM cleanup_tasks GROUP BY status")
    cleanup_counts = {r['status']: r['count'] for r in cursor.fetchall()}

    # Top 5 Hotspots
    cursor.execute("SELECT name, ocean, observation_count, priority_score, priority_level FROM hotspots ORDER BY priority_score DESC LIMIT 5")
    top_hotspots = cursor.fetchall()

    conn.close()

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F2942') # Deep Navy
    )
    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=colors.HexColor('#5A6B7C')
    )
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor('#0284C7'), # Ocean Blue
        spaceBefore=12,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1E293B')
    )
    notice_style = ParagraphStyle(
        'NoticeBox',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#334155')
    )

    story = []

    # Header
    story.append(Paragraph("MarineGuard AI – Environmental Intelligence & Cleanup Report", title_style))
    story.append(Paragraph(f"Generated on {datetime.now().strftime('%B %d, %Y at %H:%M:%S UTC')} | Data Source: NOAA NCEI & Verified Observations", subtitle_style))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0284C7'), spaceBefore=2, spaceAfter=14))

    # Executive Summary
    story.append(Paragraph("1. Executive Summary & Key Metrics", h2_style))
    summary_data = [
        ["Total Validated Observations", f"{total_obs:,}", "Global Ocean Basins Monitored", f"{total_oceans}"],
        ["Computer Vision Inferences", f"{total_detects}", "Detected Macroscopic Plastics", f"{total_plastics}"],
        ["Prioritized Hotspots", f"{total_hotspots}", "Critical Cleanup Hotspots", f"{crit_hotspots}"],
        ["Cleanup Tasks Planned", f"{cleanup_counts.get('PLANNED', 0)}", "Cleanup Completed", f"{cleanup_counts.get('COMPLETED', 0)}"],
    ]
    t_summary = Table(summary_data, colWidths=[180, 80, 190, 80])
    t_summary.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F0F7FF')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#0F2942')),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BFDBFE')),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(t_summary)
    story.append(Spacer(1, 14))

    # Priority Hotspots
    story.append(Paragraph("2. Top Prioritized Marine Debris Hotspots", h2_style))
    hotspot_table_data = [["Hotspot Sector", "Ocean", "Records", "Priority Score", "Severity Level"]]
    for h in top_hotspots:
        hotspot_table_data.append([
            h['name'][:30],
            h['ocean'],
            str(h['observation_count']),
            f"{h['priority_score']:.1f}/100",
            h['priority_level']
        ])
    
    t_hotspots = Table(hotspot_table_data, colWidths=[200, 110, 60, 80, 80])
    t_hotspots.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0F2942')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('ALIGN', (2, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(t_hotspots)
    story.append(Spacer(1, 14))

    # Methodology & Viva Explanations
    story.append(Paragraph("3. Scientific Methodology & Decision Support Transparency", h2_style))
    method_text = (
        "<b>Spatial Clustering (DBSCAN):</b> Employs Density-Based Spatial Clustering of Applications with Noise "
        "using the Haversine trigonometric distance formula to detect geographical clusters across the Earth's spherical curvature.<br/>"
        "<b>Computer Vision (YOLOv8):</b> Employs single-stage deep neural network object detection to locate macroscopic "
        "marine debris (bottles, cups, containers, synthetic packaging) with real-time bounding box localization.<br/>"
        "<b>Decision Support Notice:</b> The priority scores and severity ratings generated by MarineGuard AI serve as "
        "decision-support guidance for non-profit cleanups, municipal coastal authorities, and researchers. They combine "
        "observation density, marine setting vulnerability, and visual plastic counts, but are not a substitute for chemical mass-spectroscopy."
    )
    story.append(Paragraph(method_text, body_style))
    story.append(Spacer(1, 14))

    # Limitations & Disclaimers
    story.append(Paragraph("4. Known Data Limitations & Operational Boundaries", h2_style))
    limits_text = (
        "1. <b>Sampling Bias:</b> Coastal beach transects and volunteer nurdle patrols reflect areas accessible by volunteers, "
        "which can lead to higher recorded counts near populated coastlines compared to remote open ocean gyres.<br/>"
        "2. <b>Computer Vision Detection Bounds:</b> YOLOv8 detects macroscopic floating plastic items (>2 cm). "
        "Microplastics (<5 mm) are invisible to standard RGB cameras and are represented via laboratory data feeds.<br/>"
        "3. <b>Forecast Experimental Status:</b> Trend forecasts are experimental heuristic projections based on historical sampling rates."
    )
    story.append(Paragraph(limits_text, notice_style))

    doc.build(story)
    return pdf_path

def generate_csv_export() -> Path:
    """Exports observations to CSV format."""
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    csv_filename = f"MarineGuard_Observations_Export_{timestamp_str}.csv"
    csv_path = REPORTS_DIR / csv_filename

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, latitude, longitude, ocean, region, subregion, country, state,
           marine_setting, measurement, unit, concentration_class, severity_score,
           severity_level, sample_date, source_type, organization, verified_status
    FROM observations
    LIMIT 10000
    """)
    rows = cursor.fetchall()
    conn.close()

    if rows:
        headers = list(rows[0].keys())
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            for r in rows:
                writer.writerow(list(r))
    else:
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            f.write("id,latitude,longitude,ocean,severity_score,severity_level\n")

    return csv_path
