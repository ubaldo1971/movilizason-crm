import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { Hash, Video, Mic, PlusCircle, Search, Settings } from 'lucide-react';

export default function Communication() {
  const { role } = useRole();
  const [activeChannel, setActiveChannel] = useState('general-sonora');

  const channels = [
    { id: 'anuncios', name: 'anuncios-oficiales', type: 'announcement' },
    { id: 'general-sonora', name: 'general-sonora', type: 'text' },
    { id: 'distrito-4', name: 'distrito-4-ops', type: 'text' },
    { id: 'brigadas', name: 'coordinacion-brigadas', type: 'text' },
  ];

  const isAdmin = role.includes('Admin') || role.includes('Super');

  return (
    <div className="animate-fade-in flex" style={{ height: 'calc(100vh - 5rem)', gap: 'var(--space-4)' }}>
      
      {/* Sidebar Channels */}
      <div className="card" style={{ width: '240px', padding: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-surface)' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1rem' }}>Comando Central</h3>
          <Settings size={18} color="var(--text-secondary)" />
        </div>
        
        <div style={{ padding: '1rem', flex: 1, overflowY: 'auto' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Canales Terrestres</p>
          
          <div className="flex-col gap-1">
            {channels.map(ch => (
              <button 
                key={ch.id}
                onClick={() => setActiveChannel(ch.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem',
                  borderRadius: 'var(--radius-md)', width: '100%', textAlign: 'left',
                  backgroundColor: activeChannel === ch.id ? 'rgba(128, 0, 32, 0.15)' : 'transparent',
                  color: activeChannel === ch.id ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}
              >
                <Hash size={16} />
                <span style={{ fontSize: '0.875rem' }}>{ch.name}</span>
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface-elevated)' }}>
          <div className="flex items-center gap-2">
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.75rem', fontWeight: 'bold' }}>
              U
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{role === 'Super Admin' ? 'Ubaldo' : 'Usuario Demo'}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--status-success)' }}>En línea</p>
            </div>
            <Mic size={16} color="var(--text-secondary)" cursor="pointer" />
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="card" style={{ flex: 1, padding: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2">
            <Hash size={20} color="var(--text-secondary)" />
            <h3 style={{ fontSize: '1rem' }}>{channels.find(c => c.id === activeChannel)?.name || activeChannel}</h3>
          </div>
          <div className="flex gap-4">
            <Video size={20} color="var(--text-secondary)" cursor="pointer" />
            <Search size={20} color="var(--text-secondary)" cursor="pointer" />
          </div>
        </div>

        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', backgroundColor: 'var(--bg-app)' }}>
          
          {/* Messages */}
          <div className="flex gap-3">
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-elevated)', flexShrink: 0 }} />
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Coord. Estatal</span>
                <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--color-primary)', padding: '2px 4px', borderRadius: '4px' }}>ADMIN</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hoy a las 08:30 AM</span>
              </div>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                Buenos días equipo. Recuerden que hoy es el barrido en la zona norte. Aseguren tener sus formatos listos.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-secondary)', flexShrink: 0 }} />
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Brigadista Zona Norte</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Hoy a las 08:35 AM</span>
              </div>
              <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                Enterado. Ya estamos en punto de encuentro.
              </p>
            </div>
          </div>

        </div>

        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-surface)' }}>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <PlusCircle size={20} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }} />
              <input 
                type="text" 
                className="input-field" 
                placeholder={`Enviar mensaje a #${channels.find(c => c.id === activeChannel)?.name || activeChannel}`} 
                style={{ width: '100%', paddingLeft: '40px', backgroundColor: 'var(--bg-app)', border: '1px solid var(--border-color)' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
