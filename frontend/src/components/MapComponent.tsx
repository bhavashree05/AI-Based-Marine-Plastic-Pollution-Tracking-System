import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapMarker } from '../types';
import {
  Layers,
  Maximize2,
  ShieldAlert,
  Flame,
  Grid,
  MapPin,
  RefreshCw,
  AlertCircle,
  Calendar,
  Compass,
  CheckCircle2
} from 'lucide-react';

interface MapComponentProps {
  markers: MapMarker[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  loading?: boolean;
  onSelectCoordinate?: (lat: number, lng: number) => void;
  onScheduleCleanup?: (marker: MapMarker) => void;
  onInspectMarker?: (marker: MapMarker) => void;
  interactiveSelect?: boolean;
}

// Optional custom tile layer (e.g. Mapbox, Stadia Maps) or public defaults
const customTileUrl = (import.meta.env.VITE_MAP_TILE_URL as string | undefined)?.trim();
const customAttribution = (import.meta.env.VITE_MAP_ATTRIBUTION as string | undefined)?.trim() || '&copy; OpenStreetMap contributors';
const CARTO_DARK_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';


export const MapComponent: React.FC<MapComponentProps> = ({
  markers,
  center = [20.0, -20.0],
  zoom = 2.5,
  height = '500px',
  loading = false,
  onSelectCoordinate,
  onScheduleCleanup,
  onInspectMarker,
  interactiveSelect = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const canvasRendererRef = useRef<L.Canvas | null>(null);

  const [activeTileLayer, setActiveTileLayer] = useState<'dark' | 'osm'>('dark');
  const [viewMode, setViewMode] = useState<'markers' | 'clusters' | 'heat'>('markers');
  const [selectedPoint, setSelectedPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [tileError, setTileError] = useState<boolean>(false);

  // Filter strictly valid coordinates according to geospatial rules (-90 to 90, -180 to 180, reject 0,0)
  const validMarkers = useMemo(() => {
    return markers.filter(
      (m) =>
        typeof m.latitude === 'number' &&
        typeof m.longitude === 'number' &&
        !isNaN(m.latitude) &&
        !isNaN(m.longitude) &&
        isFinite(m.latitude) &&
        isFinite(m.longitude) &&
        m.latitude >= -90 &&
        m.latitude <= 90 &&
        m.longitude >= -180 &&
        m.longitude <= 180 &&
        !(m.latitude === 0 && m.longitude === 0)
    );
  }, [markers]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const canvasRenderer = L.canvas({ padding: 0.5 });
      canvasRendererRef.current = canvasRenderer;

      const map = L.map(mapContainerRef.current, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: true,
        maxBounds: [
          [-85, -180],
          [85, 180],
        ],
        minZoom: 2,
        preferCanvas: true,
      });

      // Primary tile layer (defaults to CartoDB Dark Matter, or custom tile provider if configured)
      const primaryUrl = customTileUrl || CARTO_DARK_URL;
      const primaryAttr = customTileUrl
        ? customAttribution
        : '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors';
      const primarySubdomains = customTileUrl ? 'abc' : 'abcd';

      const darkTile = L.tileLayer(primaryUrl, {
        attribution: primaryAttr,
        subdomains: primarySubdomains,
        maxZoom: 19,
      });

      darkTile.on('tileerror', () => {
        setTileError(true);
      });
      darkTile.on('load', () => {
        setTileError(false);
      });

      darkTile.addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;

      // Handle map clicks for coordinate selection
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        // Validate clicked bounds
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
          setSelectedPoint({ lat, lng });
          if (onSelectCoordinate) {
            onSelectCoordinate(Number(lat.toFixed(4)), Number(lng.toFixed(4)));
          }
        }
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Pan to center when props change (e.g. fly to selected hotspot)
  useEffect(() => {
    if (mapInstanceRef.current && center) {
      mapInstanceRef.current.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center?.[0], center?.[1], zoom]);

  // Render Markers, Clusters, or Heat Circles on data or view mode changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    const renderer = canvasRendererRef.current || undefined;

    const getSeverityColor = (sev: string) => {
      switch (sev) {
        case 'CRITICAL':
          return '#f43f5e'; // Rose
        case 'HIGH':
          return '#f97316'; // Orange
        case 'MEDIUM':
          return '#fbbf24'; // Amber
        case 'LOW':
          return '#10b981'; // Emerald
        default:
          return '#38bdf8'; // Sky
      }
    };

    if (viewMode === 'markers') {
      // Individual Canvas Markers
      validMarkers.forEach((m) => {
        const color = getSeverityColor(m.severity_level);
        const radius = m.severity_level === 'CRITICAL' ? 7 : m.severity_level === 'HIGH' ? 5.5 : 4;

        const circleMarker = L.circleMarker([m.latitude, m.longitude], {
          radius,
          fillColor: color,
          color: '#ffffff',
          weight: 1,
          opacity: 0.9,
          fillOpacity: 0.8,
          renderer,
        });

        const popupContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #f8fafc; min-width: 220px; line-height: 1.4;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.15); padding-bottom: 6px;">
              <strong style="color: #38bdf8; font-size: 13px;">Observation #${m.id}</strong>
              <span style="font-size: 10px; padding: 2px 8px; border-radius: 9999px; background: ${color}25; color: ${color}; font-weight: 700; border: 1px solid ${color}50;">
                ${m.severity_level}
              </span>
            </div>
            <div style="margin-bottom: 4px;"><b>Ocean Basin:</b> ${m.ocean || 'Open Ocean'}</div>
            ${m.country ? `<div style="margin-bottom: 4px;"><b>Country/Region:</b> ${m.country}${m.region ? ' (' + m.region + ')' : ''}</div>` : ''}
            <div style="margin-bottom: 4px;"><b>Coordinates:</b> ${m.latitude.toFixed(4)}°, ${m.longitude.toFixed(4)}°</div>
            <div style="margin-bottom: 4px;"><b>Marine Setting:</b> ${m.marine_setting || 'Surface Water'}</div>
            <div style="margin-bottom: 4px;"><b>Category:</b> ${m.concentration_class || 'Unclassified'}</div>
            ${m.measurement !== undefined && m.measurement !== null ? `<div style="margin-bottom: 4px;"><b>Measurement:</b> ${m.measurement} ${m.unit || 'pieces/m³'}</div>` : ''}
            <div style="margin-bottom: 4px;"><b>Severity Score:</b> <b>${m.severity_score.toFixed(1)}/100</b></div>
            ${m.sample_date ? `<div style="margin-bottom: 4px;"><b>Date:</b> ${m.sample_date}</div>` : ''}
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
              <span>Source: ${m.source_type || 'NOAA NCEI'}</span>
              <span style="color: #2dd4bf;">${m.verified_status || 'VERIFIED'}</span>
            </div>
          </div>
        `;

        circleMarker.bindPopup(popupContent, { maxWidth: 300 });
        layer.addLayer(circleMarker);
      });
    } else if (viewMode === 'clusters') {
      // Spatial Grid Clustering (bins points into spatial cells)
      const cellSize = 3.0; // degree cell resolution
      const cells: Record<string, { count: number; sumLat: number; sumLng: number; sumSev: number; maxSev: string }> = {};

      validMarkers.forEach((m) => {
        const cellX = Math.floor(m.longitude / cellSize);
        const cellY = Math.floor(m.latitude / cellSize);
        const key = `${cellY}_${cellX}`;

        if (!cells[key]) {
          cells[key] = { count: 0, sumLat: 0, sumLng: 0, sumSev: 0, maxSev: m.severity_level };
        }
        cells[key].count += 1;
        cells[key].sumLat += m.latitude;
        cells[key].sumLng += m.longitude;
        cells[key].sumSev += m.severity_score;
        if (m.severity_level === 'CRITICAL' || (m.severity_level === 'HIGH' && cells[key].maxSev !== 'CRITICAL')) {
          cells[key].maxSev = m.severity_level;
        }
      });

      Object.values(cells).forEach((cell) => {
        const centroidLat = cell.sumLat / cell.count;
        const centroidLng = cell.sumLng / cell.count;
        const avgSev = cell.sumSev / cell.count;
        const color = getSeverityColor(cell.maxSev);

        const radius = Math.min(32, Math.max(12, 10 + Math.log2(cell.count) * 3));

        const clusterMarker = L.circleMarker([centroidLat, centroidLng], {
          radius,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 0.95,
          fillOpacity: 0.75,
          renderer,
        });

        const popupContent = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #f8fafc; min-width: 200px;">
            <div style="font-weight: 700; color: #38bdf8; font-size: 13px; margin-bottom: 6px;">
              Spatial Cluster (${cell.count} Observations)
            </div>
            <div style="margin-bottom: 3px;"><b>Centroid:</b> ${centroidLat.toFixed(2)}°, ${centroidLng.toFixed(2)}°</div>
            <div style="margin-bottom: 3px;"><b>Average Severity:</b> ${avgSev.toFixed(1)}/100</div>
            <div style="margin-bottom: 6px;"><b>Max Risk Tier:</b> <span style="color: ${color}; font-weight: 700;">${cell.maxSev}</span></div>
            <div style="font-size: 10px; color: #94a3b8; font-style: italic;">
              Click 'Individual Points' to inspect discrete coordinates.
            </div>
          </div>
        `;

        clusterMarker.bindPopup(popupContent);
        layer.addLayer(clusterMarker);
      });
    } else if (viewMode === 'heat') {
      // Density Heat Circles
      validMarkers.forEach((m) => {
        const color = getSeverityColor(m.severity_level);
        const heatCircle = L.circle([m.latitude, m.longitude], {
          radius: 85000, // 85 km radius for regional accumulation
          fillColor: color,
          color: 'transparent',
          weight: 0,
          fillOpacity: 0.18,
          renderer,
        });
        layer.addLayer(heatCircle);
      });
    }
  }, [validMarkers, viewMode]);

  // Toggle Tile Layer (Street Map vs Dark Marine)
  const toggleLayer = () => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    setTileError(false);

    if (activeTileLayer === 'dark') {
      const osmTile = L.tileLayer(OSM_URL, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      });
      osmTile.on('tileerror', () => setTileError(true));
      osmTile.on('load', () => setTileError(false));
      osmTile.addTo(map);
      setActiveTileLayer('osm');
    } else {
      const darkTile = L.tileLayer(customTileUrl || CARTO_DARK_URL, {
        attribution: customTileUrl
          ? customAttribution
          : '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
        subdomains: customTileUrl ? 'abc' : 'abcd',
        maxZoom: 19,
      });
      darkTile.on('tileerror', () => setTileError(true));
      darkTile.on('load', () => setTileError(false));
      darkTile.addTo(map);
      setActiveTileLayer('dark');
    }
  };

  // Reset to Extent: Fit all valid markers into view
  const handleResetExtent = () => {
    if (!mapInstanceRef.current) return;
    if (validMarkers.length > 0) {
      const bounds = L.latLngBounds(validMarkers.map((m) => [m.latitude, m.longitude]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 8 });
    } else {
      mapInstanceRef.current.setView([20.0, -20.0], 2.5);
    }
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-slate-800 shadow-2xl bg-slate-950"
      style={{ height }}
    >
      {/* Map Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1100] bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 animate-fade-in">
          <div className="w-9 h-9 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-teal-300">
            Rendering geographical coordinates...
          </span>
        </div>
      )}

      {/* Empty Data State Overlay */}
      {!loading && validMarkers.length === 0 && (
        <div className="absolute inset-0 z-[1050] bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in pointer-events-none">
          <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 mb-2">
            <AlertCircle className="w-6 h-6 text-amber-400" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1">No Valid Mapped Observations</h4>
          <p className="text-xs text-slate-400 max-w-sm">
            No records matched the selected filters. Please broaden your ocean basin or severity criteria.
          </p>
        </div>
      )}

      {/* Tile Service Fallback Banner */}
      {tileError && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1200] px-4 py-2 rounded-xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs flex items-center justify-between gap-3 backdrop-blur-md shadow-xl animate-fade-in max-w-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Map tile server delay or network limit. Markers & scientific coordinates remain fully plotted.</span>
          </div>
          <button
            onClick={() => setTileError(false)}
            className="text-amber-400 hover:text-amber-100 font-bold px-1.5 py-0.5 rounded cursor-pointer"
            title="Dismiss notice"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Controls: View Mode & Tile Switcher */}
      <div className="absolute top-3 right-3 z-[1000] flex flex-wrap items-center gap-2">
        {/* View Mode Toggle: Markers / Clusters / Heat */}
        <div className="flex items-center rounded-lg bg-slate-900/90 border border-slate-750/90 p-0.5 backdrop-blur-md shadow-lg text-xs">
          <button
            onClick={() => setViewMode('markers')}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'markers'
                ? 'bg-teal-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Individual Coordinate Markers"
          >
            <MapPin className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Points</span>
          </button>
          <button
            onClick={() => setViewMode('clusters')}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'clusters'
                ? 'bg-teal-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Density Grid Clusters"
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clusters</span>
          </button>
          <button
            onClick={() => setViewMode('heat')}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-1 cursor-pointer ${
              viewMode === 'heat'
                ? 'bg-teal-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
            title="Regional Heatmap"
          >
            <Flame className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Heatmap</span>
          </button>
        </div>

        {/* Tile Layer Toggle */}
        <button
          onClick={toggleLayer}
          className="px-2.5 py-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-750 text-xs text-slate-200 flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-all cursor-pointer"
          title="Toggle Tile Theme"
        >
          <Layers className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">{activeTileLayer === 'dark' ? 'Street Map' : 'Dark Marine'}</span>
        </button>

        {/* Reset Extent Button */}
        <button
          onClick={handleResetExtent}
          className="p-1.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-750 text-slate-200 backdrop-blur-md shadow-lg transition-all cursor-pointer"
          title="Fit All Mapped Coordinates"
        >
          <Maximize2 className="w-4 h-4 text-sky-400" />
        </button>
      </div>

      {/* Coordinate Click Inspector */}
      {selectedPoint && interactiveSelect && (
        <div className="absolute top-3 left-3 z-[1000] px-3 py-1.5 rounded-lg bg-slate-900/95 border border-teal-500/50 text-xs text-teal-300 backdrop-blur-md shadow-xl flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-teal-400" />
          <span>Selected Coords: {selectedPoint.lat.toFixed(4)}°, {selectedPoint.lng.toFixed(4)}°</span>
        </div>
      )}

      {/* Bottom Severity Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/90 backdrop-blur-md shadow-2xl text-[11px] text-slate-300 space-y-1.5">
        <div className="font-semibold text-slate-400 text-[10px] tracking-wider uppercase mb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-teal-400" />
            <span>Severity Scale</span>
          </div>
          <span className="font-mono text-teal-400 font-bold">{validMarkers.length.toLocaleString()} pts</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 animate-pulse" />
          <span>Critical (&gt;75)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
          <span>High (50 - 75)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50" />
          <span>Medium (25 - 50)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
          <span>Low (&lt;25)</span>
        </div>
      </div>
    </div>
  );
};
