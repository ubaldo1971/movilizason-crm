import { useState, useEffect } from 'react';
import { 
  Trophy, Medal, Star, Target, Users, TrendingUp, 
  BarChart, CheckCircle2, ChevronRight, Award, Zap,
  Search, Filter, Download, X
} from 'lucide-react';
import { useRole, ROLES, formatName } from '../context/RoleContext';
import { collection, onSnapshot, query, orderBy, limit } from '../lib/dbService';
import { db } from '../firebaseConfig';

export default function Incentives() {
  const { allUsers, currentUser, role } = useRole();
  const [view, setView] = useState('individual'); // 'individual', 'territorial', 'brigade'
  const [brigades, setBrigades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrigade, setSelectedBrigade] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'brigades'), orderBy('totalScore', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          efficiency: d.tasksAssigned ? (d.tasksCompleted / d.tasksAssigned) * 100 : 0
        };
      });
      setBrigades(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Process data for Individual Rankings
  const individualRankings = [...allUsers]
    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
    .slice(0, 50)
    .map((u, idx) => ({
      ...u,
      rank: idx + 1,
      isMe: u.uid === currentUser?.uid
    }));

  // Process data for Territorial (Districts)
  const districtsMap = {};
  allUsers.forEach(u => {
    const dist = u.distFederal || 'Sin Asignar';
    if (!districtsMap[dist]) {
      districtsMap[dist] = { name: `Distrito Federal ${dist}`, points: 0, users: 0 };
    }
    districtsMap[dist].points += (u.totalPoints || 0);
    districtsMap[dist].users += 1;
  });

  const territorialRankings = Object.values(districtsMap)
    .sort((a, b) => b.points - a.points)
    .map((d, idx) => ({ ...d, rank: idx + 1 }));

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '5rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header section with Stats */}
      <div className="flex flex-wrap items-end justify-between gap-6" style={{ marginBottom: '2.5rem' }}>
        <div className="flex items-center gap-4">
          <div style={{ 
            padding: '1rem', 
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', 
            borderRadius: '20px',
            boxShadow: '0 8px 16px rgba(128, 0, 32, 0.2)'
          }}>
             <Trophy color="white" size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Incentivos y Galardones</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', marginTop: '0.25rem' }}>Ecosistema de Reconocimiento al Desempeño Elite</p>
          </div>
        </div>

        <div className="flex gap-4">
           <div className="glass-panel text-center" style={{ padding: '0.75rem 1.5rem', borderRadius: '16px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Mis Puntos</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>{(currentUser?.totalPoints || 0).toLocaleString()}</div>
           </div>
           <div className="glass-panel text-center" style={{ padding: '0.75rem 1.5rem', borderRadius: '16px' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Mi Rango</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>#{individualRankings.findIndex(r => r.isMe) + 1 || '-'}</div>
           </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tab-navigation-container" style={{ marginBottom: '2rem' }}>
        <div className="flex p-1.5" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '18px', width: 'fit-content' }}>
          <button 
            className={`tab-btn-premium ${view === 'individual' ? 'active' : ''}`}
            onClick={() => setView('individual')}
          >
            <Star size={18} /> Ranking Individual
          </button>
          <button 
            className={`tab-btn-premium ${view === 'territorial' ? 'active' : ''}`}
            onClick={() => setView('territorial')}
          >
            <TrendingUp size={18} /> Estructura Territorial
          </button>
          <button 
            className={`tab-btn-premium ${view === 'brigade' ? 'active' : ''}`}
            onClick={() => setView('brigade')}
          >
            <Users size={18} /> Evaluación de Brigada
          </button>
        </div>
      </div>

      <div className="content-area animate-slide-up">
        {view === 'individual' && (
          <div className="card glass-panel no-padding overflow-hidden">
            <div className="table-header-custom" style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 100px' }}>
              <span>Rank</span>
              <span>Brigadista / Operador</span>
              <span style={{ textAlign: 'center' }}>Puntos</span>
              <span style={{ textAlign: 'center' }}>Efectividad</span>
              <span style={{ textAlign: 'center' }}>Status</span>
            </div>
            
            <div className="table-body">
              {individualRankings.map(u => (
                <div key={u.uid} className={`table-row-custom ${u.isMe ? 'is-self' : ''}`} style={{ display: 'grid', gridTemplateColumns: '80px 2fr 1fr 1fr 100px' }}>
                  <div className="rank-cell">
                    <span className={`rank-badge rank-${u.rank <= 3 ? u.rank : 'default'}`}>#{u.rank}</span>
                  </div>
                  <div className="user-info-cell">
                    <div className="flex items-center gap-3">
                      <div className="avatar-mini" style={{ background: u.isMe ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)' }}>
                        {u.displayName?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <h4 className="flex items-center gap-2" style={{ margin: 0 }}>
                           {formatName(u)} {u.isMe && <span className="badge-me">TÚ</span>}
                        </h4>
                        <span className="zone-info">{u.role || 'Operador'} • Seccional {u.section || '---'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="points-cell" style={{ textAlign: 'center', fontWeight: '800' }}>
                    {(u.totalPoints || 0).toLocaleString()}
                  </div>
                  <div className="stats-cell" style={{ textAlign: 'center' }}>
                     <div className="mini-progress-bar">
                        <div className="fill" style={{ width: `${Math.min(100, (u.tasksCompleted || 0) * 1.5)}%`, backgroundColor: 'var(--color-primary)' }}></div>
                     </div>
                     <span style={{ fontSize: '0.7rem' }}>{u.tasksCompleted || 0} tareas</span>
                  </div>
                  <div className="status-cell" style={{ textAlign: 'center' }}>
                     {u.rank <= 5 ? <Award size={20} color="#FFD700" /> : <CheckCircle2 size={18} style={{ opacity: 0.3 }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'territorial' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {territorialRankings.map(d => (
              <div key={d.name} className="card glass-panel hover-grow" style={{ padding: '2rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '5rem', fontWeight: 900, opacity: 0.05, color: 'var(--color-primary)' }}>
                  {d.rank}
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{d.name}</h3>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{d.users} operadores activos</span>
                </div>
                
                <div className="flex justify-between items-end">
                   <div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Puntaje Acumulado</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--color-primary-light)' }}>{d.points.toLocaleString()}</div>
                   </div>
                   <div style={{ padding: '8px', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '8px', color: '#34d399' }}>
                      <TrendingUp size={24} />
                   </div>
                </div>

                <div style={{ marginTop: '1.5rem', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                   <div style={{ height: '100%', width: `${Math.min(100, (d.points / (territorialRankings[0]?.points || 1)) * 100)}%`, background: 'var(--color-primary)', borderRadius: '2px' }}></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {view === 'brigade' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center glass-panel p-4 rounded-xl mb-4" style={{ border: 'none', background: 'rgba(255,255,255,0.02)' }}>
               <div>
                  <h3 style={{ margin: 0 }}>Evaluación Operativa por Equipo</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Métricas de eficiencia y cumplimiento por brigada</p>
               </div>
               <button className="btn-icon">
                  <Download size={20} />
               </button>
            </div>

            <div className="grid gap-4">
              {brigades.map(b => (
                <div key={b.id} className="card glass-panel brigade-eval-card" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 80px', alignItems: 'center', padding: '1.5rem 2rem' }}>
                   <div>
                      <div className="flex items-center gap-3">
                         <div style={{ padding: '10px', background: 'rgba(128, 0, 32, 0.1)', borderRadius: '12px', color: 'var(--color-primary)' }}>
                            <Users size={20} />
                         </div>
                         <div>
                            <h4 style={{ margin: 0 }}>{b.name}</h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{b.memberCount || 0} integrantes</span>
                         </div>
                      </div>
                   </div>
                   
                   <div className="text-center">
                      <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{Math.round(b.totalScore || 0).toLocaleString()}</div>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Puntos</div>
                   </div>

                   <div className="text-center">
                      <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{b.tasksCompleted || 0}</div>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tareas OK</div>
                   </div>

                   <div className="text-center">
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: b.efficiency > 80 ? 'var(--status-success)' : 'var(--status-warning)' }}>
                        {Math.round(b.efficiency)}%
                      </div>
                      <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Eficiencia</div>
                   </div>

                    <div className="flex justify-end">
                      <button className="btn-go" onClick={() => setSelectedBrigade(b)}>
                         <ChevronRight size={18} />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Brigade Detail Modal */}
      {selectedBrigade && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 1000 }}>
          <div className="card glass-panel modal-content animate-slide-up" style={{ maxWidth: '800px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
              <div className="flex items-center gap-4">
                <div style={{ padding: '0.75rem', background: 'var(--color-primary-dim)', borderRadius: '12px', color: 'var(--color-primary)' }}>
                  <Users size={28} />
                </div>
                <div>
                  <h2 style={{ margin: 0 }}>{selectedBrigade.name}</h2>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Evaluación Detallada de Desempeño</p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedBrigade(null)}>
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Puntaje Total', val: Math.round(selectedBrigade.totalScore || 0), icon: <Trophy size={16} /> },
                { label: 'Tareas Realizadas', val: selectedBrigade.tasksCompleted || 0, icon: <CheckCircle2 size={16} /> },
                { label: 'Eficiencia Global', val: `${Math.round(selectedBrigade.efficiency || 0)}%`, icon: <Target size={16} /> },
                { label: 'Integrantes', val: selectedBrigade.memberCount || 0, icon: <Users size={16} /> }
              ].map(stat => (
                <div key={stat.label} className="p-4 bg-app rounded-2xl border border-border-dim text-center">
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    {stat.icon} {stat.label}
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{stat.val}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Category Breakdown */}
              <div className="flex-col gap-4">
                <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BarChart size={18} color="var(--color-primary)" /> Desglose por Categoría
                </h3>
                <div className="flex-col gap-3">
                  {[
                    { id: 'brigadas', label: 'Trabajo de Brigada', color: '#ef4444' },
                    { id: 'formacion', label: 'Formación Política', color: '#3b82f6' },
                    { id: 'promocion', label: 'Promoción del Voto', color: '#10b981' },
                    { id: 'defensa', label: 'Defensa Electoral', color: '#f59e0b' }
                  ].map(cat => {
                    const points = selectedBrigade.pointsByTask?.[cat.id] || 0;
                    const maxPoints = selectedBrigade.totalScore || 1;
                    const pct = (points / maxPoints) * 100;
                    return (
                      <div key={cat.id} className="flex-col gap-1">
                        <div className="flex justify-between" style={{ fontSize: '0.8rem' }}>
                          <span>{cat.label}</span>
                          <span style={{ fontWeight: 700 }}>{points} pts</span>
                        </div>
                        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: cat.color, borderRadius: '4px' }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Members */}
              <div className="flex-col gap-4">
                <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Star size={18} color="var(--color-secondary)" /> Integrantes Destacados
                </h3>
                <div className="flex-col gap-2">
                  {(allUsers.filter(u => u.brigadeId === selectedBrigade.id || u.brigade === selectedBrigade.name) || [])
                    .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
                    .slice(0, 5)
                    .map((member, idx) => (
                      <div key={member.uid} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>{idx + 1}</span>
                          <div className="avatar-mini" style={{ width: '32px', height: '32px', fontSize: '0.7rem' }}>
                            {member.displayName?.charAt(0)}
                          </div>
                          <span style={{ fontSize: '0.85rem' }}>{formatName(member)}</span>
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                          {(member.totalPoints || 0).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  {allUsers.filter(u => u.brigadeId === selectedBrigade.id || u.brigade === selectedBrigade.name).length === 0 && (
                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No hay integrantes registrados en esta brigada.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {currentUser.role === ROLES.SUPER_ADMIN && (
              <div className="mt-8 pt-8 border-t border-white/5">
                <button className="btn primary w-full" style={{ height: '50px' }}>
                  <Award size={18} /> Emitir Reconocimiento Grupal
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .tab-btn-premium {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          border-radius: 14px;
          border: none;
          background: transparent;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .tab-btn-premium:hover {
          color: white;
          background: rgba(255,255,255,0.02);
        }
        .tab-btn-premium.active {
          background: var(--color-primary);
          color: white;
          box-shadow: 0 4px 12px rgba(128, 0, 32, 0.3);
        }
        .table-header-custom {
          padding: 1.25rem 2rem;
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid var(--border-color);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .table-row-custom {
          padding: 1.25rem 2rem;
          border-bottom: 1px solid var(--border-color);
          align-items: center;
          transition: background 0.2s;
        }
        .table-row-custom:hover {
          background: rgba(255,255,255,0.01);
        }
        .table-row-custom.is-self {
          background: rgba(128, 0, 32, 0.05);
          border-left: 3px solid var(--color-primary);
        }
        .rank-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 0.9rem;
        }
        .rank-1 { background: linear-gradient(135deg, #FFD700, #DAA520); color: #000; }
        .rank-2 { background: linear-gradient(135deg, #C0C0C0, #808080); color: #000; }
        .rank-3 { background: linear-gradient(135deg, #CD7F32, #8B4513); color: #fff; }
        .rank-default { color: var(--text-secondary); border: 1px solid var(--border-color); }
        
        .avatar-mini {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
        }
        .badge-me {
          background: var(--color-primary);
          color: white;
          padding: 2px 8px;
          border-radius: 6px;
          font-size: 0.6rem;
          font-weight: 800;
        }
        .zone-info {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .mini-progress-bar {
          width: 80px;
          height: 6px;
          background: rgba(255,255,255,0.05);
          border-radius: 3px;
          margin: 0 auto 4px;
          overflow: hidden;
        }
        .mini-progress-bar .fill {
          height: 100%;
          transition: width 0.5s ease-out;
        }
        .hover-grow:hover {
          transform: translateY(-5px);
          border-color: var(--color-primary);
        }
        .btn-go {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          transition: all 0.2s;
        }
        .btn-go:hover {
          background: var(--color-primary);
          color: white;
          border-color: var(--color-primary);
        }
        .brigade-eval-card:hover {
           border-color: rgba(128,0,32,0.3);
           background: rgba(128,0,32,0.02);
        }
      `}</style>
    </div>
  );
}
