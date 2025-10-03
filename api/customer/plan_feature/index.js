const { make } = require('simple-body-validator');
const { Op } = require("sequelize");
const config = require('../../../config');
const constants = require("../../../constants/index");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const router = express.Router();
const support = require('../../../utils/support');
var REST = require("../../../utils/REST");
const user = require('../../../constants/user');




router.get('/get-features', async function (req, res) {
    const cUser = req.body.current_user;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    try {
        const { count, rows: plan } = await models.plan_feature.findAndCountAll({
            where: {
                user_id: cUser.id
            },
            include: [
                {
                    model: models.plan,
                    as: 'plandetails',
                },
                {
                    model: models.User,
                    as: 'userdetails',
                }
            ],
            order: [['id', 'DESC']],
            limit: pageSize,
            offset: offset
        })
        const totalPages = Math.ceil(count / pageSize);
        return REST.success(res, { plan, totalItems: count, totalPages, currentPage: page }, 'Get Features successfully.');
    }
    catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router