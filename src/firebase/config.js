// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCDyMPAsQHjaR5p6NUv0ggY1qwHUBRf3to",
  authDomain: "innervoice-app.firebaseapp.com",
  projectId: "innervoice-app",
  storageBucket: "innervoice-app.firebasestorage.app",
  messagingSenderId: "646653253233",
  appId: "1:646653253233:web:346dc9384892dc9265edd0"
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
