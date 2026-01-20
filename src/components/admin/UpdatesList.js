import React, { useEffect, useState } from 'react';
import { getUpdates, deleteUpdate } from '../../services/updatesService';
import '../../styles/AdminUpdates.css';

export default function UpdatesList({ refreshTrigger }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchUpdates = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUpdates();
      setUpdates(data);
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch updates';
      setError(errorMsg);
      console.error('Fetch updates error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpdates();
  }, [refreshTrigger]);

  const handleDelete = async (id, title) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the update "${title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(id);
    setDeleteError('');

    try {
      await deleteUpdate(id);
      setUpdates(updates.filter((u) => u.id !== id));
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete update';
      setDeleteError(errorMsg);
      console.error('Delete update error:', err);
    } finally {
      setDeleting(null);
      // Clear error after 3 seconds
      setTimeout(() => setDeleteError(''), 3000);
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

  const truncateContent = (content, maxLength = 100) => {
    if (content.length > maxLength) {
      return content.substring(0, maxLength) + '...';
    }
    return content;
  };

  if (loading) {
    return (
      <div className="updates-list">
        <h3>Published Updates (Loading...)</h3>
        <div className="loading">Loading updates...</div>
      </div>
    );
  }

  return (
    <div className="updates-list">
      <h3>Published Updates ({updates.length})</h3>

      {error && <div className="error-message">{error}</div>}
      {deleteError && <div className="error-message">{deleteError}</div>}

      {updates.length === 0 ? (
        <p className="empty-state">No updates published yet. Create one to get started!</p>
      ) : (
        <div className="list-table">
          <div className="table-header">
            <div className="table-cell col-image">Image</div>
            <div className="table-cell col-title">Title</div>
            <div className="table-cell col-content">Content Preview</div>
            <div className="table-cell col-tags">Tags</div>
            <div className="table-cell col-date">Published</div>
            <div className="table-cell col-actions">Actions</div>
          </div>

          {updates.map((update) => (
            <div key={update.id} className="table-row">
              <div className="table-cell col-image">
                <div className="table-image">
                  <img
                    src={update.image}
                    alt={update.title}
                    onError={(e) => {
                      e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="80" height="60"%3E%3Crect fill="%23ddd" width="80" height="60"/%3E%3Ctext x="50" y="30" text-anchor="middle" dy=".3em" fill="%23999" font-size="11"%3EError%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              </div>

              <div className="table-cell col-title">
                <span title={update.title}>{update.title}</span>
              </div>

              <div className="table-cell col-content">
                <span title={update.mainContent}>{truncateContent(update.mainContent)}</span>
              </div>

              <div className="table-cell col-tags">
                {update.tags && update.tags.length > 0 ? (
                  <div className="tag-list">
                    {update.tags.slice(0, 2).map((tag, idx) => (
                      <span key={idx} className="tag">
                        {tag}
                      </span>
                    ))}
                    {update.tags.length > 2 && <span className="tag-more">+{update.tags.length - 2}</span>}
                  </div>
                ) : (
                  <span className="no-tags">—</span>
                )}
              </div>

              <div className="table-cell col-date">
                <small>{formatDate(update.createdAt)}</small>
              </div>

              <div className="table-cell col-actions">
                <button
                  onClick={() => handleDelete(update.id, update.title)}
                  disabled={deleting === update.id}
                  className="delete-btn"
                  title={deleting === update.id ? 'Deleting...' : 'Delete update'}
                >
                  {deleting === update.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
