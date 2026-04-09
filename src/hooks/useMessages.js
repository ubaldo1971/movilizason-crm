import { useState, useEffect, useCallback } from 'react';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc,
  doc, serverTimestamp, arrayUnion, arrayRemove, deleteDoc, getDocs, limit, setDoc, getDoc
} from '../lib/dbService';
import { db } from '../firebaseConfig';

export function useConversations(userId, role, assignments) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    // Base query: Always show chats where the user is a participant
    let q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    // Note: Complex hierarchical visibility where coordinators see ALL chats in their zone 
    // even without being participants is handled here by expanding the query if needed,
    // but typically a coordinator is automatically a participant in sub-chats.
    // For this implementation, we will filter the results based on the assignments provided.

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let convos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Hierarchical Filtering Logic
      const ROLES = {
        SUPER_ADMIN: 'Super Admin',
        ADMIN_ESTATAL: 'Admin Estatal',
        COORD_DISTRITAL_FED: 'Coordinador Distrital Federal',
        COORD_DISTRITAL_LOC: 'Coordinador Distrital Local',
        COORD_SECCIONAL: 'Coordinador Seccional'
      };

      if (role !== ROLES.SUPER_ADMIN && role !== ROLES.ADMIN_ESTATAL) {
        convos = convos.filter(convo => {
          // If it's a direct message, we assume if they are a participant (base query) it's allowed.
          if (convo.type === 'direct') return true;

          // For brigade/group chats, check territory overlap
          if (convo.type === 'brigade') {
            if (!assignments) return false;
            if (role === ROLES.COORD_SECCIONAL) {
              // Must overlap with assigned sections
              return convo.sections?.some(sec => assignments.sections?.includes(sec));
            }
            if (role === ROLES.COORD_DISTRITAL_FED) {
              return assignments.districtsFed?.includes(convo.districtFed);
            }
            if (role === ROLES.COORD_DISTRITAL_LOC) {
              return assignments.districtsLoc?.includes(convo.districtLoc);
            }
          }
          return true;
        });
      }

      setConversations(convos);
      setLoading(false);
    }, (error) => {
      console.error('Conversations listener error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, role, assignments]);

  return { conversations, loading };
}

export function useMessages(conversationId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) { setMessages([]); setLoading(false); return; }

    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('sentAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [conversationId]);

  return { messages, loading };
}

export function useSendMessage() {
  const sendMessage = useCallback(async (conversationId, messageData) => {
    const msgRef = collection(db, 'conversations', conversationId, 'messages');
    const message = {
      ...messageData,
      sentAt: serverTimestamp(),
      readBy: [messageData.sentBy],
      isPinned: false,
      replyTo: messageData.replyTo || null
    };
    
    await addDoc(msgRef, message);
    
    // Update conversation's last message
    await updateDoc(doc(db, 'conversations', conversationId), {
      lastMessage: {
        text: messageData.text,
        sentBy: messageData.sentBy,
        sentAt: new Date().toISOString(),
        type: messageData.type
      },
      updatedAt: serverTimestamp()
    });
  }, []);

  return sendMessage;
}

export async function createDirectConversation(userId1, userId2, user1Name, user2Name) {
  // Check if conversation already exists between these two
  const q = query(
    collection(db, 'conversations'),
    where('type', '==', 'direct'),
    where('participants', 'array-contains', userId1)
  );
  
  const snapshot = await getDocs(q);
  const existing = snapshot.docs.find(d => {
    const data = d.data();
    return data.participants.includes(userId2);
  });

  if (existing) return existing.id;

  const convoRef = await addDoc(collection(db, 'conversations'), {
    type: 'direct',
    brigadeId: null,
    participants: [userId1, userId2],
    participantNames: { [userId1]: user1Name, [userId2]: user2Name },
    lastMessage: null,
    unreadCount: { [userId1]: 0, [userId2]: 0 },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return convoRef.id;
}

export async function createBrigadeConversation(brigadeId, brigadeName, memberIds, territoryInfo = {}) {
  const convoRef = await addDoc(collection(db, 'conversations'), {
    type: 'brigade',
    brigadeId,
    brigadeName,
    participants: memberIds,
    participantNames: {},
    // Territory metadata for hierarchical filtering
    sections: territoryInfo.sections || [],
    districtFed: territoryInfo.districtFed || null,
    districtLoc: territoryInfo.districtLoc || null,
    lastMessage: null,
    unreadCount: {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return convoRef.id;
}

export async function markAsRead(conversationId, userId) {
  // Mark all unread messages as read for this user
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('sentAt', 'desc'),
    limit(50)
  );
  const snapshot = await getDocs(q);
  const batch = [];
  snapshot.docs.forEach(d => {
    const data = d.data();
    if (!data.readBy?.includes(userId)) {
      batch.push(updateDoc(d.ref, { readBy: arrayUnion(userId) }));
    }
  });
  await Promise.all(batch);
  
  // Reset unread count
  await updateDoc(doc(db, 'conversations', conversationId), {
    [`unreadCount.${userId}`]: 0
  });
}

export async function toggleMute(conversationId, userId, isCurrentlyMuted) {
  const convoRef = doc(db, 'conversations', conversationId);
  if (isCurrentlyMuted) {
    await updateDoc(convoRef, {
      mutedBy: arrayRemove(userId)
    });
  } else {
    await updateDoc(convoRef, {
      mutedBy: arrayUnion(userId)
    });
  }
}

export async function leaveBrigade(conversationId, userId) {
  const convoRef = doc(db, 'conversations', conversationId);
  const convoDoc = await getDoc(convoRef);
  const convoData = convoDoc.data();

  // Remove from conversation participants
  await updateDoc(convoRef, {
    participants: arrayRemove(userId)
  });

  // If it's a brigade, also remove from the brigade document
  if (convoData.type === 'brigade' && convoData.brigadeId) {
    const brigadeRef = doc(db, 'brigades', convoData.brigadeId);
    const brigadeDoc = await getDoc(brigadeRef);
    if (brigadeDoc.exists()) {
      const bData = brigadeDoc.data();
      const memberToRemove = bData.members?.find(m => m.id === userId);
      if (memberToRemove) {
        await updateDoc(brigadeRef, {
          members: arrayRemove(memberToRemove)
        });
      }
      // If was leader, clear leader
      if (bData.leader?.id === userId) {
        await updateDoc(brigadeRef, { leader: null });
      }
    }
  }

  // Update user profile
  await updateDoc(doc(db, 'users', userId), {
    brigadeId: null,
    brigadeName: 'Sin brigada'
  });
}

export async function clearConversationMessages(conversationId) {
  const msgsRef = collection(db, 'conversations', conversationId, 'messages');
  const snapshot = await getDocs(msgsRef);
  
  // Note: For large chats, this should be a batch or a cloud function.
  // For standard CRM usage, we delete the docs in parallel.
  const deletions = snapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletions);

  // Update last message
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessage: { text: 'Historial vaciado', type: 'system', sentAt: new Date().toISOString() }
  });
}
