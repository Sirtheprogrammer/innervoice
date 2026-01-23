import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MdHome, MdCampaign, MdRefresh, MdComment, MdClose, MdCategory, MdLogout } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import '../styles/AdminPanel.css';

const navigationItems = [
  { path: '/admin', label: 'Dashboard', icon: MdHome },
  { path: '/admin/announcements', label: 'Announcements', icon: MdCampaign },
  { path: '/admin/updates', label: 'Updates', icon: MdRefresh },
  { path: '/admin/confessions', label: 'Confessions', icon: MdComment },
  { path: '/admin/categories', label: 'Categories', icon: MdCategory },
];

export default function AdminSidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={onClose}
          aria-hidden="false"
        />
      )}

      <aside className={`admin-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <h2>InnerVoice Admin</h2>
          <button
            className="admin-sidebar-close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <MdClose />
          </button>
        </div>

        <nav className="admin-sidebar-nav">
          <ul>
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`admin-sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                  >
                    <Icon className="admin-sidebar-icon" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
            <li className="admin-sidebar-divider"></li>
            <li>
              <button
                onClick={handleLogout}
                className="admin-sidebar-link start-logout-btn"
                disabled={isLoggingOut}
              >
                <MdLogout className="admin-sidebar-icon" />
                <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
}