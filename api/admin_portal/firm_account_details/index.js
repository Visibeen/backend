const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const constants = require("../../../constants/index")

/*
|----------------------------------------------------------------------------------------------------------------
|              Firm Account Details Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/create_acount', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const validator = make(req.body, {
            user_id: "required|string",
            firm_id: "required|integer",
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const accountSchema = {
            account_holder_name: "required|string",
            account_holder_number: "required|integer",
            bank_name: "required|string",
            ifsc_code: "required|string",
            branch_name: "required|string",
            cancelled_cheque: "required|string"
        };

        for (let account of req.body.accountData) {
            const accountValidations = make(account, accountSchema);
            if (!accountValidations.validate()) {
                return REST.error(res, accountValidations.errors().all(), 422);
            }
        }
        const firm = await models.User_firm.findByPk(req.body.firm_id);
        if (!firm) {
            throw new Error('Firm not found');
        }
        const firmType = await models.Firm_type.findByPk(firm.firm_type);
        const accountData = req.body.accountData;
        for (let i = 0; i < accountData.length; i++) {
            await models.sequelize.transaction(async (transaction) => {
                const data = await models.Account_details.create({
                    user_id: req.body.user_id,
                    firm_id: req.body.firm_id,
                    account_holder_name: accountData[i].account_holder_name,
                    account_holder_number: accountData[i].account_holder_number,
                    bank_name: accountData[i].bank_name,
                    ifsc_code: accountData[i].ifsc_code,
                    branch_name: accountData[i].branch_name,
                    cancelled_cheque: accountData[i].cancelled_cheque,
                    status: constants.ACCOUNT_DETAILS.STATUSES.VERIFIED,
                    added_by: cUser.id
                }, {
                    transaction: transaction
                });
                await models.user_activity_logs.create({
                    user_id: req.body.user_id,
                    activity: 'Firm',
                    activity_id: firm.id,
                    activity_type: "firm_account_details",
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id

                });
                return data;
            });
        }
        if (firmType.name === "Limited Liability Partnership(LLP)" || firmType.name === "Public Limited" || firmType.name === "Private Limited") {
            let findShareholders = await models.firm_shareholders.findAll({ where: { firm_id: firm.id } })
            if (findShareholders.length > 0) {
                await models.User_firm.update(
                    { is_completed: 1 },
                    { where: { id: firm.id } }
                );
            }
        }
        if (firmType.name === "Partnership") {
            let findPartner = await models.Partner_ship.findAll({ where: { firm_id: firm.id } })
            if (findPartner.length > 0) {
                await models.User_firm.update(
                    { is_completed: 1 },
                    { where: { id: firm.id } }
                );
            }
        }
        const findAccount = await models.Account_details.findAll({ where: { id: req.body.user_id } });
        return REST.success(res, findAccount, 'Account Created Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post('/update_account', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        var accounts;
        const validator = make(req.body, {
            accountId: 'required|numeric',
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        accounts = await models.Account_details.findOne({ where: { id: req.body.accountId } });
        if (!accounts) {
            return REST.error(res, 'Account Id not found.', 404);
        }
        const firms = await models.User_firm.findOne({ where: { id: accounts.firm_id } });
        const data = req.body;
        let verify_status = accounts.verify_status;
        if (data.cancelled_cheque !== undefined || data.ifsc_code !== undefined) {
            verify_status = "verify";
        }
        await models.sequelize.transaction(async (transaction) => {
            await models.Account_details.update(
                {
                    account_holder_name: data.account_holder_name,
                    account_holder_number: data.account_holder_number,
                    bank_name: data.bank_name,
                    ifsc_code: data.ifsc_code,
                    branch_name: data.branch_name,
                    cancelled_cheque: data.cancelled_cheque,
                    verify_status: verify_status,
                    status: constants.ACCOUNT_DETAILS.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                {
                    where: { id: req.body.accountId },
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
        await models.sequelize.transaction(async (transaction) => {
            const findAcount = await models.Account_details.findOne({ where: { id: req.body.accountId } })
            const previousData = accounts.dataValues;
            delete req.body.current_user;
            const currentData = findAcount.dataValues;
            const activityLog = {
                user_id: accounts.user_id,
                activity: `Firm`,
                activity_id: firms.id,
                activity_type: 'firm_account_details',
                previous_data: previousData,
                current_data: currentData,
                updated_by: cUser.id,
                action: "Updated"
            };
            await models.user_activity_logs.create(activityLog, { transaction: transaction });
        })
        return REST.success(res, data, 'Update Account details success.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

module.exports = router