import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import '../styles/UpdateDetail.css';

export default function UpdateDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [update, setUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUpdate = async () => {
      setLoading(true);
      setError('');
      try {
        const docRef = doc(db, 'updates', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setUpdate({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError('Update not found');
        }
      } catch (err) {
        console.error('Error fetching update:', err);
        setError('Failed to load update');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchUpdate();
    }
  }, [id]);

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    try {
      const date = timestamp.toDate?.() || new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="update-detail-container">
        <div className="update-detail-loading">
          <p>Loading article...</p>
        </div>
      </div>
    );
  }

  if (error || !update) {
    return (
      <div className="update-detail-container">
        <div className="update-detail-error">
          <p>{error || 'Article not found'}</p>
          <button onClick={handleBack} className="back-btn">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="update-detail-page">
      <header className="detail-header">
        <button onClick={handleBack} className="back-btn">
          ← Back
        </button>
        <h1>Article</h1>
        <div className="placeholder" />
      </header>

      <main className="detail-main">
        <article className="update-detail-container">
          {/* Featured Image */}
          <div className="detail-image-wrapper">
            <img
              src={update.image}
              alt={update.title}
              className="detail-image"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3C/svg%3E';
              }}
            />
          </div>

          {/* Article Metadata */}
          <div className="detail-meta">
            <span className="detail-date">{formatDate(update.createdAt)}</span>
            {update.tags && update.tags.length > 0 && (
              <div className="detail-tags">
                {update.tags.map((tag, idx) => (
                  <span key={idx} className="detail-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <h1 className="detail-title">{update.title}</h1>

          {/* Main Content */}
          <div className="detail-content">
            {update.mainContent.split('\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>

          {/* Social Media Links */}
          {update.socialMediaLinks && Object.keys(update.socialMediaLinks).length > 0 && (
            <div className="detail-social">
              <h3>See on Social Medias</h3>
              <div className="social-links">
                {Object.entries(update.socialMediaLinks).map(([platform, url]) => (
                  url && (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="social-link"
                      title={platform}
                    >
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </a>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Back Button */}
          <div className="detail-footer">
            <button onClick={handleBack} className="back-btn-footer">
              ← Back to Updates
            </button>
          </div>
        </article>
      </main>
    </div>
  );
}
