import { useState, useEffect } from 'react';
import { 
  Bell, BellRing, BellOff, Shield, Smartphone, 
  CheckCircle, XCircle, AlertTriangle, Send, Volume2,
  Globe, Zap, Settings
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import './NotificationCenter.css';

const CURRENT_USER_ID = 'ubaldo-super-admin'; // Will be replaced by auth

export default function NotificationCenter({ isOpen, onClose }) {
  const { 
    permission, 
    fcmToken, 
    isSupported, 
    loading,
    requestPermission, 
    sendTestNotification,
    isEnabled 
  } = useNotifications(CURRENT_USER_ID);

  const [step, setStep] = useState('idle'); // idle | requesting | success | error
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (permission === 'granted' && fcmToken) {
      setStep('success');
    } else if (permission === 'denied') {
      setStep('error');
    }
  }, [permission, fcmToken]);

  const handleEnable = async () => {
    setStep('requesting');
    const token = await requestPermission();
    if (token) {
      setStep('success');
    } else if (Notification.permission === 'denied') {
      setStep('error');
    } else {
      setStep('idle');
    }
  };

  const handleTest = () => {
    sendTestNotification();
  };

  if (!isOpen) return null;

  return (
    <div className="notif-overlay" onClick={onClose}>
      <div className="notif-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="notif-header">
          <div className="notif-header-icon">
            <Bell size={24} />
          </div>
          <div>
            <h3 className="notif-title">Centro de Notificaciones</h3>
            <p className="notif-subtitle">Configuración de alertas push</p>
          </div>
          <button className="notif-close" onClick={onClose}>✕</button>
        </div>

        {/* Status Banner */}
        <div className={`notif-status-banner ${isEnabled ? 'enabled' : permission === 'denied' ? 'denied' : 'pending'}`}>
          {isEnabled ? (
            <>
              <CheckCircle size={20} />
              <span>Notificaciones push <strong>activas</strong></span>
            </>
          ) : permission === 'denied' ? (
            <>
              <XCircle size={20} />
              <span>Notificaciones <strong>bloqueadas</strong> por el navegador</span>
            </>
          ) : (
            <>
              <AlertTriangle size={20} />
              <span>Notificaciones push <strong>desactivadas</strong></span>
            </>
          )}
        </div>

        {/* Content */}
        <div className="notif-content">
          {!isSupported && (
            <div className="notif-error-box">
              <Globe size={32} />
              <h4>Navegador no compatible</h4>
              <p>Tu navegador no soporta notificaciones push. Usa Chrome, Edge, o Firefox para esta función.</p>
            </div>
          )}

          {isSupported && !isEnabled && permission !== 'denied' && (
            <div className="notif-cta-box">
              <div className="notif-cta-icon-bg">
                <BellRing size={40} className="notif-cta-icon" />
              </div>
              <h4>Activa las Notificaciones Push</h4>
              <p>Recibe alertas instantáneas cuando te asignen tareas, te envíen mensajes o haya actualizaciones en tus brigadas.</p>
              
              <div className="notif-features">
                <div className="notif-feature">
                  <Zap size={16} color="#f59e0b" />
                  <span>Alertas de tareas urgentes</span>
                </div>
                <div className="notif-feature">
                  <Smartphone size={16} color="#3b82f6" />
                  <span>Notificaciones en tu celular</span>
                </div>
                <div className="notif-feature">
                  <Volume2 size={16} color="#10b981" />
                  <span>Sonido + vibración para alarmas</span>
                </div>
              </div>

              <button 
                className="notif-enable-btn" 
                onClick={handleEnable}
                disabled={step === 'requesting'}
              >
                {step === 'requesting' ? (
                  <>
                    <div className="notif-spinner"></div>
                    Solicitando permisos...
                  </>
                ) : (
                  <>
                    <Bell size={20} />
                    Activar Notificaciones
                  </>
                )}
              </button>
            </div>
          )}

          {isSupported && permission === 'denied' && (
            <div className="notif-error-box">
              <BellOff size={32} />
              <h4>Permisos Bloqueados</h4>
              <p>Has bloqueado las notificaciones para este sitio. Para reactivarlas:</p>
              <ol className="notif-instructions">
                <li>Haz clic en el icono de candado 🔒 junto a la URL</li>
                <li>Busca "Notificaciones"</li>
                <li>Cambia de "Bloqueado" a "Permitir"</li>
                <li>Recarga la página</li>
              </ol>
            </div>
          )}

          {isSupported && isEnabled && (
            <div className="notif-success-box">
              <div className="notif-success-icon-bg">
                <CheckCircle size={40} className="notif-success-icon" />
              </div>
              <h4>¡Notificaciones Activas!</h4>
              <p>Recibirás alertas instantáneas de:</p>
              
              <div className="notif-active-features">
                <div className="notif-active-feature">
                  <span className="notif-dot green"></span>
                  Mensajes nuevos en tus conversaciones
                </div>
                <div className="notif-active-feature">
                  <span className="notif-dot yellow"></span>
                  Tareas asignadas a ti o tu brigada
                </div>
                <div className="notif-active-feature">
                  <span className="notif-dot red"></span>
                  Alertas urgentes con alarma de 30s
                </div>
                <div className="notif-active-feature">
                  <span className="notif-dot blue"></span>
                  Actualizaciones de desempeño
                </div>
              </div>

              <button className="notif-test-btn" onClick={handleTest}>
                <Send size={16} />
                Enviar Notificación de Prueba
              </button>

              {fcmToken && (
                <div className="notif-token-section">
                  <button 
                    className="notif-token-toggle"
                    onClick={() => setShowToken(!showToken)}
                  >
                    <Settings size={14} />
                    {showToken ? 'Ocultar Token FCM' : 'Ver Token FCM (debug)'}
                  </button>
                  {showToken && (
                    <code className="notif-token-code">{fcmToken}</code>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="notif-footer">
          <Shield size={14} />
          <span>Las notificaciones se envían de forma segura vía Firebase Cloud Messaging</span>
        </div>
      </div>
    </div>
  );
}
