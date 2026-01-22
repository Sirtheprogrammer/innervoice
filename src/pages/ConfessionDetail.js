import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MdComment } from 'react-icons/md';
import { MdThumbUp, MdShare } from 'react-icons/md';
import { FaWhatsapp, FaTelegramPlane, FaFacebook, FaTwitter } from 'react-icons/fa';
import { MdEmail } from 'react-icons/md';
import { FiCopy, FiMessageSquare } from 'react-icons/fi';
import { likeConfession } from '../services/confessionsService';
import { useAuth } from '../context/AuthContext';
import { getConfessionById } from '../services/confessionsService';
import {
  getCommentsByConfessionId,
  getRepliesByCommentId,
  createComment,
} from '../services/commentsService';
import '../styles/ConfessionDetail.css';

export default function ConfessionDetail() {
  const { confessionId } = useParams();
  const navigate = useNavigate();
  const [confession, setConfession] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const [expandedReplies, setExpandedReplies] = useState({});
  const [replies, setReplies] = useState({});
  const [isLiking, setIsLiking] = useState(false);
  const [liked, setLiked] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const { user, isBanned } = useAuth();
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    fetchConfessionAndComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confessionId]);

  useEffect(() => {
    // initialize like state from localStorage to prevent double-like in UI
    try {
      const key = user ? `liked_confessions_${user.uid}` : 'liked_confessions';
      const stored = JSON.parse(localStorage.getItem(key) || '[]');
      setLiked(stored.includes(confessionId));
    } catch {
      setLiked(false);
    }
  }, [confessionId, user]);

  const fetchConfessionAndComments = async () => {
    setLoading(true);
    setError('');
    try {
      const confData = await getConfessionById(confessionId);
      setConfession(confData);

      const commentsData = await getCommentsByConfessionId(confessionId);
      const topLevelComments = commentsData.filter((c) => !c.parentCommentId);
      setComments(topLevelComments);

      // Fetch replies for all top-level comments
      const allReplies = {};
      for (const comment of topLevelComments) {
        const repliesData = await getRepliesByCommentId(comment.id);
        if (repliesData.length > 0) {
          allReplies[comment.id] = repliesData;
        }
      }
      setReplies(allReplies);
    } catch (err) {
      console.error('Error fetching confession:', err);
      setError(err.message || 'Failed to load confession');
    } finally {
      setLoading(false);
    }
  };

  const fetchReplies = async (commentId) => {
    try {
      const repliesData = await getRepliesByCommentId(commentId);
      setReplies((prev) => ({
        ...prev,
        [commentId]: repliesData,
      }));
    } catch (err) {
      console.error('Error fetching replies:', err);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    setCommentError('');
    setCommentSuccess('');

    if (!commentContent.trim()) {
      setCommentError('Please write a comment');
      return;
    }

    if (commentContent.length > 2000) {
      setCommentError('Comment cannot exceed 2000 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await createComment(confessionId, commentContent);
      setCommentContent('');
      setCommentSuccess('Comment posted!');
      await fetchConfessionAndComments();
      setTimeout(() => setCommentSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating comment:', err);
      setCommentError(err.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddReply = async (e, parentCommentId) => {
    e.preventDefault();
    setCommentError('');

    if (!replyContent.trim()) {
      setCommentError('Please write a reply');
      return;
    }

    if (replyContent.length > 2000) {
      setCommentError('Reply cannot exceed 2000 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await createComment(confessionId, replyContent, parentCommentId);
      setReplyContent('');
      setReplyingTo(null);
      setCommentSuccess('Reply posted!');
      await fetchReplies(parentCommentId);
      setTimeout(() => setCommentSuccess(''), 3000);
    } catch (err) {
      console.error('Error creating reply:', err);
      setCommentError(err.message || 'Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };
  const toggleReplies = (commentId) => {
    if (expandedReplies[commentId]) {
      setExpandedReplies((prev) => ({
        ...prev,
        [commentId]: false,
      }));
    } else {
      setExpandedReplies((prev) => ({
        ...prev,
        [commentId]: true,
      }));
      // Replies should already be loaded from initial fetch
      // But fetch them on demand if they're not available
      if (!replies[commentId]) {
        fetchReplies(commentId);
      }
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

  if (loading) {
    return (
      <div className="confession-detail-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!confession) {
    return (
      <div className="confession-detail-container">
        <div className="error-message">Confession not found</div>
        <button onClick={() => navigate('/')} className="back-btn">
          ← Back to Confessions
        </button>
      </div>
    );
  }

  return (
    <div className="confession-detail-container">
      <button onClick={() => navigate('/')} className="back-btn">
        ← Back to Confessions
      </button>

      {error && <div className="error-message">{error}</div>}

      <div className="confession-detail">
        <div className="confession-detail-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div>
              {confession.title && <h2 className="confession-detail-title">{confession.title}</h2>}
              <span className="timestamp">{formatDate(confession.createdAt)}</span>
            </div>

            <div style={{ marginLeft: '12px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                className="action-btn like-btn"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (isLiking) return;
                  if (!user) {
                    // require login to like
                    window.location.href = '/login';
                    return;
                  }
                  try {
                    if (liked) return;
                    setIsLiking(true);
                    await likeConfession(confessionId);
                    // update local state
                    setConfession((prev) => ({ ...prev, likeCount: (prev.likeCount || 0) + 1 }));
                    const key = `liked_confessions_${user.uid}`;
                    const stored = JSON.parse(localStorage.getItem(key) || '[]');
                    stored.push(confessionId);
                    localStorage.setItem(key, JSON.stringify(stored));
                    setLiked(true);
                  } catch (err) {
                    console.error('Like failed', err);
                  } finally {
                    setIsLiking(false);
                  }
                }}
                title={liked ? 'You liked this' : 'Like'}
              >
                <MdThumbUp /> {confession.likeCount || 0}
              </button>

              <button
                className="action-btn share-btn"
                onClick={async (e) => {
                  e.stopPropagation();
                  const url = `${window.location.origin}/confession/${confessionId}`;
                  const shareText = (confession.title ? `${confession.title} - ` : '') + (confession.content ? (confession.content.substring(0, 200) + (confession.content.length > 200 ? '...' : '')) : '');
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: confession.title || 'Confession', text: shareText, url });
                    } else {
                      // open modal with multiple platform options
                      setShareModalOpen(true);
                    }
                  } catch (err) {
                    console.error('Share failed', err);
                    setShareMessage('Unable to share');
                    setTimeout(() => setShareMessage(''), 2500);
                  }
                }}
                title="Share"
              >
                <MdShare />
              </button>
              {shareMessage && <div className="share-tooltip">{shareMessage}</div>}
              {shareModalOpen && (
                <div className="share-modal" onClick={(e) => { e.stopPropagation(); }}>
                  <div className="share-modal-inner">
                    <div className="share-modal-header">
                      <strong>Share confession</strong>
                      <button className="share-modal-close" onClick={() => setShareModalOpen(false)}>✕</button>
                    </div>
                    <div className="share-options">
                      <button className="share-option" onClick={async (ev) => { ev.stopPropagation(); const link = `${window.location.origin}/confession/${confessionId}`; try { await navigator.clipboard.writeText(link); setShareMessage('Link copied to clipboard'); setTimeout(() => setShareMessage(''), 2500); } catch { setShareMessage('Copy failed'); setTimeout(() => setShareMessage(''), 2500); } setShareModalOpen(false); }}><FiCopy /> Copy link</button>
                      <button className="share-option" onClick={(ev) => { ev.stopPropagation(); const text = encodeURIComponent(`${confession.title ? confession.title + ' - ' : ''}${confession.content || ''}`); const wa = `https://api.whatsapp.com/send?text=${text}%20${encodeURIComponent(window.location.origin + '/confession/' + confessionId)}`; window.open(wa, '_blank'); setShareModalOpen(false); }}><FaWhatsapp /> WhatsApp</button>
                      <button className="share-option" onClick={(ev) => { ev.stopPropagation(); const url = encodeURIComponent(window.location.origin + '/confession/' + confessionId); const text = encodeURIComponent(confession.title ? confession.title + '\n' + (confession.content || '') : (confession.content || '')); const tg = `https://t.me/share/url?url=${url}&text=${text}`; window.open(tg, '_blank'); setShareModalOpen(false); }}><FaTelegramPlane /> Telegram</button>
                      <button className="share-option" onClick={(ev) => { ev.stopPropagation(); const fb = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + '/confession/' + confessionId)}`; window.open(fb, '_blank'); setShareModalOpen(false); }}><FaFacebook /> Facebook</button>
                      <button className="share-option" onClick={(ev) => { ev.stopPropagation(); const tw = `https://twitter.com/intent/tweet?text=${encodeURIComponent((confession.title ? confession.title + ' - ' : '') + window.location.origin + '/confession/' + confessionId)}`; window.open(tw, '_blank'); setShareModalOpen(false); }}><FaTwitter /> Twitter</button>
                      <button className="share-option" onClick={(ev) => { ev.stopPropagation(); const mailto = `mailto:?subject=${encodeURIComponent(confession.title || 'Confession')}&body=${encodeURIComponent((confession.title ? confession.title + '\n\n' : '') + (confession.content || '') + '\n\n' + window.location.origin + '/confession/' + confessionId)}`; window.location.href = mailto; setShareModalOpen(false); }}><MdEmail /> Email</button>
                      <button className="share-option" onClick={(ev) => { ev.stopPropagation(); const sms = `sms:?body=${encodeURIComponent((confession.title ? confession.title + ' - ' : '') + window.location.origin + '/confession/' + confessionId)}`; window.location.href = sms; setShareModalOpen(false); }}><FiMessageSquare /> SMS</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="confession-detail-content">{confession.content}</p>
        <div className="confession-detail-footer">
          <span className="comment-count">
            <MdComment /> {confession.commentCount || 0} comments
          </span>
        </div>
      </div>

      <div className="comment-form-section">
        <h3>Add Your Comment</h3>
        {commentError && <div className="form-error">{commentError}</div>}
        {commentSuccess && <div className="form-success">{commentSuccess}</div>}
        {isBanned && <div className="form-error" style={{ marginBottom: '1rem' }}>You are banned from commenting.</div>}
        <form onSubmit={handleAddComment} className="comment-form">
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder={isBanned ? "You are banned from commenting" : "Write your comment here (max 2000 characters)..."}
            maxLength="2000"
            rows="3"
            disabled={isSubmitting || isBanned}
          />
          <div className="form-footer">
            <span className="char-count">
              {commentContent.length} / 2000
            </span>
            <button
              type="submit"
              className="submit-btn"
              disabled={isSubmitting || isBanned}
              onClick={(e) => {
                if (!user) {
                  e.preventDefault();
                  navigate('/login');
                }
              }}
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      </div>

      <div className="comments-section">
        <h3>Comments ({comments.length})</h3>
        {comments.length === 0 ? (
          <div className="empty-state">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment.id} className="comment-thread">
                <div className="comment">
                  <img
                    className="avatar"
                    src={`https://avatars.dicebear.com/api/identicon/${comment.id}.svg`}
                    alt="avatar"
                  />
                  <div className="comment-body">
                    <div className="comment-top">
                      <span className="comment-author">Anonymous</span>
                      <span className="timestamp">
                        {formatDate(comment.createdAt)}
                      </span>
                    </div>
                    <div className="comment-text">{comment.content}</div>
                    <div className="comment-actions">
                      {replyingTo === comment.id ? (
                        <button
                          onClick={() => {
                            setReplyingTo(null);
                            setReplyContent('');
                          }}
                          className="action-btn active"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (!user) {
                              navigate('/login');
                              return;
                            }
                            if (isBanned) {
                              alert('You are banned from commenting.');
                              return;
                            }
                            setReplyingTo(comment.id);
                          }}
                          className="action-btn"
                        >
                          Reply
                        </button>
                      )}
                      {(replies[comment.id]?.length || 0) > 0 && (
                        <button
                          onClick={() => toggleReplies(comment.id)}
                          className="action-btn"
                        >
                          {expandedReplies[comment.id]
                            ? `Hide ${replies[comment.id].length} replies`
                            : `View ${replies[comment.id].length} replies`}
                        </button>
                      )}
                    </div>

                    {replyingTo === comment.id && (
                      <form
                        onSubmit={(e) => handleAddReply(e, comment.id)}
                        className="reply-form"
                      >
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write your reply..."
                          maxLength="2000"
                          rows="2"
                          disabled={isSubmitting}
                        />
                        <div className="form-footer">
                          <span className="char-count">
                            {replyContent.length} / 2000
                          </span>
                          <button
                            type="submit"
                            className="submit-btn"
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? 'Posting...' : 'Reply'}
                          </button>
                        </div>
                      </form>
                    )}

                    {expandedReplies[comment.id] &&
                      replies[comment.id] &&
                      replies[comment.id].length > 0 && (
                        <div className="replies-section">
                          {replies[comment.id].map((reply) => (
                            <div key={reply.id} className="reply">
                              <img
                                className="reply-avatar"
                                src={`https://avatars.dicebear.com/api/identicon/${reply.id}.svg`}
                                alt="avatar"
                              />
                              <div className="reply-inner">
                                <div className="reply-body">
                                  <span className="reply-author">
                                    Anonymous
                                  </span>
                                  <span className="reply-timestamp">
                                    {formatDate(reply.createdAt)}
                                  </span>
                                </div>
                                <span className="reply-text">
                                  {reply.content}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
