import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../firebase/config';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Login with email and password
  const login = async (email, password) => {
    setError(null);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result.user;
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
    logout,
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
