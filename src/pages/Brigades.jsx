import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { usePermissions } from '../hooks/usePermissions';
import {
  Users, Plus, Search, ChevronDown, ChevronUp, Edit3,
  Trash2, UserPlus, UserMinus, Shield, Crown, Star,
  Hash, MapPin, CheckCircle, X, Save, AlertTriangle,
  BarChart3, Clock, MessageSquare, Eye, EyeOff, Lock, MessageCircle
} from 'lucide-react';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp 
} from '../lib/dbService';
import { db } from '../firebaseConfig';
import './Brigades.css';

// ─── DEMO DATA (will be replaced by Firestore) ────
const DEMO_BRIGADES = [
  {
    id: 'b1', name: 'Brigada Norte D3', emoji: '🛡️',
    zone: 'Distrito 3 - Norte',
    hierarchy: 'Coordinador Distrital Federal',
    leader: { id: 'user-carlos', name: 'Carlos Ruiz', role: 'Coordinador Seccional' },
    members: [
      { id: 'user-2', name: 'Ana Gómez', role: 'Brigadista / Operador', joinedAt: '2026-03-15' },
      { id: 'user-3', name: 'Pedro León', role: 'Brigadista / Operador', joinedAt: '2026-03-16' },
      { id: 'user-4', name: 'Rosa Méndez', role: 'Brigadista / Operador', joinedAt: '2026-03-18' },
      { id: 'user-5', name: 'Miguel Torres', role: 'Brigadista / Operador', joinedAt: '2026-03-20' },
      { id: 'user-6', name: 'Laura Soto', role: 'Brigadista / Operador', joinedAt: '2026-03-22' },
    ],
    sections: ['0841', '0842', '0843'],
    status: 'active',
    createdAt: '2026-03-10',
    stats: { tasksCompleted: 47, score: 88, pendingTasks: 3 }
  },
  {
    id: 'b2', name: 'Brigada Sur D4', emoji: '⚔️',
    zone: 'Distrito 4 - Sur',
    hierarchy: 'Coordinador Distrital Local',
    leader: { id: 'user-maria', name: 'María López', role: 'Coordinador Seccional' },
    members: [
      { id: 'user-7', name: 'José Herrera', role: 'Brigadista / Operador', joinedAt: '2026-03-12' },
      { id: 'user-8', name: 'Diana Cruz', role: 'Brigadista / Operador', joinedAt: '2026-03-14' },
      { id: 'user-9', name: 'Raúl Vega', role: 'Brigadista / Operador', joinedAt: '2026-03-17' },
    ],
    sections: ['1201', '1202'],
    status: 'active',
    createdAt: '2026-03-12',
    stats: { tasksCompleted: 32, score: 76, pendingTasks: 5 }
  },
  {
    id: 'b3', name: 'Fuerza Centro', emoji: '🔥',
    zone: 'Distrito 2 - Centro',
    hierarchy: 'Coordinador Seccional',
    leader: { id: 'user-10', name: 'Fernando Reyes', role: 'Coordinador Seccional' },
    members: [
      { id: 'user-11', name: 'Patricia Luna', role: 'Brigadista / Operador', joinedAt: '2026-03-20' },
      { id: 'user-12', name: 'Sergio Mora', role: 'Brigadista / Operador', joinedAt: '2026-03-22' },
      { id: 'user-13', name: 'Carmen Estrada', role: 'Brigadista / Operador', joinedAt: '2026-03-24' },
      { id: 'user-14', name: 'Andrés Quiroz', role: 'Brigadista / Operador', joinedAt: '2026-03-25' },
      { id: 'user-15', name: 'Elena Guzmán', role: 'Brigadista / Operador', joinedAt: '2026-03-26' },
      { id: 'user-16', name: 'Roberto Salas', role: 'Brigadista / Operador', joinedAt: '2026-03-27' },
      { id: 'user-17', name: 'Daniela Ibarra', role: 'Brigadista / Operador', joinedAt: '2026-03-28' },
    ],
    sections: ['0315', '0316', '0317', '0318'],
    status: 'active',
    createdAt: '2026-03-18',
    stats: { tasksCompleted: 61, score: 92, pendingTasks: 2 }
  },
  {
    id: 'b4', name: 'Águilas Poniente', emoji: '🦅',
    zone: 'Distrito 5 - Poniente',
    hierarchy: 'Brigadista / Operador',
    leader: null,
    members: [
      { id: 'user-18', name: 'Héctor Solís', role: 'Brigadista / Operador', joinedAt: '2026-03-30' },
    ],
    sections: ['1501'],
    status: 'forming',
    createdAt: '2026-03-28',
    stats: { tasksCompleted: 3, score: 45, pendingTasks: 1 }
  },
];

