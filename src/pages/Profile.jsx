import { useRole } from '../context/RoleContext';
import { User as UserIcon, Shield, Map, Settings, LogOut, Lock, Award, Star, Zap, Trophy, Target, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import PhoneInputModal from '../components/PhoneInputModal';

export default function Profile() {
  const { role, ROLES, currentUser, awardedMedals, updateProfile } = useRole();
  const navigate = useNavigate();
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '600px', margin: '0 auto' }}>
      
      <div className="flex-col items-center justify-center text-center" style={{ marginBottom: '2rem', marginTop: '1rem' }}>
        <div style={{ width: '96px', height: '96px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', boxShadow: 'var(--shadow-glow)' }}>
          <UserIcon size={48} color="white" />
        </div>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>
          {currentUser?.displayName || 'Usuario'} {currentUser?.surname || ''}
        </h1>
        <p style={{ color: 'var(--color-primary-light)', fontSize: '0.875rem', fontWeight: 600 }}>{role}</p>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
          FOLIO: #{currentUser?.folio || '00000'}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--color-primary-light)', marginTop: '0.5rem', opacity: 0.8, fontWeight: 500 }}>
          INTELIGENCIA ELECTORAL ESTATAL
        </div>
        <div className="flex items-center justify-center gap-1" style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          <Map size={14} /> Distrito 4, Hermosillo
        </div>
        {currentUser.phone && (
          <div className="flex items-center justify-center gap-2" style={{ marginTop: '0.5rem', color: 'var(--color-primary-light)', fontSize: '0.9rem', fontWeight: 600 }}>
            <Phone size={14} /> {currentUser.phone}
          </div>
        )}
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
              onClick={() => {
                if (currentUser && currentUser.uid) {
                  updateProfile(currentUser.uid, { role: r });
                }
              }}
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

      <div className="card glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Award size={18} color="var(--color-primary)" />
          Mis Galardones
        </h3>
        {(!awardedMedals || awardedMedals.filter(m => m.userId === currentUser?.uid).length === 0) ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>
            Aún no has recibido condecoraciones. ¡Sigue operando con éxito!
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '1rem' }}>
            {awardedMedals.filter(m => m.userId === currentUser?.uid).map((am, i) => (
              <div 
                key={i} 
                className="flex-col items-center text-center p-2 glass-panel" 
                style={{ borderRadius: '12px', border: `1px solid ${am.medalColor}44` }}
                title={am.reason}
              >
                <div style={{ color: am.medalColor, marginBottom: '0.25rem' }}>
                  <MedalIcon iconName={am.medalIcon} size={24} />
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, lineHeight: 1.1 }}>{am.medalName}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <button 
          className="btn" 
          style={{ width: '100%', justifyContent: 'flex-start', padding: '1rem', border: 'none', borderBottom: '1px solid var(--border-color)', borderRadius: 0, backgroundColor: 'transparent' }}
          onClick={() => setIsPhoneModalOpen(true)}
        >
          <Phone size={18} /> {currentUser?.phone ? 'Actualizar Teléfono' : 'Agregar Teléfono'}
        </button>

        {isPhoneModalOpen && (
          <PhoneInputModal 
            initialValue={currentUser.phone}
            onSave={(newPhone) => {
              updateProfile(currentUser.uid, { phone: newPhone });
              setIsPhoneModalOpen(false);
            }}
            onCancel={() => setIsPhoneModalOpen(false)}
          />
        )}
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

function MedalIcon({ iconName, size = 18 }) {
  switch (iconName) {
    case 'Award': return <Award size={size} />;
    case 'Star': return <Star size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Shield': return <Shield size={size} />;
    case 'Trophy': return <Trophy size={size} />;
    case 'Target': return <Target size={size} />;
    default: return <Award size={size} />;
  }
}
