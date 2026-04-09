import { useState, useMemo } from 'react';
import { useRole } from '../context/RoleContext';
import { Navigate } from 'react-router-dom';
import {
  ShieldAlert, Shield, Check, X, Save, RotateCcw,
  ChevronDown, ChevronRight, Info, Lock, Unlock,
  Users, ClipboardList, MessageSquare, Map, BarChart3, Swords, Bell, Image as ImageIcon,
  Search, User, RefreshCw, UserPlus
} from 'lucide-react';
import { usePermissions, PERMISSION_CATEGORIES, CONFIGURABLE_ROLES } from '../hooks/usePermissions';
import { useAlarm } from '../hooks/useAlarm';
import { generateRandom6DigitPin } from '../lib/dbService';
import './Permissions.css';

const ROLE_SHORT = {
  'Admin Estatal': 'Admin Est.',
  'Coordinador Distrital Federal': 'Coord. D. Fed.',
  'Coordinador Distrital Local': 'Coord. D. Loc.',
  'Coordinador Seccional': 'Coord. Secc.',
  'Brigadista / Operador': 'Brigadista',
};

const ROLE_COLORS = {
  'Admin Estatal': '#f97316',
  'Coordinador Distrital Federal': '#3b82f6',
  'Coordinador Distrital Local': '#0ea5e9',
  'Coordinador Seccional': '#8b5cf6',
  'Brigadista / Operador': '#eab308',
};

const CATEGORY_ICONS = {
  brigadas: Swords,
  estructura: Users,
  tareas: ClipboardList,
  mensajes: MessageSquare,
  territorio: Map,
  reportes: BarChart3,
};