const AVAILABLE_USERS = [
  { id: 'new-1', name: 'Gabriel Martínez', role: 'Brigadista / Operador' },
  { id: 'new-2', name: 'Sofía Ramírez', role: 'Brigadista / Operador' },
  { id: 'new-3', name: 'Enrique Padilla', role: 'Brigadista / Operador' },
  { id: 'new-4', name: 'Valeria Campos', role: 'Coordinador Seccional' },
  { id: 'new-5', name: 'Óscar Navarro', role: 'Brigadista / Operador' },
];

const STATUS_CONFIG = {
  active: { label: 'Activa', color: '#10b981', icon: CheckCircle },
  forming: { label: 'Formándose', color: '#f59e0b', icon: Clock },
  inactive: { label: 'Inactiva', color: '#6b7280', icon: EyeOff },
};

const HIERARCHY_LEVELS = [
  { value: 'Admin Estatal', label: 'Admin Estatal', color: '#f97316' },
  { value: 'Coordinador Distrital Federal', label: 'Coordinador Distrital Federal', color: '#3b82f6' },
  { value: 'Coordinador Distrital Local', label: 'Coordinador Distrital Local', color: '#0ea5e9' },
  { value: 'Coordinador Seccional', label: 'Coordinador Seccional', color: '#8b5cf6' },
  { value: 'Brigadista / Operador', label: 'Brigadista / Operador', color: '#eab308' },
];

const EMOJIS = ['🛡️', '⚔️', '🔥', '🦅', '⚡', '🏴', '🎯', '💪', '🚀', '🗡️', '🐺', '🦁'];

