import { useState } from 'react';
import { Trophy, Medal, Star, Target } from 'lucide-react';

export default function Incentives() {
  const [view, setView] = useState('individual'); // 'individual' or 'team'

  const individualLeaderboard = [
    { rank: 1, name: 'Ana Martínez', points: '12,450', tasks: 145, zone: 'Centro' },
    { rank: 2, name: 'Carlos Jiménez', points: '11,200', tasks: 120, zone: 'Norte' },
    { rank: 3, name: 'Luisa Fernanda', points: '10,800', tasks: 112, zone: 'Sur' },
    { rank: 4, name: 'Tú', points: '8,400', tasks: 85, zone: 'Centro', isMe: true },
    { rank: 5, name: 'Pedro Páramo', points: '7,100', tasks: 70, zone: 'Norte' },
  ];

  const teamLeaderboard = [
    { rank: 1, name: 'Distrito 4', points: '145K', coverage: '98%' },
    { rank: 2, name: 'Distrito 2', points: '132K', coverage: '90%' },
    { rank: 3, name: 'Distrito 5', points: '98K', coverage: '75%' },
    { rank: 4, name: 'Distrito 1', points: '88K', coverage: '70%' },
  ];

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '3rem', maxWidth: '800px', margin: '0 auto' }}>
      
      <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
        <div className="flex items-center gap-3">
          <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-secondary)', borderRadius: 'var(--radius-md)' }}>
             <Trophy color="white" size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Ranking y Metas</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Evaluación de desempeño operativo</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2" style={{ marginBottom: '1.5rem', backgroundColor: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
        <button 
          className="btn" 
          style={{ flex: 1, backgroundColor: view === 'individual' ? 'var(--color-primary)' : 'transparent', color: view === 'individual' ? 'white' : 'var(--text-secondary)', border: 'none' }}
          onClick={() => setView('individual')}
        >
          Desempeño Individual
        </button>
        <button 
          className="btn" 
          style={{ flex: 1, backgroundColor: view === 'team' ? 'var(--color-primary)' : 'transparent', color: view === 'team' ? 'white' : 'var(--text-secondary)', border: 'none' }}
          onClick={() => setView('team')}
        >
          Desempeño por Equipo (Distrito)
        </button>
      </div>

      <div className="card glass-panel flex-col gap-4" style={{ padding: '0', overflow: 'hidden' }}>
        {view === 'individual' ? (
          <div>
            <div style={{ padding: '1rem 1.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '50px 2fr 1fr 1fr', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              <span>Rank</span>
              <span>Brigadista</span>
              <span style={{ textAlign: 'right' }}>Puntos</span>
              <span style={{ textAlign: 'right' }}>Tareas</span>
            </div>
            
            <div className="flex-col">
              {individualLeaderboard.map(u => (
                <div key={u.rank} style={{ 
                  padding: '1rem 1.5rem', 
                  borderBottom: '1px solid var(--border-color)', 
                  display: 'grid', 
                  gridTemplateColumns: '50px 2fr 1fr 1fr', 
                  alignItems: 'center',
                  backgroundColor: u.isMe ? 'rgba(128, 0, 32, 0.1)' : 'transparent'
                }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: u.rank <= 3 ? 'var(--color-secondary)' : 'var(--text-secondary)' }}>
                    #{u.rank}
                  </div>
                  <div>
                    <h4 style={{ color: u.isMe ? 'var(--color-primary-light)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {u.name} {u.isMe && <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--color-primary)', color: 'white', padding: '2px 6px', borderRadius: '4px' }}>TÚ</span>}
                    </h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Zona: {u.zone}</span>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{u.points}</div>
                  <div style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{u.tasks} ✓</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ padding: '1rem 1.5rem', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '50px 2fr 1fr 1fr', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
              <span>Rank</span>
              <span>Distrito</span>
              <span style={{ textAlign: 'right' }}>Puntos Globales</span>
              <span style={{ textAlign: 'right' }}>Cobertura</span>
            </div>
            
            <div className="flex-col">
              {teamLeaderboard.map(t => (
                <div key={t.rank} style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'grid', gridTemplateColumns: '50px 2fr 1fr 1fr', alignItems: 'center' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: t.rank === 1 ? 'var(--status-warning)' : 'var(--text-secondary)' }}>
                    #{t.rank}
                  </div>
                  <div>
                    <h4 style={{ color: 'var(--text-primary)' }}>{t.name}</h4>
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>{t.points}</div>
                  <div style={{ textAlign: 'right', color: 'var(--status-success)', fontWeight: 'bold' }}>{t.coverage}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
