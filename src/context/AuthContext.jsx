import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from '../lib/dbService';
import { auth, db } from '../firebaseConfig';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profileDoc = await getDoc(doc(db, 'users', user.uid));
          if (profileDoc.exists()) {
            setUserProfile({ uid: user.uid, ...profileDoc.data() });
          } else {
            // Create a default profile for first-time users
            const defaultProfile = {
              uid: user.uid,
              displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
              email: user.email || '',
              phone: user.phoneNumber || '',
              role: 'Brigadista / Operador',
              districtFed: '',
              districtLoc: '',
              section: '',
              brigades: [],
              fcmToken: '',
              status: 'active',
              performanceScore: 0,
              avatar: '',
              createdAt: serverTimestamp(),
              lastActiveAt: serverTimestamp()
            };
            await setDoc(doc(db, 'users', user.uid), defaultProfile);
            setUserProfile({ uid: user.uid, ...defaultProfile });
          }
        } catch (err) {
          console.error('Error loading user profile:', err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    // Update last active
    await setDoc(doc(db, 'users', credential.user.uid), { lastActiveAt: serverTimestamp() }, { merge: true });
    return credential;
  };

  const register = async (email, password, displayName, role) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const profile = {
      uid: credential.user.uid,
      displayName: displayName || email.split('@')[0],
      email,
      phone: '',
      role: role || 'Brigadista / Operador',
      districtFed: '',
      districtLoc: '',
      section: '',
      brigades: [],
      fcmToken: '',
      status: 'active',
      performanceScore: 0,
      avatar: '',
      createdAt: serverTimestamp(),
      lastActiveAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', credential.user.uid), profile);
    setUserProfile({ uid: credential.user.uid, ...profile });
    return credential;
  };

  const logout = async () => {
    await signOut(auth);
    setUserProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      userProfile,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!currentUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
