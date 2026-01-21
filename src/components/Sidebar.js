import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

export default function Sidebar({ isOpen = false }) {
  return (
    <aside className={`site-sidebar ${isOpen ? 'open' : ''}`} aria-label="Side navigation">
      <nav>
        <Link to="/" className="side-link">Home</Link>
        <Link to="/contacts" className="side-link">Contacts</Link>
        <Link to="/about" className="side-link">About Us</Link>
      </nav>
    </aside>
  );
}
