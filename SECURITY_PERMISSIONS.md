# Announcements & Updates Management - Security & Permissions Documentation

## Overview
This document outlines all security measures and permissions implemented for the announcement and updates management system in the CHIEF G MEDIA admin panel.

---

## 1. Firestore Security Rules

### Location
Apply these rules in Firebase Console:
- Go to **Firestore Database** → **Rules**
- Replace the default rules with the content in `firestore.rules`
- Click **Publish**

### Key Rules

#### Announcements Collection
```
- READ: Public access (anyone can read for carousel display)
- CREATE: Only authenticated users
- UPDATE: Only authenticated users
- DELETE: Only authenticated users

Validation:
- Title: Required, string, 1-100 characters
- Image: Required, valid URL string
- Timestamps: createdAt and updatedAt required
- User tracking: createdBy and updatedBy required
```

#### Updates Collection
```
- READ: Public access (anyone can read for updates page)
- CREATE: Only authenticated users
- UPDATE: Only authenticated users
- DELETE: Only authenticated users

Validation:
- Title: Required, string, 1-150 characters
- Main Content: Required, string, 1-2000 characters
- Image: Required, valid, non-empty URL string
- Tags: Optional, must be array type (can be empty)
- Social Media Links: Optional, must be map type (can be empty)
- Timestamps: createdAt, updatedAt required
- User tracking: createdBy required, updatedBy required for updates
```

#### Admins Collection
```
- READ: Only the user's own admin document
- CREATE: Only authenticated users for their own UID
- UPDATE: Only the user can update their own document
- DELETE: Blocked (admin users managed by super-admin)
```

---

## 2. Client-Side Validation

### announcementService.js

#### Authentication Validation
```javascript
validateUserAuthenticated()
- Checks if user is logged in via Firebase Auth
- Throws: "You must be logged in to perform this action"
```

#### Image File Validation
```javascript
validateImageFile(file)
- Maximum size: 5MB
- Allowed types: JPG, PNG, GIF, WebP
- Error messages include file size details
```

#### Announcement Data Validation
```javascript
validateAnnouncementData(announcement)
- Title: Required, 1-100 characters, string type
- Image: Required, valid URL string
```

#### Error Handling
```javascript
handleFirebaseError(error)
- Maps Firebase error codes to user-friendly messages
- Handles permission-denied, unauthenticated, network errors
- Provides actionable error messages
```

#### Upload Retry Logic
```javascript
uploadImageToImgbb(file, retries = 3)
- Retries failed uploads up to 3 times
- Handles rate limiting (429 errors) with exponential backoff
- Validates file before upload
- Returns image URL for storage in Firestore
```

### updatesService.js

#### Updates Data Validation
```javascript
validateUpdateData(update)
- Title: Required, 1-150 characters, string type
- Main Content: Required, 1-2000 characters, string type
- Image: Required, valid URL string
- Tags: Optional, must be array
- Social Media Links: Optional, must be object/map
```

#### Social Media URL Validation
```javascript
Validated Platforms:
- facebook: URL must be valid format
- twitter: URL must be valid format
- instagram: URL must be valid format
- linkedin: URL must be valid format
- tiktok: URL must be valid format
```

#### Tag Handling
```javascript
Tags are parsed from comma-separated string:
1. Split by comma
2. Trim whitespace from each tag
3. Filter out empty tags
4. Store as array in Firestore
```

---

## 3. Component-Level Validation

### AnnouncementForm.js

#### Pre-Submit Validation
- Title is not empty and ≤ 100 characters
- Image file is selected
- Button is disabled until both fields are valid

#### File Selection Validation
- File type checked before preview (prevents invalid files in preview)
- File size validated with user-friendly error message
- Image preview only shown for valid files

#### Feedback
- Real-time character counter (0-100)
- File size display (in KB)
- Upload progress indicator (0-100%)
- Success/error messages with auto-clear (4 seconds)

### AnnouncementsList.js

