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
    
    const cUser = req.body.current_user || req.user;

    if (!accountId || !locationId) {
      await transaction.rollback();
      return REST.error(res, 'Account ID and Location ID are required', 400);
    }

    if (!post_name || !scheduled_time) {
      await transaction.rollback();
      return REST.error(res, 'Post name and scheduled time are required', 400);
    }

    // Load user's Google token from DB
    const user = await models.User.findOne({ where: { id: cUser?.id } });
    const googleAccessToken = user?.google_access_token;
    if (!googleAccessToken) {
      await transaction.rollback();
      return REST.error(
        res,
        'Google account not connected. Please sign in with Google to enable scheduling.',
        400
      );
    }

    let mediaUrl = null;

    // Normalize IDs (strip prefixes if present)
    let normAccountId = accountId;
    let normLocationId = locationId;
    if (typeof normAccountId === 'string' && normAccountId.includes('accounts/')) {
      normAccountId = normAccountId.split('/').pop();
    }
    if (typeof normLocationId === 'string' && normLocationId.includes('locations/')) {
      normLocationId = normLocationId.split('/').pop();
    }

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
      if (/localhost|127\.0\.0\.1/.test(publicUrl)) {
        console.warn('⚠️ [Schedule Post] PUBLIC_URL is localhost; Google cannot fetch local URLs. Use a public domain (e.g., https://api.visibeen.com or an ngrok URL).');
      }
      
      // Upload to GMB
      console.log('🔄 [Schedule Post] Uploading image to GMB...');
      const createMediaUrl = `https://mybusiness.googleapis.com/v4/accounts/${normAccountId}/locations/${normLocationId}/media`;
      
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
            'Authorization': `Bearer ${googleAccessToken}`,
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
        if (uploadError.response) {
          console.error('❌ [Schedule Post] GMB API Error:', {
            status: uploadError.response.status,
            data: uploadError.response.data
          });
        }
        
        // Clean up temp file on error
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        
        return REST.error(res, 'Failed to upload image to GMB: ' + (uploadError.response?.data?.error?.message || uploadError.message), uploadError.response?.status || 500);
      }
    }

    // Capture additional GMB post data if provided and store as JSON in description
    const {
      summary,
      topicType,
      actionType,
      actionUrl
    } = req.body;

    const descriptionPayload = {
      accountId,
      locationId,
      summary: summary || '',
      topicType: topicType || 'STANDARD',
      callToAction: actionType ? { actionType, ...(actionType !== 'CALL' && actionUrl ? { url: actionUrl } : {}) } : null,
      media: mediaUrl ? { mediaFormat: 'PHOTO', sourceUrl: mediaUrl } : null
    };

    // Create scheduled post in database
    const newPost = await models.post_scheduler.create({
      user_id: cUser?.id,
      post_name: post_name,
      post_url: mediaUrl || '',
      scheduled_time: scheduled_time,
      title: title || '',
      description: description ? description : JSON.stringify(descriptionPayload),
      status: true,
      created_by: cUser?.id,
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

/**
 * Process due scheduled posts and publish to GMB
 * This should be run by a scheduler (e.g., every minute)
 */
const processDueScheduledPosts = async () => {
  const now = new Date();
  console.log(`⏳ [Post Scheduler] Checking for due posts at ${now.toISOString()}`);

  try {
    // Find posts scheduled at or before now and still pending (status = true)
    const duePosts = await models.post_scheduler.findAll({
      where: {
        status: true,
        scheduled_time: { [models.Sequelize.Op.lte]: now }
      },
      order: [['scheduled_time', 'ASC']]
    });

    if (!duePosts.length) {
      return { processed: 0 };
    }

    let processed = 0;
    for (const post of duePosts) {
      try {
        // Parse description payload if JSON
        let payload = {};
        if (post.description) {
          try {
            payload = JSON.parse(post.description);
          } catch (_) {
            payload = {};
          }
        }

        const accountId = payload.accountId;
        const locationId = payload.locationId;
        const summary = payload.summary || post.title || 'Scheduled Post';
        const topicType = payload.topicType || 'STANDARD';
        const media = payload.media || (post.post_url ? { mediaFormat: 'PHOTO', sourceUrl: post.post_url } : null);
        const callToAction = payload.callToAction || null;

        if (!accountId || !locationId) {
          console.warn(`⚠️ [Post Scheduler] Skipping post ${post.id} - missing account/location IDs`);
          // Mark as failed to avoid infinite loop
          await post.update({ status: false });
          continue;
        }

        // Get user's Google token
        const user = await models.User.findOne({ where: { id: post.user_id } });
        if (!user || !user.google_access_token) {
          console.warn(`⚠️ [Post Scheduler] Skipping post ${post.id} - missing user token`);
          await post.update({ status: false });
          continue;
        }

        const gmbPostData = {
          languageCode: 'en',
          summary: summary,
          topicType: topicType
        };
        if (media) {
          gmbPostData.media = [media];
        }
        if (callToAction) {
          gmbPostData.callToAction = callToAction;
        }

        const createPostUrl = `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/localPosts`;
        await axios.post(createPostUrl, gmbPostData, {
          headers: {
            Authorization: `Bearer ${user.google_access_token}`,
            'Content-Type': 'application/json'
          }
        });

        await post.update({ status: false });
        processed += 1;
        console.log(`✅ [Post Scheduler] Posted scheduled item ${post.id} to GMB`);
      } catch (err) {
        console.error(`❌ [Post Scheduler] Failed to post scheduled item ${post.id}:`, err.response?.data || err.message);
        // Mark as failed to avoid retry loop for now
        await post.update({ status: false });
      }
    }

    return { processed };
  } catch (error) {
    console.error('❌ [Post Scheduler] Error processing due posts:', error.message);
    return { processed: 0, error: error.message };
  }
};

module.exports = {
  schedulePostWithImage,
  processDueScheduledPosts
};
