import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, Plus, Trash2, Activity, Filter, Users, BarChart3, TrendingUp, Sun, Moon, Globe, Mountain } from 'lucide-react';
import HeatmapLayer from './HeatmapLayer';
import { db } from '../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import './Territory.css';

const statusColors = {
  'completed': '#22c55e',
  'in-progress': '#eab308',
  'pending': '#ef4444',
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

const createCustomIcon = (state) => {
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

const createLiveIcon = (role, customColor) => {
  const color = customColor || (role.includes('Admin') ? '#ef4444' : '#3b82f6');
  return L.divIcon({
    className: 'live-tracking-icon',
    html: `<div style="position: relative;">
      <div style="position: absolute; top: -10px; left: -10px; width: 40px; height: 40px; background: ${color}; opacity: 0.2; border-radius: 50%; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="fill: ${color}; filter: drop-shadow(0 0 8px ${color}); position: relative;">
        <circle cx="12" cy="12" r="10"></circle>
        <circle cx="12" cy="12" r="3" fill="white"></circle>
      </svg>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

function ClickHandler({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function Territory() {
  const [activeLocations, setActiveLocations] = useState([]);
  const [markers, setMarkers] = useState(() => {
    const saved = localStorage.getItem('sonora-map-markers');
    return saved ? JSON.parse(saved) : [];
  });

  const [showSections, setShowSections] = useState(true);
  const [showLocalDistricts, setShowLocalDistricts] = useState(false);
  const [showFederalDistricts, setShowFederalDistricts] = useState(false);
  const [showSonoraState, setShowSonoraState] = useState(true);

  const [sectionsData, setSectionsData] = useState(null);
  const [localDistrictsData, setLocalDistrictsData] = useState(null);
  const [federalDistrictsData, setFederalDistrictsData] = useState(null);

  const [viewMode, setViewMode] = useState('markers');
  
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [filterState, setFilterState] = useState('all');
  const [filterCoordinator, setFilterCoordinator] = useState('all');

  const [addingMode, setAddingMode] = useState(false);
  const [mapStyle, setMapStyle] = useState('dark');

  const mapStylesConfig = {
    dark: {
      url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      attribution: '&copy; CARTO',
      name: 'Nocturno',
      icon: <Moon size={16} />
    },
    light: {
      url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      attribution: '&copy; CARTO',
      name: 'Día',
      icon: <Sun size={16} />
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Tiles &copy; Esri',
      name: 'Satélite',
      icon: <Globe size={16} />
    },
    terrain: {
      url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
      attribution: '&copy; OpenTopoMap',
      name: 'Terreno',
      icon: <Mountain size={16} />
    }
  };

  useEffect(() => {
    localStorage.setItem('sonora-map-markers', JSON.stringify(markers));
  }, [markers]);

  // Suscripción a Rastreo en Tiempo Real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'active_locations'), (snapshot) => {
      const locations = snapshot.docs.map(doc => ({
        ...doc.data()
      }));
      setActiveLocations(locations);
    }, (error) => {
      console.error("Firestore live tracking error:", error);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (showSections && !sectionsData) fetch('/data/sections.json').then(r => r.json()).then(setSectionsData).catch(console.error);
  }, [showSections, sectionsData]);

  useEffect(() => {
    if (showLocalDistricts && !localDistrictsData) fetch('/data/local-districts.json').then(r => r.json()).then(setLocalDistrictsData).catch(console.error);
  }, [showLocalDistricts, localDistrictsData]);

  useEffect(() => {
    if (showFederalDistricts && !federalDistrictsData) fetch('/data/federal-districts.json').then(r => r.json()).then(setFederalDistrictsData).catch(console.error);
  }, [showFederalDistricts, federalDistrictsData]);

  const handleMapClick = (lat, lng) => {
    if (!addingMode) return;
    
    const newMarker = {
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
    setAddingMode(false);
  };

  const updateMarker = (id, updates) => {
    setMarkers(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));
  };

  const removeMarker = (id) => {
    setMarkers(prev => prev.filter(m => m.id !== id));
  };

  const filteredMarkers = useMemo(() => {
    return markers.filter(m => {
      if (filterDistrict !== 'all' && m.district !== filterDistrict) return false;
      if (filterState !== 'all' && m.state !== filterState) return false;
      if (filterCoordinator !== 'all' && m.responsible !== filterCoordinator) return false;
      return true;
    });
  }, [markers, filterDistrict, filterState, filterCoordinator]);

  const activeCount = markers.filter(m => m.state === 'in-progress').length;
  const pendingCount = markers.filter(m => m.state === 'pending').length;
  const completedCount = markers.filter(m => m.state === 'completed').length;
  const globalProgress = markers.length === 0 ? 0 : Math.round((markers.reduce((acc, m) => acc + m.progress, 0) / (markers.length * 100)) * 100);

  const heatmapData = useMemo(() => {
    const points = filteredMarkers.map(m => [m.lat, m.lng, 1]);
    
    // Incluir ubicaciones activas en el mapa de calor con mayor peso
    activeLocations.forEach(loc => {
      points.push([loc.lat, loc.lng, 2]);
    });

    return points;
  }, [filteredMarkers, activeLocations]);

  return (
    <div className="territory-root">
      {/* Left Sidebar Panel */}
      <div className="territory-sidebar">
        <div className="territory-sidebar-inner">
          {/* Brand */}
          <div className="territory-brand">
            <h1 className="territory-brand-title">
              <Activity size={24} /> Sonora Tracker
            </h1>
            <p className="territory-brand-sub">Control de Campaña Territorial</p>
          </div>

          {/* Dashboard Summary */}
          <div className="territory-summary-card">
            <h2 className="territory-summary-title">
              <BarChart3 size={14} /> Resumen Estatal
            </h2>
            <div className="territory-stats-grid">
              <div className="territory-stat-box completed">
                <div className="territory-stat-number green">{completedCount}</div>
                <div className="territory-stat-label">Completos</div>
              </div>
              <div className="territory-stat-box active">
                <div className="territory-stat-number yellow">{activeCount}</div>
                <div className="territory-stat-label">Activos</div>
              </div>
              <div className="territory-stat-box pending">
                <div className="territory-stat-number red">{pendingCount}</div>
                <div className="territory-stat-label">Pendientes</div>
              </div>
            </div>
            <div>
              <div className="territory-progress-row">
                <span className="territory-progress-label">Avance Global</span>
                <span className="territory-progress-value">{globalProgress}%</span>
              </div>
              <div className="territory-progress-bar-bg">
                <div className="territory-progress-bar-fill" style={{ width: `${globalProgress}%` }}></div>
              </div>
            </div>
          </div>

          {/* View Modes */}
          <div className="territory-view-toggle">
            <button 
              onClick={() => setViewMode('markers')}
              className={`territory-view-btn ${viewMode === 'markers' ? 'active-markers' : ''}`}
            >
              <MapPin size={16} /> Pines
            </button>
            <button 
              onClick={() => setViewMode('heatmap')}
              className={`territory-view-btn ${viewMode === 'heatmap' ? 'active-heatmap' : ''}`}
            >
              <TrendingUp size={16} /> Mapa de Calor
            </button>
          </div>

          {/* Layers */}
          <div className="territory-section">
            <h2 className="territory-section-title">
              <Layers size={16} /> Capas
            </h2>
            <div className="territory-layers-list">
              <label className="territory-layer-item">
                <span>Estado de Sonora</span>
                <input type="checkbox" checked={showSonoraState} onChange={e => setShowSonoraState(e.target.checked)} />
              </label>
              <label className="territory-layer-item">
                <span>Secciones Electorales</span>
                <input type="checkbox" checked={showSections} onChange={e => setShowSections(e.target.checked)} style={{ accentColor: '#3b82f6' }} />
              </label>
              <label className="territory-layer-item">
                <span>Distritos Locales</span>
                <input type="checkbox" checked={showLocalDistricts} onChange={e => setShowLocalDistricts(e.target.checked)} style={{ accentColor: '#a855f7' }} />
              </label>
              <label className="territory-layer-item">
                <span>Distritos Federales</span>
                <input type="checkbox" checked={showFederalDistricts} onChange={e => setShowFederalDistricts(e.target.checked)} style={{ accentColor: '#10b981' }} />
              </label>
            </div>
          </div>

          {/* Filters */}
          <div className="territory-section">
            <h2 className="territory-section-title">
              <Filter size={16} /> Filtros
            </h2>
            <div className="territory-filters-list">
              <select 
                className="territory-filter-select"
                value={filterDistrict} onChange={e => setFilterDistrict(e.target.value)}
              >
                <option value="all">Todas las Zonas</option>
                {MOCK_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select 
                className="territory-filter-select"
                value={filterState} onChange={e => setFilterState(e.target.value)}
              >
                <option value="all">Todos los Estados</option>
                <option value="completed">Completado</option>
                <option value="in-progress">Activos</option>
                <option value="pending">Pendientes</option>
              </select>
              <select 
                className="territory-filter-select"
                value={filterCoordinator} onChange={e => setFilterCoordinator(e.target.value)}
              >
                <option value="all">Todos los Coordinadores</option>
                {MOCK_COORDINATORS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Action Button */}
          <div className="territory-action-area">
            <button 
              onClick={() => setAddingMode(!addingMode)}
              className={`territory-action-btn ${addingMode ? 'adding' : ''}`}
            >
              <Plus size={18} />
              {addingMode ? 'Modo Intervención...' : 'Nueva Intervención'}
            </button>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="territory-map-area">
        <MapContainer 
          center={[29.0, -110.0]} 
          zoom={6} 
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution={mapStylesConfig[mapStyle].attribution}
            url={mapStylesConfig[mapStyle].url}
          />

          {/* Map Style Switcher */}
          <div className="territory-map-style-switcher">
            <div className="territory-map-style-panel">
              {Object.entries(mapStylesConfig).map(([key, style]) => (
                <button
                  key={key}
                  onClick={() => setMapStyle(key)}
                  className={`territory-map-style-btn ${mapStyle === key ? 'active' : ''}`}
                >
                  <span className="style-icon">
                    {style.icon}
                  </span>
                  <span>{style.name}</span>
                </button>
              ))}
            </div>
          </div>
          
          <ClickHandler onMapClick={handleMapClick} />

          {/* GeoJSON Layers */}
          {showSonoraState && (
            <GeoJSON 
              key="sonorastate"
              data={sonoraGeoJSON} 
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

          {showLocalDistricts && localDistrictsData && (
            <GeoJSON 
              key="local"
              data={localDistrictsData} 
              style={{ color: '#a855f7', weight: 3, opacity: 0.8, fillColor: 'transparent' }}
            />
          )}

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
                <div className="territory-popup-container">
                  <div className="territory-popup-header">
                    <span>Intervención Territorial</span>
                    <span className="territory-popup-badge">{marker.progress}%</span>
                  </div>
                  
                  <div className="territory-popup-row">
                    <div className="territory-popup-field">
                      <label className="territory-popup-label">Nombre</label>
                      <input 
                        type="text"
                        className="territory-popup-input"
                        value={marker.name || ''}
                        placeholder="Nombre..."
                        onChange={(e) => updateMarker(marker.id, { name: e.target.value })}
                      />
                    </div>
                    <div className="territory-popup-field">
                      <label className="territory-popup-label">Fecha</label>
                      <input 
                        type="date"
                        className="territory-popup-input"
                        value={marker.date || ''}
                        onChange={(e) => updateMarker(marker.id, { date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="territory-popup-row">
                    <div className="territory-popup-field">
                      <label className="territory-popup-label">Estado</label>
                      <select 
                        className="territory-popup-input"
                        value={marker.state}
                        onChange={(e) => updateMarker(marker.id, { state: e.target.value })}
                      >
                        <option value="pending">Pendiente</option>
                        <option value="in-progress">En proceso</option>
                        <option value="completed">Listo</option>
                      </select>
                    </div>
                    <div className="territory-popup-field">
                      <label className="territory-popup-label">Sección</label>
                      <select 
                        className="territory-popup-input"
                        value={marker.district}
                        onChange={(e) => updateMarker(marker.id, { district: e.target.value })}
                      >
                        {MOCK_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="territory-popup-field">
                    <label className="territory-popup-label">
                      <Users size={12} /> Responsable
                    </label>
                    <select 
                      className="territory-popup-input"
                      value={marker.responsible}
                      onChange={(e) => updateMarker(marker.id, { responsible: e.target.value })}
                    >
                      {MOCK_COORDINATORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="territory-popup-field">
                    <div className="territory-popup-progress-row">
                      <label className="territory-popup-label">Progreso</label>
                      <span className="territory-popup-progress-value">{marker.progress}%</span>
                    </div>
                    <input 
                      type="range" min="0" max="100" step="5"
                      className="territory-popup-range"
                      value={marker.progress}
                      onChange={(e) => updateMarker(marker.id, { progress: parseInt(e.target.value) })}
                    />
                  </div>

                  <div className="territory-popup-field">
                    <label className="territory-popup-label">Notas</label>
                    <textarea 
                      className="territory-popup-textarea"
                      rows={2}
                      value={marker.note}
                      onChange={(e) => updateMarker(marker.id, { note: e.target.value })}
                      placeholder="Reporte de avance..."
                    />
                  </div>

                  <button 
                    onClick={() => removeMarker(marker.id)}
                    className="territory-popup-delete-btn"
                  >
                    <Trash2 size={14} /> Eliminar Intervención
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Marcadores de Rastreo en Tiempo Real */}
          {activeLocations.map((loc) => (
            <Marker
              key={loc.userId}
              position={[loc.lat, loc.lng]}
              icon={createLiveIcon(loc.role || 'Brigadista', loc.color)}
            >
              <Popup>
                <div className="territory-live-popup">
                  <div className="live-header" style={{ color: loc.color || '#3b82f6' }}>
                    <div className="live-dot" />
                    Transmisión: {loc.displayName}
                  </div>
                  <div className="live-role">{loc.role}</div>
                  <div className="live-brigade">Brigada: {loc.brigadeName || 'Sin asignar'}</div>
                  <div className="live-speed">
                    Velocidad: {Math.round(loc.speed || 0)} km/h
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
        
        {/* Overlay Toast when adding mode is active */}
        {addingMode && (
          <div className="territory-toast">
            <MapPin size={20} />
            Selecciona la ubicación
          </div>
        )}
      </div>
    </div>
  );
}
