import React from 'react';
import '../App.css';

export default function SearchBar() {
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Search for:', searchQuery);
    // TODO: implement search functionality
  };

  return (
    <div className="search-bar-container">
      <form className="search-bar" onSubmit={handleSearch}>
        <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          aria-label="Search"
        />
      </form>
    </div>
  );
}
