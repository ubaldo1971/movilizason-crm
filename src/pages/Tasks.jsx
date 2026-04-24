import { useState, useEffect, useMemo } from 'react';
import { useRole } from '../context/RoleContext';
import { usePermissions } from '../hooks/usePermissions';
import { getDocs, collection } from '../lib/dbService';
import { db } from '../firebaseConfig';
import { Plus, Clock, AlertCircle, CheckCircle2, ChevronRight, ChevronLeft, User, Calendar, X, Save, Search, UserPlus, Download } from 'lucide-react';
import TaskCompletionModal from '../components/TaskCompletionModal';
import { exportToCSV } from '../lib/exportService';

export default function Tasks() {
  const { tasks, addTask, updateTaskStatus, completeTask, role, ROLES, ROLE_COLORS, currentUser } = useRole();
  const { hasPermission } = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [completingTask, setCompletingTask] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [newTask, setNewTask] = useState({ title: '', role: ROLES.BRIGADISTA, dueDate: '' });

  const isAdmin = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN_ESTATAL;

  const handleExportTasks = () => {
    const headers = {
      title: 'Tarea / Actividad',
      assignee: 'Responsable',
      role: 'Rol Destino',
      statusLabel: 'Estado Actual',
      dueDate: 'Fecha Límite',
      completedLabel: 'Completada',
      completedAt: 'Fecha Finalización',
      pointsEarned: 'Puntos Otorgados'
    };

    const data = tasks.map(t => ({
      ...t,
      statusLabel: t.completed ? 'COMPLETADA' : (t.status || 'PENDIENTE'),
      completedLabel: t.completed ? 'SÍ' : 'NO',
      completedAt: t.completedAt ? new Date(t.completedAt).toLocaleString() : 'N/A'
    }));

    exportToCSV(data, 'Historial_Tareas_CRM', headers);
  };

  // Load all users for the search once
  useEffect(() => {
    async function loadUsers() {
      const usersSnap = await getDocs(collection(db, 'users'));
      setAllUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    }
    loadUsers();
  }, []);

  const canCreateTasks = hasPermission(role, 'tasks.create');

  // Hierarchical/Territorial Filtering Logic
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return [];
    
    const queryLower = searchQuery.toLowerCase();
    
    return allUsers.filter(u => {
      // Basic text search (Name, Surname, Section, Districts)
      const fullName = `${u.displayName || ''}${u.surname ? ' ' + u.surname : ''}`.toLowerCase();
      const nameMatch = fullName.includes(queryLower);
      const sectionMatch = u.section?.toLowerCase().includes(queryLower);
      const distFedMatch = u.distFederal?.toLowerCase().includes(queryLower);
      const distLocMatch = u.distLocal?.toLowerCase().includes(queryLower);
      
      const queryMatch = nameMatch || sectionMatch || distFedMatch || distLocMatch;
      if (!queryMatch) return false;

      // HIERARCHY CHECK:
      // Super Admin and Admin Estatal see everyone
      if (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN_ESTATAL) return true;

      // Coordinadores see those in their territory and lower hierarchy
      // (This is a simplified version, in a real env we'd check level distances)
      const roleOrder = Object.values(ROLES);
      const myRank = roleOrder.indexOf(role);
      const userRank = roleOrder.indexOf(u.role);
      
      const isSubordinate = userRank > myRank;
      
      // Territorial Match Check
      let territorialMatch = false;
      if (role === ROLES.COORD_SECCIONAL) {
        territorialMatch = u.section === currentUser.section;
      } else if (role === ROLES.COORD_DISTRITAL_LOC) {
        territorialMatch = u.distLocal === currentUser.distLocal;
      } else if (role === ROLES.COORD_DISTRITAL_FED) {
        territorialMatch = u.distFederal === currentUser.distFederal;
      }

      return isSubordinate && territorialMatch;
    });
  }, [allUsers, searchQuery, role, ROLES, currentUser]);

  const columns = [
    { id: 'PENDING', title: 'Pendientes', color: 'var(--status-error)', icon: AlertCircle },
    { id: 'IN_PROGRESS', title: 'En Proceso', color: 'var(--status-warning)', icon: Clock },
    { id: 'COMPLETED', title: 'Completadas', color: 'var(--status-success)', icon: CheckCircle2 }
  ];

  const getTasksByStatus = (statusId) => {
    let filtered = tasks;

    // Filter by user role/assignee if not admin
    if (!isAdmin) {
      filtered = tasks.filter(t => 
        t.assigneeId === currentUser?.uid || 
        (t.role === role && (!t.assigneeId || t.assigneeId === 'all'))
      );
    }

    if (statusId === 'COMPLETED') return filtered.filter(t => t.completed);
    return filtered.filter(t => !t.completed && (t.status === statusId || (!t.status && statusId === 'PENDING')));
  };

  const handleCreateTask = () => {
    if (!newTask.title || !selectedAssignee) return;
    addTask({
      title: newTask.title,
      role: selectedAssignee.role,
      assignee: `${selectedAssignee.displayName || ''}${selectedAssignee.surname ? ' ' + selectedAssignee.surname : ''}`,
      assigneeId: selectedAssignee.uid,
      dueDate: newTask.dueDate || 'Sin fecha',
    });
    setShowModal(false);
    setNewTask({ title: '', role: ROLES.BRIGADISTA, dueDate: '' });
    setSelectedAssignee(null);
    setSearchQuery('');
  };

  const moveTask = async (taskId, currentStatus, direction) => {
    const statusOrder = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextIndex = currentIndex + direction;
    
    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      const nextStatus = statusOrder[nextIndex];
      const task = tasks.find(t => t.id === taskId);
      
      if (nextStatus === 'COMPLETED') {
        // Security guard: only assignee or admin can complete
        if (!isAdmin && task.assigneeId !== currentUser.uid) {
          alert('Solo el responsable asignado puede finalizar esta tarea.');
          return;
        }
        setCompletingTask(task);
      } else {
        // Optimistic UI could be added here, but for now just await the update
        await updateTaskStatus(taskId, nextStatus);
      }
    }
  };

  const handleQuickComplete = (task) => {
    if (!isAdmin && task.assigneeId !== currentUser.uid) {
      alert('Solo el responsable asignado puede finalizar esta tarea.');
      return;
    }
    setCompletingTask(task);
  };

  return (
    <div className="animate-fade-in flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Gestión de Tareas Operativas</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Inteligencia electoral estatal</p>
        
        <div className="flex gap-3">
          {isAdmin && (
            <button 
              className="btn flex items-center gap-2" 
              style={{ background: 'var(--bg-surface-glass)', border: '1px solid var(--color-success-dim)', color: 'var(--color-success-light)' }}
              onClick={handleExportTasks}
              title="Exportar Historial Completo a CSV"
            >
              <Download size={18} />
              <span>Exportar</span>
            </button>
          )}
          {canCreateTasks && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} /> Nueva Tarea
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-6" style={{ flex: 1, overflowX: 'auto', paddingBottom: '1rem' }}>
        {columns.map((col) => {
          const columnTasks = getTasksByStatus(col.id);
          return (
            <div key={col.id} className="flex-col" style={{ minWidth: '320px', flex: 1 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '1rem' }}>
                <div className="flex items-center gap-2">
                  <col.icon size={20} color={col.color} />
                  <h3 style={{ fontSize: '1.125rem' }}>{col.title}</h3>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 600, backgroundColor: 'var(--bg-surface-elevated)', padding: '2px 8px', borderRadius: '10px' }}>
                  {columnTasks.length}
                </span>
              </div>

              <div className="flex-col gap-3" style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                {columnTasks.map(task => (
                  <div key={task.id} className="card" style={{ padding: '1.125rem', borderLeft: `4px solid ${ROLE_COLORS[task.role] || 'var(--color-primary)'}` }}>
                    <div className="flex justify-between" style={{ marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: ROLE_COLORS[task.role], backgroundColor: `${ROLE_COLORS[task.role]}15`, padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                        {task.role}
                      </span>
                      <div className="flex gap-1 items-center">
                        {col.id !== 'COMPLETED' && (
                          <button 
                            onClick={() => handleQuickComplete(task)}
                            className="btn btn-ghost" 
                            style={{ 
                              padding: '4px 8px', 
                              fontSize: '0.7rem', 
                              color: 'var(--color-success)', 
                              background: 'var(--color-success-dim)',
                              fontWeight: 700,
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginRight: '8px'
                            }}
                            title="Finalizar tarea ahora"
                          >
                            <CheckCircle2 size={12} />
                            <span>Finalizar</span>
                          </button>
                        )}
                        {col.id !== 'PENDING' && (
                          <button 
                            onClick={() => moveTask(task.id, col.id, -1)}
                            className="btn" 
                            style={{ padding: '2px', color: 'var(--text-muted)' }}
                            title="Mover a columna anterior"
                          >
                            <ChevronLeft size={16} />
                          </button>
                        )}
                        {col.id !== 'COMPLETED' && (
                          <button 
                            onClick={() => moveTask(task.id, col.id, 1)}
                            className="btn" 
                            style={{ padding: '2px', color: 'var(--text-muted)' }}
                            title="Mover a siguiente columna"
                          >
                            <ChevronRight size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 600 }}>{task.title}</h4>
                    
                    <div className="flex-col gap-2" style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-muted" />
                        <span>{task.assignee?.replace(' undefined', '')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-muted" />
                        <span>Vence: {task.dueDate}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {columnTasks.length === 0 && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', fontSize: '0.875rem' }}>
                    Sin tareas {col.title.toLowerCase()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Modal */}
      {completingTask && (
        <TaskCompletionModal 
          task={completingTask} 
          onConfirm={(completionData) => {
            completeTask(completingTask.id, completionData);
            setCompletingTask(null);
          }} 
          onCancel={() => setCompletingTask(null)} 
        />
      )}

      {/* New Task Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="flex justify-between items-center">
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Nueva Tarea Operativa</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Título de la tarea</label>
              <input 
                type="text" 
                className="input" 
                placeholder="Ej. Supervisión de brigada en Seccional..." 
                value={newTask.title} 
                onChange={(e) => setNewTask({...newTask, title: e.target.value})} 
                autoFocus 
              />
            </div>
            
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Buscador de Personas / Grupos</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    className="input" 
                    style={{ paddingLeft: '2.5rem' }}
                    placeholder="Buscar por nombre, seccional, distrito..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                {searchQuery && filteredUsers.length > 0 && !selectedAssignee && (
                  <div className="card" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, marginTop: '4px', maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}>
                    {filteredUsers.map(u => (
                      <div 
                        key={u.uid} 
                        className="flex items-center justify-between" 
                        style={{ padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s' }}
                        onClick={() => {
                          setSelectedAssignee(u);
                          setSearchQuery('');
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="flex-col">
                          <span style={{ fontWeight: 600 }}>{u.displayName}{u.surname ? ' ' + u.surname : ''}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.role} • Seccional {u.section}</span>
                        </div>
                        <UserPlus size={16} className="text-primary" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedAssignee && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'between', backgroundColor: 'var(--bg-surface-elevated)', padding: '0.75rem 1rem', borderRadius: '12px', border: `1px solid ${ROLE_COLORS[selectedAssignee.role]}30` }}>
                  <div className="flex items-center gap-3">
                    <div style={{ padding: '8px', backgroundColor: `${ROLE_COLORS[selectedAssignee.role]}20`, borderRadius: '50%', color: ROLE_COLORS[selectedAssignee.role] }}>
                      <User size={20} />
                    </div>
                    <div className="flex-col">
                      <span style={{ fontWeight: 700 }}>{selectedAssignee.displayName}{selectedAssignee.surname ? ' ' + selectedAssignee.surname : ''}</span>
                      <span style={{ fontSize: '0.7rem', color: ROLE_COLORS[selectedAssignee.role], textTransform: 'uppercase', fontWeight: 800 }}>{selectedAssignee.role}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedAssignee(null)} 
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Fecha de Vencimiento</label>
              <input 
                type="date" 
                className="input" 
                value={newTask.dueDate} 
                onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})} 
              />
            </div>

            <div className="flex justify-end gap-3" style={{ marginTop: '0.5rem' }}>
              <button className="btn" onClick={() => setShowModal(false)} style={{ color: 'var(--text-secondary)' }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleCreateTask} disabled={!newTask.title || !selectedAssignee}>
                <Save size={16} /> Guardar Tarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

