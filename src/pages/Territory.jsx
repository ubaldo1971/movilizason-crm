import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { Map as MapIcon, Filter, Search, Share2, Layers, MapPin } from 'lucide-react';

export default function Territory() {
  const { role } = useRole();
  const [filter, setFilter] = useState('all');

  return (
    <div className="animate-fade-in flex-col" style={{ height: 'calc(100vh - 4rem)', paddingBottom: '1rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Territorio Electoral</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Vista y control geoespacial</p>
        </div>
        
        <div className="flex gap-2">
          <div className="input-group" style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
              <input type="text" className="input-field" placeholder="Buscar Distrito / Sección" style={{ paddingLeft: '32px', width: '200px' }} />
            </div>
          </div>
          <button className="btn">
            <Filter size={18} /> Filtros
          </button>
        </div>
      </div>

      <div className="flex gap-4" style={{ marginBottom: '1rem' }}>
        {['all', 'simpatizantes', 'bardas', 'alertas'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className="btn"
            style={{ 
              borderRadius: 'var(--radius-full)', 
              textTransform: 'capitalize',
              backgroundColor: filter === f ? 'var(--color-primary)' : '',
              color: filter === f ? 'white' : '',
              borderColor: filter === f ? 'var(--color-primary)' : ''
            }}
          >
            {f === 'all' ? 'Todos' : f}
          </button>
        ))}
      </div>

      {/* Mock Map Container */}
      <div className="card flex-col items-center justify-center relative" style={{ flex: 1, padding: 0, overflow: 'hidden', backgroundColor: '#1e232d' }}>
        
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 2 }}>
          <button className="btn glass-panel" style={{ padding: '0.5rem', marginBottom: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Layers size={20} />
          </button>
        </div>

        {/* Map Placeholder Graphic */}
        <div style={{ position: 'relative', width: '100%', height: '100%', opacity: 0.8, backgroundImage: 'radial-gradient(circle at 50% 50%, #252a34 0%, #1a1d24 100%)' }}>
           {/* Grid for mock effect */}
           <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
           
           {/* Mock Markers */}
           <div style={{ position: 'absolute', top: '40%', left: '30%', color: 'var(--status-success)' }}>
             <MapPin size={32} fill="currentColor" color="#1a1d24" />
             <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface-elevated)', padding: '2px 6px', fontSize: '10px', borderRadius: '4px', marginTop: '4px' }}>D-3</div>
           </div>
           
           <div style={{ position: 'absolute', top: '60%', left: '55%', color: 'var(--color-primary)' }}>
             <MapPin size={40} fill="currentColor" color="#1a1d24" />
             <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-surface-elevated)', padding: '2px 6px', fontSize: '10px', borderRadius: '4px', marginTop: '4px' }}>Barda A.</div>
           </div>

           <div style={{ position: 'absolute', top: '30%', left: '70%', color: 'var(--status-warning)' }}>
             <MapPin size={24} fill="currentColor" color="#1a1d24" />
           </div>
        </div>

        <button className="fab">
          <Share2 size={24} />
        </button>
      </div>
    </div>
  );
}
