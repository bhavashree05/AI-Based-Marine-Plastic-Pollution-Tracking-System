export interface Observation {
  id: number;
  object_id?: number;
  latitude: number;
  longitude: number;
  ocean?: string;
  region?: string;
  subregion?: string;
  country?: string;
  state?: string;
  marine_setting?: string;
  measurement?: number;
  unit?: string;
  concentration_class?: string;
  severity_score: number;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sample_date?: string;
  source_type?: string;
  organization?: string;
  short_reference?: string;
  detection_id?: number;
  notes?: string;
  verified_status?: string;
  created_at?: string;
}

export interface MapMarker {
  id: number;
  latitude: number;
  longitude: number;
  ocean?: string;
  region?: string;
  country?: string;
  marine_setting?: string;
  measurement?: number;
  unit?: string;
  concentration_class?: string;
  severity_score: number;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  sample_date?: string;
  source_type?: string;
  organization?: string;
  verified_status?: string;
  notes?: string;
}

export interface DetectedObject {
  class_id: number;
  class_name: string;
  mapped_category: string;
  danger_group: string;
  confidence: number;
  bbox: [number, number, number, number];
  is_waste: boolean;
}

export interface DetectionResponse {
  image_filename: string;
  annotated_image_url: string;
  original_image_url: string;
  width: number;
  height: number;
  confidence_threshold: number;
  total_detections: number;
  plastic_count: number;
  organic_count: number;
  other_count: number;
  detections: DetectedObject[];
  inference_time_ms: number;
  model_name: string;
  provenance_disclaimer: string;
  detection_record_id?: number;
}

export interface AnalyticsOverview {
  total_observations: number;
  distinct_locations: number;
  total_ai_inferences: number;
  total_detected_plastics: number;
  high_priority_hotspots: number;
  total_cleanup_tasks: number;
  completed_cleanups: number;
  unread_alerts: number;
  provenance_note: string;
}

export interface CategoryCount {
  name: string;
  count: number;
}

export interface DistributionsData {
  oceans: CategoryCount[];
  concentration_classes: CategoryCount[];
  marine_settings: CategoryCount[];
  severity_levels: CategoryCount[];
}

export interface Hotspot {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  ocean?: string;
  region?: string;
  cluster_id?: number;
  observation_count: number;
  detected_plastics_count: number;
  avg_severity_score: number;
  priority_score: number;
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  evidence_summary: string;
  repeat_reports_count: number;
  status: string;
  updated_at?: string;
}

export interface CleanupTask {
  id: number;
  title: string;
  hotspot_id?: number;
  latitude: number;
  longitude: number;
  ocean?: string;
  region?: string;
  target_date?: string;
  assigned_team?: string;
  priority_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  evidence_summary?: string;
  notes?: string;
  completed_at?: string;
  created_at?: string;
}

export interface AlertItem {
  id: number;
  title: string;
  message: string;
  severity_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  hotspot_id?: number;
  latitude?: number;
  longitude?: number;
  is_read: number;
  created_at: string;
}

export interface HistoricalTimelinePoint {
  year: number;
  observation_count: number;
  avg_severity: number;
}

export interface HistoricalTrendsResponse {
  timeline: HistoricalTimelinePoint[];
  decades_breakdown: string[];
  total_timestamped_records: number;
  earliest_year?: number;
  latest_year?: number;
  interpretation: string;
}

export interface DatasetInspectionReport {
  filename: string;
  total_rows: number;
  total_columns: number;
  columns: string[];
  missing_counts: Record<string, number>;
  missing_percentages: Record<string, number>;
  empty_columns: string[];
  duplicate_rows: number;
  lat_column?: string;
  lon_column?: string;
  valid_coordinates_count: number;
  invalid_coordinates_count: number;
  zero_zero_coordinates_count?: number;
  imported_records?: number;
  accepted_records?: number;
  rejected_records?: number;
  flagged_records?: number;
  preview_rows: Record<string, any>[];
  schema_status?: string;
}

export interface CleaningResult {
  cleaned_filename: string;
  download_url: string;
  initial_rows: number;
  cleaned_rows: number;
  initial_columns: number;
  cleaned_columns: number;
  dropped_empty_columns: string[];
  dropped_duplicate_rows: number;
  dropped_invalid_coords: number;
  date_records_parsed: number;
  cleaning_steps?: string[];
  summary_explanation?: string;
}
