import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { 
  Map as MapIcon, Filter, Search, Share2, Layers, MapPin, Navigation, Info, 
  Globe, Users, Image as ImageIcon, AlertTriangle, ClipboardList, MessageSquare, Shield 
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issues in React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIconRetina,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Mock Territorial Data (Sonora, MX)
const MOCK_SECTIONS = [
  { id: '0841', lat: 29.073, lng: -110.956, name: 'Sección 0841', status: 'success', coverage: 85, tasks: 12 },
  { id: '0842', lat: 29.080, lng: -110.940, name: 'Sección 0842', status: 'warning', coverage: 45, tasks: 8 },
  { id: '0843', lat: 29.060, lng: -110.970, name: 'Sección 0843', status: 'error', coverage: 20, tasks: 5 },
  { id: '1201', lat: 29.100, lng: -110.920, name: 'Sección 1201', status: 'success', coverage: 92, tasks: 24 },
];

function SetViewOnClick({ animateRef }) {
  const map = useMap();
  useEffect(() => {
    if (animateRef.current) {
        map.setView(animateRef.current, 14);
        animateRef.current = null;
    }
  }, [animateRef.current, map]);
  return null;
}

export default function Territory() {
  const { role, ROLES } = useRole();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('map'); 
  const animateRef = useRef(null);

  const filteredSections = MOCK_SECTIONS.filter(s => {
    const matchesSearch = s.id.includes(searchQuery) || s.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (filter === 'all') return matchesSearch;
    if (filter === 'alertas') return matchesSearch && s.status === 'error';
    if (filter === 'simpatizantes') return matchesSearch && s.coverage > 70;
    if (filter === 'bardas') return matchesSearch && s.tasks > 15;
    return matchesSearch;
  });

  return (
    <div className="animate-fade-in flex-col" style={{ height: 'calc(100vh - 5rem)', padding: '1rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: '0.25rem' }}>
            Estrategia <span className="text-gradient">Territorial</span>
          </h1>
          <div className="flex items-center gap-2 text-muted" style={{ fontSize: '0.875rem' }}>
            <MapPin size={14} className="text-primary" />
            Hermosillo, Sonora — Comando de Incidencia
          </div>
        </div>
        
        <div className="flex gap-3">
          <div className="glass-panel items-center px-3 py-1 flex gap-2" style={{ borderRadius: 'var(--radius-lg)' }}>
             <Search size={16} className="text-muted" />
             <input 
                type="text" 
                placeholder="Buscar sección (ej. 0841)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', width: '220px', fontSize: '0.9rem' }}
             />
          </div>
          <button className="btn glass-panel" style={{ width: '42px', height: '42px', padding: 0 }}>
            <Layers size={20} />
          </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
        {[
          { id: 'all', label: 'Cobertura Total', icon: Globe },
          { id: 'simpatizantes', label: 'Alta Densidad', icon: Users },
          { id: 'bardas', label: 'Impacto Visual', icon: ImageIcon },
          { id: 'alertas', label: 'Zonas Críticas', icon: AlertTriangle }
        ].map(f => (
          <button 
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`btn flex items-center gap-2 whitespace-nowrap ${filter === f.id ? 'btn-primary' : 'glass-panel'}`}
            style={{ borderRadius: 'var(--radius-full)', padding: '0.6rem 1.25rem' }}
          >
            <f.icon size={16} />
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Main Map Container */}
        <div className="card flex-1 relative overflow-hidden" style={{ padding: 0, border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)' }}>
          <MapContainer 
            center={[29.073, -110.956]} 
            zoom={13} 
            style={{ height: '100%', width: '100%', zIndex: 1 }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; CARTO'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            <SetViewOnClick animateRef={animateRef} />

            {filteredSections.map(section => (
              <Marker 
                key={section.id} 
                position={[section.lat, section.lng]}
                eventHandlers={{
                  click: () => {
                    console.log('Clicked section:', section.id);
                  }
                }}
              >
                <Popup className="custom-popup-wrapper">
                  <div className="popup-content">
                    <div className="popup-header">
                        <span className={`status-dot ${section.status}`}></span>
                        <h3>{section.name}</h3>
                    </div>
                    
                    <div className="popup-stats">
                        <div className="stat-row">
                            <span className="label">Cobertura</span>
                            <span className={`value ${section.coverage > 70 ? 'success' : section.coverage > 40 ? 'warning' : 'error'}`}>
                                {section.coverage}%
                            </span>
                        </div>
                        <div className="stat-row">
                            <span className="label">Meta de Votos</span>
                            <span className="value">{(section.coverage * 12).toLocaleString()}</span>
                        </div>
                        <div className="stat-row">
                            <span className="label">Tareas Pendientes</span>
                            <span className="value">{section.tasks}</span>
                        </div>
                    </div>

                    <div className="progress-bar-sm" style={{ margin: '12px 0 16px' }}>
                        <div 
                          className={`progress-fill ${section.status}`} 
                          style={{ width: `${section.coverage}%` }} 
                        />
                    </div>

                    <button 
                      className="btn btn-primary w-full flex items-center justify-center gap-2" 
                      style={{ fontSize: '0.8rem', padding: '8px' }}
                      onClick={() => navigate(`/tasks?section=${section.id}`)}
                    >
                        <Navigation size={14} />
                        Desplegar Operativos
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Floating Indicators */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 2 }}>
            <div className="glass-panel p-4 flex-col gap-3" style={{ width: '200px', backdropFilter: 'blur(12px)' }}>
                <div className="flex items-center gap-2">
                    <div className="pulse-dot-green"></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>MONITOREO EN VIVO</span>
                </div>
                <div className="flex-col">
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Operadores Activos</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>42</span>
                </div>
            </div>
          </div>

          <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 2 }}>
             <div className="glass-panel p-4" style={{ borderRadius: 'var(--radius-lg)' }}>
                <h4 style={{ fontSize: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>INCIDENCIA POR DISTRITO</h4>
                <div className="flex-col gap-2">
                    {[
                        { label: 'Distrito 3', val: 85, color: 'var(--status-success)' },
                        { label: 'Distrito 5', val: 42, color: 'var(--status-warning)' },
                        { label: 'Distrito 11', val: 19, color: 'var(--status-error)' }
                    ].map(d => (
                        <div key={d.label} className="flex-col gap-1">
                            <div className="flex justify-between" style={{ fontSize: '0.7rem' }}>
                                <span>{d.label}</span>
                                <span>{d.val}%</span>
                            </div>
                            <div className="progress-bar-sm" style={{ height: '4px' }}>
                                <div className="progress-fill" style={{ width: `${d.val}%`, backgroundColor: d.color }} />
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          </div>
        </div>

        {/* List Side Panel */}
        <aside className="card flex-col no-scrollbar" style={{ width: '340px', background: 'transparent', border: 'none', padding: 0 }}>
           <div className="glass-panel flex-col h-full" style={{ borderRadius: 'var(--radius-xl)' }}>
              <div className="p-4 border-b">
                 <h2 className="flex items-center gap-2" style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                    <ClipboardList size={18} className="text-secondary" />
                    Detalle por Sección
                 </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-2 flex-col gap-2 custom-scrollbar">
                {filteredSections.map(s => (
                  <div 
                    key={s.id} 
                    className="glass-card-hover p-4 flex-col gap-2 pointer"
                    onClick={() => {
                        animateRef.current = [s.lat, s.lng];
                        setSearchQuery(s.id);
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-col">
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>CP: {s.id}</span>
                        <span style={{ fontWeight: 700 }}>{s.name}</span>
                      </div>
                      <span className={`status-badge-outline ${s.status === 'error' ? 'error' : s.status === 'warning' ? 'warning' : 'success'}`}>
                        {s.coverage}% Cobertura
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4" style={{ marginTop: '4px' }}>
                        <div className="flex items-center gap-1 text-muted" style={{ fontSize: '0.7rem' }}>
                            <MessageSquare size={12} />
                            24 Reportes
                        </div>
                        <div className="flex items-center gap-1 text-muted" style={{ fontSize: '0.7rem' }}>
                            <Shield size={12} />
                            {s.tasks} Tareas
                        </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t bg-surface-elevated" style={{ borderRadius: '0 0 var(--radius-xl) var(--radius-xl)' }}>
                 <button className="btn btn-primary w-full py-3" style={{ fontWeight: 700 }}>
                    DESCARGAR REPORTE GEO
                 </button>
              </div>
           </div>
        </aside>
      </div>
      
      <button className="fab fab-primary">
        <Share2 size={24} />
      </button>
    </div>
  );
}