export default function Permissions() {
  const { 
    role, ROLES, 
    requirePinForTasks, setRequirePinForTasks,
    requireEvidence, setRequireEvidence,
    allUsers, updateUserPin, registerUser, formatName, updateProfile
  } = useRole();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const {
    permissionMatrix, loading, saving,
    togglePermission, savePermissions, resetToDefaults, hasPermission
  } = usePermissions();
  const { triggerAlarm } = useAlarm();

  const [activeTab, setActiveTab] = useState('permissions'); // 'permissions' | 'users'
  const [userSearch, setUserSearch] = useState('');
  const [editingPins, setEditingPins] = useState({}); // { userId: newPin }
  const [pinSuccess, setPinSuccess] = useState({}); // { userId: bool }

  // Registration states
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    displayName: '',
    surname: '',
    role: ROLES.BRIGADISTA,
    section: '',
    distFederal: '',
    distLocal: '',
    phone: '',
    pin: ''
  });
  const [isRegistering, setIsRegistering] = useState(false);

  const [expandedCategories, setExpandedCategories] = useState(
    Object.keys(PERMISSION_CATEGORIES).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!newUserForm.displayName || !newUserForm.role) return;
    
    setIsRegistering(true);
    const pin = newUserForm.pin || generateRandom6DigitPin();
    const uid = await registerUser({ ...newUserForm, pin });
    
    if (uid) {
      setShowRegisterModal(false);
      setNewUserForm({
        displayName: '',
        surname: '',
        role: ROLES.BRIGADISTA,
        section: '',
        distFederal: '',
        distLocal: '',
        phone: '',
        pin: ''
      });
    }
    setIsRegistering(false);
  };
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  if (!isSuperAdmin) {
    return (
      <div className="flex-col items-center justify-center animate-fade-in" style={{ height: '50vh', textAlign: 'center' }}>
        <ShieldAlert size={64} color="var(--status-error)" style={{ marginBottom: '1rem' }} />
        <h1 style={{ fontSize: '1.5rem', color: 'var(--text-primary)' }}>Acceso Denegado</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Esta página es exclusiva del <strong>Super Admin</strong>.
        </p>
      </div>
    );
  }

  const toggleCategory = (key) => {
    setExpandedCategories(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    await savePermissions();
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  const handleReset = () => {
    resetToDefaults();
    setShowResetConfirm(false);
  };

  // Count permissions per role
  const countPerms = (roleName) => {
    const perms = permissionMatrix[roleName] || {};
    return Object.values(perms).filter(Boolean).length;
  };

  const totalActions = Object.values(PERMISSION_CATEGORIES)
    .reduce((sum, cat) => sum + Object.keys(cat.actions).length, 0);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => 
      u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.uid?.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [allUsers, userSearch]);

  const handleUpdatePin = async (userId) => {
    const newPin = editingPins[userId];
    if (!newPin || newPin.length !== 6) return;
    
    await updateUserPin(userId, newPin);
    setPinSuccess(prev => ({ ...prev, [userId]: true }));
    setTimeout(() => setPinSuccess(prev => ({ ...prev, [userId]: false })), 3000);
  };

  const handleGenerateRandomPin = (userId) => {
    const randomPin = generateRandom6DigitPin();
    setEditingPins(prev => ({ ...prev, [userId]: randomPin }));
  };

  return (
    <div className="permissions-page animate-fade-in">
      {/* Header */}
      <div className="perms-header">
        <div className="perms-header-left">
          <div className="perms-header-icon">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="perms-title">Control de Seguridad del Sistema</h1>
            <p className="perms-subtitle">
              Configura permisos y gestiona credenciales de acceso de 6 dígitos
            </p>
          </div>
        </div>
        
        {activeTab === 'permissions' && (
          <div className="perms-header-actions">
            <button
              className="perms-btn ghost"
              onClick={() => setShowResetConfirm(true)}
            >
              <RotateCcw size={15} /> Restaurar
            </button>
            <button
              className={`perms-btn primary ${savedFeedback ? 'saved' : ''}`}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? (
                <span className="perms-spinner" />
              ) : savedFeedback ? (
                <><Check size={15} /> Guardado</>
              ) : (
                <><Save size={15} /> Guardar Config</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="perms-tabs">
        <div 
          className={`perms-tab ${activeTab === 'permissions' ? 'active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          <Shield size={16} /> Matrices de Permisos
        </div>
        <div 
          className={`perms-tab ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} /> Gestión de Usuarios y PINs
        </div>
      </div>

      {activeTab === 'permissions' ? (
        <div className="perms-content-wrapper animate-fade-in">
          {/* Super Admin Note */}
          <div className="perms-sa-note">
            <Lock size={14} />
            <span>
              El <strong>Super Admin</strong> siempre tiene <strong>todos los permisos</strong> y no puede ser restringido.
            </span>
          </div>

      {/* PIN for Tasks Toggle */}
      <div className="perms-toggles-grid">
        <div className="perms-toggle-card">
          <div className="perms-toggle-info">
            <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.2rem' }}>
              <Lock size={16} color="var(--text-secondary)" />
              <h3 style={{ margin: 0 }}>Verificación PIN para Tareas</h3>
            </div>
            <p>Los brigadistas y coordinadores deben ingresar su PIN al concluir una tarea.</p>
          </div>
          <div
            className={`perms-toggle-switch ${requirePinForTasks ? 'on' : ''}`}
            onClick={() => setRequirePinForTasks(!requirePinForTasks)}
          >
            <div className="perms-toggle-knob" />
          </div>
        </div>

        <div className="perms-toggle-card">
          <div className="perms-toggle-info">
            <div className="flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', marginBottom: '0.2rem' }}>
              <ImageIcon size={16} color="var(--text-secondary)" />
              <h3 style={{ margin: 0 }}>Exigir Evidencia Fotográfica</h3>
              <span className="badge-new" style={{ marginLeft: '0.5rem', fontSize: '10px' }}>POLÍTICA</span>
            </div>
            <p>Bloquea el botón de "Confirmar" hasta que el usuario adjunte al menos una foto de evidencia.</p>
          </div>
          <div
            className={`perms-toggle-switch ${requireEvidence ? 'on' : ''}`}
            onClick={() => setRequireEvidence(!requireEvidence)}
          >
            <div className="perms-toggle-knob" />
          </div>
        </div>
      </div>
      
      {/* Critical Alert Diagnostics */}
      <div className="perms-toggle-card diagnostic">
        <div className="perms-toggle-info">
          <div className="flex items-center gap-2" style={{ marginBottom: '0.2rem', display: 'flex', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Diagnóstico de Alerta Crítica</h3>
            <span className="badge-new" style={{ marginLeft: '0.5rem' }}>NUEVO</span>
          </div>
          <p>Verifica que el sonido y la vibración funcionen correctamente en este dispositivo.</p>
        </div>
        <button 
          className="perms-btn diagnostic-btn"
          onClick={() => triggerAlarm({
            id: 'test-alarm-diag',
            type: 'test',
            senderName: 'Diagnóstico del Sistema',
            text: 'Esta es una prueba de la alerta crítica de MovilizaSon. El sonido y la vibración se activarán durante 30 segundos o hasta que presiones RECIBIDO.'
          })}
        >
          <Bell size={16} /> Probar Alerta
        </button>
      </div>

      {/* Role Summary Cards */}
      <div className="perms-role-summary">
        {CONFIGURABLE_ROLES.map(roleName => (
          <div key={roleName} className="perms-role-card">
            <div
              className="perms-role-dot"
              style={{ background: ROLE_COLORS[roleName] }}
            />
            <div className="perms-role-card-info">
              <span className="perms-role-name">{ROLE_SHORT[roleName]}</span>
              <span className="perms-role-count">
                {countPerms(roleName)}/{totalActions}
              </span>
            </div>
            <div className="perms-role-bar">
              <div
                className="perms-role-bar-fill"
                style={{
                  width: `${(countPerms(roleName) / totalActions) * 100}%`,
                  background: ROLE_COLORS[roleName],
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="perms-matrix">
        {/* Header row */}
        <div className="perms-matrix-header">
          <div className="perms-matrix-label-cell">Permiso</div>
          {CONFIGURABLE_ROLES.map(roleName => (
            <div
              key={roleName}
              className="perms-matrix-role-cell"
              title={roleName}
            >
              <span
                className="perms-matrix-role-dot"
                style={{ background: ROLE_COLORS[roleName] }}
              />
              <span className="perms-matrix-role-name">{ROLE_SHORT[roleName]}</span>
            </div>
          ))}
        </div>

        {/* Categories */}
        {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => {
          const isExpanded = expandedCategories[catKey];
          const CatIcon = CATEGORY_ICONS[catKey] || Shield;

          return (
            <div key={catKey} className="perms-matrix-category">
              {/* Category Header */}
              <div
                className="perms-matrix-cat-header"
                onClick={() => toggleCategory(catKey)}
              >
                <div className="perms-matrix-cat-left">
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <CatIcon size={14} />
                  <span>{category.label}</span>
                </div>
                <span className="perms-matrix-cat-count">
                  {Object.keys(category.actions).length} permisos
                </span>
              </div>

              {/* Action Rows */}
              {isExpanded && Object.entries(category.actions).map(([actionKey, actionDef]) => (
                <div key={actionKey} className="perms-matrix-row">
                  <div className="perms-matrix-label-cell">
                    <span className="perms-action-label">{actionDef.label}</span>
                    <span className="perms-action-desc">{actionDef.description}</span>
                  </div>
                  {CONFIGURABLE_ROLES.map(roleName => {
                    const isAllowed = permissionMatrix[roleName]?.[actionKey] ?? false;
                    return (
                      <div key={roleName} className="perms-matrix-check-cell">
                        <button
                          className={`perms-checkbox ${isAllowed ? 'checked' : ''}`}
                          onClick={() => togglePermission(roleName, actionKey)}
                          title={`${roleName}: ${actionDef.label}`}
                        >
                          {isAllowed ? <Check size={14} /> : null}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}
          </div>
        </div>
      ) : (
        /* User Management Tab Content */
        <div className="users-mgmt-container animate-fade-in">
          <div className="users-filters">
            <div className="users-search">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nombre, rol o UID..." 
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>
            
            <button 
              className="perms-btn primary" 
              style={{ height: '42px', padding: '0 1.5rem', borderRadius: '12px' }}
              onClick={() => setShowRegisterModal(true)}
            >
              <UserPlus size={18} /> Nuevo Registro
            </button>

            <div className="perms-sa-note" style={{ margin: 0, padding: '0.6rem 1rem' }}>
              <Info size={14} />
              <span>{filteredUsers.length} usuarios registrados</span>
            </div>
          </div>

          <div className="users-grid">
            {filteredUsers.map(user => {
              const currentPinInput = editingPins[user.id] ?? user.pin ?? '------';
              const isEdited = currentPinInput !== user.pin && currentPinInput.length === 6;
              const isSuper = user.role === ROLES.SUPER_ADMIN;

              return (
                <div key={user.id} className="user-mgmt-card">
                  <div className="user-card-header">
                    <div className="user-avatar">
                      {user.displayName?.charAt(0) || 'U'}
                    </div>
                    <div className="user-info-main">
                      <h3 className="user-name">{formatName(user)}</h3>
                      <span 
                        className="user-role-badge"
                        style={{ 
                          background: `${ROLE_COLORS[user.role] || '#666'}15`, 
                          color: ROLE_COLORS[user.role] || '#666',
                          border: `1px solid ${ROLE_COLORS[user.role] || '#666'}30`
                        }}
                      >
                        {user.role}
                      </span>
                      {user.registeredAt && (
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.2rem' }}>
                          📅 Ingreso: {user.registeredAt}
                        </span>
                      )}
                    </div>
                    {isSuper && <Shield size={18} color="#ef4444" title="Super Admin" />}
                  </div>

                  <div className="user-card-pin-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                    <div className="pin-label">
                      <MessageSquare size={12} /> Contacto
                    </div>
                    <div className="flex gap-2">
                       <input 
                        type="tel" 
                        className="input"
                        style={{ height: '36px', fontSize: '0.8rem' }}
                        placeholder="Teléfono (10 dígitos)"
                        defaultValue={user.phone || ''}
                        onBlur={async (e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          if (val !== user.phone) {
                            await updateProfile(user.id, { phone: val });
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="user-card-pin-section">
                    <div className="pin-label">
                      <Lock size={12} /> Gestión de PIN (6 dígitos)
                    </div>
                    <div className="pin-input-row">
                      <input 
                        type="text" 
                        className="pin-input-styled"
                        maxLength={6}
                        value={editingPins[user.id] !== undefined ? editingPins[user.id] : user.pin}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setEditingPins(prev => ({ ...prev, [user.id]: val }));
                        }}
                        placeholder="000000"
                        disabled={isSuper}
                      />
                      <div className="pin-actions">
                        <button 
                          className="btn-pin"
                          onClick={() => handleGenerateRandomPin(user.id)}
                          title="Generar PIN Aleatorio"
                          disabled={isSuper}
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button 
                          className={`btn-pin save ${isEdited ? 'active' : ''}`}
                          disabled={!isEdited || isSuper}
                          onClick={() => handleUpdatePin(user.id)}
                          title="Guardar Nuevo PIN"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                    {pinSuccess[user.id] && (
                      <div className="pin-success-toast">
                        PIN actualizado correctamente
                      </div>
                    )}
                    {isSuper && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        El PIN del Super Admin no puede ser modificado desde esta interfaz.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="perms-modal-overlay" onClick={() => setShowRegisterModal(false)}>
          <div className="perms-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="flex items-center gap-3" style={{ marginBottom: '1.5rem' }}>
              <div style={{ padding: '10px', background: 'var(--color-primary-dim)', color: 'var(--color-primary)', borderRadius: '12px' }}>
                <UserPlus size={24} />
              </div>
              <div>
                <h3 style={{ margin: 0 }}>Nuevo Registro de Militante</h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tutorial Pilot: Fase de Registro</p>
              </div>
            </div>

            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="flex gap-3">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Nombre</label>
                  <input 
                    type="text" 
                    className="input" 
                    required
                    value={newUserForm.displayName} 
                    onChange={e => setNewUserForm({...newUserForm, displayName: e.target.value})} 
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Apellido</label>
                  <input 
                    type="text" 
                    className="input" 
                    value={newUserForm.surname} 
                    onChange={e => setNewUserForm({...newUserForm, surname: e.target.value})} 
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Rol Operativo</label>
                <select 
                  className="input"
                  value={newUserForm.role}
                  onChange={e => setNewUserForm({...newUserForm, role: e.target.value})}
                >
                  {Object.values(ROLES).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Teléfono</label>
                  <input 
                    type="tel" 
                    className="input" 
                    placeholder="10 dígitos"
                    maxLength={10}
                    value={newUserForm.phone} 
                    onChange={e => setNewUserForm({...newUserForm, phone: e.target.value.replace(/\D/g, '')})} 
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                   <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>Seccional</label>
                   <input 
                    type="text" 
                    className="input" 
                    placeholder="Ej. 0841"
                    value={newUserForm.section} 
                    onChange={e => setNewUserForm({...newUserForm, section: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600 }}>PIN (Opcional)</label>
                  <input 
                    type="text" 
                    className="input" 
                    placeholder="Generar auto"
                    maxLength={6}
                    value={newUserForm.pin} 
                    onChange={e => setNewUserForm({...newUserForm, pin: e.target.value.replace(/\D/g, '')})} 
                  />
                </div>
              </div>

              <div className="perms-modal-actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="perms-btn ghost" onClick={() => setShowRegisterModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="perms-btn primary" disabled={isRegistering}>
                  {isRegistering ? 'Registrando...' : 'Registrar Brigadista'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirm Modal */}
      {showResetConfirm && (
        <div className="perms-modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="perms-modal" onClick={e => e.stopPropagation()}>
            <ShieldAlert size={40} color="#ef4444" />
            <h3>¿Restaurar permisos?</h3>
            <p>Se restaurarán todos los permisos a su configuración por defecto. Los cambios no guardados se perderán.</p>
            <div className="perms-modal-actions">
              <button className="perms-btn ghost" onClick={() => setShowResetConfirm(false)}>
                Cancelar
              </button>
              <button className="perms-btn danger" onClick={handleReset}>
                <RotateCcw size={14} /> Restaurar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
