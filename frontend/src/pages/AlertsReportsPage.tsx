import React, { useState, useEffect } from 'react';
import {
  Bell,
  FileText,
  Download,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  CheckCheck
} from 'lucide-react';
import {
  fetchAlerts,
  markAlertRead,
  markAllAlertsRead,
  generatePdfReport,
  fetchReportsList
} from '../services/api';
import { AlertItem } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

export const AlertsReportsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [reportsList, setReportsList] = useState<{ filename: string; size_kb: number; type: string; download_url: string }[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedSeverity, unreadOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [alertsData, reportsData] = await Promise.all([
        fetchAlerts({
          severity: selectedSeverity || undefined,
          unread_only: unreadOnly,
        }),
        fetchReportsList(),
      ]);
      setAlerts(alertsData);
      setReportsList(reportsData);
    } catch (err) {
      console.error('Failed to load alerts/reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await markAlertRead(id);
      await loadData();
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAlertsRead();
      await loadData();
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  };

  const handleGeneratePdf = async () => {
    setIsGeneratingPdf(true);
    setSuccessMsg(null);
    try {
      const res = await generatePdfReport();
      setSuccessMsg(`Executive Environmental PDF report generated successfully: ${res.filename}`);
      await loadData();
      window.open(res.download_url, '_blank');
    } catch (err: any) {
      console.error('PDF report failed:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
            <Bell className="w-5 h-5 text-teal-400" />
            <span>Alerts & Scientific Environmental Reporting</span>
          </h2>
          <p className="text-xs text-slate-400">
            Automated notifications for critical marine hotspots and formal executive PDF/CSV report generation.
          </p>
        </div>

        <button
          onClick={handleGeneratePdf}
          disabled={isGeneratingPdf}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:from-teal-400 hover:to-cyan-400 flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <FileText className="w-4 h-4" />
          <span>{isGeneratingPdf ? 'Generating PDF...' : 'Compile Executive PDF Report'}</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-teal-950/60 border border-teal-500/40 text-teal-300 text-xs flex items-center gap-2 animate-fade-in">
          <CheckCircle className="w-4 h-4 text-teal-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid: Alerts Station & Reports Archive */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: In-App Alerts Station */}
        <div className="lg:col-span-2 marine-card p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-white text-sm font-['Outfit'] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Active Debris Hotspot Alerts</span>
              </h3>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {alerts.length} Total
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-750 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">All Tiers</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
              </select>

              <button
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-colors cursor-pointer ${
                  unreadOnly
                    ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                    : 'bg-slate-900 border-slate-750 text-slate-400'
                }`}
              >
                Unread Only
              </button>

              <button
                onClick={handleMarkAllRead}
                className="px-2.5 py-1 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                title="Acknowledge All"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark All Read</span>
              </button>
            </div>
          </div>

          {/* Alerts Feed */}
          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {alerts.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                No active hotspot alerts match the selected criteria.
              </div>
            ) : (
              alerts.map((a) => (
                <div
                  key={a.id}
                  className={`p-4 rounded-xl border transition-all ${
                    a.is_read
                      ? 'bg-slate-950/40 border-slate-850 opacity-70'
                      : 'bg-slate-900/90 border-slate-750 shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {!a.is_read && <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />}
                      <span className="font-bold text-white text-sm font-['Outfit']">
                        {a.title}
                      </span>
                    </div>
                    <SeverityBadge level={a.severity_level} size="sm" />
                  </div>

                  <p className="text-xs text-slate-300 mb-3">{a.message}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(a.created_at).toLocaleString()}</span>
                    </span>

                    {!a.is_read && (
                      <button
                        onClick={() => handleMarkRead(a.id)}
                        className="text-xs text-teal-400 hover:underline cursor-pointer"
                      >
                        Acknowledge Alert
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Reports Generator & Archive */}
        <div className="marine-card p-5 space-y-5 h-fit">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm font-['Outfit'] flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-sky-400" />
              <span>Report Archive & Data Exports</span>
            </h3>
            <p className="text-xs text-slate-400">Downloadable academic and cleanup briefings.</p>
          </div>

          {/* Quick Export Actions */}
          <div className="space-y-2">
            <button
              onClick={handleGeneratePdf}
              disabled={isGeneratingPdf}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-200 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400" />
                <span>Executive Environmental PDF</span>
              </div>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <a
              href="/api/reports/export-csv"
              download="MarineGuard_Observations.csv"
              className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-200 flex items-center justify-between transition-colors block"
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export Observations (CSV)</span>
              </div>
              <Download className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>

          {/* Past Generated Reports List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Generated Reports ({reportsList.length})
            </h4>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {reportsList.length === 0 ? (
                <div className="text-xs text-slate-500 py-3 text-center">
                  No previous reports compiled.
                </div>
              ) : (
                reportsList.map((r, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="truncate max-w-[170px]">
                      <div className="font-mono text-slate-200 truncate">{r.filename}</div>
                      <div className="text-[10px] text-slate-500">{r.size_kb} KB • {r.type}</div>
                    </div>
                    <a
                      href={r.download_url}
                      download={r.filename}
                      className="p-1.5 rounded-md text-teal-400 hover:bg-slate-800 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Academic Transparency Box */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-teal-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Report Provenance & Limitations</span>
            </div>
            <p>
              Reports include survey sample timestamps, geospatial coordinates, computer vision model latency, and documented limitations suitable for viva presentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
