import { useState, useEffect } from 'react';
import { 
  Trophy, 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Award, 
  ChevronRight, 
  ChevronDown, 
  Target, 
  Star, 
  Shield, 
  Zap,
  Plus,
  Settings,
  Trash2,
  Edit2,
  User,
  Clock,
  Loader2,
  X,
  Heart,
  Download,
  Mail,
  Phone
} from 'lucide-react';
import { useRole } from '../context/RoleContext';
import { useScoringEngine } from '../hooks/useScoringEngine';
import { 
  collection, query, orderBy, limit, onSnapshot 
} from '../lib/dbService';
import { db } from '../firebaseConfig';
import { exportToCSV } from '../lib/exportService';
import './Performance.css';

export default function Performance() {
  const { 
    tasks, 
    currentUser, 
    role,
    ROLES, 
    medalTypes, 
    awardedMedals, 
    awardMedal, 
    allUsers,
    addMedalType, 
    deleteMedalType 
  } = useRole();
  const { config, loading: configLoading } = useScoringEngine();
  const [activeTab, setActiveTab] = useState('individual');
  const [timeFilter, setTimeFilter] = useState('total'); // 'total' or 'monthly'
  const [showAwardModal, setShowAwardModal] = useState(null);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [medalReason, setMedalReason] = useState("");
  const [selectedMedalId, setSelectedMedalId] = useState("");
  const [newMedal, setNewMedal] = useState({ name: '', icon: 'Award', color: '#800020' });
  const [brigades, setBrigades] = useState([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN_ESTATAL;

  const handleExportIndividual = () => {
    const data = processedData.map((p, index) => {
      const userFull = allUsers.find(u => u.uid === p.id) || {};
      return {
        rank: index + 1,
        name: p.name,
        role: p.role,
        points: p.totalPoints,
        tasks: p.tasksCompleted,
        email: userFull.email || 'N/A',
        phone: userFull.phone || 'N/A',
        section: userFull.section || 'N/A',
        distFederal: userFull.distFederal || 'N/A',
        distLocal: userFull.distLocal || 'N/A'
      };
    });

    const headers = {
      rank: 'Posición',
      name: 'Nombre Completo',
      role: 'Rol',
      points: 'Puntos Acumulados',
      tasks: 'Tareas Finalizadas',
      email: 'Email de Contacto',
      phone: 'Teléfono / WhatsApp',
      section: 'Sección Territorial',
      distFederal: 'Distrito Fed',
      distLocal: 'Distrito Loc'
    };

    exportToCSV(data, `Ranking_Individual_${timeFilter}`, headers);
  };

  const handleExportBrigades = () => {
    const data = brigades.map((b, index) => ({
      rank: index + 1,
      name: b.name,
      members: b.members,
      score: b.score,
      efficiency: (b.completedRate * 100).toFixed(1) + '%'
    }));

    const headers = {
      rank: 'Posición',
      name: 'Nombre de Brigada',
      members: 'Cant. Miembros',
      score: 'Puntos Totales',
      efficiency: 'Eficiencia % (Tareas)'
    };

    exportToCSV(data, 'Ranking_Brigadas_Excel', headers);
  };

  useEffect(() => {
    const brigadesQuery = query(collection(db, 'brigades'), orderBy('totalScore', 'desc'), limit(20));
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
    return () => unsubscribeBrigades();
  }, []);

  const getProcessedScores = () => {
    const userScores = {};
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    tasks.forEach(task => {
      const activeUser = task.assigneeId || task.completedBy;
      if (!task.completed || !activeUser) return;
      const finishedAt = new Date(task.completedAt);
      if (timeFilter === 'monthly' && finishedAt < firstDayOfMonth) return;

      if (!userScores[task.assigneeId]) {
        userScores[task.assigneeId] = {
          id: task.assigneeId,
          name: task.assignee || 'Usuario',
          role: task.role || 'Brigadista',
          totalPoints: 0,
          tasksCompleted: 0
        };
      }
      userScores[task.assigneeId].totalPoints += (task.pointsEarned || 0);
      userScores[task.assigneeId].tasksCompleted += 1;
    });
    return Object.values(userScores).sort((a, b) => b.totalPoints - a.totalPoints);
  };

  const processedData = getProcessedScores();
  const podium = processedData.slice(0, 3);
  const others = processedData; // We'll handle the list in the central panel

  // Find current user's performance
  const userPerformance = processedData.find(p => p.id === currentUser?.uid) || {
    totalPoints: 0,
    tasksCompleted: 0,
    rank: '-'
  };
  const userRank = processedData.findIndex(p => p.id === currentUser?.uid) + 1;

  // Global metrics
  const globalTotalPoints = processedData.reduce((acc, p) => acc + p.totalPoints, 0);
  const globalTasksCompleted = processedData.reduce((acc, p) => acc + p.tasksCompleted, 0);

  if (loading || configLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: '60vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--color-primary)" />
      </div>
    );
  }

  return (
    <div className="performance-container animate-fade-in" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Desempeño Elite</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Análisis de operatividad y efectividad territorial</p>
        </div>
        <div className="flex gap-2">
          <div className="glass-panel flex p-1" style={{ borderRadius: '12px' }}>
            <button className={`btn-sm ${timeFilter === 'total' ? 'active' : ''}`} onClick={() => setTimeFilter('total')}>Historico</button>
            <button className={`btn-sm ${timeFilter === 'monthly' ? 'active' : ''}`} onClick={() => setTimeFilter('monthly')}>Mes</button>
          </div>
        </div>
      </div>

      <div className="performance-dashboard-layout">
        {/* PANEL 1: MI ESTATUS (IZQUIERDA) */}
        <aside className="glass-panel-aside animate-slide-right">
          <div className="panel-section-title"><User size={14} /> Mi Estatus</div>
          
          <div className="user-glory-card">
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifycontent: 'center', background: 'rgba(128,0,32,0.1)', fontSize: '2rem', fontWeight: 800 }}>
                {currentUser?.displayName?.charAt(0) || 'U'}
              </div>
              <div style={{ position: 'absolute', bottom: -5, right: -5, width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-surface-elevated)', border: '2px solid var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.8rem' }}>
                #{userRank || '-'}
              </div>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{currentUser?.displayName || 'Usuario'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{currentUser?.role || 'Brigadista'}</div>
            
            <div className="user-glory-points">{userPerformance.totalPoints.toLocaleString()}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Puntos Acumulados</div>
          </div>

          <div style={{ marginTop: '1.5rem', flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-section-title"><Award size={14} /> Mis Galardones</div>
            <div className="scrollable-content">
              <div className="medal-grid-mini">
                {awardedMedals.filter(m => m.userId === currentUser?.uid).length === 0 && (
                  <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    Sigue operando para ganar medallas.
                  </div>
                )}
                {awardedMedals.filter(m => m.userId === currentUser?.uid).map((aw, i) => {
                  const mType = medalTypes.find(mt => mt.id === aw.medalId);
                  return (
                    <div key={i} className="medal-bubble-mini" title={`${mType?.name || 'Medalla'}: ${aw.reason}`}>
                      <div style={{ color: mType?.color || 'gray' }}>
                        <MedalIcon iconName={mType?.icon} size={20} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* PANEL 2: RANKING (CENTRO) */}
        <main className="main-leaderboard-panel animate-slide-up">
          <div className="flex gap-4" style={{ marginBottom: '1.25rem' }}>
            <button onClick={() => setActiveTab('individual')} className={`tab-button ${activeTab === 'individual' ? 'active' : ''}`}>
              OPERADORES
            </button>
            <button onClick={() => setActiveTab('brigades')} className={`tab-button ${activeTab === 'brigades' ? 'active' : ''}`}>
              BRIGADAS
            </button>
          </div>

          <div className="scrollable-content card glass-panel" style={{ padding: '1rem', border: 'none' }}>
            {activeTab === 'individual' ? (
              <>
                <div className="podium-compact">
                  {podium.map((p, i) => (
                    <div key={p.id} className={`podium-slot p-slot-${i+1}`}>
                      <div className="podium-avatar-mini">
                        <User size={i === 0 ? 32 : 24} />
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem' }}>{p.name.split(' ')[0]}</div>
                      <div style={{ color: 'var(--color-primary-light)', fontWeight: 900 }}>{p.totalPoints.toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                <div className="leaderboard-list">
                  {processedData.map((performer, idx) => (
                    <div key={performer.id} className="ranking-item flex items-center justify-between" style={{ padding: '0.8rem 1rem', borderRadius: '12px', marginBottom: '0.5rem', background: performer.id === currentUser?.uid ? 'rgba(128,0,32,0.1)' : 'transparent' }}>
                      <div className="flex items-center gap-4">
                        <span style={{ width: '24px', fontWeight: 900, opacity: 0.5 }}>{idx + 1}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{performer.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{performer.role}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{performer.totalPoints.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 'normal' }}>pts</span></div>
                        {currentUser?.role === ROLES.SUPER_ADMIN && (
                          <button className="btn-icon" style={{ padding: '5px', borderRadius: '8px' }} onClick={() => setShowAwardModal(performer)}>
                            <Award size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                {brigades.map((brigade, index) => (
                  <div key={brigade.id} className="glass-metric flex justify-between items-center" style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(255,255,255,0.03)' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{brigade.name}</h3>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{brigade.members} miembros registrados</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-primary-light)' }}>{Math.round(brigade.score).toLocaleString()}</div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Puntos Totales</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* PANEL 3: ANALITICA / TOOLS (DERECHA) */}
        <aside className="glass-panel-aside animate-slide-left">
          <div className="panel-section-title"><TrendingUp size={14} /> Analítica Global</div>
          
          <div className="global-metric">
            <h4>Puntuación Estructura</h4>
            <div className="global-metric-val">{globalTotalPoints.toLocaleString()}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--status-success)' }}>+12% vs mes anterior</div>
          </div>

          <div className="global-metric">
            <h4>Tareas Completadas</h4>
            <div className="global-metric-val">{globalTasksCompleted.toLocaleString()}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--status-warning)' }}>Meta: 5,000</div>
          </div>

          {isAdmin ? (
            <div className="card glass-panel animate-slide-left" style={{ marginTop: '1.5rem', padding: '1.25rem', border: '1px solid rgba(16, 185, 129, 0.2)', animationDelay: '0.2s' }}>
              <div className="panel-section-title" style={{ color: 'var(--color-success-light)', marginBottom: '1rem' }}>
                <Download size={14} /> Gestión de Datos
              </div>
              <div className="flex-col gap-2">
                <button className="btn-export-perf" onClick={handleExportIndividual}>
                  <User size={14} /> 
                  <span>Ranking Operadores</span>
                </button>
                <button className="btn-export-perf" onClick={handleExportBrigades}>
                  <Users size={14} /> 
                  <span>Ranking Brigadas</span>
                </button>
              </div>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.75rem', lineHeight: '1.4' }}>
                * La exportación incluye datos de contacto (Email/Tel) y territorio asignado.
              </p>
            </div>
          ) : (
            <div className="card glass-panel" style={{ marginTop: '1.5rem', padding: '1rem', opacity: 0.6 }}>
               <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', margin: 0 }}>
                Acceso a reportes detallados reservado para administración.
              </p>
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: '2rem' }}>
            <button 
              className="btn flex items-center justify-center gap-2" 
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }}
              onClick={() => setShowCatalogModal(true)}
            >
              <Settings size={16} /> Configurar Sistema
            </button>
          </div>
        </aside>
      </div>

      {/* Recue existing modals logic */}
      {showAwardModal && (
        <div className="modal-overlay" style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.85)', 
          zIndex: 2000, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'flex-start',
          padding: '4rem 1rem',
          overflowY: 'auto',
          backdropFilter: 'blur(8px)' 
        }}>
          <div className="card glass-panel modal-standard-tall animate-scale-in" style={{ 
            width: '100%', 
            maxWidth: '500px', 
            padding: '2.5rem', 
            position: 'relative',
            margin: 'auto 0'
          }}>
            <button 
              onClick={() => setShowAwardModal(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
            >
              <X size={20} />
            </button>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Award color="var(--color-primary)" />
              Condecorar a {showAwardModal.name.split(' ')[0]}
            </h2>
            
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Selecciona Medalla:</label>
            <div className="flex-col gap-2" style={{ marginBottom: '1.5rem', maxHeight: '200px', overflowY: 'auto' }}>
              {medalTypes.length === 0 && (
                <p style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--status-warning)' }}>
                  No hay medallas en el catálogo. Configúralas primero.
                </p>
              )}
              {medalTypes.map(m => (
                <button 
                  key={m.id}
                  onClick={() => setSelectedMedalId(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', borderRadius: '12px', border: selectedMedalId === m.id ? '2px solid var(--color-primary)' : '1px solid var(--border-color)', backgroundColor: selectedMedalId === m.id ? 'rgba(128,0,32,0.1)' : 'transparent', width: '100%', textAlign: 'left'
                  }}
                >
                  <div style={{ color: m.color }}>
                    <MedalIcon iconName={m.icon} size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{m.description}</div>
                  </div>
                </button>
              ))}
            </div>

            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Motivo:</label>
            <textarea 
              value={medalReason}
              onChange={(e) => setMedalReason(e.target.value)}
              placeholder="Ej. Por su gran entrega en la asamblea..."
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', color: 'white', marginBottom: '1.5rem', height: '80px' }}
            />

            <div className="flex gap-2">
              <button className="btn" style={{ flex: 1 }} onClick={() => setShowAwardModal(null)}>Cancelar</button>
              <button 
                className="btn btn-primary" 
                style={{ flex: 1.5 }}
                disabled={!selectedMedalId}
                onClick={async () => {
                  await awardMedal(showAwardModal.id, selectedMedalId, medalReason);
                  setShowAwardModal(null);
                  setMedalReason("");
                  setSelectedMedalId("");
                }}
              >
                Entregar Medalla
              </button>
            </div>
          </div>
        </div>
      )}

      {showCatalogModal && (
        <div className="modal-overlay" style={{ 
          position: 'fixed', 
          inset: 0, 
          backgroundColor: 'rgba(0,0,0,0.85)', 
          zIndex: 2000, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'flex-start',
          padding: '4rem 1rem',
          overflowY: 'auto',
          backdropFilter: 'blur(8px)' 
        }}>
          <div className="card glass-panel modal-majestic animate-scale-in" style={{ 
            width: '95%', 
            maxWidth: '850px', 
            height: '85vh', 
            padding: '4rem', 
            position: 'relative',
            margin: 'auto 0',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 0 40px rgba(128, 0, 32, 0.3)' 
          }}>
            <button 
              onClick={() => setShowCatalogModal(false)}
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
            >
              <X size={24} />
            </button>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings color="var(--color-primary)" />
                Catálogo de Medallas
              </h2>
            </div>

            <div className="medal-list-container">
              {medalTypes.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                  <Award size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                  <p>Aún no hay medallas configuradas.</p>
                </div>
              )}
              {medalTypes.map(m => (
                <div key={m.id} className="medal-item-premium flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div style={{ color: m.color, filter: 'drop-shadow(0 0 8px currentColor)' }}>
                      <MedalIcon iconName={m.icon} size={24} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{m.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{m.icon} • {m.color}</div>
                    </div>
                  </div>
                  <button 
                    className="btn-icon" 
                    onClick={() => deleteMedalType(m.id)}
                  >
                    <Trash2 size={18} color="var(--status-error)" />
                  </button>
                </div>
              ))}
            </div>

            <div className="card" style={{ border: '1px dashed var(--color-primary)', backgroundColor: 'rgba(128,0,32,0.05)', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Nueva Medalla</h3>
              <div className="flex-col gap-3">
                <input 
                  type="text" 
                  placeholder="Nombre de la medalla"
                  value={newMedal.name}
                  onChange={(e) => setNewMedal({...newMedal, name: e.target.value})}
                  className="card" style={{ backgroundColor: 'transparent', width: '100%' }}
                />
                <div className="flex gap-2">
                  <select 
                    value={newMedal.icon}
                    onChange={(e) => setNewMedal({...newMedal, icon: e.target.value})}
                    style={{ flex: 1, padding: '0.5rem', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'white' }}
                  >
                    <option value="Award">Award</option>
                    <option value="Star">Star</option>
                    <option value="Zap">Zap</option>
                    <option value="Shield">Shield</option>
                    <option value="Trophy">Trophy</option>
                    <option value="Target">Target</option>
                    <option value="Heart">Heart</option>
                    <option value="Flag">Flag</option>
                  </select>
                  <input 
                    type="color" 
                    value={newMedal.color}
                    onChange={(e) => setNewMedal({...newMedal, color: e.target.value})}
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px' }}
                  />
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (newMedal.name) {
                      addMedalType(newMedal);
                      setNewMedal({ name: '', icon: 'Award', color: '#800020' });
                    }
                  }}
                >
                  <Plus size={18} /> Agregar al Catálogo
                </button>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '3rem', textAlign: 'right' }}>
              <button className="btn" style={{ padding: '0.8rem 2rem' }} onClick={() => setShowCatalogModal(false)}>Cerrar Panel de Control</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to render icon by name
function MedalIcon({ iconName, size = 18 }) {
  switch (iconName) {
    case 'Award': return <Award size={size} />;
    case 'Star': return <Star size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Shield': return <Shield size={size} />;
    case 'Trophy': return <Trophy size={size} />;
    case 'Target': return <Target size={size} />;
    case 'Heart': return <Heart size={size} />;
    case 'Flag': return <Plus size={size} />; // Placeholder or real Flag
    default: return <Award size={size} />;
  }
}

