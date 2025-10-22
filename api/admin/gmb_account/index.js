/**
 * GMB Account Routes
 * @description Routes for managing GMB accounts stored in database
 * @author Senior Backend Developer
 */

const express = require('express');
const router = express.Router();
const models = require('../../../models');
const REST = require('../../../utils/REST');

/**
 * Get GMB accounts for a specific user
 * GET /api/admin/gmb-account/user/:userId
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const accounts = await models.GmbAccount.findAll({
      where: {
        user_id: userId,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    return REST.success(res, { accounts }, 'GMB accounts fetched successfully');
  } catch (error) {
    console.error('Error fetching GMB accounts:', error);
    return REST.error(res, error.message, 500);
  }
});

/**
 * Get all GMB accounts (admin only)
 * GET /api/admin/gmb-account/all
 */
router.get('/all', async (req, res) => {
  try {
    const accounts = await models.GmbAccount.findAll({
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'full_name', 'email']
        }
      ],
      where: {
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    return REST.success(res, { accounts }, 'All GMB accounts fetched successfully');
  } catch (error) {
    console.error('Error fetching all GMB accounts:', error);
    return REST.error(res, error.message, 500);
  }
});

/**
 * Create or update GMB account
 * POST /api/admin/gmb-account/sync
 */
router.post('/sync', async (req, res) => {
  try {
    console.log('📥 Received sync request:', {
      user_id: req.body.user_id,
      location_id: req.body.location_id,
      business_name: req.body.business_name
    });

    const {
      user_id,
      account_id,
      location_id,
      business_name,
      location_name,
      address,
      phone_number,
      website,
      category,
      location_data,
      is_verified
    } = req.body;

    if (!user_id) {
      console.error('❌ User ID is missing');
      return REST.error(res, 'User ID is required', 400);
    }

    console.log('🔍 Checking if account exists:', { user_id, location_id });

    // Check if account already exists
    let account = await models.GmbAccount.findOne({
      where: {
        user_id,
        location_id
      }
    });

    console.log('📊 Existing account:', account ? 'Found' : 'Not found');

    if (account) {
      // Update existing account
      console.log('🔄 Updating existing account...');
      await account.update({
        account_id,
        business_name,
        location_name,
        address,
        phone_number,
        website,
        category,
        location_data,
        is_verified,
        last_synced_at: new Date()
      });
      
      console.log('✅ Account updated successfully:', account.id);
      return REST.success(res, { account }, 'GMB account updated successfully');
    } else {
      // Create new account
      console.log('➕ Creating new account...');
      const accountData = {
        user_id,
        account_id,
        location_id,
        business_name,
        location_name,
        address,
        phone_number,
        website,
        category,
        location_data,
        is_verified,
        is_active: true,
        last_synced_at: new Date()
      };
      
      console.log('📦 Account data to create:', {
        user_id: accountData.user_id,
        location_id: accountData.location_id,
        business_name: accountData.business_name
      });
      
      account = await models.GmbAccount.create(accountData);

      console.log('✅ Account created successfully:', account.id);
      return REST.success(res, { account }, 'GMB account created successfully');
    }
  } catch (error) {
    console.error('❌ Error syncing GMB account:', error);
    console.error('Error stack:', error.stack);
    return REST.error(res, error.message, 500);
  }
});

/**
 * Get GMB profiles by user email
 * GET /api/admin/gmb-account/user-by-email?email=user@example.com
 */
router.get('/user-by-email', async (req, res) => {
  try {
    const { email } = req.query;
    console.log('📧 [user-by-email] Request received for email:', email);

    if (!email) {
      console.log('❌ [user-by-email] No email provided');
      return REST.error(res, 'Email is required', 400);
    }

    // Find user by email
    const user = await models.User.findOne({
      where: { email: email.toLowerCase() }
    });

    console.log('👤 [user-by-email] User lookup result:', user ? `Found user ID: ${user.id}` : 'User not found');

    if (!user) {
      console.log('⚠️ [user-by-email] No user found, returning empty profiles');
      return REST.success(res, { profiles: [] }, 'No user found with this email');
    }

    // Get all GMB accounts for this user
    const accounts = await models.GmbAccount.findAll({
      where: {
        user_id: user.id,
        is_active: true
      },
      order: [['created_at', 'DESC']]
    });

    console.log(`🏢 [user-by-email] Found ${accounts.length} GMB accounts for user ${user.id}`);
    if (accounts.length > 0) {
      console.log('📋 [user-by-email] Account details:', accounts.map(a => ({
        location_id: a.location_id,
        business_name: a.business_name,
        is_active: a.is_active
      })));
    }

    // Format profiles
    const profiles = accounts.map(account => ({
      id: account.location_id,
      name: account.business_name || account.location_name,
      title: account.business_name,
      address: account.address,
      category: account.category,
      isVerified: account.is_verified
    }));

    console.log(`✅ [user-by-email] Returning ${profiles.length} profiles`);

    return REST.success(res, { 
      profiles,
      userEmail: user.email,
      userId: user.id
    }, 'GMB profiles fetched successfully');
  } catch (error) {
    console.error('❌ [user-by-email] Error fetching GMB profiles by email:', error);
    return REST.error(res, error.message, 500);
  }
});

module.exports = router;
