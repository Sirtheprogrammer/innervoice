import React from 'react';
import './App.css';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import AnnouncementsCarousel from './components/AnnouncementsCarousel';
import Updates from './components/Updates';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';

function App() {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const toggleSidebar = () => setSidebarOpen(open => !open);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="site-root">
      <Header toggleSidebar={toggleSidebar} />
      <SearchBar />
      {/* Carousel for mobile - appears below search bar */}
      <aside className="announcements-sidebar mobile-carousel">
        <AnnouncementsCarousel />
      </aside>
      <div className="app-body">
        <Sidebar isOpen={sidebarOpen} />
        {/* mobile overlay: clicking closes the sidebar */}
        <div
          className={`mobile-overlay ${sidebarOpen ? 'visible' : ''}`}
          onClick={closeSidebar}
          aria-hidden={!sidebarOpen}
        />
        <main className="main-content" id="main">
          <Updates />
        </main>
        {/* Carousel for desktop - appears on right side */}
        <aside className="announcements-sidebar desktop-carousel">
          <AnnouncementsCarousel />
        </aside>
      </div>

      <Footer />
      
    </div>
  );
}

export default App;
