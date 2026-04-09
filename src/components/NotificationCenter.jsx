import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, BellRing, BellOff, Shield, Smartphone, 
  CheckCircle, XCircle, AlertTriangle, Send, Volume2,
  Globe, Zap, Settings, Inbox, ClipboardList, 
  Award, MessageSquare, Clock
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import './NotificationCenter.css';


export default function NotificationCenter({ 
  isOpen, 
  onClose, 
  notifications = [], 
  markAsRead, 
  markAllAsRead,
  userId
}) {
  const { 
    permission, 
    fcmToken, 
    isSupported, 
    requestPermission, 
    sendTestNotification,
    isEnabled 
  } = useNotifications(userId);

  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('alerts'); // alerts | settings
  const [step, setStep] = useState('idle'); 
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

  const handleNotificationClick = async (notif) => {
    if (!notif.read && markAsRead) {
      await markAsRead(notif.id);
    }

    if (notif.type === 'task') navigate('/tasks');
    else if (notif.type === 'report') navigate('/reports');
    else if (notif.type === 'medal' || notif.type === 'support') navigate('/performance');

    onClose(); 
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Reciente';
    const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);

    if (diff < 1) return 'Ahora';
    if (diff < 60) return `Hace ${diff} min`;
    if (diff < 1440) return `Hace ${Math.floor(diff / 60)} h`;
    return date.toLocaleDateString();
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'task': return <ClipboardList size={20} />;
      case 'report': return <AlertTriangle size={20} />;
      case 'medal': return <Award size={20} />;
      case 'support': return <MessageSquare size={20} />;
      default: return <Bell size={20} />;
    }
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
            <p className="notif-subtitle">Alertas en tiempo real</p>
          </div>
          <button className="notif-close" onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div className="notif-tabs">
          <button 
            className={`notif-tab-btn ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            Alertas
            {notifications.filter(n => !n.read).length > 0 && (
              <span className="notif-badge-icon ml-1"></span>
            )}
          </button>
          <button 
            className={`notif-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Configuración
          </button>
        </div>

        {activeTab === 'alerts' && (
          <div className="notif-actions">
            <span className="notif-item-time" style={{ margin: 0 }}>
              {notifications.length} notificaciones
            </span>
            <button className="notif-action-btn" onClick={markAllAsRead}>
              Marcar todas como leídas
            </button>
          </div>
        )}

        {/* Content */}
        <div className="notif-content">
          {activeTab === 'alerts' ? (
            <div className="notif-list">
              {notifications.length === 0 ? (
                <div className="notif-empty">
                  <Inbox size={48} className="opacity-20" />
                  <p>No tienes notificaciones pendientes</p>
                </div>
              ) : (
                notifications.map(notif => (
                  <div 
                    key={notif.id} 
                    className={`notif-item ${!notif.read ? 'unread' : ''}`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className={`notif-icon-box ${notif.type || 'default'}`}>
                      {getNotifIcon(notif.type)}
                    </div>
                    <div className="notif-item-content">
                      <div className="notif-item-title">{notif.title}</div>
                      <div className="notif-item-body">{notif.body}</div>
                      <div className="notif-item-time">
                        <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />
                        {formatTime(notif.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
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
                  <p>Recibe alertas instantáneas en tu dispositivo incluso si no estás usando la app.</p>
                  
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
                        Solicitando...
                      </>
                    ) : (
                      <>
                        <Bell size={20} />
                        Activar Push
                      </>
                    )}
                  </button>
                </div>
              )}

              {isSupported && permission === 'denied' && (
                <div className="notif-error-box">
                  <BellOff size={32} />
                  <h4>Permisos Bloqueados</h4>
                  <p>Has bloqueado las notificaciones. Para reactivarlas:</p>
                  <ol className="notif-instructions">
                    <li>Haz clic en el icono de candado 🔒</li>
                    <li>Busca "Notificaciones" y activa "Permitir"</li>
                    <li>Recarga la página</li>
                  </ol>
                </div>
              )}

              {isSupported && isEnabled && (
                <div className="notif-success-box">
                  <div className="notif-success-icon-bg">
                    <CheckCircle size={40} className="notif-success-icon" />
                  </div>
                  <h4>¡Notificaciones Push Activas!</h4>
                  <p>Recibirás alertas en tiempo real en este dispositivo.</p>
                  
                  <div className="notif-active-features">
                    <div className="notif-active-feature">
                      <span className="notif-dot green"></span>
                      Tareas asignadas
                    </div>
                    <div className="notif-active-feature">
                      <span className="notif-dot red"></span>
                      Alertas ciudadanas críticas
                    </div>
                    <div className="notif-active-feature">
                      <span className="notif-dot blue"></span>
                      Reconocimientos y medallas
                    </div>
                  </div>

                  <button className="notif-test-btn" onClick={() => sendTestNotification()}>
                    <Send size={16} />
                    Prueba de conexión
                  </button>

                  <div className="notif-token-section">
                    <button 
                      className="notif-token-toggle"
                      onClick={() => setShowToken(!showToken)}
                    >
                      <Settings size={14} />
                      {showToken ? 'Ocultar Debug info' : 'Ver Debug info (Token)'}
                    </button>
                    {showToken && (
                      <code className="notif-token-code">{fcmToken}</code>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="notif-footer">
          <Shield size={14} />
          <span>Notificaciones protegidas vía LPE + Firebase Cloud Messaging</span>
        </div>
      </div>
    </div>
  );
}
