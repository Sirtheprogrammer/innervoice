import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MdHome, MdCampaign, MdRefresh, MdComment, MdClose, MdCategory, MdLogout, MdChat } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { subscribeToGlobalSettings, updateGlobalSettings } from '../services/settingsService';
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
  const [chatEnabled, setChatEnabled] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  React.useEffect(() => {
    const unsubscribe = subscribeToGlobalSettings((settings) => {
      setChatEnabled(!!settings.chatEnabled);
      setLoadingSettings(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleChat = async () => {
    try {
      const newState = !chatEnabled;
      // Optimistic update
      setChatEnabled(newState);
      await updateGlobalSettings({ chatEnabled: newState });
    } catch (error) {
      console.error("Failed to update chat setting", error);
      // Revert on error
      setChatEnabled(!chatEnabled);
    }
  };

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

            {/* Settings Section */}
            <li>
              <div style={{ padding: '12px 16px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <MdChat className="admin-sidebar-icon" />
                  <span>Public Chat</span>
                </div>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '34px', height: '20px' }}>
                  <input
                    type="checkbox"
                    checked={chatEnabled}
                    onChange={handleToggleChat}
                    disabled={loadingSettings}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider round" style={{
                    position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: chatEnabled ? '#2196F3' : '#ccc',
                    transition: '.4s', borderRadius: '34px'
                  }}>
                    <span style={{
                      position: 'absolute', content: "", height: '14px', width: '14px', left: '3px', bottom: '3px',
                      backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                      transform: chatEnabled ? 'translateX(14px)' : 'translateX(0)'
                    }}></span>
                  </span>
                </label>
              </div>
            </li>

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