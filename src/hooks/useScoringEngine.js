import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, collection } from '../lib/dbService';
import { db } from '../firebaseConfig';

// ─── DEFAULT TASK CATALOG ───────────────────────────
export const DEFAULT_TASK_TYPES = [
  { id: 'asamblea', name: 'Asamblea', category: 'eventos', icon: '📣', basePoints: 100, description: 'Reunión presencial organizada', scaleEnabled: true },
  { id: 'foro', name: 'Foro', category: 'eventos', icon: '🎤', basePoints: 80, description: 'Panel de discusión temático', scaleEnabled: true },
  { id: 'mitin', name: 'Mitin', category: 'eventos', icon: '🏟️', basePoints: 120, description: 'Acto político con candidato', scaleEnabled: true },
  { id: 'capacitacion', name: 'Capacitación', category: 'eventos', icon: '🎓', basePoints: 40, description: 'Entrenamiento de brigada', scaleEnabled: true },
  { id: 'visita', name: 'Visita Domiciliaria', category: 'campo', icon: '🏠', basePoints: 8, description: 'Casa por casa', scaleEnabled: false },
  { id: 'entrega_material', name: 'Entrega Material', category: 'campo', icon: '📰', basePoints: 5, description: 'Periódico/propaganda puerta a puerta', scaleEnabled: false },
  { id: 'pinta_barda', name: 'Pinta de Barda', category: 'campo', icon: '🎨', basePoints: 25, description: 'Mural publicitario en barda', scaleEnabled: false },
  { id: 'registro', name: 'Registro Simpatizante', category: 'operativo', icon: '📋', basePoints: 3, description: 'Captura de nuevo contacto', scaleEnabled: false },
  { id: 'reporte_campo', name: 'Reporte de Campo', category: 'operativo', icon: '📝', basePoints: 10, description: 'Informe de zona asignada', scaleEnabled: false },
  { id: 'reel', name: 'Reel / Video Corto', category: 'digital', icon: '🎬', basePoints: 15, description: 'Video corto para redes sociales', scaleEnabled: false },
  { id: 'podcast', name: 'Podcast', category: 'digital', icon: '🎙️', basePoints: 30, description: 'Episodio de audio/video largo', scaleEnabled: false },
  { id: 'post', name: 'Post / Historia', category: 'digital', icon: '📱', basePoints: 5, description: 'Publicación en redes sociales', scaleEnabled: false },
];

export const CATEGORIES = {
  eventos: { label: '📣 Eventos Masivos', color: '#f59e0b' },
  campo: { label: '🏠 Trabajo de Campo', color: '#10b981' },
  digital: { label: '📲 Digital', color: '#3b82f6' },
  operativo: { label: '📋 Operativo', color: '#8b5cf6' },
};

// ─── DEFAULT SCALE TIERS (adjusted per user: 10 ppl=×1, 10K=×10) ──
export const DEFAULT_SCALE_TIERS = [
  { id: 's1', label: 'Micro', minPeople: 1, maxPeople: 10, multiplier: 1.0 },
  { id: 's2', label: 'Pequeño', minPeople: 11, maxPeople: 50, multiplier: 2.0 },
  { id: 's3', label: 'Mediano', minPeople: 51, maxPeople: 200, multiplier: 3.5 },
  { id: 's4', label: 'Grande', minPeople: 201, maxPeople: 500, multiplier: 5.0 },
  { id: 's5', label: 'Masivo', minPeople: 501, maxPeople: 1000, multiplier: 6.5 },
  { id: 's6', label: 'Mega', minPeople: 1001, maxPeople: 5000, multiplier: 8.0 },
  { id: 's7', label: 'Estatal', minPeople: 5001, maxPeople: 10000, multiplier: 10.0 },
  { id: 's8', label: 'Épico', minPeople: 10001, maxPeople: 999999, multiplier: 12.0 },
];

