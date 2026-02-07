import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../firebase/config';

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { db } from '../firebase/config';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, increment, addDoc } from 'firebase/firestore';
const AuthContext = createContext();

// --- User profile cache helpers ---
const PROFILE_CACHE_PREFIX = 'user_profile_';
const PROFILE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

function getCachedProfile(uid) {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_PREFIX + uid);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached._ts > PROFILE_CACHE_TTL) return null; // stale
    return cached;
  } catch {
    return null;
  }
}

function saveCachedProfile(uid, profileData) {
  try {
    localStorage.setItem(
      PROFILE_CACHE_PREFIX + uid,
      JSON.stringify({ ...profileData, _ts: Date.now() })
    );
  } catch (e) {
    console.error('Error saving profile cache:', e);
  }
}

function clearCachedProfile(uid) {
  try {
    if (uid) {
      localStorage.removeItem(PROFILE_CACHE_PREFIX + uid);
    }
  } catch { /* ignore */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [isBanned, setIsBanned] = useState(false);

  /**
   * Apply profile data from cache or Firestore to state + user object.
   */
  const applyProfile = (currentUser, data) => {
    setUserRole(data.role || null);
    setIsBanned(data.banned === true);
    currentUser.referralCode = data.referralCode || null;
    currentUser.xp = data.xp || 0;
    currentUser.balance = data.balance || 0;
    currentUser.referralCount = data.referralCount || 0;
    setUser(currentUser);
  };

  /**
   * Fetch user profile from Firestore, run backfill if needed, and update cache.
   * Returns the profile data object, or null if the user document doesn't exist.
   */
  const fetchAndCacheProfile = async (currentUser) => {
    const userDocRef = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(userDocRef);

    if (!snap.exists()) return null;

    const data = snap.data();

    // Backfill referral code if missing
    if (!data.referralCode) {
      const newCode = generateReferralCode();
      await updateDoc(userDocRef, {
        referralCode: newCode,
        xp: data.xp || 0,
        balance: data.balance || 0,
        referralCount: data.referralCount || 0,
      });

      try {
        await setDoc(doc(db, 'referral_codes', newCode), { userId: currentUser.uid });
      } catch (e) { console.error('Error creating ref mapping:', e); }

      data.referralCode = newCode;
    } else {
      // Ensure mapping exists (healing/backfill)
      try {
        const mapRef = doc(db, 'referral_codes', data.referralCode);
        const mapSnap = await getDoc(mapRef);
        if (!mapSnap.exists()) {
          await setDoc(mapRef, { userId: currentUser.uid });
        }
      } catch (e) { console.error('Error ensuring ref mapping:', e); }
    }

    // Build the profile object we want to cache
    const profile = {
      role: data.role || null,
      banned: data.banned === true,
      referralCode: data.referralCode || null,
      xp: data.xp || 0,
      balance: data.balance || 0,
      referralCount: data.referralCount || 0,
    };

    saveCachedProfile(currentUser.uid, profile);
    return profile;
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      (async () => {
        if (currentUser) {
          try {
            // 1. Try cached profile first for instant UI
            const cached = getCachedProfile(currentUser.uid);
            if (cached) {
              applyProfile(currentUser, cached);
              setLoading(false);

              // 2. Background-refresh from Firestore to keep data fresh
              fetchAndCacheProfile(currentUser)
                .then((freshProfile) => {
                  if (freshProfile) {
                    applyProfile(currentUser, freshProfile);
                  }
                })
                .catch((err) => console.error('Background profile refresh failed:', err));
              return;
            }

            // 3. No cache — fetch from Firestore (first visit / cache expired)
            const profile = await fetchAndCacheProfile(currentUser);
            if (profile) {
              applyProfile(currentUser, profile);
            } else {
              setUser(currentUser);
              setUserRole(null);
              setIsBanned(false);
            }
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

      // Cache the profile
      const profile = {
        role,
        banned,
        referralCode: data.referralCode || null,
        xp: data.xp || 0,
        balance: data.balance || 0,
        referralCount: data.referralCount || 0,
      };
      saveCachedProfile(uid, profile);

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

  /* Helper to generate a random 8-char alphanumeric code */
  const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  /* Helper to check/create referral code mapping */
  const ensureReferralCodeMapping = async (code, userId) => {
    if (!code || !userId) return;
    try {
      const mappingRef = doc(db, 'referral_codes', code);
      const snap = await getDoc(mappingRef);
      if (!snap.exists()) {
        await setDoc(mappingRef, { userId });
      }
    } catch (err) {
      console.error("Error ensuring referral mapping:", err);
    }
  };

  /* Helper to handle referral attribution */
  const handleReferral = async (newUserId, referralCode) => {
    if (!referralCode) return null;

    // Normalize code for robust matching
    const normalizedCode = referralCode.trim().toUpperCase();
    console.log(`Processing referral for code: ${normalizedCode} from user: ${newUserId}`);

    try {
      // Lookup the code in the public mapping collection
      const mappingRef = doc(db, 'referral_codes', normalizedCode);
      const mappingSnap = await getDoc(mappingRef);

      if (mappingSnap.exists()) {
        const referrerId = mappingSnap.data().userId;
        console.log(`Found referrer ID from mapping: ${referrerId}`);

        // Prevent self-referral
        if (referrerId === newUserId) {
          console.warn("Self-referral detected. Skipping reward.");
          return null;
        }

        // Update referrer stats
        const referrerRef = doc(db, 'users', referrerId);
        await updateDoc(referrerRef, {
          xp: increment(100),
          balance: increment(100),
          referralCount: increment(1)
        });
        console.log("Referrer rewards updated.");

        // Log transaction
        await addDoc(collection(db, 'referrals'), {
          referrerId: referrerId,
          referredUserId: newUserId,
          rewardXp: 100,
          rewardBalance: 100,
          createdAt: serverTimestamp(),
          status: 'completed'
        });

        return referrerId;
      } else {
        console.warn(`No mapping found for referral code: ${normalizedCode}`);

        // Fallback: Try querying users collection (Admins only, or if rules change)
        try {
          const q = query(collection(db, 'users'), where('referralCode', '==', normalizedCode));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const referrerDoc = querySnapshot.docs[0];
            // Automatically fix the mapping for future
            await setDoc(doc(db, 'referral_codes', normalizedCode), { userId: referrerDoc.id });
            // Recursively handle
            return handleReferral(newUserId, referralCode);
          }
        } catch (e) {
          console.log("Fallback query failed (expected restricted permissions):", e.message);
        }
      }
    } catch (error) {
      console.error("Error handling referral:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      if (error.code === 'permission-denied') {
        console.error("PERMISSION DENIED: Check firestore.rules for 'users' collection update rule.");
      }
    }
    return null;
  };

  // Register with email and password
  const register = async (email, password, referralCode = null) => {
    setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const uid = result.user.uid;

      let referredBy = null;
      if (referralCode) {
        referredBy = await handleReferral(uid, referralCode);
      }

      const newReferralCode = generateReferralCode();

      // Create mapping for new user
      await ensureReferralCodeMapping(newReferralCode, uid);

      // create user profile in Firestore with default role 'user'
      const userRef = doc(db, 'users', uid);
      await setDoc(userRef, {
        email,
        role: 'user',
        banned: false,
        createdAt: serverTimestamp(),
        xp: 0,
        balance: 0,
        referralCount: 0,
        referralCode: newReferralCode,
        referredBy: referredBy
      });

      // Cache the new profile
      saveCachedProfile(uid, {
        role: 'user',
        banned: false,
        referralCode: newReferralCode,
        xp: 0,
        balance: 0,
        referralCount: 0,
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
  const signInWithGoogle = async (referralCode = null) => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const uid = result.user.uid;
      const userRef = doc(db, 'users', uid);
      const snap = await getDoc(userRef);
      let role = 'user';
      let banned = false;

      let profileToCache;

      if (!snap.exists()) {
        let referredBy = null;
        if (referralCode) {
          referredBy = await handleReferral(uid, referralCode);
        }

        const newReferralCode = generateReferralCode();

        // New user via Google
        await setDoc(userRef, {
          email: result.user.email || null,
          role,
          banned: false,
          createdAt: serverTimestamp(),
          xp: 0,
          balance: 0,
          referralCount: 0,
          referralCode: newReferralCode,
          referredBy: referredBy
        });

        profileToCache = { role, banned: false, referralCode: newReferralCode, xp: 0, balance: 0, referralCount: 0 };
      } else {
        const data = snap.data();
        role = data.role || 'user';
        banned = data.banned === true;

        let refCode = data.referralCode;
        // Ensure existing users have a referral code if they log in and don't have one
        if (!data.referralCode) {
          refCode = generateReferralCode();
          await updateDoc(userRef, {
            referralCode: refCode,
            xp: data.xp || 0,
            balance: data.balance || 0,
            referralCount: data.referralCount || 0
          });
        }

        profileToCache = {
          role,
          banned,
          referralCode: refCode || null,
          xp: data.xp || 0,
          balance: data.balance || 0,
          referralCount: data.referralCount || 0,
        };
      }

      // Cache the profile
      saveCachedProfile(uid, profileToCache);

      if (banned) {
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
  // Reset Password
  const resetPassword = async (email) => {
    setError(null);
    try {
      const actionCodeSettings = {
        url: window.location.origin + '/reset-password',
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Logout
  const logout = async () => {
    setError(null);
    try {
      // Clear cached profile before signing out
      if (user?.uid) {
        clearCachedProfile(user.uid);
      }
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
    resetPassword,
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
