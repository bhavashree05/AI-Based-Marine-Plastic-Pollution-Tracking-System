import React, { useState, useEffect, useMemo } from 'react';
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
  Globe,
  Waves,
  Layers,
  X,
  ArrowRight,
  ShieldAlert,
  Building,
  Navigation
} from 'lucide-react';
import {
  fetchMapMarkers,
  fetchHotspots,
  scheduleCleanupFromHotspot,
  fetchTNDistrictsSummary,
  fetchTNOverview
} from '../services/api';
import { MapMarker, Hotspot, TNDistrictSummary, TNOverview } from '../types';
import { MapComponent } from '../components/MapComponent';
import { SeverityBadge } from '../components/SeverityBadge';

interface MapPageProps {
  onOpenObservationModalWithCoords: (coords: { lat: number; lng: number }) => void;
}

// Approximate centroids for Tamil Nadu districts for quick navigation & prefilling observation coordinates
const TN_DISTRICT_COORDS: Record<string, [number, number]> = {
  Chennai: [13.0827, 80.2707],
  Thoothukkudi: [8.7642, 78.1348],
  Ramanathapuram: [9.3639, 78.8395],
  Nagapattinam: [10.7672, 79.8449],
  Cuddalore: [11.7480, 79.7714],
  Kanyakumari: [8.0883, 77.5385],
  Thiruvallur: [13.1430, 79.9079],
  Chengalpattu: [12.6819, 79.9888],
  Thiruvarur: [10.7725, 79.6366],
  Pudukkottai: [10.3797, 78.8208],
  Mayiladuthurai: [11.1075, 79.6522],
  Thanjavur: [10.7870, 79.1378],
  Viluppuram: [11.9401, 79.4861],
  Tirunelveli: [8.7139, 77.7567],
  Coimbatore: [11.0168, 76.9558],
  Madurai: [9.9252, 78.1198],
  Tiruchirappalli: [10.7905, 78.7047],
  Salem: [11.6643, 78.1460],
  Tiruppur: [11.1085, 77.3411],
  Erode: [11.3410, 77.7172],
  Dindigul: [10.3673, 77.9803],
  Vellore: [12.9165, 79.1325],
  Ranipet: [12.9229, 79.3326],
  Tirupathur: [12.4925, 78.5678],
  Dharmapuri: [12.1211, 78.1582],
  Krishnagiri: [12.5186, 78.2137],
  Tiruvannamalai: [12.2253, 79.0747],
  Namakkal: [11.2189, 78.1674],
  Karur: [10.9601, 78.0766],
  Perambalur: [11.2342, 78.8820],
  Ariyalur: [11.1401, 79.0786],
  Kallakurichi: [11.7384, 78.9639],
  Sivaganga: [9.8433, 78.4809],
  Virudhunagar: [9.5872, 77.9514],
  Theni: [10.0104, 77.4768],
  Tenkasi: [8.9594, 77.3150],
  Nilgiris: [11.4102, 76.6950],
  Kancheepuram: [12.8342, 79.7036],
};

