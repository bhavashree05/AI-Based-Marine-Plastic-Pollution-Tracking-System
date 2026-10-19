import sqlite3
import json
from datetime import datetime
from typing import Any, Dict, List, Optional
from backend.app.core.config import DATABASE_URL, BASE_DIR

DB_FILE = BASE_DIR / "marineguard.db"

def get_db_connection() -> sqlite3.Connection:
    """Provides a thread-safe connection with row factory enabled."""
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes database tables, indices, and default baseline schema."""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Observations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        object_id INTEGER,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        ocean TEXT,
        region TEXT,
        subregion TEXT,
        country TEXT,
        state TEXT,
        marine_setting TEXT,
        measurement REAL,
        unit TEXT,
        concentration_class TEXT,
        severity_score REAL DEFAULT 0.0,
        severity_level TEXT DEFAULT 'LOW',
        sample_date TEXT,
        source_type TEXT DEFAULT 'NOAA_DATASET', -- NOAA_DATASET, USER_UPLOAD, AI_DETECTION
        organization TEXT,
        short_reference TEXT,
        detection_id INTEGER,
        notes TEXT,
        verified_status TEXT DEFAULT 'VERIFIED_SCIENTIFIC', -- VERIFIED_SCIENTIFIC, USER_SUBMITTED, AI_PREDICTION
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. AI Detection Records Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detection_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_filename TEXT NOT NULL,
        annotated_filename TEXT,
        original_width INTEGER,
        original_height INTEGER,
        confidence_threshold REAL NOT NULL,
        total_detections INTEGER DEFAULT 0,
        plastic_count INTEGER DEFAULT 0,
        organic_count INTEGER DEFAULT 0,
        other_count INTEGER DEFAULT 0,
        detections_json TEXT, -- Serialized bounding boxes and classes
        inference_time_ms REAL,
        model_name TEXT,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 3. Hotspots Prioritization Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS hotspots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        ocean TEXT,
        region TEXT,
        cluster_id INTEGER,
        observation_count INTEGER DEFAULT 1,
        detected_plastics_count INTEGER DEFAULT 0,
        avg_severity_score REAL DEFAULT 0.0,
        priority_score REAL DEFAULT 0.0,
        priority_level TEXT DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, CRITICAL
        evidence_summary TEXT,
        repeat_reports_count INTEGER DEFAULT 1,
        recency_weight REAL DEFAULT 1.0,
        status TEXT DEFAULT 'ACTIVE', -- ACTIVE, MONITORED, CLEANUP_SCHEDULED, RESOLVED
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 4. Cleanup Tasks Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cleanup_tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        hotspot_id INTEGER,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        ocean TEXT,
        region TEXT,
        target_date TEXT,
        assigned_team TEXT,
        priority_level TEXT DEFAULT 'HIGH',
        status TEXT DEFAULT 'PLANNED', -- PLANNED, IN_PROGRESS, COMPLETED, CANCELLED
        evidence_summary TEXT,
        notes TEXT,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hotspot_id) REFERENCES hotspots (id)
    )
    """)
    
    # 5. In-App Alerts Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        severity_level TEXT DEFAULT 'HIGH', -- LOW, MEDIUM, HIGH, CRITICAL
        hotspot_id INTEGER,
        latitude REAL,
        longitude REAL,
        dedup_hash TEXT UNIQUE,
        is_read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (hotspot_id) REFERENCES hotspots (id)
    )
    """)

    # Indices for high performance spatial and analytical queries
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_coords ON observations(latitude, longitude);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_ocean ON observations(ocean);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_severity ON observations(severity_level);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_sample_date ON observations(sample_date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_conc_class ON observations(concentration_class);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_ocean_sev ON observations(ocean, severity_level);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_obs_source ON observations(source_type);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_hotspots_priority ON hotspots(priority_level);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_cleanup_status ON cleanup_tasks(status);")
    
    conn.commit()
    conn.close()

def backup_database() -> str:
    """Creates a timestamped snapshot of the SQLite database in the backups directory."""
    import shutil
    backups_dir = BASE_DIR / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = backups_dir / f"marineguard_backup_{timestamp}.db"
    
    # Use SQLite VACUUM INTO or file copy for clean snapshot
    conn = get_db_connection()
    try:
        # SQLite 3.27+ supports VACUUM INTO
        safe_path = str(backup_path).replace("'", "''")
        conn.execute(f"VACUUM INTO '{safe_path}'")
    except Exception:
        # Fallback to copy
        shutil.copy2(DB_FILE, backup_path)
    finally:
        conn.close()
    
    return str(backup_path)

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_FILE)
