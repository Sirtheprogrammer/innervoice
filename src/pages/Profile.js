import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase/config';
import {
  updateProfile as fbUpdateProfile,
  updatePassword as fbUpdatePassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { useNavigate, useLocation } from 'react-router-dom';
import { MdComment, MdEdit, MdDelete, MdClose, MdCheck, MdContentCopy } from 'react-icons/md';
import { getConfessionsByUser, deleteConfession, updateConfession } from '../services/confessionsService';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/AdminLogin.css';
import '../styles/Confessions.css'; // Reusing confession card styles

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // New state for confessions tab
  const [activeTab, setActiveTab] = useState('settings'); // 'settings' or 'confessions'
  const [userConfessions, setUserConfessions] = useState([]);
  const [confessionsLoading, setConfessionsLoading] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  // Profile edit modal state
  const [showEditModal, setShowEditModal] = useState(false);

  const toggleSidebar = () => setSidebarOpen(open => !open);
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setPreview(user.photoURL || null);
    }
  }, [user]);



  // Handle tab switching from navigation state
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state so it doesn't persist on refresh if desired, 
      // but for now simpler is fine or we can replace history.
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    if (user && activeTab === 'confessions') {
      fetchUserConfessions();
    }
  }, [user, activeTab]);

  const handleDeleteConfession = async (e, confessionId) => {
    e.stopPropagation(); // prevent navigation
    if (window.confirm('Are you sure you want to delete this confession? This action cannot be undone.')) {
      try {
        await deleteConfession(confessionId);
        // Remove from local state
        setUserConfessions(prev => prev.filter(c => c.id !== confessionId));
      } catch (error) {
        console.error('Error deleting confession:', error);
        alert('Failed to delete confession');
      }
    }
  };

  const handleStartEdit = (e, confession) => {
    e.stopPropagation();
    setEditingId(confession.id);
    setEditTitle(confession.title || '');
    setEditContent(confession.content || '');
  };

  const handleCancelEdit = (e) => {
    if (e) e.stopPropagation();
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleSaveEdit = async (e) => {
    if (e) e.stopPropagation(); // although form submission propagates differently

    if (!editContent.trim()) {
      alert('Content cannot be empty');
      return;
    }

    try {
      await updateConfession(editingId, editContent, editTitle || null);

      // Update local state
      setUserConfessions(prev => prev.map(c => {
        if (c.id === editingId) {
          return { ...c, title: editTitle, content: editContent, updatedAt: new Date() };
        }
        return c;
      }));

      setEditingId(null);
    } catch (error) {
      console.error('Error updating confession:', error);
      alert('Failed to update confession');
    }
  };

  const fetchUserConfessions = async () => {
    if (!user) return;
    setConfessionsLoading(true);
    try {
      const data = await getConfessionsByUser(user.uid);
      setUserConfessions(data);
    } catch (error) {
      console.error('Error fetching user confessions:', error);
    } finally {
      setConfessionsLoading(false);
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
      });
    } catch {
      return 'Invalid date';
    }
  };

  const handleViewConfession = (confessionId) => {
    navigate(`/confession/${confessionId}`);
  };

  const truncateText = (text, maxLength = 150) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setAvatarFile(f);
      setPreview(URL.createObjectURL(f));
    }
  };

  const uploadToImgbb = async (file) => {
    const key = process.env.REACT_APP_IMGBB_KEY || "b0cb512fd91d77dad4ae9f6f474507ad";
    if (!key) throw new Error('Missing REACT_APP_IMGBB_KEY environment variable');

    // convert to base64
    const toBase64 = (f) => new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.onerror = rej;
      reader.readAsDataURL(f);
    });

    const dataUrl = await toBase64(file);
    const base64 = dataUrl.split(',')[1];

    const form = new FormData();
    form.append('image', base64);

    const resp = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
      method: 'POST',
      body: form,
    });
    const json = await resp.json();
    if (!json || !json.data || !json.data.url) throw new Error('Image upload failed');
    return json.data.url;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setStatus('');
    if (!currentPassword) {
      setStatus('Please enter your current password to confirm changes');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setStatus('New passwords do not match');
      return;
    }

    setLoading(true);
    try {
      // Reauthenticate
      await signInWithEmailAndPassword(auth, email, currentPassword);

      let photoURL = user.photoURL || null;
      if (avatarFile) {
        setStatus('Uploading avatar...');
        photoURL = await uploadToImgbb(avatarFile);
      }

      if (displayName !== user.displayName || photoURL !== user.photoURL) {
        await fbUpdateProfile(auth.currentUser, { displayName, photoURL });
        // update Firestore users doc as well
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, {
          displayName: displayName || null,
          photoURL: photoURL || null,
        });
      }

      if (newPassword) {
        await fbUpdatePassword(auth.currentUser, newPassword);
        setNewPassword('');
        setConfirmPassword('');
      }

      setCurrentPassword('');
      setStatus('Profile updated successfully');
    } catch (err) {
      console.error(err);
      setStatus(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };


  /* Existing code ... */
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-main)' }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '18px' }}>Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    /* This typically shouldn't happen if the route is protected, but safe guard it */
    // You might want to useEffect to navigate here, but for now just return null
    return null;
  }

  return (
    <>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} />
      <div
        className={`mobile-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />
      <div className="admin-login-container profile-container" style={{ maxWidth: '800px' }}>
        <div className="login-box" style={{ maxWidth: '100%' }}>
          <div className="login-header">
            <h1>Profile</h1>
            <p>Manage your account and view your activity</p>
          </div>

          <div className="profile-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--gray-medium)', marginBottom: '20px' }}>
            <button
              onClick={() => setActiveTab('settings')}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'settings' ? '2px solid var(--primary)' : 'none',
                color: activeTab === 'settings' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'settings' ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              Profile Settings
            </button>
            <button
              onClick={() => setActiveTab('confessions')}
              style={{
                flex: 1,
                padding: '12px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === 'confessions' ? '2px solid var(--primary)' : 'none',
                color: activeTab === 'confessions' ? 'var(--primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === 'confessions' ? '600' : '400',
                cursor: 'pointer'
              }}
            >
              My Confessions
            </button>
          </div>

          {activeTab === 'settings' ? (
            <div className="profile-info-section" style={{ textAlign: 'center', padding: '30px 20px' }}>
              {/* Profile Picture */}
              <div style={{ marginBottom: '20px' }}>
                {preview ? (
                  <img
                    src={preview}
                    alt="Profile"
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '4px solid var(--primary)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    fontSize: '48px',
                    color: 'white',
                    fontWeight: 'bold'
                  }}>
                    {(displayName || email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* User Name */}
              <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>
                {displayName || 'No name set'}
              </h2>

              {/* Email */}
              <p style={{ margin: '0 0 24px 0', fontSize: '16px', color: 'var(--text-secondary)' }}>
                {email}
              </p>


              {/* Edit Profile Button */}
              <button
                onClick={() => setShowEditModal(true)}
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <MdEdit /> Edit Your Profile
              </button>

              {/* Referral Section */}
              <div style={{ marginTop: '40px', padding: '24px', background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>Referral Dashboard</h3>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary)', marginBottom: '4px' }}>{user?.xp || 0}XP</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total XP</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981', marginBottom: '4px' }}>{(user?.balance || 0).toLocaleString()} TZS</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Balance</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#8b5cf6', marginBottom: '4px' }}>{user?.referralCount || 0}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Referrals</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Share your referral link</label>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, marginBottom: '8px' }}>
                    Earn 100 XP (100 TZS) for every user you invite!
                  </p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      readOnly
                      value={window.location.origin + '/register?ref=' + (user?.referralCode || '...')}
                      style={{
                        flex: 1,
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace'
                      }}
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin + '/register?ref=' + (user?.referralCode || ''));
                        // Visual feedback could be added here
                        alert('Referral link copied!');
                      }}
                      style={{
                        background: 'var(--text-primary)',
                        color: 'var(--bg-main)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: '600'
                      }}
                    >
                      <MdContentCopy /> Copy
                    </button>
                  </div>
                </div>
              </div>

              {status && <div className="error-message" style={{ background: '#f3f3f3', color: '#111', marginTop: '20px' }}>{status}</div>}
            </div>
          ) : (
            <div className="user-confessions-list">
              {confessionsLoading ? (
                <div style={{ padding: '20px', textAlign: 'center' }}>Loading your confessions...</div>
              ) : userConfessions.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <p>You haven't posted any confessions yet.</p>
                  <button
                    onClick={() => navigate('/')}
                    style={{
                      marginTop: '10px',
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Post your first confession
                  </button>
                </div>
              ) : (
                <div className="confessions-grid" style={{ display: 'grid', gap: '15px' }}>
                  {userConfessions.map((confession) => (
                    <div
                      key={confession.id}
                      className="confession-card"
                      onClick={() => editingId !== confession.id && handleViewConfession(confession.id)}
                      style={{
                        cursor: editingId === confession.id ? 'default' : 'pointer',
                        border: '1px solid var(--border-color)',
                        margin: 0,
                        position: 'relative'
                      }}
                    >
                      {editingId === confession.id ? (
                        <div className="edit-confession-form" onClick={(e) => e.stopPropagation()}>
                          <div style={{ marginBottom: '10px' }}>
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="Title (optional)"
                              style={{ width: '100%', padding: '8px', marginBottom: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
                            />
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              placeholder="Confession content"
                              rows={4}
                              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd', resize: 'vertical' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={handleSaveEdit}
                              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <MdCheck /> Save
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              <MdClose /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="confession-header">
                            <span className="timestamp">
                              {formatDate(confession.createdAt)}
                            </span>
                            <div className="card-actions" style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={(e) => handleStartEdit(e, confession)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 4 }}
                                title="Edit"
                              >
                                <MdEdit size={18} />
                              </button>
                              <button
                                onClick={(e) => handleDeleteConfession(e, confession.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                                title="Delete"
                              >
                                <MdDelete size={18} />
                              </button>
                            </div>
                          </div>
                          {confession.title ? <h3 className="confession-title">{confession.title}</h3> : null}
                          <p className="confession-content">
                            {truncateText(confession.content, 150)}
                          </p>
                          <div className="confession-footer">
                            <div className="confession-stats">
                              <span className="comment-count">
                                <MdComment /> {confession.commentCount || 0} comments
                              </span>
                            </div>
                            <span className="read-more" style={{ fontSize: '12px' }}>View Details →</span>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div
          className="profile-edit-modal-overlay"
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
            padding: '20px'
          }}
          onClick={() => setShowEditModal(false)}
        >
          <div
            className="profile-edit-modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              position: 'relative'
            }}
          >
            <button
              onClick={() => setShowEditModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <MdClose />
            </button>

            <h2 style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-primary)' }}>Edit Your Profile</h2>

            <form onSubmit={(e) => { handleSaveProfile(e); setShowEditModal(false); }} className="login-form">
              <div className="form-group">
                <label htmlFor="displayName">Display name</label>
                <input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input value={email} disabled />
              </div>

              <div className="form-group">
                <label>Avatar</label>
                {preview && <img src={preview} alt="preview" style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', marginBottom: 8, display: 'block' }} />}
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </div>

              <div className="form-group">
                <label>Current password</label>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Required to save changes" />
              </div>

              <div className="form-group">
                <label>New password (optional)</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" />
              </div>

              <div className="form-group">
                <label>Confirm new password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
              </div>

              {status && <div className="error-message" style={{ background: '#f3f3f3', color: '#111' }}>{status}</div>}

              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="submit" className="login-btn" disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