// ─── DEFAULT COMPLEXITY LEVELS ─────────────────────
export const DEFAULT_COMPLEXITY = [
  { id: 'c1', level: 'Básica', multiplier: 0.8, description: 'Rutinaria, sin preparación especial', color: '#6b7280' },
  { id: 'c2', level: 'Normal', multiplier: 1.0, description: 'Coordinación standard', color: '#3b82f6' },
  { id: 'c3', level: 'Media', multiplier: 1.3, description: 'Logística o permisos necesarios', color: '#f59e0b' },
  { id: 'c4', level: 'Alta', multiplier: 1.6, description: 'Planeación multi-día, recursos especiales', color: '#f97316' },
  { id: 'c5', level: 'Crítica', multiplier: 2.0, description: 'Evento clave, máxima coordinación', color: '#ef4444' },
];

// ─── DEFAULT BONUSES ──────────────────────────────
export const DEFAULT_BONUSES = [
  { id: 'b1', name: 'Entrega a Tiempo', percentage: 20, condition: 'Completada antes del deadline', icon: '⏰' },
  { id: 'b2', name: 'Evidencia Fotográfica', percentage: 10, condition: '3+ fotos del evento', icon: '📸' },
  { id: 'b3', name: 'Evidencia en Video', percentage: 15, condition: 'Video de la actividad', icon: '🎥' },
  { id: 'b4', name: 'Lista de Asistencia', percentage: 10, condition: 'Lista verificable de asistentes', icon: '📝' },
  { id: 'b5', name: 'Reporte Escrito', percentage: 5, condition: 'Informe detallado post-actividad', icon: '📄' },
];

// ─── DEFAULT RANK THRESHOLDS ──────────────────────
export const DEFAULT_RANKS = [
  { rank: 'A+', min: 95, max: 100, emoji: '⭐', label: 'Élite', color: '#a855f7' },
  { rank: 'A', min: 85, max: 94, emoji: '🏆', label: 'Excelente', color: '#10b981' },
  { rank: 'B', min: 70, max: 84, emoji: '👍', label: 'Bueno', color: '#3b82f6' },
  { rank: 'C', min: 55, max: 69, emoji: '⚠️', label: 'Regular', color: '#f59e0b' },
  { rank: 'D', min: 0, max: 54, emoji: '🚨', label: 'Deficiente', color: '#ef4444' },
];

// ─── SCORING ENGINE ──────────────────────────────
export function calculateTaskScore(taskType, scaleIndex, complexityIndex, activeBonuses, config = {}) {
  const taskTypes = config.taskTypes || DEFAULT_TASK_TYPES;
  const scaleTiers = config.scaleTiers || DEFAULT_SCALE_TIERS;
  const complexityLevels = config.complexity || DEFAULT_COMPLEXITY;
  const bonuses = config.bonuses || DEFAULT_BONUSES;

  const task = taskTypes.find(t => t.id === taskType);
  if (!task) return { total: 0, breakdown: {} };

  const basePoints = task.basePoints;

  // Scale multiplier (only for scale-enabled tasks)
  let scaleMultiplier = 1.0;
  let scaleTier = null;
  if (task.scaleEnabled && scaleIndex >= 0 && scaleIndex < scaleTiers.length) {
    scaleTier = scaleTiers[scaleIndex];
    scaleMultiplier = scaleTier.multiplier;
  }

  // Complexity multiplier
  const complexity = complexityLevels[complexityIndex] || complexityLevels[1]; // default Normal
  const complexityMultiplier = complexity.multiplier;

  // Calculate bonuses
  let bonusTotal = 0;
  const appliedBonuses = [];
  activeBonuses.forEach(bonusId => {
    const bonus = bonuses.find(b => b.id === bonusId);
    if (bonus) {
      bonusTotal += bonus.percentage / 100;
      appliedBonuses.push(bonus);
    }
  });

  const subtotal = basePoints * scaleMultiplier * complexityMultiplier;
  const bonusAmount = subtotal * bonusTotal;
  const total = Math.round((subtotal + bonusAmount) * 10) / 10;

  return {
    total,
    breakdown: {
      basePoints,
      scaleMultiplier,
      scaleTier,
      complexityMultiplier,
      complexityLevel: complexity,
      bonusPercentage: Math.round(bonusTotal * 100),
      bonusAmount: Math.round(bonusAmount * 10) / 10,
      subtotal: Math.round(subtotal * 10) / 10,
      appliedBonuses
    }
  };
}

