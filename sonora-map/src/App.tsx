import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Layers, MapPin, Plus, Trash2, CheckCircle2, AlertCircle, Clock, Menu, X, Activity, Filter, Users, Map as MapIcon, BarChart3, TrendingUp } from 'lucide-react';
import HeatmapLayer from './HeatmapLayer';

type MarkerState = 'completed' | 'in-progress' | 'pending';

interface MapMarker {
  id: string;
  name: string;
  date: string;
  lat: number;
  lng: number;
  state: MarkerState;
  note: string;
  responsible: string;
  district: string;
  progress: number;
}

const statusColors: Record<MarkerState, string> = {
  'completed': '#22c55e', // green-500
  'in-progress': '#eab308', // yellow-500
  'pending': '#ef4444', // red-500
};

const MOCK_DISTRICTS = ['Sección 001', 'Sección 002', 'Sección 003', 'Sección 004'];
const MOCK_COORDINATORS = ['Sin asignar', 'Ana Silva', 'Carlos Gómez', 'Luis Mendoza', 'María José'];

const sonoraGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { name: "Sonora" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-114.8, 32.5],
            [-108.9, 31.3],
            [-108.8, 26.3],
            [-111.0, 27.9],
            [-112.5, 29.8],
            [-114.8, 32.5]
          ]
        ]
      }
    }
  ]
};

