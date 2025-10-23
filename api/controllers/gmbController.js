/**
 * GMB Controller
 * @description Controller for Google My Business operations including photo uploads
 * @author Senior Backend Developer
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const REST = require('../../utils/REST');

/**
 * Upload photo to GMB profile
 * POST /api/v1/gmb/upload-photo
 * 
 * This endpoint handles the actual upload to GMB API v4
 * It receives the photo file, account ID, location ID, and access token
 * and uploads the photo directly to Google My Business
 */
const uploadPhoto = async (req, res) => {
  try {
    console.log('📸 [GMB Upload] Starting photo upload process...');
    console.log('📋 [GMB Upload] Request details:', {
      body: req.body,
      hasFiles: !!req.files,
      fileKeys: req.files ? Object.keys(req.files) : [],
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        contentType: req.headers['content-type']
      }
    });
    
    const { accountId, locationId, category = 'ADDITIONAL' } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    console.log('🔍 [GMB Upload] Received credentials:', {
      accountId,
      locationId,
      category,
      hasAccessToken: !!accessToken,
      tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'NO TOKEN'
    });

    // Validation
    if (!accessToken) {
      console.error('❌ [GMB Upload] No access token provided');
      return REST.error(res, 'Access token is required', 401);
    }

    if (!accountId || !locationId) {
      console.error('❌ [GMB Upload] Missing account or location ID', { accountId, locationId });
      return REST.error(res, 'Account ID and Location ID are required', 400);
    }
    
    // Check if IDs have incorrect prefixes
    if (accountId.includes('accounts/') || locationId.includes('locations/')) {
      console.error('❌ [GMB Upload] IDs should not include prefixes!', { accountId, locationId });
      return REST.error(res, 'Account ID and Location ID should be numeric only (no "accounts/" or "locations/" prefix)', 400);
    }

    if (!req.files || !req.files.photo) {
      console.error('❌ [GMB Upload] No photo file provided', {
        hasFiles: !!req.files,
        fileKeys: req.files ? Object.keys(req.files) : []
      });
      return REST.error(res, 'Photo file is required', 400);
    }

    const photoFile = req.files.photo;
    console.log('📷 [GMB Upload] Photo details:', {
      name: photoFile.name,
      size: photoFile.size,
      mimetype: photoFile.mimetype
    });

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(photoFile.mimetype)) {
      console.error('❌ [GMB Upload] Invalid file type:', photoFile.mimetype);
      return REST.error(res, 'Only JPG, PNG, and GIF images are allowed', 400);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (photoFile.size > maxSize) {
      console.error('❌ [GMB Upload] File too large:', photoFile.size);
      return REST.error(res, 'Photo size must be less than 10MB', 400);
    }

    // GMB API v4.9 - Use public URL approach (still supported for media)
    
    // Save photo temporarily to create public URL
    console.log('💾 [GMB Upload] Saving photo temporarily...');
    const uploadsDir = path.join(__dirname, '../../uploads/temp');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const tempFileName = `gmb_${Date.now()}_${photoFile.name}`;
    const tempFilePath = path.join(uploadsDir, tempFileName);
    
    fs.writeFileSync(tempFilePath, photoFile.data);
    console.log('✅ [GMB Upload] Photo saved:', tempFileName);
    
    // Create publicly accessible URL
    const publicUrl = `${process.env.PUBLIC_URL || 'http://localhost:5000'}/uploads/temp/${tempFileName}`;
    console.log('🔗 [GMB Upload] Public URL:', publicUrl);
    
    // Create media item with public URL (GMB API v4.9)
    console.log('🔄 [GMB Upload] Creating media item with public URL...');
    const createMediaUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`;
    
    const mediaData = {
      mediaFormat: 'PHOTO',
      locationAssociation: {
        category: category
      },
      sourceUrl: publicUrl
    };

    const createMediaResponse = await axios.post(
      createMediaUrl,
      mediaData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const mediaItem = createMediaResponse.data;
    console.log('✅ [GMB Upload] Photo uploaded successfully to GMB:', mediaItem.name);
    
    // Clean up temporary file
    try {
      fs.unlinkSync(tempFilePath);
      console.log('🗑️ [GMB Upload] Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ [GMB Upload] Failed to clean up temp file:', cleanupError.message);
    }

    return REST.success(res, {
      mediaItem: {
        name: mediaItem.name,
        mediaFormat: mediaItem.mediaFormat,
        googleUrl: mediaItem.googleUrl,
        sourceUrl: mediaItem.sourceUrl,
        thumbnailUrl: mediaItem.thumbnailUrl,
        createTime: mediaItem.createTime,
        description: mediaItem.description,
        locationAssociation: mediaItem.locationAssociation
      }
    }, 'Photo uploaded to GMB successfully');

  } catch (error) {
    console.error('❌ [GMB Upload] Error uploading photo:', error.message);
    
    if (error.response) {
      console.error('❌ [GMB Upload] API Error Response:', {
        status: error.response.status,
        data: error.response.data,
        details: error.response.data?.error?.details,
        fullError: JSON.stringify(error.response.data, null, 2)
      });
      
      // Log validation errors if present
      if (error.response.data?.error?.details) {
        error.response.data.error.details.forEach((detail, idx) => {
          console.error(`❌ [GMB Upload] Validation Error ${idx + 1}:`, JSON.stringify(detail, null, 2));
        });
      }

      // Handle specific GMB API errors
      if (error.response.status === 401) {
        return REST.error(res, 'Authentication failed. Please sign in again.', 401);
      } else if (error.response.status === 403) {
        return REST.error(res, 'Permission denied. You may not have access to this GMB profile.', 403);
      } else if (error.response.status === 404) {
        return REST.error(res, 'GMB location not found. Please check your account and location IDs.', 404);
      }
      
      return REST.error(
        res, 
        error.response.data?.error?.message || 'Failed to upload photo to GMB', 
        error.response.status
      );
    }

    return REST.error(res, error.message || 'Failed to upload photo to GMB', 500);
  }
};

/**
 * Upload multiple photos to GMB profile
 * POST /api/v1/gmb/upload-photos
 */
const uploadMultiplePhotos = async (req, res) => {
  try {
    console.log('📸 [GMB Bulk Upload] Starting bulk photo upload...');
    
    const { accountId, locationId, category = 'ADDITIONAL' } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    if (!accessToken || !accountId || !locationId) {
      return REST.error(res, 'Access token, Account ID, and Location ID are required', 400);
    }

    if (!req.files || Object.keys(req.files).length === 0) {
      return REST.error(res, 'No photos provided', 400);
    }

    const photos = Array.isArray(req.files.photos) ? req.files.photos : [req.files.photos];
    console.log(`📷 [GMB Bulk Upload] Uploading ${photos.length} photos...`);

    const results = {
      successful: [],
      failed: []
    };

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      console.log(`📸 [GMB Bulk Upload] Uploading photo ${i + 1}/${photos.length}: ${photo.name}`);

      try {
        // Use the same upload logic as single photo
        const uploadResult = await uploadSinglePhoto(photo, accountId, locationId, category, accessToken);
        results.successful.push({
          name: photo.name,
          mediaItem: uploadResult
        });
        console.log(`✅ [GMB Bulk Upload] Photo ${i + 1} uploaded successfully`);
      } catch (error) {
        console.error(`❌ [GMB Bulk Upload] Photo ${i + 1} failed:`, error.message);
        results.failed.push({
          name: photo.name,
          error: error.message
        });
      }
    }

    console.log(`✅ [GMB Bulk Upload] Completed: ${results.successful.length} successful, ${results.failed.length} failed`);

    return REST.success(res, results, `Uploaded ${results.successful.length} out of ${photos.length} photos`);

  } catch (error) {
    console.error('❌ [GMB Bulk Upload] Error:', error.message);
    return REST.error(res, error.message || 'Failed to upload photos', 500);
  }
};

/**
 * Helper function to upload a single photo using public URL approach
 */
const uploadSinglePhoto = async (photoFile, accountId, locationId, category, accessToken) => {
  const path = require('path');
  const fs = require('fs');
  
  // Save photo temporarily
  const uploadsDir = path.join(__dirname, '../../uploads/temp');
  
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  const tempFileName = `gmb_${Date.now()}_${photoFile.name}`;
  const tempFilePath = path.join(uploadsDir, tempFileName);
  
  fs.writeFileSync(tempFilePath, photoFile.data);
  
  // Create public URL
  const publicUrl = `${process.env.PUBLIC_URL || 'http://localhost:5000'}/uploads/temp/${tempFileName}`;
  
  // Create media item with public URL
  const createMediaUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`;
  
  const mediaData = {
    mediaFormat: 'PHOTO',
    locationAssociation: {
      category: category
    },
    sourceUrl: publicUrl
  };

  const createMediaResponse = await axios.post(
    createMediaUrl,
    mediaData,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  // Clean up temp file
  try {
    fs.unlinkSync(tempFilePath);
  } catch (cleanupError) {
    console.warn('⚠️ Failed to clean up temp file:', cleanupError.message);
  }

  return createMediaResponse.data;
};

module.exports = {
  uploadPhoto,
  uploadMultiplePhotos
};