export function getScaleIndex(peopleCount, scaleTiers = DEFAULT_SCALE_TIERS) {
  if (peopleCount <= 0) return 0;
  for (let i = 0; i < scaleTiers.length; i++) {
    if (peopleCount >= scaleTiers[i].minPeople && peopleCount <= scaleTiers[i].maxPeople) {
      return i;
    }
  }
  return scaleTiers.length - 1; // Default to highest tier if over limit
}

export function getRank(score, ranks = DEFAULT_RANKS) {
  for (const r of ranks) {
    if (score >= r.min && score <= r.max) return r;
  }
  return ranks[ranks.length - 1]; // Default to D
}

// ─── FIRESTORE PERSISTENCE HOOK ──────────────────
export function useScoringEngine() {
  const [taskTypes, setTaskTypes] = useState(DEFAULT_TASK_TYPES);
  const [scaleTiers, setScaleTiers] = useState(DEFAULT_SCALE_TIERS);
  const [complexity, setComplexity] = useState(DEFAULT_COMPLEXITY);
  const [bonuses, setBonuses] = useState(DEFAULT_BONUSES);
  const [ranks, setRanks] = useState(DEFAULT_RANKS);
  const [monthlyGoals, setMonthlyGoals] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState(null);

  // Load config from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'scoring_config', 'global'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.taskTypes?.length) setTaskTypes(data.taskTypes);
        if (data.scaleTiers?.length) setScaleTiers(data.scaleTiers);
        if (data.complexity?.length) setComplexity(data.complexity);
        if (data.bonuses?.length) setBonuses(data.bonuses);
        if (data.ranks?.length) setRanks(data.ranks);
        if (data.monthlyGoals) setMonthlyGoals(data.monthlyGoals);
        if (data.lastSaved) setLastSaved(data.lastSaved);
      }
      setLoading(false);
    }, (err) => {
      console.error('Score config listen error:', err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Save config to Firestore
  const saveConfig = useCallback(async (updates = {}) => {
    const configData = {
      taskTypes: updates.taskTypes || taskTypes,
      scaleTiers: updates.scaleTiers || scaleTiers,
      complexity: updates.complexity || complexity,
      bonuses: updates.bonuses || bonuses,
      ranks: updates.ranks || ranks,
      monthlyGoals: updates.monthlyGoals || monthlyGoals,
      lastSaved: new Date().toISOString(),
    };
    
    try {
      await setDoc(doc(db, 'scoring_config', 'global'), configData);
      if (updates.taskTypes) setTaskTypes(updates.taskTypes);
      if (updates.scaleTiers) setScaleTiers(updates.scaleTiers);
      if (updates.complexity) setComplexity(updates.complexity);
      if (updates.bonuses) setBonuses(updates.bonuses);
      if (updates.ranks) setRanks(updates.ranks);
      if (updates.monthlyGoals) setMonthlyGoals(updates.monthlyGoals);
      setLastSaved(configData.lastSaved);
      return true;
    } catch (error) {
      console.error('Error saving scoring config:', error);
      return false;
    }
  }, [taskTypes, scaleTiers, complexity, bonuses, ranks, monthlyGoals]);

  // Wrapped calculate function that uses current state
  const calculateScore = useCallback((params) => {
    const { typeId, peopleCount, complexityIndex, activeBonuses = [] } = params;
    const scaleIndex = getScaleIndex(peopleCount, scaleTiers);
    return calculateTaskScore(typeId, scaleIndex, complexityIndex, activeBonuses, {
      taskTypes, scaleTiers, complexity, bonuses
    });
  }, [taskTypes, scaleTiers, complexity, bonuses]);

  return {
    taskTypes, scaleTiers, complexity, bonuses, ranks, monthlyGoals,
    setTaskTypes, setScaleTiers, setComplexity, setBonuses, setRanks, setMonthlyGoals,
    loading, lastSaved, saveConfig,
    calculateTaskScore: calculateScore,
    config: { taskTypes, scaleTiers, complexity, bonuses, ranks }
  };
}