#### Delete Confirmation
- Shows announcement title in confirmation dialog
- Requires explicit user confirmation before deletion

#### Error Handling
- Separate error states for fetch and delete operations
- Error messages auto-clear after 3 seconds
- Graceful handling of image load failures (placeholder shown)

#### Date Formatting
- Safely handles Firestore timestamps
- Fallback for invalid or missing dates
- User-friendly date/time format

---

## 4. Firestore Permissions Flow

### Create Announcement
```
1. User clicks "Create Announcement" button
2. Frontend validates: auth, title, image file
3. Image uploaded to imgbb (with retries if needed)
4. Firestore create triggered:
   - Server validates: auth, title format, image URL
   - Creates document with:
     * title, image, createdBy (user ID), timestamps
   - Returns document ID on success
5. UI refreshes announcement list
```

### Read Announcements
```
1. AnnouncementsList component loads
2. getAnnouncements() called
3. Firestore query: READ all announcements (public allowed)
4. Ordered by createdAt (newest first)
5. Announcements rendered in grid
```

### Delete Announcement
```
1. User confirms deletion with announcement title shown
2. Frontend validates: auth, valid announcement ID
3. Firestore delete triggered:
   - Server validates: user is authenticated
   - Deletes document if user has permission
4. UI removes announcement from list
5. Success/error feedback to user
```

---

## 5. Security Best Practices

### What is Protected
✅ Anonymous users cannot modify announcements
✅ Only authenticated users can create/edit/delete
✅ File uploads validated for type and size
✅ Image hosting delegated to imgbb (no server-side storage)
✅ Firestore enforces data structure via security rules
✅ User ID tracked (createdBy field) for audit trail

### What is Public
✅ Announcements can be read by anyone (for carousel)
✅ Updates can be read by anyone (for updates section)
✅ Images stored on imgbb CDN (fast access)

### Rate Limiting
✅ imgbb upload retries with exponential backoff
✅ Firebase enforces per-user write limits
✅ No client-side request throttling needed (Firestore handles)

### Error Messages
✅ Never reveal internal system details
✅ User-friendly error messages provided
✅ Console logs for debugging (not visible to users)
✅ Sensitive errors handled gracefully

---

## 6. To Enable Super-Admin Features (Optional)

For a production system with role-based access:

### Step 1: Set Custom Claims in Firebase
```bash
# Use Firebase Admin SDK (Node.js)
admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => console.log('Custom claims set'));
```

### Step 2: Update Firestore Rules
Replace the `isAdmin()` function in FIRESTORE_RULES.txt:
```
function isAdmin() {
  return request.auth.token.admin == true;
}
```

### Step 3: Restrict Operations
Change rules from `isAuthenticated()` to `isAdmin()`:
```
allow create: if isAdmin();
allow update: if isAdmin();
allow delete: if isAdmin();
```

---

## 7. Testing the Security

### Test Case 1: Unauthenticated Access
- Open app without logging in
- Try to access /admin/announcements → Redirected to login ✓

### Test Case 2: Invalid File Upload
- Try uploading file >5MB → Error message shown ✓
- Try uploading non-image file → Error message shown ✓

### Test Case 3: Create Announcement
- Log in as admin
- Fill form with valid data
- Submit → Success message, announcement appears in list ✓

### Test Case 4: Delete Announcement
- Click delete on any announcement
- Confirm in dialog
- Announcement removed from list ✓

### Test Case 5: Network Error Handling
- Turn off WiFi, try creating announcement
- Error message shown, form remains intact ✓
- Re-enable WiFi, try again → Works ✓

### Test Case 6: Update with All Fields
- Log in as admin
- Fill update form with all fields:
  * Title: "Important Update" (< 150 chars)
  * Main Content: Full text (< 2000 chars)
  * Featured Image: Upload valid JPG/PNG
  * Tags: "news, important" (parsed correctly)
  * Social Media: Add Facebook, Twitter, Instagram links
- Submit → Success, update published ✓
- Check UpdatesList → Shows all fields ✓

