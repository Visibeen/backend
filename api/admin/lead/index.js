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
const { compare, gen } = require('../../../utils/hash');
const auth = require('../../../utils/auth');
const axios = require('axios');
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt');
const { log } = require('console');



/*
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                 Leeds Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

router.post('/add-lead', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const validationRules = {
            email: 'required|email',
            business_name: 'required|string',
            category: 'required|string',
            website: 'required|string',
            first_name: 'required|string',
            last_name: 'required|string',
            contact_email: 'required|email',
            phone_number: 'required|string',
        };
        const validator = make(req.body, validationRules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        let leadRecord = await models.sequelize.transaction(async (transaction) => {
            let leadData = await models.lead.create({
                user_id: cUser.id,
                employee_id: req.body.employee_id,
                business_name: req.body.business_name,
                category: req.body.category,
                email: req.body.email,
                website: req.body.website,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                contact_email: req.body.contact_email,
                phone_number: req.body.phone_number,
                alt_number: req.body.alt_number,
                tags: req.body.tags,
                type: req.body.type,
                address_line1: req.body.address_line1,
                address_line2: req.body.address_line2,
                city: req.body.city,
                state: req.body.state,
                zip_code: req.body.zip_code,
                country: req.body.country,
                comment: req.body.comment,
                created_by: cUser.id
            }
                , { transaction });
            return leadData;
        });
        return REST.success(res, leadRecord, 'Lead added successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.get('/get-leads', async function (req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        const { count, rows: leads } = await models.lead.findAndCountAll({
            include: [
                {
                    model: models.User,
                    as: "userDetails"
                },
                {
                    model: models.employee,
                    as: "employeeDetails"
                }
            ],
            order: [['created_at', 'DESC']],
            limit: pageSize,
            offset: offset
        });
        const totalPages = Math.ceil(count / pageSize);
        return REST.success(res, { leads, totalItems: count, totalPages, currentPage: page }, 'Lead fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.get('/get-leads/:id', async function (req, res) {
    try {
        const leadId = req.params.id;
        const lead = await models.lead.findOne({
            where: { id: leadId },
            include: [
                {
                    model: models.User,
                    as: "userDetails"
                },
                {
                    model: models.employee,
                    as: "employeeDetails"
                }
            ],
        });
        if (!lead) {
            return REST.error(res, 'Leads not found', 404);
        }
        return REST.success(res, lead, 'Lead fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.put('/update-leads/:id', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const findLead = await models.lead.findOne({
            where: {
                id: req.params.id
            }
        })
        if (!findLead) {
            return REST.error(res, 'Leads not found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            await models.lead.update({
                business_name: req.body.business_name,
                category: req.body.category,
                email: req.body.email,
                website: req.body.website,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                contact_email: req.body.contact_email,
                phone_number: req.body.phone_number,
                alt_number: req.body.alt_number,
                tags: req.body.tags,
                type: req.body.type,
                address_line1: req.body.address_line1,
                address_line2: req.body.address_line2,
                city: req.body.city,
                state: req.body.state,
                zip_code: req.body.zip_code,
                country: req.body.country,
                comment: req.body.comment,
                is_website_service: req.body.is_website_service,
                is_gmb_services: req.body.is_gmb_services,
                is_smo_services: req.body.is_smo_services,
                is_other_services: req.body.is_other_services,
                updated_by: cUser.id
            },
                {
                    where: {
                        id: req.params.id
                    }
                }, { transaction: transaction })
        })
        const findNewLeads = await models.lead.findOne({
            where: {
                id: req.params.id
            }
        })
        return REST.success(res, findNewLeads, 'Lead updated successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.delete('/delete-leads/:id', async function (req, res) {
    try {
        const leadId = req.params.id
        const findLead = await models.lead.findOne({
            where: {
                id: leadId
            }
        })
        if (!findLead) {
            return REST.error(res, 'Leads not found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            await models.lead.destroy({ where: { id: leadId }, transaction });
        });
        return REST.success(res, {}, 'Lead deleted successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
module.exports = router