import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase/config';

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isBanned, setIsBanned] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      (async () => {
        if (currentUser) {
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const snap = await getDoc(userDocRef);
            if (snap.exists()) {
              setUserRole(snap.data().role);
              setIsBanned(snap.data().banned === true);
            } else {
              setUserRole(null);
              setIsBanned(false);
            }
            setUser(currentUser);
          } catch (err) {
            setError(err.message);
            setUser(currentUser);
            setUserRole(null);
            setIsBanned(false);
          }
        } else {
          setUser(null);
          setUserRole(null);
          setIsBanned(false);
        }
        setLoading(false);
      })();
    });

    return unsubscribe;
  }, []);

  // Login with email and password
  const login = async (email, password) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const uid = result.user.uid;
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      const data = snap.exists() ? snap.data() : {};
      const role = data.role || null;
      const banned = data.banned === true;

      setUserRole(role);
      setIsBanned(banned);

      if (banned) {
        throw new Error('This account has been banned.');
      }

      return { user: result.user, role, banned };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Register with email and password
  const register = async (email, password) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // create user profile in Firestore with default role 'user'
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        email,
        role: 'user',
        banned: false,
        createdAt: serverTimestamp(),
      });
      setUserRole('user');
      setIsBanned(false);
      return { user: result.user, role: 'user', banned: false };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const uid = result.user.uid;
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      let role = 'user';
      let banned = false;

      if (!snap.exists()) {
        await setDoc(userRef, {
          email: result.user.email || null,
          role,
          banned: false,
          createdAt: serverTimestamp(),
        });
      } else {
        const data = snap.data();
        role = data.role || 'user';
        banned = data.banned === true;
      }

      if (banned) {
        // Option specific to Google Auth: 
        // We might want to just logout immediately if they are banned
        // But throwing error here will be caught in UI
        throw new Error('This account has been banned.');
      }

      setUserRole(role);
      setIsBanned(banned);
      return { user: result.user, role, banned };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  // Logout
  const logout = async () => {
    setError(null);
    try {
      await signOut(auth);
      setUser(null);
      setUserRole(null);
      setIsBanned(false);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };


  const value = {
    user,
    loading,
    error,
    login,
    register,
    signInWithGoogle,
    logout,
    userRole,
    isBanned,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
