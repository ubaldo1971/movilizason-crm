import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Layers, MapPin, Plus, Trash2, Menu, X, Activity, Filter, Users, BarChart3, TrendingUp, Sun, Moon, Globe, Mountain, Flag, Heart, Shield, Paintbrush } from 'lucide-react';
import HeatmapLayer from './HeatmapLayer';
import { db } from './firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

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

interface ActiveLocation {
  userId: string;
  displayName: string;
  surname?: string;
  role: string;
  brigadeName?: string;
  color?: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  status?: 'online' | 'offline';
}

interface Barda {
  id: string;
  lat: number;
  lng: number;
  address: string;
  note: string;
  reportedBy: string;
  createdAt: string;
  photoURL?: string;
}

interface PersonMarker {
  id: string;
  displayName: string;
  surname?: string;
  phone?: string;
  role?: string;
  sectionNumber?: string;
  supportLevel?: string;
  brigadeId?: string;
  brigadeName?: string;
  lat: number;
  lng: number;
  source?: string;
}

const statusColors: Record<MarkerState, string> = {
  'completed': '#22c55e', // green-500
  'in-progress': '#eab308', // yellow-500
  'pending': '#ef4444', // red-500
};

const SUPPORT_LEVEL_COLORS: Record<string, string> = {
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

const createLiveIcon = (role: string, customColor?: string) => {
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

// --- New layer icons ---
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

const createSimpatizanteIcon = (supportLevel?: string) => {
  const color = (supportLevel && SUPPORT_LEVEL_COLORS[supportLevel]) || SUPPORT_LEVEL_COLORS.default;
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
// Used to place simpatizantes/brigadistas on map based on their sectionNumber
const SECTION_CENTROIDS: Record<string, [number, number]> = {};
let centroidsLoaded = false;
const loadCentroids = async () => {
  if (centroidsLoaded) return;
  try {
    const res = await fetch('/data/sections.json');
    const data = await res.json();
    if (data?.features) {
      data.features.forEach((f: any) => {
        const name = f.properties?.name || f.properties?.SECCION || '';
        const secNum = String(name).replace(/\D/g, '').padStart(4, '0');
        if (f.geometry?.coordinates) {
          // Compute simple centroid from polygon
          const coords = f.geometry.type === 'MultiPolygon'
            ? f.geometry.coordinates[0][0]
            : f.geometry.coordinates[0];
          if (coords && coords.length > 0) {
            let sumLat = 0, sumLng = 0;
            coords.forEach((c: number[]) => { sumLng += c[0]; sumLat += c[1]; });
            SECTION_CENTROIDS[secNum] = [sumLat / coords.length, sumLng / coords.length];
          }
        }
      });
    }
    centroidsLoaded = true;
  } catch (e) {
    console.warn('Could not load section centroids:', e);
  }
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
  const [activeLocations, setActiveLocations] = useState<ActiveLocation[]>([]);
  const [markers, setMarkers] = useState<MapMarker[]>(() => {
    const saved = localStorage.getItem('sonora-map-markers');
    return saved ? JSON.parse(saved) : [];
  });

  const [showSections, setShowSections] = useState(true);
  const [showLocalDistricts, setShowLocalDistricts] = useState(false);
  const [showFederalDistricts, setShowFederalDistricts] = useState(false);
  const [showSonoraState, setShowSonoraState] = useState(true);

  // NEW layer toggles
  const [showBardas, setShowBardas] = useState(true);
  const [showSimpatizantes, setShowSimpatizantes] = useState(false);
  const [showBrigadistas, setShowBrigadistas] = useState(false);

  // NEW layer data
  const [bardas, setBardas] = useState<Barda[]>([]);
  const [simpatizantes, setSimpatizantes] = useState<PersonMarker[]>([]);
  const [brigadistas, setBrigadistas] = useState<PersonMarker[]>([]);

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
  const [bardaMode, setBardaMode] = useState(false);
  const [bardaForm, setBardaForm] = useState<{
    open: boolean;
    address: string;
    note: string;
    lat: number | null;
    lng: number | null;
  }>({ open: false, address: '', note: '', lat: null, lng: null });
  const [mapStyle, setMapStyle] = useState('dark');

  const mapStyles = {
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
  useEffect(() => { loadCentroids(); }, []);

  // Firestore Subscription for Live Tracking
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'active_locations'), (snapshot) => {
      const locations = snapshot.docs.map(doc => ({
        ...doc.data()
      })) as ActiveLocation[];
      setActiveLocations(locations);
    }, (error) => {
      console.error("Firestore live tracking error:", error);
    });
    return () => unsub();
  }, []);

  // Firestore Subscription for Bardas Pintadas
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'bardas_pintadas'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Barda[];
      setBardas(data);
    }, (err) => console.error('Bardas listener error:', err));
    return () => unsub();
  }, []);

  // Firestore Subscription for Users (simpatizantes + brigadistas)
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const allUsers = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

      // Simpatizantes: captured via the form
      const simps: PersonMarker[] = [];
      const brigs: PersonMarker[] = [];

      allUsers.forEach(u => {
        const secNum = String(u.sectionNumber || '').padStart(4, '0');
        const centroid = SECTION_CENTROIDS[secNum];
        // Small random jitter so markers don't overlap
        const jitter = () => (Math.random() - 0.5) * 0.008;
        const lat = centroid ? centroid[0] + jitter() : 0;
        const lng = centroid ? centroid[1] + jitter() : 0;
        if (!centroid) return; // skip users without locatable section

        if (u.source === 'capture_form') {
          simps.push({
            id: u.id,
            displayName: u.displayName || 'Sin nombre',
            surname: u.surname || '',
            phone: u.phone,
            sectionNumber: u.sectionNumber,
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

  const handleMapClick = async (lat: number, lng: number) => {
    // Barda creation mode — store pending location in form
    if (bardaMode) {
      setBardaForm(prev => ({ ...prev, lat, lng }));
      return;
    }

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
    setAddingMode(false);
  };

  const handleDeleteBarda = async (bardaId: string) => {
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
        reportedBy: 'Mapa Tracker',
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
    const points: [number, number, number][] = filteredMarkers.map(m => [m.lat, m.lng, 1] as [number, number, number]);
    
    // Add live locations to heatmap with higher weight
    activeLocations.forEach(loc => {
      points.push([loc.lat, loc.lng, 2]);
    });

    return points;
  }, [filteredMarkers, activeLocations]);

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

              {/* New Layers */}
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1"><Paintbrush size={11}/> Inteligencia Territorial</div>
              </div>
              <label className="flex items-center justify-between p-2.5 bg-pink-500/10 rounded-lg cursor-pointer hover:bg-pink-500/20 transition border border-pink-500/20">
                <span className="text-sm font-medium flex items-center gap-2"><Flag size={14} className="text-pink-400"/> Bardas Pintadas</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-pink-400 bg-pink-500/20 px-1.5 py-0.5 rounded-full">{bardas.length}</span>
                  <input type="checkbox" className="w-4 h-4 accent-pink-500" checked={showBardas} onChange={e => setShowBardas(e.target.checked)} />
                </div>
              </label>
              <label className="flex items-center justify-between p-2.5 bg-cyan-500/10 rounded-lg cursor-pointer hover:bg-cyan-500/20 transition border border-cyan-500/20">
                <span className="text-sm font-medium flex items-center gap-2"><Heart size={14} className="text-cyan-400"/> Simpatizantes</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded-full">{simpatizantes.length}</span>
                  <input type="checkbox" className="w-4 h-4 accent-cyan-500" checked={showSimpatizantes} onChange={e => setShowSimpatizantes(e.target.checked)} />
                </div>
              </label>
              <label className="flex items-center justify-between p-2.5 bg-amber-500/10 rounded-lg cursor-pointer hover:bg-amber-500/20 transition border border-amber-500/20">
                <span className="text-sm font-medium flex items-center gap-2"><Shield size={14} className="text-amber-400"/> Brigadistas</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded-full">{brigadistas.length}</span>
                  <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={showBrigadistas} onChange={e => setShowBrigadistas(e.target.checked)} />
                </div>
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

          <div className="flex flex-col gap-3 mt-auto">
            <button 
              onClick={() => {
                const opening = !bardaForm.open;
                setBardaForm({ open: opening, address: '', note: '', lat: null, lng: null });
                setBardaMode(opening);
                setAddingMode(false);
                setIsMobileMenuOpen(false);
              }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition ${
                bardaForm.open ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/50 animate-pulse' : 'bg-pink-600/80 hover:bg-pink-500 text-white'
              }`}
            >
              <Flag size={18} />
              {bardaForm.open ? 'Cancelar Barda' : 'Registrar Barda'}
            </button>

            {/* Barda Registration Form */}
            {bardaForm.open && (
              <div className="bg-slate-900/80 border border-pink-500/30 rounded-xl p-4 flex flex-col gap-3 animate-in slide-in-from-bottom">
                <div className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-2">
                  <Flag size={12} /> Nueva Barda Pintada
                </div>
                <input
                  type="text"
                  placeholder="Dirección / Ubicación"
                  value={bardaForm.address}
                  onChange={e => setBardaForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full p-2.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-pink-500 transition"
                />
                <textarea
                  placeholder="Nota (opcional)"
                  value={bardaForm.note}
                  onChange={e => setBardaForm(prev => ({ ...prev, note: e.target.value }))}
                  rows={2}
                  className="w-full p-2.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 outline-none focus:border-pink-500 transition resize-none"
                />
                <div className={`text-xs flex items-center gap-2 p-2 rounded-lg ${
                  bardaForm.lat ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}>
                  <MapPin size={14} />
                  {bardaForm.lat
                    ? `📍 Ubicación: ${bardaForm.lat.toFixed(5)}, ${bardaForm.lng?.toFixed(5)}`
                    : '👆 Haz clic en el mapa para ubicar'
                  }
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancelBarda}
                    className="flex-1 py-2 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveBarda}
                    disabled={!bardaForm.lat}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center gap-1.5 ${
                      bardaForm.lat
                        ? 'bg-pink-600 text-white hover:bg-pink-500 shadow-lg shadow-pink-900/30'
                        : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Flag size={14} /> Guardar
                  </button>
                </div>
              </div>
            )}
            <button 
              onClick={() => { setAddingMode(!addingMode); setBardaMode(false); setIsMobileMenuOpen(false); }}
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
            attribution={mapStyles[mapStyle as keyof typeof mapStyles].attribution}
            url={mapStyles[mapStyle as keyof typeof mapStyles].url}
          />

          {/* Map Style Switcher (Floating) */}
          <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
            <div className="bg-slate-800/90 p-1.5 rounded-2xl shadow-2xl border border-slate-700/50 backdrop-blur-xl">
              <div className="flex flex-col gap-1">
                {Object.entries(mapStyles).map(([key, style]) => (
                  <button
                    key={key}
                    onClick={() => setMapStyle(key)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-300 group ${
                      mapStyle === key 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                      : 'hover:bg-slate-700/50 text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    <span className={`${mapStyle === key ? 'text-white' : 'text-blue-400'} transition-transform duration-300 group-hover:scale-110`}>
                      {style.icon}
                    </span>
                    <span className="text-xs font-bold tracking-tight pr-1">{style.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
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

          {/* Live Tracking Markers */}
          {showBrigadistas && activeLocations.map((loc) => (
            <Marker
              key={loc.userId}
              position={[loc.lat, loc.lng]}
              icon={createLiveIcon(loc.role, loc.color)}
            >
              <Popup>
                <div className="p-2 min-w-[150px]">
                  <div className="font-bold text-blue-600 flex items-center gap-2" style={{ color: loc.color || '#3b82f6' }}>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live: {loc.displayName} {loc.surname || ''}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{loc.role}</div>
                  <div className="text-[10px] text-slate-400 mt-2 uppercase tracking-tighter">Brigada: {loc.brigadeName || 'Sin brigada'}</div>
                  <div className="mt-2 text-[10px] bg-slate-100 p-1 rounded">
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
                  {b.brigadeName && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>🏴 {b.brigadeName}</div>}
                  {b.sectionNumber && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>🗳 Sección: {b.sectionNumber}</div>}
                  {b.phone && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>📱 {b.phone}</div>}
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
          <div className="absolute bottom-10 md:top-6 md:bottom-auto left-1/2 -translate-x-1/2 z-[1000] bg-blue-600 text-white px-6 py-3 rounded-full font-medium shadow-xl flex items-center gap-2 animate-bounce whitespace-nowrap text-sm md:text-base">
            <MapPin size={20} />
            Selecciona la ubicación
          </div>
        )}
        {bardaMode && !bardaForm.lat && (
          <div className="absolute bottom-10 md:top-6 md:bottom-auto left-1/2 -translate-x-1/2 z-[1000] bg-pink-600 text-white px-6 py-3 rounded-full font-medium shadow-xl flex items-center gap-2 animate-bounce whitespace-nowrap text-sm md:text-base">
            <Flag size={20} />
            Haz clic en el mapa para ubicar la barda
          </div>
        )}

        {/* Preview marker for pending barda location */}
        {/* Note: this is rendered outside MapContainer so we use a positioned div */}
      </div>
    </div>
  );
}
