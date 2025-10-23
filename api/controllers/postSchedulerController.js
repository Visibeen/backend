/**
 * Post Scheduler Controller
 * @description Controller for scheduling posts with GMB photo uploads
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const REST = require('../../utils/REST');
const models = require('../../models');

/**
 * Schedule a post with image upload to GMB
 * POST /api/v1/post-scheduler/schedule-with-image
 */
const schedulePostWithImage = async (req, res) => {
  const transaction = await models.sequelize.transaction();
  
  try {
    console.log('📅 [Schedule Post] Starting post scheduling with image...');
    
    const { 
      accountId, 
      locationId, 
      post_name, 
      title, 
      description, 
      scheduled_time,
      category = 'ADDITIONAL'
    } = req.body;
    
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    const cUser = req.body.current_user;

    // Validation
    if (!accessToken) {
      await transaction.rollback();
      return REST.error(res, 'Access token is required', 401);
    }

    if (!accountId || !locationId) {
      await transaction.rollback();
      return REST.error(res, 'Account ID and Location ID are required', 400);
    }

    if (!post_name || !scheduled_time) {
      await transaction.rollback();
      return REST.error(res, 'Post name and scheduled time are required', 400);
    }

    let mediaUrl = null;

    // If image is provided, upload to GMB first
    if (req.files && req.files.image) {
      const imageFile = req.files.image;
      console.log('📷 [Schedule Post] Image provided:', imageFile.name);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(imageFile.mimetype)) {
        await transaction.rollback();
        return REST.error(res, 'Only JPG, PNG, and GIF images are allowed', 400);
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (imageFile.size > maxSize) {
        await transaction.rollback();
        return REST.error(res, 'Image size must be less than 10MB', 400);
      }

      // Save photo temporarily
      console.log('💾 [Schedule Post] Saving image temporarily...');
      const uploadsDir = path.join(__dirname, '../../uploads/temp');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const tempFileName = `gmb_post_${Date.now()}_${imageFile.name}`;
      const tempFilePath = path.join(uploadsDir, tempFileName);
      
      fs.writeFileSync(tempFilePath, imageFile.data);
      console.log('✅ [Schedule Post] Image saved:', tempFileName);
      
      // Create public URL
      const publicUrl = `${process.env.PUBLIC_URL || 'http://localhost:5000'}/uploads/temp/${tempFileName}`;
      console.log('🔗 [Schedule Post] Public URL:', publicUrl);
      
      // Upload to GMB
      console.log('🔄 [Schedule Post] Uploading image to GMB...');
      const createMediaUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/media`;
      
      const mediaData = {
        mediaFormat: 'PHOTO',
        locationAssociation: {
          category: category
        },
        sourceUrl: publicUrl
      };

      try {
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

        mediaUrl = createMediaResponse.data.googleUrl || createMediaResponse.data.sourceUrl;
        console.log('✅ [Schedule Post] Image uploaded to GMB:', mediaUrl);
        
        // Clean up temp file
        try {
          fs.unlinkSync(tempFilePath);
          console.log('🗑️ [Schedule Post] Temporary file cleaned up');
        } catch (cleanupError) {
          console.warn('⚠️ [Schedule Post] Failed to clean up temp file:', cleanupError.message);
        }
      } catch (uploadError) {
        await transaction.rollback();
        console.error('❌ [Schedule Post] Failed to upload image to GMB:', uploadError.message);
        
        // Clean up temp file on error
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        
        return REST.error(res, 'Failed to upload image to GMB: ' + uploadError.message, 500);
      }
    }

    // Create scheduled post in database
    const newPost = await models.post_scheduler.create({
      user_id: cUser.id,
      post_name: post_name,
      post_url: mediaUrl || '',
      scheduled_time: scheduled_time,
      title: title || '',
      description: description || '',
      status: true,
      created_by: cUser.id,
    }, { transaction });

    await transaction.commit();
    
    console.log('✅ [Schedule Post] Post scheduled successfully:', newPost.id);
    
    return REST.success(res, {
      post: newPost,
      mediaUrl: mediaUrl
    }, 'Post scheduled successfully with image uploaded to GMB');

  } catch (error) {
    await transaction.rollback();
    console.error('❌ [Schedule Post] Error:', error.message);
    return REST.error(res, error.message || 'Failed to schedule post', 500);
  }
};

module.exports = {
  schedulePostWithImage
};
