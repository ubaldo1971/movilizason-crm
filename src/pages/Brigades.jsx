import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRole } from '../context/RoleContext';
import { usePermissions } from '../hooks/usePermissions';
import { useComms } from '../context/CommunicationContext';
import {
  Users, Plus, Search, ChevronDown, ChevronUp, Edit3,
  Trash2, UserPlus, UserMinus, Shield, Crown, Star,
  Hash, MapPin, CheckCircle, X, Save, AlertTriangle,
  BarChart3, Clock, MessageSquare, Eye, EyeOff, Lock, MessageCircle,
  ArrowRightLeft, Phone, Volume2, Video
} from 'lucide-react';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, arrayUnion, arrayRemove
} from '../lib/dbService';
import { db } from '../firebaseConfig';
import { FEDERAL_DISTRICTS, LOCAL_DISTRICTS, getSectionsForDistrict } from '../data/territoryData';
import TransferBrigadeModal from '../components/TransferBrigadeModal';
import './Brigades.css';

const STATUS_CONFIG = {
  active: { label: 'Activa', color: '#10b981', icon: CheckCircle },
  forming: { label: 'Formándose', color: '#f59e0b', icon: Clock },
  inactive: { label: 'Inactiva', color: '#6b7280', icon: EyeOff },
};

const HIERARCHY_LEVELS = [
  { value: 'Admin Estatal', label: 'Admin Estatal', color: '#f97316' },
  { value: 'Coordinador Distrital Federal', label: 'Coordinador Distrital Federal', color: '#3b82f6' },
  { value: 'Coordinador Distrital Local', label: 'Coordinador Distrital Local', color: '#0ea5e9' },
  { value: 'Coordinador Municipal', label: 'Coordinador Municipal', color: '#10b981' },
  { value: 'Coordinador Seccional', label: 'Coordinador Seccional', color: '#8b5cf6' },
  { value: 'Brigadista / Operador', label: 'Brigadista / Operador', color: '#eab308' },
];

const EMOJIS = ['🛡️', '⚔️', '🔥', '🦅', '⚡', '🏴', '🎯', '💪', '🚀', '🗡️', '🐺', '🦁'];

