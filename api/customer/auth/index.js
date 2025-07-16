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
const { compare } = require('../../../utils/hash');
const auth = require('../../../utils/auth');
const nodemailer = require('nodemailer');

// POST signup user
router.post('/signUp', async function (req, res) {
	try {
		const { full_name, email, phone_number, password, account_type } = req.body;

		const rules = {
			full_name: "required",
			email: "required",
			phone_number: "required",
			password: "required",
			account_type: "required"
		};

		const validator = make(req.body, rules);
		if (!validator.validate()) {
			return REST.error(res, validator.errors().all(), 422);
		}

		let emailUser = await models.User.findOne({ where: { email } });
		let phoneUser = await models.User.findOne({ where: { phone_number } });

		// Handle email already exists
		if (emailUser) {
			return REST.error(res, 'Email already exists.', 400);	
		}

		// Handle phone already exists
		if (phoneUser) {
			return REST.error(res, 'Phone number already exists.', 400);
		}

		// Hash password and prepare user data
		const hashedPassword = await gen(password);
		const user_uid = 'UID_' + support.generateRandomNumber();

		const userPayload = {
			full_name,
			role_id:3,
			email,
			phone_number,
			password: hashedPassword,
			user_uid,
			account_type,
			status: constants.USER.STATUSES.ACTIVE
		};

		// Create user with transaction
		const newUser = await models.sequelize.transaction(async (transaction) => {
			return await models.User.create(userPayload, { transaction });
		});
		
		return REST.success(res, newUser, 'User created successfully.');
	} catch (error) {
		console.error("SignUp Error:", error);
		return REST.error(res, 'Something went wrong. Please try again.', 500);
	}
});

// POST Login user
router.post('/login', async function (req, res) {
    try {
        const data = req.body;
		if(data.account_type == "google"){
			const user = await models.User.findOne({ where: { email: data.email } });
			if (!user) {
				const user_uid = 'UID_' + support.generateRandomNumber();
				const userPayload = {
					full_name: data.full_name,
					role_id:3,
					email: data.email,
					phone_number: data.phone_number,
					user_uid: user_uid,
					account_type: data.account_type,
					status: constants.USER.STATUSES.ACTIVE
				};
		
				// Create user with transaction
				const newUser = await models.sequelize.transaction(async (transaction) => {
					return await models.User.create(userPayload, { transaction });
				});

				const token = auth.shortTermToken({ userid: newUser.id }, config.USER_SECRET);
				await models.User.update({
					token: token,
					login_date: new Date()
				}, { where: { id: newUser.id } });
				const finalUser = await models.User.findOne({ where: { id: newUser.id } });
				return REST.success(res, finalUser, 'Login successful.');
			}else{
				const token1 = auth.shortTermToken({ userid: user.id }, config.USER_SECRET);
				await models.User.update({
					token: token1,
					login_date: new Date()
				}, { where: { id: user.id } });
				const finalUser1 = await models.User.findOne({ where: { id: user.id } });
				return REST.success(res, finalUser1, 'Login successful.');
			}
		}else{
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
			const token = auth.shortTermToken({ userid: user.id }, config.USER_SECRET);
			await models.User.update({
				token: token,
				login_date: new Date()
			}, { where: { id: user.id } });
			const finalUser = await models.User.findOne({ where: { id: user.id } });
			return REST.success(res, finalUser, 'Login successful.');
		}
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

// Forgot Password for Customer
router.post('/forgot_password', async function (req, res) {
    try {
        const data = req.body;
        const rules = {
            email: "required|string",
        };
        const validator = make(data, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const user = await models.User.findOne({ where: { email: data.email } });
        if (!user) {
            return REST.error(res, 'User not found', 404);
        }
        // Generate token and expiry
        const token = user.generateResetPasswordToken ? user.generateResetPasswordToken() : require('crypto').randomBytes(20).toString('hex');
        user.reset_password_token = token;
        user.reset_password_expires = Date.now() + 3600000; // 1 hour
        await user.save();
        // Mailtrap SMTP configuration
        var transporter = nodemailer.createTransport({
            host: 'live.smtp.mailtrap.io',
            port: 2525,
            auth: {
                user: 'api',
                pass: 'ee897ecad01a03ce0d505895ebd9a7e2',
            }
        });
        const BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8000';
        const resetLink = `${BASE_URL}/api/v1/customer/auth/reset-password/${user.id}/${token}`;
        const mailOptions = {
            from: 'info@demomailtrap.co',
           to: 'max753561@gmail.com',
            subject: 'Reset your password',
            text: `Click the following link to reset your password: ${resetLink}\nIf you did not request this, please ignore this email.`
        };
        await transporter.sendMail(mailOptions);
        return res.status(200).json({
            success: true,
            message: "Password reset email sent",
            body: resetLink,
        });
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router;
