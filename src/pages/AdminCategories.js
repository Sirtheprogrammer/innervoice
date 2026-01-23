import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MdLogout, MdMenu, MdDelete, MdAdd, MdCategory } from 'react-icons/md';
import { getCategories, createCategory, deleteCategory } from '../services/categoriesService';
import AdminSidebar from '../components/AdminSidebar';
import '../styles/AdminPanel.css';

export default function AdminCategories() {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDesc, setNewCategoryDesc] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        setIsLoadingCategories(true);
        try {
            const data = await getCategories();
            setCategories(data);
        } catch (err) {
            console.error('Error fetching categories:', err);
            setError('Failed to load categories');
        } finally {
            setIsLoadingCategories(false);
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        if (!newCategoryName.trim()) return;

        setIsCreating(true);
        setError('');
        setSuccess('');

        try {
            await createCategory(newCategoryName, newCategoryDesc);
            setNewCategoryName('');
            setNewCategoryDesc('');
            setSuccess('Category created successfully');
            fetchCategories();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error creating category:', err);
            setError('Failed to create category');
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!window.confirm('Are you sure you want to delete this category?')) {
            return;
        }

        try {
            await deleteCategory(categoryId);
            setCategories(prev => prev.filter(c => c.id !== categoryId));
            setSuccess('Category deleted successfully');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error deleting category:', err);
            setError('Failed to delete category');
        }
    };

    const handleLogout = async () => {
        setLoading(true);
        try {
            await logout();
            window.location.href = '/login';
        } catch (err) {
            console.error('Logout failed:', err);
            setLoading(false);
        }
    };

    return (
        <div className="admin-panel">
            <header className="admin-header">
                <div className="admin-header-content">
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="admin-menu-toggle"
                        aria-label="Toggle sidebar"
                    >
                        <MdMenu />
                    </button>
                    <h1>InnerVoice Admin</h1>
                    <div className="admin-user-info">
                        <span className="user-email">{user?.email}</span>
                        <button
                            onClick={handleLogout}
                            disabled={loading}
                            className="admin-logout-btn"
                        >
                            <MdLogout />
                            <span>{loading ? 'Logging out...' : 'Logout'}</span>
                        </button>
                    </div>
                </div>
            </header>

            <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className={`admin-main ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <section className="admin-section">
                    <div className="section-header">
                        <h2>Manage Categories</h2>
                    </div>

                    {error && <div className="admin-error">{error}</div>}
                    {success && <div className="admin-success">{success}</div>}

                    <div className="admin-card">
                        <h3>Add New Category</h3>
                        <form onSubmit={handleCreateCategory} className="admin-form">
                            <div className="form-group">
                                <label>Category Name</label>
                                <input
                                    type="text"
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="e.g. Love, Work, School"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Description (Optional)</label>
                                <input
                                    type="text"
                                    value={newCategoryDesc}
                                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                                    placeholder="Short description"
                                />
                            </div>
                            <button type="submit" className="admin-btn primary" disabled={isCreating}>
                                <MdAdd /> {isCreating ? 'Creating...' : 'Create Category'}
                            </button>
                        </form>
                    </div>

                    <div className="admin-table-container">
                        <h3>Existing Categories</h3>
                        {isLoadingCategories ? (
                            <div className="admin-loading">Loading categories...</div>
                        ) : categories.length === 0 ? (
                            <div className="admin-empty">No categories found</div>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Description</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categories.map((category) => (
                                        <tr key={category.id}>
                                            <td><strong>{category.name}</strong></td>
                                            <td>{category.description || '-'}</td>
                                            <td>
                                                <button
                                                    onClick={() => handleDeleteCategory(category.id)}
                                                    className="action-btn delete-btn"
                                                    title="Delete"
                                                >
                                                    <MdDelete />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
