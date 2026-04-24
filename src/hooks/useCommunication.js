import { useState, useEffect, useCallback, useRef } from 'react';
import Peer from 'peerjs';
import { 
  collection, doc, onSnapshot, setDoc, deleteDoc, updateDoc,
  query, where, addDoc, orderBy, serverTimestamp, arrayUnion, arrayRemove
} from '../lib/dbService';
import { db } from '../firebaseConfig';

/**
 * useCommunication Hook
 * Handles Discord-like Voice/Video Channels using PeerJS (Mesh WebRTC)
 * and Firestore (LPE) for Signaling/Presence.
 */
export function useCommunication() {
  const [peer, setPeer] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({}); // { userId: stream }
  const [voiceState, setVoiceState] = useState({}); // { channelId: { userId: state } }
  const [currentChannelId, setCurrentChannelId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState({}); // { userId: { name, timestamp } }
  const [isConnecting, setIsConnecting] = useState(false);

  const callsRef = useRef({}); // { peerId: mediaCall }
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);

  // Helper: Setup Call Listeners
  const setupCallListeners = useCallback((call) => {
    callsRef.current[call.peer] = call;

    call.on('stream', (remoteStream) => {
      console.log('Received remote stream from:', call.peer);
      const otherUserId = call.peer.replace('movilizason-', '');
      setRemoteStreams(prev => ({ ...prev, [otherUserId]: remoteStream }));
    });

    call.on('close', () => {
      console.log('Call closed with:', call.peer);
      const otherUserId = call.peer.replace('movilizason-', '');
      setRemoteStreams(prev => {
        const next = { ...prev };
        delete next[otherUserId];
        return next;
      });
      delete callsRef.current[call.peer];
    });

    call.on('error', (err) => {
      console.error('Call error with:', call.peer, err);
      call.close();
    });
  }, []);

  // 1. Initialize Peer (Dynamic initialization based on UID)
  const initPeer = useCallback((userId) => {
    if (peer || !userId) return;

    try {
      console.log('📡 Initializing Peer for user:', userId);
      const newPeer = new Peer(`movilizason-${userId}`, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          ]
        }
      });

      newPeer.on('open', (id) => {
        console.log('✅ Peer connected successfully:', id);
        setPeer(newPeer);
      });

      newPeer.on('call', async (call) => {
        console.log('📞 Incoming call from:', call.peer);
        try {
          // If we receive a call but don't have a local stream yet (e.g. just joined),
          // we answer with what we have.
          call.answer(localStream || undefined);
          setupCallListeners(call);
        } catch (callErr) {
          console.error('❌ Error answering call:', callErr);
        }
      });

      newPeer.on('error', (err) => {
        console.error('❌ PeerJS error event:', err);
        if (err.type === 'peer-unavailable') {
          // This is a common error, don't crash
        }
      });

      newPeer.on('disconnected', () => {
        console.warn('⚠️ Peer disconnected, attempting reconnect...');
        try {
          newPeer.reconnect();
        } catch (reconnectErr) {
          console.error('❌ Reconnect failed:', reconnectErr);
        }
      });
    } catch (err) {
      console.error('❌ PeerJS critical initialization failure:', err);
      // We don't throw here to avoid crashing the whole react tree
    }
  }, [peer, localStream, setupCallListeners]);


  // 2. Voice Activity Detection (VAD)
  useEffect(() => {
    if (!localStream || !currentChannelId) return;

    const audioTrack = localStream.getAudioTracks()[0];
    if (!audioTrack) return;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('AudioContext not supported');
      return;
    }

    let interval;
    try {
      audioContextRef.current = new AudioContextClass();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(localStream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let lastSpeaking = false;
      const checkVoice = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const volume = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        const isSpeaking = volume > 30; // Threshold

        if (isSpeaking !== lastSpeaking) {
          lastSpeaking = isSpeaking;
          const userId = peer?.id?.replace('movilizason-', '');
          if (userId) {
            updateDoc(doc(db, 'voiceState', `movilizason-${userId}`), {
              isSpeaking
            }).catch(() => {});
          }
        }
      };
      
      interval = setInterval(checkVoice, 200);
      
      return () => {
        clearInterval(interval);
        if (audioContextRef.current?.state !== 'closed') {
          audioContextRef.current?.close().catch(() => {});
        }
      };
    } catch (err) {
      console.error('VAD error:', err);
    }
  }, [localStream, currentChannelId, peer]);

  // 3. Presence Listener (Isolated by Server if currentChannelId exists)
  useEffect(() => {
    // Only listen for presence if we have an active server context
    // In a multi-server setup, we usually want to see everyone in the current server.
    const q = query(collection(db, 'voiceState'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newState = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (!newState[data.channelId]) newState[data.channelId] = {};
        newState[data.channelId][data.userId] = {
          isMuted: data.isMuted,
          isVideoOn: data.isVideoOn,
          isSpeaking: data.isSpeaking,
          userName: data.userName,
          serverId: data.serverId // Track serverId
        };
      });
      setVoiceState(newState);
    });

    return () => unsubscribe();
  }, []);

  // 4. Real-time Messages & Typing Listener
  useEffect(() => {
    if (!currentChannelId) {
      setMessages([]);
      return;
    }

    const msgCol = collection(db, 'messages');
    const msgQuery = query(
      msgCol, 
      where('channelId', '==', currentChannelId),
      orderBy('createdAt', 'asc')
    );
    
    const unsubscribeMsgs = onSnapshot(msgQuery, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt).getTime();
        return timeA - timeB;
      });
      setMessages(msgs);
    });

    const typingCol = collection(db, 'typingStatus');
    const typingQuery = query(typingCol, where('channelId', '==', currentChannelId));
    
    const unsubscribeTyping = onSnapshot(typingQuery, (snapshot) => {
      const typingMap = {};
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.userId) typingMap[data.userId] = data;
      });
      setTypingUsers(typingMap);
    });

    return () => {
      unsubscribeMsgs();
      unsubscribeTyping();
    };
  }, [currentChannelId]);

  // 5. Actions
  const joinVoiceChannel = useCallback(async (userId, userName, channelId, serverId) => {
    if (!peer) {
      console.warn("Peer not initialized");
      return;
    }
    
    // Sanitize inputs to prevent Firestore crashes
    const safeUserId = userId || 'unknown';
    const safeUserName = userName || 'Operador';
    const safeChannelId = channelId || 'default';
    const safeServerId = serverId || 'default';

    setIsConnecting(true);
    setCurrentChannelId(safeChannelId);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false // Start with video off
      });
      setLocalStream(stream);

      const presenceRef = doc(db, 'voiceState', `movilizason-${safeUserId}`);
      await setDoc(presenceRef, {
        userId: safeUserId,
        userName: safeUserName,
        channelId: safeChannelId,
        serverId: safeServerId,
        isMuted: false,
        isVideoOn: false,
        isSpeaking: false,
        joinedAt: new Date().toISOString()
      }, { merge: true });

      if (voiceState[safeChannelId]) {
        Object.keys(voiceState[safeChannelId]).forEach(otherUserId => {
          if (otherUserId !== safeUserId) {
            console.log('Calling:', otherUserId);
            const call = peer.call(`movilizason-${otherUserId}`, stream);
            if (call) setupCallListeners(call);
          }
        });
      }
    } catch (e) {
      console.error('Failed to join voice channel:', e);
    } finally {
      setIsConnecting(false);
    }
  }, [peer, voiceState, setupCallListeners]);

  const leaveVoiceChannel = useCallback(async (userId) => {
    if (!userId) return;

    Object.values(callsRef.current).forEach(call => call.close());
    callsRef.current = {};
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    await deleteDoc(doc(db, 'voiceState', `movilizason-${userId}`));
    
    setRemoteStreams({});
    setCurrentChannelId(null);
  }, [localStream]);

  const toggleMute = useCallback(async (userId) => {
    if (!userId || !localStream) return;
    const audioTrack = localStream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      await updateDoc(doc(db, 'voiceState', `movilizason-${userId}`), {
        isMuted: !audioTrack.enabled
      });
    }
  }, [localStream]);

  const toggleCamera = useCallback(async (userId) => {
    if (!userId || !localStream || !navigator.mediaDevices) return;
    
    const videoTrack = localStream.getVideoTracks()[0];
    let newState = !videoTrack?.enabled;
    
    try {
      if (!videoTrack) {
        // Request video for the first time
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const newVideoTrack = newStream.getVideoTracks()[0];
        
        localStream.addTrack(newVideoTrack);
        newState = true;

        // Update active calls
        Object.values(callsRef.current).forEach(call => {
          const pc = call.peerConnection;
          if (!pc) return;
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
            sender.replaceTrack(newVideoTrack);
          } else {
            pc.addTrack(newVideoTrack, localStream);
          }
        });
      } else {
        videoTrack.enabled = !videoTrack.enabled;
        newState = videoTrack.enabled;
      }

      await updateDoc(doc(db, 'voiceState', `movilizason-${userId}`), {
        isVideoOn: newState
      });
    } catch (err) {
      console.error("Error toggling camera:", err);
    }
  }, [localStream]);

  const sendMessage = useCallback(async (userId, userName, channelId, text, media = null, forwardInfo = null) => {
    if (!text.trim() && !media) return;
    try {
      await addDoc(collection(db, 'messages'), {
        channelId,
        userId,
        userName,
        text,
        media, // { url, type, name, size }
        forwardInfo, // { fromChannelName, fromUserName }
        createdAt: serverTimestamp(),
        reactions: {} // emoji: [uids]
      });
    } catch (e) {
      console.error("Error sending message:", e);
    }
  }, []);

  const addReaction = useCallback(async (messageId, emoji, userId) => {
    if (!messageId || !emoji || !userId) return;
    try {
      const msgRef = doc(db, 'messages', messageId);
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: arrayUnion(userId)
      });
    } catch (e) {
      console.error("Error adding reaction:", e);
    }
  }, []);

  const removeReaction = useCallback(async (messageId, emoji, userId) => {
    if (!messageId || !emoji || !userId) return;
    try {
      const msgRef = doc(db, 'messages', messageId);
      await updateDoc(msgRef, {
        [`reactions.${emoji}`]: arrayRemove(userId)
      });
    } catch (e) {
      console.error("Error removing reaction:", e);
    }
  }, []);

  const forwardMessage = useCallback(async (msg, targetChannelId, currentUserId, currentUserName) => {
    if (!msg || !targetChannelId) return;
    try {
      await addDoc(collection(db, 'messages'), {
        channelId: targetChannelId,
        userId: currentUserId,
        userName: currentUserName,
        text: msg.text,
        media: msg.media,
        forwardInfo: {
          fromUserName: msg.userName,
          fromChannelId: msg.channelId
        },
        createdAt: serverTimestamp(),
        reactions: {}
      });
    } catch (e) {
      console.error("Error forwarding message:", e);
    }
  }, []);

  const setTypingStatus = useCallback(async (userId, userName, channelId, isTyping) => {
    if (!userId || !channelId) return;
    const typingRef = doc(db, 'typingStatus', `typing-${userId}-${channelId}`);
    try {
      if (isTyping) {
        await setDoc(typingRef, {
          userId,
          userName,
          channelId,
          updatedAt: serverTimestamp()
        });
      } else {
        await deleteDoc(typingRef);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }, []);

  return {
    peer,
    localStream,
    remoteStreams,
    voiceState,
    messages,
    typingUsers,
    currentChannelId,
    setCurrentChannelId,
    isConnecting,
    initPeer,
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleCamera,
    sendMessage,
    setTypingStatus,
    addReaction,
    removeReaction,
    forwardMessage
  };
}
