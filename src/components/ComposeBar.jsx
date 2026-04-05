import { useState, useRef } from 'react';
import { Send, ClipboardList, MessageCircle, Calendar, AlertTriangle, Users, BarChart3 } from 'lucide-react';
import { DEFAULT_TASK_TYPES, DEFAULT_COMPLEXITY } from '../hooks/useScoringEngine';

export default function ComposeBar({ onSend, recipientName }) {
  const [text, setText] = useState('');
  const [messageType, setMessageType] = useState('communication'); // communication | task
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskData, setTaskData] = useState({
    title: '',
    dueDate: '',
    priority: 'medium',
    isAlarm: false,
    taskType: 'visita',
    complexity: 1, // Normal
    peopleCount: 0
  });
  const inputRef = useRef(null);

  const handleTypeToggle = (type) => {
    setMessageType(type);
    setShowTaskForm(type === 'task');
    if (type === 'communication') {
      setTaskData({ 
        title: '', dueDate: '', priority: 'medium', isAlarm: false,
        taskType: 'visita', complexity: 1, peopleCount: 0
      });
    }
  };

  const handleSend = () => {
    if (messageType === 'communication' && !text.trim()) return;
    if (messageType === 'task' && !taskData.title.trim()) return;

    const messagePayload = {
      text: messageType === 'task' ? `📋 Tarea: ${taskData.title}` : text.trim(),
      type: messageType,
      isAlarm: taskData.isAlarm
    };

    if (messageType === 'task') {
      messagePayload.taskData = {
        title: taskData.title,
        description: text.trim(),
        dueDate: taskData.dueDate || null,
        priority: taskData.priority,
        status: 'pending',
        startedAt: null,
        completedAt: null,
        startedBy: null,
        completedBy: null,
        completionNotes: '',
        completionPhotos: [],
        // Scoring metadata
        taskType: taskData.taskType,
        complexityIndex: taskData.complexity,
        peopleCount: taskData.peopleCount,
        pointsEarned: 0
      };
    }

    onSend(messagePayload);
    setText('');
    setTaskData({ 
      title: '', dueDate: '', priority: 'medium', isAlarm: false,
      taskType: 'visita', complexity: 1, peopleCount: 0
    });
    setShowTaskForm(false);
    setMessageType('communication');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="compose-bar">
      {/* Type Selector */}
      <div className="compose-type-selector">
        <button
          className={`compose-type-btn ${messageType === 'communication' ? 'active' : ''}`}
          onClick={() => handleTypeToggle('communication')}
          title="Mensaje de comunicación"
        >
          <MessageCircle size={16} />
          <span>Mensaje</span>
        </button>
        <button
          className={`compose-type-btn task ${messageType === 'task' ? 'active' : ''}`}
          onClick={() => handleTypeToggle('task')}
          title="Asignar tarea"
        >
          <ClipboardList size={16} />
          <span>Tarea</span>
        </button>
      </div>

      {/* Task Form (shown when type === 'task') */}
      {showTaskForm && (
        <div className="compose-task-form">
          <input
            type="text"
            className="compose-task-input"
            placeholder="Título de la tarea..."
            value={taskData.title}
            onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
            autoFocus
          />
          <div className="compose-task-options">
            <div className="compose-task-option">
              <Calendar size={14} />
              <input
                type="datetime-local"
                className="compose-task-date"
                value={taskData.dueDate}
                onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
              />
            </div>
            <select
              className="compose-task-priority"
              value={taskData.priority}
              onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
            >
              <option value="low">🟢 Baja</option>
              <option value="medium">🟡 Media</option>
              <option value="high">🔴 Alta</option>
            </select>

            {/* Task Type Dropdown */}
            <div className="compose-task-option">
              <ClipboardList size={14} />
              <select
                className="compose-task-select"
                value={taskData.taskType}
                onChange={(e) => setTaskData({ ...taskData, taskType: e.target.value })}
              >
                {DEFAULT_TASK_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                ))}
              </select>
            </div>

            {/* Complexity Selector */}
            <div className="compose-task-option">
              <BarChart3 size={14} />
              <select
                className="compose-task-select"
                value={taskData.complexity}
                onChange={(e) => setTaskData({ ...taskData, complexity: Number(e.target.value) })}
              >
                {DEFAULT_COMPLEXITY.map((c, i) => (
                  <option key={c.id} value={i}>⚡ {c.level}</option>
                ))}
              </select>
            </div>

            {/* Scale/People Count (Conditional) */}
            {DEFAULT_TASK_TYPES.find(t => t.id === taskData.taskType)?.scaleEnabled && (
              <div className="compose-task-option">
                <Users size={14} />
                <input
                  type="number"
                  className="compose-task-number"
                  placeholder="Personas..."
                  min="0"
                  value={taskData.peopleCount}
                  onChange={(e) => setTaskData({ ...taskData, peopleCount: Math.max(0, parseInt(e.target.value) || 0) })}
                  title="Alcance / Asistentes esperados"
                />
              </div>
            )}

            <label className="compose-alarm-toggle">
              <input
                type="checkbox"
                checked={taskData.isAlarm}
                onChange={(e) => setTaskData({ ...taskData, isAlarm: e.target.checked })}
              />
              <AlertTriangle size={14} />
              <span>Alarma</span>
            </label>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="compose-input-row">
        <textarea
          ref={inputRef}
          className="compose-input"
          placeholder={messageType === 'task' ? 'Descripción de la tarea (opcional)...' : `Mensaje para ${recipientName || 'chat'}...`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
        />
        <button
          className="compose-send-btn"
          onClick={handleSend}
          disabled={messageType === 'communication' ? !text.trim() : !taskData.title.trim()}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
