const { make } = require('simple-body-validator');
const { Op } = require("sequelize");
const config = require('../../../config');
const constants = require("../../../constants/index");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const router = express.Router();
var REST = require("../../../utils/REST");



// Create Plan
router.post('/create-plan', async function (req, res) {
    const transaction = await models.sequelize.transaction();
    try {
        const data = req.body;
        const rules = {
            name: "required|string",
        };

        const validator = make(data, rules);
        if (!validator.validate()) {
            await transaction.rollback();
            return REST.error(res, validator.errors().all(), 422);
        }

        const checkPlan = await models.plan.findOne({
            where: { name: data.name },
            transaction
        });
        if (checkPlan) {
            await transaction.rollback();
            return REST.error(res, 'Plan name already exists.', 422);
        }

        const newPlan = await models.plan.create({
            name: data.name,
            price: data.price,
            billing_cycle: data.billing_cycle,
            currency: data.currency,
            description: data.description,
            status: data.status
        }, { transaction });

        await transaction.commit();
        return REST.success(res, newPlan, 'Plan created successfully.');
    } catch (error) {
        await transaction.rollback();
        return REST.error(res, error.message, 500);
    }
});
// Get All Plan
router.get('/get-plans', async function (req, res) {
    try {
        const plans = await models.plan.findAll({
            order: [['id', 'ASC']]
        });
        return REST.success(res, plans, 'Plans retrieved successfully.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Get Plan By ID
router.get('/get-plans/:id', async function (req, res) {
    try {
        const data = await models.plan.findOne({
            where: {
                id: req.params.id
            }
        })
        if (data.lenght > 0) {
            return REST.error(res, 'Plan Not Found', 404);
        }
        return REST.success(res, data, 'Plans retrieved successfully.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
// update plan
router.put('/update-plan/:id', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const findPlan = await models.plan.findOne({
            where: {
                id: req.params.id
            }
        })
        if (!findPlan) {
            return REST.error(res, 'Plan Not Found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            await models.plan.update({
                name: req.body.name,
                price: req.body.price,
                billing_cycle: req.body.billing_cycle,
                currency: req.body.currency,
                description: req.body.description
            },
                {
                    where: {
                        id: req.params.id
                    },
                    transaction: transaction
                })
        })
        const findNewPlan = await models.plan.findOne({
            where: {
                id: req.params.id
            }
        })
        return REST.success(res, findNewPlan, 'Plans Updated successfully.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
// delete plan
router.delete('/delete-plan/:id', async function (req, res) {
    try {
        const findPlane = await models.plan.findOne({
            where: {
                id: req.params.id
            }
        })
        if (!findPlane) {
            return REST.error(res, 'Plan Not Found', 404);
        }
        await models.plan.destroy({
            where: {
                id: req.params.id
            }
        })
        return REST.success(res, null, 'Plans deleted successfully.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router