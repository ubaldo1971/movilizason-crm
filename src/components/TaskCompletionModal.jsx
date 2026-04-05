import { useState, useMemo } from 'react';
import { 
  X, CheckCircle, AlertTriangle, Users, BarChart3, 
  Camera, Film, ClipboardList, Info, Star, Save
} from 'lucide-react';
import { useScoringEngine } from '../hooks/useScoringEngine';
import './TaskCompletionModal.css';

export default function TaskCompletionModal({ task, onConfirm, onCancel }) {
  const { config, calculateTaskScore } = useScoringEngine();
  const [peopleCount, setPeopleCount] = useState(task.peopleCount || 0);
  const [complexityIndex, setComplexityIndex] = useState(task.complexityIndex || 1);
  const [activeBonuses, setActiveBonuses] = useState([]);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('SUCCESS'); // SUCCESS, WITH_ISSUES

  const scoreResult = useMemo(() => {
    return calculateTaskScore({
      typeId: task.taskType || 'asamblea',
      peopleCount,
      complexityIndex,
      activeBonuses
    });
  }, [task.taskType, peopleCount, complexityIndex, activeBonuses, calculateTaskScore]);

  const toggleBonus = (id) => {
    setActiveBonuses(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const handleConfirm = () => {
    onConfirm({
      status: status === 'SUCCESS' ? 'COMPLETED' : 'WITH_ISSUES',
      notes,
      pointsEarned: scoreResult.total,
      details: {
        peopleCount,
        complexityIndex,
        activeBonuses,
        breakdown: scoreResult.breakdown
      }
    });
  };

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
              {scoreResult.breakdown.bonusPercentage > 0 && (
                <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>+{scoreResult.breakdown.bonusPercentage}% bonos</span>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Scale - Only if enabled for this task type */}
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
              <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#a855f7', fontWeight: 600 }}>
                Escala: {scoreResult.breakdown.scaleTier?.label || 'Micro'} (×{scoreResult.breakdown.scaleTier?.multiplier || 1.0})
              </div>
            </div>

            {/* Complexity */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                <BarChart3 size={14} /> Nivel de Dificultad
              </label>
              <select 
                className="input" 
                value={complexityIndex} 
                onChange={(e) => setComplexityIndex(Number(e.target.value))}
                style={{ width: '100%' }}
              >
                {config.complexity.map((c, i) => (
                  <option key={c.id} value={i}>{c.level} (×{c.multiplier})</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Resultado</label>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: '8px' }}>
                <button 
                  onClick={() => setStatus('SUCCESS')}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', background: status === 'SUCCESS' ? '#10b981' : 'transparent', color: status === 'SUCCESS' ? 'white' : 'var(--text-secondary)', fontWeight: status === 'SUCCESS' ? 'bold' : 'normal', transition: 'all 0.2s' }}
                >
                  Exitoso
                </button>
                <button 
                  onClick={() => setStatus('WITH_ISSUES')}
                  style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', background: status === 'WITH_ISSUES' ? '#f59e0b' : 'transparent', color: status === 'WITH_ISSUES' ? 'white' : 'var(--text-secondary)', fontWeight: status === 'WITH_ISSUES' ? 'bold' : 'normal', transition: 'all 0.2s' }}
                >
                  Novedad
                </button>
              </div>
            </div>

            {/* Bonuses */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>Bonos y Evidencia</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {config.bonuses.map(bonus => {
                  const isActive = activeBonuses.includes(bonus.id);
                  return (
                    <button
                      key={bonus.id}
                      onClick={() => toggleBonus(bonus.id)}
                      style={{ 
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                        background: isActive ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface-elevated)',
                        border: isActive ? '1px solid #10b981' : '1px solid var(--border-color)',
                        borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                      }}
                    >
                      <span style={{ fontSize: '1.25rem' }}>{bonus.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: isActive ? '#10b981' : 'var(--text-primary)' }}>{bonus.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>+{bonus.percentage}% bonus</div>
                      </div>
                      {isActive && <CheckCircle size={14} color="#10b981" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Notas Finales</label>
              <textarea 
                className="input" 
                placeholder="Describe brevemente el resultado de la tarea..."
                rows={3}
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
            style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={18} /> Confirmar y Ganar Tarea
          </button>
        </div>
      </div>
    </div>
  );
}
