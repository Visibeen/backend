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


router.post('/create-feature', async function (req, res) {
    const transaction = await models.sequelize.transaction();
    try {
        const data = req.body;
        const rules = {
            plan_id: "required|integer",
            user_id: "integer",
        };

        const validator = make(data, rules);
        if (!validator.validate()) {
            await transaction.rollback();
            return REST.error(res, validator.errors().all(), 422);
        }
        const checkPlan = await models.plan.findOne({
            where: { id: data.plan_id },
            transaction
        });
        if (!checkPlan) {
            await transaction.rollback();
            return REST.error(res, 'Plan not found.', 422);
        }
        const newFeature = await models.plan_feature.create({
            plan_id: data.plan_id,
            user_id: data.user_id,
            feature_name: data.feature_name,
            value_type: data.value_type,
            feature_value: data.feature_value,
            status: data.status
        }, { transaction });
        await transaction.commit();
        return REST.success(res, newFeature, 'Feature created successfully.');
    }
    catch (error) {
        await transaction.rollback();
        return REST.error(res, error.message, 500);
    }
})
module.exports = router