import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, setDoc, doc, increment, serverTimestamp } from '../lib/dbService';
import { db } from '../firebaseConfig';
import { createDirectConversation } from '../hooks/useMessages';
import { bootstrapFirebase } from '../lib/dbService';

export const ROLES = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_ESTATAL: 'Admin Estatal',
  COORD_DISTRITAL_FED: 'Coordinador Distrital Federal',
  COORD_DISTRITAL_LOC: 'Coordinador Distrital Local',
  COORD_SECCIONAL: 'Coordinador Seccional',
  BRIGADISTA: 'Brigadista / Operador',
};

export const ROLE_COLORS = {
  [ROLES.SUPER_ADMIN]: '#ef4444',
  [ROLES.ADMIN_ESTATAL]: '#f97316',
  [ROLES.COORD_DISTRITAL_FED]: '#3b82f6',
  [ROLES.COORD_DISTRITAL_LOC]: '#0ea5e9',
  [ROLES.COORD_SECCIONAL]: '#8b5cf6',
  [ROLES.BRIGADISTA]: '#eab308',
};

const RoleContext = createContext();

export const formatName = (user) => {
  if (!user) return 'Usuario';
  const { displayName, surname } = user;
  const cleanDisplay = displayName?.replace(' undefined', '') || '';
  const cleanSurname = surname?.replace(' undefined', '') || '';
  
  if (!cleanDisplay && !cleanSurname) return 'Usuario';
  return `${cleanDisplay}${cleanSurname ? ' ' + cleanSurname : ''}`.trim();
};

export function RoleProvider({ children }) {
  const [currentUser, setCurrentUser] = useState({ uid: 'mock', role: 'Super Admin', displayName: 'Mock User', surname: 'Test' });
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Iniciando sistemas...');

  const [tasks, setTasks] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [medalTypes, setMedalTypes] = useState([]);
  const [awardedMedals, setAwardedMedals] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [commitmentTypes, setCommitmentTypes] = useState([]);
  
  const [requirePinForTasks, setRequirePinForTasks] = useState(true);
  const [requireEvidence, setRequireEvidence] = useState(true);

  const currentUserAssignments = useMemo(() => {
    return currentUser?.assignments || {
      districtsFed: [],
      districtsLoc: [],
      sections: []
    };
  }, [currentUser?.assignments]);

  const verifyPin = async (userId, pin) => {
    const user = allUsers.find(u => u.uid === userId);
    return user?.pin === pin;
  };

  const updateUserPin = async (userId, newPin) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { pin: newPin });
  };

  // 1. Initial State Fetch
  useEffect(() => {
    const unsubs = [];
    const initAndFetch = async () => {
      try {
        setLoadingStatus('Conectando a la nube...');
        await bootstrapFirebase();
        
        // Listeners con manejo de errores persistente
        const errorCallback = (err) => {
          console.error("Firebase Snapshot Error:", err);
          // Si es un error de permisos o desconexión, al menos liberamos el loading inicial
          setLoading(false);
        };

        const unsubUsers = onSnapshot(collection(db, 'users'), 
          (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() }));
            setAllUsers(users);
            setLoading(false);
          }, 
          errorCallback
        );
        unsubs.push(unsubUsers);

        const unsubMedals = onSnapshot(collection(db, 'medalTypes'), 
          (snapshot) => {
            setMedalTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          },
          errorCallback
        );
        unsubs.push(unsubMedals);

        const unsubCommits = onSnapshot(collection(db, 'commitmentTypes'), 
          (snapshot) => {
            setCommitmentTypes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          },
          errorCallback
        );
        unsubs.push(unsubCommits);

        // Listener para medallas otorgadas (necesario para el Profile)
        const unsubAwarded = onSnapshot(collection(db, 'awardedMedals'),
          (snapshot) => {
            setAwardedMedals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          },
          errorCallback
        );
        unsubs.push(unsubAwarded);

      } catch (err) {
        console.error("Context Init failed:", err);
        setLoading(false);
      }
    };
    initAndFetch();
    return () => unsubs.forEach(unsub => unsub());
  }, []);

  // 2. Auth Dependent Fetch
  useEffect(() => {
    if (!currentUser) return;

    const errorCallback = (err) => console.error("Auth Snapshot Error:", err);

    const unsubs = [
      onSnapshot(collection(db, 'tasks'), 
        (snap) => {
          setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        },
        errorCallback
      ),
      onSnapshot(collection(db, 'evidence'), 
        (snap) => {
          let evList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          if (currentUser.role !== ROLES.SUPER_ADMIN && currentUser.role !== ROLES.ADMIN_ESTATAL) {
            evList = evList.filter(e => e.uploadedBy === currentUser.uid); 
          }
          setEvidence(evList.sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)));
        },
        errorCallback
      ),
      onSnapshot(collection(db, 'reports'), 
        (snap) => {
          setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)));
        },
        errorCallback
      )
    ];
    return () => unsubs.forEach(u => u());
  }, [currentUser]);

  const updateProfile = async (userId, updates) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, updates);
    if (currentUser?.uid === userId) setCurrentUser(prev => ({ ...prev, ...updates }));
    return true;
  };

  const awardMedal = async (userId, medalId, reason = "") => {
    const medal = medalTypes.find(m => m.id === medalId);
    const awardData = {
      userId, medalId,
      medalName: medal?.name || "Medalla Especial",
      medalIcon: medal?.icon || "Award",
      medalColor: medal?.color || "#ef4444",
      reason, awardedBy: formatName(currentUser),
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, 'awardedMedals'), awardData);
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { medals: increment(1) });
  };

  const addTask = async (taskData) => {
    const docRef = await addDoc(collection(db, 'tasks'), {
      ...taskData,
      assignerId: currentUser.uid,
      status: 'PENDING',
      createdAt: serverTimestamp()
    });
    return docRef.id;
  };

  const completeTask = async (taskId, completionData) => {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, { 
      status: 'COMPLETED',
      completed: true, 
      completedAt: new Date().toISOString(),
      completedBy: currentUser.uid 
    });
  };

  const VALID_PINS = allUsers.map(u => u.pin).filter(p => p && String(p).length === 6);

  return (
    <RoleContext.Provider value={{ 
      role: currentUser?.role || 'Guest', 
      currentUser, setCurrentUser,
      currentUserAssignments,
      ROLES, ROLE_COLORS, VALID_PINS,
      tasks: tasks.filter(t => {
        if (!currentUser) return false;
        if (currentUser.role === ROLES.SUPER_ADMIN) return true;
        return t.assigneeId === currentUser.uid || t.assignerId === currentUser.uid;
      }), 
      completeTask, addTask, verifyPin,
      requirePinForTasks, requireEvidence, 
      evidence, medalTypes, awardedMedals,
      allUsers, updateUserPin, awardMedal, formatName, reports,
      usersCount: allUsers.length,
      commitmentTypes: commitmentTypes.filter(t => !t.deleted),
      updateProfile
    }}>
      {loading ? (
        <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f1115' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', border: '4px solid rgba(128,0,32,0.1)', borderTopColor: '#801020', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: '#9ca3af', fontSize: '1rem' }}>{loadingStatus}</p>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  return context || { role: '', ROLES: {}, currentUser: {}, currentUserAssignments: {} };
}
