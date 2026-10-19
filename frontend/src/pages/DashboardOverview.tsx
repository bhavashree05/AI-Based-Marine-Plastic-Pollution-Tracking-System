import React, { useEffect, useState } from 'react';
import {
  Waves,
  MapPin,
  Scan,
  Flame,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  FileText,
  ShieldCheck
} from 'lucide-react';
import {
  fetchAnalyticsOverview,
  fetchDistributions,
  fetchMapMarkers,
  fetchAlerts,
} from '../services/api';
import { AnalyticsOverview, DistributionsData, MapMarker, AlertItem } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';
import { MapComponent } from '../components/MapComponent';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardOverviewProps {
  onNavigateTab: (tab: string) => void;
  onOpenObservationModal: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigateTab,
  onOpenObservationModal,
}) => {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [distributions, setDistributions] = useState<DistributionsData | null>(null);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [ovData, distData, mapData, alertData] = await Promise.all([
        fetchAnalyticsOverview(),
        fetchDistributions(),
        fetchMapMarkers({ limit: 800 }),
        fetchAlerts({ limit: 5 }),
      ]);
      setOverview(ovData);
      setDistributions(distData);
      setMarkers(mapData);
      setAlerts(alertData);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const SEVERITY_COLORS = {
    CRITICAL: '#f43f5e',
    HIGH: '#f97316',
    MEDIUM: '#fbbf24',
    LOW: '#10b981',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notice */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-blue-950/60 border border-cyan-500/30 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white font-['Outfit']">
              MarineGuard AI Operational Environmental Observatory
            </h2>
            <p className="text-xs text-slate-300">
              Synchronizing verified NOAA NCEI marine survey records with deep YOLO computer vision debris inference.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('detection')}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 text-slate-950 hover:bg-teal-400 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Launch CV Detector</span>
          </button>
          <button
            onClick={onOpenObservationModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-200 hover:text-white border border-slate-700 transition-all"
          >
            Record Observation
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Observations */}
        <div className="marine-card marine-card-hover p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Valid Observations</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <Waves className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-['Outfit']">
              {loading ? '...' : (overview?.total_observations || 0).toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 mt-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{overview?.distinct_locations || 0} Distinct Sectors</span>
            </div>
          </div>
        </div>

        {/* Card 2: AI Detections & Plastics */}
        <div className="marine-card marine-card-hover p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">AI Debris Inferences</span>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
              <Scan className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-['Outfit']">
              {loading ? '...' : overview?.total_ai_inferences || 0}
            </div>
            <div className="text-xs text-teal-400 mt-1">
              {overview?.total_detected_plastics || 0} Plastic Objects Cataloged
            </div>
          </div>
        </div>

        {/* Card 3: Prioritized Hotspots */}
        <div className="marine-card marine-card-hover p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">High-Priority Hotspots</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-['Outfit']">
              {loading ? '...' : overview?.high_priority_hotspots || 0}
            </div>
            <div className="text-xs text-rose-400 mt-1">
              DBSCAN Spatial Clustering Active
            </div>
          </div>
        </div>

        {/* Card 4: Remediation Progress */}
        <div className="marine-card marine-card-hover p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cleanup Operations</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-white font-['Outfit']">
              {loading ? '...' : `${overview?.completed_cleanups || 0}/${overview?.total_cleanup_tasks || 0}`}
            </div>
            <div className="text-xs text-emerald-400 mt-1">
              {overview?.total_cleanup_tasks
                ? `${Math.round(((overview.completed_cleanups || 0) / overview.total_cleanup_tasks) * 100)}% Tasks Completed`
                : 'No pending tasks'}
            </div>
          </div>
        </div>
      </div>

      {/* Main Map & Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Interactive Map */}
        <div className="lg:col-span-2 marine-card p-4 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold text-white text-base font-['Outfit'] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-400" />
                <span>Geospatial Pollution Hotspot Map</span>
              </h3>
              <p className="text-xs text-slate-400">
                Displaying real-time coordinate coordinates and severity classification
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('map')}
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>Fullscreen Map</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-[420px] w-full rounded-xl overflow-hidden border border-slate-800">
            <MapComponent markers={markers} height="100%" loading={loading} />
          </div>
        </div>

        {/* Right Col: Priority Alerts & Quick Action */}
        <div className="marine-card p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white text-base font-['Outfit'] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Recent High-Priority Alerts</span>
              </h3>
              <button
                onClick={() => onNavigateTab('alerts')}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium cursor-pointer"
              >
                View All
              </button>
            </div>

            {/* Alerts Feed */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {alerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  No active critical alerts detected.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-200 line-clamp-1">
                        {alert.title}
                      </span>
                      <SeverityBadge level={alert.severity_level} size="sm" />
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{new Date(alert.created_at).toLocaleDateString()}</span>
                      <button
                        onClick={() => onNavigateTab('cleanup')}
                        className="text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Plan Cleanup
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-teal-950/30 border border-teal-500/20 text-xs text-teal-300">
            <strong>Decision-Support Notice:</strong> Prioritized hotspots reflect empirical sampling cluster density and visual waste evidence.
          </div>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Chart 1: Ocean Basin Distribution */}
        <div className="marine-card p-4">
          <h3 className="font-bold text-white text-sm font-['Outfit'] mb-1">
            Observations by Ocean Basin
          </h3>
          <p className="text-xs text-slate-400 mb-4">Sample count per global oceanic region</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributions?.oceans || []} margin={{ top: 5, right: 10, left: -20, bottom: 20 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} interval={0} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090e17', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  itemStyle={{ color: '#38bdf8' }}
                />
                <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Severity Distribution Pie */}
        <div className="marine-card p-4">
          <h3 className="font-bold text-white text-sm font-['Outfit'] mb-1">
            Pollution Severity Breakdown
          </h3>
          <p className="text-xs text-slate-400 mb-4">Proportion across 4 transparent tiers</p>
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributions?.severity_levels || []}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {(distributions?.severity_levels || []).map((entry, index) => {
                    const color = SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS] || '#38bdf8';
                    return <Cell key={`cell-${index}`} fill={color} />;
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#090e17', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Marine Setting Distribution */}
        <div className="marine-card p-4">
          <h3 className="font-bold text-white text-sm font-['Outfit'] mb-1">
            Marine Setting Breakdown
          </h3>
          <p className="text-xs text-slate-400 mb-4">Pelagic vs Shoreline vs Benthic sampling</p>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributions?.marine_settings || []} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <XAxis type="number" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={9} tickLine={false} width={85} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#090e17', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  itemStyle={{ color: '#2dd4bf' }}
                />
                <Bar dataKey="count" fill="#14b8a6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
