import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getUserNotifications, markNotificationAsRead } from '../services/notificationsService';
import { MdNotifications, MdNotificationsNone } from 'react-icons/md';
import '../App.css';

export default function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await getUserNotifications(user.uid);
      setNotifications(data);
      const unread = data.filter(n => !n.read).length;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.read) {
        await markNotificationAsRead(notification.id);

        // Update local state
        setNotifications(prev => prev.map(n =>
          n.id === notification.id ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      // Navigate to confession if applicable
      if (notification.confessionId) {
        window.location.href = `/confession/${notification.confessionId}`;
      }
    } catch (err) {
      console.error('Error handling notification click', err);
    }
  };


  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  const getInitial = () => {
    const name = user?.displayName || user?.email || '';
    return name.charAt(0).toUpperCase() || '?';
  };

  return (
    <header className="site-header" role="banner">
      <div className="header-inner">
        <div className="brand">
          <div className="brand-logo-wrapper">
            <img src="/InnerVoice.png" alt="InnerVoice logo" className="brand-logo" />
          </div>
          <div className="brand-text">
            <div className="brand-title">INNERVOICE</div>
            <div className="brand-sub">Say your Inner Voice</div>
          </div>
        </div>

        <nav className="header-nav" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#updates">Updates</a>
          <a href="#contacts">Contacts</a>
          <a href="#about">About Us</a>
        </nav>

        <div className="header-right" style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label="Toggle theme"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--white)',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px'
            }}
          >
            {theme === 'light' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            )}
          </button>

          {user && (
            <div className="notifications-wrapper" ref={notifRef} style={{ position: 'relative', marginRight: '10px' }}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--white)',
                  cursor: 'pointer',
                  fontSize: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px',
                  position: 'relative'
                }}
              >
                {unreadCount > 0 ? <MdNotifications /> : <MdNotificationsNone />}
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    background: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: '16px',
                    height: '16px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold'
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="notifications-dropdown" style={{
                  position: 'absolute',
                  top: '120%',
                  right: '-50px',
                  width: '300px',
                  maxWidth: '90vw',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  zIndex: 2000,
                  maxHeight: '400px',
                  overflowY: 'auto',
                  border: '1px solid var(--border-color)',
                }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer' }} onClick={async (e) => {
                        e.stopPropagation();
                        // Mark all logic could go here
                      }}>
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No notifications yet
                    </div>
                  ) : (
                    <div>
                      {notifications.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-color)',
                            cursor: 'pointer',
                            background: notif.read ? 'transparent' : 'rgba(var(--primary-rgb), 0.1)',
                            transition: 'background 0.2s',
                          }}
                          className="notification-item"
                        >
                          <div style={{ fontSize: '0.9rem', marginBottom: '4px' }}>{notif.message}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatTime(notif.createdAt)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="auth-nav" aria-label="Authentication">
            {!user ? (
              <>
                <Link to="/register" className="auth-link register-link">Register</Link>
                <Link to="/login" className="auth-link login-link">Login</Link>
              </>
            ) : (
              <div className="user-menu" ref={menuRef}>
                <button
                  className="user-avatar"
                  onClick={() => setMenuOpen((s) => !s)}
                  aria-label="Open user menu"
                >
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar" />
                  ) : (
                    <span className="avatar-initial">{getInitial()}</span>
                  )}
                </button>

                {menuOpen && (
                  <div className="user-dropdown">
                    <div className="dropdown-item">{user.email}</div>
                    <Link to="/profile" className="dropdown-item">Profile</Link>
                    <button onClick={handleLogout} className="dropdown-item">Logout</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            className="hamburger"
            aria-label="Toggle navigation"
            onClick={toggleSidebar}
          >
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
            <span className="hamburger-bar" />
          </button>
        </div>
      </div>
    </header>
  );
}
