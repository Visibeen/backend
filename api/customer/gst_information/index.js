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
|                                                 GST Information Management Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/
// create GST information
router.post("/create-gst-information", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findUser = await models.User.findOne({
            where: {
                id: cUser.id,
            }
        });
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        let gstInformation = await models.sequelize.transaction(async (transaction) => {
            let data = await models.gst_information.create({
                user_id: cUser.id,
                gst_details: req.body.gst_details,
                start_date:req.body.start_date,
                end_date:req.body.end_date,
                payment_details: req.body.payment_details,
                bank_name: req.body.bank_name,
                cheque_number: req.body.cheque_number,
                payment_with_gst: req.body.payment_with_gst,
                net_payment: req.body.net_payment,
                gst: req.body.gst,
                advance: req.body.advance,
                pending: req.body.pending,
                top_up_amount: req.body.top_up_amount,
                net_sale: req.body.net_sale,
                emi_date: req.body.emi_date ? moment(req.body.emi_date).toDate() : null,
                emi_payment_per_month: req.body.emi_payment_per_month,
                esc_amount_number: req.body.esc_amount_number,
                esc_bank_name: req.body.esc_bank_name,
                esc_ifsc_code: req.body.esc_ifsc_code,
                umrn_number: req.body.umrn_number,
                contact_person: req.body.contact_person,
                contact_number: req.body.contact_number,
                alternative_contact_number: req.body.alternative_contact_number,
            }, { transaction });
            return data;
        });
        return REST.success(res, gstInformation, 'GST information created successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Get GST information list
router.get("/get-gst-information", async function (req, res) {
    try {
        const gstInformation = await models.gst_information.findAll({
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                    attributes: ['id', 'name', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });
        return REST.success(res, gstInformation, 'GST information retrieved successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Get GST information by ID
router.get("/get-gst-information/:id", async function (req, res) {
    try {
        const gstInformation = await models.gst_information.findOne({
            where: { id: req.params.id },
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });
        if (!gstInformation) {
            return REST.error(res, 'GST information not found', 404);
        }
        return REST.success(res, gstInformation, 'GST information retrieved successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Update GST information
router.put("/update-gst-information/:id", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const data = req.body;
        const gstInformation = await models.gst_information.findOne({
            where: { id: req.params.id }
        });
        if (!gstInformation) {
            return REST.error(res, 'GST information not found', 404);
        }
        await gstInformation.update(data);
        return REST.success(res, gstInformation, 'GST information updated successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Delete GST information
router.delete("/delete-gst-information/:id", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const gstInformation = await models.gst_information.findOne({
            where: { id: req.params.id }
        });
        if (!gstInformation) {
            return REST.error(res, 'GST information not found', 404);
        }
        await gstInformation.destroy();
        return REST.success(res, null, 'GST information deleted successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router;