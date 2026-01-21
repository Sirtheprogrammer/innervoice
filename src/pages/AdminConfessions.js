import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MdLogout, MdMenu, MdComment, MdFlag, MdDelete } from 'react-icons/md';
import { getAllConfessions, deleteConfession, flagConfession } from '../services/confessionsService';
import { getCommentsByConfessionId, deleteComment } from '../services/commentsService';
import AdminSidebar from '../components/AdminSidebar';
import '../styles/AdminPanel.css';

export default function AdminConfessions() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confessions, setConfessions] = useState([]);
  const [comments, setComments] = useState({});
  const [expandedConfession, setExpandedConfession] = useState(null);
  const [isLoadingConfessions, setIsLoadingConfessions] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchConfessions();
  }, []);

  const fetchConfessions = async () => {
    setIsLoadingConfessions(true);
    setError('');
    try {
      const data = await getAllConfessions();
      setConfessions(data);
    } catch (err) {
      console.error('Error fetching confessions:', err);
      setError('Failed to load confessions');
    } finally {
      setIsLoadingConfessions(false);
    }
  };

  const fetchCommentsForConfession = async (confessionId) => {
    try {
      const commentsData = await getCommentsByConfessionId(confessionId);
      setComments((prev) => ({
        ...prev,
        [confessionId]: commentsData,
      }));
    } catch (err) {
      console.error('Error fetching comments:', err);
      setError('Failed to load comments');
    }
  };

  const handleExpandConfession = (confessionId) => {
    if (expandedConfession === confessionId) {
      setExpandedConfession(null);
    } else {
      setExpandedConfession(confessionId);
      if (!comments[confessionId]) {
        fetchCommentsForConfession(confessionId);
      }
    }
  };

  const handleDeleteConfession = async (confessionId) => {
    if (!window.confirm('Are you sure you want to delete this confession? This cannot be undone.')) {
      return;
    }

    try {
      await deleteConfession(confessionId);
      setConfessions((prev) => prev.filter((c) => c.id !== confessionId));
      setSuccess('Confession deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting confession:', err);
      setError('Failed to delete confession');
    }
  };

  const handleDeleteComment = async (commentId, confessionId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await deleteComment(commentId, confessionId);
      setComments((prev) => ({
        ...prev,
        [confessionId]: prev[confessionId].filter((c) => c.id !== commentId),
      }));
      setSuccess('Comment deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting comment:', err);
      setError('Failed to delete comment');
    }
  };

  const handleFlagConfession = async (confessionId) => {
    try {
      await flagConfession(confessionId);
      setSuccess('Confession flagged for review');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error flagging confession:', err);
      setError('Failed to flag confession');
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout failed:', err);
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = timestamp.toDate?.() || new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <div className="admin-panel">
      <header className="admin-header">
        <div className="admin-header-content">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="admin-menu-toggle"
            aria-label="Toggle sidebar"
          >
            <MdMenu />
          </button>
          <h1>InnerVoice Admin</h1>
          <div className="admin-user-info">
            <span className="user-email">{user?.email}</span>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="admin-logout-btn"
            >
              <MdLogout />
              <span>{loading ? 'Logging out...' : 'Logout'}</span>
            </button>
          </div>
        </div>
      </header>

      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className={`admin-main ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <section className="admin-section">
            <div className="section-header">
              <h2>Manage Confessions</h2>
              <button onClick={fetchConfessions} className="refresh-btn">↻ Refresh</button>
            </div>

            {error && <div className="admin-error">{error}</div>}
            {success && <div className="admin-success">{success}</div>}

            {isLoadingConfessions ? (
              <div className="admin-loading">Loading confessions...</div>
            ) : confessions.length === 0 ? (
              <div className="admin-empty">No confessions found</div>
            ) : (
              <div className="confessions-list">
                {confessions.map((confession) => (
                  <div key={confession.id} className="confession-card">
                    <div className="confession-header">
                      <div className="confession-info">
                        <span className="confession-id">ID: {confession.id}</span>
                        <span className="confession-date">{formatDate(confession.createdAt)}</span>
                        <span className="confession-stats">
                          <MdComment /> {confession.commentCount || 0} comments
                        </span>
                      </div>
                      <div className="confession-actions">
                        <button
                          onClick={() => handleExpandConfession(confession.id)}
                          className="action-btn expand-btn"
                        >
                          {expandedConfession === confession.id ? '▼' : '▶'}
                        </button>
                        <button
                          onClick={() => handleFlagConfession(confession.id)}
                          className="action-btn flag-btn"
                          title="Flag for review"
                        >
                          <MdFlag />
                        </button>
                        <button
                          onClick={() => handleDeleteConfession(confession.id)}
                          className="action-btn delete-btn"
                          title="Delete"
                        >
                          <MdDelete />
                        </button>
                      </div>
                    </div>

                    <div className="confession-content">
                      {confession.title && <h4 className="confession-title">{confession.title}</h4>}
                      <p>{confession.content}</p>
                    </div>

                    {expandedConfession === confession.id && (
                      <div className="confession-details">
                        <h4>Comments ({comments[confession.id]?.length || 0})</h4>
                        {comments[confession.id]?.length === 0 ? (
                          <p className="no-comments">No comments on this confession</p>
                        ) : (
                          <div className="comments-list">
                            {comments[confession.id]?.map((comment) => (
                              <div key={comment.id} className="comment-item">
                                <div className="comment-header">
                                  <span className="comment-author">Anonymous</span>
                                  <span className="comment-date">{formatDate(comment.createdAt)}</span>
                                  <button
                                    onClick={() => handleDeleteComment(comment.id, confession.id)}
                                    className="action-btn delete-btn"
                                    title="Delete comment"
                                  >
                                    <MdDelete />
                                  </button>
                                </div>
                                <p className="comment-text">{comment.content}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
    </div>
  );
}