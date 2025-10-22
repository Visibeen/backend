const { User, GmbAccount } = require('../../models');
const { Op } = require('sequelize');

/**
 * Get all registered users (clients) from the database
 * This endpoint is for admin to view all users who have logged in
 */
const getUsers = async (req, res) => {
  try {
    console.log('📋 [UserController] Fetching all registered users...');

    // Fetch all users from database
    const users = await User.findAll({
      attributes: [
        'id',
        'user_uid',
        'full_name',
        'email',
        'phone_number',
        'status',
        'account_type',
        'has_gmb_access',
        'last_login',
        'login_date',
        'created_at',
        'updated_at'
      ],
      order: [['created_at', 'DESC']], // Most recent users first
      raw: true
    });

    console.log(`✅ [UserController] Found ${users.length} users`);

    // Format the response
    const formattedUsers = users.map(user => ({
      id: user.id,
      user_uid: user.user_uid,
      name: user.full_name || 'N/A',
      email: user.email,
      phone_number: user.phone_number || 'N/A',
      status: user.status || 'PENDING',
      account_type: user.account_type || 'client',
      has_gmb_access: user.has_gmb_access || false,
      last_login: user.last_login,
      login_date: user.login_date,
      created_at: user.created_at,
      updated_at: user.updated_at
    }));

    return res.status(200).json({
      code: 200,
      message: 'Users fetched successfully',
      data: {
        users: formattedUsers,
        total: formattedUsers.length
      }
    });

  } catch (error) {
    console.error('❌ [UserController] Error fetching users:', error);
    return res.status(500).json({
      code: 500,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

/**
 * Get user details by ID including their GMB accounts
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`📋 [UserController] Fetching user details for ID: ${userId}`);

    const user = await User.findOne({
      where: { id: userId },
      attributes: [
        'id',
        'user_uid',
        'full_name',
        'email',
        'phone_number',
        'status',
        'account_type',
        'has_gmb_access',
        'google_access_token',
        'last_login',
        'login_date',
        'created_at',
        'updated_at'
      ]
    });

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: 'User not found'
      });
    }

    // Fetch user's GMB accounts
    const gmbAccounts = await GmbAccount.findAll({
      where: { user_id: userId },
      attributes: ['id', 'account_id', 'location_id', 'location_data', 'created_at'],
      raw: true
    });

    console.log(`✅ [UserController] Found user with ${gmbAccounts.length} GMB accounts`);

    return res.status(200).json({
      code: 200,
      message: 'User details fetched successfully',
      data: {
        user: {
          id: user.id,
          user_uid: user.user_uid,
          name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          status: user.status,
          account_type: user.account_type,
          has_gmb_access: user.has_gmb_access,
          google_access_token: user.google_access_token, // Include Google access token for admin
          last_login: user.last_login,
          login_date: user.login_date,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        gmb_accounts: gmbAccounts
      }
    });

  } catch (error) {
    console.error('❌ [UserController] Error fetching user details:', error);
    return res.status(500).json({
      code: 500,
      message: 'Failed to fetch user details',
      error: error.message
    });
  }
};

/**
 * Generate admin access token for accessing user's GMB profile
 * This allows admin to impersonate user and access their dashboard
 */
const generateAdminAccessToken = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log(`🔑 [UserController] Generating admin access token for user ID: ${userId}`);

    const user = await User.findOne({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({
        code: 404,
        message: 'User not found'
      });
    }

    // Create a temporary access token for admin
    const adminAccessToken = {
      userId: user.id,
      userUid: user.user_uid,
      email: user.email,
      name: user.full_name,
      isAdminAccess: true,
      timestamp: Date.now(),
      expiresIn: 3600000 // 1 hour
    };

    console.log('✅ [UserController] Admin access token generated');

    return res.status(200).json({
      code: 200,
      message: 'Admin access token generated successfully',
      data: {
        accessToken: Buffer.from(JSON.stringify(adminAccessToken)).toString('base64'),
        user: {
          id: user.id,
          name: user.full_name,
          email: user.email
        }
      }
    });

  } catch (error) {
    console.error('❌ [UserController] Error generating admin access token:', error);
    return res.status(500).json({
      code: 500,
      message: 'Failed to generate admin access token',
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  generateAdminAccessToken
};
