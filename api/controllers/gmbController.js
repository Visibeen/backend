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

/**
 * Helper function to verify if account and location exist
 */
const verifyGMBAccess = async (accountId, locationId, accessToken) => {
  try {
    const verifyUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations/${locationId}`;
    const response = await axios.get(verifyUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    return { valid: true, location: response.data };
  } catch (error) {
    if (error.response?.status === 404) {
      return { valid: false, error: 'Location not found' };
    } else if (error.response?.status === 403) {
      return { valid: false, error: 'Access denied to this location' };
    } else if (error.response?.status === 401) {
      return { valid: false, error: 'Invalid or expired access token' };
    }
    return { valid: false, error: error.response?.data?.error?.message || 'Unknown error' };
  }
};

/**
 * Create GMB Local Post (appears in feed)
 * POST /api/v1/gmb/create-local-post
 * 
 * This creates a post that appears in the GMB feed with optional photo
 */
const createLocalPost = async (req, res) => {
  try {
    console.log('📝 [GMB Local Post] Creating local post...');
    
    // Log all incoming data for debugging
    console.log('🔍 [GMB Local Post] Incoming request data:', {
      body: req.body,
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : [],
      hasPhoto: !!(req.files && req.files.photo),
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing'
      }
    });
    
    const { accountId, locationId, summary, topicType = 'STANDARD', actionType, actionUrl } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    console.log('🔍 [GMB Local Post] Parsed values:', {
      accountId,
      locationId,
      accountIdLength: accountId?.length,
      locationIdLength: locationId?.length,
      summary: summary?.substring(0, 50) + '...',
      topicType,
      actionType,
      actionUrl,
      hasAccessToken: !!accessToken
    });

    // Validation
    if (!accessToken) {
      return REST.error(res, 'Access token is required', 401);
    }

    if (!accountId || !locationId) {
      return REST.error(res, 'Account ID and Location ID are required', 400);
    }

    if (!summary || summary.trim().length === 0) {
      return REST.error(res, 'Post summary is required', 400);
    }

    // Verify GMB access before proceeding
    console.log('🔍 [GMB Local Post] Verifying GMB access...');
    const verification = await verifyGMBAccess(accountId, locationId, accessToken);
    
    if (!verification.valid) {
      console.error('❌ [GMB Local Post] Access verification failed:', verification.error);
      
      if (verification.error === 'Location not found') {
        return REST.error(res, 
          `GMB location not found. The location ID "${locationId}" for account "${accountId}" doesn't exist or has been deleted. Please reconnect your Google My Business account.`, 
          404
        );
      } else if (verification.error === 'Access denied to this location') {
        return REST.error(res, 
          `Access denied. You don't have permission to post to this GMB location. Please ensure you have admin access to this business profile.`, 
          403
        );
      } else if (verification.error === 'Invalid or expired access token') {
        return REST.error(res, 
          `Authentication failed. Your Google session has expired. Please sign in again with Google.`, 
          401
        );
      }
      
      return REST.error(res, `GMB verification failed: ${verification.error}`, 400);
    }
    
    console.log('✅ [GMB Local Post] Access verified. Location found:', verification.location?.name);

    // Build post data
    const postData = {
      languageCode: 'en',
      summary: summary.trim(),
      topicType: topicType
    };

    // Handle photo upload if provided
    if (req.files && req.files.photo) {
      const photoFile = req.files.photo;
      console.log('📷 [GMB Local Post] Photo provided:', photoFile.name);

      // Validate file
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(photoFile.mimetype)) {
        return REST.error(res, 'Only JPG, PNG, and GIF images are allowed', 400);
      }

      const maxSize = 10 * 1024 * 1024;
      if (photoFile.size > maxSize) {
        return REST.error(res, 'Photo size must be less than 10MB', 400);
      }

      // Upload photo first to get URL
      console.log('📤 [GMB Local Post] Uploading photo to GMB...');
      const mediaItem = await uploadSinglePhoto(photoFile, accountId, locationId, 'ADDITIONAL', accessToken);
      
      // Attach photo to post
      postData.media = [
        {
          mediaFormat: 'PHOTO',
          sourceUrl: mediaItem.googleUrl || mediaItem.sourceUrl
        }
      ];
      
      console.log('✅ [GMB Local Post] Photo attached to post');
    }

    // Add call to action if provided
    if (actionType) {
      postData.callToAction = {
        actionType: actionType
      };
      if (actionUrl && actionType !== 'CALL') {
        postData.callToAction.url = actionUrl;
      }
    }

    // Create local post
    console.log('🔄 [GMB Local Post] Creating post in GMB feed...');
    const createPostUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;
    
    const createPostResponse = await axios.post(
      createPostUrl,
      postData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const localPost = createPostResponse.data;
    console.log('✅ [GMB Local Post] Post created successfully:', localPost.name);

    return REST.success(res, {
      localPost: {
        name: localPost.name,
        summary: localPost.summary,
        topicType: localPost.topicType,
        createTime: localPost.createTime,
        updateTime: localPost.updateTime,
        media: localPost.media,
        callToAction: localPost.callToAction
      }
    }, 'Local post created successfully in GMB feed');

  } catch (error) {
    console.error('❌ [GMB Local Post] Error:', error.message);
    
    if (error.response) {
      console.error('❌ [GMB Local Post] API Error Details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        requestUrl: error.config?.url,
        accountId: req.body.accountId,
        locationId: req.body.locationId
      });
      
      // Handle specific Google API errors
      if (error.response.status === 404 && error.response.data?.error?.message?.includes('Requested entity was not found')) {
        return REST.error(
          res, 
          `GMB location not found. Please verify that the account ID (${req.body.accountId}) and location ID (${req.body.locationId}) are correct and that you have access to this location.`, 
          404
        );
      }
      
      return REST.error(
        res, 
        error.response.data?.error?.message || 'Failed to create local post', 
        error.response.status
      );
    }

    return REST.error(res, error.message || 'Failed to create local post', 500);
  }
};

