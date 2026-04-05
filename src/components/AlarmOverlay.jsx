import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import './AlarmOverlay.css';

export default function AlarmOverlay({ message, onDismiss }) {
  const [dismissing, setDismissing] = useState(false);

  const handleDismiss = () => {
    setDismissing(true);
    setTimeout(() => onDismiss(), 300);
  };

  const isTask = message?.type === 'task';

  return (
    <div className={`alarm-overlay ${dismissing ? 'dismissing' : ''}`}>
      <div className="alarm-flash"></div>
      
      <div className="alarm-content">
        <div className="alarm-icon-pulse">
          <Bell size={48} className="alarm-bell" />
        </div>
        
        <div className="alarm-badge">
          {isTask ? '📋 NUEVA TAREA' : '💬 MENSAJE URGENTE'}
        </div>

        <h2 className="alarm-title">
          {message?.senderName || 'Sistema'}
        </h2>
        
        <p className="alarm-text">
          {isTask ? message?.taskData?.title : message?.text}
        </p>

        {isTask && message?.taskData?.dueDate && (
          <div className="alarm-due">
            ⏰ Fecha límite: {new Date(message.taskData.dueDate).toLocaleDateString('es-MX', {
              weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
            })}
          </div>
        )}

        <button className="alarm-dismiss-btn" onClick={handleDismiss}>
          <BellOff size={24} />
          RECIBIDO
        </button>

        <span className="alarm-timer">Se silenciará automáticamente en 30s</span>
      </div>
    </div>
  );
}
