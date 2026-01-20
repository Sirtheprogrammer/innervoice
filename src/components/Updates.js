import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import '../App.css';

export default function Updates() {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUpdates = async () => {
      setLoading(true);
      setError('');
      try {
        const q = query(
          collection(db, 'updates'),
          orderBy('createdAt', 'desc'),
          limit(6)
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUpdates(data);
      } catch (err) {
        console.error('Error fetching updates:', err);
        setError('Failed to load updates');
      } finally {
        setLoading(false);
      }
    };

    fetchUpdates();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = timestamp.toDate?.() || new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const truncateContent = (content, maxLength = 120) => {
    if (content.length > maxLength) {
      return content.substring(0, maxLength) + '...';
    }
    return content;
  };

  const handleReadMore = (updateId) => {
    navigate(`/update/${updateId}`);
  };

  if (loading) {
    return (
      <section className="updates-section">
        <div className="updates-header">
          <h2>UPDATES</h2>
          <p>Latest updates</p>
        </div>
        <div className="updates-loading">
          <p>Loading updates...</p>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="updates-section">
        <div className="updates-header">
          <h2>UPDATES</h2>
          <p>Latest updates</p>
        </div>
        <div className="updates-error">
          <p>{error}</p>
        </div>
      </section>
    );
  }

  if (updates.length === 0) {
    return (
      <section className="updates-section">
        <div className="updates-header">
          <h2>UPDATES</h2>
          <p>Latest updates</p>
        </div>
        <div className="updates-empty">
          <p>No updates available yet</p>
        </div>
      </section>
    );
  }

  return (
    <section className="updates-section">
      <div className="updates-header">
        <h2>UPDATES</h2>
        <p>Latest updates</p>
      </div>

      <div className="updates-grid">
        {updates.map((update) => (
          <article key={update.id} className="update-card">
            <div className="update-image">
              <img
                src={update.image}
                alt={update.title}
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="180"%3E%3Crect fill="%23ddd" width="300" height="180"/%3E%3Ctext x="150" y="90" text-anchor="middle" dy=".3em" fill="%23999"%3EImage unavailable%3C/text%3E%3C/svg%3E';
                }}
              />
            </div>
            <div className="update-content">
              <h3>{update.title}</h3>
              <p>{truncateContent(update.mainContent)}</p>
              {update.tags && update.tags.length > 0 && (
                <div className="update-tags">
                  {update.tags.slice(0, 2).map((tag, idx) => (
                    <span key={idx} className="update-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="update-footer">
                <span className="update-date">{formatDate(update.createdAt)}</span>
                <button
                  onClick={() => handleReadMore(update.id)}
                  className="read-more-btn"
                >
                  Read More →
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