export default function Brigades() {
  const { role, ROLES } = useRole();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const [brigades, setBrigades] = useState(DEMO_BRIGADES);
  const [expandedBrigade, setExpandedBrigade] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBrigade, setEditingBrigade] = useState(null);
  const [showAddMember, setShowAddMember] = useState(null);

  // Permission-based access using the hook
  const canCreate       = hasPermission(role, 'brigades.create');
  const canEdit         = hasPermission(role, 'brigades.edit');
  const canDelete       = hasPermission(role, 'brigades.delete');
  const canAddMembers   = hasPermission(role, 'brigades.add_members');
  const canRemoveMembers = hasPermission(role, 'brigades.remove_members');
  const canSetLeader    = hasPermission(role, 'brigades.set_leader');
  const canChangeStatus = hasPermission(role, 'brigades.change_status');

  // Filter brigades
  const filteredBrigades = useMemo(() => {
    if (!searchTerm) return brigades;
    const term = searchTerm.toLowerCase();
    return brigades.filter(b =>
      b.name.toLowerCase().includes(term) ||
      b.zone?.toLowerCase().includes(term) ||
      b.leader?.name.toLowerCase().includes(term) ||
      b.members.some(m => m.name.toLowerCase().includes(term))
    );
  }, [brigades, searchTerm]);

  // Stats
  const totalMembers = brigades.reduce((sum, b) => sum + b.members.length + (b.leader ? 1 : 0), 0);
  const activeBrigades = brigades.filter(b => b.status === 'active').length;
  const avgScore = brigades.length
    ? Math.round(brigades.reduce((sum, b) => sum + (b.stats?.score || 0), 0) / brigades.length)
    : 0;

  // CRUD handlers
  const handleCreateBrigade = (data) => {
    const newBrigade = {
      id: `b-${Date.now()}`,
      ...data,
      members: [],
      leader: null,
      createdAt: new Date().toISOString().split('T')[0],
      stats: { tasksCompleted: 0, score: 0, pendingTasks: 0 },
    };
    setBrigades(prev => [...prev, newBrigade]);
    setShowCreateModal(false);
  };

  const handleDeleteBrigade = (id) => {
    if (!canDelete) return;
    setBrigades(prev => prev.filter(b => b.id !== id));
    if (expandedBrigade === id) setExpandedBrigade(null);
  };

  const handleUpdateBrigade = (id, updates) => {
    setBrigades(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const handleAddMember = (brigadeId, user) => {
    if (!canAddMembers) return;
    setBrigades(prev => prev.map(b => {
      if (b.id !== brigadeId) return b;
      if (b.members.some(m => m.id === user.id)) return b;
      return {
        ...b,
        members: [...b.members, { ...user, joinedAt: new Date().toISOString().split('T')[0] }]
      };
    }));
  };

  const handleRemoveMember = (brigadeId, userId) => {
    if (!canRemoveMembers) return;
    setBrigades(prev => prev.map(b => {
      if (b.id !== brigadeId) return b;
      return { ...b, members: b.members.filter(m => m.id !== userId) };
    }));
  };

  const handleSetLeader = (brigadeId, member) => {
    if (!canSetLeader) return;
    setBrigades(prev => prev.map(b => {
      if (b.id !== brigadeId) return b;
      return { ...b, leader: { id: member.id, name: member.name, role: member.role } };
    }));
  };

  const getScoreColor = (score) => {
    if (score >= 95) return '#a855f7';
    if (score >= 85) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 55) return '#f59e0b';
    return '#ef4444';
  };

  const getHierarchyColor = (hierarchy) => {
    const found = HIERARCHY_LEVELS.find(h => h.value === hierarchy);
    return found?.color || '#6b7280';
  };

  return (
    <div className="brigades-page animate-fade-in">
      {/* Header */}
      <div className="brigades-header">
        <div className="brigades-header-left">
          <div className="brigades-header-icon">
            <Users size={24} />
          </div>
          <div>
            <h1 className="brigades-title">Gestión de Brigadas</h1>
            <p className="brigades-subtitle">Organización de equipos operativos de campo</p>
          </div>
        </div>
        {canCreate && (
          <button className="brigades-create-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} />
            <span>Nueva Brigada</span>
          </button>
        )}
      </div>

      {/* Stats Bar */}
      <div className="brigades-stats">
        <div className="brigades-stat">
          <Users size={18} style={{ color: '#3b82f6' }} />
          <div>
            <span className="stat-value">{brigades.length}</span>
            <span className="stat-label">Brigadas</span>
          </div>
        </div>
        <div className="brigades-stat">
          <Star size={18} style={{ color: '#10b981' }} />
          <div>
            <span className="stat-value">{activeBrigades}</span>
            <span className="stat-label">Activas</span>
          </div>
        </div>
        <div className="brigades-stat">
          <UserPlus size={18} style={{ color: '#f59e0b' }} />
          <div>
            <span className="stat-value">{totalMembers}</span>
            <span className="stat-label">Miembros</span>
          </div>
        </div>
        <div className="brigades-stat">
          <BarChart3 size={18} style={{ color: '#a855f7' }} />
          <div>
            <span className="stat-value">{avgScore}%</span>
            <span className="stat-label">Score Prom.</span>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="brigades-search-bar">
        <Search size={16} className="brigades-search-icon" />
        <input
          className="brigades-search-input"
          placeholder="Buscar brigada, zona o miembro..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Brigades Grid */}
      <div className="brigades-grid">
        {filteredBrigades.map(brigade => {
          const isExpanded = expandedBrigade === brigade.id;
          const statusCfg = STATUS_CONFIG[brigade.status] || STATUS_CONFIG.active;
          const StatusIcon = statusCfg.icon;

          return (
            <div key={brigade.id} className={`brigade-card ${isExpanded ? 'expanded' : ''}`}>
              {/* Card Header */}
              <div
                className="brigade-card-header"
                onClick={() => setExpandedBrigade(isExpanded ? null : brigade.id)}
              >
                <div className="brigade-card-left">
                  <span className="brigade-emoji">{brigade.emoji}</span>
                  <div>
                    <h3 className="brigade-name">{brigade.name}</h3>
                    <div className="brigade-meta">
                      <span className="brigade-zone">
                        <MapPin size={11} /> {brigade.zone}
                      </span>
                      <span className="brigade-status" style={{ color: statusCfg.color }}>
                        <StatusIcon size={11} /> {statusCfg.label}
                      </span>
                      {brigade.hierarchy && (
                        <span
                          className="brigade-hierarchy-tag"
                          style={{ color: getHierarchyColor(brigade.hierarchy), borderColor: getHierarchyColor(brigade.hierarchy) }}
                        >
                          <Shield size={9} /> {brigade.hierarchy.split(' ').slice(-1)[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="brigade-card-right">
                  <div className="brigade-quick-stats">
                    <span className="brigade-member-count">
                      <Users size={13} /> {brigade.members.length + (brigade.leader ? 1 : 0)}
                    </span>
                    <span
                      className="brigade-score"
                      style={{ color: getScoreColor(brigade.stats?.score || 0) }}
                    >
                      {brigade.stats?.score || 0}%
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="brigade-expanded">
                  {/* Hierarchy Level */}
                  {brigade.hierarchy && (
                    <div className="brigade-section">
                      <h4 className="brigade-section-title">
                        <Shield size={14} style={{ color: getHierarchyColor(brigade.hierarchy) }} /> Nivel Jerárquico
                      </h4>
                      <div
                        className="brigade-hierarchy-badge"
                        style={{ borderColor: getHierarchyColor(brigade.hierarchy),
                                 color: getHierarchyColor(brigade.hierarchy) }}
                      >
                        <Shield size={13} /> {brigade.hierarchy}
                      </div>
                    </div>
                  )}

                  {/* Leader */}
                  <div className="brigade-section">
                    <h4 className="brigade-section-title">
                      <Crown size={14} style={{ color: '#f59e0b' }} /> Líder de Brigada
                    </h4>
                    {brigade.leader ? (
                      <div className="brigade-leader-card">
                        <div className="brigade-member-avatar leader">
                          <Crown size={14} />
                        </div>
                        <div className="brigade-member-info">
                          <span className="brigade-member-name">{brigade.leader.name}</span>
                          <span className="brigade-member-role">{brigade.leader.role}</span>
                        </div>
                        {canSetLeader && (
                          <button
                            className="brigade-action-btn danger"
                            onClick={() => handleUpdateBrigade(brigade.id, { leader: null })}
                            title="Remover líder"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="brigade-empty-leader">
                        <AlertTriangle size={14} /> Sin líder asignado
                      </div>
                    )}
                  </div>

                  {/* Members */}
                  <div className="brigade-section">
                    <div className="brigade-section-title-row">
                      <h4 className="brigade-section-title">
                        <Users size={14} /> Miembros ({brigade.members.length})
                      </h4>
                      {canAddMembers && (
                        <button
                          className="brigade-add-member-btn"
                          onClick={() => setShowAddMember(showAddMember === brigade.id ? null : brigade.id)}
                        >
                          <UserPlus size={13} /> Agregar
                        </button>
                      )}
                    </div>

                    {/* Add Member Panel */}
                    {showAddMember === brigade.id && (
                      <div className="brigade-add-panel">
                        <p className="brigade-add-label">Usuarios disponibles:</p>
                        {AVAILABLE_USERS
                          .filter(u => !brigade.members.some(m => m.id === u.id))
                          .map(user => (
                          <div key={user.id} className="brigade-add-user-row">
                            <div className="brigade-member-avatar">
                              <span>{user.name[0]}</span>
                            </div>
                            <div className="brigade-member-info">
                              <span className="brigade-member-name">{user.name}</span>
                              <span className="brigade-member-role">{user.role}</span>
                            </div>
                            <button
                              className="brigade-action-btn success"
                              onClick={() => handleAddMember(brigade.id, user)}
                            >
                              <Plus size={14} /> Agregar
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Member List */}
                    <div className="brigade-members-list">
                      {brigade.members.map(member => (
                        <div key={member.id} className="brigade-member-row">
                          <div className="brigade-member-avatar">
                            <span>{member.name[0]}</span>
                          </div>
                          <div className="brigade-member-info">
                            <span className="brigade-member-name">{member.name}</span>
                            <span className="brigade-member-role">{member.role}</span>
                          </div>
                          <span className="brigade-member-date">
                            {new Date(member.joinedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                          </span>
                          <div className="brigade-member-actions">
                            {canSetLeader && (!brigade.leader || brigade.leader.id !== member.id) && (
                              <button
                                className="brigade-action-btn gold"
                                onClick={() => handleSetLeader(brigade.id, member)}
                                title="Promover a líder"
                              >
                                <Crown size={12} />
                              </button>
                            )}
                            {canRemoveMembers && (
                              <button
                                className="brigade-action-btn danger"
                                onClick={() => handleRemoveMember(brigade.id, member.id)}
                                title="Remover"
                              >
                                <UserMinus size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {brigade.members.length === 0 && (
                        <div className="brigade-empty-members">
                          No hay miembros aún. ¡Agrega operadores a la brigada!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sections */}
                  <div className="brigade-section">
                    <h4 className="brigade-section-title">
                      <Hash size={14} /> Secciones Asignadas
                    </h4>
                    <div className="brigade-sections-row">
                      {brigade.sections.map(sec => (
                        <span key={sec} className="brigade-section-tag">{sec}</span>
                      ))}
                      {brigade.sections.length === 0 && (
                        <span className="brigade-empty-sections">Sin secciones</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="brigade-section">
                    <h4 className="brigade-section-title">
                      <BarChart3 size={14} /> Rendimiento
                    </h4>
                    <div className="brigade-perf-grid">
                      <div className="brigade-perf-item">
                        <span className="brigade-perf-value">{brigade.stats?.tasksCompleted || 0}</span>
                        <span className="brigade-perf-label">Tareas Completadas</span>
                      </div>
                      <div className="brigade-perf-item">
                        <span className="brigade-perf-value" style={{ color: getScoreColor(brigade.stats?.score || 0) }}>
                          {brigade.stats?.score || 0}%
                        </span>
                        <span className="brigade-perf-label">Score Global</span>
                      </div>
                      <div className="brigade-perf-item">
                        <span className="brigade-perf-value">{brigade.stats?.pendingTasks || 0}</span>
                        <span className="brigade-perf-label">Pendientes</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions — permission-gated */}
                  <div className="brigade-actions-row">
                    {canEdit && (
                      <button
                        className="brigade-action-main"
                        onClick={() => setEditingBrigade(brigade)}
                      >
                        <Edit3 size={14} /> Editar
                      </button>
                    )}
                    <button 
                      className="brigade-action-main chat" 
                      onClick={() => navigate(`/messages?brigadeId=${brigade.id}`)}
                    >
                      <MessageSquare size={14} /> Ir al Chat
                    </button>
                    {canDelete && (
                      <button
                        className="brigade-action-main danger"
                        onClick={() => handleDeleteBrigade(brigade.id)}
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    )}
                    {!canEdit && !canDelete && (
                      <div className="brigade-no-perms">
                        <Lock size={12} /> Sin permisos de administración
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingBrigade) && (
        <BrigadeModal
          brigade={editingBrigade}
          canChangeStatus={canChangeStatus}
          onSave={(data) => {
            if (editingBrigade) {
              handleUpdateBrigade(editingBrigade.id, data);
              setEditingBrigade(null);
            } else {
              handleCreateBrigade(data);
            }
          }}
          onClose={() => { setShowCreateModal(false); setEditingBrigade(null); }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════
   CREATE / EDIT MODAL (with Hierarchy)
   ═══════════════════════════════════════════════ */
function BrigadeModal({ brigade, canChangeStatus, onSave, onClose }) {
  const [form, setForm] = useState({
    name: brigade?.name || '',
    emoji: brigade?.emoji || '🛡️',
    zone: brigade?.zone || '',
    hierarchy: brigade?.hierarchy || 'Coordinador Seccional',
    sections: brigade?.sections?.join(', ') || '',
    status: brigade?.status || 'forming',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name: form.name.trim(),
      emoji: form.emoji,
      zone: form.zone.trim(),
      hierarchy: form.hierarchy,
      sections: form.sections.split(',').map(s => s.trim()).filter(Boolean),
      status: form.status,
    });
  };

  return (
    <div className="brigade-modal-overlay" onClick={onClose}>
      <div className="brigade-modal" onClick={e => e.stopPropagation()}>
        <div className="brigade-modal-header">
          <h2>{brigade ? 'Editar Brigada' : 'Nueva Brigada'}</h2>
          <button className="brigade-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form className="brigade-modal-form" onSubmit={handleSubmit}>
          {/* Emoji Picker */}
          <div className="brigade-form-group">
            <label>Insignia</label>
            <div className="brigade-emoji-picker">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  type="button"
                  className={`brigade-emoji-btn ${form.emoji === e ? 'active' : ''}`}
                  onClick={() => setForm(p => ({ ...p, emoji: e }))}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="brigade-form-group">
            <label>Nombre de la Brigada</label>
            <input
              className="brigade-form-input"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ej: Brigada Norte D3"
              required
            />
          </div>

          {/* Hierarchy Level */}
          <div className="brigade-form-group">
            <label>Nivel Jerárquico</label>
            <p className="brigade-form-hint">Define a qué nivel de la estructura pertenece esta brigada</p>
            <div className="brigade-hierarchy-selector">
              {HIERARCHY_LEVELS.map(level => (
                <button
                  key={level.value}
                  type="button"
                  className={`brigade-hierarchy-option ${form.hierarchy === level.value ? 'active' : ''}`}
                  style={{
                    '--h-color': level.color,
                    borderColor: form.hierarchy === level.value ? level.color : 'var(--border-color)',
                  }}
                  onClick={() => setForm(p => ({ ...p, hierarchy: level.value }))}
                >
                  <span
                    className="brigade-hierarchy-dot"
                    style={{ background: level.color }}
                  />
                  {level.label}
                </button>
              ))}
            </div>
          </div>

          {/* Zone */}
          <div className="brigade-form-group">
            <label>Zona / Distrito</label>
            <input
              className="brigade-form-input"
              value={form.zone}
              onChange={e => setForm(p => ({ ...p, zone: e.target.value }))}
              placeholder="Ej: Distrito 3 - Norte"
            />
          </div>

          {/* Sections */}
          <div className="brigade-form-group">
            <label>Secciones (separadas por coma)</label>
            <input
              className="brigade-form-input"
              value={form.sections}
              onChange={e => setForm(p => ({ ...p, sections: e.target.value }))}
              placeholder="Ej: 0841, 0842, 0843"
            />
          </div>

          {/* Status */}
          <div className="brigade-form-group">
            <label>Estado</label>
            <select
              className="brigade-form-select"
              value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
              disabled={!canChangeStatus}
            >
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>{cfg.label}</option>
              ))}
            </select>
            {!canChangeStatus && (
              <span className="brigade-form-lock-hint">
                <Lock size={11} /> No tienes permiso para cambiar el estado
              </span>
            )}
          </div>

          {/* Submit */}
          <div className="brigade-modal-actions">
            <button type="button" className="brigade-modal-btn ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="brigade-modal-btn primary">
              <Save size={16} /> {brigade ? 'Guardar Cambios' : 'Crear Brigada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
