const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const support = require('../../../utils/support');
const constants = require("../../../constants/index")

/*
|----------------------------------------------------------------------------------------------------------------
|              Firm Branches Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/create', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const validator = make(req.body, {
            user_id: "required|numeric",
            firm_id: 'required|numeric',
            firm_type: 'required|numeric',
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const Branches = {
            branch_name: "required|string",
            branch_address: "required|string",
            branch_head: "required|string",
            branch_email: "required|string",
            branch_phone_number: "required|string"
        }
        for (let branch of req.body.branchdata) {
            const branchValidations = make(branch, Branches)
            if (!branchValidations.validate()) {
                return REST.error(res, branchValidations.errors().all(), 422);
            }
        }
        const findrequest = await models.request_for_store.findOne({
            where: {
                id: req.body.request_id ?? null,
            }
        })
        const findFirm = await models.User_firm.findByPk(req.body.firm_id);
        if (!findFirm) {
            return REST.error(res, 'Firm not found', 404);
        }
        const firmType = await models.Firm_type.findByPk(findFirm.firm_type)
        var branchdata = req.body.branchdata;
        for (var i = 0; i < branchdata.length; i++) {
            var firmData = await models.sequelize.transaction(async (transaction) => {
                const data = await models.Branch.create({
                    user_id: req.body.user_id,
                    firm_id: req.body.firm_id,
                    firm_type: req.body.firm_type,
                    branch_name: branchdata[i].branch_name,
                    branch_address: branchdata[i].branch_address,
                    branch_gst: branchdata[i].branch_gst,
                    branch_head: branchdata[i].branch_head,
                    branch_email: branchdata[i].branch_email,
                    branch_phone_number: branchdata[i].branch_phone_number,
                    status: constants.FIRM_BRANCHES.STATUSES.VERIFIED,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                const kmp_ids = req.body.request_id ? findrequest.user_id :req.body.user_id;
                await models.user_activity_logs.create({
                    user_id: req.body.user_id,
                    kmp_id :kmp_ids,
                    activity: 'Firm',
                    activity_id: findFirm.id,
                    activity_type: "firm_branches",
                    current_data: {
                        branches: [data]
                    },
                    action: "Added",
                    added_by: cUser.id
                });
                return data;
            })
        }
        if (firmType.name === "Limited Liability Partnership(LLP)" || firmType.name === "Public Limited" || firmType.name === "Private Limited") {
            let findShareholders = await models.firm_shareholders.findAll({ where: { firm_id: findFirm.id } })
            if (findShareholders.length > 0) {
                await models.User_firm.update(
                    { is_completed: 1 },
                    { where: { id: findFirm.id } }
                );
            }
        }
        if (firmType.name === "Partnership") {
            let findPartner = await models.Partner_ship.findAll({ where: { firm_id: findFirm.id } })
            if (findPartner.length > 0) {
                await models.User_firm.update(
                    { is_completed: 1 },
                    { where: { id: findFirm.id } }
                );
            }
        }

        if (findrequest) {
            await models.request_for_store.update({
                status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                updated_by: cUser.id
            },
                {
                    where: {
                        id: req.body.request_id ?? null,
                    }
                })
        }
        return REST.success(res, firmData, 'Branch has create successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.post('/update', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        var findBranch;
        const validator = make(req.body, {
            user_id: "required|numeric",
            branchid: 'required|numeric',
            firm_id: 'required|numeric',
            firm_type: 'required|numeric'
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        findBranch = await models.Branch.findOne({ where: { id: req.body.branchid } })
        if (!findBranch) {
            return REST.error(res, 'Branch ID not valid', 400);
        }
        const findrequest = await models.request_for_store.findOne({
            where: {
                id: req.body.request_id ?? null,
            }
        })
        const firms = await models.User_firm.findOne({ where: { id: findBranch.firm_id } });
        await models.sequelize.transaction(async (transaction) => {
            await models.Branch.update(
                {
                    user_id: req.body.user_id,
                    firm_id: req.body.firm_id,
                    firm_type: req.body.firm_type,
                    branch_name: req.body.branch_name,
                    branch_address: req.body.branch_address,
                    branch_gst: req.body.branch_gst,
                    branch_head: req.body.branch_head,
                    branch_email: req.body.branch_email,
                    branch_phone_number: req.body.branch_phone_number,
                    status: constants.FIRM_BRANCHES.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                {
                    where: { id: req.body.branchid },
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
        const kmp_ids = req.body.request_id ? findrequest.user_id : findBranch.user_id;
        await models.sequelize.transaction(async (transaction) => {
            const findFirm1 = await models.Branch.findOne({ where: { id: req.body.branchid } })
            const previousData = {
                branches: [findBranch.dataValues]
            };
            delete req.body.current_user;
            const currentData = {
                branches: [findFirm1.dataValues]
            }
            const activityLog = {
                user_id: findBranch.user_id,
                kmp_id: kmp_ids,
                activity: `Firm`,
                activity_id: firms.id,
                activity_type: "firm_branches",
                previous_data: previousData,
                current_data: currentData,
                updated_by: cUser.id,
                action: "Updated"
            };
            await models.user_activity_logs.create(activityLog, { transaction: transaction });
        })

        if (findrequest) {
            await models.request_for_store.update({
                status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                updated_by: cUser.id
            },
                {
                    where: {
                        id: req.body.request_id ?? null,
                    }
                })
        }
        return REST.success(res, null, 'Branch updated successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router