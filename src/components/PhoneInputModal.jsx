import { useState } from 'react';
import { X, Phone, Save, AlertCircle } from 'lucide-react';
import './PhoneInputModal.css';

export default function PhoneInputModal({ initialValue, onSave, onCancel }) {
  const [phone, setPhone] = useState(initialValue || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('El número debe tener exactamente 10 dígitos.');
      return;
    }
    onSave(cleanPhone);
  };

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhone(val);
    if (error) setError('');
  };

  return (
    <div className="phone-modal-overlay">
      <div className="phone-modal card animate-scale-in">
        <div className="phone-modal-header">
          <div className="flex items-center gap-3">
            <div className="phone-icon-wrap">
              <Phone size={20} color="var(--color-primary-light)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Configurar Teléfono</h2>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Vincular número para comunicación interna
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="phone-modal-body">
          <div className="input-group">
            <label className="input-label">Número de Celular (10 dígitos)</label>
            <div className="phone-input-container">
              <span className="country-code">+52</span>
              <input 
                type="text" 
                className={`input-field ${error ? 'error' : ''}`}
                value={phone}
                onChange={handleInputChange}
                placeholder="ej. 6621234567"
                autoFocus
              />
            </div>
            {error && (
              <div className="error-msg">
                <AlertCircle size={14} /> {error}
              </div>
            )}
          </div>
          
          <div className="modal-info-box">
             <p>Este número se utilizará exclusivamente para la coordinación dentro del **Comando Central**. No es visible para usuarios externos al CRM.</p>
          </div>
        </div>

        <div className="phone-modal-footer">
          <button className="btn" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} /> Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
