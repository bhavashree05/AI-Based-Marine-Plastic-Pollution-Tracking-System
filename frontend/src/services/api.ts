import {
  Observation,
  MapMarker,
  DetectionResponse,
  AnalyticsOverview,
  DistributionsData,
  Hotspot,
  CleanupTask,
  AlertItem,
  HistoricalTrendsResponse,
  DatasetInspectionReport,
  CleaningResult,
  TNDistrictSummary,
  TNOverview
} from '../types';

// In local development, defaults to '/api' (proxied via Vite).
// In production, can be set via VITE_API_BASE_URL (e.g. 'https://api.yourdomain.com')
const rawApiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';
const API_BASE = rawApiBase
  ? (rawApiBase.replace(/\/+$/, '').endsWith('/api')
      ? rawApiBase.replace(/\/+$/, '')
      : `${rawApiBase.replace(/\/+$/, '')}/api`)
  : '/api';


export async function fetchAnalyticsOverview(): Promise<AnalyticsOverview> {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error('Failed to fetch analytics overview');
  return res.json();
}

export async function fetchDistributions(): Promise<DistributionsData> {
  const res = await fetch(`${API_BASE}/analytics/distributions`);
  if (!res.ok) throw new Error('Failed to fetch distributions data');
  return res.json();
}

export async function fetchObservations(params: {
  ocean?: string;
  severity?: string;
  category?: string;
  marine_setting?: string;
  source_type?: string;
  year_from?: number;
  year_to?: number;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ total: number; limit: number; offset: number; data: Observation[] }> {
  const query = new URLSearchParams();
  if (params.ocean) query.append('ocean', params.ocean);
  if (params.severity) query.append('severity', params.severity);
  if (params.category) query.append('category', params.category);
  if (params.marine_setting) query.append('marine_setting', params.marine_setting);
  if (params.source_type) query.append('source_type', params.source_type);
  if (params.year_from) query.append('year_from', String(params.year_from));
  if (params.year_to) query.append('year_to', String(params.year_to));
  if (params.search) query.append('search', params.search);
  if (params.limit) query.append('limit', String(params.limit));
  if (params.offset) query.append('offset', String(params.offset));

  const res = await fetch(`${API_BASE}/observations?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch observations');
  return res.json();
}

export async function fetchMapMarkers(params?: {
  ocean?: string;
  severity?: string;
  category?: string;
  marine_setting?: string;
  source_type?: string;
  country?: string;
  state?: string;
  district?: string;
  min_lat?: number;
  max_lat?: number;
  min_lon?: number;
  max_lon?: number;
  year_from?: number;
  year_to?: number;
  search?: string;
  limit?: number;
}): Promise<MapMarker[]> {
  const query = new URLSearchParams();
  if (params?.ocean) query.append('ocean', params.ocean);
  if (params?.severity) query.append('severity', params.severity);
  if (params?.category) query.append('category', params.category);
  if (params?.marine_setting) query.append('marine_setting', params.marine_setting);
  if (params?.source_type) query.append('source_type', params.source_type);
  if (params?.country) query.append('country', params.country);
  if (params?.state) query.append('state', params.state);
  if (params?.district) query.append('district', params.district);
  if (params?.min_lat !== undefined) query.append('min_lat', String(params.min_lat));
  if (params?.max_lat !== undefined) query.append('max_lat', String(params.max_lat));
  if (params?.min_lon !== undefined) query.append('min_lon', String(params.min_lon));
  if (params?.max_lon !== undefined) query.append('max_lon', String(params.max_lon));
  if (params?.year_from) query.append('year_from', String(params.year_from));
  if (params?.year_to) query.append('year_to', String(params.year_to));
  if (params?.search) query.append('search', params.search);
  if (params?.limit) query.append('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/observations/map-markers?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch map coordinates');
  return res.json();
}

export async function fetchTNDistrictsSummary(): Promise<TNDistrictSummary[]> {
  const res = await fetch(`${API_BASE}/observations/tamil-nadu/districts`);
  if (!res.ok) throw new Error('Failed to fetch Tamil Nadu district summaries');
  return res.json();
}

export async function fetchTNOverview(): Promise<TNOverview> {
  const res = await fetch(`${API_BASE}/observations/tamil-nadu/overview`);
  if (!res.ok) throw new Error('Failed to fetch Tamil Nadu overview');
  return res.json();
}

export async function createObservation(obs: Partial<Observation>): Promise<{ status: string; id: number; message: string }> {
  const res = await fetch(`${API_BASE}/observations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(obs),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Creation failed' }));
    throw new Error(err.detail || 'Failed to create observation');
  }
  return res.json();
}

export async function deleteObservation(id: number): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/observations/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete observation');
  return res.json();
}

