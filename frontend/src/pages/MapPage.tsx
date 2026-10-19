import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Filter,
  Search,
  PlusCircle,
  RefreshCw,
  Compass,
  CheckCircle,
  AlertCircle,
  Flame,
  Calendar,
  Layers,
  X,
  ArrowRight
} from 'lucide-react';
import { fetchMapMarkers, fetchHotspots, scheduleCleanupFromHotspot } from '../services/api';
import { MapMarker, Hotspot } from '../types';
import { MapComponent } from '../components/MapComponent';
import { SeverityBadge } from '../components/SeverityBadge';

interface MapPageProps {
  onOpenObservationModalWithCoords: (coords: { lat: number; lng: number }) => void;
}

export const MapPage: React.FC<MapPageProps> = ({
  onOpenObservationModalWithCoords,
}) => {
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedOcean, setSelectedOcean] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSetting, setSelectedSetting] = useState<string>('');
  const [selectedYearRange, setSelectedYearRange] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [inspectedCoord, setInspectedCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [inspectedMarker, setInspectedMarker] = useState<MapMarker | null>(null);

  // Map viewport center and zoom for flyTo navigation
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.0, -20.0]);
  const [mapZoom, setMapZoom] = useState<number>(2.5);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadHotspotsList();
  }, []);

  useEffect(() => {
    loadMarkers();
  }, [selectedOcean, selectedSeverity, selectedCategory, selectedSetting, selectedYearRange]);

  const loadHotspotsList = async () => {
    try {
      const data = await fetchHotspots();
      setHotspots(data);
    } catch (e) {
      console.warn('Failed to load hotspots list:', e);
    }
  };

  const loadMarkers = async () => {
    setLoading(true);
    try {
      let year_from: number | undefined;
      let year_to: number | undefined;

      if (selectedYearRange === '2020+') {
        year_from = 2020;
      } else if (selectedYearRange === '2010s') {
        year_from = 2010;
        year_to = 2019;
      } else if (selectedYearRange === '2000s') {
        year_from = 2000;
        year_to = 2009;
      } else if (selectedYearRange === 'pre2000') {
        year_to = 1999;
      }

      const data = await fetchMapMarkers({
        ocean: selectedOcean || undefined,
        severity: selectedSeverity || undefined,
        category: selectedCategory || undefined,
        marine_setting: selectedSetting || undefined,
        year_from,
        year_to,
        search: searchQuery.trim() || undefined,
        limit: 3500,
      });
      setMarkers(data);
    } catch (err) {
      console.error('Failed to load map markers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCoordinateSelect = (lat: number, lng: number) => {
    setInspectedCoord({ lat, lng });
    // Find closest marker within ~0.2 degrees
    const found = markers.find(
      (m) => Math.abs(m.latitude - lat) < 0.25 && Math.abs(m.longitude - lng) < 0.25
    );
    if (found) {
      setInspectedMarker(found);
    }
  };

  const handleSelectHotspot = (hotspotIdStr: string) => {
    setSelectedHotspotId(hotspotIdStr);
    if (!hotspotIdStr) return;
    const target = hotspots.find((h) => String(h.id) === hotspotIdStr);
    if (target) {
      setMapCenter([target.latitude, target.longitude]);
      setMapZoom(6);
      if (target.ocean) setSelectedOcean(target.ocean);
    }
  };

  const handleResetFilters = () => {
    setSelectedOcean('');
    setSelectedSeverity('');
    setSelectedCategory('');
    setSelectedSetting('');
    setSelectedYearRange('');
    setSearchQuery('');
    setSelectedHotspotId('');
    setMapCenter([20.0, -20.0]);
    setMapZoom(2.5);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMarkers();
  };

  const handleScheduleCleanupForHotspot = async (hotspotId: number) => {
    try {
      const res = await scheduleCleanupFromHotspot(hotspotId);
      setActionSuccess(res.message);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (e: any) {
      console.error('Cleanup scheduling failed:', e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Notice */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-500/50 text-teal-300 text-xs flex items-center gap-2 animate-fade-in shadow-xl">
          <CheckCircle className="w-4 h-4 text-teal-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Comprehensive Filter & Control Bar */}
      <div className="marine-card p-4 space-y-3">
        {/* Row 1: Primary Dropdown Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mr-1">
              <Filter className="w-3.5 h-3.5 text-teal-400" />
              <span>Filters:</span>
            </div>

            {/* Ocean Filter */}
            <select
              value={selectedOcean}
              onChange={(e) => setSelectedOcean(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-750 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">All Ocean Basins</option>
              <option value="Atlantic Ocean">Atlantic Ocean</option>
              <option value="Pacific Ocean">Pacific Ocean</option>
              <option value="Indian Ocean">Indian Ocean</option>
              <option value="Arctic Ocean">Arctic Ocean</option>
              <option value="Southern Ocean">Southern Ocean</option>
            </select>

            {/* Severity Filter */}
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-750 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">All Severity Tiers</option>
              <option value="CRITICAL">Critical Severity (&gt;75)</option>
              <option value="HIGH">High Severity (50-75)</option>
              <option value="MEDIUM">Medium Severity (25-50)</option>
              <option value="LOW">Low Severity (&lt;25)</option>
            </select>

            {/* Concentration Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-750 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">All Concentration Classes</option>
              <option value="Very High">Very High Density</option>
              <option value="High">High Density</option>
              <option value="Medium">Medium Density</option>
              <option value="Low">Low Density</option>
              <option value="Very Low">Very Low Density</option>
            </select>

            {/* Marine Setting Filter */}
            <select
              value={selectedSetting}
              onChange={(e) => setSelectedSetting(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-750 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">All Marine Settings</option>
              <option value="Beach">Shoreline / Beach</option>
              <option value="Ocean water">Pelagic Ocean Water</option>
              <option value="Sediment">Benthic Sediment</option>
            </select>

            {/* Date/Year Filter */}
            <select
              value={selectedYearRange}
              onChange={(e) => setSelectedYearRange(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-750 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">All Time Periods</option>
              <option value="2020+">2020 - Present</option>
              <option value="2010s">2010 - 2019</option>
              <option value="2000s">2000 - 2009</option>
              <option value="pre2000">Before 2000</option>
            </select>

            {/* Quick Reset Button */}
            {(selectedOcean || selectedSeverity || selectedCategory || selectedSetting || selectedYearRange || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-900 border border-slate-750 flex items-center gap-1 cursor-pointer transition-colors"
                title="Reset All Filters"
              >
                <X className="w-3 h-3 text-rose-400" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Active Count Badge & Refresh */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-teal-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-teal-500/30 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>{loading ? 'Querying...' : `${markers.length.toLocaleString()} Mapped Points`}</span>
            </span>

            <button
              onClick={loadMarkers}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 transition-colors"
              title="Refresh Points"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Row 2: Hotspot Jump Selector & Keyword Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80">
          {/* Hotspot Jump Selector */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <Flame className="w-4 h-4 text-rose-400 shrink-0" />
            <select
              value={selectedHotspotId}
              onChange={(e) => handleSelectHotspot(e.target.value)}
              className="w-full max-w-md px-3 py-1.5 bg-slate-950 border border-slate-750 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-rose-500 font-medium"
            >
              <option value="">Jump directly to Prioritized Hotspot Sector...</option>
              {hotspots.map((h) => (
                <option key={h.id} value={h.id}>
                  [{h.priority_level}] {h.name} ({h.observation_count} records, {h.priority_score.toFixed(1)} pts)
                </option>
              ))}
            </select>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search region or country..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-750 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 w-48 sm:w-56"
              />
            </div>
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Pin Observation Action */}
          {inspectedCoord && (
            <button
              onClick={() => onOpenObservationModalWithCoords(inspectedCoord)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center gap-1.5 transition-all shadow-md shadow-teal-500/20 cursor-pointer animate-fade-in"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Record at Coords ({inspectedCoord.lat.toFixed(2)}°, {inspectedCoord.lng.toFixed(2)}°)</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Fullscreen Interactive Map */}
      <div className="w-full h-[620px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
        <MapComponent
          markers={markers}
          center={mapCenter}
          zoom={mapZoom}
          height="100%"
          loading={loading}
          interactiveSelect={true}
          onSelectCoordinate={handleCoordinateSelect}
        />
      </div>

      {/* Quick Inspector Footer Drawer */}
      {inspectedMarker && (
        <div className="marine-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-teal-500 animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">
                Observation #{inspectedMarker.id}
              </span>
              <SeverityBadge level={inspectedMarker.severity_level} score={inspectedMarker.severity_score} size="sm" />
              <span className="text-xs text-slate-400 font-mono">
                {inspectedMarker.latitude.toFixed(4)}°, {inspectedMarker.longitude.toFixed(4)}°
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {inspectedMarker.ocean || 'Open Ocean'} • {inspectedMarker.marine_setting || 'Surface Water'} • {inspectedMarker.concentration_class || 'Standard'} • {inspectedMarker.source_type || 'NOAA Scientific Survey'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenObservationModalWithCoords({ lat: inspectedMarker.latitude, lng: inspectedMarker.longitude })}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors"
            >
              Add Related Record Here
            </button>
            <button
              onClick={() => setInspectedMarker(null)}
              className="p-1.5 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Geospatial Compliance Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 px-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-teal-400" />
          <span>Click anywhere to pin coordinates. Use the Points / Clusters / Heatmap toggles to switch visualization modes.</span>
        </div>
        <span className="font-mono text-slate-500">Geodetic Datum: WGS 84 (EPSG:4326) • Spatial Engine: Leaflet Canvas</span>
      </div>
    </div>
  );
};
