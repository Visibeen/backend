const { gen, compare } = require('../../utils/hash');
const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const dbHelper = require('../../utils/dbHelper');
const express = require("express");
const models = require('../../models');
const REST = require("../../utils/REST");
const { LOG } = require('../../constants');
const router = express.Router();
const sequelize = require('sequelize')
const cron = require('node-cron');
const { sendPushNotification } = require('../../utils/helper')
const moment = require('moment');


/*
|----------------------------------------------------------------------------------------------------------------
|              Quotation Terminate  Apis
|----------------------------------------------------------------------------------------------------------------
*/

router.get('/terminateQuotation', async function (req, res) {
    try {
        const findAdmin = await models.User.findOne({
            where: {
                role_id: "3"
            }
        })
        const AdminId = findAdmin.id
        const quotations = await models.quotation_store.findAll({
            attributes: ["id", "store_quotation_id", "end_date", "customer_id", "quotation_status"],
            raw: true
        });
        const formatedDates = await formattedQuotationsDate(quotations);
        const currentDate = moment();
        const notifyBeforeDays = [30, 15, 5, 4, 3, 2, 1];
        for (const quotation of quotations) {
            const endDate = moment(quotation.end_date, 'DD/MM/YYYY', true);
            const customer = await models.User.findByPk(quotation.customer_id);
            if (!customer || !customer.device_token) continue;
            for (const days of notifyBeforeDays) {
                const notifyDate = endDate.clone().subtract(days, 'days');
                if (notifyDate.isSame(currentDate, 'day')) {
                    const messageBeforeExpire = `Please be advised that query ${quotation.store_quotation_id} will be closed if not renewed by ${endDate.format('DD/MM/YYYY')}.`;
                    await models.notification.create({
                        sender_id: AdminId,
                        reciver_id: customer.id,
                        title: 'Quotation Expiry Reminder',
                        messages: messageBeforeExpire,
                        notification_type: "Store Management"
                    });
                    await sendPushNotification({
                        device_token: customer.device_token,
                        messages: messageBeforeExpire
                    });
                    if (days === 30) {
                        await models.quotation_store.update(
                            {
                                status: 'due_for_renewal',
                                is_renewal: true
                            },
                            { where: { id: quotation.id } }
                        );
                    }
                    break;
                }
            }

            if (endDate.isBefore(currentDate, 'day')) {
                const assets = await models.quotation_assigned_assets.findAll({
                    where: { quotations_id: quotation.id },
                    attributes: ["id", "quotations_id", 'chamber_id', "assigned_pallets"],
                });

                for (const asset of assets) {
                    const chamber = await models.store_chambers.findByPk(asset.chamber_id);
                    if (chamber) {
                        const palletsToRestore = Number(asset.assigned_pallets) || 0;
                        const updatedAvailable = (Number(chamber.available_pallets) || 0) + palletsToRestore;
                        const updatedUnavailable = (Number(chamber.unavailable_pallets) || 0) - palletsToRestore;

                        await models.store_chambers.update({
                            available_pallets: updatedAvailable,
                            unavailable_pallets: updatedUnavailable
                        }, { where: { id: chamber.id } });
                    }

                    await models.quotation_assigned_assets.update(
                        { assigned_pallets: 0 },
                        { where: { id: asset.id } }
                    );
                }

                const messageAfterRevoke = `Your query ${quotation.store_quotation_id} has been closed. Looking forward to continued collaboration.`;
                await models.notification.create({
                    sender_id: AdminId,
                    reciver_id: customer.id,
                    title: 'Quotation Closed',
                    messages: messageAfterRevoke,
                    notification_type: "Store Management"
                });

                await sendPushNotification({
                    device_token: customer.device_token,
                    messages: messageAfterRevoke
                });
                await models.quotation_store.update(
                    {
                        status: 'completed',
                        quotation_status: "completed"
                    },
                    { where: { id: quotation.id } }
                );
                const findNewQuotation = await models.quotation_store.findOne({
                    where: {
                        id: quotation.id
                    }
                })
                await models.quotation_action.create({
                    user_id: AdminId,
                    quotation_id: findNewQuotation.id,
                    quotation_action: "Complete",
                    status: "Complete",
                    title: 'Updated_by',
                    updated_by: AdminId,
                });
            }
        }
        return REST.success(res, formatedDates, 'Quotation Terminated Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
const formattedQuotationsDate = async (quotationsDates) => {
    try {
        const today = moment().startOf('day');
        const notifyBeforeDays = [30, 15, 5, 4, 3, 2, 1];
        const formattedQuotations = quotationsDates.map(q => {
            const originalDateStr = q.end_date;
            const endDate = moment(originalDateStr, 'DD/MM/YYYY', true);
            if (!endDate.isValid()) {
                console.error(`Invalid date format: ${originalDateStr}`);
                return {
                    end_date: originalDateStr,
                    notifications: []
                };
            }
            const notifications = notifyBeforeDays.map(days => {
                const notifyDate = endDate.clone().subtract(days, 'days');
                return {
                    days_before: days,
                    notify_date: notifyDate.format('DD/MM/YYYY'),
                    notify_today: notifyDate.isSame(today, 'day')
                };
            });
            return {
                id: q.id,
                end_date: originalDateStr,
                notifications
            };
        });

        return formattedQuotations;
    } catch (error) {
        console.error("Error in formattedQuotationsDate: ", error.message);
        return [];
    }
};

module.exports = router