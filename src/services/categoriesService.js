import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const CATEGORIES_COLLECTION = 'categories';

/**
 * Create a new category
 */
export async function createCategory(name, description) {
    try {
        if (!name || !name.trim()) {
            throw new Error('Category name is required');
        }

        const docRef = await addDoc(collection(db, CATEGORIES_COLLECTION), {
            name: name.trim(),
            description: description ? description.trim() : '',
            createdAt: serverTimestamp(),
        });

        return {
            id: docRef.id,
            name: name.trim(),
            description: description ? description.trim() : '',
        };
    } catch (error) {
        console.error('Error creating category:', error);
        throw error;
    }
}

/**
 * Get all categories
 */
export async function getCategories() {
    try {
        const q = query(
            collection(db, CATEGORIES_COLLECTION),
            orderBy('name', 'asc')
        );

        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
}

/**
 * Delete a category
 */
export async function deleteCategory(categoryId) {
    try {
        await deleteDoc(doc(db, CATEGORIES_COLLECTION, categoryId));
    } catch (error) {
        console.error('Error deleting category:', error);
        throw error;
    }
}

const categoriesService = {
    createCategory,
    getCategories,
    deleteCategory,
};

export default categoriesService;
