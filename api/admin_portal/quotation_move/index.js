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
|              Quotations Moves Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/getmovequotation', async function (req, res) {
    try {
        const move_quotations = await models.quotation_move.findAll({
            include: [{
                model: models.User,
                as: "customer_details",

            }],
            order: [["created_at", "DESC"]]
        });
        return REST.success(res, move_quotations, 'Successfully retrieved all move quotations');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getMoveQuotation/:customer_uid', async function (req, res) {
    try {
        const userUid = req.params.customer_uid;
        const findUser = await models.User.findOne({
            where: {
                user_uid: userUid
            }
        });

        if (!findUser) {
            return REST.success(res, 'Customer ID not found', 404);
        }

        const findMove = await models.quotation_move.findOne({
            where: { customer_id: findUser.id }
        });

        if (!findMove) {
            return REST.error(res, "Move ID not found", 404);
        }

        const data = await models.quotation_move.findOne({
            where: { id: findMove.id },
            include: [
                {
                    model: models.User,
                    as: "customer_details",
                    attributes: ["id", "user_uid", "full_name", "phone_number", "email", "city", "designation"]
                }
            ]
        });
        return REST.success(res, data, 'Move Quotations Details Get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

module.exports = router