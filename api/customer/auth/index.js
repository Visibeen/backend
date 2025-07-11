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

// POST /api/v1/forgot-password/request
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

// POST/api/v1/customer/auth/login
router.post('/login', async function (req, res) {
    try {
        const data = req.body;
        const rules = {
            email: 'required|string',
            password: 'required|string'
        };
        const validator = make(data, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const user = await models.User.findOne({ where: { email: data.email } });
        if (!user) {
            return REST.error(res, 'User not found.', 404);
        }
        if (user.status !== constants.USER.STATUSES.ACTIVE) {
            return REST.error(res, 'Your account is not active.', 403);
        }
        const passwordMatch = await compare(data.password, user.password);
        if (!passwordMatch) {
            return REST.error(res, 'Incorrect password.', 401);
        }
        const token = auth.shortTermToken({ userid: user.id }, config.USER_SECRET);
        await models.User.update({
            token: token,
            login_status: constants.USER.LOGIN_STATUS.ACTIVE,
            login_date: new Date()
        }, { where: { id: user.id } });
        const finalUser = await models.User.findOne({ where: { id: user.id } });
        return REST.success(res, finalUser, 'Login successful.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});


module.exports = router;
