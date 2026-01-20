import React, { useEffect, useState } from 'react';
import { getAnnouncements, deleteAnnouncement } from '../../services/announcementService';
import '../../styles/AdminAnnouncements.css';

export default function AnnouncementsList({ refreshTrigger }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      const errorMsg = err.message || 'Failed to fetch announcements';
      setError(errorMsg);
      console.error('Fetch announcements error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [refreshTrigger]);

  const handleDelete = async (id, title) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the announcement "${title}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setDeleting(id);
    setDeleteError('');

    try {
      await deleteAnnouncement(id);
      setAnnouncements(announcements.filter((a) => a.id !== id));
    } catch (err) {
      const errorMsg = err.message || 'Failed to delete announcement';
      setDeleteError(errorMsg);
      console.error('Delete announcement error:', err);
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

  if (loading) {
    return (
      <div className="announcements-list">
        <h3>Announcements (Loading...)</h3>
        <div className="loading">Loading announcements...</div>
      </div>
    );
  }

  return (
    <div className="announcements-list">
      <h3>Announcements ({announcements.length})</h3>

      {error && <div className="error-message">{error}</div>}
      {deleteError && <div className="error-message">{deleteError}</div>}

      {announcements.length === 0 ? (
        <p className="empty-state">No announcements yet. Create one to get started!</p>
      ) : (
        <div className="list-grid">
          {announcements.map((announcement) => (
            <div key={announcement.id} className="announcement-card">
              <div className="announcement-image">
                <img src={announcement.image} alt={announcement.title} onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3EImage Error%3C/text%3E%3C/svg%3E';
                }} />
              </div>
              <div className="announcement-content">
                <h4 title={announcement.title}>{announcement.title}</h4>
                <div className="announcement-meta">
                  <small>{formatDate(announcement.createdAt)}</small>
                </div>
                <button
                  onClick={() => handleDelete(announcement.id, announcement.title)}
                  disabled={deleting === announcement.id}
                  className="delete-btn"
                  title={deleting === announcement.id ? 'Deleting...' : 'Delete announcement'}
                >
                  {deleting === announcement.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
