import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AnnouncementForm from '../components/admin/AnnouncementForm';
import AnnouncementsList from '../components/admin/AnnouncementsList';
import UpdatesForm from '../components/admin/UpdatesForm';
import UpdatesList from '../components/admin/UpdatesList';
import '../styles/AdminPanel.css';

export default function AdminPanel() {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [announcementRefreshTrigger, setAnnouncementRefreshTrigger] = useState(0);
  const [updatesRefreshTrigger, setUpdatesRefreshTrigger] = useState(0);

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

  const handleAnnouncementCreated = () => {
    setAnnouncementRefreshTrigger((prev) => prev + 1);
  };

  const handleUpdateCreated = () => {
    setUpdatesRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>CHIEFGMEDIA ADMIN</h1>
          <div className="admin-user-info">
            <span className="user-email">{user?.email}</span>
            <button 
              onClick={handleLogout} 
              disabled={loading}
              className="logout-btn"
            >
              {loading ? 'Logging out...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      <div className="admin-content">
        <nav className="admin-sidebar">
          <ul>
            <li><a href="#announcements">Announcements</a></li>
            <li><a href="#updates">Updates</a></li>
            <li><a href="#users">Users</a></li>
            <li><a href="#settings">Settings</a></li>
          </ul>
        </nav>

        <main className="admin-main">
          <section id="announcements" className="admin-section">
            <h2>Announcements</h2>
            <div className="admin-section-content">
              <div className="form-container">
                <h3>Create New Announcement</h3>
                <AnnouncementForm onSuccess={handleAnnouncementCreated} />
              </div>
              <div className="list-container">
                <AnnouncementsList refreshTrigger={announcementRefreshTrigger} />
              </div>
            </div>
          </section>

          <section id="updates" className="admin-section">
            <h2>Updates</h2>
            <div className="admin-section-content">
              <div className="form-container">
                <h3>Publish New Update</h3>
                <UpdatesForm onSuccess={handleUpdateCreated} />
              </div>
              <div className="list-container">
                <UpdatesList refreshTrigger={updatesRefreshTrigger} />
              </div>
            </div>
          </section>

          <section id="users" className="admin-section">
            <h2>Users</h2>
            <p>Manage users will be implemented here</p>
          </section>

          <section id="settings" className="admin-section">
            <h2>Settings</h2>
            <p>Settings will be implemented here</p>
          </section>
        </main>
      </div>
    </div>
  );
}
