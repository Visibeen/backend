const { make } = require('simple-body-validator');
const { Op } = require("sequelize");
const config = require('../../../config');
const constants = require("../../../constants/index");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const router = express.Router();
var REST = require("../../../utils/REST");
const { compare, gen } = require('../../../utils/hash');
const auth = require('../../../utils/auth');



/*
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                Auth Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

router.post('/login', async function (req, res) {
    try {
        const data = req.body;
        const rules = {
            email: "required|string",
            password: "required|string"
        };
        const validator = make(data, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const user = await models.User.findOne({ where: { email: data.email } });
        if (!user || (user.role_id !== 1)) {
            return REST.error(res, 'User not found or invalid role.', 422);
        }
        if (user) {
            const passwordMatch = await compare(data.password, user.password);
            if (passwordMatch) {
                const token = auth.shortTermToken({ userid: user.id }, config.USER_SECRET);
                await models.sequelize.transaction(async (transaction) => {
                    await models.User.update(
                        {
                            token: token,
                            login_date: new Date()
                        },
                        {
                            where: { id: user.id },
                            transaction: transaction
                        }
                    );
                });
                const finalRecord = await models.User.findOne({ where: { id: user.id } });
                return REST.success(res, finalRecord, 'Login Successful.');
            } else {
                return REST.error(res, 'Incorrect password', 401);
            }
        } else {
            return REST.error(res, 'User not found', 404);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post('/logout', async function (req, res) {
    try {
        const data = req.body;
        const rules = {
            email: "required|string"
        };
        const validator = make(data, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const user = await models.User.findOne({ where: { email: data.email } });
        if (!user || (user.role_id !== 1)) {
            return REST.error(res, 'User not found or invalid role.', 422);
        }
        if (user) {
            await models.sequelize.transaction(async (transaction) => {
                await models.User.update(
                    {
                        token: null
                    },
                    {
                        where: { id: user.id },
                        transaction: transaction
                    }
                );
            }
            );
            return REST.success(res, {}, 'Logout Successful.');
        } else {
            return REST.error(res, 'User not found', 404);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/get-customers', async function (req, res) {
    try {
        const customers = await models.User.findAll({
            where: { role_id: 3 },
            attributes: ["id", "role_id", "user_uid", "full_name", "email", "phone_number", "account_type", "status", "createdAt", "updatedAt"],
            order: [['createdAt', 'DESC']]
        });
        return REST.success(res, customers, 'Customers fetched successfully.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/profile-update/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const userId = req.params.id
        const data = req.body
        await models.sequelize.transaction(async (transaction) => {
            const user = await models.User.findOne({ where: { id: userId } });
            if (!user) {
                return REST.error(res, 'Customer not found', 404);
            }
            const updateData = {
                full_name: data.full_name,
                phone_number: data.phone_number,
                account_type: data.account_type,
            }
            await models.User.update(updateData, { where: { id: userId }, transaction: transaction });
        });
        const updatedUser = await models.User.findOne({ where: { id: userId } });
        return REST.success(res, updatedUser, 'Profile updated successfully.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})

module.exports = router;