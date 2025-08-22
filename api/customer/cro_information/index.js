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



// create CRO information
router.post("/create-cro-information", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const rules = {
            cro_employee_name: 'required|string',
            seo_employee_name: 'required|string',
            cro_category: 'required|string',
            fa_account: 'required|string',
            seo_post_period: 'required|string',
            total_post: 'required|integer',
            report_period: 'required|string',
            client_status: 'required|string',
            email: 'required|email',
            password: 'required|string',
            recory_email: 'required|email',
            recory_password: 'required|string',
            google_account: 'string',
            location: 'string',
        };
        const validator = make(req.body, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().first(), 422);
        }
        const findUser = await models.User.findOne({
            where: {
                id: cUser.id,
            }
        });
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        let croInformation = await models.sequelize.transaction(async (transaction) => {
            let data = await models.cro_information.create({
                user_id: cUser.id,
                cro_employee_name: req.body.cro_employee_name,
                seo_employee_name: req.body.seo_employee_name,
                cro_category: req.body.cro_category,
                fa_account: req.body.fa_account,
                seo_post_period: req.body.seo_post_period,
                total_post: req.body.total_post,
                report_period: req.body.report_period,
                client_status:req.body.client_status,
                email: req.body.email,
                password: req.body.password,
                recory_email: req.body.recory_email,
                recory_password: req.body.recory_password,
                google_account: req.body.google_account,
                location: req.body.location
            }, { transaction });
            return data;
        });
        return REST.success(res, croInformation, 'CRO information created successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Get CRO information list
router.get("/get-cro-information", async function (req, res) {
    try {
        const croInformation = await models.cro_information.findAll({
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                }
            ],
            order: [['created_at', 'DESC']]
        });
        return REST.success(res, croInformation, 'Get CRO information list success.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Get CRO information by ID
router.get("/get-cro-information/:id", async function (req, res) {
    try {
        const croInformation = await models.cro_information.findOne({
            where: { id: req.params.id }
        });
        if (!croInformation) {
            return REST.error(res, 'CRO information not found.', 404);
        }
        return REST.success(res, croInformation, 'CRO information retrieved successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Update CRO information
router.put("/update-cro-information/:id", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const data = req.body;
        const croInformation = await models.cro_information.findOne({
            where: { id: req.params.id }
        });
        if (!croInformation) {
            return REST.error(res, 'CRO information not found', 404);
        }
        await croInformation.update(data);
        return REST.success(res, croInformation, 'CRO information updated successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Delete CRO information
router.delete("/delete-cro-information/:id", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const croInformation = await models.cro_information.findOne({
            where: { id: req.params.id }
        });
        if (!croInformation) {
            return REST.error(res, 'CRO information not found', 404);
        }
        await croInformation.destroy();
        return REST.success(res, null, 'CRO information deleted successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});     
module.exports = router;