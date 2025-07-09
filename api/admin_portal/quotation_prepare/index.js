const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const { LOG } = require('../../../constants');
const router = express.Router();

/*
|----------------------------------------------------------------------------------------------------------------
|              Quotations Prepare Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/getPrepareQuotation', async function (req, res) {
    try {
        const data = await models.quotation_prepare.findAll({
            include: [{
                model: models.User,
                as: "customer_details"
            }],
            order: [["created_at", "DESC"]]
        });
        return REST.success(res, data, 'Get Prepare Quotation List');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getPrepareQuotation/:customer_uid', async function (req, res) {
    try {
        const userUid = req.params.customer_uid;
        const findUser = await models.User.findOne({ where: { user_uid: userUid } });
        if (!findUser) {
            return REST.error(res, 'Customer Id Not Found', 404);
        }
        const findPrepare = await models.quotation_prepare.findOne({ where: { customer_id: findUser.id } });
        if (!findPrepare) {
            return REST.error(res, 'Quotation Id Not Found', 404);
        }
        const data = await models.quotation_prepare.findOne({
            where: { id: findPrepare.id },
            include: [{
                model: models.User,
                as: "customer_details",
                attributes: ["id", "user_uid", "full_name", "phone_number", "email", "city", "designation"]
            }]
        });
        return REST.success(res, data, 'Prepare Quotation Details Get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

module.exports = router;
