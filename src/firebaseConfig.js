import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth, app };
