import { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import { Users, MapPin, CheckCircle, TrendingUp, AlertCircle, Plus, Trash2, Edit2, Calendar, User, Camera, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, deleteDoc, doc, ref, uploadBytes, getDownloadURL } from '../lib/dbService';
import { db, storage } from '../firebaseConfig';

export default function Dashboard() {
  const { role, ROLES, ROLE_COLORS, tasks, completeTask, addTask, requirePinForTasks, VALID_PINS, currentUser, verifyPin, reports } = useRole();
  const navigate = useNavigate();

  const [activities, setActivities] = useState([]);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState('PENDING');

  // Custom Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskData, setNewTaskData] = useState({ title: '', role: ROLES.BRIGADISTA, dueDate: '', assigneeId: '', assigneeName: '' });
  const [userSearch, setUserSearch] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUserResults, setFilteredUserResults] = useState([]);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [taskToDelegate, setTaskToDelegate] = useState(null);
  const [delegationData, setDelegationData] = useState({ localDistId: '', assigneeId: '', assigneeName: '', notes: '' });

  // Calculated state
  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const displayedTasks = activeTab === 'PENDING' ? pendingTasks : completedTasks;

  const numTotalTasks = tasks.length;
  const numCompletedTasks = completedTasks.length;
  const percentageTasks = numTotalTasks > 0 ? Math.round((numCompletedTasks / numTotalTasks) * 100) : 0;

  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const isTaskLate = (dueDate, completedAt) => {
    if (!dueDate || !completedAt || dueDate === 'Sin fecha') return false;
    try {
      const due = new Date(dueDate);
      const compl = new Date(completedAt);
      return compl > due;
    } catch (e) {
      return false;
    }
  };

  const handleDeleteActivity = async (id) => {
    try {
      await deleteDoc(doc(db, 'actividad', id));
    } catch (e) {
      console.error('Error deleting activity:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubActivities = onSnapshot(collection(db, 'actividad'), (snapshot) => {
      const data = snapshot.docs.map(d => {
        const item = d.data();
        let timeLabel = 'Reciente';
        if (item.timestamp) {
           const date = new Date(item.timestamp);
           timeLabel = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        let text = item.text || 'Actividad registrada';
        if (item.type === 'TASK_COMPLETED') {
           text = `Completó tarea: "${item.taskTitle}"`;
        }

        return {
          id: d.id,
          text: text,
          author: item.closedByName || item.assigneeName || 'Usuario',
          time: timeLabel,
          ...item
        };
      }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setActivities(data.slice(0, 5));
    });

    return () => {
      unsubscribe();
      unsubActivities();
    };
  }, []);

  useEffect(() => {
    if (userSearch.length > 1) {
      const results = allUsers.filter(u => 
        (u.displayName || '').toLowerCase().includes(userSearch.toLowerCase()) || 
        (u.surname || '').toLowerCase().includes(userSearch.toLowerCase()) ||
        (u.folio || '').includes(userSearch)
      ).slice(0, 5);
      setFilteredUserResults(results);
    } else {
      setFilteredUserResults([]);
    }

  }, [userSearch, allUsers]);

  const getAllowedRolesToAssign = (currentRole) => {
    switch(currentRole) {
      case ROLES.SUPER_ADMIN:
      case ROLES.ADMIN_ESTATAL:
        return [ROLES.ADMIN_ESTATAL, ROLES.COORD_DISTRITAL_FED, ROLES.COORD_DISTRITAL_LOC, ROLES.COORD_SECCIONAL, ROLES.BRIGADISTA];
      case ROLES.COORD_DISTRITAL_FED:
      case ROLES.COORD_DISTRITAL_LOC:
        return [ROLES.COORD_SECCIONAL, ROLES.BRIGADISTA];
      case ROLES.COORD_SECCIONAL:
        return [ROLES.BRIGADISTA];
      case ROLES.BRIGADISTA:
      default:
        return [ROLES.BRIGADISTA];
    }
  };
  const assignableRoles = getAllowedRolesToAssign(role);

  // Audit Modal State
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState(null);
  const [auditData, setAuditData] = useState({ notes: '', status: 'SUCCESS', pin: '', photos: [] });
  const [pinError, setPinError] = useState('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  const openTaskModal = () => {
    const defaultRole = assignableRoles.length > 0 ? assignableRoles[0] : ROLES.BRIGADISTA;
    setNewTaskData({ title: '', role: defaultRole, dueDate: '', assigneeId: '', assigneeName: '' });
    setUserSearch('');
    setShowTaskModal(true);
  };

  const handleSaveTask = () => {
    if (!newTaskData.title) return;
    addTask({ 
      title: newTaskData.title, 
      assignee: newTaskData.assigneeName || `Equipo: ${newTaskData.role}`, 
      assigneeId: newTaskData.assigneeId || null,
      role: newTaskData.role, 
      dueDate: newTaskData.dueDate || 'Sin fecha' 
    });
    setShowTaskModal(false);
  };

  const handleOpenAudit = (task) => {
    if (task.completed) return; 
    setTaskToComplete(task);
    setAuditData({ notes: '', status: 'SUCCESS', pin: '', photos: [] });
    setPinError('');
    setShowAuditModal(true);
  };

  const handlePhotoSelection = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 5);
      setAuditData({ ...auditData, photos: files });
    }
  };

  const submitAudit = async () => {
    // 1. Validate PIN against the current operator
    if (requirePinForTasks) {
      // Try verifying against current user first, then against VALID_PINS list
      const isValidPin = await verifyPin(currentUser.uid, auditData.pin)
        .catch(() => false);
      const isPinInList = VALID_PINS?.includes(auditData.pin);

      if (!isValidPin && !isPinInList) {
        setPinError('PIN Inválido o usuario no autorizado.');
        return;
      }
    }
    
    setPinError('');
    setUploadingPhotos(true);

    try {
      // 2. Convert File objects to object URLs (persisted for session at minimum)
      //    In a production env with Firebase Storage, you'd upload here
      const uploadedUrls = [];
      for (const file of auditData.photos) {
        // Create a stable URL for this session:
        const url = URL.createObjectURL(file);
        uploadedUrls.push(url);
      }

      // 3. Calculate base points (no scoring engine here, use flat 10 pts as baseline)
      //    The task may not have a taskType, so we use a minimal flat award
      const basePoints = auditData.status === 'CANCELLED' ? 0 : 
                         auditData.status === 'WITH_ISSUES' ? 5 : 10;

      // 4. Trigger the full completion pipeline (Firestore writes, evidence, activity feed, scoring)
      await completeTask(taskToComplete.id, {
        status: auditData.status,
        notes: auditData.notes || 'Sin notas adicionales',
        photos: uploadedUrls, // Passed as string URLs
        pointsEarned: basePoints,
        details: {
          closedFromDashboard: true,
          pin: '***',  // Never store the actual PIN
          photosAttached: uploadedUrls.length
        }
      });

      setShowAuditModal(false);
      setTaskToComplete(null);
      setAuditData({ notes: '', status: 'SUCCESS', pin: '', photos: [] });
    } catch (e) {
      console.error('Error al cerrar tarea:', e);
      setPinError('Ocurrió un error al guardar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setUploadingPhotos(false);
    }
  };

  const getStatusIndicator = (status) => {
    if (status === 'SUCCESS') return <div title="Terminada con satisfacción" style={{width: 14, height: 14, borderRadius: '50%', backgroundColor: '#10b981'}}></div>;
    if (status === 'WITH_ISSUES') return <div title="Terminada con detalles" style={{width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(90deg, #10b981 50%, #eab308 50%)'}}></div>;
    if (status === 'CANCELLED') return <div title="Cancelada" style={{width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(90deg, #10b981 50%, #ef4444 50%)'}}></div>;
    return null;
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '2rem' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Hola, {currentUser?.displayName || 'Usuario'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Rol activo: <strong style={{color: 'var(--color-primary-light)'}}>{role || 'Consultor'}</strong></p>
        </div>
        { (role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN_ESTATAL || role === ROLES.COORD_DISTRITAL_FED) && (
          <button 
            className="btn btn-primary" 
            onClick={() => navigate('/summary')}
            style={{ 
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #5a0016 100%)',
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <TrendingUp size={18} />
            Ver Resumen Ejecutivo
          </button>
        )}
      </div>

      {/* KPIs */}
      {role === ROLES.COORD_DISTRITAL_FED ? (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 'var(--space-4)', 
          marginBottom: '2.5rem' 
        }}>
          <div className="card glass-panel flex-col justify-between" style={{ padding: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--status-info)' }}>
                <TrendingUp size={24} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--status-success)', fontWeight: 'bold' }}>META: 15,000</span>
            </div>
            <h3 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>{Math.floor(Math.random() * 5000) + 8000}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Simpatizantes en DF {currentUser.assignments?.districtsFed?.[0] || '?'}</p>
          </div>

          <div className="card glass-panel flex-col justify-between" style={{ padding: '1.5rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--status-success)' }}>
                <CheckCircle size={24} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--status-warning)', fontWeight: 'bold' }}>8 Pendientes</span>
            </div>
            <h3 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>72%</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Eficiencia de Delegación</p>
          </div>

          <div className="card glass-panel flex-col justify-between" style={{ padding: '1.5rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--status-warning)' }}>
                <MapPin size={24} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--status-success)' }}>Bajo Control</span>
            </div>
            <h3 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>{currentUser.assignments?.districtsLoc?.length || 0}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Distritos Locales a Cargo</p>
          </div>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: 'var(--space-4)', 
          marginBottom: '2.5rem' 
        }}>
          
          <div className="card glass-panel flex-col justify-between" style={{ padding: '1.5rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--status-info)' }}>
                <Users size={24} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--status-success)', fontWeight: 'bold' }}>+12% este mes</span>
            </div>
            <h3 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>12,450</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Simpatizantes Totales</p>
          </div>

          <div className="card glass-panel flex-col justify-between" style={{ padding: '1.5rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--status-success)' }}>
                <CheckCircle size={24} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--status-success)', fontWeight: 'bold' }}>{percentageTasks}% completado</span>
            </div>
            <h3 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>{numCompletedTasks} / {numTotalTasks}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Tareas Resueltas</p>
          </div>

          <div className="card glass-panel flex-col justify-between" style={{ padding: '1.5rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)', color: 'var(--status-warning)' }}>
                <MapPin size={24} />
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Faltan 22 secciones</span>
            </div>
            <h3 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>82%</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Cobertura Territorial</p>
          </div>
        </div>
      )}

      {/* ESTRATEGIA FEDERAL: CENTRO DE MANDO */}
      {role === ROLES.COORD_DISTRITAL_FED && (
        <section className="animate-fade-in" style={{ marginBottom: '3rem' }}>
          <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Centro de Mando Distrital</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Supervisión de Distritos Locales bajo tu coordinación</p>
            </div>
            <button className="btn btn-primary" onClick={openTaskModal}>
              <Plus size={18} /> Nueva Estrategia Global
            </button>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
            gap: 'var(--space-6)' 
          }}>
            {(currentUser.assignments?.districtsLoc || ['01', '02', '03']).map(dl => {
              // Mock random data for health grid
              const progress = Math.floor(Math.random() * 40) + 45;
              const pending = Math.floor(Math.random() * 10) + 2;
              const statusColor = progress > 80 ? 'var(--status-success)' : progress > 60 ? 'var(--color-primary-light)' : 'var(--status-warning)';
              
              return (
                <div key={dl} className="card glass-panel" style={{ padding: '1.5rem', borderTop: `4px solid ${statusColor}` }}>
                  <div className="flex justify-between items-start" style={{ marginBottom: '1.25rem' }}>
                    <div className="flex-col gap-1">
                      <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary)' }}>Distrito Local {dl}</h4>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Jurisdicción Federal {currentUser.assignments?.districtsFed?.[0] || '--'}</span>
                    </div>
                    <div style={{ padding: '0.4rem 0.8rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '2rem', fontSize: '0.75rem', fontWeight: 'bold', color: statusColor }}>
                      {progress}% Salud
                    </div>
                  </div>

                  <div className="flex-col gap-3" style={{ marginBottom: '1.5rem' }}>
                    <div className="flex justify-between" style={{ fontSize: '0.8125rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Operatividad</span>
                      <span style={{ fontWeight: 600 }}>{pending} Tareas Pendientes</span>
                    </div>
                    <div style={{ height: '8px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div className="progress-bar-animate" style={{ height: '100%', width: `${progress}%`, backgroundColor: statusColor, borderRadius: '4px' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button 
                      className="btn hover-effect" 
                      style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: 'var(--bg-surface-elevated)' }}
                      onClick={() => navigate('/messages')}
                    >
                      <MessageSquare size={14} /> Instruir
                    </button>
                    <button 
                      className="btn btn-primary" 
                      style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      onClick={() => {
                        setNewTaskData({ ...newTaskData, role: ROLES.COORD_DISTRITAL_LOC, title: `Estrategia D.L. ${dl}: ` });
                        setShowTaskModal(true);
                      }}
                    >
                      <Plus size={14} /> Asignar
                    </button>
                    <button 
                      className="btn" 
                      style={{ gridColumn: 'span 2', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: '1px solid var(--border-color)' }}
                      onClick={() => navigate('/territory')}
                    >
                      <MapPin size={14} /> Ver Geografía Local
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: role === ROLES.COORD_DISTRITAL_FED ? '2fr 1fr' : 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-6)'}}>
        
        {/* Tareas y Actividad */}
        <section className="flex-col gap-6">
          
          {/* TAREAS A REALIZAR */}
          <div className="flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 style={{ fontSize: '1.125rem' }}>{role === ROLES.COORD_DISTRITAL_FED ? 'Bandeja de Estrategia y Delegación' : 'Clasificador de Tareas'}</h3>
                <div className="flex gap-4" style={{ marginTop: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <button onClick={() => setActiveTab('PENDING')} style={{ background: 'none', border: 'none', padding: '0.5rem 0.25rem', color: activeTab === 'PENDING' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'PENDING' ? '2px solid var(--color-primary-light)' : 'none', fontWeight: activeTab === 'PENDING' ? 'bold' : 'normal', cursor: 'pointer' }}>Pendientes ({pendingTasks.length})</button>
                  <button onClick={() => setActiveTab('COMPLETED')} style={{ background: 'none', border: 'none', padding: '0.5rem 0.25rem', color: activeTab === 'COMPLETED' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'COMPLETED' ? '2px solid var(--color-primary-light)' : 'none', fontWeight: activeTab === 'COMPLETED' ? 'bold' : 'normal', cursor: 'pointer' }}>Terminadas ({completedTasks.length})</button>
                </div>
              </div>
              <button className="btn btn-primary" onClick={openTaskModal}>
                <Plus size={16} /> Nueva Tarea Local
              </button>
            </div>
            
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {displayedTasks.map((task) => (
                <div key={task.id} className="flex gap-4 items-center justify-between" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: task.completed ? 'rgba(16, 185, 129, 0.05)' : 'transparent', borderLeft: task.assigneeId === currentUser.uid ? '4px solid #ef4444' : 'none' }}>
                  <div className="flex gap-4 items-start w-full">
                    <div style={{ marginTop: '2px' }}>
                      {task.completed ? (
                        getStatusIndicator(task.status)
                      ) : (
                        <input 
                          type="checkbox" 
                          checked={false} 
                          onChange={() => handleOpenAudit(task)}
                          style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                        />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                       <div className="flex justify-between items-start">
                          <span style={{ fontSize: '0.875rem', fontWeight: 500, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                              {task.title}
                              {task.assigneeId === currentUser.uid && !task.completed && (
                                <span style={{ marginLeft: '8px', padding: '2px 6px', backgroundColor: '#ef4444', color: 'white', borderRadius: '4px', fontSize: '0.65rem' }}>PRIORITARIO (Recibido de Superior)</span>
                              )}
                          </span>
                          
                          {/* Botón Delegar para Coord Federal */}
                          {role === ROLES.COORD_DISTRITAL_FED && !task.completed && task.assigneeId === currentUser.uid && (
                            <button 
                              className="btn btn-primary" 
                              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', backgroundColor: '#8b5cf6' }}
                              onClick={() => {
                                setTaskToDelegate(task);
                                setShowDelegateModal(true);
                              }}
                            >
                              <TrendingUp size={12} style={{marginRight: '4px'}} /> Delegar
                            </button>
                          )}
                       </div>

                       <div className="flex items-center gap-3" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={12} /> {task.assigneeId === currentUser.uid ? 'Tu (D3)' : task.assignee}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: ROLE_COLORS[task.role] || 'var(--text-muted)' }}></div>
                            {task.role}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> {task.dueDate}
                          </span>
                       </div>
                       
                       {task.completed && (
                         <div style={{ marginTop: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: isTaskLate(task.dueDate, task.completedAt) ? 'var(--status-error)' : 'var(--status-success)' }}>
                                {isTaskLate(task.dueDate, task.completedAt) ? '🔴 Cierre con Retraso' : '🟢 Cierre a Tiempo'} 
                                <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                                  Analista/Asignado: {task.assignee}
                                </span>
                            </div>
                            {task.completionNotes && (
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic', borderLeft: '2px solid var(--border-color)', paddingLeft: '8px' }}>
                                  {task.completionNotes}
                                </p>
                            )}
                         </div>
                       )}
                    </div>
                  </div>
                </div>
              ))}
              {displayedTasks.length === 0 && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay tareas en esta sección</div>
              )}
            </div>
          </div>

          {/* ACTIVIDAD RECIENTE */}
          <div className="flex-col gap-4">
            <h3 style={{ fontSize: '1.125rem' }}>Actividad Reciente</h3>
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {activities.length === 0 ? (
                 <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay actividad</div>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex gap-4 items-center justify-between" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <div className="flex gap-4 items-center">
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrendingUp size={18} color="var(--color-secondary)" />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 500 }}>{activity.text}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Por: {activity.author} - {activity.time}</p>
                      </div>
                    </div>
                    
                    {isSuperAdmin && (
                      <div className="flex gap-2">
                        <button className="btn" style={{ padding: '0.5rem', color: 'var(--text-secondary)' }}>
                           <Edit2 size={16} />
                        </button>
                        <button className="btn" onClick={() => handleDeleteActivity(activity.id)} style={{ padding: '0.5rem', color: 'var(--status-error)' }}>
                           <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

        {/* Alerts & Reports */}
        <section className="flex-col gap-4">
          <h3 style={{ fontSize: '1.125rem' }}>Reportes Ciudadanos Recientes</h3>
          <div className="flex-col gap-3">
            {reports.slice(0, 5).map(report => (
              <div key={report.id} className="card glass-panel" style={{ padding: '0.75rem', borderColor: report.status === 'PENDING' ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-color)' }}>
                <div className="flex gap-3 items-start">
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
                    <img src={report.imageUrl} alt="Reporte" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div className="flex-col gap-1 w-full">
                    <div className="flex justify-between items-center">
                      <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary-light)' }}>{report.type.toUpperCase()}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{new Date(report.timestamp).toLocaleDateString()}</span>
                    </div>
                    <p style={{ fontSize: '0.8125rem', lineHeight: '1.2' }}>{report.description.substring(0, 60)}...</p>
                    <div className="flex justify-between items-center" style={{ marginTop: '4px' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Por: {report.userName}</span>
                      <button 
                        className="btn" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.7rem', backgroundColor: 'var(--bg-surface-elevated)' }}
                        onClick={() => navigate('/support')}
                      >
                        Gestionar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {reports.length === 0 && <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center' }}>No hay reportes pendientes.</p>}
          </div>

          <h3 style={{ fontSize: '1.125rem', marginTop: '1rem' }}>Alertas Prioritarias</h3>
          <div className="flex-col gap-3">
            <div className="card" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
              <div className="flex gap-3 items-center">
                <AlertCircle color="var(--status-error)" size={20} />
                <div>
                  <h4 style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Baja cobertura en D4</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Se requieren brigadas en el sur.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Salud del Territorio (Solo para Federal) */}
          {role === ROLES.COORD_DISTRITAL_FED && (
            <div className="flex-col gap-4" style={{ marginTop: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem' }}>Salud del Territorio (D.L.)</h3>
              <div className="card" style={{ padding: '1rem' }}>
                {(currentUser.assignments?.districtsLoc || ['01', '02', '03']).map(dl => {
                  const progress = Math.floor(Math.random() * 40) + 50;
                  return (
                    <div key={dl} style={{ marginBottom: '1rem' }}>
                      <div className="flex justify-between" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>
                        <span>Distrito Local {dl}</span>
                        <span style={{ fontWeight: 'bold' }}>{progress}%</span>
                      </div>
                      <div style={{ height: '6px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, backgroundColor: progress > 80 ? 'var(--status-success)' : 'var(--color-primary-light)', borderRadius: '3px' }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Custom Task Modal */}
      {showTaskModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Crear Nueva Tarea</h2>
            
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Título de la tarea</label>
              <input type="text" className="input" placeholder="Ej. Reparto de panfletos..." value={newTaskData.title} onChange={(e) => setNewTaskData({...newTaskData, title: e.target.value})} autoFocus />
            </div>
            
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Asignar a Usuario Específico (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="Buscar por nombre o #folio..." 
                  value={newTaskData.assigneeId ? newTaskData.assigneeName : userSearch} 
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    if (newTaskData.assigneeId) setNewTaskData({...newTaskData, assigneeId: '', assigneeName: ''});
                  }} 
                />
                {filteredUserResults.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', zIndex: 10, marginTop: '2px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    {filteredUserResults.map(u => (
                      <div 
                        key={u.id} 
                        onClick={() => {
                          setNewTaskData({ ...newTaskData, assigneeId: u.id, assigneeName: u.name });
                          setUserSearch('');
                          setFilteredUserResults([]);
                        }}
                        style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid var(--border-color)', fontSize: '0.875rem' }}
                        className="hover-effect"
                      >
                        <div style={{ fontWeight: 'bold' }}>{u.name} <span style={{ color: 'var(--color-primary-light)' }}>#{u.folio}</span></div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{u.role}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {newTaskData.assigneeId && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)', marginTop: '0.25rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Seleccionado: {newTaskData.assigneeName}</span>
                  <button onClick={() => setNewTaskData({...newTaskData, assigneeId: '', assigneeName: ''})} style={{ background: 'none', border: 'none', color: 'var(--status-error)', cursor: 'pointer', padding: 0 }}>Quitar</button>
                </div>
              )}
            </div>

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Rol Objetivo (Si no hay usuario específico)</label>
              <select className="input" value={newTaskData.role} onChange={(e) => setNewTaskData({...newTaskData, role: e.target.value})} disabled={!!newTaskData.assigneeId}>
                {assignableRoles.map(r => (
                  <option key={r} value={r}>Equipo de: {r}</option>
                ))}
              </select>
            </div>

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Fecha Objetivo</label>
              <input type="date" className="input" value={newTaskData.dueDate} onChange={(e) => setNewTaskData({...newTaskData, dueDate: e.target.value})} />
            </div>

            <div className="flex justify-between" style={{ marginTop: '0.5rem' }}>
              <button className="btn" onClick={() => setShowTaskModal(false)} style={{ color: 'var(--text-secondary)' }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveTask} disabled={!newTaskData.title}>Guardar Tarea</button>
            </div>
            </div>
          </div>
        )}
      {/* Delegation Modal */}
      {showDelegateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, backdropFilter: 'blur(8px)' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="flex items-center gap-2" style={{ color: '#8b5cf6' }}>
              <TrendingUp size={20} />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Delegar Tarea Estratégica</h2>
            </div>
            
            <div style={{ padding: '1rem', backgroundColor: 'rgba(139, 92, 246, 0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Tarea Original:</p>
              <p style={{ fontSize: '0.925rem', fontWeight: 'bold' }}>{taskToDelegate?.title}</p>
            </div>

            <div className="flex-col gap-4">
              <div className="flex-col gap-2">
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Asignar a Coordinador Local</label>
                <select 
                  className="input" 
                  value={delegationData.assigneeId} 
                  onChange={(e) => {
                    const user = allUsers.find(u => u.uid === e.target.value);
                    setDelegationData({ ...delegationData, assigneeId: e.target.value, assigneeName: user ? `${user.displayName} ${user.surname}` : '' });
                  }}
                >
                  <option value="">Seleccione Coordinador...</option>
                  {allUsers.filter(u => u.role === ROLES.COORD_DISTRITAL_LOC).map(u => (
                    <option key={u.uid} value={u.uid}>{u.displayName} {u.surname} (Distrito Local {u.assignments?.districtsLoc?.[0]})</option>
                  ))}
                </select>

              </div>

              <div className="flex-col gap-2">
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Instrucciones Específicas</label>
                <textarea 
                  className="input" 
                  rows={3} 
                  placeholder="Instrucciones para el nivel local..." 
                  value={delegationData.notes}
                  onChange={(e) => setDelegationData({ ...delegationData, notes: e.target.value })}
                ></textarea>
              </div>
            </div>

            <div className="flex justify-between" style={{ marginTop: '1rem' }}>
              <button className="btn" onClick={() => setShowDelegateModal(false)} style={{ color: 'var(--text-secondary)' }}>Cancelar</button>
              <button 
                className="btn" 
                style={{ backgroundColor: '#8b5cf6', color: 'white' }}
                onClick={async () => {
                   if (!delegationData.assigneeId) return;
                   
                   // 1. Create the sub-task
                   await addTask({
                     title: `[DELEGADA] ${taskToDelegate.title}`,
                     parentTaskId: taskToDelegate.id,
                     assigneeId: delegationData.assigneeId,
                     assignee: delegationData.assigneeName,
                     role: ROLES.COORD_DISTRITAL_LOC,
                     dueDate: taskToDelegate.dueDate,
                     notes: delegationData.notes,
                     distFederal: taskToDelegate.distFederal,
                     distLocal: allUsers.find(u => u.uid === delegationData.assigneeId)?.assignments?.districtsLoc?.[0] || '0'
                   });

                   setShowDelegateModal(false);
                   setDelegationData({ localDistId: '', assigneeId: '', assigneeName: '', notes: '' });
                }}
              >
                Confirmar Delegación
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Audit Modal */}
      {showAuditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="flex items-center gap-2" style={{ color: 'var(--color-primary-light)' }}>
              <CheckCircle size={20} />
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Operación en Campo</h2>
            </div>
            
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Reporta el resultado de: <strong>{taskToComplete?.title}</strong>
            </p>

            <div className="flex-col gap-3">
              <div className="flex gap-2">
                <button 
                  onClick={() => setAuditData({...auditData, status: 'SUCCESS'})}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid', borderColor: auditData.status === 'SUCCESS' ? 'var(--status-success)' : 'var(--border-color)', backgroundColor: auditData.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.1)' : 'transparent', color: auditData.status === 'SUCCESS' ? 'var(--status-success)' : 'var(--text-secondary)', cursor: 'pointer' }}
                >Satisfactorio</button>
                <button 
                  onClick={() => setAuditData({...auditData, status: 'WITH_ISSUES'})}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid', borderColor: auditData.status === 'WITH_ISSUES' ? 'var(--status-warning)' : 'var(--border-color)', backgroundColor: auditData.status === 'WITH_ISSUES' ? 'rgba(245, 158, 11, 0.1)' : 'transparent', color: auditData.status === 'WITH_ISSUES' ? 'var(--status-warning)' : 'var(--text-secondary)', cursor: 'pointer' }}
                >Parcial</button>
                <button 
                  onClick={() => setAuditData({...auditData, status: 'CANCELLED'})}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid', borderColor: auditData.status === 'CANCELLED' ? 'var(--status-error)' : 'var(--border-color)', backgroundColor: auditData.status === 'CANCELLED' ? 'rgba(239, 68, 68, 0.1)' : 'transparent', color: auditData.status === 'CANCELLED' ? 'var(--status-error)' : 'var(--text-secondary)', cursor: 'pointer' }}
                >Cancelada</button>
              </div>

              <div className="flex-col gap-2">
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Notas de la Visita/Acción</label>
                <textarea className="input" rows={3} placeholder="Describe brevemente lo ocurrido..." value={auditData.notes} onChange={(e) => setAuditData({...auditData, notes: e.target.value})} />
              </div>

              <div className="flex-col gap-2">
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Evidencia (Máx 5 fotos)</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <label style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-md)', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    <Camera size={24} />
                    <input type="file" multiple accept="image/*" onChange={handlePhotoSelection} style={{ display: 'none' }} />
                  </label>
                  {auditData.photos.map((p, i) => (
                    <div key={i} style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', position: 'relative' }}>
                      <Check size={16} color="var(--status-success)" />
                    </div>
                  ))}
                </div>
              </div>

              {requirePinForTasks && (
                <div className="flex-col gap-2">
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Confirma tu PIN Personal</label>
                  <input type="password" className="input" maxLength={4} placeholder="****" value={auditData.pin} onChange={(e) => setAuditData({...auditData, pin: e.target.value})} style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem' }} />
                  {pinError && <p style={{ fontSize: '0.75rem', color: 'var(--status-error)', marginTop: '4px' }}>{pinError}</p>}
                </div>
              )}
            </div>

            <div className="flex justify-between" style={{ marginTop: '0.5rem' }}>
              <button className="btn" onClick={() => setShowAuditModal(false)} style={{ color: 'var(--text-secondary)' }}>Cancelar</button>
              <button className="btn btn-primary" onClick={submitAudit} disabled={uploadingPhotos || (requirePinForTasks && auditData.pin.length < 4)}>
                {uploadingPhotos ? 'Procesando...' : 'Finalizar Tarea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
