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

module.exports = router;
