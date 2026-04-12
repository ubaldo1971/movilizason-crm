import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, X, Check } from 'lucide-react';
import './ThemeModal.css';

export default function ThemeModal({ isOpen, onClose }) {
  const { theme, setTheme } = useTheme();

  if (!isOpen) return null;

  const themes = [
    { id: 'light', name: 'Día', icon: Sun, color: '#f59e0b' },
    { id: 'dark', name: 'Nocturno', icon: Moon, color: '#3b82f6' }
  ];

  return (
    <div className="theme-modal-overlay" onClick={onClose}>
      <div className="theme-modal-content" onClick={e => e.stopPropagation()}>
        <div className="theme-modal-header">
          <h3>Personalización de Vista</h3>
          <button className="theme-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <p className="theme-modal-desc">
          Selecciona el modo de visualización que mejor se adapte a tu entorno de trabajo.
        </p>

        <div className="theme-options-grid">
          {themes.map((t) => (
            <button 
              key={t.id}
              className={`theme-option-card ${theme === t.id ? 'active' : ''}`}
              onClick={() => {
                setTheme(t.id);
                // onClose(); // Keep it open so they see the change? User said "abre la plataforma... y que se hagan los cambios".
              }}
            >
              <div className="theme-option-icon" style={{ color: t.color }}>
                <t.icon size={32} strokeWidth={1.5} />
              </div>
              <span className="theme-option-name">{t.name}</span>
              {theme === t.id && (
                <div className="theme-active-badge">
                  <Check size={12} />
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="theme-modal-footer">
          <button className="btn btn-primary w-full" onClick={onClose}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}