export default function Brigades() {
  const { role, ROLES, allUsers, currentUser } = useRole();
  const { hasPermission } = usePermissions();
  const { joinVoiceChannel } = useComms();
  const navigate = useNavigate();
  const [brigades, setBrigades] = useState([]);
  const [expandedBrigade, setExpandedBrigade] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBrigade, setEditingBrigade] = useState(null);
  const [showAddMember, setShowAddMember] = useState(null);
  const [transferringMember, setTransferringMember] = useState(null);
  const [sourceBrigadeForTransfer, setSourceBrigadeForTransfer] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'brigades'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBrigades(data);
    });
    return () => unsub();
  }, []);

  const canCreate       = hasPermission(role, 'brigades.create');
  const canEdit         = hasPermission(role, 'brigades.edit');
  const canDelete       = hasPermission(role, 'brigades.delete');
  const canAddMembers   = hasPermission(role, 'brigades.add_members');
  const canRemoveMembers = hasPermission(role, 'brigades.remove_members');
  const canSetLeader    = hasPermission(role, 'brigades.set_leader');
  const canChangeStatus = hasPermission(role, 'brigades.change_status');

  const filteredBrigades = useMemo(() => {
    if (!Array.isArray(brigades)) return [];
    if (!searchTerm) return brigades;
    const term = searchTerm.toLowerCase();
    return brigades.filter(b => {
      const nameMatch = b.name?.toLowerCase().includes(term) || false;
      const zoneMatch = b.zone?.toLowerCase().includes(term) || false;
      const leaderMatch = b.leader?.name?.toLowerCase().includes(term) || false;
      const membersMatch = b.members?.some(m => m.name?.toLowerCase().includes(term)) || false;
      return nameMatch || zoneMatch || leaderMatch || membersMatch;
    });
  }, [brigades, searchTerm]);

  const totalMembers = useMemo(() => {
    return brigades.reduce((acc, b) => {
      const memberCount = (b.members?.length || 0) + (b.leader ? 1 : 0);
      return acc + memberCount;
    }, 0);
  }, [brigades]);

  const activeBrigades = useMemo(() => {
    return brigades.filter(b => b.status === 'active').length;
  }, [brigades]);

  const avgScore = useMemo(() => {
    if (brigades.length === 0) return 0;
    const totalScore = brigades.reduce((acc, b) => acc + (b.stats?.score || 0), 0);
    return Math.round(totalScore / brigades.length);
  }, [brigades]);

  const handleCreateBrigade = async (data) => {
    try {
      const newBrigade = {
        ...data,
        members: [],
        leader: null,
        createdAt: new Date().toISOString().split('T')[0],
        stats: { tasksCompleted: 0, score: 0, pendingTasks: 0 },
      };
      await addDoc(collection(db, 'brigades'), newBrigade);
      setShowCreateModal(false);
      alert('¡Brigada creada con éxito!');
    } catch (err) {
      console.error("Error creating brigade:", err);
      alert(`Error al crear brigada: ${err.message}`);
    }
  };

  const handleDeleteBrigade = async (id) => {
    if (!canDelete) return;
    if (window.confirm('¿Estás seguro de eliminar esta brigada?')) {
      await deleteDoc(doc(db, 'brigades', id));
      if (expandedBrigade === id) setExpandedBrigade(null);
    }
  };

  const handleUpdateBrigade = async (id, updates) => {
    await updateDoc(doc(db, 'brigades', id), updates);
  };

  const handleAddMember = async (brigadeId, user) => {
    if (!canAddMembers || !user) return;
    const brigadeRef = doc(db, 'brigades', brigadeId);
    const firstName = user.displayName || user.name || 'Usuario';
    const lastName = user.surname || '';
    const fullName = `${firstName} ${lastName}`.trim();

    await updateDoc(brigadeRef, {
      members: arrayUnion({
        id: user.uid || user.id,
        name: fullName,
        role: user.role || 'Brigadista',
        joinedAt: new Date().toISOString().split('T')[0]
      })
    });

    const userId = user.uid || user.id;
    const b = brigades.find(br => br.id === brigadeId);
    if (userId && b) {
      await updateDoc(doc(db, 'users', userId), {
        brigadeId: b.id,
        brigadeName: (b.emoji || '') + ' ' + (b.name || ''),
        inStructure: false
      });
    }
  };

  const handleRemoveMember = async (brigadeId, member) => {
    if (!canRemoveMembers) return;
    if (!window.confirm(`¿Seguro que desea remover a ${member.name}?`)) return;
    const brigadeRef = doc(db, 'brigades', brigadeId);
    await updateDoc(brigadeRef, {
      members: arrayRemove(member)
    });

    const userId = member.id || member.uid;
    if (userId) {
      await updateDoc(doc(db, 'users', userId), {
        brigadeId: null,
        brigadeName: 'Sin brigada'
      });
    }
  };

  const handleTransferExecute = async (member, targetBrigade) => {
    try {
      await updateDoc(doc(db, 'brigades', sourceBrigadeForTransfer.id), {
        members: arrayRemove(member)
      });
      await updateDoc(doc(db, 'brigades', targetBrigade.id), {
        members: arrayUnion({
          ...member,
          joinedAt: new Date().toISOString().split('T')[0]
        })
      });
      const userId = member.id || member.uid;
      if (userId) {
        await updateDoc(doc(db, 'users', userId), {
          brigadeId: targetBrigade.id,
          brigadeName: targetBrigade.emoji + ' ' + targetBrigade.name
        });
      }
      setTransferringMember(null);
      setSourceBrigadeForTransfer(null);
    } catch (err) {
      console.error("Error executing transfer:", err);
      alert("Error al ejecutar la transferencia");
    }
  };

  const handleSetLeader = async (brigadeId, member) => {
    if (!canSetLeader) return;
    await updateDoc(doc(db, 'brigades', brigadeId), {
      leader: {
        id: member.id,
        name: member.name,
        role: member.role || 'Líder de Brigada'
      }
    });
  };

  const getScoreColor = (score) => {
    if (score >= 90) return '#10b981';
    if (score >= 75) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getHierarchyColor = (h) => {
    return HIERARCHY_LEVELS.find(l => l.value === h)?.color || 'var(--text-secondary)';
  };

  const handleStartInternalCall = (userId) => {
    joinVoiceChannel('comando', currentUser.uid);
    navigate('/communication');
  };

  const handleStartPrivateChat = (userId) => {
    navigate(`/messages?uid=${userId}`);
  };

  const handleJoinBrigadeVoice = (brigadeId) => {
    joinVoiceChannel(brigadeId, currentUser.uid);
    navigate('/communication');
  };

  return (
    <div className="brigades-container animate-fade-in">
      <header className="brigades-header">
        <div className="brigades-header-left">
          <div className="brigades-header-icon">
            <Shield size={28} />
          </div>
          <div>
            <h1 className="brigades-title">Cuerpos de Brigada</h1>
            <p className="brigades-subtitle">Organiza equipos tácticos y supervisa su despliegue operativo.</p>
          </div>
        </div>

        <div className="brigades-header-actions">
          <div className="brigades-search-bar">
            <Search size={18} className="brigades-search-icon" />
            <input
              type="text"
              className="brigades-search-input"
              placeholder="Buscar brigada, líder o miembro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {canCreate && (
            <button className="brigades-create-btn" onClick={() => setShowCreateModal(true)}>
              <Plus size={18} /> Nueva Brigada
            </button>
          )}
        </div>
      </header>

      <div className="brigades-stats">
        <div className="brigades-stat">
          <div className="stat-info">
            <span className="stat-label">Total Brigadas</span>
            <span className="stat-value">{brigades.length}</span>
          </div>
        </div>
        <div className="brigades-stat">
          <div className="stat-info">
            <span className="stat-label">Total Operadores</span>
            <span className="stat-value">{totalMembers}</span>
          </div>
        </div>
        <div className="brigades-stat">
          <div className="stat-info">
            <span className="stat-label">Brigadas Activas</span>
            <span className="stat-value" style={{ color: '#10b981' }}>{activeBrigades}</span>
          </div>
        </div>
        <div className="brigades-stat">
          <div className="stat-info">
            <span className="stat-label">Promedio Desempeño</span>
            <span className="stat-value" style={{ color: getScoreColor(avgScore) }}>{avgScore}%</span>
          </div>
        </div>
      </div>

      <div className="brigades-grid">
        {filteredBrigades.map((brigade) => {
          const isExpanded = expandedBrigade === brigade.id;
          const statusCfg = STATUS_CONFIG[brigade.status] || STATUS_CONFIG.forming;
          const StatusIcon = statusCfg.icon;

          return (
            <div 
              key={brigade.id} 
              className={`brigade-card ${isExpanded ? 'expanded' : ''}`}
              style={{ borderTopColor: getHierarchyColor(brigade.hierarchy) }}
            >
              <div 
                className="brigade-card-header"
                onClick={() => setExpandedBrigade(isExpanded ? null : brigade.id)}
              >
                <div className="brigade-card-left">
                  <span className="brigade-emoji">{brigade.emoji}</span>
                  <div>
                    <h3 className="brigade-name">{brigade.name}</h3>
                    <div className="brigade-meta">
                      {brigade.distritoFed && (
                        <span className="brigade-meta-tag fed">
                          <Shield size={10} /> {brigade.distritoFed.replace('fed-', 'DF ')}
                        </span>
                      )}
                      {brigade.distritoLoc && (
                        <span className="brigade-meta-tag loc">
                          <MapPin size={10} /> {brigade.distritoLoc.replace('loc-', 'DL ')}
                        </span>
                      )}
                      {brigade.sections?.length > 0 && (
                        <span className="brigade-meta-tag sec">
                          <Hash size={10} /> {brigade.sections.length} Sec.
                        </span>
                      )}
                      {brigade.leader && (
                        <span className="brigade-meta-tag leader">
                          <Crown size={10} /> {brigade.leader.name}
                        </span>
                      )}
                      <span className="brigade-status" style={{ color: statusCfg.color }}>
                        <StatusIcon size={11} /> {statusCfg.label}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="brigade-card-right">
                  <div className="brigade-quick-stats">
                    <span className="brigade-member-count">
                      <Users size={13} /> {(brigade.members?.length || 0) + (brigade.leader ? 1 : 0)}
                    </span>
                    <span
                      className="brigade-score"
                      style={{ color: getScoreColor(brigade.stats?.score || 0) }}
                    >
                      {brigade.stats?.score ?? 0}%
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </div>

              {isExpanded && (
                <div className="brigade-expanded">
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
                          <span className="brigade-member-name">{brigade.leader?.name || 'Líder s/n'}</span>
                          <span className="brigade-member-role">{brigade.leader?.role || 'Líder'}</span>
                          <div className="flex gap-2" style={{ marginTop: '0.35rem' }}>
                               <button 
                                onClick={() => handleStartInternalCall(brigade.leader.id)}
                                className="badge-new success" 
                                style={{ fontSize: '0.65rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                               >
                                 <Volume2 size={10} /> Canal Voz
                               </button>
                               <button 
                                onClick={() => handleStartPrivateChat(brigade.leader.id)}
                                className="badge-new info" 
                                style={{ fontSize: '0.65rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                               >
                                 <MessageSquare size={10} /> Mensaje
                               </button>
                          </div>
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

                  <div className="brigade-section">
                    <div className="brigade-section-title-row">
                      <h4 className="brigade-section-title">
                        <Users size={14} /> Miembros ({brigade.members?.length || 0})
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

                    {showAddMember === brigade.id && (
                      <div className="brigade-add-panel">
                        <p className="brigade-add-label">Operadores disponibles:</p>
                        {allUsers
                          .filter(u => (u.uid || u.id) !== currentUser.uid)
                          .filter(u => !u.brigadeId)
                          .filter(u => !u.inStructure)
                          .filter(u => !brigade.members?.some(m => m.id === (u.uid || u.id)))
                          .filter(u => !brigade.leader || brigade.leader.id !== (u.uid || u.id))
                          .map(user => (
                          <div key={user.uid || user.id} className="brigade-add-user-row">
                            <div className="brigade-member-avatar">
                              <span>{user.displayName?.[0] || 'U'}</span>
                            </div>
                            <div className="brigade-member-info">
                              <span className="brigade-member-name">{user.displayName} {user.surname}</span>
                              <span className="brigade-member-role">{user.role}</span>
                            </div>
                            <button
                              className="brigade-action-btn success"
                              onClick={() => handleAddMember(brigade.id, user)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="brigade-members-list">
                      {(brigade.members || []).map(member => (
                        <div key={member.id} className="brigade-member-row">
                          <div className="brigade-member-avatar">
                            <span>{member.name?.[0] || '?'}</span>
                          </div>
                          <div className="brigade-member-info">
                            <span className="brigade-member-name">
                              {member.name || 'Usuario'}
                            </span>
                            <div className="flex gap-2" style={{ marginTop: '0.2rem' }}>
                                <button onClick={() => handleStartInternalCall(member.id)} style={{ color: 'var(--color-primary-light)' }} title="Voz">
                                  <Volume2 size={12} />
                                </button>
                                <button onClick={() => handleStartPrivateChat(member.id)} style={{ color: 'var(--status-info)' }} title="Mensaje">
                                  <MessageSquare size={12} />
                                </button>
                            </div>
                          </div>
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
                                onClick={() => handleRemoveMember(brigade.id, member)}
                                title="Remover"
                              >
                                <UserMinus size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="brigade-section">
                    <h4 className="brigade-section-title">
                      <Hash size={14} /> Secciones Asignadas
                    </h4>
                    <div className="brigade-sections-row">
                      {(brigade.sections || []).map(sec => (
                        <span key={sec} className="brigade-section-tag">{sec}</span>
                      ))}
                    </div>
                  </div>

                  <div className="brigade-actions-row">
                    {canEdit && (
                      <button className="brigade-action-main" onClick={() => setEditingBrigade(brigade)}>
                        <Edit3 size={14} /> Editar
                      </button>
                    )}
                    <button 
                      className="brigade-action-main chat" 
                      onClick={() => navigate(`/messages?brigadeId=${brigade.id}`)}
                    >
                      <MessageSquare size={14} /> Abrir Chat
                    </button>
                    <button 
                      className="brigade-action-main voice" 
                      onClick={() => handleJoinBrigadeVoice(brigade.id)}
                      style={{ backgroundColor: 'var(--status-success)', color: 'white' }}
                    >
                      <Volume2 size={14} /> Canal de Voz
                    </button>
                    {canDelete && (
                      <button className="brigade-action-main danger" onClick={() => handleDeleteBrigade(brigade.id)}>
                        <Trash2 size={14} /> Eliminar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

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

      {transferringMember && sourceBrigadeForTransfer && (
        <TransferBrigadeModal
          member={transferringMember}
          sourceBrigade={sourceBrigadeForTransfer}
          allBrigades={brigades}
          onTransfer={handleTransferExecute}
          onCancel={() => {
            setTransferringMember(null);
            setSourceBrigadeForTransfer(null);
          }}
        />
      )}
    </div>
  );
}

function BrigadeModal({ brigade, canChangeStatus, onSave, onClose }) {
  const [form, setForm] = useState({
    name: brigade?.name || '',
    emoji: brigade?.emoji || '🛡️',
    distritoFed: brigade?.distritoFed || '',
    distritoLoc: brigade?.distritoLoc || '',
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
      distritoFed: form.distritoFed,
      distritoLoc: form.distritoLoc,
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

          <div className="brigade-form-group">
            <label>Nivel Jerárquico</label>
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

          <div className="brigade-form-row">
            <div className="brigade-form-group">
              <label>Distrito Federal</label>
              <select
                className="brigade-form-select"
                value={form.distritoFed}
                onChange={e => setForm(p => ({ ...p, distritoFed: e.target.value }))}
                required
              >
                <option value="">-- Seleccionar --</option>
                {FEDERAL_DISTRICTS.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="brigade-form-group">
              <label>Distrito Local</label>
              <select
                className="brigade-form-select"
                value={form.distritoLoc}
                onChange={e => setForm(p => ({ ...p, distritoLoc: e.target.value }))}
                required
              >
                <option value="">-- Seleccionar --</option>
                {LOCAL_DISTRICTS.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="brigade-form-group">
            <label>Secciones Electorales</label>
            <input
              className="brigade-form-input"
              value={form.sections}
              onChange={e => setForm(p => ({ ...p, sections: e.target.value }))}
              placeholder="Ej: 0841, 0842"
            />
          </div>

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
          </div>

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
