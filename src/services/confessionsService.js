import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const CONFESSIONS_COLLECTION = 'confessions';

/**
 * Validates confession data
 */
function validateConfessionData(confession) {
  if (!confession.content || typeof confession.content !== 'string') {
    throw new Error('Content is required and must be a string');
  }

  if (confession.content.trim().length === 0) {
    throw new Error('Content cannot be empty');
  }

  if (confession.content.length > 5000) {
    throw new Error('Content cannot exceed 5000 characters');
  }

  return true;
}

/**
 * Create a new confession (anonymous)
 */
export async function createConfession(content) {
  try {
    validateConfessionData({ content });

    const docRef = await addDoc(collection(db, CONFESSIONS_COLLECTION), {
      content: content.trim(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      commentCount: 0,
      flagCount: 0,
    });

    return {
      id: docRef.id,
      content: content.trim(),
      createdAt: new Date(),
      commentCount: 0,
      flagCount: 0,
    };
  } catch (error) {
    console.error('Error creating confession:', error);
    throw error;
  }
}

/**
 * Get all confessions, ordered by newest first
 */
export async function getAllConfessions(pageSize = 20) {
  try {
    const q = query(
      collection(db, CONFESSIONS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching confessions:', error);
    throw error;
  }
}

/**
 * Get a single confession by ID
 */
export async function getConfessionById(confessionId) {
  try {
    const docRef = doc(db, CONFESSIONS_COLLECTION, confessionId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Confession not found');
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
      createdAt: docSnap.data().createdAt?.toDate?.() || new Date(),
      updatedAt: docSnap.data().updatedAt?.toDate?.() || new Date(),
    };
  } catch (error) {
    console.error('Error fetching confession:', error);
    throw error;
  }
}

/**
 * Update comment count for a confession
 */
export async function updateConfessionCommentCount(confessionId, increment = 1) {
  try {
    const docRef = doc(db, CONFESSIONS_COLLECTION, confessionId);
    const confession = await getDoc(docRef);

    if (!confession.exists()) {
      throw new Error('Confession not found');
    }

    const currentCount = confession.data().commentCount || 0;
    await updateDoc(docRef, {
      commentCount: currentCount + increment,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating comment count:', error);
    throw error;
  }
}

/**
 * Delete a confession (admin only)
 */
export async function deleteConfession(confessionId) {
  try {
    const docRef = doc(db, CONFESSIONS_COLLECTION, confessionId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting confession:', error);
    throw error;
  }
}

/**
 * Flag a confession for moderation
 */
export async function flagConfession(confessionId) {
  try {
    const docRef = doc(db, CONFESSIONS_COLLECTION, confessionId);
    const confession = await getDoc(docRef);

    if (!confession.exists()) {
      throw new Error('Confession not found');
    }

    const currentFlagCount = confession.data().flagCount || 0;
    await updateDoc(docRef, {
      flagCount: currentFlagCount + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error flagging confession:', error);
    throw error;
  }
}

/**
 * Moderate a confession (mark as approved/rejected with reason)
 * @param {string} confessionId - ID of the confession
 * @param {boolean} approved - Whether to approve or reject
 * @param {string} reason - Moderation reason
 */
export async function moderateConfession(confessionId, approved, reason = '') {
  try {
    const docRef = doc(db, CONFESSIONS_COLLECTION, confessionId);
    await updateDoc(docRef, {
      moderated: true,
      approved,
      reason,
      moderatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error moderating confession:', error);
    throw error;
  }
}

/**
 * Get all flagged confessions
 */
export async function getFlaggedConfessions() {
  try {
    const q = query(
      collection(db, CONFESSIONS_COLLECTION),
      where('flagCount', '>', 0),
      orderBy('flagCount', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching flagged confessions:', error);
    throw error;
  }
}

const confessionsService = {
  createConfession,
  getAllConfessions,
  getConfessionById,
  updateConfessionCommentCount,
  deleteConfession,
  flagConfession,
  moderateConfession,
  getFlaggedConfessions,
};

export default confessionsService;
