import { useState } from 'react';
import { useRole } from '../context/RoleContext';
import { Navigate } from 'react-router-dom';
import {
  ShieldAlert, Shield, Check, X, Save, RotateCcw,
  ChevronDown, ChevronRight, Info, Lock, Unlock,
  Users, ClipboardList, MessageSquare, Map, BarChart3, Swords, Bell
} from 'lucide-react';
import { usePermissions, PERMISSION_CATEGORIES, CONFIGURABLE_ROLES } from '../hooks/usePermissions';
import { useAlarm } from '../hooks/useAlarm';
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
  const { role, ROLES, requirePinForTasks, setRequirePinForTasks } = useRole();
  const isSuperAdmin = role === ROLES.SUPER_ADMIN;
  const {
    permissionMatrix, loading, saving,
    togglePermission, savePermissions, resetToDefaults, hasPermission
  } = usePermissions();
  const { triggerAlarm } = useAlarm();

  const [expandedCategories, setExpandedCategories] = useState(
    Object.keys(PERMISSION_CATEGORIES).reduce((acc, key) => ({ ...acc, [key]: true }), {})
  );
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

  return (
    <div className="permissions-page animate-fade-in">
      {/* Header */}
      <div className="perms-header">
        <div className="perms-header-left">
          <div className="perms-header-icon">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="perms-title">Control de Permisos y Seguridad</h1>
            <p className="perms-subtitle">
              Configura qué puede hacer cada nivel jerárquico en la plataforma
            </p>
          </div>
        </div>
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
      </div>

      {/* Super Admin Note */}
      <div className="perms-sa-note">
        <Lock size={14} />
        <span>
          El <strong>Super Admin</strong> siempre tiene <strong>todos los permisos</strong> y no puede ser restringido.
        </span>
      </div>

      {/* PIN for Tasks Toggle */}
      <div className="perms-toggle-card">
        <div className="perms-toggle-info">
          <h3>Verificación PIN para Tareas</h3>
          <p>Los brigadistas y coordinadores deben ingresar su PIN al concluir una tarea.</p>
        </div>
        <div
          className={`perms-toggle-switch ${requirePinForTasks ? 'on' : ''}`}
          onClick={() => setRequirePinForTasks(!requirePinForTasks)}
        >
          <div className="perms-toggle-knob" />
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
