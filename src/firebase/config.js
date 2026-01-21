// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAcuF9uG_RMwBDP-WRqR28Dw05y1Dy0nzo",
  authDomain: "innervoice-tz.firebaseapp.com",
  projectId: "innervoice-tz",
  storageBucket: "innervoice-tz.firebasestorage.app",
  messagingSenderId: "1097228444253",
  appId: "1:1097228444253:web:df0f0d2789a446e75763b4"
};



// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
