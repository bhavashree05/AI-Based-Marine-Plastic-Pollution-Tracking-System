import os
import io
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np
from datetime import datetime

from backend.app.core.config import DEFAULT_DATASET_PATH, CLEANED_DIR
from backend.app.core.database import get_db_connection
from backend.app.services.severity_engine import calculate_severity_score

def inspect_dataset_file(filepath: Path) -> Dict[str, Any]:
    """
    Inspects a CSV file, analyzing missing values, empty columns, coordinates, duplicates,
    and schema compatibility. Safely handles empty or malformed files.
    """
    if not filepath.exists() or filepath.stat().st_size == 0:
        raise ValueError("File is empty or does not exist on disk.")

    try:
        df = pd.read_csv(filepath, low_memory=False, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(filepath, low_memory=False, encoding='latin1')
    except pd.errors.EmptyDataError:
        raise ValueError("Uploaded CSV file is completely empty.")
    except Exception as e:
        raise ValueError(f"Malformed CSV file could not be parsed: {str(e)}")

    total_rows = len(df)
    if total_rows == 0:
        raise ValueError("The dataset contains 0 rows of data.")

    total_cols = len(df.columns)

    # 1. Missing values analysis
    missing_counts = df.isnull().sum().to_dict()
    missing_pcts = {col: round((count / total_rows) * 100, 2) for col, count in missing_counts.items()}

    # 2. Entirely empty columns
    empty_cols = [col for col, count in missing_counts.items() if count == total_rows]

    # 3. Duplicate detection
    duplicate_rows = int(df.duplicated().sum())

    # 4. Flexible coordinate column detection
    col_lower = {c: c.lower().strip() for c in df.columns}
    lat_col = next((orig for orig, low in col_lower.items() if low in ['latitude', 'lat', 'latitude (degree)', 'lat_deg', 'y']), None)
    lon_col = next((orig for orig, low in col_lower.items() if low in ['longitude', 'lon', 'lng', 'longitude (degree)', 'lon_deg', 'x']), None)

    valid_coords = 0
    invalid_coords = 0
    zero_zero_coords = 0

    if lat_col and lon_col:
        lat_num = pd.to_numeric(df[lat_col], errors='coerce')
        lon_num = pd.to_numeric(df[lon_col], errors='coerce')
        
        # Valid bounds: -90 to 90, -180 to 180, excluding fake 0,0 null coordinates
        is_zero_zero = (lat_num == 0.0) & (lon_num == 0.0)
        zero_zero_coords = int(is_zero_zero.sum())
        
        valid_mask = lat_num.between(-90, 90) & lon_num.between(-180, 180) & (~is_zero_zero)
        valid_coords = int(valid_mask.sum())
        invalid_coords = total_rows - valid_coords

    # 5. Preview top 10 rows
    preview = df.head(10).replace({np.nan: None}).to_dict(orient='records')

    # 6. Provenance and summary statistics
    accepted_records = valid_coords if (lat_col and lon_col) else total_rows
    rejected_records = invalid_coords
    flagged_records = zero_zero_coords + duplicate_rows

    return {
        "filename": filepath.name,
        "total_rows": total_rows,
        "total_columns": total_cols,
        "columns": list(df.columns),
        "missing_counts": missing_counts,
        "missing_percentages": missing_pcts,
        "empty_columns": empty_cols,
        "duplicate_rows": duplicate_rows,
        "lat_column": lat_col,
        "lon_column": lon_col,
        "valid_coordinates_count": valid_coords,
        "invalid_coordinates_count": invalid_coords,
        "zero_zero_coordinates_count": zero_zero_coords,
        "imported_records": total_rows,
        "accepted_records": accepted_records,
        "rejected_records": rejected_records,
        "flagged_records": flagged_records,
        "preview_rows": preview,
        "schema_status": "Compatible" if (lat_col and lon_col) else "Missing recognized coordinate columns (Latitude, Longitude)"
    }

def clean_and_process_dataset(
    filepath: Path,
    output_filename: Optional[str] = None,
    drop_empty_cols: bool = True,
    drop_duplicates: bool = True
) -> Dict[str, Any]:
    """
    Cleans dataset: drops entirely empty columns, removes duplicates, validates coordinates,
    excludes invalid (0,0) points, standardizes dates into ISO YYYY-MM-DD, and saves clean copy.
    """
    if not filepath.exists() or filepath.stat().st_size == 0:
        raise ValueError("Cannot clean empty or non-existent file.")

    try:
        df = pd.read_csv(filepath, low_memory=False, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(filepath, low_memory=False, encoding='latin1')

    initial_rows = len(df)
    initial_cols = len(df.columns)
    cleaning_steps = []

    dropped_empty = []
    if drop_empty_cols:
        dropped_empty = [c for c in df.columns if df[c].isnull().all()]
        if dropped_empty:
            df = df.dropna(axis=1, how='all')
            cleaning_steps.append(f"Dropped {len(dropped_empty)} completely empty columns: {', '.join(dropped_empty)}")

    dropped_duplicates_count = 0
    if drop_duplicates:
        before_dup = len(df)
        df = df.drop_duplicates()
        dropped_duplicates_count = before_dup - len(df)
        if dropped_duplicates_count > 0:
            cleaning_steps.append(f"Removed {dropped_duplicates_count} exact duplicate rows.")

    # Coordinate columns detection
    col_lower = {c: c.lower().strip() for c in df.columns}
    lat_col = next((orig for orig, low in col_lower.items() if low in ['latitude', 'lat', 'latitude (degree)', 'lat_deg', 'y']), None)
    lon_col = next((orig for orig, low in col_lower.items() if low in ['longitude', 'lon', 'lng', 'longitude (degree)', 'lon_deg', 'x']), None)
    
    invalid_coords_dropped = 0
    if lat_col and lon_col:
        df[lat_col] = pd.to_numeric(df[lat_col], errors='coerce')
        df[lon_col] = pd.to_numeric(df[lon_col], errors='coerce')
        # Exclude out-of-range and invalid 0,0 points
        valid_mask = (
            df[lat_col].between(-90, 90) &
            df[lon_col].between(-180, 180) &
            ~((df[lat_col] == 0.0) & (df[lon_col] == 0.0))
        )
        invalid_coords_dropped = int((~valid_mask).sum())
        df = df[valid_mask]
        if invalid_coords_dropped > 0:
            cleaning_steps.append(f"Excluded {invalid_coords_dropped} invalid or artificial (0,0) coordinate rows.")

    # Standardize dates into ISO format YYYY-MM-DD
    date_col = next((orig for orig, low in col_lower.items() if 'date' in low or 'time' in low or 'timestamp' in low), None)
    parsed_date_count = 0
    if date_col:
        parsed_dates = pd.to_datetime(df[date_col], format='mixed', errors='coerce')
        df['Parsed_Date'] = parsed_dates.dt.strftime('%Y-%m-%d')
        df['Year'] = parsed_dates.dt.year
        parsed_date_count = int(df['Parsed_Date'].notnull().sum())
        cleaning_steps.append(f"Standardized {parsed_date_count} date entries into ISO 8601 (YYYY-MM-DD).")

    # Save cleaned file
    clean_name = output_filename or f"cleaned_{filepath.stem}.csv"
    clean_path = CLEANED_DIR / clean_name
    df.to_csv(clean_path, index=False)

    return {
        "cleaned_filename": clean_name,
        "download_url": f"/api/analytics/download-cleaned/{clean_name}",
        "initial_rows": initial_rows,
        "cleaned_rows": len(df),
        "initial_columns": initial_cols,
        "cleaned_columns": len(df.columns),
        "dropped_empty_columns": dropped_empty,
        "dropped_duplicate_rows": dropped_duplicates_count,
        "dropped_invalid_coords": invalid_coords_dropped,
        "date_records_parsed": parsed_date_count,
        "cleaning_steps": cleaning_steps,
        "summary_explanation": (
            f"Dataset cleaned from {initial_rows} to {len(df)} validated records. "
            f"Removed {dropped_duplicates_count} duplicates and {invalid_coords_dropped} invalid coordinates. "
            f"All dates standardized for temporal filtering."
        )
    }

def seed_database_from_noaa(limit: Optional[int] = None, force_reseed: bool = False) -> int:
    """
    Populates the SQLite database with observations from the authentic NOAA marine microplastics dataset.
    Standardizes dates into ISO format, computes transparent multi-criteria severity scores,
    and preserves non-NOAA records (such as user uploads or AI detections).
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check existing count
    cursor.execute("SELECT COUNT(*) as cnt FROM observations WHERE source_type = 'NOAA_DATASET'")
    existing_noaa_count = cursor.fetchone()['cnt']
    
    # If already seeded with more than 5000 rows and reseed not forced, skip
    if existing_noaa_count >= 5000 and not force_reseed:
        cursor.execute("SELECT COUNT(*) as total FROM observations")
        total_obs = cursor.fetchone()['total']
        conn.close()
        return total_obs

    if not DEFAULT_DATASET_PATH.exists():
        conn.close()
        return 0

    df = pd.read_csv(DEFAULT_DATASET_PATH, low_memory=False)
    
    # Validate coordinate columns
    lat_col = 'Latitude (degree)'
    lon_col = 'Longitude (degree)'
    
    df[lat_col] = pd.to_numeric(df[lat_col], errors='coerce')
    df[lon_col] = pd.to_numeric(df[lon_col], errors='coerce')
    
    # Strictly validate coordinates: -90 to 90, -180 to 180, excluding fake 0,0
    valid_coords_mask = (
        df[lat_col].between(-90, 90) &
        df[lon_col].between(-180, 180) &
        ~((df[lat_col] == 0.0) & (df[lon_col] == 0.0))
    )
    df = df[valid_coords_mask]

    # Parse and standardize Sample Date into ISO YYYY-MM-DD
    parsed_dates = pd.to_datetime(df['Sample Date'], format='mixed', errors='coerce')
    df['Clean_Date'] = parsed_dates.dt.strftime('%Y-%m-%d')
    df['Clean_Year'] = parsed_dates.dt.year

    # If limit specified, take a balanced sample across all oceans rather than only head()
    if limit and limit < len(df):
        # Sample proportionally across oceans
        oceans = df['Ocean'].dropna().unique()
        samples_per_ocean = max(50, limit // len(oceans))
        sampled_dfs = []
        for ocean in oceans:
            ocean_subset = df[df['Ocean'] == ocean]
            sampled_dfs.append(ocean_subset.head(samples_per_ocean))
        df = pd.concat(sampled_dfs).drop_duplicates().head(limit)

    # If force_reseed, delete only previous NOAA records to preserve user submissions
    if force_reseed or existing_noaa_count > 0:
        cursor.execute("DELETE FROM observations WHERE source_type = 'NOAA_DATASET'")

    rows_to_insert = []
    current_year = 2026

    for _, row in df.iterrows():
        lat = float(row[lat_col])
        lon = float(row[lon_col])
        ocean = str(row['Ocean']) if pd.notna(row.get('Ocean')) else "Unknown Ocean"
        region = str(row['Region']) if pd.notna(row.get('Region')) else None
        subregion = str(row['Subregion']) if pd.notna(row.get('Subregion')) else None
        country = str(row['Country']) if pd.notna(row.get('Country')) else None
        state = str(row['State']) if pd.notna(row.get('State')) else None
        marine_setting = str(row['Marine Setting']) if pd.notna(row.get('Marine Setting')) else "Ocean water"
        
        meas_val = row.get('Microplastics Measurement')
        measurement = float(meas_val) if pd.notna(meas_val) and str(meas_val).replace('.', '', 1).isdigit() else None
        unit = str(row['Unit']) if pd.notna(row.get('Unit')) else "pieces/m3"
        conc_class = str(row['Concentration Class']) if pd.notna(row.get('Concentration Class')) else "Medium"
        sample_date = row['Clean_Date'] if pd.notna(row.get('Clean_Date')) else None
        sample_year = row['Clean_Year'] if pd.notna(row.get('Clean_Year')) else None
        
        age_years = max(0.0, current_year - sample_year) if sample_year else 10.0
        org = str(row['Organization']) if pd.notna(row.get('Organization')) else "NOAA NCEI"
        short_ref = str(row['Short Reference']) if pd.notna(row.get('Short Reference')) else None

        # Calculate severity with actual temporal age
        sev_info = calculate_severity_score(
            concentration_class=conc_class,
            measurement=measurement,
            marine_setting=marine_setting,
            detected_plastics_count=0,
            observation_age_years=age_years,
            repeat_count=1
        )

        rows_to_insert.append((
            int(row.get('OBJECTID', 0)),
            lat,
            lon,
            ocean,
            region,
            subregion,
            country,
            state,
            marine_setting,
            measurement,
            unit,
            conc_class,
            sev_info["severity_score"],
            sev_info["severity_level"],
            sample_date,
            "NOAA_DATASET",
            org,
            short_ref,
            None,
            f"Authentic NOAA NCEI marine survey record ({conc_class} concentration).",
            "VERIFIED_SCIENTIFIC"
        ))

    cursor.executemany("""
    INSERT INTO observations (
        object_id, latitude, longitude, ocean, region, subregion, country, state,
        marine_setting, measurement, unit, concentration_class, severity_score,
        severity_level, sample_date, source_type, organization, short_reference,
        detection_id, notes, verified_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows_to_insert)

    cursor.execute("SELECT COUNT(*) as total FROM observations")
    total_count = cursor.fetchone()['total']
    conn.commit()
    conn.close()
    return total_count
