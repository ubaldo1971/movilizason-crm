import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, Plus, Trash2, Activity, Filter, Users, BarChart3, TrendingUp, Sun, Moon, Globe, Mountain, Flag, Heart, Shield, Paintbrush } from 'lucide-react';
import HeatmapLayer from './HeatmapLayer';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import './Territory.css';

const statusColors = {
  'completed': '#22c55e',
  'in-progress': '#eab308',
  'pending': '#ef4444',
};

const SUPPORT_LEVEL_COLORS = {
  'alto': '#22c55e',
  'medio': '#eab308',
  'bajo': '#f97316',
  'default': '#06b6d4'
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

// --- NEW LAYER ICONS ---
const createBardaIcon = () => {
  return L.divIcon({
    className: 'barda-icon',
    html: `<svg width="30" height="36" viewBox="0 0 30 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(1px 3px 5px rgba(0,0,0,0.5));">
      <rect x="3" y="4" width="3" height="30" rx="1.5" fill="#a855f7"/>
      <path d="M6 4 L28 8 L28 20 L6 16 Z" fill="#ec4899" stroke="#be185d" stroke-width="1"/>
      <text x="14" y="15" font-size="9" fill="white" font-weight="bold" text-anchor="middle">B</text>
    </svg>`,
    iconSize: [30, 36],
    iconAnchor: [5, 36],
    popupAnchor: [10, -36],
  });
};

const createSimpatizanteIcon = (supportLevel) => {
  const color = SUPPORT_LEVEL_COLORS[supportLevel] || SUPPORT_LEVEL_COLORS.default;
  const strokeColor = supportLevel === 'alto' ? '#166534' : supportLevel === 'medio' ? '#854d0e' : supportLevel === 'bajo' ? '#9a3412' : '#0e7490';
  
  return L.divIcon({
    className: 'simpatizante-icon',
    html: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: ${color}; filter: drop-shadow(1px 3px 5px rgba(0,0,0,0.45));">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
};

const createBrigadistaIcon = () => {
  return L.divIcon({
    className: 'brigadista-icon',
    html: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="fill: #f59e0b; filter: drop-shadow(1px 3px 5px rgba(0,0,0,0.45));">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
};

// Approximate centroids for section numbers (Sonora)
// These are loaded into state for reactivity
// Note: loadCentroids is now handled inside the component via useEffect to update state

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

  // Centroids for geo-placement (reactive)
  const [centroids, setCentroids] = useState({});

  // NEW layer toggles - set to true by default for immediate visibility
  const [showBardas, setShowBardas] = useState(true);
  const [showSimpatizantes, setShowSimpatizantes] = useState(true);
  const [showBrigadistas, setShowBrigadistas] = useState(true);

  // NEW layer data
  const [bardas, setBardas] = useState([]);
  const [simpatizantes, setSimpatizantes] = useState([]);
  const [brigadistas, setBrigadistas] = useState([]);

  const [sectionsData, setSectionsData] = useState(null);
  const [localDistrictsData, setLocalDistrictsData] = useState(null);
  const [federalDistrictsData, setFederalDistrictsData] = useState(null);

  const [viewMode, setViewMode] = useState('markers');
  
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [filterState, setFilterState] = useState('all');
  const [filterCoordinator, setFilterCoordinator] = useState('all');

  const [addingMode, setAddingMode] = useState(false);
  const [bardaMode, setBardaMode] = useState(false);
  const [bardaForm, setBardaForm] = useState({
    open: false, address: '', note: '', lat: null, lng: null
  });
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

  // Load section centroids for geo-placement
  useEffect(() => {
    const loadCentroids = async () => {
      try {
        const res = await fetch('/data/sections.json');
        const data = await res.json();
        if (data?.features) {
          const newCentroids = {};
          data.features.forEach(f => {
            const name = f.properties?.name || f.properties?.SECCION || '';
            const secNum = String(name).replace(/\D/g, '').padStart(4, '0');
            if (f.geometry?.coordinates) {
              const coords = f.geometry.type === 'MultiPolygon'
                ? f.geometry.coordinates[0][0]
                : f.geometry.coordinates[0];
              if (coords && coords.length > 0) {
                let sumLat = 0, sumLng = 0;
                coords.forEach(c => { sumLng += c[0]; sumLat += c[1]; });
                newCentroids[secNum] = [sumLat / coords.length, sumLng / coords.length];
              }
            }
          });
          setCentroids(newCentroids);
        }
      } catch (e) {
        console.warn('Could not load section centroids:', e);
      }
    };
    loadCentroids();
  }, []);

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

  // Firestore Subscription for Bardas Pintadas
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bardas_pintadas'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setBardas(data);
    }, (err) => console.error('Bardas listener error:', err));
    return () => unsub();
  }, []);

  // Firestore Subscription for Users (simpatizantes + brigadistas)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      const simps = [];
      const brigs = [];

      allUsers.forEach(u => {
        const secNum = String(u.sectionNumber || '').padStart(4, '0');
        const centroid = centroids[secNum];
        const jitter = () => (Math.random() - 0.5) * 0.008;
        
        // Prioritize exact coordinates from geocoding
        let lat = u.lat;
        let lng = u.lng;

        // Fallback to section centroid if coordinates are missing
        if (!lat || !lng) {
          if (centroid) {
            lat = centroid[0] + jitter();
            lng = centroid[1] + jitter();
          } else {
            // Ultimate fallback to avoid disappearing from map
            // Use a broad jitter around Hermosillo center if no data
            lat = 29.0892 + (Math.random() - 0.5) * 0.05;
            lng = -110.9612 + (Math.random() - 0.5) * 0.05;
          }
        }

        if (u.source === 'capture_form') {
          simps.push({
            id: u.id,
            displayName: u.displayName || 'Sin nombre',
            surname: u.surname || '',
            phone: u.phone,
            sectionNumber: u.sectionNumber,
            address: u.address,
            colonia: u.colonia,
            supportLevel: u.supportLevel,
            source: u.source,
            lat, lng,
          });
        }

        if (u.brigadeId) {
          brigs.push({
            id: u.id,
            displayName: u.displayName || 'Sin nombre',
            surname: u.surname || '',
            phone: u.phone,
            address: u.address,
            colonia: u.colonia,
            role: u.role,
            brigadeId: u.brigadeId,
            brigadeName: u.brigadeName,
            sectionNumber: u.sectionNumber,
            lat, lng,
          });
        }
      });

      setSimpatizantes(simps);
      setBrigadistas(brigs);
    }, (err) => console.error('Users listener error:', err));
    return () => unsub();
  }, [centroids]);

  useEffect(() => {
    if (showSections && !sectionsData) fetch('/data/sections.json').then(r => r.json()).then(setSectionsData).catch(console.error);
  }, [showSections, sectionsData]);

  useEffect(() => {
    if (showLocalDistricts && !localDistrictsData) fetch('/data/local-districts.json').then(r => r.json()).then(setLocalDistrictsData).catch(console.error);
  }, [showLocalDistricts, localDistrictsData]);

  useEffect(() => {
    if (showFederalDistricts && !federalDistrictsData) fetch('/data/federal-districts.json').then(r => r.json()).then(setFederalDistrictsData).catch(console.error);
  }, [showFederalDistricts, federalDistrictsData]);

  const handleMapClick = async (lat, lng) => {
    // Barda creation mode — store pending location in form
    if (bardaMode) {
      setBardaForm(prev => ({ ...prev, lat, lng }));
      return;
    }

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

  const handleDeleteBarda = async (bardaId) => {
    try {
      await deleteDoc(doc(db, 'bardas_pintadas', bardaId));
    } catch (err) {
      console.error('Error deleting barda:', err);
    }
  };

  const handleSaveBarda = async () => {
    if (!bardaForm.lat || !bardaForm.lng) return;
    try {
      await addDoc(collection(db, 'bardas_pintadas'), {
        lat: bardaForm.lat,
        lng: bardaForm.lng,
        address: bardaForm.address.trim(),
        note: bardaForm.note.trim() || 'Barda registrada',
        reportedBy: 'CRM Territory',
        createdAt: new Date().toISOString(),
      });
      setBardaForm({ open: false, address: '', note: '', lat: null, lng: null });
      setBardaMode(false);
    } catch (err) {
      console.error('Error saving barda:', err);
    }
  };

  const handleCancelBarda = () => {
    setBardaForm({ open: false, address: '', note: '', lat: null, lng: null });
    setBardaMode(false);
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
            <p className="page-subtitle">Inteligencia electoral estatal</p>
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

            {/* New Territorial Intelligence Layers */}
            <div className="territory-layers-divider">
              <Paintbrush size={11} /> Inteligencia Territorial
            </div>
            <div className="territory-layers-list">
              <label className="territory-layer-item territory-layer--barda">
                <span className="territory-layer-label-icon"><Flag size={14} className="icon-pink" /> Bardas Pintadas</span>
                <div className="territory-layer-right">
                  <span className="territory-layer-count pink">{bardas.length}</span>
                  <input type="checkbox" checked={showBardas} onChange={e => setShowBardas(e.target.checked)} style={{ accentColor: '#ec4899' }} />
                </div>
              </label>
              <label className="territory-layer-item territory-layer--simp">
                <span className="territory-layer-label-icon"><Heart size={14} className="icon-cyan" /> Simpatizantes</span>
                <div className="territory-layer-right">
                  <span className="territory-layer-count cyan">{simpatizantes.length}</span>
                  <input type="checkbox" checked={showSimpatizantes} onChange={e => setShowSimpatizantes(e.target.checked)} style={{ accentColor: '#06b6d4' }} />
                </div>
              </label>
              <label className="territory-layer-item territory-layer--brig">
                <span className="territory-layer-label-icon"><Shield size={14} className="icon-amber" /> Brigadistas</span>
                <div className="territory-layer-right">
                  <span className="territory-layer-count amber">{brigadistas.length}</span>
                  <input type="checkbox" checked={showBrigadistas} onChange={e => setShowBrigadistas(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                </div>
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

          {/* Action Buttons */}
          <div className="territory-action-area">
            <button 
              onClick={() => {
                const opening = !bardaForm.open;
                setBardaForm({ open: opening, address: '', note: '', lat: null, lng: null });
                setBardaMode(opening);
                setAddingMode(false);
              }}
              className={`territory-action-btn barda ${bardaForm.open ? 'adding' : ''}`}
            >
              <Flag size={18} />
              {bardaForm.open ? 'Cancelar Barda' : 'Registrar Barda'}
            </button>

            {/* Barda Registration Form */}
            {bardaForm.open && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                borderRadius: 12,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f472b6', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Flag size={12} /> Nueva Barda Pintada
                </div>
                <input
                  type="text"
                  placeholder="Dirección / Ubicación"
                  value={bardaForm.address}
                  onChange={e => setBardaForm(prev => ({ ...prev, address: e.target.value }))}
                  style={{
                    width: '100%', padding: '8px 10px', background: '#1e293b',
                    border: '1px solid #475569', borderRadius: 8,
                    fontSize: 13, color: '#e2e8f0', outline: 'none',
                  }}
                />
                <textarea
                  placeholder="Nota (opcional)"
                  value={bardaForm.note}
                  onChange={e => setBardaForm(prev => ({ ...prev, note: e.target.value }))}
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 10px', background: '#1e293b',
                    border: '1px solid #475569', borderRadius: 8,
                    fontSize: 13, color: '#e2e8f0', outline: 'none', resize: 'none',
                  }}
                />
                <div style={{
                  fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', borderRadius: 8,
                  background: bardaForm.lat ? 'rgba(34,197,94,0.1)' : '#1e293b',
                  color: bardaForm.lat ? '#4ade80' : '#94a3b8',
                  border: `1px solid ${bardaForm.lat ? 'rgba(34,197,94,0.2)' : '#334155'}`,
                }}>
                  <MapPin size={14} />
                  {bardaForm.lat
                    ? `📍 Ubicación: ${bardaForm.lat.toFixed(5)}, ${bardaForm.lng?.toFixed(5)}`
                    : '👆 Haz clic en el mapa para ubicar'
                  }
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleCancelBarda}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      background: '#334155', color: '#cbd5e1', border: 'none', cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveBarda}
                    disabled={!bardaForm.lat}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      background: bardaForm.lat ? '#ec4899' : '#334155',
                      color: bardaForm.lat ? '#fff' : '#64748b',
                      border: 'none', cursor: bardaForm.lat ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <Flag size={14} /> Guardar
                  </button>
                </div>
              </div>
            )}

            <button 
              onClick={() => { setAddingMode(!addingMode); setBardaMode(false); }}
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
          {showBrigadistas && activeLocations.map((loc) => (
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

          {/* ========== BARDAS PINTADAS ========== */}
          {showBardas && bardas.map((barda) => (
            <Marker
              key={`barda-${barda.id}`}
              position={[barda.lat, barda.lng]}
              icon={createBardaIcon()}
            >
              <Popup minWidth={220}>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, borderBottom: '2px solid #ec4899', paddingBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>🎨</span>
                    <strong style={{ color: '#be185d', fontSize: 14 }}>Barda Pintada</strong>
                  </div>
                  {barda.address && <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>📍 {barda.address}</div>}
                  {barda.note && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>📝 {barda.note}</div>}
                  <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>Reportada por: {barda.reportedBy || 'Sistema'}</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>📅 {barda.createdAt ? new Date(barda.createdAt).toLocaleDateString('es-MX') : '—'}</div>
                  <button
                    onClick={() => handleDeleteBarda(barda.id)}
                    style={{ marginTop: 8, width: '100%', padding: '4px 0', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                  >🗑 Eliminar</button>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* ========== SIMPATIZANTES ========== */}
          {showSimpatizantes && simpatizantes.map((s) => (
            <Marker
              key={`simp-${s.id}`}
              position={[s.lat, s.lng]}
              icon={createSimpatizanteIcon(s.supportLevel)}
            >
              <Popup minWidth={200}>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 190 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, borderBottom: '2px solid #06b6d4', paddingBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>🤝</span>
                    <strong style={{ color: '#0e7490', fontSize: 13 }}>Simpatizante</strong>
                  </div>
                  <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 600 }}>{s.displayName} {s.surname || ''}</div>
                  {s.phone && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>📱 {s.phone}</div>}
                  {s.sectionNumber && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>🗳 Sección: {s.sectionNumber}</div>}
                  {s.address && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>📍 {s.address}{s.colonia ? `, ${s.colonia}` : ''}</div>}
                  {s.supportLevel && <div style={{ fontSize: 11, marginTop: 4 }}>
                    Nivel: <span style={{ fontWeight: 700, color: s.supportLevel === 'alto' ? '#22c55e' : s.supportLevel === 'medio' ? '#eab308' : '#f97316' }}>
                      {s.supportLevel === 'alto' ? '🟢 Alto' : s.supportLevel === 'medio' ? '🟡 Medio' : '🟠 Bajo'}
                    </span>
                  </div>}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* ========== BRIGADISTAS ========== */}
          {showBrigadistas && brigadistas.map((b) => (
            <Marker
              key={`brig-${b.id}`}
              position={[b.lat, b.lng]}
              icon={createBrigadistaIcon()}
            >
              <Popup minWidth={200}>
                <div style={{ fontFamily: 'system-ui, sans-serif', minWidth: 190 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, borderBottom: '2px solid #f59e0b', paddingBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>🛡️</span>
                    <strong style={{ color: '#92400e', fontSize: 13 }}>Brigadista</strong>
                  </div>
                  <div style={{ fontSize: 13, color: '#1f2937', fontWeight: 600 }}>{b.displayName} {b.surname || ''}</div>
                  {b.role && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>🎖 {b.role}</div>}
                  {b.phone && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>📱 {b.phone}</div>}
                  {b.address && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>📍 {b.address}{b.colonia ? `, ${b.colonia}` : ''}</div>}
                  {b.brigadeName && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>🏴 {b.brigadeName}</div>}
                  {b.sectionNumber && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>🗳 Sección: {b.sectionNumber}</div>}
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Preview marker for pending barda placement */}
          {bardaForm.lat && bardaForm.lng && (
            <Marker
              key="barda-preview"
              position={[bardaForm.lat, bardaForm.lng]}
              icon={createBardaIcon()}
            >
              <Popup>
                <div style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 4 }}>
                  <strong style={{ color: '#ec4899' }}>📍 Nueva Barda</strong>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>Confirma en el panel lateral</div>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
        
        {/* Overlay Toast when adding mode is active */}
        {addingMode && (
          <div className="territory-toast">
            <MapPin size={20} />
            Selecciona la ubicación
          </div>
        )}
        {bardaMode && !bardaForm.lat && (
          <div className="territory-toast barda-toast">
            <Flag size={20} />
            Haz clic en el mapa para ubicar la barda
          </div>
        )}
      </div>
    </div>
  );
}
