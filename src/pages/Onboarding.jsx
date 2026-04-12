import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MapPin, Camera, Mic, Bell, ShieldCheck, ChevronRight, 
  Settings, Info, Lock, CheckCircle2, AlertCircle, Users
} from 'lucide-react';
import { doc, updateDoc } from '../lib/dbService';
import { db } from '../firebaseConfig';
import { useRole } from '../context/RoleContext';
import './Onboarding.css';

export default function Onboarding() {
  const navigate = useNavigate();
  const { currentUser } = useRole();
  const [step, setStep] = useState(1);
  const [permissions, setPermissions] = useState({
    location: false,
    camera: false,
    microphone: false,
    notifications: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestPermission = async (type) => {
    setLoading(true);
    setError(null);
    try {
      if (type === 'location') {
        const result = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        if (result) setPermissions(prev => ({ ...prev, location: true }));
      } else if (type === 'camera') {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissions(prev => ({ ...prev, camera: true }));
      } else if (type === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissions(prev => ({ ...prev, microphone: true }));
      } else if (type === 'notifications') {
        const result = await Notification.requestPermission();
        if (result === 'granted') setPermissions(prev => ({ ...prev, notifications: true }));
      }
    } catch (err) {
      console.error(`Error requesting ${type}:`, err);
      setError(`No se pudo activar ${type}. Por favor, habilítalo manualmente en la configuración del navegador.`);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!currentUser?.uid) {
      navigate('/dashboard');
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        onboardingCompleted: true,
        permissions: {
          ...permissions,
          updatedAt: new Date().toISOString()
        }
      });
      navigate('/dashboard');
    } catch (err) {
      console.error('Error saving onboarding status:', err);
      navigate('/dashboard');
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-overlay" />
      
      <div className="onboarding-content">
        <div className="onboarding-card glass-morphism">
          
          {/* Progress Indicator */}
          <div className="onboarding-progress">
            {[1, 2, 3].map(i => (
              <div key={i} className={`progress-dot ${step >= i ? 'active' : ''}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="onboarding-step fade-in">
              <div className="step-icon-container">
                <ShieldCheck className="step-icon pulse" size={64} />
              </div>
              <h1>Bienvenido al Comando Central</h1>
              <p>Para operar en territorio como una unidad de élite, necesitamos configurar tu equipo táctico. Tus datos están protegidos y solo se usan durante la operación.</p>
              
              <button className="primary-btn" onClick={() => setStep(2)}>
                Configurar Equipo <ChevronRight size={20} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step fade-in">
              <h1>Permisos de Campo</h1>
              <p>Activa las herramientas necesarias para el rastreo en tiempo real y reportes de evidencia.</p>
              
              <div className="permissions-grid">
                <div className={`permission-item ${permissions.location ? 'granted' : ''}`} onClick={() => !permissions.location && requestPermission('location')}>
                  <div className="item-icon"><MapPin size={24} /></div>
                  <div className="item-text">
                    <h3>Ubicación GPS</h3>
                    <span>Rastreo en vivo tipo Uber</span>
                  </div>
                  <div className="item-status">{permissions.location ? <CheckCircle2 size={20} /> : <Settings size={20} />}</div>
                </div>

                <div className={`permission-item ${permissions.camera ? 'granted' : ''}`} onClick={() => !permissions.camera && requestPermission('camera')}>
                  <div className="item-icon"><Camera size={24} /></div>
                  <div className="item-text">
                    <h3>Cámara</h3>
                    <span>Captura de INE y evidencia</span>
                  </div>
                  <div className="item-status">{permissions.camera ? <CheckCircle2 size={20} /> : <Settings size={20} />}</div>
                </div>

                <div className={`permission-item ${permissions.microphone ? 'granted' : ''}`} onClick={() => !permissions.microphone && requestPermission('microphone')}>
                  <div className="item-icon"><Mic size={24} /></div>
                  <div className="item-text">
                    <h3>Comunicación</h3>
                    <span>Canales de voz tácticos</span>
                  </div>
                  <div className="item-status">{permissions.microphone ? <CheckCircle2 size={20} /> : <Settings size={20} />}</div>
                </div>

                <div className={`permission-item ${permissions.notifications ? 'granted' : ''}`} onClick={() => !permissions.notifications && requestPermission('notifications')}>
                  <div className="item-icon"><Bell size={24} /></div>
                  <div className="item-text">
                    <h3>Alertas</h3>
                    <span>Notificaciones críticas</span>
                  </div>
                  <div className="item-status">{permissions.notifications ? <CheckCircle2 size={20} /> : <Settings size={20} />}</div>
                </div>
              </div>

              {error && <div className="error-msg"><AlertCircle size={16} /> {error}</div>}

              <div className="actions">
                <button className="secondary-btn" onClick={() => setStep(1)}>Volver</button>
                <button 
                  className="primary-btn" 
                  disabled={!permissions.location}
                  onClick={() => setStep(3)}
                >
                  Continuar {permissions.location ? <ChevronRight size={20} /> : <Lock size={18} />}
                </button>
              </div>
              {!permissions.location && <span className="helper-text">La ubicación es obligatoria para el despliegue.</span>}
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step fade-in">
              <div className="step-icon-container">
                <CheckCircle2 className="step-icon success-pulse" size={64} />
              </div>
              <h1>¡Todo Listo!</h1>
              <p>Tu terminal ha sido vinculada al nodo central de Sonora. Ahora aparecerás en el mapa táctico y podrás coordinar con tu brigada en tiempo real.</p>
              
              <div className="summary-info glass-morphism">
                <div className="summary-row">
                  <Users size={16} /> <span>Brigadista Registrado</span>
                </div>
                <div className="summary-row">
                  <MapPin size={16} /> <span>Rastreo Activo</span>
                </div>
              </div>

              <button className="primary-btn launch-btn" onClick={handleComplete} disabled={loading}>
                {loading ? 'Sincronizando...' : 'Iniciar Operaciones'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
