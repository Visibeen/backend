const { make } = require('simple-body-validator');
const express = require('express');
const models = require('../../models');
const REST = require('../../utils/REST');
const auth = require('../../utils/auth');
const config = require('../../config');
const { compare } = require('../../utils/hash');
const constants = require('../../constants/user');
const router = express.Router();

// POST /login
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
        if (user.status !== constants.STATUSES.ACTIVE) {
            return REST.error(res, 'Your account is not active.', 403);
        }
        const passwordMatch = await compare(data.password, user.password);
        if (!passwordMatch) {
            return REST.error(res, 'Incorrect password.', 401);
        }
        const token = auth.shortTermToken({ userid: user.id }, config.USER_SECRET);
        await models.User.update({
            token: token,
            login_status: constants.LOGIN_STATUS.ACTIVE,
            login_date: new Date()
        }, { where: { id: user.id } });
        const finalUser = await models.User.findOne({ where: { id: user.id } });
        return REST.success(res, finalUser, 'Login successful.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});


module.exports = router; 