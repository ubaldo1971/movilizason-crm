import { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import { useScoringEngine, CATEGORIES } from '../hooks/useScoringEngine';
import { 
  Trophy, Star, TrendingUp, Users, User, Award, Target,
  Clock, CheckCircle, AlertTriangle, BarChart3, ChevronDown, ChevronUp,
  Loader2
} from 'lucide-react';
import { 
  collection, query, orderBy, limit, onSnapshot, getDocs 
} from '../lib/dbService';
import { db } from '../firebaseConfig';

export default function Performance() {
  const { role, ROLES } = useRole();
  const { config, loading: configLoading, getRank } = useScoringEngine();
  const [activeTab, setActiveTab] = useState('individual');
  const [expandedUser, setExpandedUser] = useState(null);
  const [sortBy, setSortBy] = useState('score');
  const [users, setUsers] = useState([]);
  const [brigades, setBrigades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get current month for goals lookup
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    setLoading(true);
    // Real-time listener for top users
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('totalPoints', 'desc'),
      limit(50)
    );

    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          uid: doc.id,
          ...d,
          name: d.displayName || 'Usuario sin nombre',
          score: d.totalPoints || 0,
          tasksCompleted: d.tasksCompleted || 0,
          assemblies: d.assemblies || 0,
          visits: d.visits || 0,
          murals: d.murals || 0,
          brigade: d.brigadeName || 'Sin brigada asignada',
          tasksAssigned: d.tasksAssigned || 0
        };
      });
      setUsers(usersData);
    });

    // Real-time listener for brigades
    const brigadesQuery = query(
      collection(db, 'brigades'),
      orderBy('totalScore', 'desc'),
      limit(20)
    );

    const unsubscribeBrigades = onSnapshot(brigadesQuery, (snapshot) => {
      const brigadesData = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          name: d.name || 'Brigada sin nombre',
          score: d.totalScore || 0,
          members: d.memberCount || 0,
          completedRate: d.tasksAssigned ? (d.tasksCompleted / d.tasksAssigned) : 0,
          pointsByTask: d.pointsByTask || {}
        };
      });
      setBrigades(brigadesData);
      setLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeBrigades();
    };
  }, []);

  function getRankForScore(points, userRole = null, isBrigade = false) {
    if (!config || !config.ranks) return { rank: 'D', emoji: '🚨', label: 'Deficiente', color: '#ef4444' };
    
    // Default goals if not found in config
    const GOAL_DEFAULTS = {
      individual: 1000,
      brigade: 5000
    };

    let goal = isBrigade ? GOAL_DEFAULTS.brigade : GOAL_DEFAULTS.individual;

    // Lookup monthly goal from config
    if (config.monthlyGoals && config.monthlyGoals[currentMonth]) {
      const monthGoals = config.monthlyGoals[currentMonth];
      if (isBrigade) {
        // For brigades, we could use a specific 'brigade' key or a sum of roles
        goal = monthGoals.brigades || GOAL_DEFAULTS.brigade;
      } else if (userRole && monthGoals[userRole]) {
        goal = monthGoals[userRole];
      }
    }

    // Safety: don't divide by zero
    if (goal <= 0) goal = 1;

    const percentage = (points / goal) * 100;
    
    // Use the getRank utility from the hook (or localized version if hook doesn't export it yet)
    // Looking at useScoringEngine.js, it defines getRank(score, ranks)
    const ranks = config.ranks || [];
    let foundRank = ranks.find(r => percentage >= r.min && percentage <= r.max);
    
    if (!foundRank) {
      if (percentage > 100) foundRank = ranks.find(r => r.rank === 'A+') || ranks[0];
      else foundRank = ranks[ranks.length - 1];
    }

    return { ...foundRank, percentage: Math.round(percentage) };
  }

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === 'score') return b.score - a.score;
    if (sortBy === 'tasks') return b.tasksCompleted - a.tasksCompleted;
    return 0;
  });

  const sortedBrigades = [...brigades].sort((a, b) => b.score - a.score);

  // Summary stats
  const avgScore = users.length > 0 
    ? Math.round(users.reduce((sum, u) => sum + (u.score || 0), 0) / users.length * 10) / 10 
    : 0;
  
  const totalTasks = users.reduce((sum, u) => sum + (u.tasksAssigned || 0), 0);
  const totalCompleted = users.reduce((sum, u) => sum + (u.tasksCompleted || 0), 0);
  const overallRate = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  if (loading || configLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '60vh' }}>
        <div className="flex-col items-center gap-4">
          <Loader2 className="animate-spin" size={40} color="var(--color-primary)" />
          <p style={{ color: 'var(--text-secondary)' }}>Cargando ranking en tiempo real...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      {/* Header */}
      <div className="flex items-center gap-3" style={{ marginBottom: '2rem' }}>
        <div style={{ padding: '0.75rem', background: 'linear-gradient(135deg, #a855f7, #6366f1)', borderRadius: 'var(--radius-md)' }}>
          <BarChart3 color="white" size={24} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="flex items-center gap-3">
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Ranking de Desempeño</h1>
            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)', fontWeight: 'bold' }}>
              LIVE (LPE)
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Resultados basados en el Motor de Ponderación — Sonora 2026
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card glass-panel" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
            <Star size={18} style={{ color: '#a855f7' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Puntaje Promedio</span>
          </div>
          <h3 style={{ fontSize: '2rem', margin: 0, color: 'var(--color-primary-light)' }}>{avgScore} pts</h3>
        </div>
        <div className="card glass-panel" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
            <CheckCircle size={18} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tasa Completado</span>
          </div>
          <h3 style={{ fontSize: '2rem', margin: 0 }}>{overallRate}%</h3>
        </div>
        <div className="card glass-panel" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
            <Users size={18} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Operadores</span>
          </div>
          <h3 style={{ fontSize: '2rem', margin: 0 }}>{users.length}</h3>
        </div>
        <div className="card glass-panel" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '0.75rem' }}>
            <Trophy size={18} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Brigadas</span>
          </div>
          <h3 style={{ fontSize: '2rem', margin: 0 }}>{brigades.length}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4" style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <button 
          onClick={() => setActiveTab('individual')}
          style={{ background: 'none', border: 'none', padding: '0.75rem 0.25rem', color: activeTab === 'individual' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'individual' ? '2px solid var(--color-primary-light)' : 'none', fontWeight: activeTab === 'individual' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <User size={16} /> Individual
        </button>
        <button 
          onClick={() => setActiveTab('brigades')}
          style={{ background: 'none', border: 'none', padding: '0.75rem 0.25rem', color: activeTab === 'brigades' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'brigades' ? '2px solid var(--color-primary-light)' : 'none', fontWeight: activeTab === 'brigades' ? 'bold' : 'normal', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Users size={16} /> Por Brigada
        </button>
      </div>

      {/* Individual Tab */}
      {activeTab === 'individual' && (
        <div className="flex-col gap-3">
          {/* Sort controls */}
          <div className="flex gap-2 items-center" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            <span>Ordenar:</span>
            {[{ key: 'score', label: 'Score' }, { key: 'tasks', label: 'Tareas' }].map(s => (
              <button 
                key={s.key}
                onClick={() => setSortBy(s.key)}
                style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem', borderRadius: '100px', border: '1px solid var(--border-color)', background: sortBy === s.key ? 'var(--color-primary)' : 'transparent', color: sortBy === s.key ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}
              >
                {s.label}
              </button>
            ))}
          </div>

          {sortedUsers.map((person, index) => {
            const rankCfg = getRankForScore(person.score, person.role);
            const isExpanded = expandedUser === person.uid;
            const completionRate = person.tasksAssigned > 0 ? Math.round((person.tasksCompleted / person.tasksAssigned) * 100) : 0;

            return (
              <div 
                key={person.uid} 
                className="card" 
                style={{ padding: 0, overflow: 'hidden', borderLeft: `3px solid ${rankCfg.color}`, cursor: 'pointer' }}
                onClick={() => setExpandedUser(isExpanded ? null : person.uid)}
              >
                <div className="flex items-center gap-4" style={{ padding: '1rem 1.25rem' }}>
                  {/* Rank Position */}
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: index < 3 ? `linear-gradient(135deg, ${rankCfg.color}, ${rankCfg.color}88)` : 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 'bold', color: index < 3 ? 'white' : 'var(--text-secondary)', flexShrink: 0 }}>
                    {index + 1}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{person.name}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{person.role}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{person.brigade}</span>
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '80px' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: rankCfg.color, lineHeight: 1 }}>{Math.round(person.score)}</div>
                    <div style={{ fontSize: '0.7rem', color: rankCfg.color, fontWeight: 600, marginBottom: '4px' }}>
                      {rankCfg.emoji} {rankCfg.rank}
                    </div>
                    {/* Tiny Goal Progress Bar */}
                    <div style={{ width: '100%', height: '4px', background: 'var(--bg-surface-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, rankCfg.percentage)}%`, height: '100%', background: rankCfg.color, borderRadius: '2px' }} />
                    </div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px' }}>{rankCfg.percentage}% meta</div>
                  </div>

                  <div style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
                      <div className="flex-col gap-1">
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Eficiencia</span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{completionRate}%</span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{person.tasksCompleted} / {person.tasksAssigned} tareas</span>
                      </div>
                      
                      {/* Show categorical points if they exist */}
                      {Object.keys(CATEGORIES).map(catKey => {
                        const points = person[`points_${catKey}`] || 0;
                        if (points === 0) return null;
                        return (
                          <div key={catKey} className="flex-col gap-1">
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{CATEGORIES[catKey].label}</span>
                            <span style={{ fontSize: '1.25rem', fontWeight: 700 }}>{Math.round(points)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Brigades Tab */}
      {activeTab === 'brigades' && (
        <div className="flex-col gap-4">
          {sortedBrigades.map((brigade, index) => {
            const rankCfg = getRankForScore(brigade.score, null, true);
            const completedPct = Math.round(brigade.completedRate * 100);

            return (
              <div key={brigade.id} className="card" style={{ padding: '1.25rem', borderLeft: `3px solid ${rankCfg.color}` }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
                  <div className="flex items-center gap-3">
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: `linear-gradient(135deg, ${rankCfg.color}, ${rankCfg.color}66)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', fontSize: '0.875rem' }}>
                      #{index + 1}
                    </div>
                    <div>
                      <h4 style={{ fontSize: '1rem', margin: 0 }}>{brigade.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{brigade.members} miembros</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: rankCfg.color }}>{Math.round(brigade.score)}</div>
                    <div style={{ fontSize: '0.75rem', color: rankCfg.color, fontWeight: 600 }}>{rankCfg.emoji} Rango {rankCfg.rank}</div>
                  </div>
                </div>

                {/* Points Breakdown */}
                <div className="flex-col gap-3">
                  <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {Object.keys(CATEGORIES).map(catKey => {
                      const points = (brigade.pointsByTask && brigade.pointsByTask[catKey]) || 0;
                      if (points === 0) return null;
                      return (
                        <div key={catKey} style={{ padding: '4px 10px', background: `${CATEGORIES[catKey].color}15`, borderRadius: '6px', fontSize: '0.7rem', whiteSpace: 'nowrap', border: `1px solid ${CATEGORIES[catKey].color}30` }}>
                          <span style={{ opacity: 0.8 }}>{CATEGORIES[catKey].label}: </span>
                          <b style={{ color: CATEGORIES[catKey].color }}>{Math.round(points)} pts</b>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div>
                    <div className="flex justify-between" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      <span>Tasa de Eficacia Operativa</span>
                      <span style={{ fontWeight: 600, color: completedPct >= 80 ? '#10b981' : '#f59e0b' }}>{completedPct}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-elevated)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.min(100, completedPct)}%`, height: '100%', borderRadius: '4px', background: `linear-gradient(90deg, ${rankCfg.color}, ${rankCfg.color}88)`, transition: 'width 1s ease' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {sortedBrigades.length === 0 && !loading && (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Trophy size={48} style={{ margin: '0 auto 1rem', opacity: 0.2 }} />
              <p>No hay brigadas registradas con actividad todavía.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

