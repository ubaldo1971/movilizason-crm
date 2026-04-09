import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit,
  increment,
  getDocs,
  getDoc,
  where,
  deleteDoc,
  addDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// --- HELPERS PARA PIN DE 6 DÍGITOS ---
export const generateRandom6DigitPin = () => {
    let pin = '';
    const avoid = ['123456', '000000', '111111', '222222', '333333', '444444', '555555', '666666', '777777', '888888', '999999'];
    
    do {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
    } while (avoid.includes(pin));
    
    return pin;
};

// Global error tracker for UI display
window.__FIREBASE_ERROR = null;
window.__FIREBASE_READY = true; 
window.__FIREBASE_PROBE = { read: 'Pendiente', write: 'Pendiente', code: null };

/**
 * Prueba profunda de conectividad con Firestore
 */
export const runFirestoreProbe = async () => {
    window.__FIREBASE_PROBE = { read: '⏳ Probando...', write: '⏳ Probando...', code: null };
    const results = { read: 'Error', write: 'Error', code: null };

    try {
        console.log("🕵️ Iniciando Sonda de Diagnóstico Firestore...");
        
        try {
            await getDoc(doc(db, '_connection_test', 'read'));
            results.read = '✅ OK';
        } catch (e) {
            results.read = '❌ Falló';
            results.code = e.code;
        }

        try {
            await setDoc(doc(db, '_connection_test', 'write'), { 
                timestamp: new Date().toISOString(),
                agent: 'ProductionMode'
            });
            results.write = '✅ OK';
        } catch (e) {
            results.write = '❌ Falló';
            if (!results.code) results.code = e.code;
        }

        window.__FIREBASE_PROBE = results;
        return results;
    } catch (generalError) {
        window.__FIREBASE_PROBE = { ...results, code: 'CRITICAL_FAIL' };
        return window.__FIREBASE_PROBE;
    }
};

export const forceSeedDemoUsers = async () => {
    console.log("✅ Modo Producción: Sincronización automática activa.");
    return { success: true };
};

export const bootstrapFirebase = async () => {
    console.log("🚀 Firestore Production Mode Initialized");
    window.__FIREBASE_READY = true;
};

// --- CORE FIREBASE EXPORTS ---
export {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDoc,
  getDocs,
  addDoc,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp
};

// --- STORAGE MOCKS ---
export const ref = (storage, path) => ({ type: 'storage_ref', path });
export const uploadBytes = async (storageRef, file) => ({ ref: storageRef });
export const getDownloadURL = async (storageRef) => {
  return "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&q=80&w=1000";
};
export const seedDemoUsers = async () => {
    const demoUsers = [
        { displayName: 'Juan', surname: 'Robles', email: 'juan.robles@movilizason.com', phone: '6621234567', pin: '123456', role: 'Registered', status: 'active', points: 0, medals: 0, photoURL: 'https://i.pravatar.cc/150?u=juan' },
        { displayName: 'Maria', surname: 'Gomez', email: 'maria.gomez@movilizason.com', phone: '6629876543', pin: '123456', role: 'Registered', status: 'active', points: 0, medals: 0, photoURL: 'https://i.pravatar.cc/150?u=maria' },
        { displayName: 'Pedro', surname: 'Ramirez', email: 'pedro.ramirez@movilizason.com', phone: '6625551212', pin: '123456', role: 'Registered', status: 'active', points: 0, medals: 0, photoURL: 'https://i.pravatar.cc/150?u=pedro' },
        { displayName: 'Ana', surname: 'Lopez', email: 'ana.lopez@movilizason.com', phone: '6624449988', pin: '123456', role: 'Registered', status: 'active', points: 0, medals: 0, photoURL: 'https://i.pravatar.cc/150?u=ana' },
        { displayName: 'Carlos', surname: 'Ruiz', email: 'carlos.ruiz@movilizason.com', phone: '6620001122', pin: '654321', role: 'Super Admin', status: 'active', points: 0, medals: 0, photoURL: 'https://i.pravatar.cc/150?u=carlos' }
    ];

    for (const user of demoUsers) {
        // Use phone as a stable ID for demo purposes or let Firestore decide
        await setDoc(doc(db, 'users', `demo_${user.phone}`), {
            ...user,
            createdAt: new Date().toISOString()
        });
    }
    return true;
};
