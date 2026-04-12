import { initializeApp } from "firebase/app";
import { initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDvf6SWDYxdUyvNm4xqR0R7yc5i8RvMhGs",
  authDomain: "movilizason-crm-ubaldo.firebaseapp.com",
  projectId: "movilizason-crm-ubaldo",
  storageBucket: "movilizason-crm-ubaldo.firebasestorage.app",
  messagingSenderId: "1007940051790",
  appId: "1:1007940051790:web:e13b7ace132438df3c741f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Offline persistence disabled temporarily to prevent INTERNAL ASSERTION FAILED errors
// in development mode when multiple tabs are open or cache is corrupted.
/*
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        process.env.NODE_ENV !== 'production' && console.warn("Firestore Persistence failed: Multiple tabs open.");
    } else if (err.code === 'unimplemented') {
        process.env.NODE_ENV !== 'production' && console.warn("Firestore Persistence failed: Browser not supported.");
    }
});
*/

const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth, app };
