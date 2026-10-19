import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Upload,
  Download,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  Filter,
  Sparkles,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import {
  uploadCsvFile,
  cleanCsvFile,
  fetchDistributions,
  fetchHistoricalTrends
} from '../services/api';
import {
  DatasetInspectionReport,
  CleaningResult,
  DistributionsData,
  HistoricalTrendsResponse
} from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';

export const AnalyticsPage: React.FC = () => {
  const [inspectionReport, setInspectionReport] = useState<DatasetInspectionReport | null>(null);
  const [cleaningResult, setCleaningResult] = useState<CleaningResult | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [distributions, setDistributions] = useState<DistributionsData | null>(null);
  const [historicalTrends, setHistoricalTrends] = useState<HistoricalTrendsResponse | null>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState<boolean>(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const [dist, trends] = await Promise.all([
        fetchDistributions(),
        fetchHistoricalTrends(),
      ]);
      setDistributions(dist);
      setHistoricalTrends(trends);
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    if (!file.name.endsWith('.csv')) {
      setErrorMsg('Please select a valid CSV dataset file.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);
    setCleaningResult(null);
    try {
      const report = await uploadCsvFile(file);
      setInspectionReport(report);
    } catch (err: any) {
      setErrorMsg(err.message || 'Dataset inspection failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTriggerClean = async () => {
    if (!inspectionReport) return;
    setIsCleaning(true);
    setErrorMsg(null);
    try {
      const res = await cleanCsvFile(inspectionReport.filename);
      setCleaningResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Data cleaning pipeline failed');
    } finally {
      setIsCleaning(false);
    }
  };

  // Prepare missing values chart data
  const missingChartData = inspectionReport
    ? Object.entries(inspectionReport.missing_percentages)
      .filter(([_, pct]) => pct > 0)
      .slice(0, 15)
      .map(([col, pct]) => ({ column: col.length > 18 ? col.substring(0, 18) + '...' : col, percentage: pct }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            <span>Dataset Integration, Preprocessing & Exploratory Analytics</span>
          </h2>
          <p className="text-xs text-slate-400">
            Real NOAA marine microplastics data ingestion, coordinate validation, missingness profiling, and cleaning.
          </p>
        </div>

        {/* Dataset Provenance Badge */}
        <div className="px-3 py-1.5 rounded-lg bg-sky-950/80 border border-sky-800/50 text-xs text-sky-300 font-mono flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
          <span>Active Baseline: NOAA NCEI Microplastics (22,530 Records)</span>
        </div>
      </div>

      {/* CSV Upload & Data Diagnostic Workbench */}
      <div className="marine-card p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-sm font-['Outfit'] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-teal-400" />
              <span>Dataset Diagnostic & Ingestion Pipeline</span>
            </h3>
            <p className="text-xs text-slate-400">
              Upload custom CSV observations to inspect missing fields, duplicate rows, and out-of-bound coordinates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              id="csv-upload-input"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label
              htmlFor="csv-upload-input"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:from-teal-400 hover:to-cyan-400 flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isUploading ? 'Inspecting CSV...' : 'Upload & Analyze CSV'}</span>
            </label>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Diagnostic Results Banner */}
        {inspectionReport && (
          <div className="space-y-4 animate-fade-in">
            {/* 4 Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Imported Rows</div>
                <div className="text-lg font-bold text-white font-mono">{inspectionReport.total_rows.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500">{inspectionReport.total_columns} columns identified</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Accepted Records</div>
                <div className="text-lg font-bold text-emerald-400 font-mono">{(inspectionReport.accepted_records ?? inspectionReport.valid_coordinates_count).toLocaleString()}</div>
                <div className="text-[10px] text-emerald-500/80">Valid WGS 84 Coordinates</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Rejected Anomalies</div>
                <div className="text-lg font-bold text-rose-400 font-mono">{(inspectionReport.rejected_records ?? inspectionReport.invalid_coordinates_count).toLocaleString()}</div>
                <div className="text-[10px] text-rose-500/80">Non-finite or out-of-bounds</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-xs text-slate-400">Duplicate Rows</div>
                <div className="text-lg font-bold text-amber-400 font-mono">{inspectionReport.duplicate_rows}</div>
                <div className="text-[10px] text-amber-500/80">Flagged for deduplication</div>
              </div>
            </div>

            {/* Schema Status Notice */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300">
                <strong>Schema Verification: </strong>
                <span className={inspectionReport.schema_status?.includes('Missing') ? 'text-amber-400' : 'text-teal-400'}>
                  {inspectionReport.schema_status || 'Compatible with Geospatial Standards'}
                </span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Detected: {inspectionReport.lat_column || 'None'} / {inspectionReport.lon_column || 'None'}
              </span>
            </div>

            {/* Zero-Zero Alert Banner if Detected */}
            {Boolean(inspectionReport.zero_zero_coordinates_count && inspectionReport.zero_zero_coordinates_count > 0) && (
              <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Detected {inspectionReport.zero_zero_coordinates_count} placeholder records at (0.0, 0.0) coordinates. These are flagged and excluded from the live tracking map to maintain accuracy.
                </span>
              </div>
            )}

            {/* Missing Value Distribution Chart */}
            {missingChartData.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <h4 className="text-xs font-semibold text-slate-300">
                  Missingness Analysis (% Null per Column)
                </h4>
                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={missingChartData} margin={{ top: 5, right: 10, left: -20, bottom: 25 }}>
                      <XAxis dataKey="column" stroke="#64748b" fontSize={9} angle={-30} textAnchor="end" interval={0} />
                      <YAxis stroke="#64748b" fontSize={9} domain={[0, 100]} />
                      <Tooltip contentStyle={{ backgroundColor: '#090e17', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                      <Bar dataKey="percentage" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Dataset Preview Table */}
            {inspectionReport.preview_rows && inspectionReport.preview_rows.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Raw Ingested Records Sample (First {inspectionReport.preview_rows.length} Rows)
                </h4>
                <div className="max-h-48 overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs text-slate-300 font-mono">
                    <thead className="bg-slate-900 text-[10px] text-slate-400 uppercase border-b border-slate-800">
                      <tr>
                        {Object.keys(inspectionReport.preview_rows[0]).slice(0, 7).map((key) => (
                          <th key={key} className="p-2 whitespace-nowrap">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {inspectionReport.preview_rows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          {Object.values(row).slice(0, 7).map((val: any, vIdx) => (
                            <td key={vIdx} className="p-2 whitespace-nowrap text-slate-200">
                              {val !== null ? String(val) : <span className="text-slate-600 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Execute Data Cleaning Pipeline */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-teal-950/30 border border-teal-500/30">
              <div className="text-xs text-slate-300">
                <strong>Standard Data Cleaning:</strong> Drop entirely empty columns, purge duplicate entries, exclude invalid (0,0) coordinates, and normalize dates into ISO 8601.
              </div>
              <button
                onClick={handleTriggerClean}
                disabled={isCleaning}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50 shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isCleaning ? 'Cleaning Dataset...' : 'Clean Dataset & Export'}</span>
              </button>
            </div>

            {/* Clean Result Alert & Cleaning Audit Steps */}
            {cleaningResult && (
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs space-y-3 animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-sm">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Data Cleaning Pipeline Executed Successfully</span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {cleaningResult.summary_explanation ||
                        `Purged ${cleaningResult.dropped_duplicate_rows} duplicates, dropped ${cleaningResult.dropped_empty_columns.length} empty columns, parsed ${cleaningResult.date_records_parsed} timestamped samples.`}
                    </p>
                  </div>
                  <a
                    href={cleaningResult.download_url}
                    download={cleaningResult.cleaned_filename}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Cleaned CSV</span>
                  </a>
                </div>

                {cleaningResult.cleaning_steps && cleaningResult.cleaning_steps.length > 0 && (
                  <div className="p-2.5 rounded-lg bg-slate-950/60 border border-emerald-500/20 space-y-1 text-[11px] text-slate-300">
                    <div className="font-semibold text-emerald-400 text-[10px] uppercase tracking-wider">
                      Applied Cleaning Operations:
                    </div>
                    {cleaningResult.cleaning_steps.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Historical Trend Analysis */}
      <div className="marine-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-white text-base font-['Outfit'] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>Historical Marine Microplastic Sampling Trends</span>
            </h3>
            <p className="text-xs text-slate-400">
              Evolution of documented oceanographic sampling cruises from 1980s to present.
            </p>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {historicalTrends?.total_timestamped_records.toLocaleString()} Timestamped Records
          </div>
        </div>

        {/* Timeline Line Chart */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalTrends?.timeline || []} margin={{ top: 10, right: 20, left: -10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
              <YAxis stroke="#64748b" fontSize={10} />
              <Tooltip
                contentStyle={{ backgroundColor: '#090e17', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                itemStyle={{ color: '#38bdf8' }}
              />
              <Line type="monotone" dataKey="observation_count" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3, fill: '#38bdf8' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trend Interpretation Note */}
        <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          <strong>Trend Interpretation: </strong>
          {historicalTrends?.interpretation}
        </div>
      </div>
    </div>
  );
};
