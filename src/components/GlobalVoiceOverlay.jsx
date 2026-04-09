import { useComms } from '../context/CommunicationContext';
import { useRole } from '../context/RoleContext';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Volume2,
  Signal
} from 'lucide-react';

export default function GlobalVoiceOverlay() {
  const { currentUser } = useRole();
  const { 
    currentChannelId, 
    voiceState, 
    leaveVoiceChannel, 
    toggleMute, 
    toggleCamera 
  } = useComms();

  if (!currentChannelId || !currentUser) return null;

  const myState = voiceState?.[currentChannelId]?.[currentUser?.uid];
  
  // Find channel name (simplified for global use)
  const channelName = currentChannelId === 'comando' ? 'Comando Central' : 
                      currentChannelId === 'enlace' ? 'Enlace Territorial' : 
                      currentChannelId === 'emergencia' ? 'EMERGENCIA' : currentChannelId;

  return (
    <div className="voice-overlay-container" style={{
      position: 'fixed',
      bottom: '1rem',
      left: '1rem',
      width: '240px',
      backgroundColor: 'var(--bg-surface-elevated)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      border: '1px solid var(--border-color)',
      padding: '12px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      animation: 'slide-up 0.3s ease-out'
    }}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2" style={{ color: 'var(--status-success)', fontSize: '0.75rem', fontWeight: 700 }}>
            <Signal size={12} />
            VOZ CONECTADA
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{channelName}</span>
        </div>
        <button 
          onClick={() => leaveVoiceChannel(currentUser?.uid)}
          style={{ 
            width: '32px', height: '32px', borderRadius: '50%', 
            backgroundColor: 'var(--status-error)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <PhoneOff size={16} />
        </button>
      </div>

      <div className="flex justify-around items-center" style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px' }}>
        <button 
          onClick={() => toggleMute(currentUser?.uid)}
          className={`btn-icon ${myState?.isMuted ? 'text-error' : 'text-primary'}`}
          title={myState?.isMuted ? 'Activar Micrófono' : 'Silenciar'}
        >
          {myState?.isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        
        <button 
          onClick={() => toggleCamera(currentUser?.uid)}
          className={`btn-icon ${myState?.isVideoOn ? 'text-success' : 'text-secondary'}`}
          title={myState?.isVideoOn ? 'Desactivar Cámara' : 'Activar Cámara'}
        >
          {myState?.isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>

        <button className="btn-icon text-muted" title="Ajustes de Voz">
          <Volume2 size={20} />
        </button>
      </div>
    </div>
  );
}
