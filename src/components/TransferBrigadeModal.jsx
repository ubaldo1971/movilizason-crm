import { useState, useRef, useEffect } from 'react';
import { X, ArrowRightLeft, ShieldCheck, AlertCircle, Loader2, Search } from 'lucide-react';
import { useRole } from '../context/RoleContext';
import './TransferBrigadeModal.css';

export default function TransferBrigadeModal({ member, sourceBrigade, allBrigades, onTransfer, onCancel }) {
  const { verifyPin, currentUser, role, ROLES } = useRole();
  const [targetBrigadeId, setTargetBrigadeId] = useState('');
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const pinRefs = useRef([]);
  const isAdmin = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN_ESTATAL;
  
  const otherBrigades = allBrigades.filter(b => {
    if (b.id === sourceBrigade.id) return false;
    if (isAdmin) return true;
    
    // For Federal Coordinators
    if (role === ROLES.COORD_DISTRITAL_FED) {
      const userDistFeds = currentUser.assignments?.districtsFed || [];
      // Brigade format: 'FED-3' or similar in its zone? 
      // Actually brigades store district IDs in their 'zone' field based on the select in Brigades.jsx
      return userDistFeds.some(df => b.zone === `fed-${df}` || b.zone === df);
    }
    
    // For Local Coordinators
    if (role === ROLES.COORD_DISTRITAL_LOC) {
      const userDistLocs = currentUser.assignments?.districtsLoc || [];
      return userDistLocs.some(dl => b.zone === `loc-${dl}` || b.zone === dl);
    }
    
    return false;
  });

  const handlePinChange = (index, value) => {
    if (isNaN(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.substring(value.length - 1);
    setPin(newPin);
    setError('');

    // Move to next input
    if (value && index < 5) {
      pinRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs.current[index - 1].focus();
    }
  };

  const handleExecute = async () => {
    if (!targetBrigadeId) {
      setError('Seleccione una brigada de destino');
      return;
    }

    const pinString = pin.join('');
    if (pinString.length !== 6) {
      setError('Ingrese su PIN de 6 dígitos');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      // Verify current user's PIN (the coordinator doing the transfer)
      const isValid = await verifyPin(currentUser.uid, pinString);
      
      if (!isValid) {
        setError('PIN incorrecto. Autorización denegada.');
        setIsVerifying(false);
        setPin(['', '', '', '', '', '']);
        pinRefs.current[0].focus();
        return;
      }

      const targetBrigade = allBrigades.find(b => b.id === targetBrigadeId);
      
      setIsSuccess(true);
      setTimeout(() => {
        onTransfer(member, targetBrigade);
      }, 1000);
      
    } catch (err) {
      setError('Error al procesar la transferencia');
      setIsVerifying(false);
    }
  };

  return (
    <div className="transfer-modal-overlay">
      <div className={`transfer-modal animate-scale-in ${error ? 'animate-shake' : ''}`}>
        <div className="transfer-header">
          <div className="flex items-center gap-3">
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px' }}>
              <ArrowRightLeft size={20} color="var(--color-primary)" />
            </div>
            <h2>Transferir Integrante</h2>
          </div>
          <button className="close-btn" onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="transfer-body">
          <div className="member-preview">
            <div className="brigade-member-avatar" style={{ margin: 0, width: '40px', height: '40px' }}>
              <span>{member.name?.[0] || 'U'}</span>
            </div>
            <div className="member-preview-info">
              <h4>{member.name}</h4>
              <p>Desde: <strong>{sourceBrigade.name}</strong></p>
            </div>
          </div>

          <div className="transfer-form-group">
            <label>Brigada de Destino</label>
            <select 
              className="transfer-select"
              value={targetBrigadeId}
              onChange={(e) => setTargetBrigadeId(e.target.value)}
              disabled={isVerifying || isSuccess}
            >
              <option value="">Seleccione destino...</option>
              {otherBrigades.map(b => (
                <option key={b.id} value={b.id}>
                  {b.emoji} {b.name} ({b.zone})
                </option>
              ))}
            </select>
          </div>

          <div className="transfer-form-group" style={{ marginTop: '10px' }}>
            <label style={{ textAlign: 'center', display: 'block' }}>
              <ShieldCheck size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              Autorización del Coordinador (PIN)
            </label>
            <div className="pin-input-container">
              {pin.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => pinRefs.current[idx] = el}
                  type="password"
                  maxLength={1}
                  className="pin-digit-input"
                  value={digit}
                  onChange={(e) => handlePinChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isVerifying || isSuccess}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="transfer-error">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>

        <div className="transfer-footer">
          <button className="btn-transfer-cancel" onClick={onCancel} disabled={isVerifying || isSuccess}>
            Cancelar
          </button>
          <button 
            className="btn-transfer-execute" 
            onClick={handleExecute}
            disabled={!targetBrigadeId || pin.join('').length !== 6 || isVerifying || isSuccess}
          >
            {isVerifying ? (
              <Loader2 className="animate-spin" size={18} />
            ) : isSuccess ? (
              '¡Transferido!'
            ) : (
              <>Ejecutar Transferencia</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