/**
 * Upload video to GMB profile
 * POST /api/v1/gmb/upload-video
 * 
 * This endpoint handles video upload to GMB API v4
 * Videos appear in the media section of the GMB profile
 */
const uploadVideo = async (req, res) => {
  try {
    console.log('🎥 [GMB Video Upload] Starting video upload process...');
    
    const { accountId, locationId, category = 'ADDITIONAL' } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    console.log('🔍 [GMB Video Upload] Received credentials:', {
      accountId,
      locationId,
      category,
      hasAccessToken: !!accessToken
    });

    // Validation
    if (!accessToken) {
      console.error('❌ [GMB Video Upload] No access token provided');
      return REST.error(res, 'Access token is required', 401);
    }

    if (!accountId || !locationId) {
      console.error('❌ [GMB Video Upload] Missing account or location ID');
      return REST.error(res, 'Account ID and Location ID are required', 400);
    }

    if (!req.files || !req.files.video) {
      console.error('❌ [GMB Video Upload] No video file provided');
      return REST.error(res, 'Video file is required', 400);
    }

    const videoFile = req.files.video;
    console.log('🎬 [GMB Video Upload] Video details:', {
      name: videoFile.name,
      size: videoFile.size,
      mimetype: videoFile.mimetype
    });

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv'];
    if (!allowedTypes.includes(videoFile.mimetype)) {
      console.error('❌ [GMB Video Upload] Invalid file type:', videoFile.mimetype);
      return REST.error(res, 'Only MP4, MPEG, MOV, AVI, and WMV videos are allowed', 400);
    }

    // Validate file size (max 100MB for videos)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (videoFile.size > maxSize) {
      console.error('❌ [GMB Video Upload] File too large:', videoFile.size);
      return REST.error(res, 'Video size must be less than 100MB', 400);
    }

    // Save video temporarily
    console.log('💾 [GMB Video Upload] Saving video temporarily...');
    const uploadsDir = path.join(__dirname, '../../uploads/temp');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const tempFileName = `gmb_video_${Date.now()}_${videoFile.name}`;
    const tempFilePath = path.join(uploadsDir, tempFileName);
    
    fs.writeFileSync(tempFilePath, videoFile.data);
    console.log('✅ [GMB Video Upload] Video saved:', tempFileName);
    
    // Create public URL
    const publicUrl = `${process.env.PUBLIC_URL || 'http://localhost:5000'}/uploads/temp/${tempFileName}`;
    console.log('🔗 [GMB Video Upload] Public URL:', publicUrl);
    
    // Upload to GMB
    console.log('🔄 [GMB Video Upload] Uploading video to GMB...');
    const createMediaUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`;
    
    const mediaData = {
      mediaFormat: 'VIDEO',
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
    console.log('✅ [GMB Video Upload] Video uploaded successfully to GMB:', mediaItem.name);
    
    // Clean up temporary file
    try {
      fs.unlinkSync(tempFilePath);
      console.log('🗑️ [GMB Video Upload] Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('⚠️ [GMB Video Upload] Failed to clean up temp file:', cleanupError.message);
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
    }, 'Video uploaded to GMB successfully');

  } catch (error) {
    console.error('❌ [GMB Video Upload] Error uploading video:', error.message);
    
    if (error.response) {
      console.error('❌ [GMB Video Upload] API Error Response:', {
        status: error.response.status,
        data: error.response.data
      });
      
      return REST.error(
        res, 
        error.response.data?.error?.message || 'Failed to upload video to GMB', 
        error.response.status
      );
    }

    return REST.error(res, error.message || 'Failed to upload video to GMB', 500);
  }
};

/**
 * Delete media (photo/video) from GMB profile
 * DELETE /api/v1/gmb/delete-media
 */
const deleteMedia = async (req, res) => {
  try {
    console.log('🗑️ [GMB Delete Media] Starting delete process...');
    
    const { accountId, locationId, mediaName } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    console.log('🔍 [GMB Delete Media] Received credentials:', {
      accountId,
      locationId,
      mediaName,
      hasAccessToken: !!accessToken
    });

    // Validation
    if (!accessToken) {
      console.error('❌ [GMB Delete Media] No access token provided');
      return REST.error(res, 'Access token is required', 401);
    }

    if (!accountId || !locationId || !mediaName) {
      console.error('❌ [GMB Delete Media] Missing required parameters');
      return REST.error(res, 'Account ID, Location ID, and Media Name are required', 400);
    }

    // Delete media from GMB
    console.log('🔄 [GMB Delete Media] Deleting from GMB...');
    const deleteUrl = `https://mybusiness.googleapis.com/v4/${mediaName}`;
    
    await axios.delete(deleteUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    console.log('✅ [GMB Delete Media] Media deleted successfully');

    return REST.success(res, {
      deleted: true,
      mediaName
    }, 'Media deleted from GMB successfully');

  } catch (error) {
    console.error('❌ [GMB Delete Media] Error:', error.message);
    
    if (error.response) {
      console.error('❌ [GMB Delete Media] API Error:', {
        status: error.response.status,
        data: error.response.data
      });
      
      return REST.error(
        res, 
        error.response.data?.error?.message || 'Failed to delete media', 
        error.response.status
      );
    }

    return REST.error(res, error.message || 'Failed to delete media', 500);
  }
};