### Test Case 7: Update with Optional Fields Missing
- Create update with only title, content, image
- Tags and social media empty → Accepted ✓
- Empty arrays/objects stored in Firestore ✓

### Test Case 8: Validation on Update
- Try creating update with:
  * Title > 150 chars → Error ✓
  * Main content > 2000 chars → Error ✓
  * No image → Error ✓
  * Invalid tag format (not parsed) → Error ✓
- Form prevents submission ✓

### Test Case 9: Delete Update
- Click delete on published update
- Confirm dialog shows update title
- Update removed from list ✓
- Unauthenticated cannot delete ✓

### Test Case 10: Public Read Access for Updates
- Close browser, don't log in
- Visit updates page → All updates visible ✓
- No authentication required ✓
- Social media links clickable ✓
- Tags displayed correctly ✓

---

## 8. Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| "You must be logged in..." | User not authenticated | Log in to admin panel |
| "Title is required..." | Empty title field | Enter update title |
| "Title must be 150 characters..." | Title too long | Shorten title (current: X/150) |
| "Main content is required..." | Empty content field | Enter main content text |
| "Main content must be 2000 characters..." | Content too long | Shorten content (current: X/2000) |
| "Image size must be less than 5MB..." | File too large | Choose smaller image |
| "Invalid image type..." | Wrong file format | Use JPG, PNG, GIF, or WebP |
| "Tags must be an array..." | Invalid tag format | Enter comma-separated tags |
| "Social media links must be object..." | Invalid links format | Check URL format |
| "Failed to upload image..." | imgbb API error | Check internet, try again |
| "Permission denied..." | User not authorized | Contact admin |
| "Service temporarily unavailable..." | Firebase down | Try again later |

---

## 9. Summary of Implemented Permissions

### Announcements
✅ Authentication validation (required login)
✅ Title validation (1-100 characters)
✅ Image validation (JPG, PNG, GIF, WebP, max 5MB)
✅ Firestore rules (READ public, WRITE authenticated only)
✅ Error handling with messages
✅ Image upload retry logic
✅ Delete confirmation dialog
✅ Audit trail (createdBy, createdAt, updatedBy, updatedAt)

### Updates
✅ Authentication validation (required login)
✅ Title validation (1-150 characters)
✅ Main content validation (1-2000 characters)
✅ Image validation (JPG, PNG, GIF, WebP, max 5MB)
✅ Tags parsing (comma-separated → array)
✅ Social media links validation (5 platforms)
✅ Optional fields handling (tags, social links can be empty)
✅ Firestore rules (READ public, WRITE authenticated only)
✅ Error handling with specific messages
✅ Image upload retry logic
✅ Delete confirmation dialog
✅ Audit trail (createdBy, createdAt, updatedBy, updatedAt)
✅ Network error resilience
✅ Rate limiting support (Firebase + imgbb)

---

## 10. Deployment Checklist

1. **Deploy Firestore Rules**
   - [ ] Copy rules from `firestore.rules` file
   - [ ] Go to Firebase Console > Firestore > Rules
   - [ ] Paste rules into editor
   - [ ] Click Publish
   - [ ] Wait for deployment (usually 1-2 minutes)

2. **Test Announcements**
   - [ ] Create announcement with valid data → Success
   - [ ] Try creating with invalid title → Error
   - [ ] Delete announcement → Removed
   - [ ] Public user can read → No auth required

3. **Test Updates**
   - [ ] Create update with all fields → Success
   - [ ] Create update with optional fields empty → Success
   - [ ] Try creating with invalid data → Error
   - [ ] Tags parsed correctly → Array format
   - [ ] Social media links stored → Map format
   - [ ] Delete update → Removed
   - [ ] Public user can read → No auth required

4. **Monitor**
   - [ ] Check Firebase logs for errors
   - [ ] Monitor console for validation warnings
   - [ ] Test from different networks
   - [ ] Test on mobile and desktop
5. **Enable Custom Claims** (optional): For role-based access control
