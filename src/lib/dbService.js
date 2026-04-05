import { 
  collection as fsCollection, 
  doc as fsDoc, 
  setDoc as fsSetDoc, 
  updateDoc as fsUpdateDoc, 
  onSnapshot as fsOnSnapshot, 
  query as fsQuery, 
  orderBy as fsOrderBy, 
  limit as fsLimit,
  increment as fsIncrement,
  getDocs as fsGetDocs,
  getDoc as fsGetDoc,
  where as fsWhere
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// --- LOCAL STORAGE PERSISTENCE ENGINE (LPE) ---
const LPE_PREFIX = 'movilizason_local_db_';

const getLocalData = (collectionName) => {
  const data = localStorage.getItem(LPE_PREFIX + collectionName);
  return data ? JSON.parse(data) : {};
};

const setLocalData = (collectionName, data) => {
  localStorage.setItem(LPE_PREFIX + collectionName, JSON.stringify(data));
  // Notify listeners
  window.dispatchEvent(new CustomEvent(`lpe_update_${collectionName}`, { detail: data }));
};

// --- MOCK SEED DATA ---
const SEED_DATA = {
  users: {
    'u1': { uid: 'u1', displayName: 'Carlos', surname: 'Ruiz', role: 'Coordinador Seccional', section: '0841', distFederal: '03', distLocal: '01', brigadeName: '🛡️ Brigada Norte D3', totalPoints: 1250, tasksCompleted: 45, assemblies: 12, visits: 120, murals: 8, tasksAssigned: 50, pin: '123456' },
    'u2': { uid: 'u2', displayName: 'María', surname: 'López', role: 'Brigadista / Operador', section: '0841', distFederal: '03', distLocal: '01', brigadeName: '🛡️ Brigada Norte D3', totalPoints: 1180, tasksCompleted: 42, assemblies: 10, visits: 115, murals: 5, tasksAssigned: 45, pin: '197171' },
    'admin_demo': { uid: 'admin_demo', displayName: 'Super', surname: 'Admin', role: 'Super Admin', totalPoints: 0, tasksCompleted: 0, pin: '000000' }
  },
  brigades: {
    'b1': { id: 'b1', name: '🛡️ Brigada Norte D3', memberCount: 12, totalScore: 3250, tasksCompleted: 150, tasksAssigned: 160, pointsByTask: { asambleas: 1200, visitas: 1500, murales: 550 } },
    'b2': { id: 'b2', name: '🌊 Brigada Costa D6', memberCount: 6, totalScore: 3100, tasksCompleted: 140, tasksAssigned: 150, pointsByTask: { asambleas: 1500, visitas: 1200, murales: 400 } }
  },
  messages: {},
  evidence: {}
};

// Initialize Local Store if empty
Object.keys(SEED_DATA).forEach(col => {
  const key = LPE_PREFIX + col;
  if (!localStorage.getItem(key)) {
    localStorage.setItem(key, JSON.stringify(SEED_DATA[col]));
  }
});

// --- HYBRID EXPORTS ---

const isFirebaseSafe = () => {
  // Simple check to see if database exists or if we should use local
  // For now, we enable Hybrid: if Firebase fails, we don't crash.
  return false; // FORCE LOCAL MODE for this demo until user enables billing
};

export const collection = (db, name) => {
  return { type: 'collection', name };
};

export const doc = (db, colName, id) => {
  if (typeof db === 'string') return { type: 'doc', colName: db, id: colName }; // overload
  return { type: 'doc', colName: colName.name, id };
};

export const increment = (n) => {
  return { type: 'increment', value: n };
};

export const updateDoc = async (docRef, updates) => {
  const { colName, id } = docRef;
  const data = getLocalData(colName);
  const docData = data[id] || {};
  
  Object.keys(updates).forEach(key => {
    if (updates[key] && updates[key].type === 'increment') {
      docData[key] = (docData[key] || 0) + updates[key].value;
    } else if (updates[key] && updates[key].type === 'arrayUnion') {
      const currentArr = Array.isArray(docData[key]) ? docData[key] : [];
      const newElements = updates[key].elements.filter(el => !currentArr.includes(el));
      docData[key] = [...currentArr, ...newElements];
    } else {
      docData[key] = updates[key];
    }
  });

  data[id] = { ...docData, id, uid: id };
  setLocalData(colName, data);
  return true;
};

export const setDoc = async (docRef, content) => {
  const { colName, id } = docRef;
  const data = getLocalData(colName);
  data[id] = { ...content, id, uid: id };
  setLocalData(colName, data);
  return true;
};

export const deleteDoc = async (docRef) => {
  const { colName, id } = docRef;
  const data = getLocalData(colName);
  delete data[id];
  setLocalData(colName, data);
  return true;
};

export const onSnapshot = (ref, callback, onError) => {
  if (ref.type === 'doc') {
    const handler = () => {
      const data = getLocalData(ref.colName);
      const docData = data[ref.id];
      callback({
        exists: () => !!docData,
        data: () => docData,
        id: ref.id,
        ref: ref
      });
    };
    window.addEventListener(`lpe_update_${ref.colName}`, handler);
    handler(); // Initial call
    return () => window.removeEventListener(`lpe_update_${ref.colName}`, handler);
  } else {
    // Collection
    const handler = () => {
      const data = getLocalData(ref.name);
      const docs = Object.values(data).map(d => ({
        id: d.id || d.uid,
        data: () => d,
        get ref() { return doc(null, ref.name, d.id || d.uid); }
      }));
      callback({ docs });
    };
    window.addEventListener(`lpe_update_${ref.name}`, handler);
    handler(); // Initial call
    return () => window.removeEventListener(`lpe_update_${ref.name}`, handler);
  }
};

export const addDoc = async (colRef, content) => {
  const colName = colRef.name;
  const data = getLocalData(colName);
  const id = 'temp_' + Math.random().toString(36).substr(2, 9);
  data[id] = { ...content, id, uid: id, createdAt: new Date().toISOString() };
  setLocalData(colName, data);
  return { id, ref: doc(null, colName, id) };
};

export const query = (colRef, ...constraints) => {
  return colRef; // Simple mock, filters handled in component if needed or by sort
};

export const orderBy = (field, dir) => ({ type: 'orderBy', field, dir });
export const limit = (n) => ({ type: 'limit', value: n });
export const where = (field, op, value) => ({ type: 'where', field, op, value });

export const arrayUnion = (...elements) => ({ type: 'arrayUnion', elements });

export const serverTimestamp = () => new Date().toISOString();

export const getDoc = async (docRef) => {
  const data = getLocalData(docRef.colName);
  const docData = data[docRef.id];
  return {
    exists: () => !!docData,
    data: () => docData,
    id: docRef.id,
    ref: docRef
  };
};

export const getDocs = async (colRef) => {
  const data = getLocalData(colRef.name);
  return {
    docs: Object.values(data).map(d => ({
      id: d.id || d.uid,
      data: () => d,
      get ref() { return doc(null, colRef.name, d.id || d.uid); }
    }))
  };
};

// --- STORAGE MOCKS ---
export const ref = (storage, path) => ({ type: 'storage_ref', path });
export const uploadBytes = async (storageRef, file) => ({ ref: storageRef });
export const getDownloadURL = async (storageRef) => {
  // Return a local object URL for the demo if it's a File, otherwise a placeholder
  return "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=1000";
};