/**
 * Update GMB Location (e.g., messaging URI for WhatsApp)
 * PATCH /api/v1/gmb/update-location
 */
const updateLocation = async (req, res) => {
  try {
    console.log('📝 [GMB Update Location] Starting location update...');
    
    const { accountId, locationId, messagingUri, websiteUri, phoneNumber } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');

    console.log('🔍 [GMB Update Location] Received data:', {
      accountId,
      locationId,
      messagingUri,
      websiteUri,
      phoneNumber,
      hasAccessToken: !!accessToken
    });

    // Validation
    if (!accessToken) {
      console.error('❌ [GMB Update Location] No access token provided');
      return REST.error(res, 'Access token is required', 401);
    }

    if (!accountId || !locationId) {
      console.error('❌ [GMB Update Location] Missing account or location ID');
      return REST.error(res, 'Account ID and Location ID are required', 400);
    }

    // Build update data
    const updateData = {};
    const updateMask = [];

    if (messagingUri !== undefined) {
      updateData.messaging = {
        whatsApp: {
          uri: messagingUri
        }
      };
      updateMask.push('messaging.whatsApp.uri');
    }

    if (websiteUri !== undefined) {
      updateData.websiteUri = websiteUri;
      updateMask.push('websiteUri');
    }

    if (phoneNumber !== undefined) {
      updateData.primaryPhone = phoneNumber;
      updateMask.push('primaryPhone');
    }

    if (updateMask.length === 0) {
      return REST.error(res, 'No fields to update provided', 400);
    }

    // Update location in GMB
    console.log('🔄 [GMB Update Location] Updating location in GMB...');
    const updateUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations/${locationId}?updateMask=${updateMask.join(',')}`;
    
    const updateResponse = await axios.patch(
      updateUrl,
      updateData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const updatedLocation = updateResponse.data;
    console.log('✅ [GMB Update Location] Location updated successfully');

    return REST.success(res, {
      location: {
        name: updatedLocation.name,
        messaging: updatedLocation.messaging,
        websiteUri: updatedLocation.websiteUri,
        primaryPhone: updatedLocation.primaryPhone
      }
    }, 'GMB location updated successfully');

  } catch (error) {
    console.error('❌ [GMB Update Location] Error:', error.message);
    
    if (error.response) {
      console.error('❌ [GMB Update Location] API Error:', {
        status: error.response.status,
        data: error.response.data
      });
      
      return REST.error(
        res, 
        error.response.data?.error?.message || 'Failed to update location', 
        error.response.status
      );
    }

    return REST.error(res, error.message || 'Failed to update location', 500);
  }
};

module.exports = {
  uploadPhoto,
  uploadMultiplePhotos,
  createLocalPost,
  uploadVideo,
  deleteMedia,
  updateLocation
};
