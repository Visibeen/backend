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

// Save user register data
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



module.exports = router;
