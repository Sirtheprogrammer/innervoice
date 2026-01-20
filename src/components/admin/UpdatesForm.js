import React, { useState } from 'react';
import { uploadImageToImgbb, createUpdate } from '../../services/updatesService';
import '../../styles/AdminUpdates.css';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const SOCIAL_MEDIA_PLATFORMS = ['facebook', 'twitter', 'instagram', 'linkedin', 'tiktok'];

export default function UpdatesForm({ onSuccess }) {
  const [title, setTitle] = useState('');
  const [mainContent, setMainContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [tags, setTags] = useState('');
  const [socialMediaLinks, setSocialMediaLinks] = useState({});
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

  const handleTagsChange = (e) => {
    setTags(e.target.value);
  };

  const handleSocialMediaChange = (platform, value) => {
    setSocialMediaLinks({
      ...socialMediaLinks,
      [platform]: value.trim(),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUploadProgress(0);

    // Validation
    if (!title.trim()) {
      setError('Please enter an update title');
      return;
    }

    if (title.trim().length > 150) {
      setError('Title must be 150 characters or less');
      return;
    }

    if (!mainContent.trim()) {
      setError('Please enter main content');
      return;
    }

    if (mainContent.trim().length > 2000) {
      setError('Main content must be 2000 characters or less');
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

      // Parse tags
      const tagArray = tags
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);

      // Filter out empty social media links
      const filteredLinks = Object.fromEntries(
        Object.entries(socialMediaLinks).filter(([_, value]) => value.length > 0)
      );

      // Create update in Firestore
      await createUpdate({
        title: title.trim(),
        mainContent: mainContent.trim(),
        image: imageUrl,
        tags: tagArray,
        socialMediaLinks: filteredLinks,
      });

      setUploadProgress(100);
      setSuccess('Update published successfully!');
      setTitle('');
      setMainContent('');
      setImage(null);
      setImagePreview('');
      setTags('');
      setSocialMediaLinks({});

      // Callback to refresh updates list
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500);
      }

      // Clear success message after 4 seconds
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      const errorMsg = err.message || 'Failed to publish update';
      setError(errorMsg);
      console.error('Update creation error:', err);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <form className="updates-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="title">Update Title * (Max 150 characters)</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter update title"
          disabled={loading}
          maxLength={150}
        />
        <small>
          {title.length}/150 {title.length === 150 && '(max reached)'}
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="image">Featured Image * (JPG, PNG, GIF, WebP - Max 5MB)</label>
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

      <div className="form-group">
        <label htmlFor="mainContent">Main Content * (Max 2000 characters)</label>
        <textarea
          id="mainContent"
          value={mainContent}
          onChange={(e) => setMainContent(e.target.value)}
          placeholder="Enter the main content of your update"
          disabled={loading}
          maxLength={2000}
          rows={8}
        />
        <small>
          {mainContent.length}/2000 {mainContent.length === 2000 && '(max reached)'}
        </small>
      </div>

      <div className="form-group">
        <label htmlFor="tags">Tags (Optional - comma separated)</label>
        <input
          id="tags"
          type="text"
          value={tags}
          onChange={handleTagsChange}
          placeholder="e.g. news, important, announcement"
          disabled={loading}
        />
        <small>Separate multiple tags with commas</small>
      </div>

      <fieldset className="form-fieldset">
        <legend>Social Media Links (Optional)</legend>
        <div className="social-media-grid">
          {SOCIAL_MEDIA_PLATFORMS.map((platform) => (
            <div key={platform} className="form-group">
              <label htmlFor={`social-${platform}`}>
                {platform.charAt(0).toUpperCase() + platform.slice(1)} Link
              </label>
              <input
                id={`social-${platform}`}
                type="url"
                value={socialMediaLinks[platform] || ''}
                onChange={(e) => handleSocialMediaChange(platform, e.target.value)}
                placeholder={`https://${platform}.com/...`}
                disabled={loading}
              />
            </div>
          ))}
        </div>
      </fieldset>

      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
          <span className="progress-text">{uploadProgress}%</span>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <button
        type="submit"
        disabled={loading || !image || !title.trim() || !mainContent.trim()}
        className="submit-btn"
      >
        {loading ? `Publishing... ${uploadProgress > 0 ? `(${uploadProgress}%)` : ''}` : 'Publish Update'}
      </button>
    </form>
  );
}
