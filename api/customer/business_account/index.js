const { make } = require('simple-body-validator');
const { Op } = require("sequelize");
const config = require('../../../config');
const constants = require("../../../constants/index");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const moment = require("moment")
const support = require('../../../utils/support');
var REST = require("../../../utils/REST");

const router = express.Router();



// Create a business account


router.post('/create-business', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findUser = await models.User.findOne({ where: { id: req.body.user_id } })
        if (!findUser) {
            return REST.error(res, 'User Id Not Found', 404);
        }
        const business = await models.sequelize.transaction(async (transaction) => {
            const data = await models.business_account.create({
                user_id: req.body.user_id,
                business_name: req.body.business_name,
                business_category: req.body.business_category,
                is_location: req.body.is_location,
                lat: req.body.lat,
                long: req.body.long,
                country: req.body.country,
                street_address: req.body.street_address,
                city: req.body.city,
                state: req.body.state,
                pin_code: req.body.pin_code,
                is_business: req.body.is_business,
                contact_number: req.body.contact_number,
                select_area: req.body.select_area,
                place_pin: req.body.place_pin,
                is_deliveries: req.body.is_deliveries,
                chat: req.body.chat,
                website: req.body.website,
                status: req.body.status,
            },
                {
                    transaction: transaction
                }
            )
            return data
        })
        return REST.success(res, business, 'Business account created successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/get-business-account', async function (req, res) {
    try {
        const data = await models.business_account.findAll({
            order: [["id", "DESC"]],
        })
        return REST.success(res, data, 'get-business-account successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);

    }
})
router.get('/get-business-account/:id', async function (req, res) {
    try {
        const data = await models.business_account.findOne({
            where: { id: req.params.id },
        })
        if (!data) {
            return REST.error(res, 'Business account not found', 404);
        }
        return REST.success(res, data, 'get-business-account successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router;


