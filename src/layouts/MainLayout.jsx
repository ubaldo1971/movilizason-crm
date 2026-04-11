import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Map, MessageSquare, ClipboardList, 
  UserPlus, FileCheck, AlertTriangle, Trophy, User, 
  LogOut, Shield, ChevronDown, Users, BarChart3, Bell, Scale, Swords,
  Image as ImageIcon, Volume2, TrendingUp, Layers
} from 'lucide-react';
import { useRole } from '../context/RoleContext';
import { useNotifications } from '../hooks/useNotifications';
import NotificationCenter from '../components/NotificationCenter';
import AlarmOverlay from '../components/AlarmOverlay';
import { useAlarm } from '../hooks/useAlarm';
import { useConversations } from '../hooks/useMessages';
import './MainLayout.css';

const navItems = [
  { path: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { path: '/summary', label: 'Resumen Ejecutivo', icon: TrendingUp, highRankOnly: true },
  { path: '/messages', label: 'Mensajes', icon: MessageSquare, badge: true },
  { path: '/territory', label: 'Territorio', icon: Map },
  { path: '/assets', label: 'Catálogo de Activos', icon: Layers, highRankOnly: true },
  { path: '/communication', label: 'Comando Central', icon: Volume2 },
  { path: '/tasks', label: 'Tareas', icon: ClipboardList },
  { path: '/estructura', label: 'Estructura', icon: Users, highRankOnly: true },
  { path: '/brigades', label: 'Brigadas', icon: Swords },
  { path: '/capture', label: 'Captura', icon: UserPlus },
  { path: '/commitments', label: 'Compromisos', icon: FileCheck },
  { path: '/performance', label: 'Desempeño', icon: BarChart3 },
  { path: '/scoring', label: 'Ponderación', icon: Scale, superAdminOnly: true },
  { path: '/support', label: 'Soporte', icon: ImageIcon },
  { path: '/reports', label: 'Reportes', icon: AlertTriangle },
  { path: '/incentives', label: 'Incentivos', icon: Trophy },
  { path: '/profile', label: 'Perfil', icon: User },
  { path: '/permissions', label: 'Permisos', icon: Shield, adminOnly: true },
];

export default function MainLayout() {
  const { 
    role = 'Invitado', 
    ROLES = {}, 
    currentUser = {}, 
    setCurrentUser = () => {}, 
    updateProfile = async () => {},
    allUsers = [], 
    currentUserAssignments: assignments = {} 
  } = useRole();
  const navigate = useNavigate();
  const location = useLocation();
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { isAlarming, alarmMessage, triggerAlarm, stopAlarm } = useAlarm();
  const dismissedAlarmIds = useRef(new Set());
  
  const CURRENT_USER_ID = currentUser?.uid || 'admin_demo';
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearNotification 
  } = useNotifications(CURRENT_USER_ID);

  const { conversations } = useConversations(CURRENT_USER_ID, role, assignments);

  const isMessagesPage = location.pathname === '/messages';

  // Global Alarm Monitor (Foreground Messages)
  useEffect(() => {
    if (conversations.length > 0) {
      // Find any conversation with an alarm that is NOT from the current user
      const alarmingConvo = conversations.find(c => 
        c.lastMessage?.isAlarm && 
        c.lastMessage?.sentBy !== CURRENT_USER_ID &&
        !dismissedAlarmIds.current.has(c.lastMessage.id || (c.id + c.updatedAt))
      );

      if (alarmingConvo) {
        const msgId = alarmingConvo.lastMessage.id || (alarmingConvo.id + alarmingConvo.updatedAt);
        if (!isAlarming || alarmMessage?.id !== msgId) {
          triggerAlarm({
            ...alarmingConvo.lastMessage,
            id: msgId,
            senderName: alarmingConvo.lastMessage.senderName || alarmingConvo.brigadeName || 'Alerta Crítica'
          });
        }
      }
    }
  }, [conversations, isAlarming, alarmMessage, triggerAlarm, CURRENT_USER_ID]);

  const handleDismissAlarm = () => {
    if (alarmMessage?.id) {
      dismissedAlarmIds.current.add(alarmMessage.id);
    }
    stopAlarm();
  };

  const handleLogout = () => {
    navigate('/login');
  };

  // Dynamic Identities for Simulator
  const dynamicIdentities = [
    { uid: 'admin_demo', displayName: 'Super', surname: 'Admin', role: 'Super Admin', pin: '000000' },
    ...allUsers.filter(u => u.uid !== 'admin_demo').sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5)
  ];

  return (
    <div className="layout-container">
      {/* Sidebar - Desktop Only */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <Shield className="logo-icon" />
            <span className="logo-text">MovilizaSon</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              className={`sidebar-bell-btn ${unreadCount > 0 ? 'bell-warning-blink' : ''}`} 
              onClick={() => setShowNotifications(true)}
              title="Centro de Alertas"
              style={{ position: 'relative' }}
            >

              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="notification-badge-pulse">{unreadCount}</span>
              )}
            </button>
            <span className="logo-badge">CRM</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.filter(item => {
            if (item.adminOnly && role !== ROLES.SUPER_ADMIN) return false;
            if (item.superAdminOnly && role !== ROLES.SUPER_ADMIN) return false;
            if (item.highRankOnly && role !== ROLES.SUPER_ADMIN && role !== ROLES.ADMIN_ESTATAL) return false;
            return true;
          }).map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <item.icon className="nav-icon" size={20} />
              <span className="nav-label">{item.label}</span>
              {item.badge && (
                <span className="nav-badge">3</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {/* Mock Role Selector Dropdown */}
          <div className="role-selector-container">
            <button 
              className="role-selector-btn"
              onClick={() => setShowRoleSelector(!showRoleSelector)}
            >
              <div className="flex-col" style={{ alignItems: 'flex-start' }}>
                <span className="role-user-name">{currentUser.displayName} {currentUser.surname}</span>
                <span className="role-current-name">{role}</span>
              </div>
              <ChevronDown size={16} />
            </button>
            
            {showRoleSelector && (
              <div className="role-dropdown">
                <div style={{ padding: '8px 12px', fontSize: '0.7rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', marginBottom: '4px' }}>Cambiar Rol (Demo)</div>
                {Object.values(ROLES).map(r => (
                  <button 
                    key={r}
                    className={`role-option ${role === r ? 'active' : ''}`}
                    onClick={() => { 
                      if (currentUser?.uid) {
                        updateProfile(currentUser.uid, { role: r });
                      }
                      setShowRoleSelector(false); 
                      if (r === ROLES.BRIGADISTA && location.pathname !== '/tasks') navigate('/tasks');
                    }}
                  >
                    <div className="flex-col" style={{ alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{r}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content relative">
        <header className="mobile-header">
          <div className="logo-container">
            <Shield className="logo-icon" size={24} />
            <span className="logo-text">MovilizaSon</span>
          </div>
          <button 
            className={`sidebar-bell-btn ${unreadCount > 0 ? 'bell-warning-blink' : ''}`} 
            onClick={() => setShowNotifications(true)}
            style={{ position: 'relative' }}
          >
            <Bell size={20} />

            {unreadCount > 0 && (
              <span className="notification-badge-pulse">{unreadCount}</span>
            )}
          </button>
        </header>

        <div className={`page-container ${isMessagesPage ? 'page-container-flush' : ''}`}>
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="bottom-nav">
        {navItems.filter(item => {
            if (item.adminOnly && role !== ROLES.SUPER_ADMIN) return false;
            if (item.highRankOnly && role !== ROLES.SUPER_ADMIN && role !== ROLES.ADMIN_ESTATAL) return false;
            return true;
        }).slice(0, 5).map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon className="bottom-nav-icon" size={20} />
            <span className="bottom-nav-label">{item.label.split(' ')[0]}</span>
            {item.badge && (
              <span className="bottom-nav-badge">3</span>
            )}
          </NavLink>
        ))}
      </nav>

      <NotificationCenter 
        isOpen={showNotifications} 
        onClose={() => setShowNotifications(false)} 
        notifications={notifications}
        markAsRead={markAsRead}
        markAllAsRead={markAllAsRead}
        clearNotification={clearNotification}
        userId={CURRENT_USER_ID}
      />

      {isAlarming && alarmMessage && (
        <AlarmOverlay message={alarmMessage} onDismiss={handleDismissAlarm} />
      )}
    </div>
  );
}
