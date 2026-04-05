import { useRole } from '../context/RoleContext';
import { User as UserIcon, Shield, Map, Settings, LogOut, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { role, ROLES, setRole } = useRole();
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '600px', margin: '0 auto' }}>
      
      <div className="flex-col items-center justify-center text-center" style={{ marginBottom: '2rem', marginTop: '1rem' }}>
        <div style={{ width: '96px', height: '96px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: 'var(--shadow-glow)' }}>
          <UserIcon size={48} color="white" />
        </div>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>{role === ROLES.SUPER_ADMIN ? 'Ubaldo' : 'Usuario Demo'}</h1>
        <p style={{ color: 'var(--color-primary-light)', fontSize: '0.875rem', fontWeight: 600 }}>{role}</p>
        <div className="flex items-center justify-center gap-1" style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <Map size={14} /> Distrito 4, Hermosillo
        </div>
      </div>

      <div className="card glass-panel" style={{ padding: 0, overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={18} color="var(--color-primary)" />
            Simulador de Roles (Solo Demo)
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Cambia tu rol actual para previsualizar los permisos en la aplicación.
          </p>
        </div>
        <div style={{ padding: '1rem' }} className="flex-col gap-2">
          {Object.values(ROLES).map(r => (
            <button 
              key={r}
              onClick={() => setRole(r)}
              className="btn"
              style={{
                width: '100%',
                justifyContent: 'flex-start',
                backgroundColor: role === r ? 'rgba(128, 0, 32, 0.1)' : 'transparent',
                borderColor: role === r ? 'var(--color-primary)' : 'var(--border-color)',
                color: role === r ? 'var(--color-primary-light)' : 'var(--text-secondary)'
              }}
            >
              {role === r && <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-primary)' }} />}
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <button className="btn" style={{ width: '100%', justifyContent: 'flex-start', padding: '1rem', border: 'none', borderBottom: '1px solid var(--border-color)', borderRadius: 0, backgroundColor: 'transparent' }}>
          <Settings size={18} /> Configuración de Cuenta
        </button>
        <button className="btn" style={{ width: '100%', justifyContent: 'flex-start', padding: '1rem', border: 'none', borderBottom: '1px solid var(--border-color)', borderRadius: 0, backgroundColor: 'transparent' }}>
          <Lock size={18} /> Cambiar Contraseña
        </button>
        <button className="btn" style={{ width: '100%', justifyContent: 'flex-start', padding: '1rem', border: 'none', borderRadius: 0, color: 'var(--status-error)', backgroundColor: 'transparent' }} onClick={() => navigate('/login')}>
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>

    </div>
  );
}
