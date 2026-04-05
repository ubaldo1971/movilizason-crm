import { useState, useEffect, useRef } from 'react';
import { useRole } from '../context/RoleContext';
import { 
  Search, Plus, Users, User, MessageCircle, ChevronLeft, 
  Hash, Bell, Settings, UserPlus, MoreVertical, Shield, MapPin
} from 'lucide-react';
import { useConversations, useMessages, useSendMessage, createDirectConversation } from '../hooks/useMessages';
import { 
  collection, doc, onSnapshot, updateDoc, increment, setDoc,
  getDocs, query, orderBy, where, addDoc 
} from '../lib/dbService';
import { db } from '../firebaseConfig';
import ChatBubble from '../components/ChatBubble';
import ComposeBar from '../components/ComposeBar';
import AlarmOverlay from '../components/AlarmOverlay';
import { useLocation, useNavigate } from 'react-router-dom';
import { useScoringEngine } from '../hooks/useScoringEngine';
import { useAlarm } from '../hooks/useAlarm';
import './Messages.css';

// Mock user ID for now (will be replaced with real auth)
const CURRENT_USER_ID = 'ubaldo-super-admin';
const CURRENT_USER_NAME = 'Ubaldo';
const CURRENT_USER_ROLE = 'Super Admin';

// Fallback data for demo purposes
const DEMO_CONTACTS = [
  { id: 'user-carlos', displayName: 'Carlos Ruiz', role: 'Coordinador Seccional', section: '0841', districtFed: '03' },
  { id: 'user-maria', displayName: 'María López', role: 'Coordinador Seccional', section: '1205', districtFed: '05' },
  { id: 'user-2', displayName: 'Ana Gómez', role: 'Brigadista / Operador', section: '0841', districtFed: '03' },
  { id: 'user-7', displayName: 'José Herrera', role: 'Brigadista / Operador', section: '0842', districtFed: '03' },
];

const DEMO_BRIGADES_LIST = [
  { id: 'b1', name: 'Brigada Norte D3', sections: ['0841', '0842'], districtFed: '03' },
  { id: 'b2', name: 'Brigada Sur D4', sections: ['1205'], districtFed: '05' },
];