// Custom DivIcon for the map markers using dynamic colors
const createCustomIcon = (state: MarkerState) => {
  const color = statusColors[state];
  return L.divIcon({
    className: 'custom-leaflet-icon',
    html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: ${color}; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.5));">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
      <circle cx="12" cy="10" r="3" fill="white"></circle>
    </svg>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

function ClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function App() {
  const [markers, setMarkers] = useState<MapMarker[]>(() => {
    const saved = localStorage.getItem('sonora-map-markers');
    return saved ? JSON.parse(saved) : [];
  });

  const [showSections, setShowSections] = useState(true);
  const [showLocalDistricts, setShowLocalDistricts] = useState(false);
  const [showFederalDistricts, setShowFederalDistricts] = useState(false);
  const [showSonoraState, setShowSonoraState] = useState(true);

  const [sectionsData, setSectionsData] = useState<any>(null);
  const [localDistrictsData, setLocalDistrictsData] = useState<any>(null);
  const [federalDistrictsData, setFederalDistrictsData] = useState<any>(null);

  // New features state
  const [viewMode, setViewMode] = useState<'markers' | 'heatmap'>('markers');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Filters
  const [filterDistrict, setFilterDistrict] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [filterCoordinator, setFilterCoordinator] = useState<string>('all');

  const [addingMode, setAddingMode] = useState(false);

  useEffect(() => {
    localStorage.setItem('sonora-map-markers', JSON.stringify(markers));
  }, [markers]);

  useEffect(() => {
    if (showSections && !sectionsData) fetch('/data/sections.json').then(r => r.json()).then(setSectionsData).catch(console.error);
  }, [showSections, sectionsData]);

  useEffect(() => {
    if (showLocalDistricts && !localDistrictsData) fetch('/data/local-districts.json').then(r => r.json()).then(setLocalDistrictsData).catch(console.error);
  }, [showLocalDistricts, localDistrictsData]);

  useEffect(() => {
    if (showFederalDistricts && !federalDistrictsData) fetch('/data/federal-districts.json').then(r => r.json()).then(setFederalDistrictsData).catch(console.error);
  }, [showFederalDistricts, federalDistrictsData]);

  const handleMapClick = (lat: number, lng: number) => {
    if (!addingMode) return;
    
    const newMarker: MapMarker = {
      id: Date.now().toString(),
      name: '',
      date: new Date().toISOString().split('T')[0],
      lat,
      lng,
      state: 'pending',
      note: 'Nueva ubicación',
      responsible: 'Sin asignar',
      district: MOCK_DISTRICTS[0],
      progress: 0,
    };
    
    setMarkers(prev => [...prev, newMarker]);
    setAddingMode(false); // Disable adding mode after 1 placement
  };

  const updateMarker = (id: string, updates: Partial<MapMarker>) => {
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMarker = (id: string) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  // Filtered markers
  const filteredMarkers = useMemo(() => {
    return markers.filter(m => {
      if (filterDistrict !== 'all' && m.district !== filterDistrict) return false;
      if (filterState !== 'all' && m.state !== filterState) return false;
      if (filterCoordinator !== 'all' && m.responsible !== filterCoordinator) return false;
      return true;
    });
  }, [markers, filterDistrict, filterState, filterCoordinator]);

  // Analytics
  const activeCount = markers.filter(m => m.state === 'in-progress').length;
  const pendingCount = markers.filter(m => m.state === 'pending').length;
  const completedCount = markers.filter(m => m.state === 'completed').length;
  const globalProgress = markers.length === 0 ? 0 : Math.round((markers.reduce((acc, m) => acc + m.progress, 0) / (markers.length * 100)) * 100);

  const heatmapData = useMemo(() => {
    // Return format: [lat, lng, intensity]
    // Intensity could be based on progress (less progress = hotter, or more progress = hotter). 
    // Here we just use a flat density (1) to show "hotspots" of operations
    return filteredMarkers.map(m => [m.lat, m.lng, 1] as [number, number, number]);
  }, [filteredMarkers]);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      
      {/* Mobile Header (Visible only on md<) */}
      <div className="md:hidden absolute top-0 w-full bg-slate-800 z-30 p-4 border-b border-slate-700 flex justify-between items-center shadow-lg">
        <h1 className="text-xl font-bold flex items-center gap-2 text-blue-400">
          <Layers size={20} /> Tracker
        </h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 bg-slate-700 rounded-lg">
          {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Left Panel UI */}
      <div className={`
        fixed md:relative top-0 left-0 h-full w-80 bg-slate-800 shrink-0 flex flex-col shadow-2xl z-20 transition-transform duration-300 ease-in-out border-r border-slate-700
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        pt-20 md:pt-0
      `}>
        <div className="p-6 flex flex-col h-full overflow-y-auto custom-scrollbar gap-6">
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold flex items-center gap-2 mb-1 text-blue-400">
              <Activity size={24} /> Sonora Tracker
            </h1>
            <p className="text-sm text-slate-400">Control de Campaña Territorial</p>
          </div>

          {/* Dashboard Summary */}
          <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-700">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-3">
              <BarChart3 size={14} /> Resumen Estatal
            </h2>
            <div className="grid grid-cols-3 gap-2 text-center mb-3">
              <div className="bg-green-500/10 p-2 rounded-lg border border-green-500/20">
                <div className="text-xl font-black text-green-400">{completedCount}</div>
                <div className="text-[10px] uppercase text-slate-400">Completos</div>
              </div>
              <div className="bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
                <div className="text-xl font-black text-yellow-400">{activeCount}</div>
                <div className="text-[10px] uppercase text-slate-400">Activos</div>
              </div>
              <div className="bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                <div className="text-xl font-black text-red-400">{pendingCount}</div>
                <div className="text-[10px] uppercase text-slate-400">Pendientes</div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Avance Global</span>
                <span className="font-bold text-blue-400">{globalProgress}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-1.5">
                <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${globalProgress}%` }}></div>
              </div>
            </div>
          </div>

          {/* View Modes */}
          <div className="flex bg-slate-700/50 p-1 rounded-lg">
            <button 
              onClick={() => setViewMode('markers')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition ${viewMode === 'markers' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <MapPin size={16} /> Pines
            </button>
            <button 
              onClick={() => setViewMode('heatmap')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition ${viewMode === 'heatmap' ? 'bg-orange-500/20 text-orange-400 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <TrendingUp size={16} /> Mapa de Calor
            </button>
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Layers size={16}/> Capas
            </h2>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700 transition">
                <span className="text-sm font-medium">Estado de Sonora</span>
                <input type="checkbox" className="w-4 h-4 accent-slate-400" checked={showSonoraState} onChange={e => setShowSonoraState(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between p-2.5 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700 transition">
                <span className="text-sm font-medium">Secciones Electorales</span>
                <input type="checkbox" className="w-4 h-4 accent-blue-500" checked={showSections} onChange={e => setShowSections(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between p-2.5 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700 transition">
                <span className="text-sm font-medium">Distritos Locales</span>
                <input type="checkbox" className="w-4 h-4 accent-purple-500" checked={showLocalDistricts} onChange={e => setShowLocalDistricts(e.target.checked)} />
              </label>
              <label className="flex items-center justify-between p-2.5 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700 transition">
                <span className="text-sm font-medium">Distritos Federales</span>
                <input type="checkbox" className="w-4 h-4 accent-emerald-500" checked={showFederalDistricts} onChange={e => setShowFederalDistricts(e.target.checked)} />
              </label>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Filter size={16}/> Filtros
            </h2>
            <div className="space-y-3">
              <select 
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500"
                value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
              >
                <option value="all">Todas las Zonas</option>
                {MOCK_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select 
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500"
                value={filterState} onChange={e => setFilterState(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="completed">Completado</option>
                <option value="in-progress">Activos</option>
                <option value="pending">Pendientes</option>
              </select>
              <select 
                className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-sm outline-none focus:border-blue-500"
                value={filterCoordinator} onChange={e => setFilterCoordinator(e.target.value)}
              >
                <option value="all">Todos los Coordinadores</option>
                {MOCK_COORDINATORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-auto">
            <button 
              onClick={() => { setAddingMode(!addingMode); setIsMobileMenuOpen(false); }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition ${
                addingMode ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 animate-pulse' : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              <Plus size={18} />
              {addingMode ? 'Modo Intervención...' : 'Nueva Intervención'}
            </button>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="flex-1 relative bg-slate-950 mt-16 md:mt-0">
        <MapContainer 
          center={[29.0, -110.0]} 
          zoom={6} 
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          
          <ClickHandler onMapClick={handleMapClick} />

          {/* GeoJSON Sections */}
          {showSonoraState && (
            <GeoJSON 
              key="sonorastate"
              data={sonoraGeoJSON as any} 
              style={{ color: 'blue', weight: 2, fillOpacity: 0.1 }}
              onEachFeature={(feature, layer) => {
                layer.bindPopup('Estado de Sonora');
              }}
            />
          )}

          {showSections && sectionsData && (
            <GeoJSON 
              key="sections"
              data={sectionsData} 
              style={{
                color: '#3b82f6', weight: 1, opacity: 0.6, fillColor: '#2563eb', fillOpacity: 0.1,
              }}
              onEachFeature={(feature, layer) => {
                if (feature.properties) {
                  layer.bindPopup(`
                    <div style="font-family: sans-serif;">
                      <h3 style="margin: 0; font-weight: bold; color: #1e293b;">${feature.properties.name || 'Sección'}</h3>
                      ${feature.properties.local ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">${feature.properties.local}</p>` : ''}
                      ${feature.properties.federal ? `<p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">${feature.properties.federal}</p>` : ''}
                    </div>
                  `);
                }
              }}
            />
          )}

          {/* GeoJSON Local Districts */}
          {showLocalDistricts && localDistrictsData && (
            <GeoJSON 
              key="local"
              data={localDistrictsData} 
              style={{ color: '#a855f7', weight: 3, opacity: 0.8, fillColor: 'transparent' }}
            />
          )}

          {/* GeoJSON Federal Districts */}
          {showFederalDistricts && federalDistrictsData && (
            <GeoJSON 
              key="federal"
              data={federalDistrictsData} 
              style={{ color: '#10b981', weight: 4, opacity: 0.9, fillColor: 'transparent' }}
            />
          )}

          {/* Heatmap Layer */}
          {viewMode === 'heatmap' && heatmapData.length > 0 && (
            <HeatmapLayer points={heatmapData} />
          )}

          {/* Markers */}
          {viewMode === 'markers' && filteredMarkers.map((marker) => (
            <Marker 
              key={marker.id} 
              position={[marker.lat, marker.lng]}
              icon={createCustomIcon(marker.state)}
            >
              <Popup className="custom-popup" minWidth={280}>
                <div className="flex flex-col gap-3 min-w-[280px]">
                  <div className="font-bold text-slate-800 border-b pb-2 flex items-center justify-between">
                    <span>Intervención Territorial</span>
                    <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{marker.progress}%</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Nombre</label>
                      <input 
                        type="text"
                        className="p-1.5 border rounded-md text-sm bg-slate-50 outline-none w-full"
                        value={marker.name || ''}
                        placeholder="Nombre..."
                        onChange={(e) => updateMarker(marker.id, { name: e.target.value })}
                      />
                    </div>

                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Fecha</label>
                      <input 
                        type="date"
                        className="p-1.5 border rounded-md text-sm bg-slate-50 outline-none w-full"
                        value={marker.date || ''}
                        onChange={(e) => updateMarker(marker.id, { date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Estado</label>
                      <select 
                        className="p-1.5 border rounded-md text-sm bg-slate-50 outline-none w-full"
                        value={marker.state}
                        onChange={(e) => updateMarker(marker.id, { state: e.target.value as MarkerState })}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="in-progress">En proceso</option>
                        <option value="completed">Listo</option>
                      </select>
                    </div>

                    <div className="flex-1 flex flex-col gap-1">
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Sección</label>
                      <select 
                        className="p-1.5 border rounded-md text-sm bg-slate-50 outline-none w-full"
                        value={marker.district}
                        onChange={(e) => updateMarker(marker.id, { district: e.target.value })}
                      >
                        {MOCK_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center gap-1"><Users size={12}/> Responsable</label>
                    <select 
                      className="p-1.5 border rounded-md text-sm bg-slate-50 outline-none"
                      value={marker.responsible}
                      onChange={(e) => updateMarker(marker.id, { responsible: e.target.value })}
                    >
                      {MOCK_COORDINATORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Progreso</label>
                      <span className="text-xs font-medium text-slate-600">{marker.progress}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="5"
                      className="w-full accent-blue-500"
                      value={marker.progress}
                      onChange={(e) => updateMarker(marker.id, { progress: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Notas</label>
                    <textarea 
                      className="p-2 border rounded-md text-sm bg-slate-50 outline-none resize-none"
                      rows={2}
                      value={marker.note}
                      onChange={(e) => updateMarker(marker.id, { note: e.target.value })}
                      placeholder="Reporte de avance..."
                    />
                  </div>

                  <button 
                    onClick={() => removeMarker(marker.id)}
                    className="flex items-center justify-center gap-1 mt-1 w-full py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md text-sm font-medium transition"
                  >
                    <Trash2 size={14} /> Eliminar Intervención
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Overlay Toast when adding mode is active */}
        {addingMode && (
          <div className="absolute bottom-10 md:top-6 md:bottom-auto left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-6 py-3 rounded-full font-medium shadow-xl flex items-center gap-2 animate-bounce whitespace-nowrap text-sm md:text-base">
            <MapPin size={20} />
            Selecciona la ubicación
          </div>
        )}
      </div>
    </div>
  );
}
