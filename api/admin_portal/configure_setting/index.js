const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const constants = require("../../../constants");
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const Sequelize = require('sequelize')



/*
|----------------------------------------------------------------------------------------------------------------
|                                      Term And Condtion Api's
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createTermCondtion', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const data = req.body
        let terms
        await models.sequelize.transaction(async (transaction) => {
            terms = await models.configure_setting.create({
                term_and_condition: data.term_and_condition,
                privacy_policy: data.privacy_policy,
                status: data.status,
                android_version: data.android_version,
                android_build_no: data.android_build_no,
                ios_version: data.ios_version,
                ios_build_no: data.ios_build_no,
                current_version: data.current_version,
                last_version: data.last_version,
                force_update: data.force_update,
                added_by: cUser.id,
            },
                {
                    transaction: transaction
                }
            )
        })
        if (cUser.role_id === 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "Terms And Conditions",
                title: "Terms And Conditions",
                details: `has added terms and conditions.`
            });
        }
        await models.user_activity_logs.create({
            user_id: cUser.id,
            activity: req.body.type == 'terms' ? 'TermsAndCondtion' : 'AppVersion',
            activity_id: terms.id,
            activity_type: req.body.type == 'terms' ? 'TermsAndCondtion' : 'AppVersion',
            current_data: terms,
            action: "Added",
            added_by: cUser.id
        });
        return REST.success(res, terms, 'Create Terms And Condtion Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/updateTermsAndCondtion/:id', async function (req, res) {
    const cUser = req.body.current_user;
    const { privacy_policy, term_and_condition } = req.body;
    try {
        const findTerms = await models.configure_setting.findOne({
            where: {
                id: req.params.id
            }
        })
        if (!findTerms) {
            return REST.error(res, 'Id Not Found', 404)
        }
        let terms
        await models.sequelize.transaction(async (transaction) => {
            terms = await models.configure_setting.update({
                term_and_condition: req.body.term_and_condition,
                privacy_policy: req.body.privacy_policy,
                status: req.body.status,
                android_version: req.body.android_version,
                android_build_no: req.body.android_build_no,
                ios_version: req.body.ios_version,
                ios_build_no: req.body.ios_build_no,
                current_version: req.body.current_version,
                last_version: req.body.last_version,
                force_update: req.body.force_update,
                updated_by: cUser.id
            },
                {
                    where: {
                        id: req.params.id
                    },
                    transaction: transaction
                }
            )
        })
        if (cUser.role_id === 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "Terms And Condition",
                title: "Terms And Conditions",
                details: `has updated terms and conditions.`
            });
        }
        const findNewTerm = await models.configure_setting.findOne({
            where: {
                id: req.params.id
            },
            attributes: ['id', 'status', 'android_version', 'android_build_no', 'ios_version', 'ios_build_no', 'current_version', 'last_version', 'force_update', 'added_by', 'updated_by'],
            raw: true,
        })
        const previousData = findTerms.dataValues;
        const current_data = {
            ...findNewTerm,
            term_and_condition: term_and_condition ? term_and_condition || null : null,
            privacy_policy: privacy_policy ? privacy_policy || null : null
        };
        await models.user_activity_logs.create({
            user_id: cUser.id,
            activity: req.body.type == 'terms' ? 'TermsAndCondtion' : 'AppVersion',
            activity_id: terms.id,
            activity_type: req.body.type == 'terms' ? 'TermsAndCondtion' : 'AppVersion',
            current_data,
            previous_data: previousData,
            action: "Updated",
            updated_by: cUser.id
        });
        return REST.success(res, findNewTerm, 'Updated Terms And Condtion Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getTermsAndCondtion', async function (req, res) {
    try {
        const data = await models.configure_setting.findAll({
            order: [["id", "DESC"]]
        })
        return REST.success(res, data, 'Data Fatched Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router