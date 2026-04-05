import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Smartphone, Mail, Key } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState('email');

  const handleLogin = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div className="flex items-center justify-center" style={{ height: '100vh', width: '100vw', padding: '1rem' }}>
      <div className="card glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem' }}>
        
        <div className="flex-col items-center justify-center gap-2" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <Shield size={48} style={{ color: 'var(--color-primary)' }} />
          <h1 style={{ fontSize: '1.75rem', marginTop: '0.5rem' }}>MovilizaSon</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Sistema de Control Territorial Operativo</p>
        </div>

        <div className="flex gap-2" style={{ marginBottom: '1.5rem' }}>
          <button 
            className={`btn ${loginMethod === 'email' ? 'btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setLoginMethod('email')}
          >
            <Mail size={16} /> Correo
          </button>
          <button 
            className={`btn ${loginMethod === 'sms' ? 'btn-primary' : ''}`}
            style={{ flex: 1 }}
            onClick={() => setLoginMethod('sms')}
          >
            <Smartphone size={16} /> SMS
          </button>
        </div>

        <form onSubmit={handleLogin} className="flex-col">
          {loginMethod === 'email' ? (
            <div className="input-group">
              <label className="input-label">Correo Electrónico</label>
              <input type="email" className="input-field" placeholder="tunombre@movilizason.mx" required />
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Teléfono Móvil</label>
              <input type="tel" className="input-field" placeholder="(662) 000 0000" required />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Contraseña / PIN</label>
            <input type="password" className="input-field" placeholder="••••••••" required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem' }}>
            <Key size={18} /> Iniciar Sesión Segura
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Acceso restringido. El uso no autorizado de este sistema será sancionado.
        </div>
      </div>
    </div>
  );
}
