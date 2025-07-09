const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const axios = require('axios');
const { sendPushNotification, sendSubManager } = require('../../../utils/helper')
function removeCountryCode(phoneNumber) {
    return phoneNumber.replace(/^(\+91)/, '');
}
const { sendEmail } = require('../../../utils/helper')
const fs = require('fs');
const path = require('path');

const { getIoInstance } = require('../../../socket');
const safeEmit = (event, data) => {
    try {
        const io = getIoInstance();
        io.emit(event, data);
    } catch (error) {
        console.error('Socket.io not initialized:', error.message);
    }
};

/*
|----------------------------------------------------------------------------------------------------------------
|                                      Assigned Quotation Api's
|----------------------------------------------------------------------------------------------------------------
*/

router.post('/assignSubUser', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const userName = cUser.full_name
        const validator = make(req.body, {
            quotationData: "required|array"
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        for (const item of req.body.quotationData) {
            const itemValidator = make(item, {
                user_id: "required|integer",
                quotation_id: "required|integer"
            });
            if (!itemValidator.validate()) {
                return REST.error(res, itemValidator.errors().all(), 422);
            }
        }
        const userIds = req.body.quotationData.map(item => item.user_id);
        const findUsers = await models.User.findAll({
            where: { id: userIds }
        });
        if (findUsers.length !== userIds.length) {
            return REST.error(res, 'User not found', 404);
        }
        const quotationId = req.body.quotationData[0].quotation_id;
        const findQuotation = await models.quotation_store.findOne({
            where: { id: quotationId }
        });

        if (!findQuotation) {
            return REST.error(res, 'Quotation ID not found.', 404);
        }
        const findQuotationUid = findQuotation.store_quotation_id;
        const findCustomerID = findQuotation.customer_id;
        await models.sequelize.transaction(async (transaction) => {
            for (const item of req.body.quotationData) {
                const existingAssignment = await models.assigned_quotation.findOne({
                    where: {
                        user_id: item.user_id,
                        quotation_id: item.quotation_id
                    },
                    transaction
                });
                if (existingAssignment) {
                    await models.assigned_quotation.update(
                        { admin_assigned: item.admin_assigned },
                        {
                            where: {
                                user_id: item.user_id,
                                quotation_id: item.quotation_id
                            },
                            transaction
                        }
                    );
                } else {
                    if (item.admin_assigned) {
                        await models.assigned_quotation.create({
                            user_id: item.user_id,
                            quotation_id: item.quotation_id,
                            assigned_by: cUser.id,
                            admin_assigned: item.admin_assigned
                        }, { transaction });
                        await models.User.update(
                            { is_assigned: true },
                            { where: { id: item.user_id }, transaction }
                        );
                    }
                }
                const assignedManager = findUsers.find(user => user.id === item.user_id);
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: item.user_id,
                    title: "Query Assigned",
                    messages: `Hi ${assignedManager?.full_name || "Manager"}, you have been assigned to query ${findQuotationUid} by ${userName}.`,
                    notification_type: "Solutions"
                }, { transaction });
                safeEmit('send_notification', {
                    sender_id: cUser.id,
                    reciver_id: item.user_id,
                    title: "Query Assigned",
                    message: `Hi ${assignedManager?.full_name || "Manager"}, you have been assigned to query ${findQuotationUid} by ${userName}.`,
                    notification_type: "Solutions"
                });

                const findReceiverToken = await models.User.findOne({
                    where: { id: findCustomerID },
                });
                if (findReceiverToken && findReceiverToken.device_token) {
                    const userFullName = findUsers.find(user => user.id === item.user_id)?.full_name || "Team Manager";
                    const notificationData = {
                        device_token: findReceiverToken.device_token,
                        messages: `Indi-link Team Manager ${userFullName} has been assigned to your query (${findQuotationUid}).`
                    };
                    await sendPushNotification(notificationData);
                }
                if (findReceiverToken.email) {
                    const subject = `IndiLink Support: Query ${findQuotationUid} Assigend`;
                    const templatePath = path.join(__dirname, '..', '..', '..', 'templates', 'assgined_query_template.html');
                    let htmlContent = fs.readFileSync(templatePath, 'utf8');
                    htmlContent = htmlContent
                        .replace(/{{full_name}}/g, findReceiverToken.full_name)
                        .replace(/{{query_id}}/g, findQuotationUid);
                    await sendEmail(findReceiverToken.email, subject, htmlContent);
                }
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findCustomerID,
                    title: "Manager Assigned",
                    messages: `Indi-link Team Manager ${findUsers.find(user => user.id === item.user_id)?.full_name || "Team Manager"} is assigned to query ${findQuotationUid}.`,
                    notification_type: "Solutions"
                }, { transaction });
            }
        });
        if (cUser.role_id === 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "Assignee",
                title: "Assigned Query",
                details: `has assigned ${findQuotationUid} to ${findUsers.map(user => user.full_name).join(', ')} manager.`
            });
        }
        return REST.success(res, null, 'Assigned Subuser Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getAllSubUser', async function (req, res) {
    try {
        const { quotation_id } = req.query;
        const users = await models.User.findAll({
            where: { role_id: '4' },
            order: [["id", "DESC"]],
            attributes: ['id', 'full_name', 'role_id'],
            raw: true
        });

        if (quotation_id) {
            const assignedUsers = await models.assigned_quotation.findAll({
                where: { quotation_id },
                attributes: ['user_id', 'admin_assigned'],
                raw: true
            });
            const assignedUserMap = new Map();
            assignedUsers.forEach(user => {
                assignedUserMap.set(Number(user.user_id), Boolean(user.admin_assigned));
            });
            users.forEach(user => {
                user.admin_assigned = assignedUserMap.get(Number(user.id)) || false;
            });
        } else {
            users.forEach(user => {
                user.admin_assigned = false;
            });
        }
        return REST.success(res, users, 'Get All SubUsers');
    } catch (error) {
        return REST.error(res, 'Internal Server Error', 500);
    }
});

module.exports = router