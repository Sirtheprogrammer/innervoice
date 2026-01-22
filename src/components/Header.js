import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import '../App.css';

export default function Header({ toggleSidebar }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);

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
