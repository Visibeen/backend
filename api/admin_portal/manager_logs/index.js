const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();

/*
|----------------------------------------------------------------------------------------------------------------
|                                       Manager logs Api's
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/getManagerLogs', async function (req, res) {
    try {
        const role_id = req.query.role_id;
        const user_id = req.query.user_id;
        const findUser = await models.User.findOne({
            where: {
                role_id: role_id
            }
        });
        if (!findUser) {
            return REST.error(res, 'User  not found.', 404);
        }
        let data;
        if (findUser.role_id == 3) {
            data = await models.manager_logs.findAll({
                include: [
                    {
                        model: models.User,
                        as: "userDetails",
                        attributes: ["id", "full_name", "email", "phone_number", "createdAt", "updatedAt"]
                    },
                ],
                attributes: {
                    exclude: ["added_by", "updated_by"]
                },
                order: [["createdAt", "DESC"]],
                limit: 5
            });
        } else if (findUser.role_id == 4) {
            data = await models.manager_logs.findAll({
                where: {
                    user_id: user_id
                },
                include: [
                    {
                        model: models.User,
                        as: "userDetails",
                        attributes: ["id", "full_name", "email", "phone_number", "createdAt", "updatedAt"]
                    },
                ],
                attributes: {
                    exclude: ["added_by", "updated_by"]
                },
                order: [["createdAt", "DESC"]],
                limit: 5
            });
        }
        return REST.success(res, data, 'Logs fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getManagerLogsById', async function (req, res) {
    try {
        const { globalSearch } = req.query;
        const user_id = req.query.user_id;
        const role_id = req.query.role_id;
        let globalSearchFilter = {};
        if (globalSearch) {
            const search = globalSearch.split(',').map(term => term.trim());
            globalSearchFilter = {
                [Op.or]: [
                    ...search.map(term => ({ title: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ '$userDetails.full_name$': { [Op.like]: `%${term}%` } })),
                ]
            };
        }

        const findUser = await models.User.findOne({
            where: { role_id: role_id }
        });

        if (!findUser) {
            return REST.error(res, 'User not found.', 404);
        }

        let data;
        if (findUser.role_id == 3) {
            data = await models.manager_logs.findAll({
                where: globalSearchFilter,
                include: [
                    {
                        model: models.User,
                        as: "userDetails",
                        attributes: ["id", "full_name", "email", "phone_number", "createdAt", "updatedAt"]
                    },
                ],
                attributes: { exclude: ["added_by", "updated_by"] },
                order: [["createdAt", "DESC"]]
            });
        } else if (findUser.role_id == 4) {
            data = await models.manager_logs.findAll({
                where: {
                    user_id: user_id,
                    ...globalSearchFilter
                },
                include: [
                    {
                        model: models.User,
                        as: "userDetails",
                        attributes: ["id", "full_name", "email", "phone_number", "createdAt", "updatedAt"]
                    },
                ],
                attributes: { exclude: ["added_by", "updated_by"] },
                order: [["createdAt", "DESC"]]
            });
        }
        return REST.success(res, data, 'Get Logs successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router