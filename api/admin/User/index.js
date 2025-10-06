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
        if (!user || (user.role_id !== 3 && user.role_id !== 3)) {
            return REST.error(res, 'User not found or invalid role.', 422);
        }
        if (user) {
            const passwordMatch = await compare(data.password, user.password);
            if (passwordMatch) {
                const token = auth.longTermToken({ userid: user.id }, config.USER_SECRET);
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
                const findUserPermission = await models.user_permission.findAll({
                    where: { user_id: user.id },
                })
                const page = await Promise.all(findUserPermission.map(async (item) => {
                    const pageData = await models.admin_routes.findOne({ where: { id: item.page_id } });
                    return {
                        id: pageData.id,
                        page_name: pageData.page_name,
                        slug: pageData.slug,
                        status: pageData.status,
                        createdAt: pageData.createdAt,
                        updatedAt: pageData.updatedAt
                    };
                }))
                finalRecord.dataValues.page = page
                return REST.success(res, finalRecord, 'Login Successfull.');
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
router.post('/change-password', async function (req, res) {
    try {
        const data = req.body;
        const rules = {
            oldPassword: "required|string",
            newPassword: "required|string",
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
        console.log(error, "error")
        return REST.error(res, error.message, 500);
    }
});
router.get('/get-admin', async function (req, res) {
    try {
        const data = await models.User.findAll({
            where: {
                role_id: 1
            }
        })
        return REST.success(res, data, 'Get Admin Successfully.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.post('/create-users', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const data = req.body;
        if (data.role_id && data.role_id !== 3) {
            return REST.error(res, 'Invalid role!', 422);
        }
        if (!data.role_id) {
            data.role_id = 3;
        }
        const rules = {
            full_name: 'required|string',
            email: 'required|string|email',
            password: 'required|string',
            phone_number: 'required|string',
            page: 'required|array',
            'page.*.page_id': 'required|integer',
        };
        const validator = make(data, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const findEmail = await models.User.findOne({ where: { email: data.email } });
        if (findEmail) {
            return REST.error(res, 'Email Already Exist.', 422);
        }
        const findPhone = await models.User.findOne({ where: { phone_number: data.phone_number } });
        if (findPhone) {
            return REST.error(res, 'Phone Number Already Exist.', 422);
        }
        const adminVm = {
            full_name: data.full_name,
            role_id: data.role_id,
            email: data.email,
            phone_number: data.phone_number,
            status: data.status || 'active',
        };
        adminVm.password = await gen(data.password);
        let admin = await models.sequelize.transaction(async (transaction) => {
            const createdUser = await models.User.create(adminVm, { transaction });
            for (const page of data.page) {
                const permissionData = {
                    user_id: createdUser.id,
                    page_id: page.page_id,
                };
                await models.user_permission.create(permissionData, { transaction });
            }
            return createdUser;
        });
        return REST.success(res, admin, 'User Created successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/get-cro', async function (req, res) {
    try {
        const data = await models.User.findAll({
            where: {
                role_id: 9
            }
        })
        return REST.success(res, data, 'Get CRO Successfully.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/get-seo', async function (req, res) {
    try {
        const data = await models.User.findAll({
            where:{
                role_id: 11
            }
        })
        return REST.success(res, data, 'Get SEO Successfully.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router;