import {
    collection,
    getDocs,
    doc,
    updateDoc,
    serverTimestamp,
    getCountFromServer,
    query,
    orderBy,
    limit,
    startAfter,
    where
} from 'firebase/firestore';
import { db } from '../firebase/config';

const USERS_COLLECTION = 'users';

/**
 * Get total number of users
 */
export async function getUserCount() {
    try {
        const coll = collection(db, USERS_COLLECTION);
        const snapshot = await getCountFromServer(coll);
        return snapshot.data().count;
    } catch (error) {
        console.error('Error fetching user count:', error);
        return 0;
    }
}

/**
 * Get paginated list of users
 */
export async function getAllUsers(pageSize = 20, lastDoc = null) {
    try {
        let q = query(
            collection(db, USERS_COLLECTION),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
        );

        if (lastDoc) {
            q = query(q, startAfter(lastDoc));
        }

        const querySnapshot = await getDocs(q);
        return {
            users: querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.() || new Date(),
            })),
            lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
        };
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    }
}

/**
 * Ban a user
 */
export async function banUser(userId) {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await updateDoc(userRef, {
            banned: true,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error banning user:', error);
        throw error;
    }
}

/**
 * Unban a user
 */
export async function unbanUser(userId) {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        await updateDoc(userRef, {
            banned: false,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error unbanning user:', error);
        throw error;
    }
}

const userService = {
    getUserCount,
    getAllUsers,
    banUser,
    unbanUser
};

export default userService;
