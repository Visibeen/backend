const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const { LOG } = require('../../../constants');
const router = express.Router();
const sequelize = require('sequelize')

/*
|----------------------------------------------------------------------------------------------------------------
|                    Quotation Document Comments  Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createComment', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findquotation = await models.quotation_store.findOne({
            where: {
                id: req.body.quotation_id
            }
        })
        if (!findquotation) {
            return REST.error(res, 'Quotation Id Not Found', 404);
        }
        const quotationUid = findquotation.store_quotation_id
        const comment = await models.sequelize.transaction(async (transaction) => {
            const data = await models.quotation_comment.create({
                user_id: req.body.user_id,
                quotation_id: req.body.quotation_id,
                comment: req.body.comment,
                added_by: cUser.id,
            },
                {
                    transaction: transaction
                }
            )
            return data
        });
        if (cUser.role_id === 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "Query",
                title: "Comment",
                details: `has commented in ${quotationUid}.`
            });
        }
        return REST.success(res, comment, 'Comment create Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getComment/:store_quotation_id', async function (req, res) {
    try {
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: req.params.store_quotation_id
            }
        })
        if (!findQuotation) {
            return REST.error(res, 'Quotation Id Not Found', 404);
        }

        const data = await models.quotation_comment.findAll({
            where: {
                quotation_id: findQuotation.id
            },
            attributes: ["id", "user_id", "quotation_id", "comment", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ]
        })
        data.forEach(store => {
            store.addedBy.dataValues.created_at = store.createdAt
        })
        return REST.success(res, data, 'Get Comment Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})

/*
|----------------------------------------------------------------------------------------------------------------
|                    Legal Document Comment  Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createCommentLegalDoc', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findStore = await models.stores.findOne({
            where: {
                id: req.body.store_id
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store Id Not Found', 404);
        }
        const comment = await models.sequelize.transaction(async (transaction) => {
            const data = await models.quotation_comment.create({
                user_id: req.body.user_id,
                store_id: req.body.store_id,
                comment: req.body.comment,
                added_by: cUser.id,
            },
                {
                    transaction: transaction
                }
            )
            return data;
        })
        return REST.success(res, comment, 'Comment create Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getLegalComments/:store_uid', async function (req, res) {
    try {
        const findStore = await models.stores.findOne({
            where: {
                store_uid: req.params.store_uid
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store Id Not Found', 404);
        }
        const data = await models.quotation_comment.findAll({
            where: {
                store_id: findStore.id
            },
            attributes: ["id", "user_id", "store_id", "comment", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ]
        })
        data.forEach(store => {
            store.addedBy.dataValues.created_at = store.createdAt
        })
        return REST.success(res, data, 'Get Comment Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router