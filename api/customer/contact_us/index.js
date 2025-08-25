const { make } = require('simple-body-validator');
const { Op } = require("sequelize");
const config = require('../../../config');
const constants = require("../../../constants/index");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const moment = require("moment")
const router = express.Router();
const support = require('../../../utils/support');
var REST = require("../../../utils/REST");
const { compare } = require('../../../utils/hash');
const auth = require('../../../utils/auth');


/*
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                 Contact Us Management Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

router.post('/create-contact', async function (req, res) {
    const cUser = req.body.current_user;
    const transaction = await models.sequelize.transaction();
    try {
        const data = req.body;
        const rules = {
            name: 'required|string',
            email: 'required|email',
            message: 'required|string',
        };
        const validator = make(data, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().first(), 422);
        }
        const contactUs = await models.contact_us.create({
            name: data.name,
            email: data.email,
            message: data.message,
            business_name: data.business_name,
            business_category: data.business_category,
            phone_number: data.phone_number,
            date_and_time: data.date_and_time,
            location: data.location,
            lat: data.lat,
            long: data.long,
        }, { transaction });
        await transaction.commit()
        return REST.success(res, contactUs, 'Contact Us created successfully');
    } catch (error) {
        await transaction.rollback();
        return REST.error(res, error.message, 500);
    }
});
module.exports = router;