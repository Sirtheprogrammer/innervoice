import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MdHome, MdCampaign, MdRefresh, MdComment, MdLogout, MdMenu } from 'react-icons/md';
import UpdatesForm from '../components/admin/UpdatesForm';
import UpdatesList from '../components/admin/UpdatesList';
import '../styles/AdminPanel.css';

export default function AdminUpdates() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [updateRefreshTrigger, setUpdateRefreshTrigger] = useState(0);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      window.location.href = '/admin/login';
    } catch (err) {
      console.error('Logout failed:', err);
      setLoading(false);
    }
  };

  const handleUpdateCreated = () => {
    setUpdateRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div className="admin-header-content">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="menu-toggle">
            <MdMenu />
          </button>
          <h1>InnerVoice Admin Panel</h1>
          <div className="admin-user-info">
            <span className="user-email">{user?.email}</span>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="logout-btn"
            >
              <MdLogout /> {loading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <div className="admin-content">
        <nav className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <ul>
            <li><button onClick={() => { navigate('/admin'); setSidebarOpen(false); }}><MdHome /> Dashboard</button></li>
            <li><button onClick={() => { navigate('/admin/announcements'); setSidebarOpen(false); }}><MdCampaign /> Announcements</button></li>
            <li><button onClick={() => { navigate('/admin/updates'); setSidebarOpen(false); }} className="active"><MdRefresh /> Updates</button></li>
            <li><button onClick={() => { navigate('/admin/confessions'); setSidebarOpen(false); }}><MdComment /> Confessions</button></li>
          </ul>
        </nav>

        <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)}></div>

        <main className="admin-main">
          <section className="admin-section">
            <h2>Manage Updates</h2>
            <div className="admin-section-content">
              <div className="form-container">
                <h3>Create New Update</h3>
                <UpdatesForm onSuccess={handleUpdateCreated} />
              </div>
              <div className="list-container">
                <UpdatesList refreshTrigger={updateRefreshTrigger} />
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}