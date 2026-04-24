import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { useRole } from '../context/RoleContext';

export default function Login() {
  const navigate = useNavigate();
  const { allUsers, setCurrentUser } = useRole();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Simulate search delay for premium feel
    setTimeout(() => {
      const foundUser = allUsers.find(u => String(u.pin) === pin);
      
      if (foundUser) {
        console.log("Login successful:", foundUser.displayName);
        setCurrentUser(foundUser);
        navigate('/dashboard');
      } else {
        setError('PIN o Contraseña incorrecta. Verifique sus credenciales.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="flex items-center justify-center bg-background" style={{ height: '100vh', width: '100vw', padding: '1rem' }}>
      <div className="card glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
        
        <div className="flex-col items-center justify-center gap-2" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div className="pulse-primary" style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(var(--color-primary-rgb), 0.1)', marginBottom: '0.75rem', width: 'fit-content', margin: '0 auto' }}>
            <Shield size={40} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.025em', color: 'var(--text-primary)', margin: 0 }}>MovilizaSon</h1>
          <p style={{ color: 'var(--color-primary-light)', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.25rem' }}>Inteligencia electoral estatal</p>
        </div>

        {error && (
          <div 
            className="flex items-center gap-2 animate-shake" 
            style={{ 
              padding: '0.75rem', 
              borderRadius: '0.5rem', 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: '#ef4444',
              fontSize: '0.875rem',
              marginBottom: '1.5rem',
              border: '1px solid rgba(239, 68, 68, 0.2)'
            }}
          >
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div className="input-group">
            <label className="input-label" style={{ color: '#e0e3ea', fontWeight: '600', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>PIN de Acceso</label>
            <div style={{ position: 'relative' }}>
              <input 
                id="pin-input"
                name="pin"
                type="password" 
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required 
                maxLength={6}
                autoFocus
                className="glass-input"
                style={{ 
                  width: '100%',
                  padding: '1rem',
                  fontSize: '1.5rem',
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: 'var(--text-primary)',
                  borderRadius: '12px',
                  border: '1px solid rgba(var(--color-primary-rgb), 0.2)'
                }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className={`btn btn-primary ${loading ? 'btn-loading' : ''}`} 
            style={{ 
              marginTop: '1.5rem', 
              width: '100%', 
              padding: '1rem',
              fontSize: '1rem',
              fontWeight: '800'
            }}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : "ACCEDER AL SISTEMA"}
          </button>
        </form>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', fontSize: '0.72rem', color: '#a8adb8', lineHeight: '1.5' }}>
          Acceso restringido. Uso monitoreado y sancionado conforme a la ley.
          <br />© 2026 MovilizaSon v2.0 - Comando Central
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.3s ease-in-out; }
        .pulse-primary {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .glass-input:focus {
          border-color: var(--color-primary) !important;
          box-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.3);
          outline: none;
        }
      `}</style>
    </div>
  );
}
