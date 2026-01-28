
import { doc, onSnapshot, setDoc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

const SETTINGS_COLLECTION = 'settings';
const GLOBAL_SETTINGS_DOC = 'global';

/**
 * Subscribe to global settings
 * @param {function} callback - Function to call with settings data
 * @returns {function} - Unsubscribe function
 */
export function subscribeToGlobalSettings(callback) {
    const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback(docSnap.data());
        } else {
            // Default settings if document doesn't exist
            callback({ chatEnabled: true });
        }
    }, (error) => {
        console.error("Error fetching settings:", error);
        // Fallback to default on error
        callback({ chatEnabled: true });
    });
}

/**
 * Update global settings
 * @param {object} settings - Settings to update
 */
export async function updateGlobalSettings(settings) {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC);
        // Use setDoc with merge: true to create if not exists
        await setDoc(docRef, settings, { merge: true });
    } catch (error) {
        console.error("Error updating settings:", error);
        throw error;
    }
}

/**
 * Get global settings (one-time fetch)
 */
export async function getGlobalSettings() {
    try {
        const docRef = doc(db, SETTINGS_COLLECTION, GLOBAL_SETTINGS_DOC);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        }
        return { chatEnabled: true };
    } catch (error) {
        console.error("Error getting settings:", error);
        return { chatEnabled: true };
    }
}

const settingsService = {
    subscribeToGlobalSettings,
    updateGlobalSettings,
    getGlobalSettings
};

export default settingsService;
