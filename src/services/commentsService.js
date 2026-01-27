import {
  collection,
  addDoc,
  getDocs,
  doc,
  query,
  where,
  orderBy,
  deleteDoc,
  updateDoc,
  getDoc,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { updateConfessionCommentCount, getConfessionById } from './confessionsService';
import { addNotification } from './notificationsService';

const COMMENTS_COLLECTION = 'comments';

/**
 * Get total number of comments
 */
export async function getCommentCount() {
  try {
    const coll = collection(db, COMMENTS_COLLECTION);
    const snapshot = await getCountFromServer(coll);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error fetching comment count:', error);
    return 0;
  }
}

/**
 * Validates comment data
 */
function validateCommentData(comment) {
  if (!comment.content || typeof comment.content !== 'string') {
    throw new Error('Comment content is required and must be a string');
  }

  if (comment.content.trim().length === 0) {
    throw new Error('Comment cannot be empty');
  }

  if (comment.content.length > 2000) {
    throw new Error('Comment cannot exceed 2000 characters');
  }

  if (!comment.confessionId || typeof comment.confessionId !== 'string') {
    throw new Error('Confession ID is required');
  }

  return true;
}

/**
 * Create a new comment on a confession (anonymous)
 * @param {string} confessionId - ID of the confession being commented on
 * @param {string} content - Comment content
 * @param {string} parentCommentId - Optional ID of parent comment for replies
 * @param {string} currentUserId - Optional ID of the user creating the comment (for notification context)
 */
export async function createComment(confessionId, content, parentCommentId = null, currentUserId = null) {
  try {
    validateCommentData({ confessionId, content });

    const docRef = await addDoc(collection(db, COMMENTS_COLLECTION), {
      confessionId,
      content: content.trim(),
      parentCommentId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      replyCount: 0,
      flagCount: 0,
    });

    // Update the confession's comment count
    await updateConfessionCommentCount(confessionId, 1);

    // Notify the confession owner
    try {
      const confession = await getConfessionById(confessionId);
      if (confession && confession.userId && confession.userId !== currentUserId) {
        await addNotification({
          recipientId: confession.userId,
          senderId: currentUserId,
          confessionId: confessionId,
          message: 'Someone commented on your confession.',
          type: 'comment',
        });
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError);
      // Non-blocking error
    }

    return {
      id: docRef.id,
      confessionId,
      content: content.trim(),
      parentCommentId,
      createdAt: new Date(),
      replyCount: 0,
      flagCount: 0,
    };
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
}

/**
 * Get all comments for a specific confession
 * Includes both top-level comments and replies
 */
export async function getCommentsByConfessionId(confessionId) {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('confessionId', '==', confessionId),
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
    console.error('Error fetching comments:', error);
    throw error;
  }
}

/**
 * Get all replies to a specific comment
 */
export async function getRepliesByCommentId(commentId) {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('parentCommentId', '==', commentId),
      orderBy('createdAt', 'asc')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
    }));
  } catch (error) {
    console.error('Error fetching replies:', error);
    throw error;
  }
}

/**
 * Delete a comment by ID
 */
export async function deleteComment(commentId, confessionId) {
  try {
    const docRef = doc(db, COMMENTS_COLLECTION, commentId);
    await deleteDoc(docRef);

    // Update the confession's comment count
    await updateConfessionCommentCount(confessionId, -1);
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

/**
 * Flag a comment for moderation
 */
export async function flagComment(commentId) {
  try {
    const docRef = doc(db, COMMENTS_COLLECTION, commentId);
    const comment = await getDoc(docRef);

    if (!comment.exists()) {
      throw new Error('Comment not found');
    }

    const currentFlagCount = comment.data().flagCount || 0;
    await updateDoc(docRef, {
      flagCount: currentFlagCount + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error flagging comment:', error);
    throw error;
  }
}

/**
 * Moderate a comment (mark as approved/rejected with reason)
 * @param {string} commentId - ID of the comment
 * @param {boolean} approved - Whether to approve or reject
 * @param {string} reason - Moderation reason
 */
export async function moderateComment(commentId, approved, reason = '') {
  try {
    const docRef = doc(db, COMMENTS_COLLECTION, commentId);
    await updateDoc(docRef, {
      moderated: true,
      approved,
      reason,
      moderatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error moderating comment:', error);
    throw error;
  }
}

/**
 * Get all flagged comments for a specific confession
 */
export async function getFlaggedCommentsByConfession(confessionId) {
  try {
    const q = query(
      collection(db, COMMENTS_COLLECTION),
      where('confessionId', '==', confessionId),
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
    console.error('Error fetching flagged comments:', error);
    throw error;
  }
}

const commentsService = {
  createComment,
  getCommentsByConfessionId,
  getRepliesByCommentId,
  deleteComment,
  flagComment,
  moderateComment,
  getFlaggedCommentsByConfession,
  getCommentCount,
};

export default commentsService;
