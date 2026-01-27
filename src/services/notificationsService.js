
import {
    collection,
    addDoc,
    getDocs,
    doc,
    query,
    where,
    orderBy,
    updateDoc,
    serverTimestamp,
    limit,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Add a new notification
 * @param {object} notificationData
 */
export async function addNotification(notificationData) {
    try {
        const { recipientId, senderId, confessionId, message, type = 'comment' } = notificationData;

        if (!recipientId) throw new Error('Recipient ID is required');

        await addDoc(collection(db, NOTIFICATIONS_COLLECTION), {
            recipientId,
            senderId: senderId || null,
            confessionId,
            message,
            type,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error adding notification:', error);
    }
}

/**
 * Get notifications for a user
 * @param {string} userId
 * @param {number} limitCount
 */
export async function getUserNotifications(userId, limitCount = 20) {
    try {
        const q = query(
            collection(db, NOTIFICATIONS_COLLECTION),
            where('recipientId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        }));
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

/**
 * Mark a notification as read
 * @param {string} notificationId
 */
export async function markNotificationAsRead(notificationId) {
    try {
        const docRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
        await updateDoc(docRef, {
            read: true,
        });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        throw error;
    }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId
 */
export async function markAllNotificationsAsRead(userId) {
    try {
        const instanceCollection = collection(db, NOTIFICATIONS_COLLECTION);
        const q = query(
            instanceCollection,
            where('recipientId', '==', userId),
            where('read', '==', false)
        );

        // In a real app we might want to batch this, but for now simple promise.all is ok
        const querySnapshot = await getDocs(q);
        const updates = querySnapshot.docs.map(docSnap =>
            updateDoc(doc(db, NOTIFICATIONS_COLLECTION, docSnap.id), { read: true })
        );

        await Promise.all(updates);
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        throw error;
    }
}

const notificationsService = {
    addNotification,
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
};

export default notificationsService;
