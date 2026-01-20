import React from 'react';
import '../App.css';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <small>© {year} chief g media</small>
      </div>
    </footer>
  );
}
