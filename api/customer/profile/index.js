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
const axios = require('axios');


router.get('/getBusinessProfile', async function (req, res) {
	try {
		const { googleAccessToken } = req.query;
		if (!googleAccessToken) {
			return REST.error(res, 'Google access token is required.', 400);
		}
		const response = await axios.get('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
			headers: {
				'Authorization': `Bearer ${googleAccessToken}`,
				'Content-Type': 'application/json',
			},
		});
		if (response.data && response.data.accounts && response.data.accounts.length > 0) {
			return REST.success(res, response.data.accounts, 'GMB profiles found.');
		} else {
			return REST.error(res, 'No GMB profiles found.', 404);
		}
	} catch (error) {
		const status = error?.response?.status || 500;
		const message = error?.response?.data?.error?.message || 'Failed to retrieve GMB accounts.';
		return REST.error(res, message, status);
	}
});


// Get user profile
router.get("/get", async function (req, res) {
	try {
		const user = await getUser(req.body.current_user.id);
		return REST.success(res, user, 'Get profile success.');
	} catch (error) {
		return REST.error(res, error.message, 500);
	}
});


// Update user profile
router.put("/update", async function (req, res) {
	var user = req.body.current_user;
	try {
		const data = req.body;
		const rules = {
			full_name: 'required',
			phone_number: 'required'
		};
		const validator = make(data, rules);
		if (!validator.validate()) {
			return REST.error(res, validator.errors().first(), 422);
		}
		const userDuplicatePhoneNumber = await models.User.findOne({ where: { phone_number: data.phone_number, id: { [Op.not]: user.id } } });
		if (userDuplicatePhoneNumber) {
			return REST.error(res, 'Phone number has been already taken.', 422);
		}

		await models.sequelize.transaction(async (transaction) => {
			await models.User.update(
				{
					full_name: data.full_name,
					phone_number: data.phone_number
				}, {
				where: { id: user.id },
				transaction: transaction
			});
			return true;
		});

		user = await getUser(user.id);
		return REST.success(res, user, 'Update profile success.');
	} catch (error) {
		return REST.error(res, "Update profile failed, please try again.", 500);
	}
});


//Change password
router.put('/change_password', async function (req, res) {
	try {
		const data = req.body;
		const rules = {
			oldPassword: "required",
			newPassword: "required",
			confirmPassword: "required|same:newPassword",
		};
		const validator = make(data, rules);
		if (!validator.validate()) {
			return REST.error(res, validator.errors().all(), 422);
		}
		const cUser = req.body.current_user
		const findUser = await models.User.findOne({ where: { id: cUser.id } });
		if (findUser) {
			const passwordMatch = await compare(data.oldPassword, findUser.password);
			if (passwordMatch) {
				const hashedNewPassword = await gen(data.newPassword);
				await models.User.update(
					{ password: hashedNewPassword },
					{ where: { id: cUser.id } }
				);
				return REST.success(res, 'Password changed successfully');
			} else {
				return REST.error(res, 'Old password is incorrect', 422);
			}
		} else {
			return REST.error(res, 'User not found', 404);
		}
	} catch (error) {
		return REST.error(res, error.message, 500);
	}
});

async function getUser(user_id) {
	const user = await models.User.findOne({
		where: { id: user_id }
	});
	return user;
}


module.exports = router;
