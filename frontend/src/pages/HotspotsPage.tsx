import React, { useState, useEffect } from 'react';
import {
  Flame,
  Sliders,
  RefreshCw,
  MapPin,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Info,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { fetchHotspots, recalculateHotspots, scheduleCleanupFromHotspot } from '../services/api';
import { Hotspot } from '../types';
import { SeverityBadge } from '../components/SeverityBadge';

interface HotspotsPageProps {
  onNavigateToCleanup: () => void;
}

export const HotspotsPage: React.FC<HotspotsPageProps> = ({ onNavigateToCleanup }) => {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRecalculating, setIsRecalculating] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Tunable DBSCAN & Priority parameters
  const [epsKm, setEpsKm] = useState<number>(150);
  const [minSamples, setMinSamples] = useState<number>(5);
  const [densityWeight, setDensityWeight] = useState<number>(0.35);
  const [severityWeight, setSeverityWeight] = useState<number>(0.30);
  const [recencyWeight, setRecencyWeight] = useState<number>(0.20);
  const [plasticWeight, setPlasticWeight] = useState<number>(0.15);

  useEffect(() => {
    loadHotspots();
  }, []);

  const loadHotspots = async () => {
    setLoading(true);
    try {
      const data = await fetchHotspots();
      setHotspots(data);
    } catch (err) {
      console.error('Failed to load hotspots:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRecalculating(true);
    setSuccessMsg(null);
    try {
      const res = await recalculateHotspots({
        eps_km: epsKm,
        min_samples: minSamples,
        density_weight: densityWeight,
        severity_weight: severityWeight,
        recency_weight: recencyWeight,
        plastic_detection_weight: plasticWeight,
      });
      setSuccessMsg(res.message);
      await loadHotspots();
    } catch (err) {
      console.error('Recalculation error:', err);
    } finally {
      setIsRecalculating(false);
    }
  };

  const handleScheduleCleanup = async (hotspotId: number) => {
    try {
      const res = await scheduleCleanupFromHotspot(hotspotId);
      setSuccessMsg(res.message);
      await loadHotspots();
    } catch (err) {
      console.error('Schedule cleanup error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-['Outfit'] flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-400" />
            <span>Intelligent Hotspot Prioritization (DBSCAN + Multi-Attribute Scoring)</span>
          </h2>
          <p className="text-xs text-slate-400">
            Density-Based Spatial Clustering (Haversine metric) identifying persistent marine plastic accumulation zones.
          </p>
        </div>

        <button
          onClick={loadHotspots}
          className="p-2 rounded-lg bg-slate-900 border border-slate-750 text-slate-300 hover:text-white transition-colors self-start"
          title="Refresh List"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-teal-950/60 border border-teal-500/40 text-teal-300 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={onNavigateToCleanup}
            className="text-teal-300 underline font-medium hover:text-white"
          >
            View Cleanup Board
          </button>
        </div>
      )}

      {/* Grid: DBSCAN Config Panel & Hotspot Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Config Panel */}
        <div className="marine-card p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-white text-sm font-['Outfit'] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-400" />
              <span>DBSCAN & Weight Parameters</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Configurable</span>
          </div>

          <form onSubmit={handleRecalculate} className="space-y-4">
            {/* Cluster Radius (eps_km) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Cluster Radius (eps_km)</span>
                <span className="font-mono text-teal-400 font-bold">{epsKm} km</span>
              </div>
              <input
                type="range"
                min="30"
                max="500"
                step="10"
                value={epsKm}
                onChange={(e) => setEpsKm(parseInt(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Localized (30 km)</span>
                <span>Regional Basin (500 km)</span>
              </div>
            </div>

            {/* Min Samples */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">Min Samples in Cluster</span>
                <span className="font-mono text-teal-400 font-bold">{minSamples} obs</span>
              </div>
              <input
                type="range"
                min="2"
                max="25"
                step="1"
                value={minSamples}
                onChange={(e) => setMinSamples(parseInt(e.target.value))}
                className="w-full accent-teal-500 cursor-pointer"
              />
            </div>

            {/* Priority Weights Section */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Priority Formula Weights
              </span>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Observation Density Weight</span>
                  <span className="font-mono text-teal-400 font-bold">{Math.round(densityWeight * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.6"
                  step="0.05"
                  value={densityWeight}
                  onChange={(e) => setDensityWeight(parseFloat(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Severity Score Weight</span>
                  <span className="font-mono text-teal-400 font-bold">{Math.round(severityWeight * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.6"
                  step="0.05"
                  value={severityWeight}
                  onChange={(e) => setSeverityWeight(parseFloat(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Temporal Recency Weight</span>
                  <span className="font-mono text-teal-400 font-bold">{Math.round(recencyWeight * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.4"
                  step="0.05"
                  value={recencyWeight}
                  onChange={(e) => setRecencyWeight(parseFloat(e.target.value))}
                  className="w-full accent-teal-500 cursor-pointer"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isRecalculating}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-gradient-to-r from-teal-500 to-cyan-500 text-slate-950 hover:from-teal-400 hover:to-cyan-400 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              {isRecalculating ? (
                <span>Re-clustering with DBSCAN...</span>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rerun Spatial Clustering</span>
                </>
              )}
            </button>
          </form>

          {/* Scientific Disclaimer Card */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Academic Transparency Note</span>
            </div>
            <p>
              A high observation count reflects survey sampling intensity combined with detected debris. Priority rankings serve as operational guidance for cleanup intervention.
            </p>
          </div>
        </div>

        {/* Right 2 Columns: Ranked Hotspot Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Ranked by Composite Priority Score (Highest to Lowest)</span>
            <span>{hotspots.length} Prioritized Sectors</span>
          </div>

          <div className="space-y-3 max-h-[680px] overflow-y-auto pr-1">
            {hotspots.map((h, index) => (
              <div
                key={h.id || index}
                className="marine-card marine-card-hover p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <h4 className="font-bold text-white text-sm font-['Outfit']">
                      {h.name}
                    </h4>
                    <SeverityBadge level={h.priority_level} score={h.priority_score} size="sm" />
                  </div>

                  {/* Coordinates & Region */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-teal-400" />
                      <span>{h.latitude.toFixed(2)}°, {h.longitude.toFixed(2)}°</span>
                    </span>
                    <span>•</span>
                    <span>{h.ocean || 'Open Ocean'}</span>
                    <span>•</span>
                    <span className="text-teal-400 font-mono font-medium">
                      {h.observation_count} Records
                    </span>
                  </div>

                  {/* Evidence Breakdown Text */}
                  <p className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                    <strong>Evidence:</strong> {h.evidence_summary}
                  </p>
                </div>

                {/* Action button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Priority Index</div>
                    <div className="text-lg font-bold font-mono text-white">
                      {h.priority_score.toFixed(1)}/100
                    </div>
                  </div>

                  {h.status === 'CLEANUP_SCHEDULED' ? (
                    <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Scheduled</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleScheduleCleanup(h.id)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Schedule Cleanup</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