export const MapPage: React.FC<MapPageProps> = ({
  onOpenObservationModalWithCoords,
}) => {
  // Top-level View Mode: 'world' or 'tamilnadu'
  const [mapMode, setMapMode] = useState<'world' | 'tamilnadu'>('world');

  // Markers and Hotspots
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // World Filters
  const [selectedOcean, setSelectedOcean] = useState<string>('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSetting, setSelectedSetting] = useState<string>('');
  const [selectedYearRange, setSelectedYearRange] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedHotspotId, setSelectedHotspotId] = useState<string>('');

  // Tamil Nadu Specific States
  const [geoJsonData, setGeoJsonData] = useState<any | null>(null);
  const [tnDistricts, setTnDistricts] = useState<TNDistrictSummary[]>([]);
  const [tnOverview, setTnOverview] = useState<TNOverview | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [coastalOnly, setCoastalOnly] = useState<boolean>(false);

  // Map viewport center and zoom for flyTo navigation
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.0, -20.0]);
  const [mapZoom, setMapZoom] = useState<number>(2.5);

  // Inspector & Notifications
  const [inspectedCoord, setInspectedCoord] = useState<{ lat: number; lng: number } | null>(null);
  const [inspectedMarker, setInspectedMarker] = useState<MapMarker | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Initial loads
  useEffect(() => {
    loadHotspotsList();
    loadTamilNaduGeoData();
  }, []);

  // Reload markers whenever filters or map mode changes
  useEffect(() => {
    loadMarkers();
  }, [
    mapMode,
    selectedOcean,
    selectedSeverity,
    selectedCategory,
    selectedSetting,
    selectedYearRange,
    selectedDistrict
  ]);

  const loadHotspotsList = async () => {
    try {
      const data = await fetchHotspots();
      setHotspots(data);
    } catch (e) {
      console.warn('Failed to load hotspots list:', e);
    }
  };

  const loadTamilNaduGeoData = async () => {
    try {
      // 1. Load GeoJSON
      const geoRes = await fetch('/data/tamil-nadu-districts.geojson');
      if (geoRes.ok) {
        const geoJson = await geoRes.json();
        setGeoJsonData(geoJson);
      }

      // 2. Load TN District Profiles and Overview
      const [districts, overview] = await Promise.all([
        fetchTNDistrictsSummary().catch(() => []),
        fetchTNOverview().catch(() => null)
      ]);
      setTnDistricts(districts);
      setTnOverview(overview);
    } catch (err) {
      console.warn('Tamil Nadu GeoData load deferred:', err);
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

      if (mapMode === 'tamilnadu') {
        // Query Tamil Nadu markers
        const data = await fetchMapMarkers({
          state: 'Tamil Nadu',
          district: selectedDistrict || undefined,
          severity: selectedSeverity || undefined,
          category: selectedCategory || undefined,
          marine_setting: selectedSetting || undefined,
          search: searchQuery.trim() || undefined,
          limit: 1500,
        });
        setMarkers(data);
      } else {
        // Query World markers
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
      }
    } catch (err) {
      console.error('Failed to load map markers:', err);
    } finally {
      setLoading(false);
    }
  };

  // Switch View Mode Handler
  const handleSwitchMode = (mode: 'world' | 'tamilnadu') => {
    setMapMode(mode);
    setInspectedMarker(null);
    setInspectedCoord(null);

    if (mode === 'tamilnadu') {
      setMapCenter([10.85, 78.85]);
      setMapZoom(7.3);
    } else {
      setMapCenter([20.0, -20.0]);
      setMapZoom(2.5);
      setSelectedDistrict('');
    }
  };

  // District selection handler
  const handleSelectDistrict = (districtName: string) => {
    setSelectedDistrict(districtName);
    if (!districtName) {
      setMapCenter([10.85, 78.85]);
      setMapZoom(7.3);
      return;
    }

    const coords = TN_DISTRICT_COORDS[districtName];
    if (coords) {
      setMapCenter(coords);
      setMapZoom(9);
    }
  };

  const handleCoordinateSelect = (lat: number, lng: number) => {
    setInspectedCoord({ lat, lng });
    // Find closest marker within ~0.25 degrees
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
    setSelectedDistrict('');
    if (mapMode === 'tamilnadu') {
      setMapCenter([10.85, 78.85]);
      setMapZoom(7.3);
    } else {
      setMapCenter([20.0, -20.0]);
      setMapZoom(2.5);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMarkers();
  };

  // Convert district summaries to a lookup map for fast polygon styling
  const tnDistrictsMap = useMemo(() => {
    const map: Record<string, TNDistrictSummary> = {};
    tnDistricts.forEach((d) => {
      map[d.district_name] = d;
    });
    return map;
  }, [tnDistricts]);

  // Selected district summary data
  const currentDistrictSummary = selectedDistrict ? tnDistrictsMap[selectedDistrict] : null;

  // Filtered districts list for dropdown
  const displayedDistricts = useMemo(() => {
    if (coastalOnly) {
      return tnDistricts.filter((d) => d.is_coastal);
    }
    return tnDistricts;
  }, [tnDistricts, coastalOnly]);

  return (
    <div className="space-y-4">
      {/* Top Banner Notice */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-500/50 text-teal-300 text-xs flex items-center gap-2 animate-fade-in shadow-xl">
          <CheckCircle className="w-4 h-4 text-teal-400" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Mode Switcher Banner: World Ocean Map vs Tamil Nadu District Map */}
      <div className="marine-card p-3 flex flex-col md:flex-row items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-teal-500/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            {mapMode === 'world' ? <Globe className="w-5 h-5 animate-spin-slow" /> : <Waves className="w-5 h-5 text-teal-400" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{mapMode === 'world' ? 'Global Ocean Basin Tracking' : 'Tamil Nadu Coastal & District Marine Map'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-mono font-medium">
                {mapMode === 'world' ? '22.5k Global Points' : '1,076 km Coastline'}
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              {mapMode === 'world'
                ? 'Interactive geospatial visualization of NOAA NCEI marine microplastic records across all 5 world ocean basins.'
                : 'High-resolution vector district boundaries, coastal monitoring stations, and riverine plastic discharge zones.'}
            </p>
          </div>
        </div>

        {/* View Mode Toggle Switch */}
        <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-750 shadow-inner">
          <button
            onClick={() => handleSwitchMode('world')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              mapMode === 'world'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>World Map</span>
          </button>
          <button
            onClick={() => handleSwitchMode('tamilnadu')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              mapMode === 'tamilnadu'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Tamil Nadu Districts</span>
          </button>
        </div>
      </div>

      {/* Tamil Nadu KPI Overview Bar (Only shown in Tamil Nadu mode) */}
      {mapMode === 'tamilnadu' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in">
          <div className="marine-card p-3 bg-slate-900/60 border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400"><Waves className="w-4 h-4" /></div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase">Coastline Length</div>
              <div className="text-base font-bold text-white font-mono">{tnOverview?.total_coastline_km || 1076} km</div>
            </div>
          </div>
          <div className="marine-card p-3 bg-slate-900/60 border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400"><Building className="w-4 h-4" /></div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase">Coastal Districts</div>
              <div className="text-base font-bold text-teal-400 font-mono">14 / 37 Districts</div>
            </div>
          </div>
          <div className="marine-card p-3 bg-slate-900/60 border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400"><ShieldAlert className="w-4 h-4" /></div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase">Mean Pollution Score</div>
              <div className="text-base font-bold text-amber-400 font-mono">{tnOverview?.average_severity || 64.2} / 100</div>
            </div>
          </div>
          <div className="marine-card p-3 bg-slate-900/60 border-slate-800 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400"><Flame className="w-4 h-4" /></div>
            <div>
              <div className="text-[10px] text-slate-400 font-medium uppercase">Critical Hotspot Sectors</div>
              <div className="text-base font-bold text-rose-400 font-mono">{tnOverview?.critical_hotspots_count || 18} Sectors</div>
            </div>
          </div>
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

            {/* In Tamil Nadu mode: District Selector */}
            {mapMode === 'tamilnadu' ? (
              <>
                <select
                  value={selectedDistrict}
                  onChange={(e) => handleSelectDistrict(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-750 rounded-lg text-xs text-white focus:outline-none focus:border-teal-500 font-medium min-w-[200px]"
                >
                  <option value="">All 37 Districts of Tamil Nadu</option>
                  <optgroup label="14 Coastal Districts">
                    {tnDistricts
                      .filter((d) => d.is_coastal)
                      .map((d) => (
                        <option key={d.district_name} value={d.district_name}>
                          🌊 {d.district_name} [{d.risk_level}] ({d.observation_count} obs)
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="23 Inland River Catchment Districts">
                    {tnDistricts
                      .filter((d) => !d.is_coastal)
                      .map((d) => (
                        <option key={d.district_name} value={d.district_name}>
                          🏞️ {d.district_name}
                        </option>
                      ))}
                  </optgroup>
                </select>

                <button
                  onClick={() => setCoastalOnly(!coastalOnly)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    coastalOnly
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                      : 'bg-slate-900 text-slate-400 border-slate-750 hover:text-white'
                  }`}
                  title="Show only the 14 coastal districts"
                >
                  🌊 Coastal Only
                </button>
              </>
            ) : (
              /* In World Mode: Ocean Basin Filter */
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
            )}

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
              <option value="Estuary">Estuary / Creek</option>
            </select>

            {/* Quick Reset Button */}
            {(selectedOcean || selectedSeverity || selectedCategory || selectedSetting || selectedYearRange || searchQuery || selectedDistrict) && (
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
              <span>{loading ? 'Querying...' : `${markers.length.toLocaleString()} Points Plotted`}</span>
            </span>

            <button
              onClick={loadMarkers}
              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-750 text-slate-300 transition-colors cursor-pointer"
              title="Refresh Points"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Row 2: Hotspot Jump Selector & Keyword Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-800/80">
          {/* Hotspot Jump Selector (in World mode) or District Hotspots (in TN mode) */}
          {mapMode === 'world' ? (
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
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Navigation className="w-3.5 h-3.5 text-teal-400" />
              <span>Click on any district polygon or choose from the dropdown to inspect coastal pollution dynamics.</span>
            </div>
          )}

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={mapMode === 'tamilnadu' ? 'Search station, river or town...' : 'Search region or country...'}
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

      {/* Main Interactive Map */}
      <div className="w-full h-[620px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
        <MapComponent
          markers={markers}
          center={mapCenter}
          zoom={mapZoom}
          height="100%"
          loading={loading}
          interactiveSelect={true}
          onSelectCoordinate={handleCoordinateSelect}
          mapMode={mapMode}
          geoJsonData={geoJsonData}
          selectedDistrict={selectedDistrict}
          onSelectDistrict={handleSelectDistrict}
          tnDistrictsData={tnDistrictsMap}
        />
      </div>

      {/* Tamil Nadu District Details Card (When a district is selected) */}
      {mapMode === 'tamilnadu' && currentDistrictSummary && (
        <div className="marine-card p-4 border-l-4 border-l-teal-500 bg-slate-900/90 animate-fade-in shadow-xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    {currentDistrictSummary.district_name} District
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    currentDistrictSummary.is_coastal
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {currentDistrictSummary.is_coastal ? '🌊 Coastal Sector' : '🏞️ Inland Catchment'}
                  </span>
                  <SeverityBadge
                    level={currentDistrictSummary.risk_level}
                    score={currentDistrictSummary.avg_severity}
                    size="sm"
                  />
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Zone: <span className="font-semibold text-teal-300">{currentDistrictSummary.coastal_zone}</span>
                  {currentDistrictSummary.coastal_length_km > 0 && ` • Coastline: ${currentDistrictSummary.coastal_length_km} km`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const coords = TN_DISTRICT_COORDS[currentDistrictSummary.district_name] || [10.8, 78.8];
                  onOpenObservationModalWithCoords({ lat: coords[0], lng: coords[1] });
                }}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-teal-500/20"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Log Record in {currentDistrictSummary.district_name}</span>
              </button>
              <button
                onClick={() => setSelectedDistrict('')}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                title="Deselect District"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                Primary Marine Debris Profile
              </span>
              <p className="text-slate-200">{currentDistrictSummary.dominant_debris}</p>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <span className="font-semibold text-slate-400 uppercase tracking-wider text-[10px] block mb-1">
                River Drainage & Marine Inflow Outfalls
              </span>
              <p className="text-slate-200">{currentDistrictSummary.major_waterways}</p>
            </div>
          </div>
        </div>
      )}

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
              {inspectedMarker.subregion && (
                <span className="text-xs text-teal-300 font-semibold bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                  {inspectedMarker.subregion}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300">
              {inspectedMarker.ocean || 'Open Ocean'} • {inspectedMarker.marine_setting || 'Surface Water'} • {inspectedMarker.concentration_class || 'Standard'} • {inspectedMarker.organization || inspectedMarker.source_type || 'Scientific Survey'}
            </p>
            {inspectedMarker.notes && (
              <p className="text-xs text-slate-400 italic">
                {inspectedMarker.notes}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenObservationModalWithCoords({ lat: inspectedMarker.latitude, lng: inspectedMarker.longitude })}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-slate-950 transition-colors cursor-pointer"
            >
              Add Related Record Here
            </button>
            <button
              onClick={() => setInspectedMarker(null)}
              className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
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
          <span>Click anywhere on the map to pin coordinates. Toggle between World Ocean Map and Tamil Nadu Coastal Map above.</span>
        </div>
        <span className="font-mono text-slate-500">Geodetic Datum: WGS 84 (EPSG:4326) • Spatial Engine: Leaflet Canvas & GeoJSON Vector</span>
      </div>
    </div>
  );
};
