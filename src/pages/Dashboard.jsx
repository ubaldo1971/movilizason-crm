import { useState, useEffect } from 'react';
import { useRole } from '../context/RoleContext';
import { Users, MapPin, CheckCircle, TrendingUp, AlertCircle, Plus, Trash2, Edit2, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, deleteDoc, doc, ref, uploadBytes, getDownloadURL } from '../lib/dbService';
import { db, storage } from '../firebaseConfig';

export default function Dashboard() {
  const { role, ROLES, ROLE_COLORS, tasks, completeTask, addTask, requirePinForTasks, VALID_PINS } = useRole();
  const navigate = useNavigate();

  const [activities, setActivities] = useState([]);
  
  // Tabs State
  const [activeTab, setActiveTab] = useState('PENDING');

  // Custom Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskData, setNewTaskData] = useState({ title: '', role: ROLES.BRIGADISTA, dueDate: '' });

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

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'actividad'), (snapshot) => {
      const acts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by creation time descending if possible, or just reverse
      setActivities(acts.reverse());
    });
    return () => unsubscribe();
  }, []);

  const pendingTasks = tasks.filter(t => !t.completed);
  const completedTasks = tasks.filter(t => t.completed);
  const displayedTasks = activeTab === 'PENDING' ? pendingTasks : completedTasks;

  const numTotalTasks = tasks.length;
  const numCompletedTasks = completedTasks.length;
  const percentageTasks = numTotalTasks > 0 ? Math.round((numCompletedTasks / numTotalTasks) * 100) : 0;

  const isTaskLate = (dueDate, completedAtStr) => {
    if (!dueDate || dueDate === 'Sin fecha' || !completedAtStr) return false;
    const due = new Date(dueDate);
    due.setHours(23, 59, 59, 999);
    const completed = new Date(completedAtStr);
    return completed > due;
  };

  const isSuperAdmin = role === ROLES.SUPER_ADMIN;

  const handleDeleteActivity = async (id) => {
    if (isSuperAdmin) {
      await deleteDoc(doc(db, 'actividad', id));
    }
  };

  const openTaskModal = () => {
    const defaultRole = assignableRoles.length > 0 ? assignableRoles[0] : ROLES.BRIGADISTA;
    setNewTaskData({ title: '', role: defaultRole, dueDate: '' });
    setShowTaskModal(true);
  };

  const handleSaveTask = () => {
    if (!newTaskData.title) return;
    addTask({ 
      title: newTaskData.title, 
      assignee: `Equipo: ${newTaskData.role}`, 
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
    if (requirePinForTasks && !VALID_PINS.includes(auditData.pin)) {
      setPinError('PIN Inválido o usuario no autorizado.');
      return;
    }
    setPinError('');
    setUploadingPhotos(true);

    try {
      const uploadedUrls = [];
      for (const file of auditData.photos) {
        uploadedUrls.push(URL.createObjectURL(file));
      }

      // Fire and forget to avoid hanging if network is slow
      completeTask(taskToComplete.id, {
        status: auditData.status,
        notes: auditData.notes || 'Sin notas adicionales',
        photos: uploadedUrls
      }).catch(err => console.error("Error silencioso Firestore:", err));

      setShowAuditModal(false);
      setTaskToComplete(null);
    } catch (e) {
      console.error(e);
      if (e.message === 'TIMEOUT') {
        alert('Firebase tardó en responder. Verifique su conexión y refresque la página.');
      }
      setPinError('Ocurrió un error interno o de red. Intenta refrescando la página.');
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
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Hola, {role === ROLES.SUPER_ADMIN ? 'Ubaldo' : 'Usuario Demo'}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Rol activo: <strong style={{color: 'var(--color-primary-light)'}}>{role}</strong></p>
        </div>
      </div>

      {/* KPIs */}
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 'var(--space-6)'}}>
        
        {/* Tareas y Actividad */}
        <section className="flex-col gap-6">
          
          {/* TAREAS A REALIZAR */}
          <div className="flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 style={{ fontSize: '1.125rem' }}>Clasificador de Tareas</h3>
                <div className="flex gap-4" style={{ marginTop: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <button onClick={() => setActiveTab('PENDING')} style={{ background: 'none', border: 'none', padding: '0.5rem 0.25rem', color: activeTab === 'PENDING' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'PENDING' ? '2px solid var(--color-primary-light)' : 'none', fontWeight: activeTab === 'PENDING' ? 'bold' : 'normal', cursor: 'pointer' }}>Pendientes ({pendingTasks.length})</button>
                  <button onClick={() => setActiveTab('COMPLETED')} style={{ background: 'none', border: 'none', padding: '0.5rem 0.25rem', color: activeTab === 'COMPLETED' ? 'var(--text-primary)' : 'var(--text-secondary)', borderBottom: activeTab === 'COMPLETED' ? '2px solid var(--color-primary-light)' : 'none', fontWeight: activeTab === 'COMPLETED' ? 'bold' : 'normal', cursor: 'pointer' }}>Terminadas ({completedTasks.length})</button>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                   {Object.entries(ROLE_COLORS).map(([roleName, color]) => (
                      <span key={roleName} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }}></div>
                        {roleName}
                      </span>
                   ))}
                </div>
              </div>
              <button className="btn btn-primary" onClick={openTaskModal}>
                <Plus size={16} /> Nueva Tarea
              </button>
            </div>
            
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              {displayedTasks.map((task) => (
                <div key={task.id} className="flex gap-4 items-center justify-between" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: task.completed ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
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
                       <span style={{ fontSize: '0.875rem', fontWeight: 500, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                          {task.title}
                       </span>
                       <div className="flex items-center gap-3" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={12} /> {task.assignee}
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

        {/* Alerts */}
        <section className="flex-col gap-4">
          <h3 style={{ fontSize: '1.125rem' }}>Alertas Prioritarias</h3>
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
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Destinatario (Grupo/Rol Asignado)</label>
              <select className="input" value={newTaskData.role} onChange={(e) => setNewTaskData({...newTaskData, role: e.target.value})}>
                {assignableRoles.map(r => (
                  <option key={r} value={r}>Asignar a: {r}</option>
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

      {/* Audit Modal */}
      {showAuditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
          <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '450px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', maxHeight: '90vh' }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Cierre de Tarea: <span style={{color: 'var(--color-primary-light)'}}>{taskToComplete?.title}</span></h2>
            
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Estatus Final</label>
              <select className="input" value={auditData.status} onChange={(e) => setAuditData({...auditData, status: e.target.value})}>
                <option value="SUCCESS">🟢 Terminada con Satisfacción</option>
                <option value="WITH_ISSUES">🟢🟡 Terminada con Detalles</option>
                <option value="CANCELLED">🟢🔴 Cancelada / Fallida</option>
              </select>
            </div>
            
            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Notas de Auditoría / Detalles</label>
              <textarea className="input" rows={3} placeholder="Explique las razones o detalles del cierre..." value={auditData.notes} onChange={(e) => setAuditData({...auditData, notes: e.target.value})}></textarea>
            </div>

            <div className="flex-col gap-2">
              <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Evidencia (Max 5 Fotos)</label>
              <input type="file" multiple accept="image/*" onChange={handlePhotoSelection} className="input" style={{ padding: '0.5rem' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>*Las fotos retendrán metadatos EXIF (GPS/Time) para análisis. Seleccionadas: {auditData.photos.length}</span>
            </div>

            {requirePinForTasks && (
              <div className="flex-col gap-2" style={{ marginTop: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Verificación (PIN de Operador)</label>
                <input type="password" maxLength={4} className="input" placeholder="****" value={auditData.pin} onChange={(e) => setAuditData({...auditData, pin: e.target.value})} style={{ letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.25rem' }} />
                {pinError && <span style={{ color: 'var(--status-error)', fontSize: '0.75rem', textAlign: 'center' }}>{pinError}</span>}
              </div>
            )}

            <div className="flex justify-between" style={{ marginTop: '1rem' }}>
              <button className="btn" onClick={() => setShowAuditModal(false)} disabled={uploadingPhotos} style={{ color: 'var(--text-secondary)' }}>Cancelar</button>
              <button className="btn btn-primary" onClick={submitAudit} disabled={uploadingPhotos || (requirePinForTasks && auditData.pin.length < 4)}>
                {uploadingPhotos ? 'Subiendo...' : 'Firmar y Cerrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
