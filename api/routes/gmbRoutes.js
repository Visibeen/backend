/**
 * GMB Routes
 * @description Routes for Google My Business operations
 * @author Senior Backend Developer
 */

const express = require('express');
const router = express.Router();
const gmbController = require('../controllers/gmbController');

/**
 * Upload single photo to GMB
 * POST /api/v1/gmb/upload-photo
 * 
 * Body (multipart/form-data):
 * - photo: File (required) - Image file to upload
 * - accountId: String (required) - GMB account ID
 * - locationId: String (required) - GMB location ID
 * - category: String (optional) - Photo category (PROFILE, COVER, ADDITIONAL, etc.)
 * 
 * Headers:
 * - Authorization: Bearer {access_token}
 */
router.post('/upload-photo', gmbController.uploadPhoto);

/**
 * Upload multiple photos to GMB
 * POST /api/v1/gmb/upload-photos
 * 
 * Body (multipart/form-data):
 * - photos: File[] (required) - Array of image files to upload
 * - accountId: String (required) - GMB account ID
 * - locationId: String (required) - GMB location ID
 * - category: String (optional) - Photo category for all photos
 * 
 * Headers:
 * - Authorization: Bearer {access_token}
 */
router.post('/upload-photos', gmbController.uploadMultiplePhotos);

/**
 * Create GMB Local Post (appears in feed)
 * POST /api/v1/gmb/create-local-post
 * 
 * Body (multipart/form-data):
 * - photo: File (optional) - Image file to attach to post
 * - accountId: String (required) - GMB account ID
 * - locationId: String (required) - GMB location ID
 * - summary: String (required) - Post content/description
 * - topicType: String (optional) - Post type (STANDARD, EVENT, OFFER, PRODUCT)
 * - actionType: String (optional) - Call to action type (LEARN_MORE, CALL, BOOK, ORDER, SHOP, SIGN_UP)
 * - actionUrl: String (optional) - URL for call to action
 * 
 * Headers:
 * - Authorization: Bearer {access_token}
 */
router.post('/create-local-post', gmbController.createLocalPost);

/**
 * Upload video to GMB
 * POST /api/v1/gmb/upload-video
 * 
 * Body (multipart/form-data):
 * - video: File (required) - Video file to upload
 * - accountId: String (required) - GMB account ID
 * - locationId: String (required) - GMB location ID
 * - category: String (optional) - Video category (default: ADDITIONAL)
 * 
 * Headers:
 * - Authorization: Bearer {access_token}
 * 
 * Supported formats: MP4, MPEG, MOV, AVI, WMV
 * Max size: 100MB
 */
router.post('/upload-video', gmbController.uploadVideo);

/**
 * Delete media from GMB
 * DELETE /api/v1/gmb/delete-media
 * 
 * Body (JSON):
 * - accountId: String (required) - GMB account ID
 * - locationId: String (required) - GMB location ID
 * - mediaName: String (required) - Full media name (e.g., accounts/.../locations/.../media/...)
 * 
 * Headers:
 * - Authorization: Bearer {access_token}
 */
router.delete('/delete-media', gmbController.deleteMedia);

module.exports = router;
