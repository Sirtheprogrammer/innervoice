import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdComment } from 'react-icons/md';
import { getAllConfessions, createConfession } from '../services/confessionsService';
import { useAuth } from '../context/AuthContext';
import '../styles/Confessions.css';

export default function Confessions() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formContent, setFormContent] = useState('');
  const [formTitle, setFormTitle] = useState('');

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
      {/* Form Section */}
      <div className="confession-form-section">
        {!showForm ? (
          <button
            className="show-form-btn"
            onClick={handleShareClick}
          >
            + Share Your Confession
          </button>
        ) : (
          <div className="confession-form">
            <h2>Share Your Anonymous Confession</h2>
            {formError && <div className="form-error">{formError}</div>}
            {formSuccess && <div className="form-success">{formSuccess}</div>}
            <form onSubmit={handleCreateConfession}>
              <div className="form-group">
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Optional title (max 150 characters)"
                  maxLength={150}
                  disabled={isCreating}
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
        )}
      </div>

      {/* Error Section */}
      {error && <div className="error-message">{error}</div>}

      {/* Confessions List */}
      <div className="confessions-list">
        {confessions.length === 0 ? (
          <div className="empty-state">
            <p>No confessions yet. Be the first to share!</p>
          </div>
        ) : (
          confessions.map((confession) => (
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
                  <span className="comment-count">
                    <MdComment /> {confession.commentCount || 0} comments
                  </span>
                </div>
                <span className="read-more">Read more →</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
