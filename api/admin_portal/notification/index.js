const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();


/*
|----------------------------------------------------------------------------------------------------------------
|              Admin Notification Apis
|----------------------------------------------------------------------------------------------------------------
*/
function parseIsRead(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}
router.get('/getAdminNotification', async function (req, res) {
    try {
        const cUser = req.body.current_user;
        const role_id = req.query.role_id;
        const user_id = req.query.user_id
        const findUser = await models.User.findOne({
            where: {
                role_id: role_id
            }
        });
        if (!findUser) {
            return REST.error(res, 'User  not found.', 404);
        }
        let data;
        if (findUser.role_id === 3) {
            data = await models.notification.findAll({
                where: {
                    reciver_id: 0
                },
                order: [["id", "DESC"]],
                include: [
                    {
                        model: models.User,
                        as: "senderDetails"
                    }
                ]
            });
            const storeIds = [], moveIds = [], prepareIds = [], firmIds = [], quotationId = [];
            data.forEach(notification => {
                const text = `${notification.title || ""} ${notification.messages || ""}`;
                if (text.includes('STR')) {
                    const match = text.match(/STR(\d+)/);
                    if (match) storeIds.push(match[0]);
                }
                if (text.includes('MOV')) {
                    const match = text.match(/MOV(\d+)/);
                    if (match) moveIds.push(match[0]);
                }
                if (text.includes('PRE')) {
                    const match = text.match(/PRE(\d+)/);
                    if (match) prepareIds.push(match[0]);
                }
                if (text.includes('FRM')) {
                    const match = text.match(/FRM(\d+)/);
                    if (match) firmIds.push(match[0]);
                }
                if (text.includes('SQTN')) {
                    const match = text.match(/SQTN(\d+)/);
                    if (match) {
                        quotationId.push(match[0]);
                    }
                }
            });

            const [stores, moves, prepares, firms, quotations] = await Promise.all([
                storeIds.length ? models.stores.findAll({
                    attributes: ["id", "store_uid"],
                    where: { store_uid: storeIds },
                    include: [
                        {
                            model: models.store_additional_submissions,
                            as: "store_additional_submissions",
                            attributes: ["id", "store_id", "compliance_id", "createdAt", "updatedAt"]
                        },
                        {
                            model: models.store_compliance_details,
                            as: "store_compliance_details",
                            attributes: ["id", "store_id", "createdAt", "updatedAt"]
                        }
                    ],
                }) : Promise.resolve([]),
                moveIds.length ? models.move_details.findAll({
                    attributes: ["id", "move_uid"],
                    include: [
                        {
                            model: models.move_compliance_details,
                            as: "move_compliance_details",
                            attributes: ["id", "move_id", "createdAt", "updatedAt"]
                        }
                    ],
                    where: { move_uid: moveIds }
                }) : Promise.resolve([]),
                prepareIds.length ? models.prepare_details.findAll({
                    attributes: ["id", "prepare_uid"],
                    include: [
                        {
                            model: models.prepare_compliance_details,
                            as: "prepare_compliance_details",
                            attributes: ["id", "prepare_id", "createdAt", "updatedAt"]
                        },
                        {
                            model: models.prepare_additional_submissions,
                            as: "prepare_additional_details",
                            attributes: ["id", "prepare_id", "createdAt", "updatedAt"]
                        }
                    ],
                    where: { prepare_uid: prepareIds }
                }) : Promise.resolve([]),
                firmIds.length ? models.User_firm.findAll({
                    attributes: ["id", "firm_uid"],
                    where: { firm_uid: firmIds },
                    include: [
                        {
                            model: models.firm_shareholders,
                            as: "firm_shareholders",
                            attributes: ["id", "firm_id", "createdAt", "updatedAt"]
                        },
                        {
                            model: models.Partner_ship,
                            as: "firm_partnerships",
                            attributes: ["id", "firm_id", "createdAt", "updatedAt"]
                        }
                    ]
                }) : Promise.resolve([]),
                quotationId.length ? models.quotation_store.findAll({
                    attributes: ["id", "store_quotation_id"],
                    where: { store_quotation_id: quotationId }
                }) : Promise.resolve([])
            ]);

            const notificationsDetails = data.map(notification => {
                const text = `${notification.title || ""} ${notification.messages || ""}`;
                let storeDetail = null;
                let moveDetail = null;
                let prepareDetail = null;
                let firmDetails = null;
                let quotationDetails = null;

                if (text.includes('STR')) {
                    const match = text.match(/STR(\d+)/);
                    if (match) {
                        storeDetail = stores.find(store => store.store_uid === match[0]);
                    }
                }
                if (text.includes('MOV')) {
                    const match = text.match(/MOV(\d+)/);
                    if (match) {
                        moveDetail = moves.find(move => move.move_uid === match[0]);
                    }
                }
                if (text.includes('PRE')) {
                    const match = text.match(/PRE(\d+)/);
                    if (match) {
                        prepareDetail = prepares.find(prepare => prepare.prepare_uid === match[0]);
                    }
                }
                if (text.includes('FRM')) {
                    const match = text.match(/FRM(\d+)/);
                    if (match) {
                        firmDetails = firms.find(firm => firm.firm_uid === match[0]);
                    }
                }
                if (text.includes('SQTN')) {
                    const match = text.match(/SQTN(\d+)/);
                    if (match) {
                        quotationDetails = quotations.find(quotation => quotation.store_quotation_id === match[0]);
                    }
                }
                if (notification.title === "Interested Partner") {
                    const match = notification.messages.match(/SQTN(\d+)/);
                    if (match) {
                        const quotationId = match[0];
                        quotationDetails = quotations.find(quotation => quotation.store_quotation_id === quotationId);
                    }
                }
                if (notification.title === "Partner's Audit Document Received") {
                    const match = notification.messages.match(/(\STRd+)/)
                    if (match) {
                        const storeIds = match[0]
                        storeDetail = stores.find(store => store.store_uid === storeIds);
                    }
                }
                if (notification.title === "Customer's Audit Document Received") {
                    const match = notification.messages.match(/SQTN(\d+)/);
                    if (match) {
                        const quotationId = match[0];
                        quotationDetails = quotations.find(quotation => quotation.store_quotation_id === quotationId);
                    }
                }
                if (notification.title === "Asset added") {
                    const match = notification.messages.match(/FRM(\d+)/);
                    if (match) {
                        const firmId = match[0];
                        firmDetails = firms.find(firm => firm.firm_uid === firmId);
                    }
                }
                return {
                    ...notification.toJSON(),
                    storeDetail,
                    moveDetail,
                    prepareDetail,
                    firmDetails,
                    quotationDetails
                };
            });
            let unreadCount = 0, readCount = 0;
            notificationsDetails.forEach(n => {
                const isReadArray = parseIsRead(n.is_read);
                if (isReadArray.includes(cUser.id)) readCount++;
                else unreadCount++;
            });
            return REST.success(res, { data: notificationsDetails, readCount, unreadCount }, 'Get All Notifications successfully');
        } else if (findUser.role_id === 4) {
            const findPermission = await models.user_permission.findAll({
                where: {
                    user_id: user_id,
                    status: "active"
                },
            });
            const permissionFilters = findPermission.map(p => ({
                [Op.and]: [
                    { notification_type: p.page_name },
                    { createdAt: { [Op.gte]: new Date(p.createdAt) } }
                ]
            }));
            if (findPermission?.length > 0) {
                data = await models.notification.findAll({
                    where: {
                        [Op.and]: [
                            {
                                [Op.or]: [
                                    { reciver_id: { [Op.like]: `%${user_id}%` } },
                                    { reciver_id: "0" }
                                ]
                            },
                            {
                                [Op.or]: permissionFilters
                            }
                        ]
                    },
                    order: [["id", "DESC"]],
                    include: [
                        {
                            model: models.User,
                            as: "senderDetails"
                        },
                    ],
                });
            } else {
                return REST.error(res, 'No permissions to view notifications.', 403);
            }

            const storeIds = [], moveIds = [], prepareIds = [], firmIds = [], quotationId = [];
            data.forEach(notification => {
                const text = `${notification.title || ""} ${notification.messages || ""}`;
                if (text.includes('STR')) {
                    const match = text.match(/STR(\d+)/);
                    if (match) storeIds.push(match[0]);
                }
                if (text.includes('MOV')) {
                    const match = text.match(/MOV(\d+)/);
                    if (match) moveIds.push(match[0]);
                }
                if (text.includes('PRE')) {
                    const match = text.match(/PRE(\d+)/);
                    if (match) prepareIds.push(match[0]);
                }
                if (text.includes('FRM')) {
                    const match = text.match(/FRM(\d+)/);
                    if (match) firmIds.push(match[0]);
                }
                if (text.includes('SQTN')) {
                    const match = text.match(/SQTN(\d+)/);
                    if (match) {
                        quotationId.push(match[0]);
                    }
                }
            });

            const [stores, moves, prepares, firms, quotations] = await Promise.all([
                storeIds.length ? models.stores.findAll({
                    attributes: ["id", "store_uid"],
                    where: { store_uid: storeIds },
                    include: [
                        {
                            model: models.store_additional_submissions,
                            as: "store_additional_submissions",
                            attributes: ["id", "store_id", "compliance_id", "createdAt", "updatedAt"]
                        },
                        {
                            model: models.store_compliance_details,
                            as: "store_compliance_details",
                            attributes: ["id", "store_id", "createdAt", "updatedAt"]
                        }
                    ],
                }) : Promise.resolve([]),
                moveIds.length ? models.move_details.findAll({
                    attributes: ["id", "move_uid"],
                    include: [
                        {
                            model: models.move_compliance_details,
                            as: "move_compliance_details",
                            attributes: ["id", "move_id", "createdAt", "updatedAt"]
                        }
                    ],
                    where: { move_uid: moveIds }
                }) : Promise.resolve([]),
                prepareIds.length ? models.prepare_details.findAll({
                    attributes: ["id", "prepare_uid"],
                    include: [
                        {
                            model: models.prepare_compliance_details,
                            as: "prepare_compliance_details",
                            attributes: ["id", "prepare_id", "createdAt", "updatedAt"]
                        },
                        {
                            model: models.prepare_additional_submissions,
                            as: "prepare_additional_details",
                            attributes: ["id", "prepare_id", "createdAt", "updatedAt"]
                        }
                    ],
                    where: { prepare_uid: prepareIds }
                }) : Promise.resolve([]),
                firmIds.length ? models.User_firm.findAll({
                    attributes: ["id", "firm_uid"],
                    where: { firm_uid: firmIds },
                    include: [
                        {
                            model: models.firm_shareholders,
                            as: "firm_shareholders",
                            attributes: ["id", "firm_id", "createdAt", "updatedAt"]
                        },
                        {
                            model: models.Partner_ship,
                            as: "firm_partnerships",
                            attributes: ["id", "firm_id", "createdAt", "updatedAt"]
                        }
                    ]
                }) : Promise.resolve([]),
                quotationId.length ? models.quotation_store.findAll({
                    attributes: ["id", "store_quotation_id"],
                    where: { store_quotation_id: quotationId }
                }) : Promise.resolve([])
            ]);

            const notificationsDetails = data.map(notification => {
                const text = `${notification.title || ""} ${notification.messages || ""}`;
                let storeDetail = null;
                let moveDetail = null;
                let prepareDetail = null;
                let firmDetails = null;
                let quotationDetails = null;

                if (text.includes('STR')) {
                    const match = text.match(/STR(\d+)/);
                    if (match) {
                        storeDetail = stores.find(store => store.store_uid === match[0]);
                    }
                }
                if (text.includes('MOV')) {
                    const match = text.match(/MOV(\d+)/);
                    if (match) {
                        moveDetail = moves.find(move => move.move_uid === match[0]);
                    }
                }
                if (text.includes('PRE')) {
                    const match = text.match(/PRE(\d+)/);
                    if (match) {
                        prepareDetail = prepares.find(prepare => prepare.prepare_uid === match[0]);
                    }
                }
                if (text.includes('FRM')) {
                    const match = text.match(/FRM(\d+)/);
                    if (match) {
                        firmDetails = firms.find(firm => firm.firm_uid === match[0]);
                    }
                }
                if (text.includes('SQTN')) {
                    const match = text.match(/SQTN(\d+)/);
                    if (match) {
                        quotationDetails = quotations.find(quotation => quotation.store_quotation_id === match[0]);
                    }
                }
                if (notification.title === "Interested Partner") {
                    const match = notification.messages.match(/SQTN(\d+)/);
                    if (match) {
                        const quotationId = match[0];
                        quotationDetails = quotations.find(quotation => quotation.store_quotation_id === quotationId);
                    }
                }
                if (notification.title === "Partner's Audit Document Received") {
                    const match = notification.messages.match(/(\STRd+)/)
                    if (match) {
                        const storeIds = match[0]
                        storeDetail = stores.find(store => store.store_uid === storeIds);
                    }
                }
                if (notification.title === "Customer's Audit Document Received") {
                    const match = notification.messages.match(/SQTN(\d+)/);
                    if (match) {
                        const quotationId = match[0];
                        quotationDetails = quotations.find(quotation => quotation.store_quotation_id === quotationId);
                    }
                }
                if (notification.title === "Asset added") {
                    const match = notification.messages.match(/FRM(\d+)/);
                    if (match) {
                        const firmId = match[0];
                        firmDetails = firms.find(firm => firm.firm_uid === firmId);
                    }
                }
                return {
                    ...notification.toJSON(),
                    storeDetail,
                    moveDetail,
                    prepareDetail,
                    firmDetails,
                    quotationDetails
                };
            });
            let readCount = 0;
            let unreadCount = 0;
            notificationsDetails.forEach(n => {
                const isReadArray = parseIsRead(n.is_read);
                if (isReadArray.includes(cUser.id)) {
                    readCount++;
                }
                else unreadCount++;
            });
            return REST.success(res, { data: notificationsDetails, readCount, unreadCount }, 'Get All Notifications successfully');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post('/markNotificationAsRead', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const { notification_id } = req.body;
        if (!notification_id) {
            return REST.error(res, "Notification ID is required", 400);
        }
        const notification = await models.notification.findOne({
            where: { id: notification_id }
        });
        if (!notification) {
            return REST.error(res, "Notification not found", 404);
        }
        let isReadArray = [];
        if (Array.isArray(notification.is_read)) {
            isReadArray = notification.is_read;
        } else if (typeof notification.is_read === 'string') {
            try {
                isReadArray = JSON.parse(notification.is_read);
                if (!Array.isArray(isReadArray)) isReadArray = [];
            } catch {
                isReadArray = [];
            }
        }
        if (!isReadArray.includes(cUser.id)) {
            isReadArray.push(cUser.id);
        }
        await models.notification.update(
            { is_read: JSON.stringify(isReadArray) },
            { where: { id: notification_id } }
        );
        const newNotification = await models.notification.findOne({
            where: {
                id: notification_id

            }
        })
        return REST.success(res, newNotification, "Notification marked as read successfully");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

module.exports = router