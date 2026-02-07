import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdComment, MdShare, MdFavorite, MdFavoriteBorder } from 'react-icons/md';
import { getAllConfessions, createConfession, likeConfession } from '../services/confessionsService';
import { getCategories } from '../services/categoriesService';
import Loader from './Loader';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { fuzzySearch } from '../utils/fuzzySearch';
import '../styles/Confessions.css';

export default function Confessions({ searchQuery = '', sidebarOpen = false }) {
  const navigate = useNavigate();
  const { user, isBanned } = useAuth();
  const { theme } = useTheme();
  const CACHE_KEY = 'cached_confessions';
  const CACHE_TIMESTAMP_KEY = 'confessions_cache_timestamp';
  const CATEGORIES_CACHE_KEY = 'cached_categories';
  const CATEGORIES_CACHE_TIMESTAMP_KEY = 'categories_cache_timestamp';
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL
  
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formContent, setFormContent] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [categories, setCategories] = useState([]);
  const [formCategory, setFormCategory] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const confessionsListRef = useRef(null);

  // Sort and filter confessions — newest first, no pagination
  const { displayedConfessions, totalConfessions } = useMemo(() => {
    // Sort by createdAt descending (newest first)
    let sorted = [...confessions].sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : (a.createdAt?.toDate?.() || new Date(a.createdAt));
      const dateB = b.createdAt instanceof Date ? b.createdAt : (b.createdAt?.toDate?.() || new Date(b.createdAt));
      return dateB.getTime() - dateA.getTime();
    });

    // Apply search filter if there's a query
    if (searchQuery && searchQuery.trim()) {
      sorted = fuzzySearch(sorted, searchQuery, ['title', 'content'], 0.3);
    }

    // Apply active category filter
    if (activeCategory !== 'all') {
      sorted = sorted.filter(c => c.categoryId === activeCategory);
    }

    return {
      displayedConfessions: sorted,
      totalConfessions: sorted.length
    };
  }, [confessions, searchQuery, activeCategory]);

  // Track liked confessions (persisted in localStorage)
  const [likedConfessions, setLikedConfessions] = useState(() => {
    const saved = localStorage.getItem('likedConfessions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    fetchConfessions();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // Get cached categories
      const cachedCategories = getCachedCategories();
      
      // If we have cache, display it first
      if (cachedCategories.length > 0) {
        setCategories(cachedCategories);
      }

      // Fetch new categories from Firestore
      const newCategories = await getCategories();
      
      // Merge new with cached
      const mergedCategories = cachedCategories.length > 0 
        ? mergeCategories(cachedCategories, newCategories)
        : newCategories;

      // Update state and cache
      setCategories(mergedCategories);
      saveCategoriesTolocalStorage(mergedCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Category filtering is handled client-side via useMemo, no re-fetch needed

  // localStorage helper functions
  const getCachedConfessions = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (err) {
      console.error('Error reading cache:', err);
      return [];
    }
  };

  const isCacheFresh = () => {
    try {
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (!timestamp) return false;
      return (Date.now() - parseInt(timestamp, 10)) < CACHE_TTL;
    } catch {
      return false;
    }
  };

  const saveCacheTolocalStorage = (confessionsData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(confessionsData));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
      console.error('Error saving to cache:', err);
    }
  };

  const mergeConfessions = (cachedConfessions, newConfessions) => {
    // Create a map of new confessions by ID for fast lookup
    const newConfessionsMap = new Map(newConfessions.map(c => [c.id, c]));
    
    // Update cached confessions with fresh data
    const mergedConfessions = cachedConfessions.map(c => 
      newConfessionsMap.get(c.id) || c
    );

    // Remove any cached items that were deleted from the server
    const freshIds = new Set(newConfessions.map(c => c.id));
    const validMerged = mergedConfessions.filter(c => freshIds.has(c.id));

    // Add completely new confessions at the beginning
    const existingIds = new Set(cachedConfessions.map(c => c.id));
    const newItems = newConfessions.filter(c => !existingIds.has(c.id));
    
    return [...newItems, ...validMerged];
  };

  // Categories cache helper functions
  const getCachedCategories = () => {
    try {
      const cached = localStorage.getItem(CATEGORIES_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (err) {
      console.error('Error reading categories cache:', err);
      return [];
    }
  };

  const saveCategoriesTolocalStorage = (categoriesData) => {
    try {
      localStorage.setItem(CATEGORIES_CACHE_KEY, JSON.stringify(categoriesData));
      localStorage.setItem(CATEGORIES_CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (err) {
      console.error('Error saving categories to cache:', err);
    }
  };

  const mergeCategories = (cachedCategories, newCategories) => {
    // Create a map of new categories by ID
    const newCategoriesMap = new Map(newCategories.map(c => [c.id, c]));
    
    // Update cached categories with new data
    const mergedCategories = cachedCategories.map(c => 
      newCategoriesMap.get(c.id) || c
    );

    // Add completely new categories
    const existingIds = new Set(cachedCategories.map(c => c.id));
    const newItems = newCategories.filter(c => !existingIds.has(c.id));
    
    return [...mergedCategories, ...newItems];
  };

  const fetchConfessions = async (forceRefresh = false) => {
    setError('');
    try {
      // Get cached confessions
      const cachedConfessions = getCachedConfessions();
      const cacheFresh = isCacheFresh();

      // If cache is fresh and we're not forcing a refresh, use cache only
      if (cachedConfessions.length > 0 && cacheFresh && !forceRefresh) {
        setConfessions(cachedConfessions);
        setLoading(false);
        return;
      }

      // Show cached data immediately while fetching fresh data
      if (cachedConfessions.length > 0) {
        setConfessions(cachedConfessions);
        setLoading(false);
      } else {
        setLoading(true);
      }

      // Fetch fresh confessions from Firestore (no category filter at fetch level — filter client-side)
      const newConfessions = await getAllConfessions();
      
      // Merge new with cached (or use fresh data directly)
      const mergedConfessions = cachedConfessions.length > 0 
        ? mergeConfessions(cachedConfessions, newConfessions)
        : newConfessions;

      // Update state and cache
      setConfessions(mergedConfessions);
      saveCacheTolocalStorage(mergedConfessions);
      
    } catch (err) {
      console.error('Error fetching confessions:', err);
      // Only show error if we have no cached data to display
      if (confessions.length === 0) {
        setError('Failed to load confessions');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle click on "Share Your Confession" button
  const handleShareClick = () => {
    if (!user) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: '/', message: 'Please sign in to share your confession' } });
      return;
    }

    if (isBanned) {
      alert('You are banned from posting confessions.');
      return;
    }

    setShowForm(true);
  };

  const handleCreateConfession = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!user) {
      setFormError('You must be logged in to create a confession');
      return;
    }

    if (!formTitle.trim()) {
      setFormError('Please add a title for your confession');
      return;
    }

    if (formTitle.length > 150) {
      setFormError('Title cannot exceed 150 characters');
      return;
    }

    if (!formContent.trim()) {
      setFormError('Please write a confession');
      return;
    }

    if (formContent.length > 5000) {
      setFormError('Confession cannot exceed 5000 characters');
      return;
    }

    if (!formCategory) {
      setFormError('Please select a category');
      return;
    }

    setIsCreating(true);
    try {
      const cat = categories.find(c => c.id === formCategory);
      const categoryName = cat ? cat.name : 'Unknown';

      await createConfession(formContent, formTitle || null, user.uid, formCategory, categoryName);
      setFormContent('');
      setFormTitle('');
      setFormCategory('');
      setFormSuccess('Your confession has been posted!');
      setShowForm(false);

      // Force refresh the confessions list to show the new confession
      await fetchConfessions(true);

      // Clear success message after 3 seconds
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating confession:', err);
      setFormError(err.message || 'Failed to create confession');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = timestamp.toDate?.() || new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const handleViewConfession = (confessionId) => {
    navigate(`/confession/${confessionId}`);
  };

  const handleShareConfession = async (e, confession) => {
    e.stopPropagation();

    const url = `${window.location.origin}/confession/${confession.id}`;
    const text = confession.title ? `${confession.title}\n${confession.content}` : confession.content;
    const truncatedText = truncateText(text, 100);

    const shareData = {
      title: 'Confession',
      text: `Someone confessed: "${truncatedText}"... Read more:`,
      url: url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
        console.log('Share skipped/cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy link', err);
      }
    }
  };

  const handleLikeConfession = async (e, confessionId) => {
    e.stopPropagation();

    // Check if already liked
    const alreadyLiked = likedConfessions.includes(confessionId);
    if (alreadyLiked) {
      return; // Already liked, don't allow unlike for now
    }

    // 1. Optimistically update UI state immediately
    const prevLikedConfessions = [...likedConfessions];
    // Add to liked list and save to localStorage immediately
    const newLikedList = [...likedConfessions, confessionId];
    setLikedConfessions(newLikedList);
    localStorage.setItem('likedConfessions', JSON.stringify(newLikedList));

    // Optimistically update confession like count
    setConfessions(prev => prev.map(c => {
      if (c.id === confessionId) {
        return { ...c, likeCount: (c.likeCount || 0) + 1 };
      }
      return c;
    }));

    try {
      // 2. Perform API call
      await likeConfession(confessionId);
    } catch (err) {
      console.error('Error liking confession:', err);

      // 3. Revert state if API fails
      setLikedConfessions(prevLikedConfessions);
      localStorage.setItem('likedConfessions', JSON.stringify(prevLikedConfessions));

      setConfessions(prev => prev.map(c => {
        if (c.id === confessionId) {
          return { ...c, likeCount: Math.max(0, (c.likeCount || 0) - 1) };
        }
        return c;
      }));
    }
  };

  const truncateText = (text, maxLength = 200) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  if (loading && confessions.length === 0) {
    return <div className="confessions-container"><Loader /></div>;
  }

  return (
    <div className="confessions-container" data-theme={theme || 'light'}>
      {/* Fixed Share Button - hide when sidebar is open */}
      {!showForm && !sidebarOpen && (
        <button
          className="show-form-btn"
          onClick={handleShareClick}
          style={{
            position: 'fixed',
            top: '140px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1050,
            width: '350px',
            maxWidth: 'calc(100% - 40px)',
            padding: '16px 24px',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            fontWeight: '600',
            fontSize: '1rem',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          + Share Your Confession
        </button>
      )}

      {/* Category Filter */}
      <div className="category-filter-container">
        <button
          className={`category-chip ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          All
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`category-chip ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Form Modal Overlay */}
      {showForm && (
        <div
          className="confession-form-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 1001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => {
            setShowForm(false);
            setFormContent('');
            setFormError('');
          }}
        >
          <div
            className="confession-form"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto'
            }}
          >
            <h2>Share Your Anonymous Confession</h2>
            {formError && <div className="form-error">{formError}</div>}
            {formSuccess && <div className="form-success">{formSuccess}</div>}
            <form onSubmit={handleCreateConfession}>
              <div className="form-group">
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Title (required, max 150 characters)"
                  maxLength={150}
                  disabled={isCreating}
                  required
                />
              </div>
              <div className="form-group">
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  disabled={isCreating}
                  required
                >
                  <option value="">Select a Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}

                </select>
              </div>
              <div className="form-group">
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write your confession here (max 5000 characters)..."
                  maxLength="5000"
                  rows="6"
                  disabled={isCreating}
                />
                <div className="char-count">
                  {formContent.length} / 5000
                </div>
              </div>
              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={isCreating}
                >
                  {isCreating ? 'Posting...' : 'Post Confession'}
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowForm(false);
                    setFormContent('');
                    setFormError('');
                  }}
                  disabled={isCreating}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Error Section */}
      {error && <div className="error-message">{error}</div>}

      {/* Confessions List */}
      <div className="confessions-list" ref={confessionsListRef}>
        {confessions.length === 0 ? (
          <div className="empty-state">
            <p>No confessions yet. Be the first to share!</p>
          </div>
        ) : totalConfessions === 0 ? (
          <div className="empty-state search-no-results">
            <p>No confessions found matching "{searchQuery}"</p>
            <p className="search-hint">Try a different search term or check for typos</p>
          </div>
        ) : (
          <>
            {searchQuery && (
              <div className="search-results-info">
                Found {totalConfessions} confession{totalConfessions !== 1 ? 's' : ''}
                matching "{searchQuery}"
              </div>
            )}
            {displayedConfessions.map((confession) => (
              <div
                key={confession.id}
                className="confession-card"
                onClick={() => handleViewConfession(confession.id)}
              >
                <div className="confession-header">
                  <span className="timestamp">
                    {formatDate(confession.createdAt)}
                  </span>
                </div>
                {confession.title ? <h3 className="confession-title">{confession.title}</h3> : null}
                <p className="confession-content">
                  {truncateText(confession.content, 300)}
                </p>
                <div className="confession-footer">
                  <div className="confession-stats">
                    <button
                      className="like-btn"
                      onClick={(e) => handleLikeConfession(e, confession.id)}
                      title={likedConfessions.includes(confession.id) ? 'Already liked' : 'Like this confession'}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: likedConfessions.includes(confession.id) ? 'default' : 'pointer',
                        color: likedConfessions.includes(confession.id) ? '#ef4444' : 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.9rem',
                        padding: '4px 8px'
                      }}
                    >
                      {likedConfessions.includes(confession.id) ? <MdFavorite /> : <MdFavoriteBorder />} {confession.likeCount || 0}
                    </button>
                    <span className="comment-count">
                      <MdComment /> {confession.commentCount || 0} comments
                    </span>
                    <button
                      className="share-btn"
                      onClick={(e) => handleShareConfession(e, confession)}
                      title="Share this confession"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginLeft: '15px',
                        fontSize: '0.9rem',
                        padding: '4px 8px',
                        flexShrink: 0,
                        transition: 'none',
                        transform: 'none',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <MdShare /> Share
                    </button>
                  </div>
                  <span className="read-more">Read more →</span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
