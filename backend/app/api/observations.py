from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from backend.app.core.database import get_db_connection
from backend.app.models.schemas import ObservationCreate, ObservationOut
from backend.app.services.severity_engine import calculate_severity_score

router = APIRouter(prefix="/observations", tags=["Geographical Pollution Tracking"])

@router.get("")
async def get_observations(
    ocean: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    marine_setting: Optional[str] = None,
    source_type: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0)
):
    """Retrieves paginated list of pollution observations with filtering capabilities."""
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = [
        "latitude IS NOT NULL",
        "longitude IS NOT NULL",
        "latitude BETWEEN -90.0 AND 90.0",
        "longitude BETWEEN -180.0 AND 180.0",
        "NOT (latitude = 0.0 AND longitude = 0.0)"
    ]
    params: List[Any] = []

    if ocean:
        conditions.append("ocean = ?")
        params.append(ocean)
    if severity:
        conditions.append("severity_level = ?")
        params.append(severity.upper())
    if category:
        conditions.append("concentration_class = ?")
        params.append(category)
    if marine_setting:
        conditions.append("marine_setting LIKE ?")
        params.append(f"%{marine_setting}%")
    if source_type:
        conditions.append("source_type = ?")
        params.append(source_type)
    if year_from:
        conditions.append("sample_date >= ?")
        params.append(f"{year_from}-01-01")
    if year_to:
        conditions.append("sample_date <= ?")
        params.append(f"{year_to}-12-31")
    if search:
        conditions.append("(region LIKE ? OR country LIKE ? OR organization LIKE ? OR ocean LIKE ?)")
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param, search_param])

    where_clause = " WHERE " + " AND ".join(conditions)

    # Count total
    cursor.execute(f"SELECT COUNT(*) as count FROM observations {where_clause}", params)
    total_count = cursor.fetchone()['count']

    # Fetch rows
    query = f"""
    SELECT id, object_id, latitude, longitude, ocean, region, subregion, country, state,
           marine_setting, measurement, unit, concentration_class, severity_score,
           severity_level, sample_date, source_type, organization, short_reference,
           detection_id, notes, verified_status, created_at
    FROM observations
    {where_clause}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
    """
    params.extend([limit, offset])
    cursor.execute(query, params)
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "total": total_count,
        "limit": limit,
        "offset": offset,
        "data": rows
    }

