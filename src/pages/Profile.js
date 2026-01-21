import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth, db } from '../firebase/config';
import {
  updateProfile as fbUpdateProfile,
  updatePassword as fbUpdatePassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import '../styles/AdminLogin.css';

export default function Profile() {
  const { user } = useAuth();
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

  const toggleSidebar = () => setSidebarOpen(open => !open);
  const closeSidebar = () => setSidebarOpen(false);

  useEffect(() => {
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setPreview(user.photoURL || null);
    }
  }, [user]);

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


  return (
    <>
      <Header toggleSidebar={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} />
      <div
        className={`mobile-overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden={!sidebarOpen}
      />
      <div className="admin-login-container">
        <div className="login-box">
        <div className="login-header">
          <h1>Profile</h1>
          <p>View and edit your profile</p>
        </div>

        <form onSubmit={handleSaveProfile} className="login-form">
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
            {preview && <img src={preview} alt="preview" style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover', marginBottom: 8 }} />}
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

          <button type="submit" className="login-btn" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </form>
      </div>
    </div>
    </>
  );
}
