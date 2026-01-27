import React, { useState, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import Confessions from './components/Confessions';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import ChatWidget from './components/ChatWidget'; // Added import for ChatWidget

import { useTheme } from './context/ThemeContext';

export default function App() {
  const { theme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSidebar = () => setSidebarOpen(open => !open);

  const closeSidebar = () => setSidebarOpen(false);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  return (
    <div className="site-root" data-theme={theme}>
      <Header toggleSidebar={toggleSidebar} />
      <SearchBar onSearch={handleSearch} />
      <div className="app-body">
        <Sidebar isOpen={sidebarOpen} />
        {/* mobile overlay: clicking closes the sidebar */}
        <div
          className={`mobile-overlay ${sidebarOpen ? 'visible' : ''}`}
          onClick={closeSidebar}
          aria-hidden={!sidebarOpen}
        />
        <main className="main-content" id="main">
          <Confessions searchQuery={searchQuery} sidebarOpen={sidebarOpen} />
        </main>
      </div>

      <Footer />
      <ChatWidget />
    </div>
  );
}
