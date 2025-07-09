const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const constants = require("../../../constants");
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();

/*
|----------------------------------------------------------------------------------------------------------------
|              Firm Key Managements Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/create_management', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const validator = make(req.body, {
            user_id: "required|string",
            firm_id: "required|string",
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const kmp = {
            full_name: "required|string",
            email: "required|string|email",
            phone_number: "required|string",
            designation: "required|string",
            address: "required|string",
            city: "required|string",
            state: "required|string",
            pin_code: "required|string",
            aadhar_card: "required|string",
        }
        for (let keymanagement of req.body.keyData) {
            const keymanagementValidations = make(keymanagement, kmp)
            if (!keymanagementValidations.validate()) {
                return REST.error(res, keymanagementValidations.errors().all(), 422);
            }
        }
        const findFirm = await models.User_firm.findByPk(req.body.firm_id)
        if (!findFirm) {
            return REST.error(res, 'Firm not found', 404);
        }
        const keyData = req.body.keyData
        for (let i = 0; i < keyData.length; i++) {
            await models.sequelize.transaction(async (transaction) => {
                const data = await models.Key_management.create({
                    user_id: req.body.user_id,
                    firm_id: req.body.firm_id,
                    full_name: keyData[i].full_name,
                    email: keyData[i].email,
                    phone_number: keyData[i].phone_number,
                    designation: keyData[i].designation,
                    address: keyData[i].address,
                    country: keyData[i].country,
                    state: keyData[i].state,
                    city: keyData[i].city,
                    aadhar_card: keyData[i].aadhar_card,
                    pin_code: keyData[i].pin_code,
                    platform_role: keyData[i].platform_role,
                    status: constants.KEY_MANAGEMENT.STATUSES.VERIFIED,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                const kmp_ids = req.body.request_id ? findrequest.user_id : req.body.user_id;
                await models.user_activity_logs.create({
                    user_id: req.body.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Firm',
                    activity_id: findFirm.id,
                    activity_type: "firm_key_management",
                    current_data: {
                        key_management: [data]
                    },
                    action: "Added",
                    added_by: cUser.id
                });
                return data;
            })
        }
        const findKeyData = await models.Key_management.findAll({ where: { id: req.body.user_id } })
        return REST.success(res, findKeyData, 'Key Management Create Successfully');

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.post('/update', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        var management;
        const validator = make(req.body, {
            managementId: 'required|numeric',
            user_id: "required|numeric",
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        management = await models.Key_management.findOne({ where: { id: req.body.managementId } })
        if (!management) {
            return REST.error(res, 'Key management Id not found', 400);
        }
        const firms = await models.User_firm.findOne({ where: { id: management.firm_id } });
        const data = req.body;
        await models.sequelize.transaction(async (transaction) => {
            await models.Key_management.update(
                {
                    user_id: data.user_id,
                    full_name: data.full_name,
                    phone_number: data.phone_number,
                    designation: data.designation,
                    address: data.address,
                    country: data.country,
                    state: data.state,
                    city: data.city,
                    aadhar_card: data.aadhar_card,
                    pin_code: data.pin_code,
                    platform_role: data.platform_role,
                    status: constants.KEY_MANAGEMENT.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                {
                    where: { id: req.body.managementId },
                    transaction: transaction
                }
            );
            await models.User_firm.update({
                last_updated_by: cUser.id
            }, {
                where: { id: firms.id },
                transaction: transaction
            });
        })
        const kmp_ids = req.body.request_id ? findrequest.user_id : management.user_id;
        await models.sequelize.transaction(async (transaction) => {
            const keymanagement = await models.Key_management.findOne({ where: { id: req.body.managementId } })
            const previousData = {
                key_management: [management.dataValues]
            }
            delete req.body.current_user;
            const currentData = {
                key_management: [keymanagement.dataValues]
            };
            const activityLog = {
                user_id: management.user_id,
                kmp_id: kmp_ids,
                activity: `Firm `,
                activity_id: management.id,
                activity_type: "firm_key_management",
                previous_data: previousData,
                current_data: currentData,
                updated_by: cUser.id,
                action: "Updated"
            };
            await models.user_activity_logs.create(activityLog, { transaction: transaction });
        })
        return REST.success(res, null, 'Update key management success.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router



