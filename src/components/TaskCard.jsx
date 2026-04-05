import { useState } from 'react';
import { CheckCircle, Play, Clock, AlertTriangle, Users, BarChart3, Star, XCircle, ChevronRight, Lock } from 'lucide-react';
import { DEFAULT_TASK_TYPES, DEFAULT_COMPLEXITY } from '../hooks/useScoringEngine';
import { useRole } from '../context/RoleContext';
import EvidenceUploader from './EvidenceUploader';

export default function TaskCard({ taskData, messageId, conversationId, currentUserId, onUpdateTask }) {
  const { verifyPin } = useRole();
  const [showActions, setShowActions] = useState(false);
  const [actionType, setActionType] = useState(null); // '100' | 'details' | 'cancel'
  const [notes, setNotes] = useState('');
  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [pendingEvidence, setPendingEvidence] = useState([]);
  const { uploadEvidence } = useRole();

  if (!taskData) return null;

  const { title, description, dueDate, priority, status, startedAt, completedAt, completionNotes } = taskData;

  const priorityConfig = {
    low: { label: 'Baja', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    medium: { label: 'Media', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    high: { label: 'Alta', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
  };

  const statusConfig = {
    pending: { label: 'Pendiente', color: '#f59e0b', icon: Clock },
    started: { label: 'En Progreso', color: '#3b82f6', icon: Play },
    completed: { label: 'Completada', color: '#10b981', icon: CheckCircle },
    COMPLETED: { label: 'Completada', color: '#10b981', icon: CheckCircle },
    COMPLETED_WITH_DETAILS: { label: 'Con Detalles', color: '#8b5cf6', icon: AlertTriangle },
    CANCELLED: { label: 'Cancelada', color: '#ef4444', icon: XCircle },
    overdue: { label: 'Vencida', color: '#ef4444', icon: AlertTriangle }
  };
  
  const taskTypeInfo = DEFAULT_TASK_TYPES.find(t => t.id === taskData.taskType) || DEFAULT_TASK_TYPES[0];
  const complexityInfo = DEFAULT_COMPLEXITY[taskData.complexityIndex] || DEFAULT_COMPLEXITY[1];

  const isOverdue = dueDate && !['COMPLETED', 'COMPLETED_WITH_DETAILS', 'CANCELLED', 'completed'].includes(status) && new Date(dueDate) < new Date();
  const currentStatus = isOverdue ? 'overdue' : status;
  const sConfig = statusConfig[currentStatus] || statusConfig.pending;
  const pConfig = priorityConfig[priority] || priorityConfig.medium;
  const StatusIcon = sConfig.icon;

  const handleAction = async () => {
    if (pin.length < 6) {
      setError('Ingresa el PIN de 6 dígitos');
      return;
    }

    setIsVerifying(true);
    setError('');

    const isValid = await verifyPin(currentUserId, pin);
    if (!isValid) {
      setError('PIN incorrecto');
      setIsVerifying(false);
      setPin('');
      return;
    }

    let finalStatus = 'COMPLETED';
    if (actionType === 'details') finalStatus = 'COMPLETED_WITH_DETAILS';
    if (actionType === 'cancel') finalStatus = 'CANCELLED';

    // 1. Upload evidence if any
    const evidenceUrls = [];
    if (pendingEvidence.length > 0) {
      for (const file of pendingEvidence) {
        const evId = await uploadEvidence(file, {
          taskId: taskData.id,
          taskTitle: taskData.title,
          notes: notes
        });
        if (evId) evidenceUrls.push(evId);
      }
    }

    // 2. Update task
    onUpdateTask?.(conversationId, messageId, { 
      ...taskData, 
      status: finalStatus, 
      completedAt: new Date().toISOString(),
      completedBy: currentUserId,
      completionNotes: notes,
      evidenceIds: evidenceUrls
    });

    setIsVerifying(false);
    setActionType(null);
    setPin('');
    setPendingEvidence([]);
  };

  const isFinished = ['COMPLETED', 'COMPLETED_WITH_DETAILS', 'CANCELLED', 'completed'].includes(status);

  return (
    <div className="task-card" style={{ borderLeftColor: sConfig.color }}>
      <div className="task-card-header">
        <div className="task-card-status" style={{ color: sConfig.color, backgroundColor: `${sConfig.color}15` }}>
          <StatusIcon size={14} />
          <span>{sConfig.label}</span>
        </div>
        {!isFinished && (
          <div className="task-card-priority" style={{ color: pConfig.color, backgroundColor: pConfig.bg }}>
            {pConfig.label}
          </div>
        )}
      </div>

      <h4 className="task-card-title">{title}</h4>
      
      {!isFinished && (
        <div className="task-card-tags">
          <span className="task-card-tag type">
            {taskTypeInfo.icon} {taskTypeInfo.name}
          </span>
          <span className="task-card-tag complexity" style={{ color: complexityInfo.color }}>
            <BarChart3 size={10} /> {complexityInfo.level}
          </span>
        </div>
      )}

      {description && !isFinished && <p className="task-card-desc">{description}</p>}

      {!isFinished && status === 'pending' && (
        <button className="task-start-btn" onClick={() => onUpdateTask(conversationId, messageId, { ...taskData, status: 'started' })}>
          <Play size={14} /> Iniciar Tarea
        </button>
      )}

      {!isFinished && status === 'started' && !actionType && (
        <div className="task-actions-grid">
          <button className="task-action-btn success" onClick={() => setActionType('100')}>
            <CheckCircle size={14} /> 100%
          </button>
          <button className="task-action-btn warning" onClick={() => setActionType('details')}>
            <AlertTriangle size={14} /> Detalles
          </button>
          <button className="task-action-btn danger" onClick={() => setActionType('cancel')}>
            <XCircle size={14} /> Cancelar
          </button>
        </div>
      )}

      {actionType && (
        <div className="task-action-entry">
          <div className="action-entry-header">
            <span>{actionType === '100' ? 'Finalizar al 100%' : actionType === 'details' ? 'Finalizar con Detalles' : 'Cancelar Tarea'}</span>
            <button className="btn-close" onClick={() => { setActionType(null); setError(''); setPin(''); }}>×</button>
          </div>
          
          {(actionType === 'details' || actionType === 'cancel') && (
            <textarea 
              className="action-textarea" 
              placeholder={actionType === 'cancel' ? "Explica por qué se cancela..." : "Agrega detalles de la ejecución..."}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              autoFocus
            />
          )}

          {actionType !== 'cancel' && (
            <EvidenceUploader onEvidenceAdded={setPendingEvidence} />
          )}

          <div className="pin-input-wrapper">
            <Lock size={14} />
            <input 
              type="password" 
              placeholder="PIN de 6 dígitos" 
              maxLength={6} 
              className="pin-field"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
            <button className="btn-confirm" onClick={handleAction} disabled={isVerifying}>
              {isVerifying ? '...' : <ChevronRight size={18} />}
            </button>
          </div>
          {error && <div className="pin-error">{error}</div>}
        </div>
      )}

      {isFinished && (
        <div className="task-card-finished">
          <div className="finished-info">
            <CheckCircle size={14} style={{ color: sConfig.color }} />
            <span>Resultado: <strong>{sConfig.label}</strong></span>
          </div>
          {completionNotes && (
            <p className="finished-notes">"{completionNotes}"</p>
          )}
          <div className="finished-meta">
            {taskData.pointsEarned > 0 && <span className="pts">+{taskData.pointsEarned} pts</span>}
            <span className="time">{completedAt ? new Date(completedAt).toLocaleDateString() : ''}</span>
          </div>
        </div>
      )}
    </div>
  );
}
