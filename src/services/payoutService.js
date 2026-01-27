import { db } from '../firebase/config';
import {
    collection,
    addDoc,
    getDoc,
    getDocs,
    doc,
    serverTimestamp,
    runTransaction,
    query,
    where,
    orderBy,
    updateDoc,
    increment
} from 'firebase/firestore';

/**
 * Request a payout for a user.
 * Atomically deducts balance and creates a payout request.
 * @param {string} userId - The user ID
 * @param {number} amount - Amount to withdraw
 * @param {string} phoneNumber - User's phone number
 * @param {string} fullName - User's full name
 * @returns {Promise<Object>} The created payout document
 */
export const requestPayout = async (userId, amount, phoneNumber, fullName) => {
    if (amount < 10000) {
        throw new Error('Minimum withdrawal amount is 10,000 TZS');
    }

    const userRef = doc(db, 'users', userId);
    const payoutRef = doc(collection(db, 'payouts'));

    try {
        await runTransaction(db, async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists()) {
                throw new Error('User does not exist');
            }

            const userData = userDoc.data();
            const currentBalance = userData.balance || 0;

            if (currentBalance < amount) {
                throw new Error('Insufficient balance');
            }

            // 1. Deduct balance
            transaction.update(userRef, {
                balance: increment(-amount)
            });

            // 2. Create payout request
            transaction.set(payoutRef, {
                userId,
                amount,
                phoneNumber,
                fullName,
                status: 'pending',
                createdAt: serverTimestamp()
            });
        });

        return { id: payoutRef.id };
    } catch (error) {
        console.error("Payout transaction failed:", error);
        throw error;
    }
};

/**
 * Get payout history for a specific user
 * @param {string} userId 
 */
export const getPayoutsByUser = async (userId) => {
    try {
        const q = query(
            collection(db, 'payouts'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching user payouts:", error);
        return [];
    }
};

/**
 * Get all pending payouts (Admin only)
 */
export const getAllPendingPayouts = async () => {
    try {
        const q = query(
            collection(db, 'payouts'),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching pending payouts:", error);
        return [];
    }
};

/**
 * Approve a payout (Admin only)
 * @param {string} payoutId 
 */
export const approvePayout = async (payoutId) => {
    try {
        const payoutRef = doc(db, 'payouts', payoutId);
        await updateDoc(payoutRef, {
            status: 'approved',
            processedAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Error approving payout:", error);
        throw error;
    }
};

/**
 * Reject a payout (Admin only)
 * This refunds the amount back to the user/
 * @param {string} payoutId 
 */
export const rejectPayout = async (payoutId) => {
    const payoutRef = doc(db, 'payouts', payoutId);

    try {
        await runTransaction(db, async (transaction) => {
            const payoutDoc = await transaction.get(payoutRef);
            if (!payoutDoc.exists()) {
                throw new Error("Payout request not found");
            }

            const payoutData = payoutDoc.data();
            if (payoutData.status !== 'pending') {
                throw new Error("Can only reject pending requests");
            }

            const userId = payoutData.userId;
            const amount = payoutData.amount;
            const userRef = doc(db, 'users', userId);

            // 1. Mark as rejected
            transaction.update(payoutRef, {
                status: 'rejected',
                processedAt: serverTimestamp()
            });

            // 2. Refund balance
            transaction.update(userRef, {
                balance: increment(amount)
            });
        });
    } catch (error) {
        console.error("Error rejecting payout:", error);
        throw error;
    }
};
