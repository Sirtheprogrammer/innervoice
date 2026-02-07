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
  increment,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const CONFESSIONS_COLLECTION = 'confessions';

/**
 * Get total number of confessions
 */
export async function getConfessionCount() {
  try {
    const coll = collection(db, CONFESSIONS_COLLECTION);
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error fetching confession count:', error);
    return 0;
  }
}

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

  // Title is optional but if provided must be a string and limited length
  if (confession.title != null) {
    if (typeof confession.title !== 'string') {
      throw new Error('Title must be a string');
    }
    if (confession.title.length > 150) {
      throw new Error('Title cannot exceed 150 characters');
    }
  }

  return true;
}

/**
 * Create a new confession (requires authenticated user)
 * @param {string} content - The confession content
 * @param {string|null} title - Optional title
 * @param {string} userId - The authenticated user's ID
 * @param {string} categoryId - Optional category ID
 * @param {string} categoryName - Optional category name
 */
export async function createConfession(content, title = null, userId = null, categoryId = null, categoryName = null) {
  try {
    if (!userId) {
      throw new Error('Authentication required to create a confession');
    }

    // Check if user is banned
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().banned) {
      throw new Error('You are banned from posting confessions.');
    }

    validateConfessionData({ content, title });

    const confessionData = {
      content: content.trim(),
      title: title != null ? String(title).trim() : null,
      userId, // Store userId for profile lookup (not displayed publicly)
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      commentCount: 0,
      flagCount: 0,
    };

    if (categoryId) {
      confessionData.categoryId = categoryId;
      confessionData.categoryName = categoryName;
    }

    const docRef = await addDoc(collection(db, CONFESSIONS_COLLECTION), confessionData);

    return {
      id: docRef.id,
      ...confessionData,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Error creating confession:', error);
    throw error;
  }
}

/**
 * Get all confessions, ordered by newest first.
 * Fetches all confessions in a single query (category filtering is done client-side).
 */
export async function getAllConfessions() {
  try {
    const q = query(
      collection(db, CONFESSIONS_COLLECTION),
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
    console.error('Error fetching confessions:', error);
    throw error;
  }
}

/**
 * Get confessions by a specific user ID (for profile page)
 * @param {string} userId - The user's ID
 * @param {number} pageSize - Number of confessions to fetch
 */
export async function getConfessionsByUser(userId, pageSize = 50) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const q = query(
      collection(db, CONFESSIONS_COLLECTION),
      where('userId', '==', userId),
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
    console.error('Error fetching user confessions:', error);
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
 * Increment like count for a confession
 */
export async function likeConfession(confessionId) {
  try {
    const docRef = doc(db, CONFESSIONS_COLLECTION, confessionId);
    const confession = await getDoc(docRef);

    if (!confession.exists()) {
      throw new Error('Confession not found');
    }

    await updateDoc(docRef, {
      likeCount: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error liking confession:', error);
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
 * Update a confession (content and title)
 * @param {string} confessionId - ID of the confession
 * @param {string} content - New content
 * @param {string|null} title - New title
 */
export async function updateConfession(confessionId, content, title = null) {
  try {
    validateConfessionData({ content, title });

    const docRef = doc(db, CONFESSIONS_COLLECTION, confessionId);
    await updateDoc(docRef, {
      content: content.trim(),
      title: title != null ? String(title).trim() : null,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating confession:', error);
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
  updateConfession,
  getFlaggedConfessions,
  getConfessionCount,
};

export default confessionsService;
