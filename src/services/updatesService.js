import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

const UPDATES_COLLECTION = 'updates';
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
 * Validates update data
 */
function validateUpdateData(update) {
  if (!update.title || typeof update.title !== 'string') {
    throw new Error('Title is required and must be a string');
  }

  if (update.title.trim().length === 0) {
    throw new Error('Title cannot be empty');
  }

  if (update.title.length > 150) {
    throw new Error('Title must be 150 characters or less');
  }

  if (!update.mainContent || typeof update.mainContent !== 'string') {
    throw new Error('Main content is required and must be a string');
  }

  if (update.mainContent.trim().length === 0) {
    throw new Error('Main content cannot be empty');
  }

  if (update.mainContent.length > 2000) {
    throw new Error('Main content must be 2000 characters or less');
  }

  if (!update.image || typeof update.image !== 'string') {
    throw new Error('Image URL is required');
  }

  // Validate tags if provided
  if (update.tags && !Array.isArray(update.tags)) {
    throw new Error('Tags must be an array');
  }

  // Validate social media links if provided
  if (update.socialMediaLinks && typeof update.socialMediaLinks !== 'object') {
    throw new Error('Social media links must be an object');
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
 * Creates a new update
 * Requires: Authentication, valid data
 */
export async function createUpdate(update) {
  try {
    validateUserAuthenticated();
    validateUpdateData(update);

    const docRef = await addDoc(collection(db, UPDATES_COLLECTION), {
      title: update.title.trim(),
      mainContent: update.mainContent.trim(),
      image: update.image,
      tags: update.tags || [],
      socialMediaLinks: update.socialMediaLinks || {},
      createdBy: auth.currentUser.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return docRef.id;
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    console.error('Error creating update:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Fetches all updates ordered by creation date (newest first)
 */
export async function getUpdates() {
  try {
    const q = query(collection(db, UPDATES_COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    console.error('Error fetching updates:', error);
    throw new Error(errorMessage);
  }
}

/**
 * Updates an existing update
 * Requires: Authentication, valid data
 */
export async function updateUpdate(id, updatedData) {
  try {
    validateUserAuthenticated();
    validateUpdateData(updatedData);

    const updateRef = doc(db, UPDATES_COLLECTION, id);
    await updateDoc(updateRef, {
      title: updatedData.title.trim(),
      mainContent: updatedData.mainContent.trim(),
      image: updatedData.image,
      tags: updatedData.tags || [],
      socialMediaLinks: updatedData.socialMediaLinks || {},
      updatedAt: new Date(),
      updatedBy: auth.currentUser.uid,
    });

    return id;
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    console.error('Error updating update:', errorMessage);
    throw new Error(errorMessage);
  }
}

/**
 * Deletes an update
 * Requires: Authentication
 */
export async function deleteUpdate(id) {
  try {
    validateUserAuthenticated();

    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new Error('Invalid update ID');
    }

    await deleteDoc(doc(db, UPDATES_COLLECTION, id));
    return id;
  } catch (error) {
    const errorMessage = handleFirebaseError(error);
    console.error('Error deleting update:', errorMessage);
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
