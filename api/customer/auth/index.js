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
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt');


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
/*
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|             User Auth API
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

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
router.post('/google-login', async function (req, res) {
	try {
		const { email, googleAccessToken, authCode } = req.body;
		if (!email) {
			return REST.error(res, 'Email is required.', 400);
		}

		let accessToken = googleAccessToken;
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

		const gmbCheck = await checkGMBAccess(accessToken);
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
router.post('/forget_password', async function (req, res) {
	try {
		const data = req.body;
		const rules = {
			email: "required|string|email",
		};
		const validator = make(data, rules);

		if (!validator.validate()) {
			return REST.error(res, validator.errors().all(), 422);
		}

		const user = await models.User.findOne({ where: { email: data.email } });
		if (!user) {
			return REST.error(res, 'User not found', 404);
		}
		const crypto = require('crypto');
		const token = crypto.randomBytes(20).toString('hex');
		user.reset_password_token = token;
		user.reset_password_expires = Date.now() + 3600000;
		await user.save();
		const resetLink = `http://localhost:8089/api/v1/auth/reset-password/${user.id}/${token}`;
		const transporter = nodemailer.createTransport({
			host: "sandbox.smtp.mailtrap.io",
			port: 2525,
			auth: {
				user: "7c07a528a3fcd9",
				pass: "ed6d822f4b60e2"
			}
		});

		const mailOptions = {
			from: '"Raman Foo Koch 👻" <raman@e2edight.com>',
			to: user.email,
			subject: "Reset your Password",


		};

		transporter.sendMail(mailOptions, function (error, info) {
			if (error) {
				return res.status(500).json({
					success: false,
					message: "Error sending email",
				});
			} else {
				return res.status(200).json({
					success: true,
					message: "Password reset email sent",
					body: { resetLink },
				});
			}
		});

	} catch (error) {
		return REST.error(res, error.message, 500);
	}
});
router.get('/reset-password:/id:token', async function (req, res) {
	try {
		const { id, token } = req.params;
		const user = await models.User.findOne({
			where: {
				id: id,
				s: token,
				reset_password_expires: { $gt: Date.now() }
			}
		});
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "Token not found or expired",
			});
		}
		return res.status(200).json({
			success: true,
			message: "Token found and valid",
			body: {},
		});
	} catch (error) {
		return REST.error(res, error.message, 500);
	}
})
router.post('/update_Password', async function (req, res) {
	try {
		let checkToken = await models.User.findOne({
			where: {
				reset_password_token: req.body.token,
			},
		});
		if (checkToken) {
			const data = req.body;
			const rules = {
				password: 'required|string',
				confirm_password: 'required|string',
			};

			const validator = make(data, rules);
			if (!validator.validate()) {
				return REST.error(res, validator.errors().all(), 422);
			}

			const salt = await bcrypt.genSalt(10);
			const newPasswordHash = await bcrypt.hash(req.body.password, salt);
			await models.User.update({
				password: newPasswordHash,
				reset_password_token: '',
			}, {
				where: {
					reset_password_token: req.body.token,
				},
			})
			return REST.success(res, null, 'Password updated successfully')
		} else {
			return REST.error(res, 'Invalid token', 401);
		}
	} catch (error) {
		return REST.error(res, error.message, 500);
	}
});
// GMB Profile Search
const GMB_CONFIG = {
    baseURL: 'https://mybusinessbusinessinformation.googleapis.com/v1',
    readMask: 'name'
};
const getHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
});
const handleGMBError = (error, res) => {
    console.error('GMB API Error:', error.response?.data || error.message);
    
    const status = error.response?.status;
    switch (status) {
        case 401:
            return REST.error(res, 'Invalid or expired Google access token', 401);
        case 403:
            return REST.error(res, 'Insufficient permissions to access GMB API', 403);
        case 404:
            return REST.error(res, 'Resource not found', 404);
        case 429:
            return REST.error(res, 'Rate limit exceeded for GMB API', 429);
        default:
            return REST.error(res, `GMB API Error: ${error.message}`, 500);
    }
};
router.post('/search_gmb_profile', async function (req, res) {
    try {
        const { googleAccessToken, searchQuery } = req.body;
        if (!googleAccessToken) {
            return REST.error(res, 'Google access token is required', 400);
        }
        if (!searchQuery) {
            return REST.error(res, 'Search query is required', 400);
        }
        const isAlphabetOnly = /^[a-zA-Z\s]+$/.test(searchQuery.trim());
        if (isAlphabetOnly) {
            const accountsResponse = await axios.get(`${GMB_CONFIG.baseURL}/accounts`, {
                headers: getHeaders(googleAccessToken)
            });
            const accounts = accountsResponse.data?.accounts;
            if (!accounts || accounts.length === 0) {
                return REST.error(res, 'No GMB accounts found for the given token.', 404);
            }
            const searchTerms = searchQuery.toLowerCase().split(' ').filter(term => term.length > 0);
            const filteredAccounts = accounts.filter(account => {
                const accountName = account.accountName || account.name || '';
                return searchTerms.some(term => accountName.toLowerCase().includes(term));
            });			
            return REST.success(res, {
                accounts: filteredAccounts
            }, 'GMB accounts found successfully.');
        }
    } catch (error) {
        return handleGMBError(error, res);
    }
});
module.exports = router;
