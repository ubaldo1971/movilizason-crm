import { useState, useEffect, useRef } from 'react';
import { useRole, formatName } from '../context/RoleContext';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, where, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { useComms } from '../context/CommunicationContext';
import { storage, ref, uploadBytes, getDownloadURL } from '../lib/dbService';
import { 
  MessageSquare, 
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
  Bell,
  AlertTriangle,
  Layers,
  ChevronDown,
  Phone,
  User,
  Smile
} from 'lucide-react';
import './Communication.css';
import LinkPreview from '../components/LinkPreview';

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
    remoteStreams,
    messages,
    typingUsers,
    setCurrentChannelId,
    sendMessage,
    setTypingStatus,
    peer,
    isConnecting,
    addReaction,
    removeReaction,
    forwardMessage
  } = useComms();
  
  const [servers, setServers] = useState([]);
  const [dbChannels, setDbChannels] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [activeChannel, setActiveChannel] = useState(null);
  const [forwardingMsg, setForwardingMsg] = useState(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [currentVoiceChannel, setCurrentVoiceChannel] = useState(null);
  const [message, setMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

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

  // Emoji Picker State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojis = ['😊', '👍', '🔥', '🚀', '✅', '⚠️', '📍', '🙌', '💡', '💬'];

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showMemberSidebar, setShowMemberSidebar] = useState(false);

  // Refs for stable state access in listeners
  const activeChannelRef = useRef(null);
  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

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
    
    const bootstrapServers = async () => {
      if (isAdmin) {
        console.log('Bootstrapping default server...');
        const defaultServer = {
          name: 'Sonora Central',
          shortName: 'SC',
          color: '#801020',
          order: 0,
          createdAt: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'comm_servers'), defaultServer);
        
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
      }
    };

    return onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      if (docs.length === 0 && isAdmin) {
        bootstrapServers();
      } else {
        setServers(docs);
        if (docs.length > 0 && !activeServer) {
          setActiveServer(docs[0].id);
        }
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
      
      // Select first channel ONLY if no channel is selected or the selected one isn't in this server
      const currentActive = activeChannelRef.current;
      if (docs.length > 0 && (!currentActive || !docs.find(c => c.id === currentActive.id))) {
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

  // Sync context with active text channel
  useEffect(() => {
    if (activeChannel?.type === 'text') {
      setCurrentChannelId(activeChannel.id);
    }
  }, [activeChannel, setCurrentChannelId]);

  // --- UI HELPERS ---
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const getUserName = (uid) => {
    const u = allUsers.find(x => x.uid === uid);
    return u ? formatName(u) : 'Usuario';
  };

  const safeGetDate = (ts) => {
    if (!ts) return new Date(); // Fallback to now if pending
    if (ts.toDate) return ts.toDate();
    if (ts instanceof Date) return ts;
    return new Date(ts);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return 'Enviando...';
    const date = safeGetDate(ts);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (isToday) return `Hoy a las ${time}`;
    return `${date.toLocaleDateString()} a las ${time}`;
  };

  const findUrls = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
  };

  const handleShareToFacebook = (url, text) => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(shareUrl, 'facebook-share-dialog', 'width=800,height=600');
  };

  // --- MESSAGING LOGIC ---
  const handleInputChange = (e) => {
    const val = e.target.value;
    setMessage(val);
    
    // Typing status
    if (activeChannel?.id && activeChannel.type === 'text') {
      setTypingStatus(user?.uid, formatName(user), activeChannel.id, val.length > 0);
    }
  };

  const handleSendMessage = async (e) => {
    if (e && e.key && e.key !== 'Enter') return;
    if (!message.trim() && !activeChannel?.id) return;

    if (!user?.uid || !activeChannel?.id) return;
    
    try {
      await sendMessage(user.uid, formatName(user), activeChannel.id, message);
      setMessage('');
      setTypingStatus(user.uid, formatName(user), activeChannel.id, false);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChannel?.id) return;

    // Limit size (20MB as defined in rules)
    if (file.size > 20 * 1024 * 1024) {
      alert("El archivo es demasiado grande (Máx 20MB)");
      return;
    }

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `chat_media/${activeChannel.id}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      const mediaInfo = {
        url,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name,
        size: file.size
      };

      await sendMessage(user.uid, formatName(user), activeChannel.id, "", mediaInfo);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error al subir archivo. Verifica tu conexión.");
    } finally {
      setIsUploading(false);
    }
  };

  const getTypingText = () => {
    const typing = Object.values(typingUsers).filter(t => t.userId !== user?.uid);
    if (typing.length === 0) return null;
    if (typing.length === 1) return `${typing[0].userName} está escribiendo...`;
    if (typing.length === 2) return `${typing[0].userName} y ${typing[1].userName} están escribiendo...`;
    return `${typing.length} personas están escribiendo...`;
  };

  const handleJoinVoice = (channel) => {
    if (currentVoiceChannel?.id === channel.id) {
      leaveVoiceChannel(user?.uid);
      setCurrentVoiceChannel(null);
      // Fallback to first text channel
      const fallback = dbChannels.find(c => c.type === 'text') || dbChannels[0];
      if (fallback) setActiveChannel(fallback);
    } else {
      joinVoiceChannel(user?.uid, formatName(user), channel.id, activeServer);
      setCurrentVoiceChannel(channel);
      setActiveChannel(channel);
    }
  };

  // --- RENDER HELPERS ---
  const categories = dbChannels
    .filter(ch => ch.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .reduce((acc, ch) => {
      const cat = acc.find(a => a.title === ch.category);
      const icon = ch.type === 'voice' ? <Volume2 size={18} /> : <MessageSquare size={18} />;
      if (cat) {
        cat.channels.push({ ...ch, icon });
      } else {
        acc.push({ title: ch.category, channels: [{ ...ch, icon }] });
      }
      return acc;
    }, []);

  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, activeChannel]);

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
          {canManage && <Plus size={18} className="cursor-pointer" onClick={() => { setNewChannelCategory('Canales de Texto'); setShowChannelModal(true); }} />}
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
              <div 
                className={`control-btn ${voiceState?.[currentVoiceChannel?.id]?.[user?.uid]?.isMuted ? 'active' : ''}`} 
                title={voiceState?.[currentVoiceChannel?.id]?.[user?.uid]?.isMuted ? 'Activar Micro' : 'Mute'} 
                onClick={() => toggleMute(user?.uid)}
              >
                {voiceState?.[currentVoiceChannel?.id]?.[user?.uid]?.isMuted ? <MicOff size={18} color="var(--status-error)" /> : <Mic size={18} />}
              </div>
              <div 
                className={`control-btn ${voiceState?.[currentVoiceChannel?.id]?.[user?.uid]?.isVideoOn ? 'active' : ''}`} 
                title="Cámara" 
                onClick={() => toggleCamera(user?.uid)}
              >
                {voiceState?.[currentVoiceChannel?.id]?.[user?.uid]?.isVideoOn ? <Video size={18} color="var(--status-success)" /> : <VideoOff size={18} />}
              </div>
              <div className="control-btn" title="Ajustes" onClick={() => setShowSettings(true)}>
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
              {activeChannel.type === 'voice' ? <Volume2 size={24} color="var(--text-secondary)" /> : <MessageSquare size={24} color="var(--text-secondary)" />}
              <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>{activeChannel.name}</span>
            </>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <Users 
              size={20} 
              className={`cursor-pointer transition-colors ${showMemberSidebar ? 'text-primary' : 'text-secondary hover:text-white'}`} 
              onClick={() => setShowMemberSidebar(!showMemberSidebar)}
            />
            <div className="search-pill" style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-app)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)', width: '160px' }}>
              <input 
                type="text" 
                placeholder="Buscar canal" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.8rem', width: '100%' }} 
              />
              <Search size={14} color="var(--text-muted)" />
            </div>
            <Bell size={20} className="cursor-pointer text-secondary hover:text-white" onClick={() => alert("Bandeja de entrada pronto disponible")} />
            <AlertTriangle size={20} className="cursor-pointer text-secondary hover:text-white" onClick={() => alert("Guía de uso: Haz clic en canales de voz para unirte, usa el '+' para enviar medios.")} />
          </div>
        </div>

        {!activeChannel ? (
          <div className="chat-area empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: '1rem' }}>
            <Plus size={64} opacity={0.1} />
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
                <Layers size={64} opacity={0.1} />
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
                    <MessageSquare size={40} color="var(--text-secondary)" />
                  </div>
                  <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>¡Te damos la bienvenida a #{activeChannel?.name}!</h1>
                  <p style={{ color: 'var(--text-muted)' }}>Este es el principio del canal #{activeChannel?.name}. Envía un mensaje para saludar.</p>
                </div>
                
                {/* Real Messages */}
                {messages.map((msg, index) => {
                  const prevMsg = messages[index - 1];
                  const msgDate = safeGetDate(msg.createdAt);
                  const prevMsgDate = prevMsg ? safeGetDate(prevMsg.createdAt) : null;
                  const isCompact = prevMsg && prevMsg.userId === msg.userId && (msgDate - prevMsgDate < 300000);
                  const urls = findUrls(msg.text || '');

                  return (
                    <div key={msg.id} className={`message-item group ${isCompact ? 'compact-msg' : ''}`}>
                      <div className="message-hover-actions">
                        <div className="emoji-quick-list">
                          {['👍', '❤️', '🔥', '😂', '😮'].map(emoji => (
                            <button 
                              key={emoji} 
                              className="quick-emoji-btn" 
                              onClick={() => msg.reactions?.[emoji]?.includes(user?.uid) ? removeReaction(msg.id, emoji, user?.uid) : addReaction(msg.id, emoji, user?.uid)}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        <div className="action-divider" />
                        <button className="action-btn" title="Reenviar Interno" onClick={() => { setForwardingMsg(msg); setShowForwardModal(true); }}>
                          <MessageSquare size={16} />
                        </button>
                        <button className="action-btn" title="Compartir en Facebook" onClick={() => handleShareToFacebook(urls[0] || window.location.href, msg.text)}>
                          <MessageSquare size={16} />
                        </button>
                        <button className="action-btn">
                          <Settings size={16} />
                        </button>
                      </div>

                      {!isCompact ? (
                        <div className="voice-avatar" style={{ flexShrink: 0, backgroundColor: msg.userId === user?.uid ? 'var(--color-primary)' : 'var(--bg-surface-elevated)' }}>
                          {getInitials(msg.userName)}
                        </div>
                      ) : (
                        <div className="compact-timestamp">{safeGetDate(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                      )}
                      
                        <div className="flex flex-col max-w-full flex-1">
                          {!isCompact && (
                            <div className="flex items-center gap-2">
                              <span style={{ fontWeight: 600, color: msg.userId === user?.uid ? 'var(--color-primary-light)' : 'var(--text-primary)' }}>
                                {msg.userName}
                              </span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                {formatTimestamp(msg.createdAt)}
                              </span>
                              {msg.forwardInfo && (
                                <span className="forwarded-tag">
                                  <MessageSquare size={10} /> Reenviado de {msg.forwardInfo.fromUserName}
                                </span>
                              )}
                            </div>
                          )}
                          {msg.text && <span className="message-text">{msg.text}</span>}
                          
                          {/* Link Previews */}
                          {urls.map((url, i) => (
                            <LinkPreview key={i} url={url} />
                          ))}

                          {/* Media Rendering */}
                          {msg.media && (
                            <div className="media-container mt-2">
                              {msg.media.type === 'image' ? (
                                <img 
                                  src={msg.media.url} 
                                  alt={msg.media.name} 
                                  className="message-image"
                                  onClick={() => window.open(msg.media.url, '_blank')}
                                />
                              ) : (
                                <div className="file-chip">
                                  <div className="chip-icon">
                                    <Plus size={20} />
                                  </div>
                                  <div className="chip-info">
                                    <span className="file-name">{msg.media.name}</span>
                                    <span className="file-size">{(msg.media.size / 1024).toFixed(1)} KB</span>
                                  </div>
                                  <a href={msg.media.url} target="_blank" rel="noreferrer" className="download-btn">Descargar</a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Reactions Display */}
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="reactions-container mt-1">
                              {Object.entries(msg.reactions).map(([emoji, users]) => {
                                if (!users || users.length === 0) return null;
                                const reacted = users.includes(user?.uid);
                                return (
                                  <button 
                                    key={emoji} 
                                    className={`reaction-chip ${reacted ? 'active' : ''}`}
                                    onClick={() => reacted ? removeReaction(msg.id, emoji, user?.uid) : addReaction(msg.id, emoji, user?.uid)}
                                    title={(allUsers || []).map(u => users.includes(u.uid) ? u.displayName : null).filter(Boolean).join(', ') || 'Usuarios'}
                                  >
                                    <span className="emoji">{emoji}</span>
                                    <span className="count">{users.length}</span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
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

              <div className="chat-input-container" style={{ background: 'var(--bg-surface-elevated)', borderRadius: '8px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />
                <Plus 
                  size={24} 
                  className={`cursor-pointer transition-colors ${isUploading ? 'animate-pulse text-primary' : 'text-muted hover:text-primary'}`} 
                  onClick={() => !isUploading && fileInputRef.current.click()}
                />
                <input 
                  type="text" 
                  value={message}
                  onChange={handleInputChange}
                  onKeyDown={handleSendMessage}
                  placeholder={`Enviar mensaje a #${activeChannel?.name || 'canal'}`}
                  style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', outline: 'none' }}
                />
                <div className="flex gap-3 text-muted" style={{ position: 'relative' }}>
                  <Video size={20} className="cursor-pointer hover:text-primary transition-colors" title="Compartir Video (Opcional)" onClick={() => alert("Función de compartir archivos de video pronto disponible")} />
                  <Smile size={20} className="cursor-pointer hover:text-primary transition-colors" title="Emoji" onClick={() => alert("Librería de emojis pronto disponible")} />
                  <MessageSquare 
                    size={20} 
                    className={`cursor-pointer transition-colors ${showEmojiPicker ? 'text-primary' : 'hover:text-primary'}`} 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                  />
                  
                  {showEmojiPicker && (
                    <div className="emoji-picker-mini animate-fade-in" style={{
                      position: 'absolute',
                      bottom: '40px',
                      right: '0',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '8px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                      zIndex: 100
                    }}>
                      {emojis.map(e => (
                        <span 
                          key={e} 
                          className="cursor-pointer hover:scale-120 transition-transform p-1" 
                          onClick={() => {
                            setMessage(prev => prev + e);
                            setShowEmojiPicker(false);
                          }}
                        >
                          {e}
                        </span>
                      ))}
                    </div>
                  )}
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
      {/* Settings Modal */}
      {showSettings && (
        <div className="comm-modal-overlay">
          <div className="comm-modal settings-modal animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="m-0">Ajustes de Comunicación</h2>
              <div className="cursor-pointer text-muted hover:text-white" onClick={() => setShowSettings(false)}>✕</div>
            </div>
            
            <div className="settings-section">
              <h3>Estado de Conexión</h3>
              <div className="status-grid">
                <div className="status-item">
                  <span className="label">Tu ID de Red:</span>
                  <code className="value">movilizason-{user?.uid?.substring(0, 8)}...</code>
                </div>
                <div className="status-item">
                  <span className="label">PeerJS Status:</span>
                  <span className={`value status-dot ${peer ? 'connected' : 'connecting'}`}>
                    {peer ? 'Conectado' : 'Conectando...'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Servidor Central:</span>
                  <span className="value">Región Sonora ID: 0x4432</span>
                </div>
              </div>
            </div>

            <div className="settings-section mt-6">
              <h3>Permisos de Dispositivo</h3>
              <div className="perms-list">
                <div className="perm-item">
                  <span>Micrófono</span>
                  <div className="status-tag active">Detectado</div>
                </div>
                <div className="perm-item">
                  <span>Cámara</span>
                  <div className="status-tag active">Detectada</div>
                </div>
              </div>
            </div>

            <div className="modal-actions mt-8">
              <button className="primary w-full" onClick={() => setShowSettings(false)}>Cerrar y Regresar</button>
            </div>
          </div>
        </div>
      )}

      {/* Member Sidebar (Conditional) */}
      {showMemberSidebar && (
        <div className="member-sidebar animate-slide-left">
          <div className="sidebar-header">
            <h3>Miembros — {allUsers.length}</h3>
          </div>
          <div className="member-list">
            <div className="member-category">ADMINS — {allUsers.filter(u => u.role?.includes('Admin')).length}</div>
            {allUsers.filter(u => u.role?.includes('Admin')).map(u => (
              <div key={u.uid} className="member-item">
                <div className="voice-avatar" style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>
                  {getInitials(formatName(u))}
                </div>
                <span className="truncate">{formatName(u)}</span>
                <span className="role-tag admin">{u.role?.split('_')[0]}</span>
              </div>
            ))}
            
            <div className="member-category mt-4">BRIGADISTAS — {allUsers.filter(u => !u.role?.includes('Admin')).length}</div>
            {allUsers.filter(u => !u.role?.includes('Admin')).map(u => (
              <div key={u.uid} className="member-item">
                <div className="voice-avatar" style={{ width: '24px', height: '24px', fontSize: '0.7rem' }}>
                  {getInitials(formatName(u))}
                </div>
                <span className="truncate">{formatName(u)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Forward Modal */}
      {showForwardModal && (
        <div className="comm-modal-overlay">
          <div className="comm-modal forward-modal animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="m-0">Reenviar mensaje</h2>
              <div className="cursor-pointer text-muted hover:text-white" onClick={() => setShowForwardModal(false)}>✕</div>
            </div>
            
            <p className="text-sm text-muted mb-4">Selecciona un canal para reenviar este contenido:</p>
            
            <div className="forward-destination-list">
              {dbChannels.filter(c => c.type === 'text').map(ch => (
                <div 
                  key={ch.id} 
                  className="forward-channel-item"
                  onClick={async () => {
                    if (!user) return;
                    await forwardMessage(forwardingMsg, ch.id, user.uid, formatName(user));
                    setShowForwardModal(false);
                    setForwardingMsg(null);
                    // Optionally switch to that channel
                    setActiveChannel(ch);
                  }}
                >
                  <MessageSquare size={18} />
                  <span>{ch.name}</span>
                  <ChevronDown size={14} className="ml-auto opacity-0 group-hover:opacity-100 -rotate-90" />
                </div>
              ))}
            </div>

            <div className="modal-actions mt-6">
              <button className="w-full" onClick={() => setShowForwardModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