// AI Detection APIs
export async function detectPlasticsImage(
  file: File,
  confidenceThreshold: number
): Promise<DetectionResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('confidence_threshold', String(confidenceThreshold));

  const res = await fetch(`${API_BASE}/detection/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Detection failed' }));
    throw new Error(err.detail || 'Plastic detection error');
  }
  return res.json();
}

export async function fetchSampleImages(): Promise<{ name: string; label: string; url: string }[]> {
  const res = await fetch(`${API_BASE}/detection/sample-images`);
  if (!res.ok) return [];
  return res.json();
}

export async function detectSampleImage(
  filename: string,
  confidenceThreshold: number
): Promise<DetectionResponse> {
  const formData = new FormData();
  formData.append('filename', filename);
  formData.append('confidence_threshold', String(confidenceThreshold));

  const res = await fetch(`${API_BASE}/detection/detect-sample`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Detection failed' }));
    throw new Error(err.detail || 'Sample detection error');
  }
  return res.json();
}

export async function convertDetectionToObservation(data: {
  detection_id: number;
  latitude: number;
  longitude: number;
  ocean?: string;
  region?: string;
  marine_setting?: string;
  notes?: string;
}): Promise<{ status: string; observation_id: number; message: string }> {
  const formData = new FormData();
  formData.append('detection_id', String(data.detection_id));
  formData.append('latitude', String(data.latitude));
  formData.append('longitude', String(data.longitude));
  if (data.ocean) formData.append('ocean', data.ocean);
  if (data.region) formData.append('region', data.region);
  if (data.marine_setting) formData.append('marine_setting', data.marine_setting);
  if (data.notes) formData.append('notes', data.notes);

  const res = await fetch(`${API_BASE}/detection/convert-to-observation`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to convert detection to observation');
  return res.json();
}

// Hotspots APIs
export async function fetchHotspots(params?: { priority_level?: string; ocean?: string }): Promise<Hotspot[]> {
  const query = new URLSearchParams();
  if (params?.priority_level) query.append('priority_level', params.priority_level);
  if (params?.ocean) query.append('ocean', params.ocean);

  const res = await fetch(`${API_BASE}/hotspots?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch hotspots');
  return res.json();
}

export async function recalculateHotspots(config: {
  eps_km: number;
  min_samples: number;
  density_weight: number;
  severity_weight: number;
  recency_weight: number;
  plastic_detection_weight: number;
}): Promise<{ status: string; message: string; hotspots_count: number }> {
  const res = await fetch(`${API_BASE}/hotspots/recalculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error('Failed to recalculate hotspots');
  return res.json();
}

export async function scheduleCleanupFromHotspot(hotspotId: number): Promise<{ status: string; task_id: number; message: string }> {
  const res = await fetch(`${API_BASE}/hotspots/${hotspotId}/schedule-cleanup`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to schedule cleanup task');
  return res.json();
}

// Cleanup Tasks APIs
export async function fetchCleanupTasks(status?: string): Promise<CleanupTask[]> {
  const query = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE}/cleanup${query}`);
  if (!res.ok) throw new Error('Failed to fetch cleanup tasks');
  return res.json();
}

export async function createCleanupTask(task: Partial<CleanupTask>): Promise<{ status: string; task_id: number; message: string }> {
  const res = await fetch(`${API_BASE}/cleanup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(task),
  });
  if (!res.ok) throw new Error('Failed to create cleanup task');
  return res.json();
}

export async function updateCleanupTask(
  id: number,
  update: { status?: string; assigned_team?: string; target_date?: string; notes?: string }
): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/cleanup/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(update),
  });
  if (!res.ok) throw new Error('Failed to update cleanup task');
  return res.json();
}

export async function deleteCleanupTask(id: number): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/cleanup/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete cleanup task');
  return res.json();
}

// Alerts APIs
export async function fetchAlerts(params?: { severity?: string; unread_only?: boolean; limit?: number }): Promise<AlertItem[]> {
  const query = new URLSearchParams();
  if (params?.severity) query.append('severity', params.severity);
  if (params?.unread_only) query.append('unread_only', 'true');
  if (params?.limit) query.append('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/alerts?${query.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function markAlertRead(id: number): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/alerts/${id}/read`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to mark alert as read');
  return res.json();
}

export async function markAllAlertsRead(): Promise<{ status: string; marked_count: number }> {
  const res = await fetch(`${API_BASE}/alerts/mark-all-read`, { method: 'PUT' });
  if (!res.ok) throw new Error('Failed to mark all alerts read');
  return res.json();
}

// Trends APIs
export async function fetchHistoricalTrends(): Promise<HistoricalTrendsResponse> {
  const res = await fetch(`${API_BASE}/trends/historical`);
  if (!res.ok) throw new Error('Failed to fetch historical trends');
  return res.json();
}

export async function fetchExperimentalForecast(): Promise<{
  disclaimer: string;
  forecast_horizons: { year: number; projected_relative_index: number; confidence_band: string }[];
  key_risk_drivers: string[];
}> {
  const res = await fetch(`${API_BASE}/trends/experimental-forecast`);
  if (!res.ok) throw new Error('Failed to fetch experimental forecast');
  return res.json();
}

// Reports & CSV APIs
export async function generatePdfReport(): Promise<{ status: string; filename: string; download_url: string }> {
  const res = await fetch(`${API_BASE}/reports/generate-pdf`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to generate PDF report');
  return res.json();
}

export async function fetchReportsList(): Promise<{ filename: string; size_kb: number; type: string; download_url: string }[]> {
  const res = await fetch(`${API_BASE}/reports/list`);
  if (!res.ok) return [];
  return res.json();
}

export async function uploadCsvFile(file: File): Promise<DatasetInspectionReport> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/analytics/upload-csv`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to inspect CSV file');
  return res.json();
}

export async function cleanCsvFile(filename: string): Promise<CleaningResult> {
  const res = await fetch(`${API_BASE}/analytics/clean-csv?filename=${encodeURIComponent(filename)}`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to clean dataset');
  return res.json();
}
