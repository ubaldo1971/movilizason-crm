import React, { useState, useMemo } from 'react';
import { useRole } from '../context/RoleContext';
import { 
  Search, Filter, Calendar, Users, MapPin, 
  ChevronRight, Download, Eye, Clock, User as UserIcon,
  Maximize2, Share2, X, Image as ImageIcon, ClipboardList
} from 'lucide-react';
import { exportToCSV } from '../lib/exportService';
import './SupportContainer.css';

export default function SupportContainer() {
  const { evidence, role, ROLES, addTask, currentUser, reports, resolveReport } = useRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const filteredEvidence = useMemo(() => {
    if (!evidence || !Array.isArray(evidence)) return [];
    return evidence.filter(ev => {
      const userName = ev.userName || 'Anónimo';
      const notes = ev.notes || '';
      const section = ev.section || '';
      
      const matchesSearch = 
        userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        section.includes(searchTerm);
      
      const matchesCategory = selectedCategory === 'all' || ev.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [evidence, searchTerm, selectedCategory]);


  const handleExport = () => {
    const headers = {
      timestamp: 'Fecha',
      userName: 'Colaborador',
      brigade: 'Brigada',
      category: 'Categoría',
      section: 'Sección',
      distFederal: 'Dist. Federal',
      notes: 'Notas/Observaciones',
      url: 'Link Imagen'
    };
    
    // Format timestamp for CSV
    const dataToExport = filteredEvidence.map(ev => ({
      ...ev,
      timestamp: ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'N/A',
      category: ev.category?.toUpperCase() || 'REPORTE'
    }));

    exportToCSV(dataToExport, 'Reportes_Ciudadanos', headers);
  };


  const handleConvertToTask = async (ev) => {
    // Find the original report to get full details if needed
    const report = reports.find(r => r.imageUrl === ev.url);
    
    const taskData = {
      title: `Atender reporte: ${ev.notes.substring(0, 50) || 'Reporte Ciudadano'}`,
      description: ev.notes,
      role: ROLES.BRIGADISTA,
      section: ev.section,
      distFederal: ev.distFederal,
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      priority: 'high',
      originReportId: report?.id || null,
      imageUrl: ev.url
    };

    await addTask(taskData);
    if (report?.id) {
       await resolveReport(report.id, 'IN_PROGRESS', 'Convertido a tarea operativa.');
    }
    alert('Reporte convertido a tarea exitosamente. El brigadista recibirá una notificación.');
    setSelectedEvidence(null);
  };

  const isAdmin = role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN_ESTATAL;

  return (
    <div className="support-container-page animate-fade-in">
      <header className="page-header">
        <div className="flex-col">
          <h1 className="page-title">Contenedor de Soporte Territorial</h1>
          <p className="page-subtitle">Evidencia fotográfica y reportes de campo ({filteredEvidence.length})</p>
        </div>
        
        <div className="header-actions">
          {isAdmin && (
            <button className="btn-export-csv" onClick={handleExport} title="Exportar Vista Actual a CSV">
              <Download size={18} />
              <span>Exportar CSV</span>
            </button>
          )}
          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Buscar por colaborador, sección o notas..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-filter">
            <Filter size={18} />
          </button>
        </div>
      </header>

      <div className="gallery-layout">
        <aside className="gallery-filters">
          <div className="filter-group">
            <label>Categoría</label>
            <div className="filter-options">
              <button 
                className={`filter-opt ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                Todos
              </button>
              <button 
                className={`filter-opt ${selectedCategory === 'barda' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('barda')}
              >
                Bardas/Murales
              </button>
              <button 
                className={`filter-opt ${selectedCategory === 'asamblea' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('asamblea')}
              >
                Asambleas
              </button>
              <button 
                className={`filter-opt ${selectedCategory === 'reporte' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('reporte')}
              >
                Reportes
              </button>
            </div>
          </div>

          <div className="stats-box glass-panel">
            <h4>Resumen de Soporte</h4>
            <div className="stat-row">
              <span>Total Fotos</span>
              <span className="val">{evidence.length}</span>
            </div>
            <div className="stat-row">
              <span>Este Mes</span>
              <span className="val">{evidence.filter(e => new Date(e.timestamp).getMonth() === new Date().getMonth()).length}</span>
            </div>
          </div>
        </aside>

        <main className="gallery-grid">
          {filteredEvidence.map((ev, index) => (
            <div 
              key={ev.id} 
              className="evidence-card card glass-panel animate-slide-up" 
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => setSelectedEvidence(ev)}
            >
              <div className="evidence-image-container">
                <img 
                  src={ev.url} 
                  alt="Evidencia" 
                  className="evidence-thumb" 
                  loading="lazy" 
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=300';
                    e.target.style.opacity = '0.5';
                  }}
                />
                <div className="evidence-overlay">
                  <Maximize2 size={24} />
                </div>
                <div className="evidence-badge section">
                  S- {ev.section}
                </div>
                {ev.taskId && (
                  <div className="evidence-badge task-link" title="Vinculado a una tarea">
                    <ClipboardList size={10} />
                  </div>
                )}
              </div>
              
              <div className="evidence-info">
                <div className="ev-user">
                  <div className="avatarMini">
                    <UserIcon size={12} />
                  </div>
                  <span>{ev.userName}</span>
                </div>
                {ev.notes && <p className="ev-notes">"{ev.notes}"</p>}
                <div className="ev-footer">
                  <span className="brigade-tag">{ev.brigade}</span>
                  <span className="timestamp"><Clock size={10} /> {new Date(ev.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}

          {filteredEvidence.length === 0 && (
            <div className="empty-gallery animate-fade-in">
              <div className="empty-icon-wrap">
                <ImageIcon size={48} />
              </div>
              <h3>No hay evidencias cargadas</h3>
              <p>Las fotos subidas por los brigadistas aparecerán aquí en tiempo real.</p>
              <div className="empty-hint">Intena cambiar los filtros o el término de búsqueda</div>
            </div>
          )}
        </main>
      </div>

      {selectedEvidence && (
        <div className="evidence-modal-overlay" onClick={() => setSelectedEvidence(null)}>
          <div className="evidence-modal-content glass-panel" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedEvidence(null)}><X size={24} /></button>
            
            <div className="modal-layout">
              <div className="modal-image">
                <img 
                  src={selectedEvidence.url} 
                  alt="Full Evidencia" 
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=1000';
                  }}
                />
              </div>
              <div className="modal-details">
                <div className="detail-header">
                  <h3>Soporte Territorial</h3>
                  <span className="id-badge">ID: {selectedEvidence.id.substr(0,8)}</span>
                </div>

                <div className="detail-meta-grid">
                  <div className="meta-item">
                    <UserIcon size={16} />
                    <div>
                      <label>Colaborador</label>
                      <p>{selectedEvidence.userName}</p>
                    </div>
                  </div>
                  <div className="meta-item">
                    <Users size={16} />
                    <div>
                      <label>Brigada</label>
                      <p>{selectedEvidence.brigade}</p>
                    </div>
                  </div>
                  <div className="meta-item">
                    <Calendar size={16} />
                    <div>
                      <label>Fecha y Hora</label>
                      <p>{new Date(selectedEvidence.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="meta-item">
                    <MapPin size={16} />
                    <div>
                      <label>Territorio</label>
                      <p>S-{selectedEvidence.section} | Fed: {selectedEvidence.distFederal}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-notes">
                  <label>Observaciones</label>
                  <p>{selectedEvidence.notes || "Sin observaciones adicionales."}</p>
                </div>

                {selectedEvidence.category === 'reporte' && (
                  <div className="detail-citizen-info" style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(59, 130, 246, 0.05)', borderRadius: '0.5rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-primary-light)', marginBottom: '0.5rem' }}>DATOS DE CONTACTO</div>
                    <div className="flex gap-4">
                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Ciudadano</label>
                        <p style={{ fontSize: '0.875rem' }}>{selectedEvidence.citizenName || "Anónimo"}</p>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block' }}>Teléfono</label>
                        <p style={{ fontSize: '0.875rem' }}>{selectedEvidence.citizenPhone || "Sin teléfono"}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button className="btn success" style={{ flex: 1 }}><Download size={18} /> Descargar</button>
                  {isAdmin && selectedEvidence.category === 'reporte' && (
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1, backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                      onClick={() => handleConvertToTask(selectedEvidence)}
                    >
                      <ClipboardList size={18} /> Convertir a Tarea
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
