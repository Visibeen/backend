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
const axios = require('axios');



/*
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                  Account Management Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/
// create account
router.post("/create-account", async function (req, res) {
    const cUser = req.body.current_user;    
    try {
        const rules = {
            business_name: 'required|string',
            industry_type: 'required|string',
        };
        const validator = make(req.body, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().first(), 422);
        }
        let account = await models.sequelize.transaction(async (transaction) => {
            let data = await models.account.create({
                user_id:cUser.id,
                business_name: req.body.business_name,
                industry_type: req.body.industry_type,
                start_date: req.body.start_date ? moment(req.body.start_date).toDate() : null,
                end_date: req.body.end_date ? moment(req.body.end_date).toDate() : null,
                cro_employee_name:req.body.cro_employee_name,
                seo_employee_name:req.body.seo_employee_name,
                password:req.body.password,
                contact_person:req.body.contact_person,
                contact_number:req.body.contact_number,
                email: req.body.email,
                address: req.body.address,
                website: req.body.website,
                image: req.body.image
            }, { transaction });
            return data;
        });
        return REST.success(res, account, 'Account created successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

// Get account list
router.get("/get-accounts", async function (req, res) {
    try {
        const accounts = await models.account.findAll({
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                }
            ],
            order: [['created_at', 'DESC']]
        });
        return REST.success(res, accounts, 'Accounts retrieved successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router;