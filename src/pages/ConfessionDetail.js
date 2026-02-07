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
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import '../styles/ConfessionDetail.css';
import { useTheme } from '../context/ThemeContext';

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
  const { theme } = useTheme();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  // Stores the pending action ('comment' or 'reply') so we can resume after nickname is set
  const [pendingAction, setPendingAction] = useState(null);

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

  /**
   * Check if user has a nickname (displayName). If not, show prompt.
   * Returns true if nickname exists, false if prompt was shown.
   */
  const ensureNickname = (actionType, actionData = null) => {
    if (!user) return false;
    if (user.displayName && user.displayName.trim()) return true;
    // No nickname — show the prompt and store the pending action
    setPendingAction({ type: actionType, data: actionData });
    setNicknameInput('');
    setNicknameError('');
    setShowNicknameModal(true);
    return false;
  };

  /**
   * Save the nickname to Firebase Auth + Firestore, then resume the pending action.
   */
  const handleNicknameSave = async () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) {
      setNicknameError('Please enter a nickname');
      return;
    }
    if (trimmed.length < 2) {
      setNicknameError('Nickname must be at least 2 characters');
      return;
    }
    if (trimmed.length > 30) {
      setNicknameError('Nickname cannot exceed 30 characters');
      return;
    }

    setNicknameSaving(true);
    setNicknameError('');
    try {
      // Update Firebase Auth displayName
      await updateProfile(auth.currentUser, { displayName: trimmed });
      // Update Firestore user document
      await updateDoc(doc(db, 'users', user.uid), { displayName: trimmed });
      // Update the local user object so subsequent checks pass
      user.displayName = trimmed;

      setShowNicknameModal(false);

      // Resume the pending action
      if (pendingAction) {
        if (pendingAction.type === 'comment') {
          await submitComment(trimmed);
        } else if (pendingAction.type === 'reply') {
          await submitReply(pendingAction.data, trimmed);
        }
        setPendingAction(null);
      }
    } catch (err) {
      console.error('Error saving nickname:', err);
      setNicknameError('Failed to save nickname. Please try again.');
    } finally {
      setNicknameSaving(false);
    }
  };

  /**
   * Actually submit a comment (called after nickname is confirmed).
   */
  const submitComment = async (nickname) => {
    setIsSubmitting(true);
    try {
      await createComment(confessionId, commentContent, null, user?.uid, nickname);
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

  /**
   * Actually submit a reply (called after nickname is confirmed).
   */
  const submitReply = async (parentCommentId, nickname) => {
    setIsSubmitting(true);
    try {
      await createComment(confessionId, replyContent, parentCommentId, user?.uid, nickname);
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

    // Check nickname — if missing, the modal will handle submission after nickname is set
    const nickname = user?.displayName?.trim();
    if (!ensureNickname('comment')) return;

    await submitComment(nickname);
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

    // Check nickname — if missing, the modal will handle submission after nickname is set
    const nickname = user?.displayName?.trim();
    if (!ensureNickname('reply', parentCommentId)) return;

    await submitReply(parentCommentId, nickname);
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
    <div className="confession-detail-container" data-theme={theme || 'light'}>
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
                  // Check if already liked (prevent double like)
                  if (liked) return;
                  if (!user) {
                    window.location.href = '/login';
                    return;
                  }

                  // 1. Optimistically update UI immediately
                  setLiked(true);
                  setConfession((prev) => ({ ...prev, likeCount: (prev.likeCount || 0) + 1 }));

                  const key = `liked_confessions_${user.uid}`;
                  const stored = JSON.parse(localStorage.getItem(key) || '[]');
                  const newStored = [...stored, confessionId];
                  localStorage.setItem(key, JSON.stringify(newStored));

                  try {
                    // 2. Perform API call
                    await likeConfession(confessionId);
                  } catch (err) {
                    console.error('Like failed', err);

                    // 3. Revert state if API fails
                    setLiked(false);
                    setConfession((prev) => ({ ...prev, likeCount: Math.max(0, (prev.likeCount || 0) - 1) }));
                    localStorage.setItem(key, JSON.stringify(stored));
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
                    src={`https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=${encodeURIComponent(comment.nickname || 'anon')}`}
                    alt="avatar"
                  />
                  <div className="comment-body">
                    <div className="comment-top">
                      <span className="comment-author">{comment.nickname || 'Anonymous'}</span>
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
                                src={`https://api.dicebear.com/9.x/lorelei-neutral/svg?seed=${encodeURIComponent(reply.nickname || 'anon')}`}
                                alt="avatar"
                              />
                              <div className="reply-inner">
                                <div className="reply-body">
                                  <span className="reply-author">
                                    {reply.nickname || 'Anonymous'}
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

      {/* Nickname Prompt Modal */}
      {showNicknameModal && (
        <div
          className="nickname-modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => {
            setShowNicknameModal(false);
            setPendingAction(null);
          }}
        >
          <div
            className="nickname-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card, #fff)',
              borderRadius: '16px',
              padding: '28px 24px',
              maxWidth: '420px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Set Your Nickname</h3>
            <p style={{ margin: '0 0 20px 0', color: 'var(--text-secondary, #666)', fontSize: '0.9rem' }}>
              Choose a nickname to display with your comments. This will be visible to other users.
            </p>
            {nicknameError && (
              <div className="form-error" style={{ marginBottom: '12px' }}>{nicknameError}</div>
            )}
            <input
              type="text"
              value={nicknameInput}
              onChange={(e) => setNicknameInput(e.target.value)}
              placeholder="Enter your nickname (2-30 characters)"
              maxLength={30}
              disabled={nicknameSaving}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleNicknameSave();
                }
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '2px solid var(--border-color, #ddd)',
                fontSize: '1rem',
                background: 'var(--bg-input, #f9f9f9)',
                color: 'var(--text-primary, #333)',
                boxSizing: 'border-box',
                outline: 'none',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '18px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowNicknameModal(false);
                  setPendingAction(null);
                }}
                disabled={nicknameSaving}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color, #ddd)',
                  background: 'transparent',
                  color: 'var(--text-primary, #333)',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleNicknameSave}
                disabled={nicknameSaving}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'var(--primary, #4f46e5)',
                  color: 'white',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: nicknameSaving ? 'not-allowed' : 'pointer',
                  opacity: nicknameSaving ? 0.7 : 1,
                }}
              >
                {nicknameSaving ? 'Saving...' : 'Save & Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
