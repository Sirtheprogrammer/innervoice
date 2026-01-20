import React, { useState } from 'react';
import { uploadImageToImgbb, createAnnouncement } from '../../services/announcementService';
import '../../styles/AdminAnnouncements.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function AnnouncementForm({ onSuccess }) {
  const [title, setTitle] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setError('');
    setUploadProgress(0);

    if (!file) {
      setImage(null);
      setImagePreview('');
      return;
    }

    // Validate file type
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setError(`Invalid image type. Allowed: ${ALLOWED_IMAGE_TYPES.map((t) => t.split('/')[1]).join(', ')}`);
      setImage(null);
      setImagePreview('');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError(`Image is too large. Maximum size: 5MB (current: ${(file.size / 1024 / 1024).toFixed(2)}MB)`);
      setImage(null);
      setImagePreview('');
      return;
    }

    setImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
      setImage(null);
      setImagePreview('');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUploadProgress(0);

    // Validation
    if (!title.trim()) {
      setError('Please enter an announcement title');
      return;
    }

    if (title.trim().length > 100) {
      setError('Title must be 100 characters or less');
      return;
    }

    if (!image) {
      setError('Please select an image');
      return;
    }

    setLoading(true);

    try {
      setUploadProgress(30);

      // Upload image to imgbb
      const imageUrl = await uploadImageToImgbb(image);
      setUploadProgress(70);

      // Create announcement in Firestore
      await createAnnouncement({
        title: title.trim(),
        image: imageUrl,
      });

      setUploadProgress(100);
      setSuccess('Announcement created successfully!');
      setTitle('');
      setImage(null);
      setImagePreview('');

      // Callback to refresh announcements list
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500);
      }

      // Clear success message after 4 seconds
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const errorMsg = err.message || 'Failed to create announcement';
      setError(errorMsg);
      console.error('Announcement creation error:', err);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <form className="announcement-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="title">Announcement Title *</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter announcement title"
          disabled={loading}
          maxLength={100}
        />
        <small>
          {title.length}/100 {title.length === 100 && '(max reached)'}
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="image">Upload Image * (JPG, PNG, GIF, WebP - Max 5MB)</label>
        <div className="image-upload">
          <input
            id="image"
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(',')}
            onChange={handleImageChange}
            disabled={loading}
          />
          {imagePreview && (
            <div className="image-preview">
              <img src={imagePreview} alt="Preview" />
              <small className="file-info">{image && `${(image.size / 1024).toFixed(2)} KB`}</small>
            </div>
          )}
        </div>
      </div>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
          <span className="progress-text">{uploadProgress}%</span>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <button type="submit" disabled={loading || !image || !title.trim()} className="submit-btn">
        {loading ? `Creating... ${uploadProgress > 0 ? `(${uploadProgress}%)` : ''}` : 'Create Announcement'}
      </button>
    </form>
  );
}
