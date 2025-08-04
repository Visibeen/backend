const { make } = require('simple-body-validator');
const { Op } = require("sequelize");
const config = require('../../../config');
const constants = require("../../../constants/index");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const moment = require("moment")
const router = express.Router();
const support = require('../../../utils/support');
var REST = require("../../../utils/REST");
const { compare, gen } = require('../../../utils/hash');
const auth = require('../../../utils/auth');
const axios = require('axios');

async function checkGMBAccess(googleAccessToken) {
	try {
		const response = await axios.get('https://mybusinessbusinessinformation.googleapis.com/v1/accounts', {
			headers: {
				'Authorization': `Bearer ${googleAccessToken}`,
				'Content-Type': 'application/json',
			},
		});		
		if (response.data && response.data.accounts && response.data.accounts.length > 0) {
			return {
				hasGMBAccess: true,
				accounts: response.data.accounts
			};
		}
		return { hasGMBAccess: false };
	} catch (error) {
		console.error('Error checking GMB access:', error.response?.data || error.message);
		return { hasGMBAccess: false, error: error.message };
	}
}
async function exchangeGoogleAuthCode(authCode) {
	try {
		const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {			
			client_id: process.env.GOOGLE_CLIENT_ID,
			client_secret: process.env.GOOGLE_CLIENT_SECRET,
			code: authCode,
			grant_type: 'authorization_code',
		});		
		return tokenResponse.data;
	} catch (error) {
		console.error('Error exchanging auth code:', error.response?.data || error.message);
		throw error;
	}
}
// POST signup user
router.post('/signUp', async function (req, res) {
	try {
		const { full_name, email, phone_number, password, account_type } = req.body;
		const rules = {
			full_name: "required",
			email: "required",
			account_type: "required",
		};
		if (account_type === 'manual') {
			rules.phone_number = "required";
			rules.password = "required";
		}
		const validator = make(req.body, rules);
		if (!validator.validate()) {
			return REST.error(res, validator.errors().all(), 422);
		}

		let emailUser = await models.User.findOne({ where: { email } });
		let phoneUser = await models.User.findOne({ where: { phone_number } });
		if (emailUser) {
			return REST.error(res, 'Email already exists.', 400);
		}
		if (phoneUser) {
			return REST.error(res, 'Phone number already exists.', 400);
		}
		const hashedPassword = await gen(password);
		const user_uid = 'UID_' + support.generateRandomNumber();
		const userPayload = {
			full_name,
			role_id: 3,
			email,
			phone_number,
			password: hashedPassword,
			user_uid,
			account_type,
			status: constants.USER.STATUSES.ACTIVE
		};

		const newUser = await models.sequelize.transaction(async (transaction) => {
			return await models.User.create(userPayload, { transaction });
		});
		return REST.success(res, newUser, 'User created successfully.');
	} catch (error) {
		return REST.error(res, 'Something went wrong. Please try again.', 500);
	}
});
router.post('/login', async function (req, res) {
	try {
		const data = req.body;
		if (data.account_type == "google") {
			const user = await models.User.findOne({ where: { email: data.email } });
			if (!user) {
				const user_uid = 'UID_' + support.generateRandomNumber();
				const userPayload = {
					full_name: data.full_name,
					role_id: 3,
					email: data.email,
					phone_number: data.phone_number,
					user_uid: user_uid,
					account_type: data.account_type,
					status: constants.USER.STATUSES.ACTIVE
				};
				const newUser = await models.sequelize.transaction(async (transaction) => {
					return await models.User.create(userPayload, { transaction });
				});
				const token = auth.longTermToken({ userid: newUser.id }, config.USER_SECRET);
				await models.User.update({
					token: token,
					login_date: new Date()
				}, { where: { id: newUser.id } });
				const finalUser = await models.User.findOne({ where: { id: newUser.id } });
				return REST.success(res, finalUser, 'Login successful.');
			} else {
				const token1 = auth.longTermToken({ userid: user.id }, config.USER_SECRET);
				await models.User.update({
					token: token1,
					login_date: new Date()
				}, { where: { id: user.id } });
				const finalUser1 = await models.User.findOne({ where: { id: user.id } });
				return REST.success(res, finalUser1, 'Login successful.');
			}
		} else {
			const user = await models.User.findOne({ where: { email: data.email } });
			if (!user) {
				return REST.error(res, 'User not found.', 404);
			}
			const rules = {
				email: 'required',
				password: 'required'
			};
			const validator = make(data, rules);
			if (!validator.validate()) {
				return REST.error(res, validator.errors().all(), 422);
			}

			const passwordMatch = await compare(data.password, user.password);
			if (!passwordMatch) {
				return REST.error(res, 'Incorrect password.', 401);
			}
			let hasGMBAccess = false;
			let needsGoogleAuth = false;
			let gmbCheck = null;

			if (user.has_gmb_access && user.google_access_token) {
				try {
					gmbCheck = await checkGMBAccess(user.google_access_token);
					hasGMBAccess = gmbCheck.hasGMBAccess;
					if (hasGMBAccess !== user.has_gmb_access) {
						await models.User.update({
							has_gmb_access: hasGMBAccess
						}, { where: { id: user.id } });
					}
				} catch (error) {
					console.log('Google token expired or invalid, needs re-authentication');
					hasGMBAccess = false;
					needsGoogleAuth = true;
				}
			} else {
				hasGMBAccess = false;
				needsGoogleAuth = true;
			}

			const token = auth.shortTermToken({ userid: user.id }, config.USER_SECRET);
			await models.User.update({
				token: token,
				login_date: new Date()
			}, { where: { id: user.id } });

			const finalUser = await models.User.findOne({ where: { id: user.id } });			
			return REST.success(res, {
				user: finalUser,
				hasGMBAccess: hasGMBAccess,
				needsGoogleAuth: needsGoogleAuth,
				// gmbAccounts: (gmbCheck && gmbCheck.accounts) || [],
			}, 'Login successful.');
		}
	} catch (error) {
		return REST.error(res, error.message, 500);
	}
});
// POST Google OAuth Login with GMB checking
router.post('/google-login', async function (req, res) {
	try {
		const { email, googleAccessToken, authCode } = req.body;

		if (!email) {
			return REST.error(res, 'Email is required.', 400);
		}

		let accessToken = googleAccessToken;
		// If we have an auth code but no access token, exchange it
		if (!accessToken && authCode) {
			try {
				const tokenData = await exchangeGoogleAuthCode(authCode);
				accessToken = tokenData.access_token;
			} catch (error) {
				return REST.error(res, 'Failed to exchange auth code for access token.', 400);
			}
		}

		if (!accessToken) {
			return REST.error(res, 'Google access token is required.', 400);
		}

		// Check if user has GMB access
		const gmbCheck = await checkGMBAccess(accessToken);

		// Find or create user       
		let user = await models.User.findOne({ where: { email } });

		if (!user) {
			// Create new user
			const user_uid = 'UID_' + support.generateRandomNumber();
			const userPayload = {
				full_name: req.body.full_name || email.split('@')[0], // Use email prefix if no name provided
				role_id: 3,
				email: email,
				user_uid: user_uid,
				account_type: 'google',
				status: constants.USER.STATUSES.ACTIVE,
				google_access_token: accessToken, // Store the access token
				has_gmb_access: gmbCheck.hasGMBAccess
			};

			user = await models.sequelize.transaction(async (transaction) => {
				return await models.User.create(userPayload, { transaction });
			});
		} else {
			// Update existing user with new token and GMB status
			await models.User.update({
				google_access_token: accessToken,
				has_gmb_access: gmbCheck.hasGMBAccess,
				last_login: new Date()
			}, { where: { id: user.id } });

			user = await models.User.findOne({ where: { id: user.id } });
		}

		// Generate JWT token
		const token = auth.shortTermToken({ userid: user.id }, config.USER_SECRET);
		await models.User.update({
			token: token,
			login_date: new Date()
		}, { where: { id: user.id } });

		const finalUser = await models.User.findOne({ where: { id: user.id } });

		// Return response with GMB status for frontend routing
		return REST.success(res, {
			user: finalUser,
			hasGMBAccess: gmbCheck.hasGMBAccess,
			gmbAccounts: gmbCheck.accounts || [],
			redirectTo: gmbCheck.hasGMBAccess ? '/dashboard' : '/account-not-found'
		}, 'Login successful.');

	} catch (error) {
		console.error('Google login error:', error);
		return REST.error(res, error.message, 500);
	}
});
// POST Link Google account to existing user
router.post('/link-google', async function (req, res) {
	try {
		const { googleEmail, googleAccessToken, googleDisplayName } = req.body;
		const authHeader = req.headers.authorization;

		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return REST.error(res, 'Authorization token required.', 401);
		}

		const token = authHeader.split(' ')[1];
		let decoded;
		try {
			decoded = auth.verifyToken(token, config.USER_SECRET);
		} catch (error) {
			return REST.error(res, 'Invalid or expired token.', 401);
		}

		if (!googleEmail || !googleAccessToken) {
			return REST.error(res, 'Google email and access token are required.', 400);
		}

		// Find the current user
		const user = await models.User.findOne({ where: { id: decoded.userid } });
		if (!user) {
			return REST.error(res, 'User not found.', 404);
		}

		// Check if user has GMB access
		const gmbCheck = await checkGMBAccess(googleAccessToken);

		// Update user with Google information
		await models.User.update({
			google_access_token: googleAccessToken,
			has_gmb_access: gmbCheck.hasGMBAccess,
			last_login: new Date()
		}, { where: { id: user.id } });

		const updatedUser = await models.User.findOne({ where: { id: user.id } });

		// Return response with GMB status
		return REST.success(res, {
			user: updatedUser,
			hasGMBAccess: gmbCheck.hasGMBAccess,
			gmbAccounts: gmbCheck.accounts || [],
			redirectTo: gmbCheck.hasGMBAccess ? '/dashboard' : '/account-not-found'
		}, 'Google account linked successfully.');

	} catch (error) {
		console.error('Link Google error:', error);
		return REST.error(res, error.message, 500);
	}
});





module.exports = router;