export default function Messages() {
  const { role, ROLES, currentUser } = useRole();
  const assignments = currentUser?.assignments;
  const [activeConversation, setActiveConversation] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatType, setNewChatType] = useState(null); // 'direct' | 'brigade'
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableBrigades, setAvailableBrigades] = useState([]);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // list | chat
  const messagesEndRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { calculateTaskScore } = useScoringEngine();
  const { isAlarming, alarmMessage, triggerAlarm, stopAlarm } = useAlarm();

  const CURRENT_USER_ID = currentUser?.uid || 'admin_demo';
  const CURRENT_USER_NAME = currentUser?.displayName || 'Usuario';
  const CURRENT_USER_ROLE = role || ROLES.SUPER_ADMIN;

  const { conversations = [], loading: convosLoading } = useConversations(CURRENT_USER_ID, role, assignments);
  const { messages = [], loading: msgsLoading } = useMessages(activeConversation?.id);
  const sendMessage = useSendMessage();

  // Demo conversations for prototyping (will be replaced by Firestore data)
  const [demoConversations] = useState([
    {
      id: 'demo-brigade-norte',
      type: 'brigade',
      brigadeName: '🛡️ Brigada Norte D3',
      participants: [CURRENT_USER_ID, 'user-2', 'user-3', 'user-4'],
      lastMessage: { text: 'Listos para el operativo de mañana', sentBy: 'user-2', type: 'communication' },
      memberCount: 12,
      updatedAt: new Date()
    },
    {
      id: 'demo-brigade-sur',
      type: 'brigade',
      brigadeName: '⚔️ Brigada Sur D4',
      participants: [CURRENT_USER_ID, 'user-5', 'user-6'],
      lastMessage: { text: '📋 Tarea: Recorrer sección 0842', sentBy: CURRENT_USER_ID, type: 'task' },
      memberCount: 8,
      updatedAt: new Date(Date.now() - 3600000)
    },
    {
      id: 'demo-direct-carlos',
      type: 'direct',
      participantNames: { [CURRENT_USER_ID]: 'Ubaldo', 'user-carlos': 'Carlos Ruiz' },
      participants: [CURRENT_USER_ID, 'user-carlos'],
      lastMessage: { text: 'Reporte enviado, jefe', sentBy: 'user-carlos', type: 'communication' },
      updatedAt: new Date(Date.now() - 7200000)
    },
    {
      id: 'demo-direct-maria',
      type: 'direct',
      participantNames: { [CURRENT_USER_ID]: 'Ubaldo', 'user-maria': 'María López' },
      participants: [CURRENT_USER_ID, 'user-maria'],
      lastMessage: { text: '📋 Tarea: Coordinar evento seccional', sentBy: CURRENT_USER_ID, type: 'task' },
      updatedAt: new Date(Date.now() - 86400000)
    }
  ]);

  const [demoMessages, setDemoMessages] = useState({
    'demo-brigade-norte': [
      { id: 'm1', sentBy: CURRENT_USER_ID, senderName: 'Ubaldo', senderRole: 'Super Admin', text: 'Buenos días equipo. Mañana operativo en zona norte.', type: 'communication', sentAt: new Date(Date.now() - 7200000), readBy: [CURRENT_USER_ID, 'user-2', 'user-3'] },
      { id: 'm2', sentBy: 'user-2', senderName: 'Carlos Ruiz', senderRole: 'Coord. Seccional', text: 'Enterado jefe, ¿a qué hora nos reportamos?', type: 'communication', sentAt: new Date(Date.now() - 6900000), readBy: [CURRENT_USER_ID, 'user-2'] },
      { id: 'm3', sentBy: CURRENT_USER_ID, senderName: 'Ubaldo', senderRole: 'Super Admin', text: '📋 Tarea: Recorrer zona norte completa', type: 'task', taskData: { title: 'Recorrer zona norte completa', description: 'Cubrir todas las secciones de la zona norte del D3. Reportar avances por foto.', dueDate: new Date(Date.now() + 86400000).toISOString(), priority: 'high', status: 'pending', startedAt: null, completedAt: null }, sentAt: new Date(Date.now() - 3600000), readBy: [CURRENT_USER_ID, 'user-2'] },
      { id: 'm4', sentBy: 'user-3', senderName: 'Ana Gómez', senderRole: 'Brigadista', text: 'Listos para el operativo de mañana', type: 'communication', sentAt: new Date(Date.now() - 1800000), readBy: [CURRENT_USER_ID, 'user-3'] }
    ],
    'demo-brigade-sur': [
      { id: 'm5', sentBy: CURRENT_USER_ID, senderName: 'Ubaldo', senderRole: 'Super Admin', text: '📋 Tarea: Recorrer sección 0842', type: 'task', taskData: { title: 'Recorrer sección 0842', description: 'Necesito cobertura completa de la sección.', dueDate: new Date(Date.now() + 172800000).toISOString(), priority: 'medium', status: 'started', startedAt: new Date(Date.now() - 3600000).toISOString(), startedBy: 'user-5' }, sentAt: new Date(Date.now() - 7200000), readBy: [CURRENT_USER_ID, 'user-5'] }
    ],
    'demo-direct-carlos': [
      { id: 'm6', sentBy: CURRENT_USER_ID, senderName: 'Ubaldo', senderRole: 'Super Admin', text: 'Carlos, necesito el reporte de la sección 1205', type: 'communication', sentAt: new Date(Date.now() - 14400000), readBy: [CURRENT_USER_ID, 'user-carlos'] },
      { id: 'm7', sentBy: 'user-carlos', senderName: 'Carlos Ruiz', senderRole: 'Coord. Seccional', text: 'Reporte enviado, jefe', type: 'communication', sentAt: new Date(Date.now() - 7200000), readBy: [CURRENT_USER_ID, 'user-carlos'] }
    ],
    'demo-direct-maria': [
      { id: 'm8', sentBy: CURRENT_USER_ID, senderName: 'Ubaldo', senderRole: 'Super Admin', text: '📋 Tarea: Coordinar evento seccional', type: 'task', taskData: { title: 'Coordinar evento seccional', description: 'Organizar evento en la sección 0315 para este viernes.', dueDate: new Date(Date.now() + 259200000).toISOString(), priority: 'high', status: 'pending' }, sentAt: new Date(Date.now() - 86400000), readBy: [CURRENT_USER_ID] }
    ]
  });

  // Combine real and demo conversations
  const allConversations = [...conversations, ...demoConversations];

  const activeMessages = activeConversation 
    ? (messages.length > 0 ? messages : demoMessages[activeConversation.id] || [])
    : [];

  // Scroll to bottom when messages change and check for alarms
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Check last message for alarm trigger
    if (activeMessages.length > 0) {
      const lastMsg = activeMessages[activeMessages.length - 1];
      if (lastMsg.isAlarm && lastMsg.sentBy !== CURRENT_USER_ID) {
        // Trigger alarm if not already alarming for this specific message
        if (!isAlarming || alarmMessage?.id !== lastMsg.id) {
          triggerAlarm(lastMsg);
        }
      }
    }
  }, [activeMessages, isAlarming, alarmMessage, triggerAlarm, CURRENT_USER_ID]);

  // Handle brigadeId from URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const brigadeId = params.get('brigadeId');
    if (brigadeId && allConversations.length > 0) {
      const targetConvo = allConversations.find(c => c.id === brigadeId);
      if (targetConvo) {
        setActiveConversation(targetConvo);
        setMobileView('chat');
        // Clear param to avoid re-triggering if necessary
        // navigate('/messages', { replace: true });
      }
    }
  }, [location, allConversations]);

  const handleSelectConversation = (convo) => {
    setActiveConversation(convo);
    setMobileView('chat');
    // Hide new chat panel if open
    setShowNewChat(false);
    setNewChatType(null);
  };

  // Fetch available users/brigades for new chat based on hierarchy
  useEffect(() => {
    if (showNewChat && newChatType) {
      const fetchData = async () => {
        setIsLoadingContacts(true);
        try {
          if (newChatType === 'direct') {
            const usersRef = collection(db, 'users');
            const snapshot = await getDocs(query(usersRef, orderBy('displayName', 'asc')));
            let users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Hierarchical filtering
            if (role !== ROLES.SUPER_ADMIN && role !== ROLES.ADMIN_ESTATAL) {
              users = users.filter(u => {
                if (u.id === CURRENT_USER_ID) return false;
                if (!assignments) return false;
                if (role === ROLES.COORD_SECCIONAL) {
                  return assignments.sections?.includes(u.section);
                }
                if (role === ROLES.COORD_DISTRITAL_FED) {
                  return assignments.districtsFed?.includes(u.districtFed);
                }
                if (role === ROLES.COORD_DISTRITAL_LOC) {
                  return assignments.districtsLoc?.includes(u.districtLoc);
                }
                return false;
              });
            } else {
              // Admin/Super Admin see everyone except themselves
              users = users.filter(u => u.id !== CURRENT_USER_ID);
            }
            setAvailableUsers(users.length > 0 ? users : DEMO_CONTACTS);
          } else if (newChatType === 'brigade') {
            const brigadesRef = collection(db, 'brigades');
            const snapshot = await getDocs(query(brigadesRef, orderBy('name', 'asc')));
            let brigades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Hierarchical filtering for brigades
            if (role !== ROLES.SUPER_ADMIN && role !== ROLES.ADMIN_ESTATAL) {
              brigades = brigades.filter(b => {
                if (!assignments) return false;
                if (role === ROLES.COORD_SECCIONAL) {
                  return b.sections?.some(sec => assignments.sections?.includes(sec));
                }
                if (role === ROLES.COORD_DISTRITAL_FED) {
                  return assignments.districtsFed?.includes(b.districtFed);
                }
                if (role === ROLES.COORD_DISTRITAL_LOC) {
                  return assignments.districtsLoc?.includes(b.districtLoc);
                }
                return false;
              });
            }
            setAvailableBrigades(brigades.length > 0 ? brigades : DEMO_BRIGADES_LIST);
          }
        } catch (error) {
          console.error("Error fetching contacts:", error);
        } finally {
          setIsLoadingContacts(false);
        }
      };
      fetchData();
    }
  }, [showNewChat, newChatType, role, assignments, ROLES, CURRENT_USER_ID]);

  const handleStartDirectChat = async (targetUser) => {
    try {
      const convoId = await createDirectConversation(
        CURRENT_USER_ID, 
        targetUser.id, 
        CURRENT_USER_NAME, 
        targetUser.displayName
      );
      // Wait for hook to update conversations or manually set active if we have enough info
      // Simplified: Just close panel, the hook will pick it up
      setShowNewChat(false);
      setNewChatType(null);
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  const handleSendMessage = (messagePayload) => {
    if (!activeConversation) return;

    const newMsg = {
      id: `msg-${Date.now()}`,
      sentBy: CURRENT_USER_ID,
      senderName: CURRENT_USER_NAME,
      senderRole: CURRENT_USER_ROLE,
      ...messagePayload,
      sentAt: new Date(),
      readBy: [CURRENT_USER_ID]
    };

    // For demo, add to local state
    setDemoMessages(prev => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), newMsg]
    }));

    // For real conversations, send to Firestore
    if (!activeConversation.id.startsWith('demo-')) {
      const payload = {
        sentBy: CURRENT_USER_ID,
        senderName: CURRENT_USER_NAME,
        senderRole: CURRENT_USER_ROLE,
        ...messagePayload
      };
      
      sendMessage(activeConversation.id, payload);

      // Track task assignment for performance stats
      if (messagePayload.type === 'task') {
        if (activeConversation.type === 'brigade') {
          const brigadeRef = doc(db, 'brigades', activeConversation.brigadeId || activeConversation.id);
          updateDoc(brigadeRef, { tasksAssigned: increment(1) }).catch(console.error);
        } else {
          // Direct chat - find the other participant
          const otherUid = activeConversation.participants?.find(uid => uid !== CURRENT_USER_ID);
          if (otherUid) {
            const userRef = doc(db, 'users', otherUid);
            updateDoc(userRef, { tasksAssigned: increment(1) }).catch(console.error);
          }
        }
      }
    }
  };

  const handleUpdateTask = async (convoId, messageId, updatedTaskData) => {
    let finalTaskData = { ...updatedTaskData };

    // Calculate score if becoming 'completed' and not already scored
    if (updatedTaskData.status === 'completed' && !updatedTaskData.pointsEarned) {
      const scoreResult = calculateTaskScore({
        typeId: updatedTaskData.taskType || 'visita',
        complexityIndex: updatedTaskData.complexityIndex || 0,
        peopleCount: updatedTaskData.peopleCount || 1
      });
      finalTaskData.pointsEarned = scoreResult.totalPoints;
      
      const userId = updatedTaskData.completedBy || CURRENT_USER_ID;
      
      try {
        const userRef = doc(db, 'users', userId);
        
        // Atomic update for user
        await updateDoc(userRef, {
          totalPoints: increment(finalTaskData.pointsEarned),
          tasksCompleted: increment(1),
          // Slight boost to performance score on task completion
          performanceScore: increment(0.5) 
        });

        // If it's a brigade conversation, update brigade-level stats
        if (activeConversation?.type === 'brigade') {
          const brigadeId = activeConversation.brigadeId || activeConversation.id;
          // Avoid updating demo brigades
          if (!brigadeId.startsWith('demo-')) {
            const brigadeRef = doc(db, 'brigades', brigadeId);
            await updateDoc(brigadeRef, {
              totalScore: increment(finalTaskData.pointsEarned),
              tasksCompleted: increment(1),
              [`pointsByTask.${updatedTaskData.taskType || 'otros'}`]: increment(finalTaskData.pointsEarned)
            });
          }
        }
      } catch (err) {
        console.error("Error updating scores:", err);
      }
    }

    setDemoMessages(prev => {
      const msgs = prev[convoId] || [];
      return {
        ...prev,
        [convoId]: msgs.map(m => 
          m.id === messageId ? { ...m, taskData: finalTaskData } : m
        )
      };
    });

    // For real messages, update in Firestore
    if (!convoId.startsWith('demo-')) {
      const msgRef = doc(db, 'conversations', convoId, 'messages', messageId);
      updateDoc(msgRef, { taskData: finalTaskData }).catch(console.error);
    }
  };

  const getConversationName = (convo) => {
    if (convo.type === 'brigade') return convo.brigadeName || 'Brigada';
    if (convo.participantNames) {
      const otherNames = Object.entries(convo.participantNames)
        .filter(([uid]) => uid !== CURRENT_USER_ID)
        .map(([, name]) => name);
      return otherNames.join(', ') || 'Chat Directo';
    }
    return 'Conversación';
  };

  const getConversationIcon = (convo) => {
    return convo.type === 'brigade' 
      ? <Users size={20} style={{ color: 'var(--color-primary-light)' }} />
      : <User size={20} style={{ color: 'var(--text-secondary)' }} />;
  };

  const filteredConversations = allConversations.filter(c => {
    if (!searchTerm) return true;
    const name = getConversationName(c).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="messages-page">
      {/* Alarm Overlay */}
      {isAlarming && alarmMessage && (
        <AlarmOverlay message={alarmMessage} onDismiss={stopAlarm} />
      )}

      {/* Left Panel - Conversation List */}
      <div className={`messages-sidebar ${mobileView === 'chat' ? 'hidden-mobile' : ''}`}>
        <div className="messages-sidebar-header">
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Mensajes</h2>
          <button className="btn" onClick={() => setShowNewChat(!showNewChat)} style={{ padding: '0.5rem' }}>
            <Plus size={20} />
          </button>
        </div>

        <div className="messages-search">
          <Search size={16} className="messages-search-icon" />
          <input
            type="text"
            className="messages-search-input"
            placeholder="Buscar conversación..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* New chat selector */}
        {showNewChat && (
          <div className="new-chat-panel">
            {!newChatType ? (
              <>
                <div className="new-chat-option" onClick={() => setNewChatType('direct')}>
                  <UserPlus size={18} />
                  <span>Mensaje Directo</span>
                </div>
                <div className="new-chat-option" onClick={() => setNewChatType('brigade')}>
                  <Users size={18} />
                  <span>Unirse a Brigada</span>
                </div>
              </>
            ) : (
              <div className="contact-selector">
                <div className="contact-selector-header">
                  <button className="btn-icon" onClick={() => setNewChatType(null)}>
                    <ChevronLeft size={16} />
                  </button>
                  <span>{newChatType === 'direct' ? 'Seleccionar Contacto' : 'Seleccionar Brigada'}</span>
                </div>
                <div className="contact-list">
                  {isLoadingContacts ? (
                    <div className="loading-spinner">Cargando...</div>
                  ) : newChatType === 'direct' ? (
                    availableUsers.length > 0 ? (
                      availableUsers.map(u => (
                        <div key={u.id} className="contact-item" onClick={() => handleStartDirectChat(u)}>
                          <div className="contact-avatar">{u.displayName?.[0]}</div>
                          <div className="contact-info">
                            <div className="contact-name">{u.displayName}</div>
                            <div className="contact-role">{u.role} • Sect. {u.section}</div>
                          </div>
                        </div>
                      ))
                    ) : <div className="empty-state">No se encontraron contactos en tu territorio</div>
                  ) : (
                    availableBrigades.length > 0 ? (
                      availableBrigades.map(b => (
                        <div key={b.id} className="contact-item" onClick={() => {/* Join logic */}}>
                          <div className="contact-avatar" style={{ background: 'var(--color-primary)' }}>
                            <Users size={14} />
                          </div>
                          <div className="contact-info">
                            <div className="contact-name">{b.name}</div>
                            <div className="contact-role">{b.sections?.join(', ')} • {b.districtFed}</div>
                          </div>
                        </div>
                      ))
                    ) : <div className="empty-state">No hay brigadas disponibles en tu territorio</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="messages-list">
          {/* Hierarchy/Territory Based Grouping */}
          {assignments && (
            <>
              {(role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN_ESTATAL) ? (
                <div className="messages-section-header territory-badge">
                  <Shield size={14} /> Jurisdicción Estatal (Sonora)
                </div>
              ) : (
                <>
                  {assignments.sections?.length > 0 && (
                    <div className="messages-section-header territory-badge">
                      <Hash size={14} /> Mis Secciones: {assignments.sections?.slice(0, 3).join(', ')}{assignments.sections?.length > 3 ? '...' : ''}
                    </div>
                  )}
                  {assignments.districtsFed?.length > 0 && (
                    <div className="messages-section-header territory-badge">
                      <MapPin size={14} /> Distrito Fed: {assignments.districtsFed?.join(', ')}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Messages by Activity (latest first) */}
          {filteredConversations.length === 0 && !convosLoading && (
            <div className="messages-empty-list">
              No tienes chats en este territorio habilitados.
            </div>
          )}

          {filteredConversations.map(convo => (
            <div
              key={convo.id}
              className={`message-list-item ${activeConversation?.id === convo.id ? 'active' : ''}`}
              onClick={() => handleSelectConversation(convo)}
            >
              <div className={`message-list-avatar ${convo.type}`}>
                {convo.type === 'brigade' ? <Users size={18} /> : <User size={18} />}
              </div>
              <div className="message-list-info">
                <div className="message-list-name">
                  {getConversationName(convo)}
                  {convo.type === 'brigade' && convo.sections && (
                    <span className="convo-territory-tag">Sect. {convo.sections[0]}</span>
                  )}
                </div>
                <div className="message-list-preview">
                  {convo.lastMessage?.type === 'task' ? '📋 ' : ''}
                  {convo.lastMessage?.text || 'Sin mensajes'}
                </div>
              </div>
              <div className="message-list-meta">
                <span className="message-time">
                  {convo.updatedAt ? new Date(convo.updatedAt.seconds * 1000 || convo.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
                {convo.unreadCount?.[CURRENT_USER_ID] > 0 && (
                  <span className="message-list-badge">{convo.unreadCount[CURRENT_USER_ID]}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Center Panel - Chat Area */}
      <div className={`messages-chat ${mobileView === 'list' ? 'hidden-mobile' : ''}`}>
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="messages-chat-header">
              <button className="messages-back-btn" onClick={() => setMobileView('list')}>
                <ChevronLeft size={24} />
              </button>
              <div className="messages-chat-header-info">
                {getConversationIcon(activeConversation)}
                <div>
                  <h3 style={{ fontSize: '1rem', margin: 0 }}>{getConversationName(activeConversation)}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {activeConversation.type === 'brigade' 
                      ? `${activeConversation.memberCount || activeConversation.participants?.length || 0} miembros`
                      : 'En línea'
                    }
                  </span>
                </div>
              </div>
              <div className="messages-chat-header-actions">
                <button className="btn" style={{ padding: '0.5rem' }} title="Notificaciones">
                  <Bell size={18} />
                </button>
                <button className="btn" style={{ padding: '0.5rem' }} title="Más opciones">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="messages-chat-body">
              {activeMessages.length === 0 ? (
                <div className="messages-empty">
                  <MessageCircle size={48} style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
                  <p>No hay mensajes aún. ¡Inicia la conversación!</p>
                </div>
              ) : (
                activeMessages.map((msg) => (
                  <ChatBubble
                    key={msg.id}
                    message={msg}
                    isOwn={msg.sentBy === CURRENT_USER_ID}
                    currentUserId={CURRENT_USER_ID}
                    onUpdateTask={handleUpdateTask}
                    conversationId={activeConversation.id}
                  />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Compose Bar */}
            <ComposeBar 
              onSend={handleSendMessage}
              recipientName={getConversationName(activeConversation)}
            />
          </>
        ) : (
          <div className="messages-no-selection">
            <div className="messages-no-selection-content">
              <MessageCircle size={64} style={{ color: 'var(--text-muted)', opacity: 0.2 }} />
              <h3 style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Centro de Comunicación</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Selecciona una conversación o brigada para comenzar
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