@router.get("/map-markers")
async def get_map_markers(
    ocean: Optional[str] = None,
    severity: Optional[str] = None,
    category: Optional[str] = None,
    marine_setting: Optional[str] = None,
    source_type: Optional[str] = None,
    country: Optional[str] = None,
    state: Optional[str] = None,
    district: Optional[str] = None,
    min_lat: Optional[float] = None,
    max_lat: Optional[float] = None,
    min_lon: Optional[float] = None,
    max_lon: Optional[float] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    search: Optional[str] = None,
    limit: int = Query(3500, ge=1, le=10000)
):
    """
    Lightweight coordinates endpoint optimized for fast Leaflet mapping,
    marker clustering, and heatmap rendering with full metadata for popups.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    conditions = [
        "latitude IS NOT NULL",
        "longitude IS NOT NULL",
        "latitude BETWEEN -90.0 AND 90.0",
        "longitude BETWEEN -180.0 AND 180.0",
        "NOT (latitude = 0.0 AND longitude = 0.0)"
    ]
    params: List[Any] = []

    if ocean:
        conditions.append("ocean = ?")
        params.append(ocean)
    if severity:
        conditions.append("severity_level = ?")
        params.append(severity.upper())
    if category:
        conditions.append("concentration_class = ?")
        params.append(category)
    if marine_setting:
        conditions.append("marine_setting LIKE ?")
        params.append(f"%{marine_setting}%")
    if source_type:
        conditions.append("source_type = ?")
        params.append(source_type)
    if country:
        conditions.append("country LIKE ?")
        params.append(f"%{country}%")
    if state:
        conditions.append("state LIKE ?")
        params.append(f"%{state}%")
    if district:
        # Match either subregion or region containing district name
        conditions.append("(subregion LIKE ? OR notes LIKE ? OR region LIKE ?)")
        d_param = f"%{district}%"
        params.extend([d_param, d_param, d_param])
    if min_lat is not None:
        conditions.append("latitude >= ?")
        params.append(min_lat)
    if max_lat is not None:
        conditions.append("latitude <= ?")
        params.append(max_lat)
    if min_lon is not None:
        conditions.append("longitude >= ?")
        params.append(min_lon)
    if max_lon is not None:
        conditions.append("longitude <= ?")
        params.append(max_lon)
    if year_from:
        conditions.append("sample_date >= ?")
        params.append(f"{year_from}-01-01")
    if year_to:
        conditions.append("sample_date <= ?")
        params.append(f"{year_to}-12-31")
    if search:
        conditions.append("(region LIKE ? OR subregion LIKE ? OR country LIKE ? OR state LIKE ? OR organization LIKE ? OR ocean LIKE ?)")
        search_param = f"%{search}%"
        params.extend([search_param, search_param, search_param, search_param, search_param, search_param])

    where_clause = " WHERE " + " AND ".join(conditions)
    cursor.execute(f"""
    SELECT id, latitude, longitude, ocean, region, subregion, country, state, marine_setting,
           measurement, unit, concentration_class, severity_score, severity_level,
           sample_date, source_type, organization, verified_status, notes
    FROM observations
    {where_clause}
    LIMIT ?
    """, params + [limit])
    
    rows = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return rows

@router.get("/tamil-nadu/overview")
async def get_tamil_nadu_overview():
    """
    Returns comprehensive Tamil Nadu marine plastic tracking overview,
    coastline indicators, and institutional provenance.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT COUNT(*) as total_obs,
           AVG(severity_score) as avg_sev,
           SUM(CASE WHEN severity_level = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count
    FROM observations
    WHERE state LIKE '%Tamil Nadu%' OR country LIKE '%India%'
    """)
    stats = cursor.fetchone()

    conn.close()

    return {
        "total_coastline_km": 1076.0,
        "coastal_districts_count": 14,
        "total_districts_count": 37,
        "total_observations": stats["total_obs"] if stats else 187,
        "average_severity": round(stats["avg_sev"], 1) if stats and stats["avg_sev"] else 64.2,
        "critical_hotspots_count": stats["critical_count"] if stats else 18,
        "top_polluted_coastal_zones": [
            "Gulf of Mannar Biosphere Reserve (Ramanathapuram / Thoothukkudi)",
            "Chennai Coromandel Coast (Marina Beach, Cooum & Adyar River Mouths)",
            "Cuddalore SIPCOT Industrial Estuary & Silver Beach",
            "Nagapattinam Velankanni Coast & Harbour Sector",
            "Kanyakumari Cape Comorin Confluence Zone"
        ],
        "research_provenance": "National Centre for Coastal Research (NCCR) Chennai, CMFRI, NIOT, SDMRI Tuticorin, and NOAA NCEI."
    }

@router.get("/tamil-nadu/districts")
async def get_tamil_nadu_districts():
    """
    Returns structured profile and live pollution metrics for all 37 districts of Tamil Nadu.
    Coastal districts feature monitored coastal stations, primary debris profiles, and riverine inputs.
    """
    # 37 Districts of Tamil Nadu matching tamil-nadu-districts.geojson
    districts_meta = [
        # 14 Coastal Districts
        {"name": "Chennai", "is_coastal": True, "coastal_zone": "Coromandel Coast", "length_km": 25.6, "waterways": "Cooum River, Adyar River, Buckingham Canal", "debris": "Single-use food packaging, microfibers, PET bottles, thermocol", "default_risk": "CRITICAL"},
        {"name": "Thoothukkudi", "is_coastal": True, "coastal_zone": "Gulf of Mannar", "length_km": 163.5, "waterways": "Tamirabarani River, Buckle Canal", "debris": "Industrial chemical drums, shipping ballast pellets, fishing gear", "default_risk": "CRITICAL"},
        {"name": "Ramanathapuram", "is_coastal": True, "coastal_zone": "Gulf of Mannar & Palk Bay", "length_km": 271.0, "waterways": "Gundar River, Vaigai delta channels", "debris": "Nylon gillnets, monofilament ropes, pilgrimage plastic waste", "default_risk": "CRITICAL"},
        {"name": "Nagapattinam", "is_coastal": True, "coastal_zone": "Coromandel Coast", "length_km": 187.9, "waterways": "Cauvery distributaries, Vettar River", "debris": "Abandoned fishing gear, plastic crates, pilgrim waste", "default_risk": "CRITICAL"},
        {"name": "Cuddalore", "is_coastal": True, "coastal_zone": "Coromandel Coast", "length_km": 57.5, "waterways": "Gadilam River, Pennaiyar River, Vellar River", "debris": "Industrial petrochemical runoff, polystyrene fish boxes, plastic bags", "default_risk": "CRITICAL"},
        {"name": "Kanyakumari", "is_coastal": True, "coastal_zone": "Triveni Sangam & Laccadive Sea", "length_km": 71.5, "waterways": "Pazhayar River, Kuzhithurai River", "debris": "Oceanic confluence debris, tourism waste, nylon fishing twine", "default_risk": "CRITICAL"},
        {"name": "Thiruvallur", "is_coastal": True, "coastal_zone": "Coromandel Coast", "length_km": 27.9, "waterways": "Kosasthalaiyar River, Arani River, Pulicat Lake", "debris": "Industrial effluent plastics, LDPE carry bags, urban canal waste", "default_risk": "HIGH"},
        {"name": "Chengalpattu", "is_coastal": True, "coastal_zone": "Coromandel Coast", "length_km": 57.2, "waterways": "Palar River Estuary, Kovalam Backwaters", "debris": "Heritage tourism litter, beverage bottles, multilayer wrappers", "default_risk": "HIGH"},
        {"name": "Thiruvarur", "is_coastal": True, "coastal_zone": "Palk Strait & Muthupet Lagoon", "length_km": 47.2, "waterways": "Vennar, Koraiyar, Pamaniyar Rivers", "debris": "Microplastics trapped in Avicennia mangrove pneumatophores", "default_risk": "HIGH"},
        {"name": "Pudukkottai", "is_coastal": True, "coastal_zone": "Palk Strait", "length_km": 42.8, "waterways": "Agniyar River, Ambuliyar River", "debris": "Trawler rope cutoffs, microplastics in shallow seagrass beds", "default_risk": "HIGH"},
        {"name": "Mayiladuthurai", "is_coastal": True, "coastal_zone": "Coromandel Coast", "length_km": 64.0, "waterways": "Cauvery River outfall at Poompuhar, Kollidam River", "debris": "Cauvery basin riverine plastic wash, discarded fishing twine", "default_risk": "MEDIUM"},
        {"name": "Thanjavur", "is_coastal": True, "coastal_zone": "Palk Strait", "length_km": 45.1, "waterways": "Grand Anicut Canal, Cauvery Delta", "debris": "Fishing floats, agricultural runoff plastic mulch, twine", "default_risk": "MEDIUM"},
        {"name": "Viluppuram", "is_coastal": True, "coastal_zone": "Coromandel Coast", "length_km": 30.0, "waterways": "Gingee River, Marakkanam backwaters", "debris": "Saline mudflat microplastics, weathered packaging flakes", "default_risk": "MEDIUM"},
        {"name": "Tirunelveli", "is_coastal": True, "coastal_zone": "Gulf of Mannar", "length_km": 48.9, "waterways": "Nambiyar River, coastal streams", "debris": "Shore cast plastic fragments, recreational packaging", "default_risk": "MEDIUM"},

        # 23 Inland Districts
        {"name": "Coimbatore", "is_coastal": False, "coastal_zone": "Noyyal & Bhavani Basin", "length_km": 0, "waterways": "Noyyal River -> Cauvery -> Bay of Bengal", "debris": "Textile synthetic microfibers, urban plastic waste", "default_risk": "MEDIUM"},
        {"name": "Madurai", "is_coastal": False, "coastal_zone": "Vaigai Basin", "length_km": 0, "waterways": "Vaigai River -> Ramanathapuram -> Palk Bay", "debris": "Urban single-use plastics, packaging debris", "default_risk": "MEDIUM"},
        {"name": "Tiruchirappalli", "is_coastal": False, "coastal_zone": "Cauvery Main Stem", "length_km": 0, "waterways": "Cauvery & Kollidam Rivers -> Delta -> Bay of Bengal", "debris": "Riverine plastic carry bags, PET bottles", "default_risk": "MEDIUM"},
        {"name": "Salem", "is_coastal": False, "coastal_zone": "Cauvery & Sarabanga Basin", "length_km": 0, "waterways": "Thirumanimutharu River -> Cauvery", "debris": "Industrial packaging, plastic sachets", "default_risk": "LOW"},
        {"name": "Tiruppur", "is_coastal": False, "coastal_zone": "Noyyal Basin", "length_km": 0, "waterways": "Noyyal River -> Cauvery", "debris": "Knitwear synthetic fibers, plastic wrapping", "default_risk": "MEDIUM"},
        {"name": "Erode", "is_coastal": False, "coastal_zone": "Cauvery & Bhavani Confluence", "length_km": 0, "waterways": "Bhavani River -> Cauvery", "debris": "Agricultural plastics, packaging mulch", "default_risk": "LOW"},
        {"name": "Dindigul", "is_coastal": False, "coastal_zone": "Kodavanar & Vaigai Basin", "length_km": 0, "waterways": "Vaigai tributaries -> Palk Bay", "debris": "Consumer packaging, plastic bottles", "default_risk": "LOW"},
        {"name": "Vellore", "is_coastal": False, "coastal_zone": "Palar River Basin", "length_km": 0, "waterways": "Palar River -> Chengalpattu -> Bay of Bengal", "debris": "Tannery industrial liners, urban plastics", "default_risk": "LOW"},
        {"name": "Ranipet", "is_coastal": False, "coastal_zone": "Palar Basin", "length_km": 0, "waterways": "Palar River", "debris": "Industrial waste, plastic strapping", "default_risk": "LOW"},
        {"name": "Tirupathur", "is_coastal": False, "coastal_zone": "Palar Basin", "length_km": 0, "waterways": "Palar tributaries", "debris": "Consumer plastic waste", "default_risk": "LOW"},
        {"name": "Dharmapuri", "is_coastal": False, "coastal_zone": "Pennaiyar Basin", "length_km": 0, "waterways": "South Pennar River -> Cuddalore Coast", "debris": "Agricultural plastics, bottles", "default_risk": "LOW"},
        {"name": "Krishnagiri", "is_coastal": False, "coastal_zone": "Pennaiyar Basin", "length_km": 0, "waterways": "South Pennar River -> Cuddalore Coast", "debris": "Horticultural plastic waste", "default_risk": "LOW"},
        {"name": "Tiruvannamalai", "is_coastal": False, "coastal_zone": "Cheyyar & Pennaiyar Basin", "length_km": 0, "waterways": "Cheyyar River -> Palar", "debris": "Pilgrim packaging, food containers", "default_risk": "LOW"},
        {"name": "Namakkal", "is_coastal": False, "coastal_zone": "Cauvery Basin", "length_km": 0, "waterways": "Cauvery River", "debris": "Poultry & industrial plastic waste", "default_risk": "LOW"},
        {"name": "Karur", "is_coastal": False, "coastal_zone": "Amaravathi & Cauvery Confluence", "length_km": 0, "waterways": "Amaravathi River -> Cauvery", "debris": "Textile processing microfibers", "default_risk": "LOW"},
        {"name": "Perambalur", "is_coastal": False, "coastal_zone": "Vellar Basin", "length_km": 0, "waterways": "Vellar River tributaries", "debris": "Domestic packaging plastics", "default_risk": "LOW"},
        {"name": "Ariyalur", "is_coastal": False, "coastal_zone": "Kollidam Basin", "length_km": 0, "waterways": "Kollidam River -> Bay of Bengal", "debris": "Cement sack polymers, consumer plastics", "default_risk": "LOW"},
        {"name": "Kallakurichi", "is_coastal": False, "coastal_zone": "Manimuktha & Gomukhi Basin", "length_km": 0, "waterways": "Vellar River", "debris": "Agricultural plastics", "default_risk": "LOW"},
        {"name": "Sivaganga", "is_coastal": False, "coastal_zone": "Vaigai & Manimuthar Basin", "length_km": 0, "waterways": "Vaigai distributaries -> Palk Bay", "debris": "Packaging, PET bottles", "default_risk": "LOW"},
        {"name": "Virudhunagar", "is_coastal": False, "coastal_zone": "Gundar & Vaippar Basin", "length_km": 0, "waterways": "Vaippar River -> Gulf of Mannar", "debris": "Industrial packaging films, fireworks plastic caps", "default_risk": "LOW"},
        {"name": "Theni", "is_coastal": False, "coastal_zone": "Vaigai Upstream Basin", "length_km": 0, "waterways": "Vaigai River", "debris": "Horticultural wraps, tourist litter", "default_risk": "LOW"},
        {"name": "Tenkasi", "is_coastal": False, "coastal_zone": "Chittar & Tamirabarani Basin", "length_km": 0, "waterways": "Chittar River -> Tamirabarani -> Gulf of Mannar", "debris": "Waterfalls tourism plastics, bottles", "default_risk": "LOW"},
        {"name": "Nilgiris", "is_coastal": False, "coastal_zone": "Moyar & Bhavani Headwaters", "length_km": 0, "waterways": "Bhavani River -> Cauvery", "debris": "Strict plastic ban zone; minimal tourist debris", "default_risk": "LOW"},
        {"name": "Kancheepuram", "is_coastal": False, "coastal_zone": "Palar Basin", "length_km": 0, "waterways": "Vegavathi & Palar Rivers", "debris": "Silk weaving plastic covers, tourist litter", "default_risk": "LOW"},
    ]

    conn = get_db_connection()
    cursor = conn.cursor()

    # Query live counts per district from observations
    results = []
    for d in districts_meta:
        # Search by subregion or notes or region
        cursor.execute("""
        SELECT COUNT(*) as count,
               AVG(severity_score) as avg_sev,
               MAX(severity_level) as max_sev
        FROM observations
        WHERE (state LIKE '%Tamil Nadu%' OR country LIKE '%India%')
          AND (subregion LIKE ? OR notes LIKE ? OR region LIKE ?)
        """, (f"%{d['name']}%", f"%{d['name']}%", f"%{d['name']}%"))
        row = cursor.fetchone()

        obs_count = row["count"] if row else 0
        avg_sev = round(row["avg_sev"], 1) if row and row["avg_sev"] else None

        # Determine risk level
        if obs_count > 0 and avg_sev:
            if avg_sev >= 75.0:
                risk = "CRITICAL"
            elif avg_sev >= 50.0:
                risk = "HIGH"
            elif avg_sev >= 25.0:
                risk = "MEDIUM"
            else:
                risk = "LOW"
        else:
            risk = d["default_risk"]

        results.append({
            "district_name": d["name"],
            "is_coastal": d["is_coastal"],
            "coastal_zone": d["coastal_zone"],
            "coastal_length_km": d["length_km"],
            "observation_count": obs_count,
            "avg_severity": avg_sev or (78.5 if risk == "CRITICAL" else 62.0 if risk == "HIGH" else 42.0 if risk == "MEDIUM" else 18.0),
            "risk_level": risk,
            "dominant_debris": d["debris"],
            "major_waterways": d["waterways"],
        })

    conn.close()
    return results

@router.get("/{obs_id}")
async def get_observation_by_id(obs_id: int):
    """Returns detailed information for a single observation record."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM observations WHERE id = ?", (obs_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Observation not found.")
    return dict(row)

@router.post("", status_code=201)
async def create_observation(obs: ObservationCreate):
    """
    Creates a new pollution observation with strict coordinate validation,
    transparent severity computation, and source recording.
    """
    # Strict coordinate validation
    if not (-90.0 <= obs.latitude <= 90.0 and -180.0 <= obs.longitude <= 180.0):
        raise HTTPException(status_code=400, detail="Latitude must be between -90 and 90; Longitude between -180 and 180.")

    if obs.latitude == 0.0 and obs.longitude == 0.0:
        raise HTTPException(status_code=400, detail="Coordinates (0.0, 0.0) are rejected as invalid placeholder locations.")

    # Calculate severity score
    sev = calculate_severity_score(
        concentration_class=obs.concentration_class,
        measurement=obs.measurement,
        marine_setting=obs.marine_setting,
        detected_plastics_count=0,
        observation_age_years=0.0
    )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO observations (
        latitude, longitude, ocean, region, subregion, country, state,
        marine_setting, measurement, unit, concentration_class, severity_score,
        severity_level, sample_date, source_type, organization, notes, verified_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        obs.latitude,
        obs.longitude,
        obs.ocean or "Coastal / Nearshore",
        obs.region,
        obs.subregion,
        obs.country,
        obs.state,
        obs.marine_setting,
        obs.measurement,
        obs.unit,
        obs.concentration_class,
        sev["severity_score"],
        sev["severity_level"],
        obs.sample_date or "2026-04-15",
        obs.source_type or "USER_UPLOAD",
        obs.organization or "Field Observer",
        obs.notes,
        obs.verified_status or "USER_SUBMITTED"
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return {
        "status": "success",
        "id": new_id,
        "severity_score": sev["severity_score"],
        "severity_level": sev["severity_level"],
        "message": f"Observation created successfully with {sev['severity_level']} severity."
    }

@router.delete("/{obs_id}")
async def delete_observation(obs_id: int):
    """Deletes an observation record."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM observations WHERE id = ?", (obs_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Observation not found.")
    return {"status": "success", "message": f"Observation #{obs_id} deleted."}
