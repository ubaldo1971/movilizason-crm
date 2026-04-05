import { useState, useMemo } from 'react';
import { useRole } from '../context/RoleContext';
import { 
  Scale, Save, Plus, Trash2, Edit3, CheckCircle, X,
  Calculator, Target, Sliders, Settings, List,
  ChevronDown, ChevronUp, AlertTriangle, Lock,
  Zap, Users, Clock, Award
} from 'lucide-react';
import {
  useScoringEngine, CATEGORIES,
  DEFAULT_TASK_TYPES, DEFAULT_SCALE_TIERS, DEFAULT_COMPLEXITY, DEFAULT_BONUSES
} from '../hooks/useScoringEngine';
import './TaskScoring.css';

export default function TaskScoring() {
  const { role, ROLES } = useRole();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const [activeTab, setActiveTab] = useState('catalog');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const {
    taskTypes, scaleTiers, complexity, bonuses, ranks, monthlyGoals,
    setTaskTypes, setScaleTiers, setComplexity, setBonuses, setMonthlyGoals,
    loading, lastSaved, saveConfig, config
  } = useScoringEngine();

  // Save handler
  const handleSave = async () => {
    if (!isSuperAdmin) return;
    setSaving(true);
    const ok = await saveConfig();
    setSaving(false);
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="scoring-locked animate-fade-in">
        <Lock size={64} />
        <h2>Acceso Restringido</h2>
        <p>Solo el <strong>Super Admin</strong> puede configurar el motor de ponderación.</p>
        <p className="scoring-locked-hint">Contacta al administrador para ajustar los valores de las tareas.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'catalog', icon: List, label: 'Catálogo' },
    { id: 'multipliers', icon: Sliders, label: 'Multiplicadores' },
    { id: 'simulator', icon: Calculator, label: 'Simulador' },
    { id: 'goals', icon: Target, label: 'Metas' },
  ];

  return (
    <div className="scoring-page animate-fade-in">
      {/* Header */}
      <div className="scoring-header">
        <div className="scoring-header-left">
          <div className="scoring-header-icon">
            <Scale size={24} />
          </div>
          <div>
            <h1 className="scoring-title">Ponderación de Tareas</h1>
            <p className="scoring-subtitle">
              Algoritmo de calificación configurable — Solo Super Admin
            </p>
          </div>
        </div>
        <div className="scoring-header-right">
          {lastSaved && (
            <span className="scoring-last-saved">
              Guardado: {new Date(lastSaved).toLocaleString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            className={`scoring-save-btn ${saved ? 'saved' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <><div className="notif-spinner" /> Guardando...</>
            ) : saved ? (
              <><CheckCircle size={18} /> ¡Guardado!</>
            ) : (
              <><Save size={18} /> Guardar Config</>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="scoring-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`scoring-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="scoring-content">
        {activeTab === 'catalog' && (
          <CatalogTab
            taskTypes={taskTypes}
            setTaskTypes={setTaskTypes}
          />
        )}
        {activeTab === 'multipliers' && (
          <MultipliersTab
            scaleTiers={scaleTiers}
            setScaleTiers={setScaleTiers}
            complexity={complexity}
            setComplexity={setComplexity}
            bonuses={bonuses}
            setBonuses={setBonuses}
          />
        )}
        {activeTab === 'simulator' && (
          <SimulatorTab config={config} />
        )}
        {activeTab === 'goals' && (
          <GoalsTab
            monthlyGoals={monthlyGoals}
            setMonthlyGoals={setMonthlyGoals}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 1: CATÁLOGO DE TAREAS
   ═══════════════════════════════════════════════ */
function CatalogTab({ taskTypes, setTaskTypes }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const grouped = useMemo(() => {
    const groups = {};
    taskTypes.forEach(t => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [taskTypes]);

  const startEdit = (task) => {
    setEditingId(task.id);
    setEditForm({ ...task });
  };

  const saveEdit = () => {
    setTaskTypes(prev => prev.map(t => t.id === editingId ? { ...editForm } : t));
    setEditingId(null);
  };

  const addNewTask = (category) => {
    const newId = `custom_${Date.now()}`;
    setTaskTypes(prev => [...prev, {
      id: newId, name: 'Nueva Tarea', category, icon: '⚡',
      basePoints: 10, description: 'Descripción...', scaleEnabled: false
    }]);
    startEdit({ id: newId, name: 'Nueva Tarea', category, icon: '⚡', basePoints: 10, description: 'Descripción...', scaleEnabled: false });
  };

  const deleteTask = (id) => {
    setTaskTypes(prev => prev.filter(t => t.id !== id));
    if (editingId === id) setEditingId(null);
  };

  return (
    <div className="catalog-grid">
      {Object.entries(CATEGORIES).map(([catId, cat]) => (
        <div key={catId} className="catalog-category">
          <div className="catalog-category-header">
            <h3>{cat.label}</h3>
            <button className="catalog-add-btn" onClick={() => addNewTask(catId)}>
              <Plus size={14} /> Agregar
            </button>
          </div>

          <div className="catalog-items">
            {(grouped[catId] || []).map(task => {
              const isEditing = editingId === task.id;
              return (
                <div key={task.id} className={`catalog-card ${isEditing ? 'editing' : ''}`}>
                  {isEditing ? (
                    <div className="catalog-edit-form">
                      <div className="catalog-edit-row">
                        <input
                          className="scoring-input small"
                          value={editForm.icon}
                          onChange={e => setEditForm(p => ({ ...p, icon: e.target.value }))}
                          style={{ width: '50px', textAlign: 'center', fontSize: '1.25rem' }}
                          placeholder="📋"
                        />
                        <input
                          className="scoring-input"
                          value={editForm.name}
                          onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="Nombre de tarea"
                        />
                      </div>
                      <input
                        className="scoring-input"
                        value={editForm.description}
                        onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                        placeholder="Descripción"
                      />
                      <div className="catalog-edit-row">
                        <label className="scoring-label">Puntos Base:</label>
                        <input
                          className="scoring-input small"
                          type="number"
                          value={editForm.basePoints}
                          onChange={e => setEditForm(p => ({ ...p, basePoints: Number(e.target.value) }))}
                          min={1}
                          max={500}
                        />
                        <label className="scoring-checkbox-label">
                          <input
                            type="checkbox"
                            checked={editForm.scaleEnabled}
                            onChange={e => setEditForm(p => ({ ...p, scaleEnabled: e.target.checked }))}
                          />
                          Escala (personas)
                        </label>
                      </div>
                      <div className="catalog-edit-actions">
                        <button className="scoring-btn success" onClick={saveEdit}>
                          <CheckCircle size={14} /> Guardar
                        </button>
                        <button className="scoring-btn ghost" onClick={() => setEditingId(null)}>
                          <X size={14} /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="catalog-card-main">
                        <span className="catalog-card-icon">{task.icon}</span>
                        <div className="catalog-card-info">
                          <span className="catalog-card-name">{task.name}</span>
                          <span className="catalog-card-desc">{task.description}</span>
                        </div>
                        <div className="catalog-card-points">
                          <span className="catalog-points-value">{task.basePoints}</span>
                          <span className="catalog-points-label">pts</span>
                        </div>
                      </div>
                      <div className="catalog-card-footer">
                        <div className="catalog-card-tags">
                          {task.scaleEnabled && (
                            <span className="catalog-tag scale">
                              <Users size={10} /> Escala
                            </span>
                          )}
                        </div>
                        <div className="catalog-card-actions">
                          <button className="catalog-action-btn" onClick={() => startEdit(task)}>
                            <Edit3 size={13} />
                          </button>
                          <button className="catalog-action-btn danger" onClick={() => deleteTask(task.id)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 2: MULTIPLICADORES
   ═══════════════════════════════════════════════ */
function MultipliersTab({ scaleTiers, setScaleTiers, complexity, setComplexity, bonuses, setBonuses }) {
  return (
    <div className="multipliers-container">
      {/* Scale Tiers */}
      <div className="multiplier-section">
        <div className="multiplier-section-header">
          <Users size={20} style={{ color: '#f59e0b' }} />
          <div>
            <h3>Multiplicador por Escala (Personas)</h3>
            <p>Cuánto más vale una tarea según el número de asistentes/alcance</p>
          </div>
        </div>
        <div className="scale-grid">
          {scaleTiers.map((tier, idx) => (
            <div key={tier.id} className="scale-card">
              <div className="scale-card-header">
                <span className="scale-label">{tier.label}</span>
                <span className="scale-range">{tier.minPeople.toLocaleString()} — {tier.maxPeople >= 999999 ? '∞' : tier.maxPeople.toLocaleString()}</span>
              </div>
              <div className="scale-multiplier-edit">
                <span className="scale-x">×</span>
                <input
                  className="scoring-input multiplier-input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  value={tier.multiplier}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 1;
                    setScaleTiers(prev => prev.map((t, i) => i === idx ? { ...t, multiplier: val } : t));
                  }}
                />
              </div>
              <div className="scale-bar-container">
                <div className="scale-bar" style={{ width: `${Math.min(100, (tier.multiplier / 12) * 100)}%`, background: `hsl(${40 - (idx * 5)}, 80%, 50%)` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Complexity Levels */}
      <div className="multiplier-section">
        <div className="multiplier-section-header">
          <Zap size={20} style={{ color: '#ef4444' }} />
          <div>
            <h3>Multiplicador por Complejidad</h3>
            <p>Qué tan difícil es ejecutar la tarea</p>
          </div>
        </div>
        <div className="complexity-grid">
          {complexity.map((level, idx) => (
            <div key={level.id} className="complexity-card" style={{ borderColor: level.color }}>
              <div className="complexity-header">
                <span className="complexity-name" style={{ color: level.color }}>{level.level}</span>
                <div className="scale-multiplier-edit">
                  <span className="scale-x">×</span>
                  <input
                    className="scoring-input multiplier-input"
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={level.multiplier}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 1;
                      setComplexity(prev => prev.map((c, i) => i === idx ? { ...c, multiplier: val } : c));
                    }}
                  />
                </div>
              </div>
              <span className="complexity-desc">{level.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bonuses */}
      <div className="multiplier-section">
        <div className="multiplier-section-header">
          <Award size={20} style={{ color: '#10b981' }} />
          <div>
            <h3>Bonos Adicionales</h3>
            <p>Porcentaje extra si se cumple la condición</p>
          </div>
        </div>
        <div className="bonus-grid">
          {bonuses.map((bonus, idx) => (
            <div key={bonus.id} className="bonus-card">
              <span className="bonus-icon">{bonus.icon}</span>
              <div className="bonus-info">
                <span className="bonus-name">{bonus.name}</span>
                <span className="bonus-condition">{bonus.condition}</span>
              </div>
              <div className="bonus-pct-edit">
                <span className="bonus-plus">+</span>
                <input
                  className="scoring-input multiplier-input"
                  type="number"
                  min="1"
                  max="100"
                  value={bonus.percentage}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 5;
                    setBonuses(prev => prev.map((b, i) => i === idx ? { ...b, percentage: val } : b));
                  }}
                />
                <span className="bonus-pct-label">%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 3: SIMULADOR EN VIVO
   ═══════════════════════════════════════════════ */
function SimulatorTab({ config }) {
  const [selectedTask, setSelectedTask] = useState(config.taskTypes[0]?.id || 'asamblea');
  const [selectedScale, setSelectedScale] = useState(0);
  const [selectedComplexity, setSelectedComplexity] = useState(1);
  const [selectedBonuses, setSelectedBonuses] = useState([]);

  const task = config.taskTypes.find(t => t.id === selectedTask);
  const result = calculateTaskScore(selectedTask, selectedScale, selectedComplexity, selectedBonuses, config);

  const toggleBonus = (id) => {
    setSelectedBonuses(prev => prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]);
  };

  return (
    <div className="simulator-container">
      <div className="simulator-left">
        {/* Task Type Selector */}
        <div className="sim-section">
          <h4 className="sim-label">1. Tipo de Tarea</h4>
          <div className="sim-task-grid">
            {config.taskTypes.map(t => (
              <button
                key={t.id}
                className={`sim-task-btn ${selectedTask === t.id ? 'active' : ''}`}
                onClick={() => setSelectedTask(t.id)}
              >
                <span className="sim-task-icon">{t.icon}</span>
                <span className="sim-task-name">{t.name}</span>
                <span className="sim-task-pts">{t.basePoints}pts</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scale Selector (conditional) */}
        {task?.scaleEnabled && (
          <div className="sim-section">
            <h4 className="sim-label">2. Escala (Personas)</h4>
            <div className="sim-scale-grid">
              {config.scaleTiers.map((tier, idx) => (
                <button
                  key={tier.id}
                  className={`sim-scale-btn ${selectedScale === idx ? 'active' : ''}`}
                  onClick={() => setSelectedScale(idx)}
                >
                  <span className="sim-scale-label">{tier.label}</span>
                  <span className="sim-scale-range">
                    {tier.minPeople.toLocaleString()}-{tier.maxPeople >= 999999 ? '∞' : tier.maxPeople.toLocaleString()}
                  </span>
                  <span className="sim-scale-mult">×{tier.multiplier}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Complexity */}
        <div className="sim-section">
          <h4 className="sim-label">{task?.scaleEnabled ? '3' : '2'}. Complejidad</h4>
          <div className="sim-complexity-row">
            {config.complexity.map((level, idx) => (
              <button
                key={level.id}
                className={`sim-complexity-btn ${selectedComplexity === idx ? 'active' : ''}`}
                onClick={() => setSelectedComplexity(idx)}
                style={{ '--c-color': level.color }}
              >
                <span className="sim-c-name">{level.level}</span>
                <span className="sim-c-mult">×{level.multiplier}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Bonuses */}
        <div className="sim-section">
          <h4 className="sim-label">{task?.scaleEnabled ? '4' : '3'}. Bonos</h4>
          <div className="sim-bonus-row">
            {config.bonuses.map(bonus => (
              <button
                key={bonus.id}
                className={`sim-bonus-btn ${selectedBonuses.includes(bonus.id) ? 'active' : ''}`}
                onClick={() => toggleBonus(bonus.id)}
              >
                <span>{bonus.icon}</span>
                <span>{bonus.name}</span>
                <span className="sim-bonus-pct">+{bonus.percentage}%</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result Panel */}
      <div className="simulator-right">
        <div className="sim-result-card">
          <h3 className="sim-result-header">Resultado del Cálculo</h3>
          
          <div className="sim-result-total">
            <span className="sim-result-value">{result.total}</span>
            <span className="sim-result-unit">puntos</span>
          </div>

          <div className="sim-formula">
            <div className="sim-formula-line">
              <span className="sim-f-label">Puntos Base</span>
              <span className="sim-f-value">{result.breakdown.basePoints}</span>
            </div>
            {task?.scaleEnabled && (
              <div className="sim-formula-line">
                <span className="sim-f-label">× Escala ({result.breakdown.scaleTier?.label})</span>
                <span className="sim-f-value">×{result.breakdown.scaleMultiplier}</span>
              </div>
            )}
            <div className="sim-formula-line">
              <span className="sim-f-label">× Complejidad ({result.breakdown.complexityLevel?.level})</span>
              <span className="sim-f-value">×{result.breakdown.complexityMultiplier}</span>
            </div>
            <div className="sim-formula-line subtotal">
              <span className="sim-f-label">Subtotal</span>
              <span className="sim-f-value">{result.breakdown.subtotal}</span>
            </div>
            {result.breakdown.bonusPercentage > 0 && (
              <div className="sim-formula-line bonus">
                <span className="sim-f-label">+ Bonos ({result.breakdown.bonusPercentage}%)</span>
                <span className="sim-f-value">+{result.breakdown.bonusAmount}</span>
              </div>
            )}
            <div className="sim-formula-line total">
              <span className="sim-f-label">TOTAL</span>
              <span className="sim-f-value">{result.total}</span>
            </div>
          </div>

          {/* Live comparison */}
          <div className="sim-comparison">
            <h4>Comparativa Rápida</h4>
            <div className="sim-compare-items">
              {[
                { label: 'Visita domiciliaria', pts: calculateTaskScore('visita', 0, 1, [], config).total },
                { label: 'Pinta de barda', pts: calculateTaskScore('pinta_barda', 0, 1, [], config).total },
                { label: 'Reel digital', pts: calculateTaskScore('reel', 0, 1, [], config).total },
                { label: 'Asamblea ×10', pts: calculateTaskScore('asamblea', 0, 1, [], config).total },
                { label: 'Asamblea ×10K', pts: calculateTaskScore('asamblea', 6, 3, [], config).total },
              ].map((item, i) => (
                <div key={i} className="sim-compare-item">
                  <span>{item.label}</span>
                  <div className="sim-compare-bar-wrap">
                    <div className="sim-compare-bar" style={{ 
                      width: `${Math.min(100, (item.pts / Math.max(result.total, 1)) * 100)}%` 
                    }} />
                  </div>
                  <span className="sim-compare-pts">{item.pts}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   TAB 4: METAS MENSUALES
   ═══════════════════════════════════════════════ */
function GoalsTab({ monthlyGoals, setMonthlyGoals }) {
  const { ROLES } = useRole();
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const goals = monthlyGoals[selectedMonth] || {};

  const roleGoalDefaults = {
    [ROLES.SUPER_ADMIN]: 0,
    [ROLES.ADMIN_ESTATAL]: 200,
    [ROLES.COORD_DISTRITAL_FED]: 300,
    [ROLES.COORD_DISTRITAL_LOC]: 350,
    [ROLES.COORD_SECCIONAL]: 400,
    [ROLES.BRIGADISTA]: 500,
  };

  const updateGoal = (roleKey, value) => {
    setMonthlyGoals(prev => ({
      ...prev,
      [selectedMonth]: {
        ...prev[selectedMonth],
        [roleKey]: Number(value) || 0
      }
    }));
  };

  // Generate months for selector
  const months = [];
  for (let i = -2; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    });
  }

  return (
    <div className="goals-container">
      <div className="goals-header">
        <div>
          <h3>Meta Mensual de Puntos por Rol</h3>
          <p>Define cuántos puntos debe acumular cada rol para alcanzar el 100% de su Score mensual</p>
        </div>
        <select
          className="scoring-select"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
        >
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <div className="goals-grid">
        {Object.entries(roleGoalDefaults).map(([roleKey, defaultVal]) => {
          const currentGoal = goals[roleKey] ?? defaultVal;
          return (
            <div key={roleKey} className="goal-card">
              <div className="goal-card-header">
                <span className="goal-role">{roleKey}</span>
              </div>
              <div className="goal-input-wrap">
                <input
                  className="scoring-input goal-input"
                  type="number"
                  min={0}
                  max={10000}
                  value={currentGoal}
                  onChange={e => updateGoal(roleKey, e.target.value)}
                />
                <span className="goal-unit">pts/mes</span>
              </div>
              <div className="goal-explanation">
                {currentGoal === 0 ? (
                  <span className="goal-exempt">Sin meta (N/A)</span>
                ) : (
                  <span>≈ {Math.ceil(currentGoal / 30)} pts/día</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="goals-info-box">
        <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0 }} />
        <div>
          <strong>¿Cómo funciona la meta?</strong>
          <p>El Score de cada operador se calcula como: <code>(Puntos Acumulados ÷ Meta) × 100</code>. Si un Brigadista con meta de 500 acumula 425 puntos, su Score será 85 (Rango B). Si supera la meta, puede llegar a A+ (score &gt; 95).</p>
        </div>
      </div>
    </div>
  );
}
