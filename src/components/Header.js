import React from 'react';
import '../App.css';

export default function Header({ toggleSidebar }) {
  return (
    <header className="site-header" role="banner">
      <div className="header-inner">
        {/* hamburger moved to the right for mobile UX */}
        <div className="brand">
          <img src="/InnerVoice.png" alt="InnerVoice logo" className="brand-logo" />
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
    </header>
  );
}
