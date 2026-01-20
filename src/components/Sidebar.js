import React from 'react';
import '../App.css';

export default function Sidebar({ isOpen = false }) {
  return (
    <aside className={`site-sidebar ${isOpen ? 'open' : ''}`} aria-label="Side navigation">
      <nav>
        <a href="#home" className="side-link">Home</a>
        <a href="#updates" className="side-link">Updates</a>
        <a href="#contacts" className="side-link">Contacts</a>
        <a href="#about" className="side-link">About Us</a>
      </nav>
    </aside>
  );
}
