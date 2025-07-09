const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const constants = require("../../../constants");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const auth = require("../../../utils/auth");
const config = require("../../../config")
const jwt = require('jsonwebtoken')
const generateUniqueId = require('generate-unique-id');
const bcrypt = require('bcrypt');
const { getIoInstance } = require('../../../socket');

const safeEmit = (event, data) => {
    try {
        const io = getIoInstance();
        io.emit(event, data);
    } catch (error) {
        console.error('Socket.io not initialized:', error.message);
    }
};


/*
|----------------------------------------------------------------------------------------------------------------
|              Users Permissions Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createUser', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const data = req.body;
        if (data.role_id && data.role_id !== 4) {
            return REST.error(res, 'Invalid role!', 422);
        }
        if (!data.role_id) {
            data.role_id = 4;
        }
        const rules = {
            full_name: 'required|string',
            email: 'required|string|ends_with:@indicold.com',
            password: 'required|string',
            phone_number: 'required|string',
            city: 'required|string',
            department: 'required|string',
            page: 'required|array',
            'page.*.page_id': 'required|string',
            'page.*.page_name': 'required|string',
        };
        const validator = make(data, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const userDuplicateEmail = await models.User.findOne({ where: { email: data.email } });
        if (userDuplicateEmail) {
            return REST.error(res, 'Email Already Exist.', 422);
        }
        const userDuplicatePhone = await models.User.findOne({ where: { phone_number: data.phone_number } });
        if (userDuplicatePhone) {
            return REST.error(res, 'Phone Number Already Exist.', 422);
        }
        const adminVm = {
            full_name: data.full_name,
            role_id: data.role_id,
            email: data.email,
            phone_number: data.phone_number,
            city: data.city,
            department: data.department,
            avatar: data.avatar ?? null,
            status: constants.USER.STATUSES.ACTIVE,
        };
        adminVm.password = await gen(data.password);
        const admin = await models.sequelize.transaction(async (transaction) => {
            const createdUser = await models.User.create(adminVm, { transaction });
            for (const page of data.page) {
                const permissionData = {
                    user_id: createdUser.id,
                    page_id: page.page_id,
                    page_name: page.page_name,
                    is_permission: page.is_permission,
                    status: data.status,
                };
                await models.user_permission.create(permissionData, { transaction });
            }
            const createdManger = createdUser.full_name;
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "Create Manager",
                title: "Manager Created",
                details: `created ${createdManger} manager.`
            }, { transaction });

            return createdUser;
        });
        const currentData = req.body
        const activityLog = {
            user_id: admin.id,
            activity: `Manager`,
            activity_id: admin.id,
            activity_type: "Manager Created",
            current_data: currentData,
            added_by: cUser.id,
            action: "Added"
        };
        await models.user_activity_logs.create(activityLog);
        return REST.success(res, admin, 'User Created successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

router.put('/updateUser/:id', async function (req, res) {
    const cUser = req.body.current_user;
    const userId = req.params.id;
    const pagePermissions = req.body.page || [];

    try {
        const findUser = await models.User.findOne({ where: { id: userId } });
        if (!findUser) {
            return REST.error(res, 'User ID not found', 404);
        }

        const previousPermissions = await models.user_permission.findAll({ where: { user_id: userId } });
        const data = { ...req.body };
        delete data.current_user;
        const updatedUser = await models.sequelize.transaction(async (transaction) => {
            const hashedPassword = data.password
                ? await bcrypt.hash(data.password, 10)
                : findUser.password;
            await models.User.update({
                full_name: data.full_name,
                phone_number: data.phone_number,
                city: data.city,
                email: data.email,
                department: data.department,
                password: hashedPassword,
                status: data.status,
                token: null
            }, {
                where: { id: userId },
                transaction
            });

            // Handle permissions
            for (const item of pagePermissions) {
                const existingPermission = await models.user_permission.findOne({
                    where: {
                        user_id: userId,
                        page_id: item.page_id
                    },
                    transaction
                });
                if (existingPermission && item.status === 'active') {
                    await models.user_permission.destroy({
                        where: { id: existingPermission.id },
                        transaction
                    });

                    await models.user_permission.create({
                        user_id: userId,
                        page_id: item.page_id,
                        page_name: item.page_name,
                        is_permission: item.is_permission,
                        status: item.status
                    }, { transaction });

                } else if (!existingPermission && item.status === 'active') {
                    await models.user_permission.create({
                        user_id: userId,
                        page_id: item.page_id,
                        page_name: item.page_name,
                        is_permission: item.is_permission,
                        status: item.status
                    }, { transaction });

                } else if (existingPermission && item.status === 'inactive') {
                    await models.user_permission.update({
                        is_permission: item.is_permission,
                        status: item.status
                    }, {
                        where: {
                            id: existingPermission.id
                        },
                        transaction
                    });
                }
            }
            return await models.User.findOne({ where: { id: userId }, transaction });
        });
        const message = `${updatedUser.full_name}, your permissions have been updated by Admin.`;
        safeEmit('send_notification', {
            title: 'Updated Permissions',
            message,
            reciver_id: userId
        });

        await models.user_activity_logs.create({
            user_id: userId,
            activity: 'Manager',
            activity_id: userId,
            activity_type: 'update_manager',
            previous_data: {
                user: findUser.dataValues,
                permissions: previousPermissions
            },
            current_data: req.body,
            updated_by: cUser.id,
            action: 'Updated'
        });

        return REST.success(res, updatedUser, 'User Updated Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.put('/updatePassword/:id', async function (req, res) {
    try {
        const id = req.params.id;
        const data = req.body;
        const findUser = await models.User.findOne({ where: { id: id } });
        if (findUser) {
            const passwordMatch = await compare(data.oldPassword, findUser.password);
            if (passwordMatch) {
                const hashedNewPassword = await gen(data.newPassword);
                await models.User.update(
                    { password: hashedNewPassword },
                    { where: { id: id } }
                );
                return REST.success(res, 'Password Updated Successfully');
            } else {
                return REST.error(res, 'Old password is incorrect', 422);
            }
        } else {
            return REST.error(res, 'User not found', 404);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.post("/logout", async function (req, res) {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return REST.error(res, "Token not provided", 400);
        }
        await models.User.update({
            token: null,
            login_status: constants.USER.LOGIN_STATUS.INACTIVE,
            logout_date: new Date()
        }, { where: { token: token } });
        return REST.success(res, null, "Logout success");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getAllSubUsers', async function (req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        const { globalSearch } = req.query;
        let whereCondition = { role_id: 4 };
        if (globalSearch) {
            const searchTerms = globalSearch.split(',').map(term => term.trim());
            whereCondition[Op.or] = [
                ...searchTerms.map(term => ({ full_name: { [Op.like]: `%${term}%` } })),
                ...searchTerms.map(term => ({ email: { [Op.like]: `%${term}%` } })),
                ...searchTerms.map(term => ({ phone_number: { [Op.like]: `%${term}%` } })),
                ...searchTerms.map(term => ({ designation: { [Op.like]: `%${term}%` } })),
                ...searchTerms.map(term => ({ city: { [Op.like]: `%${term}%` } }))
            ];
        }
        const totalCount = await models.User.count({ where: whereCondition });
        const data = await models.User.findAll({
            where: whereCondition,
            include: [
                {
                    model: models.user_permission,
                    as: 'permission',
                    include: {
                        model: models.admin_pages,
                        as: 'page'
                    }
                }
            ],
            order: [["id", "DESC"]],
            offset: offset,
            limit: pageSize,
        });
        return REST.success(res, {
            userDetails: data,
            pagination: {
                totalCount: totalCount,
                totalPages: Math.ceil(totalCount / pageSize),
                currentPage: page,
                pageSize,
            },
        }, "Get All Sub Users Permissions!");

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getUserById/:id', async function (req, res) {
    const id = req.params.id;
    try {
        const find = await models.User.findOne({ where: { id: req.params.id } });
        if (find == null) {
            return REST.error(res, 'User Id Not Found', 404);
        }
        var findUser = await models.User.findOne({
            where: { id: id }
        });
        findUser.dataValues.page = [];
        const findPermission = await models.user_permission.findAll({
            where: { user_id: id }
        });
        for (let data of findPermission) {
            var routes = await models.admin_pages.findAll({
                where: { id: data.page_id }
            });
            for (let route of routes) {
                var obj = {};
                obj.page_name = route.page_name;
                obj.slug = route.slug;
                obj.is_permission = data.is_permission;
                obj.status = data.status;
                obj.id = route.id;
                findUser.dataValues.page.push(obj);
                data.dataValues.page = data.dataValues.page || [];
                data.dataValues.page.push(obj);
            }
        }
        return REST.success(res, findUser, 'Fetched Users Successfully!');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.delete('/deleteUser/:id', async function (req, res) {
    try {
        const id = req.params.id;
        const findUser = await models.User.findOne({
            where: {
                id: id
            }
        });
        if (!findUser) {
            return REST.error(res, 'User not found', 404)
        }
        await models.User.destroy({
            where: {
                id: findUser.id
            }
        });
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: findUser.id
            }
        })
        if (findPermission) {
            await models.user_permission.destroy({
                where: {
                    user_id: findUser.id
                }
            });
        }
        return REST.success(res, null, 'Deleted User Successfully!');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

module.exports = router