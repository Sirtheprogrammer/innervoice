import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const ANNOUNCEMENTS_COLLECTION = 'announcements';
const IMGBB_API_KEY = 'b0cb512fd91d77dad4ae9f6f474507ad';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

/**
 * Validates that user is authenticated
 */
function validateUserAuthenticated() {
  if (!auth.currentUser) {
    throw new Error('You must be logged in to perform this action');
  }
  return auth.currentUser.uid;
}

/**
 * Validates image file before upload
 */
function validateImageFile(file) {
  if (!file) {
    throw new Error('No image file selected');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Image size must be less than 5MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error(`Invalid image type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`);
  }

  return true;
}

/**
 * Validates announcement data
 */
function validateAnnouncementData(announcement) {
  if (!announcement.title || typeof announcement.title !== 'string') {
    throw new Error('Title is required and must be a string');
  }

  if (announcement.title.trim().length === 0) {
    throw new Error('Title cannot be empty');
  }

  if (announcement.title.length > 100) {
    throw new Error('Title must be 100 characters or less');
  }

  if (!announcement.image || typeof announcement.image !== 'string') {
    throw new Error('Image URL is required');
  }

  return true;
}

/**
 * Uploads image to imgbb API with retry logic
 */
export async function uploadImageToImgbb(file, retries = 3) {
  validateImageFile(file);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          // Rate limited, retry after delay
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        throw new Error(`imgbb API error: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Image upload failed');
      }

      return data.data.url;
    } catch (error) {
      if (attempt === retries) {
        console.error('Image upload failed after retries:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }
    }
  }
}

/**
 * Creates a new announcement
 * Requires: Authentication, valid title, valid image
 */
export async function createAnnouncement(announcement) {
  try {
    const userId = validateUserAuthenticated();
    validateAnnouncementData(announcement);

    const docRef = await addDoc(collection(db, ANNOUNCEMENTS_COLLECTION), {
      ...announcement,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return docRef.id;
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    console.error('Error creating announcement:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Fetches all announcements ordered by creation date (newest first)
 * Can be called by authenticated users and public users
 */
export async function getAnnouncements() {
  try {
    const q = query(collection(db, ANNOUNCEMENTS_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    console.error('Error fetching announcements:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Updates an existing announcement
 * Requires: Authentication, valid title, valid image URL
 */
export async function updateAnnouncement(id, updatedData) {
  try {
    const userId = validateUserAuthenticated();
    validateAnnouncementData(updatedData);

    const announcementRef = doc(db, ANNOUNCEMENTS_COLLECTION, id);
    await updateDoc(announcementRef, {
      ...updatedData,
      updatedAt: new Date(),
      updatedBy: userId,
    });

    return id;
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    console.error('Error updating announcement:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Deletes an announcement
 * Requires: Authentication
 */
export async function deleteAnnouncement(id) {
  try {
    validateUserAuthenticated();

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Invalid announcement ID');
    }

    await deleteDoc(doc(db, ANNOUNCEMENTS_COLLECTION, id));
    return id;
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    console.error('Error deleting announcement:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Handles Firebase errors and returns user-friendly messages
 */
function handleFirebaseError(error) {
  // Firebase permission errors
  if (error.code === 'permission-denied') {
    return 'You do not have permission to perform this action. Please log in as an admin.';
  }

  // Firebase auth errors
  if (error.code === 'auth/unauthenticated') {
    return 'You must be logged in to perform this action.';
  }

  if (error.code === 'auth/invalid-api-key') {
    return 'Configuration error. Please contact support.';
  }

  // Firebase database errors
  if (error.code === 'failed-precondition') {
    return 'Database is not ready. Please try again later.';
  }

  if (error.code === 'unavailable') {
    return 'Service temporarily unavailable. Please try again later.';
  }

  if (error.code === 'internal') {
    return 'An internal error occurred. Please try again.';
  }

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return 'Network error. Please check your connection and try again.';
  }

  // Validation errors
  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
