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
|                                                  EDMS Management Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/


// create  EDMS
router.post("/create-edms", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const rules = {
            name: 'required|string',
            business_name: 'required|string',
            address: 'required|string',
            email: 'required|email',
            contact_number: 'required|string',
            alternative_contact_number: 'string',
            website: 'string',
        };
        const validator = make(req.body, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().first(), 422);
        }

        let edms = await models.sequelize.transaction(async (transaction) => {
            let data = await models.edms.create({
                user_id: cUser.id,
                name:  req.body.name,
                business_name:  req.body.business_name,
                address:  req.body.address,
                email:  req.body.email,
                contact_number:  req.body.contact_number,
                alternative_contact_number:  req.body.alternative_contact_number,
                website:  req.body.website,
            }, { transaction });
            return data;
        });
        return REST.success(res, edms, 'EDMS created successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
// Get EDMS list
router.get("/get-edms", async function (req, res) {
    try {
        const edmsList = await models.edms.findAll({
            include:[
                {
                    model: models.User,
                    as: 'userdetails',
                }
            ],
            order: [['created_at', 'DESC']]
        });
        return REST.success(res, edmsList, 'Get EDMS list success.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Get EDMS by ID
router.get("/get-edms/:id", async function (req, res) {
    try {
        const edms = await models.edms.findOne({
            where: { id: req.params.id}
        });
        if (!edms) {
            return REST.error(res, 'EDMS not found.', 404);
        }
        return REST.success(res, edms, 'Get EDMS success.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Update EDMS
router.put("/update-edms/:id", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const data = req.body;
        const edms = await models.edms.findOne({
            where: { id: req.params.id}
        });
        if (!edms) {
            return REST.error(res, 'EDMS not found.', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            await edms.update({
                name: data.name,
                business_name: data.business_name,
                address: data.address,
                email: data.email,
                contact_number: data.contact_number,
                alternative_contact_number: data.alternative_contact_number,
                websit: data.websit,
            }, { transaction });
            return true;
        });
        return REST.success(res, edms, 'EDMS updated successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Delete EDMS
router.delete("/delete-edms/:id", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const data = await models.edms.findOne({
            where: { id: req.params.id }
        });
        if (!data) {
            return REST.error(res, 'EDMS not found.', 404);
        }
        const deletedEdms = await models.edms.destroy({
            where: { id: req.params.id }
        });
        return REST.success(res, deletedEdms, 'EDMS deleted successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router;