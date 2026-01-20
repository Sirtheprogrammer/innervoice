// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAijMDCIw94XLYxSpe3WMCpRfzRtvE2T6s",
  authDomain: "docs-c9f89.firebaseapp.com",
  projectId: "docs-c9f89",
  storageBucket: "docs-c9f89.firebasestorage.app",
  messagingSenderId: "276079013205",
  appId: "1:276079013205:web:e0a8dd145d3657ccfa53dc",
  measurementId: "G-NH1P9052JZ"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
