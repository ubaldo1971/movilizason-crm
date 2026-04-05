import React, { useState, useMemo } from 'react';
import { useRole } from '../context/RoleContext';
import { 
  Search, Filter, Calendar, Users, MapPin, 
  ChevronRight, Download, Eye, Clock, User as UserIcon,
  Maximize2, Share2, X, Image as ImageIcon
} from 'lucide-react';
import './SupportContainer.css';

export default function SupportContainer() {
  const { evidence, role, ROLES } = useRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEvidence, setSelectedEvidence] = useState(null);

  const filteredEvidence = useMemo(() => {
    return evidence.filter(ev => {
      const matchesSearch = 
        ev.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ev.section?.includes(searchTerm);
      
      const matchesCategory = selectedCategory === 'all' || ev.category === selectedCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [evidence, searchTerm, selectedCategory]);

  return (
    <div className="support-container-page animate-fade-in">
      <header className="page-header">
        <div className="flex-col">
          <h1 className="page-title">Contenedor de Soporte Territorial</h1>
          <p className="page-subtitle">Evidencia fotográfica y reportes de campo ({filteredEvidence.length})</p>
        </div>
        
        <div className="header-actions">
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
          {filteredEvidence.map((ev) => (
            <div key={ev.id} className="evidence-card card glass-panel" onClick={() => setSelectedEvidence(ev)}>
              <div className="evidence-image-container">
                <img src={ev.url} alt="Evidencia" className="evidence-thumb" />
                <div className="evidence-overlay">
                  <Maximize2 size={24} />
                </div>
                <div className="evidence-badge section">
                  S- {ev.section}
                </div>
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
            <div className="empty-gallery">
              <ImageIcon size={48} />
              <h3>No hay evidencias cargadas</h3>
              <p>Las fotos subidas por los brigadistas aparecerán aquí.</p>
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
                <img src={selectedEvidence.url} alt="Full Evidencia" />
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

                <div className="modal-actions">
                  <button className="btn success"><Download size={18} /> Descargar</button>
                  <button className="btn"><Share2 size={18} /> Compartir</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
