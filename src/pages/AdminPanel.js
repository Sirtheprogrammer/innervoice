import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MdLogout, MdMenu } from 'react-icons/md';
import AdminSidebar from '../components/AdminSidebar';
import '../styles/AdminPanel.css';

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <h2>Dashboard</h2>
          <div className="admin-section-content">
            <p>Welcome to the InnerVoice Admin Panel. Use the sidebar to navigate and manage content.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
