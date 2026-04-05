import { createContext, useContext, useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, increment, getDocs, query, where, serverTimestamp } from '../lib/dbService';
import { db } from '../firebaseConfig';
import { DEFAULT_TASK_TYPES } from '../hooks/useScoringEngine';
import { createDirectConversation } from '../hooks/useMessages';

export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_ESTATAL: 'Admin Estatal',
  COORD_DISTRITAL_FED: 'Coordinador Distrital Federal',
  COORD_DISTRITAL_LOC: 'Coordinador Distrital Local',
  COORD_SECCIONAL: 'Coordinador Seccional',
  BRIGADISTA: 'Brigadista / Operador',
};

export const ROLE_COLORS = {
  [ROLES.SUPER_ADMIN]: '#ef4444', // Red
  [ROLES.ADMIN_ESTATAL]: '#f97316', // Orange
  [ROLES.COORD_DISTRITAL_FED]: '#3b82f6', // Blue
  [ROLES.COORD_DISTRITAL_LOC]: '#0ea5e9', // Light Blue
  [ROLES.COORD_SECCIONAL]: '#8b5cf6', // Violet
  [ROLES.BRIGADISTA]: '#eab308', // Yellow
};

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const [currentUser, setCurrentUser] = useState({
    uid: 'admin_demo',
    displayName: 'Super Admin',
    role: ROLES.SUPER_ADMIN,
    pin: '000000',
    assignments: {
      districtsFed: ['03', '05'],
      districtsLoc: ['01', '02'],
      sections: ['0841', '0842', '1201']
    }
  });
  
  const [tasks, setTasks] = useState([]);
  const [evidence, setEvidence] = useState([]);
  
  // Security settings
  const [requirePinForTasks, setRequirePinForTasks] = useState(true);

  // Helper to verify PIN
  const verifyPin = async (userId, pin) => {
    const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', userId)));
    if (!userDoc.docs.length) return false;
    const userData = userDoc.docs[0].data();
    return userData.pin === pin;
  };

  // Fetch tasks and evidence real-time
  useEffect(() => {
    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(tasksData);
    });

    const unsubEvidence = onSnapshot(collection(db, 'evidence'), (snapshot) => {
      let evList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter based on role and territory
      if (currentUser.role === ROLES.SUPER_ADMIN || currentUser.role === ROLES.ADMIN_ESTATAL) {
        // Full access
      } else if (currentUser.role === ROLES.COORD_DISTRITAL_FED) {
        evList = evList.filter(e => currentUser.assignments?.districtsFed?.includes(e.distFederal));
      } else if (currentUser.role === ROLES.COORD_DISTRITAL_LOC) {
        evList = evList.filter(e => currentUser.assignments?.districtsLoc?.includes(e.distLocal));
      } else if (currentUser.role === ROLES.COORD_SECCIONAL) {
        evList = evList.filter(e => currentUser.assignments?.sections?.includes(e.section));
      } else {
        // Brigadista sees only their own
        evList = evList.filter(e => e.uploadedBy === currentUser.uid);
      }
      
      setEvidence(evList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    });

    return () => {
      unsubTasks();
      unsubEvidence();
    };
  }, [currentUser]);

  const uploadEvidence = async (fileData, metadata) => {
    try {
      const evidenceData = {
        ...metadata,
        uploadedBy: currentUser.uid,
        userName: currentUser.displayName,
        timestamp: new Date().toISOString(),
        url: fileData.url || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=1000",
        thumbnail: fileData.url || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=100",
      };

      const docRef = await addDoc(collection(db, 'evidence'), evidenceData);
      return docRef.id;
    } catch (err) {
      console.error("Error uploading evidence:", err);
      return null;
    }
  };

  const completeTask = async (taskId, completionData) => {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnapshot = tasks.find(t => t.id === taskId);
    
    await updateDoc(taskRef, { 
      status: completionData.status,
      completed: true, 
      completionNotes: completionData.notes,
      completionPhotos: completionData.photos,
      pointsEarned: completionData.pointsEarned || 0,
      completionDetails: completionData.details || {},
      completedAt: new Date().toISOString()
    });

    if (completionData.pointsEarned > 0 && taskSnapshot?.assigneeId) {
      const userRef = doc(db, 'users', taskSnapshot.assigneeId);
      const typeId = taskSnapshot.taskType || 'asamblea';
      const taskMeta = DEFAULT_TASK_TYPES.find(t => t.id === typeId);
      const category = taskMeta?.category || 'otros';

      const userUpdates = {
        totalPoints: increment(completionData.pointsEarned),
        tasksCompleted: increment(1)
      };

      userUpdates[`points_${category}`] = increment(completionData.pointsEarned);
      await updateDoc(userRef, userUpdates);

      if (taskSnapshot.brigadeId) {
        const brigadeRef = doc(db, 'brigades', taskSnapshot.brigadeId);
        const brigadeUpdates = {
          totalScore: increment(completionData.pointsEarned),
          tasksCompleted: increment(1)
        };
        brigadeUpdates[`pointsByTask.${category}`] = increment(completionData.pointsEarned);
        await updateDoc(brigadeRef, brigadeUpdates);
      }
    }
  };

  const updateTaskStatus = async (taskId, newStatus, pointsData = null) => {
    const taskRef = doc(db, 'tasks', taskId);
    const updateData = { 
      status: newStatus,
      completed: ['COMPLETED', 'COMPLETED_WITH_DETAILS', 'CANCELLED'].includes(newStatus)
    };

    if (pointsData) {
      updateData.pointsEarned = pointsData.points;
      updateData.completionDetails = pointsData.details;
    }

    await updateDoc(taskRef, updateData);
    
    if (['COMPLETED', 'COMPLETED_WITH_DETAILS'].includes(newStatus) && pointsData) {
      const taskSnapshot = tasks.find(t => t.id === taskId);
      if (taskSnapshot?.assigneeId) {
        const userRef = doc(db, 'users', taskSnapshot.assigneeId);
        const typeId = taskSnapshot.taskType || 'asamblea';
        const taskMeta = DEFAULT_TASK_TYPES.find(t => t.id === typeId);
        const category = taskMeta?.category || 'otros';

        const userUpdates = {
          totalPoints: increment(pointsData.points),
          tasksCompleted: increment(1)
        };
        userUpdates[`points_${category}`] = increment(pointsData.points);
        await updateDoc(userRef, userUpdates);
        
        if (taskSnapshot.brigadeId) {
          const brigadeRef = doc(db, 'brigades', taskSnapshot.brigadeId);
          const brigadeUpdates = {
            totalScore: increment(pointsData.points),
            tasksCompleted: increment(1)
          };
          brigadeUpdates[`pointsByTask.${category}`] = increment(pointsData.points);
          await updateDoc(brigadeRef, brigadeUpdates);
        }
      }
    }
  };

  const addTask = async (newTaskData) => {
    const taskData = {
      ...newTaskData,
      assignerId: currentUser.uid,
      status: 'PENDING',
      completed: false,
      createdAt: serverTimestamp()
    };
    
    const taskRef = await addDoc(collection(db, 'tasks'), taskData);

    if (taskData.assigneeId) {
      try {
        const convoId = await createDirectConversation(
          currentUser.uid, 
          taskData.assigneeId,
          currentUser.displayName + ' ' + (currentUser.surname || ''),
          taskData.assignee || 'Usuario'
        );

        const msgRef = collection(db, 'conversations', convoId, 'messages');
        await addDoc(msgRef, {
          text: `📋 Nueva Tarea Operativa: "${taskData.title}"\nVence: ${taskData.dueDate}`,
          sentBy: currentUser.uid,
          sentAt: serverTimestamp(),
          type: 'text',
          taskId: taskRef.id,
          readBy: [currentUser.uid]
        });

        await updateDoc(doc(db, 'conversations', convoId), {
          lastMessage: {
            text: `📋 Nueva Tarea: ${taskData.title}`,
            sentBy: currentUser.uid,
            sentAt: new Date().toISOString(),
          },
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.error('Error sending task notification message:', e);
      }
    }
  };

  return (
    <RoleContext.Provider value={{ 
      role: currentUser.role, 
      setRole: (r) => setCurrentUser(prev => ({ ...prev, role: r })), 
      currentUser, 
      setCurrentUser,
      ROLES, 
      ROLE_COLORS, 
      tasks: tasks.filter(t => {
        if (currentUser.role === ROLES.SUPER_ADMIN || currentUser.role === ROLES.ADMIN_ESTATAL) return true;
        if (t.assigneeId === currentUser.uid || t.assignerId === currentUser.uid) return true;
        return false;
      }), 
      completeTask, 
      addTask: (task) => addTask({ ...task, assignerId: currentUser.uid }), 
      updateTaskStatus,
      verifyPin,
      requirePinForTasks, setRequirePinForTasks,
      uploadEvidence,
      evidence
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
