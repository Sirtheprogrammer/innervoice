import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../App.css';

export default function Sidebar({ isOpen = false }) {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <aside className={`site-sidebar ${isOpen ? 'open' : ''}`} aria-label="Side navigation">
      <nav>
        <Link to="/" className="side-link">Home</Link>
        <Link to="/contacts" className="side-link">Contacts</Link>
        <Link to="/about" className="side-link">About Us</Link>

        {!user ? (
          <>
            <Link to="/register" className="side-link auth-link">Register</Link>
            <Link to="/login" className="side-link auth-link">Login</Link>
          </>
        ) : (
          <>
            <Link to="/profile" className="side-link">Profile System</Link>
            <Link to="/profile" state={{ activeTab: 'confessions' }} className="side-link">My Confessions</Link>
            <button onClick={handleLogout} className="side-link logout-btn">Logout</button>
          </>
        )}
      </nav>
    </aside>
  );
}
