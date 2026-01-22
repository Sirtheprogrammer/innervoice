import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdComment, MdShare, MdFavorite, MdFavoriteBorder } from 'react-icons/md';
import { getAllConfessions, createConfession, likeConfession } from '../services/confessionsService';
import { useAuth } from '../context/AuthContext';
import { fuzzySearch } from '../utils/fuzzySearch';
import '../styles/Confessions.css';

/**
 * Calculate a ranking score that balances recency and engagement
 * Newer posts get priority, but engagement (likes + comments) boosts the score
 */
const calculateRankingScore = (confession) => {
  const now = Date.now();
  const createdAt = confession.createdAt?.toDate?.() || new Date(confession.createdAt);
  const ageInHours = (now - createdAt.getTime()) / (1000 * 60 * 60);

  // Engagement score (likes count more than comments for quick engagement)
  const likes = confession.likeCount || 0;
  const comments = confession.commentCount || 0;
  const engagementScore = (likes * 2) + (comments * 3);

  // Recency score - newer posts get higher base score
  // Posts decay over time but engagement can boost them back up
  // Using logarithmic decay to keep very old engaged posts somewhat visible
  const recencyScore = Math.max(0, 100 - Math.log(ageInHours + 1) * 15);

  // Boost factor for very recent posts (within last 24 hours)
  const recentBoost = ageInHours < 24 ? 50 : (ageInHours < 72 ? 20 : 0);

  // Combined score: base recency + engagement boost + recent post boost
  return recencyScore + (engagementScore * 2) + recentBoost;
};

export default function Confessions({ searchQuery = '', sidebarOpen = false }) {
  const navigate = useNavigate();
  const { user, isBanned } = useAuth();
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formContent, setFormContent] = useState('');
  const [formTitle, setFormTitle] = useState('');

  // Sort and filter confessions with smart ranking
  const filteredConfessions = useMemo(() => {
    // First, sort all confessions by ranking score
    const sortedConfessions = [...confessions].sort((a, b) => {
      return calculateRankingScore(b) - calculateRankingScore(a);
    });

    // Then apply search filter if there's a query
    if (!searchQuery || !searchQuery.trim()) {
      return sortedConfessions;
    }
    return fuzzySearch(sortedConfessions, searchQuery, ['title', 'content'], 0.3);
  }, [confessions, searchQuery]);

  // Track liked confessions (persisted in localStorage)
  const [likedConfessions, setLikedConfessions] = useState(() => {
    const saved = localStorage.getItem('likedConfessions');
    return saved ? JSON.parse(saved) : [];
  });

  // Fetch confessions on mount
  useEffect(() => {
    fetchConfessions();
  }, []);

  const fetchConfessions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAllConfessions(50);
      setConfessions(data);
    } catch (err) {
      console.error('Error fetching confessions:', err);
      setError('Failed to load confessions');
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

    setIsCreating(true);
    try {
      await createConfession(formContent, formTitle || null, user.uid);
      setFormContent('');
      setFormTitle('');
      setFormSuccess('Your confession has been posted!');
      setShowForm(false);

      // Refresh the confessions list
      await fetchConfessions();

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

    try {
      await likeConfession(confessionId);

      // Add to liked list and save to localStorage
      const newLikedList = [...likedConfessions, confessionId];
      setLikedConfessions(newLikedList);
      localStorage.setItem('likedConfessions', JSON.stringify(newLikedList));

      // Optimistically update local state
      setConfessions(prev => prev.map(c => {
        if (c.id === confessionId) {
          return { ...c, likeCount: (c.likeCount || 0) + 1 };
        }
        return c;
      }));
    } catch (err) {
      console.error('Error liking confession:', err);
    }
  };

  const truncateText = (text, maxLength = 200) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  if (loading && confessions.length === 0) {
    return <div className="confessions-container"><div className="loading">Loading confessions...</div></div>;
  }

  return (
    <div className="confessions-container">
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
      <div className="confessions-list">
        {confessions.length === 0 ? (
          <div className="empty-state">
            <p>No confessions yet. Be the first to share!</p>
          </div>
        ) : filteredConfessions.length === 0 ? (
          <div className="empty-state search-no-results">
            <p>No confessions found matching "{searchQuery}"</p>
            <p className="search-hint">Try a different search term or check for typos</p>
          </div>
        ) : (
          <>
            {searchQuery && (
              <div className="search-results-info">
                Found {filteredConfessions.length} confession{filteredConfessions.length !== 1 ? 's' : ''}
                matching "{searchQuery}"
              </div>
            )}
            {filteredConfessions.map((confession) => (
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
