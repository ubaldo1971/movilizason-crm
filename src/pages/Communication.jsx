import { useState, useEffect, useRef } from 'react';
import { useRole, formatName } from '../context/RoleContext';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, where, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useComms } from '../context/CommunicationContext';
import { 
  Hash, 
  Volume2, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Settings, 
  Plus, 
  Users,
  Search,
  Inbox,
  HelpCircle,
  Smile,
  Film,
  Sticker,
  PlusCircle,
  LayoutGrid
} from 'lucide-react';
import './Communication.css';

// Helper Component to safely render MediaStream
function VideoStream({ stream, muted = false, className = "" }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!stream) return null;

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={className}
    />
  );
}


export default function Communication() {
  const { currentUser: user, allUsers, ROLES } = useRole();
  const { 
    voiceState, 
    joinVoiceChannel, 
    leaveVoiceChannel, 
    toggleMute, 
    toggleCamera,
    localStream,
    messages,
    typingUsers,
    setCurrentChannelId,
    sendMessage,
    setTypingStatus
  } = useComms();
  
  const [servers, setServers] = useState([]);
  const [dbChannels, setDbChannels] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [currentVoiceChannel, setCurrentVoiceChannel] = useState(null);
  const [message, setMessage] = useState('');

  const isAdmin = user?.role === ROLES?.SUPER_ADMIN || 
                  user?.role === ROLES?.ADMIN_ESTATAL || 
                  user?.role === ROLES?.COORD_DISTRITAL_FED ||
                  user?.role === 'admin';

  // Specific check for creation/deletion
  const canManage = isAdmin;

  // Modals
  const [showServerModal, setShowServerModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('text');
  const [newChannelCategory, setNewChannelCategory] = useState('Canales de Texto');

  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editType, setEditType] = useState('server');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editColor, setEditColor] = useState('');

  // Context Menu State
  const [activeContextMenu, setActiveContextMenu] = useState(null);

  const handleOpenContextMenu = (e, type, id) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveContextMenu({ type, id, x: e.clientX, y: e.clientY });
  };

  const closeContextMenu = () => setActiveContextMenu(null);

  useEffect(() => {
    const handleClick = () => closeContextMenu();
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Load Servers
  useEffect(() => {
    const q = query(collection(db, 'comm_servers'), orderBy('order', 'asc'));
    return onSnapshot(q, async (snapshot) => {
      let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Bootstrap if empty and user is admin
      if (docs.length === 0 && isAdmin) {
        console.log('Bootstrapping default server...');
        const defaultServer = {
          name: 'Sonora Central',
          shortName: 'SC',
          color: '#801020',
          order: 0,
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'comm_servers'), defaultServer);
        
        // Add default channels for this server
        await addDoc(collection(db, 'comm_channels'), {
          name: 'general',
          serverId: docRef.id,
          type: 'text',
          category: 'Canales de Texto',
          order: 0,
          createdAt: new Date().toISOString()
        });
        await addDoc(collection(db, 'comm_channels'), {
          name: 'Voz General',
          serverId: docRef.id,
          type: 'voice',
          category: 'Canales de Voz',
          order: 0,
          createdAt: new Date().toISOString()
        });
        return; // Snapshot will trigger again
      }

      setServers(docs);
      if (docs.length > 0 && !activeServer) {
        setActiveServer(docs[0].id);
      }
    });
  }, [isAdmin]);

  // Load Channels for active server
  useEffect(() => {
    if (!activeServer) return;
    const q = query(
      collection(db, 'comm_channels'), 
      where('serverId', '==', activeServer),
      orderBy('order', 'asc')
    );
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setDbChannels(docs);
      
      // Select first channel if activeChannel is not in new list or null
      if (docs.length > 0 && (!activeChannel || !docs.find(c => c.id === activeChannel.id))) {
        const firstText = docs.find(c => c.type === 'text') || docs[0];
        setActiveChannel(firstText);
      }
    });
  }, [activeServer]);

  const handleCreateServer = async () => {
    if (!newServerName.trim()) return;
    try {
      const shortName = newServerName.split(' ').map(w => w[0]).join('').toUpperCase();
      await addDoc(collection(db, 'comm_servers'), {
        name: newServerName,
        shortName: shortName.substring(0, 3),
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
        order: servers.length,
        createdAt: new Date().toISOString()
      });
      setNewServerName('');
      setShowServerModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim() || !activeServer) return;
    try {
      await addDoc(collection(db, 'comm_channels'), {
        name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        serverId: activeServer,
        type: newChannelType,
        category: newChannelCategory,
        order: dbChannels.length,
        createdAt: new Date().toISOString()
      });
      setNewChannelName('');
      setShowChannelModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteServer = async (serverId) => {
    if (!window.confirm('¿Estás seguro de eliminar este grupo de trabajo? Se perderán todos los canales y mensajes.')) return;
    try {
      // 1. Delete channels and their messages (simulated or direct if small)
      // In a real app we would use a Cloud Function, but here we can at least delete the server doc
      // Note: for safety we only delete the server doc here, sub-collections remain but are orphaned.
      await deleteDoc(doc(db, 'comm_servers', serverId));
      if (activeServer === serverId) setActiveServer(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteChannel = async (channelId) => {
    if (!window.confirm('¿Eliminar este canal?')) return;
    try {
      await deleteDoc(doc(db, 'comm_channels', channelId));
      if (activeChannel?.id === channelId) setActiveChannel(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditSave = async () => {
    if (!editName.trim()) return;
    try {
      if (editType === 'server') {
        const shortName = editName.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 3);
        await updateDoc(doc(db, 'comm_servers', editId), {
          name: editName,
          shortName,
          color: editColor || `hsl(0, 70%, 50%)`
        });
      } else {
        await updateDoc(doc(db, 'comm_channels', editId), {
          name: editName.toLowerCase().replace(/\s+/g, '-'),
          category: editCategory
        });
      }
      setShowEditModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Group channels by category
  const categories = dbChannels.reduce((acc, ch) => {
    const cat = acc.find(a => a.title === ch.category);
    const icon = ch.type === 'voice' ? <Volume2 size={18} /> : <Hash size={18} />;
    if (cat) {
      cat.channels.push({ ...ch, icon });
    } else {
      acc.push({ title: ch.category, channels: [{ ...ch, icon }] });
    }
    return acc;
  }, []);

  const scrollRef = useRef(null);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeChannel]);

  // Sync active channel with context
  useEffect(() => {
    if (activeChannel?.id) {
      setCurrentChannelId(activeChannel.id);
    }
  }, [activeChannel?.id, setCurrentChannelId]);


  const handleJoinVoice = (channel) => {
    if (currentVoiceChannel?.id === channel.id) {
      leaveVoiceChannel(user?.uid);
      setCurrentVoiceChannel(null);
      // Fallback to first text channel of active server
      const fallback = dbChannels.find(c => c.type === 'text') || dbChannels[0];
      if (fallback) setActiveChannel(fallback);
    } else {
      joinVoiceChannel(user?.uid, formatName(user), channel.id, activeServer);
      setCurrentVoiceChannel(channel);
      setActiveChannel(channel);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getUserName = (uid) => {
    const u = allUsers.find(x => x.uid === uid);
    return u ? formatName(u) : 'Usuario';
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = new Date(now.setDate(now.getDate() - 1)).toDateString() === date.toDateString();
    
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (isToday) return `Hoy a las ${time}`;
    if (isYesterday) return `Ayer a las ${time}`;
    return `${date.toLocaleDateString()} ${time}`;
  };

  const handleSendMessage = async (e) => {
    if (e && e.key && e.key !== 'Enter') return;
    if (!message.trim() || !activeChannel?.id) return;

    if (!user?.uid) return;
    await sendMessage(user.uid, formatName(user), activeChannel.id, message);
    setMessage('');
    // Clear typing status immediately on send
    setTypingStatus(user.uid, formatName(user), activeChannel.id, false);
  };

  const typingTimeoutRef = useRef(null);
  const handleInputChange = (e) => {
    setMessage(e.target.value);
    
    // Typing indicator logic
    if (!user?.uid || !activeChannel?.id || activeChannel.type === 'voice') return;

    setTypingStatus(user.uid, formatName(user), activeChannel.id, true);


    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(user.uid, user.name, activeChannel.id, false);
    }, 3000);
  };

  const getTypingText = () => {
    const others = Object.values(typingUsers).filter(u => u.userId !== user?.uid);
    if (others.length === 0) return null;
    if (others.length === 1) return `${others[0].userName} está escribiendo...`;
    if (others.length === 2) return `${others[0].userName} y ${others[1].userName} están escribiendo...`;
    return 'Varias personas están escribiendo...';
  };

  if (!activeServer && servers.length > 0) {
    setActiveServer(servers[0].id);
  }

  if (!activeChannel && dbChannels.length > 0) {
    const firstText = dbChannels.find(c => c.type === 'text') || dbChannels[0];
    if (firstText) setActiveChannel(firstText);
  }

  return (
    <div className="communication-container animate-fade-in">
      {/* 1. Server Rail */}
      <div className="server-rail">
        <div className="server-icon active" title="Inicio / Mensajes Directos">
          <img src="/logo192.png" alt="CRM" style={{ width: '28px' }} />
        </div>
        <div className="server-divider" />
        {servers.map(server => (
          <div 
            key={server.id} 
            className={`server-icon ${activeServer === server.id ? 'active' : ''}`}
            onClick={() => setActiveServer(server.id)}
            style={{ backgroundColor: activeServer === server.id ? server.color : '' }}
            title={server.name}
          >
            {server.shortName}
          </div>
        ))}
        {canManage && (
          <div className="server-icon add-btn" onClick={() => setShowServerModal(true)}>
            <Plus size={24} />
          </div>
        )}
      </div>

      {/* 2. Channel Sidebar */}
      <div className="channel-sidebar">
        <div className="sidebar-header">
          <div className="flex items-center gap-2 overflow-hidden">
             <span className="truncate">{servers.find(s => s.id === activeServer)?.name}</span>
              {canManage && (activeServer && activeServer !== servers[0]?.id) && (
               <Settings 
                size={14} 
                className="cursor-pointer text-muted hover:text-white" 
                onClick={(e) => handleOpenContextMenu(e, 'server', activeServer)} 
               />
             )}
          </div>
          {canManage && <PlusCircle size={18} className="cursor-pointer" onClick={() => { setNewChannelCategory('Canales de Texto'); setShowChannelModal(true); }} />}
        </div>

        <div className="channel-list">
          {categories.map(cat => (
            <div key={cat.title}>
              <div className="channel-section-title group">
                {cat.title}
                {canManage && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Plus size={14} className="cursor-pointer" onClick={() => { setNewChannelCategory(cat.title); setShowChannelModal(true); }} />
                  </div>
                )}
              </div>
              {cat.channels.map(ch => (
                <div key={ch.id}>
                  <div 
                    className={`channel-item group ${activeChannel?.id === ch.id ? 'active' : ''}`}
                    onClick={() => ch.type === 'voice' ? handleJoinVoice(ch) : setActiveChannel(ch)}
                  >
                    {ch.icon}
                    <span className="flex-1 truncate" style={{ color: ch.critical ? 'var(--status-error)' : '' }}>{ch.name}</span>
                    {canManage && (
                      <Settings 
                        size={12} 
                        className="opacity-0 group-hover:opacity-100 cursor-pointer text-muted hover:text-white"
                        onClick={(e) => handleOpenContextMenu(e, 'channel', ch.id)}
                      />
                    )}
                  </div>
                  
                  {/* Presence for Voice Channels */}
                  {ch.type === 'voice' && voiceState && voiceState[ch.id] && (
                    <div className="voice-user-list">
                      {Object.entries(voiceState[ch.id]).map(([uid, state]) => (
                        <div key={uid} className="voice-user-item">
                          <div className={`voice-avatar ${state.isSpeaking ? 'speaking-ring' : ''}`}>
                            {getInitials(state.userName || getUserName(uid))}
                          </div>
                          <span>{state.userName || getUserName(uid)}</span>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                            {state.isMuted && <MicOff size={12} color="var(--status-error)" />}
                            {state.isVideoOn && <Video size={12} color="var(--status-success)" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          {currentVoiceChannel && (
            <div className="voice-status-panel">
              <div className="flex flex-col">
                <span style={{ fontWeight: 700 }}>Voz Conectada</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{currentVoiceChannel.name}</span>
              </div>
              <div className="flex gap-2">
                <div className="control-btn" onClick={() => toggleMute(user?.uid)}>
                  {voiceState?.[currentVoiceChannel.id]?.[user?.uid]?.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </div>
                <div className="control-btn danger" onClick={() => { 
                  leaveVoiceChannel(user?.uid); 
                  setCurrentVoiceChannel(null); 
                  const fallback = dbChannels.find(c => c.type === 'text') || dbChannels[0];
                  if (fallback) setActiveChannel(fallback);
                }}>
                  <PhoneOff size={18} />
                </div>
              </div>
            </div>
          )}

          <div className="user-control-panel">
            <div className="user-info">
              <div className="voice-avatar" style={{ width: '32px', height: '32px' }}>
                {getInitials(user?.name)}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="user-name">{user?.name || 'Usuario'}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>#{user?.uid?.substring(0, 4)}</span>
              </div>
            </div>
            <div className="flex gap-1">
              <div className="control-btn" title="Cámara" onClick={() => toggleCamera(user?.uid)}>
                {voiceState?.[currentVoiceChannel?.id]?.[user?.uid]?.isVideoOn ? <VideoOff size={18} /> : <Video size={18} />}
              </div>
              <div className="control-btn" title="Ajustes">
                <Settings size={18} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content */}
      <div className="main-content">
        <div className="main-header">
          {!activeChannel ? (
             <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Selecciona un canal</span>
          ) : (
            <>
              {activeChannel.type === 'voice' ? <Volume2 size={24} color="var(--text-secondary)" /> : <Hash size={24} color="var(--text-secondary)" />}
              <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{activeChannel.name}</span>
            </>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Users size={20} className="cursor-pointer text-secondary" />
            <div className="search-pill" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-app)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', width: '160px' }}>
              <input type="text" placeholder="Buscar" style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.8rem', width: '100%' }} />
              <Search size={14} color="var(--text-muted)" />
            </div>
            <Inbox size={20} className="cursor-pointer text-secondary" />
            <HelpCircle size={20} className="cursor-pointer text-secondary" />
          </div>
        </div>

        {!activeChannel ? (
          <div className="chat-area empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '1rem' }}>
            <PlusCircle size={64} opacity={0.1} />
            <p>Selecciona un canal para comenzar a comunicarte</p>
          </div>
        ) : activeChannel.type === 'voice' ? (
          /* Voice/Video Grid View */
          <div className="voice-grid">
            {/* Local Participant Card */}
            <div className={`voice-card ${voiceState?.[activeChannel.id]?.[user?.uid]?.isSpeaking ? 'speaking' : ''}`}>
               <div className="video-container">
                  {voiceState?.[activeChannel.id]?.[user?.uid]?.isVideoOn ? (
                    <VideoStream stream={localStream} muted={true} className="video-element" />
                  ) : (
                    <div className="no-video-placeholder">
                      <div className="voice-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                        {getInitials(formatName(user))}
                      </div>
                      <span style={{ fontWeight: 600 }}>Tu cámara está apagada</span>
                    </div>
                  )}
               </div>
               <div className="overlay-name">{formatName(user)} (Tú)</div>
               <div className="overlay-icons">
                  {voiceState?.[activeChannel.id]?.[user?.uid]?.isMuted && <MicOff size={14} className="icon-small" />}
               </div>
            </div>

            {/* Remote Participants */}
            {Object.entries(voiceState?.[activeChannel.id] || {})
              .filter(([uid]) => uid !== user?.uid)
              .map(([uid, state]) => (
                <div key={uid} className={`voice-card ${state.isSpeaking ? 'speaking' : ''}`}>
                    {state.isVideoOn && remoteStreams[uid] ? (
                      <VideoStream stream={remoteStreams[uid]} className="video-element" />
                    ) : (
                    <div className="no-video-placeholder">
                      <div className="voice-avatar" style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                        {getInitials(state.userName || getUserName(uid))}
                      </div>
                      <span style={{ fontWeight: 600 }}>{state.userName || getUserName(uid)}</span>
                    </div>
                  )}
                  <div className="overlay-name">{state.userName || getUserName(uid)}</div>
                  <div className="overlay-icons">
                    {state.isMuted && <div className="icon-small"><MicOff size={14} /></div>}
                  </div>
                </div>
              ))
            }

            {(!voiceState?.[activeChannel?.id] || Object.keys(voiceState[activeChannel.id]).length === 0) && (
              <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '1rem' }}>
                <LayoutGrid size={64} opacity={0.1} />
                <p>Nadie en el canal de voz. Únete para empezar la coordinación.</p>
              </div>
            )}
          </div>
        ) : (
          /* Text Chat View */
          <div className="chat-area">
            <div className="message-scroll" ref={scrollRef}>
              <div className="flex flex-col gap-8" style={{ marginTop: 'auto' }}>
                <div className="welcome-msg" style={{ padding: '2rem 1rem' }}>
                  <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'var(--bg-surface-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                    <Hash size={40} color="var(--text-secondary)" />
                  </div>
                  <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>¡Te damos la bienvenida a #{activeChannel?.name}!</h1>
                  <p style={{ color: 'var(--text-muted)' }}>Este es el principio del canal #{activeChannel?.name}. Envía un mensaje para saludar.</p>
                </div>
                
                {/* Real Messages */}
                {messages.map((msg, index) => {
                  const prevMsg = messages[index - 1];
                  const isCompact = prevMsg && prevMsg.userId === msg.userId && 
                                   (new Date(msg.createdAt) - new Date(prevMsg.createdAt) < 300000); // 5 mins

                  return (
                    <div key={msg.id} className={`flex gap-4 group hover:bg-[rgba(255,255,255,0.02)] p-2 -mx-2 rounded transition-colors ${isCompact ? 'compact-msg' : ''}`}>
                      {!isCompact ? (
                        <div className="voice-avatar" style={{ flexShrink: 0, backgroundColor: msg.userId === user?.uid ? 'var(--color-primary)' : 'var(--bg-surface-elevated)' }}>
                          {getInitials(msg.userName)}
                        </div>
                      ) : (
                        <div className="compact-timestamp">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                      )}
                      
                      <div className="flex flex-col">
                        {!isCompact && (
                          <div className="flex items-center gap-2">
                            <span style={{ fontWeight: 600, color: msg.userId === user?.uid ? 'var(--color-primary-light)' : 'var(--text-primary)' }}>
                              {msg.userName}
                            </span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {formatTimestamp(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        <span style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{msg.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="chat-input-wrapper">
              {/* Typing Indicator */}
              {getTypingText() && (
                <div className="typing-indicator animate-fade-in">
                  <div className="typing-dots">
                    <span></span><span></span><span></span>
                  </div>
                  {getTypingText()}
                </div>
              )}

              <div className="chat-input-container" style={{ background: 'var(--bg-surface-elevated)', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <PlusCircle size={24} className="cursor-pointer text-muted hover:text-primary transition-colors" />
                <input 
                  type="text" 
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleSendMessage}
                  placeholder={`Enviar mensaje a #${activeChannel?.name || 'canal'}`}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
                />
                <div className="flex gap-3 text-muted">
                  <Film size={20} className="cursor-pointer hover:text-primary transition-colors" />
                  <Sticker size={20} className="cursor-pointer hover:text-primary transition-colors" />
                  <Smile size={20} className="cursor-pointer hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals for Admin */}
      {showServerModal && (
        <div className="comm-modal-overlay">
          <div className="comm-modal">
            <h2>Crear Nuevo Grupo de Trabajo</h2>
            <div className="form-group">
              <label>Nombre del Grupo</label>
              <input 
                value={newServerName} 
                onChange={(e) => setNewServerName(e.target.value)}
                placeholder="Ej. Distrito 6, Operativo Norte..."
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowServerModal(false)}>Cancelar</button>
              <button className="primary" onClick={handleCreateServer}>Crear Grupo</button>
            </div>
          </div>
        </div>
      )}

      {showChannelModal && (
        <div className="comm-modal-overlay">
          <div className="comm-modal">
            <h2>Crear Canal en {newChannelCategory}</h2>
            <div className="form-group">
              <label>Nombre del Canal</label>
              <input 
                value={newChannelName} 
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="Ej. logística-campo"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>Tipo</label>
              <select value={newChannelType} onChange={(e) => setNewChannelType(e.target.value)}>
                <option value="text">Texto</option>
                <option value="voice">Voz</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowChannelModal(false)}>Cancelar</button>
              <button className="primary" onClick={handleCreateChannel}>Crear Canal</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && (
        <div className="comm-modal-overlay">
          <div className="comm-modal">
            <h2>Editar {editType === 'server' ? 'Grupo de Trabajo' : 'Canal'}</h2>
            <div className="form-group">
              <label>Nombre</label>
              <input 
                value={editName} 
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Nombre"
                autoFocus
              />
            </div>
            
            {editType === 'server' ? (
              <div className="form-group">
                <label>Color Personalizado (Hex o HSL)</label>
                <input 
                  value={editColor} 
                  onChange={(e) => setEditColor(e.target.value)}
                  placeholder="Ej. #FF0000 o hsl(120, 50%, 50%)"
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Categoría</label>
                <input 
                  value={editCategory} 
                  onChange={(e) => setEditCategory(e.target.value)}
                  placeholder="Ej. Canales de Texto"
                />
              </div>
            )}

            <div className="modal-actions">
              <button onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button className="primary" onClick={handleEditSave}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {activeContextMenu && (
        <div 
          className="context-menu animate-fade-in" 
          style={{ 
            position: 'fixed', 
            top: activeContextMenu.y, 
            left: activeContextMenu.x, 
            background: 'var(--bg-surface-elevated)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '8px',
            padding: '8px',
            zIndex: 1000,
            minWidth: '200px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px', padding: '0 8px', fontWeight: 600 }}>
            {activeContextMenu.type === 'server' ? 'AJUSTES DEL SERVIDOR' : 'AJUSTES DEL CANAL'}
          </div>
          <button className="context-item" onClick={() => {
            setEditType(activeContextMenu.type);
            setEditId(activeContextMenu.id);
            if (activeContextMenu.type === 'server') {
              const serverToEdit = servers.find(s => s.id === activeContextMenu.id);
              setEditName(serverToEdit?.name || '');
              setEditColor(serverToEdit?.color || '');
              setEditCategory('');
            } else {
              const channelToEdit = dbChannels.find(c => c.id === activeContextMenu.id);
              setEditName(channelToEdit?.name || '');
              setEditCategory(channelToEdit?.category || '');
              setEditColor('');
            }
            setShowEditModal(true);
            closeContextMenu();
          }}>Editar</button>
          {activeContextMenu.type === 'server' && (
            <button className="context-item" style={{ color: 'var(--status-success)' }} onClick={() => { 
                const inviteLink = `${window.location.origin}/join/${activeContextMenu.id}`;
                navigator.clipboard.writeText(inviteLink);
                alert(`¡Enlace de invitación copiado al portapapeles!\n\n${inviteLink}\n\nLos brigadistas podrán unirse usando este link.`);
                closeContextMenu(); 
             }}>Invitar Brigadistas</button>
          )}
          <div style={{ height: '1px', background: 'var(--border-color)', margin: '4px 0' }} />
          <button 
            className="context-item" 
            style={{ color: 'var(--status-error)' }} 
            onClick={() => {
              if (activeContextMenu.type === 'server') handleDeleteServer(activeContextMenu.id);
              else handleDeleteChannel(activeContextMenu.id);
              closeContextMenu();
            }}
          >
            {activeContextMenu.type === 'server' ? 'Eliminar Servidor' : 'Eliminar Canal'}
          </button>
        </div>
      )}
    </div>
  );
}
