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

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      (async () => {
        if (currentUser) {
          try {
            const userDocRef = doc(db, 'users', currentUser.uid);
            const snap = await getDoc(userDocRef);
            const role = snap.exists() ? snap.data().role : null;
            setUser(currentUser);
            setUserRole(role);
          } catch (err) {
            setError(err.message);
            setUser(currentUser);
            setUserRole(null);
          }
        } else {
          setUser(null);
          setUserRole(null);
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
      const role = snap.exists() ? snap.data().role : null;
      setUserRole(role);
      return { user: result.user, role };
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
        createdAt: serverTimestamp(),
      });
      setUserRole('user');
      return { user: result.user, role: 'user' };
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
      if (!snap.exists()) {
        await setDoc(userRef, {
          email: result.user.email || null,
          role,
          createdAt: serverTimestamp(),
        });
      } else {
        role = snap.data().role || 'user';
      }
      setUserRole(role);
      return { user: result.user, role };
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
