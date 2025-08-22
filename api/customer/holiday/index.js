const express = require("express");
const models = require('../../../models');
const moment = require("moment")
const router = express.Router();
const support = require('../../../utils/support');
var REST = require("../../../utils/REST");
const { compare } = require('../../../utils/hash');
const auth = require('../../../utils/auth');
const axios = require('axios');
const { make } = require('simple-body-validator');





// create holiday
router.post("/create-holiday", async function (req, res) {
    const cUser = req.body.current_user;    
    try {        
        const rules = {
            name: 'required|string',
            date: 'required|string',
            template: 'required|integer',
        };
        const validator = make(req.body, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().first(), 422);
        }
        const findUser = await models.User.findOne({
            where: {
                id:cUser.id,
            }
        });
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        
        let holiday = await models.sequelize.transaction(async (transaction) => {
            let data = await models.holiday.create({
                user_id: cUser.id,
                name: req.body.name,
                date: req.body.date,
                template: req.body.template,
                created_by: cUser.id,
                image: req.body.image || null
            }, { transaction });
            return data;
        });
        return REST.success(res, holiday, "Holiday created successfully");
    } catch (error) {
        return REST.error(res, "Failed to create holiday", 500);
    }
});

// get all holidays
router.get("/get-all-holidays", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const holidays = await models.holiday.findAll({
            where: { user_id: cUser.id },
            attributes: ['id', 'user_id', 'name', 'date', 'template', 'status', 'created_by', 'updated_by', 'image', 'createdAt', 'updatedAt'],
            order: [['date', 'DESC']],
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                },
                {
                    model: models.User,
                    as: 'createdBy',
                },
                {
                    model: models.User,
                    as: 'updatedBy',
                }
            ]
        });
        return REST.success(res, holidays, "Holidays retrieved successfully");
    } catch (error) {
        return REST.error(res, "Failed to retrieve holidays", 500);
    }
});

module.exports = router;