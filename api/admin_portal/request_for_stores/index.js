const { make } = require('simple-body-validator');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const { where } = require('sequelize');
const router = express.Router();
const Sequelize = require('sequelize')
const { sendPushNotification } = require('../../../utils/helper')
const support = require('../../../utils/support')


/*
|----------------------------------------------------------------------------------------------------------------
|             Requests Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/getRequest', async function (req, res) {
    try {
        const data = await models.request_for_store.findAll({
            where: { status: "pending" },
            include: [
                {
                    model: models.User,
                    as: "requested_by"
                }
            ],
        })
        return REST.success(res, data, 'Get request success')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/updateStatus/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findrequest = await models.request_for_store.findOne({
            where: { id: req.params.id }
        });
        if (!findrequest) {
            return REST.error(res, 'Id Not Found', 404);
        }
        const findUsers = await models.User.findOne({
            where: {
                id: findrequest.user_id
            }
        })
        const findkmp = await models.Key_management.findAll({
            where: { user_id: findUsers.id },
        });
        const keyManagerIds = [];
        if (findkmp && findkmp.length > 0) {
            const keyManagementIds = findkmp.map(kmp => kmp.id);
            const keyManagers = await models.User.findAll({
                where: {
                    key_mangement_id: keyManagementIds
                }
            });
            keyManagerIds.push(...keyManagers.map(keyManager => keyManager.id));
        }
        registeredPartnerIds = [findUsers.id, ...keyManagerIds];

        let sectionUid = null;
        if (findrequest.dataValues.section_name === "store") {
            const stores = await models.stores.findOne({
                where: { id: findrequest.section_id }
            });
            sectionUid = stores?.dataValues?.store_uid;
        } else if (findrequest.dataValues.section_name === "move") {
            const move = await models.move_details.findOne({
                where: { id: findrequest.section_id }
            });
            sectionUid = move?.dataValues?.move_uid;
        } else if (findrequest.dataValues.section_name === "perpare") {
            const prepare = await models.prepare_details.findOne({
                where: { id: findrequest.section_id }
            });
            sectionUid = prepare?.dataValues?.prepare_uid;
        } else if (findrequest.dataValues.section_name === "firm") {
            const firm = await models.User_firm.findOne({
                where: { id: findrequest.section_id }
            })
            sectionUid = firm?.dataValues?.firm_uid
        }
        const actions = findrequest.action;
        let actionTitle = "";
        if (actions === 'edit') {
            actionTitle = 'Edit';
        } else if (actions === 'add') {
            actionTitle = 'Add';
        }
        const sectionKeyField = findrequest.section_key;
        const findUser = await models.User.findOne({
            where: { id: findrequest.user_id }
        });
        if (!findUser) {
            return REST.error(res, 'User Not Found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            let updateData = {
                request_reason: req.body.request_reason,
                is_requested: req.body.is_requested
            };
            if (req.body.is_requested === "rejected") {
                updateData.status = "verified";
            }
            await models.request_for_store.update(updateData, {
                where: { id: findrequest.id },
                transaction
            });
            const requestReason = req.body.request_reason;
            let newIsRequested = req.body.is_requested;
            let title;
            let notificationMessage;
            if (newIsRequested === 'accepted') {
                notificationMessage = `Your Basic Information ${sectionKeyField} request has been approved.`;
                title = `Request Approved`
            } else if (newIsRequested === 'rejected') {
                notificationMessage = `Your Basic Information ${sectionKeyField} request has been declined due to ${requestReason}.`;
                title = `Request Declined`
            }
            let notificationType;
            if (findrequest.dataValues.section_name === "store") {
                notificationType = "Store Management";
            } else if (findrequest.dataValues.section_name === "move") {
                notificationType = "Move Management";
            } else if (findrequest.dataValues.section_name === "perpare") {
                notificationType = "Perpare Management";
            } else if (findrequest.dataValues.section_name === "firm") {
                notificationType = "Firm Managament";
            }
            const findReciverToken = await models.User.findOne({
                where: { id: registeredPartnerIds }
            });
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, notificationMessage)
            await models.notification.create(
                {
                    sender_id: cUser.id,
                    reciver_id: findReciverToken.id,
                    title: `${actionTitle} ${title} ${sectionUid}`,
                    messages: notificationMessage,
                    notification_type: notificationType
                },
                { transaction }
            );
            return REST.success(res, null, 'Status Update Successfully');
        });
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router