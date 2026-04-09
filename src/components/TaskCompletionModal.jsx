import { useState, useMemo, useEffect } from 'react';
import { 
  X, CheckCircle, AlertTriangle, Users, BarChart3, 
  Camera, Film, ClipboardList, Info, Star, Save, AlertCircle
} from 'lucide-react';
import { useScoringEngine } from '../hooks/useScoringEngine';
import { useRole } from '../context/RoleContext';
import EvidenceUploader from './EvidenceUploader';
import './TaskCompletionModal.css';

export default function TaskCompletionModal({ task, onConfirm, onCancel }) {
  const { config, calculateTaskScore } = useScoringEngine();
  const { requireEvidence } = useRole();
  const [peopleCount, setPeopleCount] = useState(task.peopleCount || 0);
  const [complexityIndex, setComplexityIndex] = useState(task.complexityIndex || 1);
  const [activeBonuses, setActiveBonuses] = useState([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('SUCCESS'); // SUCCESS, WITH_ISSUES
  const [photos, setPhotos] = useState([]);

  const scoreResult = useMemo(() => {
    return calculateTaskScore({
      typeId: task.taskType || 'asamblea',
      peopleCount,
      complexityIndex,
      activeBonuses
    });
  }, [task.taskType, peopleCount, complexityIndex, activeBonuses, calculateTaskScore]);

  // AUTO-BONUS DETECTION
  useEffect(() => {
    let newBonuses = [...activeBonuses];
    const hasPhotoBonus = newBonuses.includes('b2');
    const hasBaseBonus = newBonuses.includes('b5');

    // Photo bonus (+5%)
    if (photos.length > 0 && !hasPhotoBonus) {
      newBonuses.push('b2');
    } else if (photos.length === 0 && hasPhotoBonus) {
      newBonuses = newBonuses.filter(id => id !== 'b2');
    }

    // Base/Report bonus (+10%) - requires 20+ chars of notes
    if (notes.trim().length >= 20 && !hasBaseBonus) {
      newBonuses.push('b5');
    } else if (notes.trim().length < 20 && hasBaseBonus) {
      newBonuses = newBonuses.filter(id => id !== 'b5');
    }

    if (JSON.stringify(newBonuses) !== JSON.stringify(activeBonuses)) {
      setActiveBonuses(newBonuses);
    }
  }, [photos, notes, activeBonuses]);

  const toggleBonus = (id) => {
    // Prevent manual toggle for auto-detected bonuses
    if (id === 'b2' || id === 'b5') return;
    setActiveBonuses(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  // AUTO-COMPLEXITY BASED ON PEOPLE COUNT
  useEffect(() => {
    let autoIndex = 1; // Default to Normal
    if (peopleCount <= 10) autoIndex = 0; // Básica
    else if (peopleCount <= 50) autoIndex = 1; // Normal
    else if (peopleCount <= 500) autoIndex = 2; // Media
    else if (peopleCount <= 5000) autoIndex = 3; // Alta
    else autoIndex = 4; // Crítica

    if (complexityIndex !== autoIndex) {
      setComplexityIndex(autoIndex);
    }
  }, [peopleCount, complexityIndex]);

  const isRequirementMet = !requireEvidence || photos.length > 0;

  const handleConfirm = () => {
    if (!isRequirementMet) return;

    onConfirm({
      status: status === 'SUCCESS' ? 'COMPLETED' : 'WITH_ISSUES',
      notes,
      photos,
      pointsEarned: scoreResult.total,
      details: {
        peopleCount,
        complexityIndex,
        activeBonuses,
        breakdown: scoreResult.breakdown
      }
    });
  };

  const currentLevel = config.complexity[complexityIndex] || config.complexity[1];

  return (
    <div className="completion-modal-overlay">
      <div className="completion-modal card animate-scale-in">
        <div className="completion-modal-header">
          <div className="flex items-center gap-3">
            <div className="completion-icon-wrap" style={{ 
              padding: '8px', 
              background: 'rgba(16, 185, 129, 0.1)', 
              borderRadius: '12px' 
            }}>
              <CheckCircle size={24} color="#10b981" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Finalizar Tarea</h2>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {task.title}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onCancel} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div className="completion-modal-body" style={{ padding: '2rem', flex: 1, overflowY: 'auto' }}>
          {/* Quick Score Preview */}
          <div className="score-preview-card" style={{ 
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(99, 102, 241, 0.1))',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            padding: '1.5rem',
            borderRadius: '16px',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div className="flex-col">
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Puntos a Ganar</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#a855f7' }}>{scoreResult.total}</span>
                <Star size={24} fill="#a855f7" color="#a855f7" />
              </div>
            </div>
            <div className="preview-breakdown" style={{ display: 'flex', flexDirection: 'column', textAlign: 'right', gap: '4px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{scoreResult.breakdown.basePoints} base pts</span>
              {scoreResult.breakdown.scaleMultiplier > 1 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>×{scoreResult.breakdown.scaleMultiplier} escala</span>
              )}
              {scoreResult.breakdown.complexityMultiplier !== 1 && (
                <span style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 600 }}>×{scoreResult.breakdown.complexityMultiplier} dificultad</span>
              )}
              {scoreResult.breakdown.bonusPercentage > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>+{scoreResult.breakdown.bonusPercentage}% bonos</span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Scale */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <Users size={14} /> Asistentes / Alcance Real
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <input 
                  type="range" 
                  min="0" 
                  max="10000" 
                  step="10"
                  value={peopleCount} 
                  onChange={(e) => setPeopleCount(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#a855f7' }}
                />
                <div style={{ width: '120px', display: 'flex', alignItems: 'center', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '4px 8px' }}>
                  <input 
                    type="number" 
                    value={peopleCount} 
                    onChange={(e) => setPeopleCount(Number(e.target.value))}
                    style={{ background: 'none', border: 'none', width: '100%', outline: 'none', color: 'inherit', fontWeight: 'bold' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>ppl</span>
                </div>
              </div>
            </div>

            {/* Complexity and Status */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Dificultad (Autocalculada)</label>
              <div 
                style={{ 
                  padding: '10px 14px', 
                  backgroundColor: 'var(--bg-surface-elevated)', 
                  border: `1px solid ${currentLevel.color}40`,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div className="flex items-center gap-2">
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: currentLevel.color }}></div>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{currentLevel.level}</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>×{currentLevel.multiplier}</span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'block' }}>Resultado</label>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: '8px' }}>
                <button 
                  onClick={() => setStatus('SUCCESS')}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', background: status === 'SUCCESS' ? '#10b981' : 'transparent', color: status === 'SUCCESS' ? 'white' : 'var(--text-secondary)' }}
                >
                  Exitoso
                </button>
                <button 
                  onClick={() => setStatus('WITH_ISSUES')}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', background: status === 'WITH_ISSUES' ? '#f59e0b' : 'transparent', color: status === 'WITH_ISSUES' ? 'white' : 'var(--text-secondary)' }}
                >
                  Con Novedad
                </button>
              </div>
            </div>

            {/* Evidence and Bonuses */}
            <div style={{ gridColumn: 'span 2' }}>
              <EvidenceUploader 
                onEvidenceAdded={setPhotos} 
                label={requireEvidence ? "Cargar Evidencia (Obligatorio)" : "Cargar Evidencia (Opcional)"}
                maxFiles={5}
              />
              {!isRequirementMet && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '0.75rem', marginTop: '8px', fontWeight: 500 }}>
                  <AlertCircle size={14} /> Se requiere al menos una fotografía para confirmar esta tarea.
                </div>
              )}
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Bonificaciones de campo</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                {config.bonuses.map(bonus => {
                  const isActive = activeBonuses.includes(bonus.id);
                  return (
                    <button
                      key={bonus.id}
                      onClick={() => toggleBonus(bonus.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px',
                        background: isActive ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface-elevated)',
                        border: isActive ? '1px solid #10b981' : '1px solid var(--border-color)',
                        borderRadius: '10px', cursor: 'pointer'
                      }}
                    >
                      <span>{bonus.icon}</span>
                      <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{bonus.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Notas de campo</label>
              <textarea 
                className="input" 
                placeholder="Detalles sobre el éxito de la tarea o novedades encontradas..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ width: '100%', resize: 'none' }}
              />
            </div>
          </div>
        </div>

        <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn" onClick={onCancel}>Cancelar</button>
          <button 
            className="btn btn-primary" 
            onClick={handleConfirm}
            disabled={!isRequirementMet}
            style={{ 
              padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px',
              opacity: isRequirementMet ? 1 : 0.5,
              cursor: isRequirementMet ? 'pointer' : 'not-allowed'
            }}
          >
            <Save size={18} /> Confirmar y Ganar Tarea
          </button>
        </div>
      </div>
    </div>
  );
}
