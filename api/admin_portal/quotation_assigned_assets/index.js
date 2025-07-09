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
const sequelize = require('sequelize')
const { socketEventEmit } = require('../../../utils/helper');
const { sendEmail } = require('../../../utils/helper')
const moment = require('moment');
const fs = require('fs');
const path = require('path')
const Sequelize = require('sequelize')


/*
|----------------------------------------------------------------------------------------------------------------
|              Quotaions Assigned Assets Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createAssets', async function (req, res) {
    const cUser = req.body.current_user;
    const validationRules = {
        user_id: "required|integer",
        quotations_id: "required|integer",
        type: "required|string",
        type_id: "required|integer",
        assignedPallets: "required|array",
    };

    const validator = make(req.body, validationRules);
    if (!validator.validate()) {
        return REST.error(res, validator.errors().all(), 422);
    }

    const allowedTypes = ["store", "move", "prepare"];
    if (!allowedTypes.includes(req.body.type)) {
        return REST.error(res, 'Invalid type', 400);
    }
    const findUsers = await models.User.findOne({
        where: {
            id: cUser.id
        }
    })
    const findStore = await models.stores.findOne({
        where: {
            id: req.body.type_id
        }
    })
    const findStoreUid = findStore.store_uid
    const findQuotation = await models.quotation_store.findOne({
        where: { id: req.body.quotations_id }
    });

    if (!findQuotation) {
        return REST.error(res, 'Quotation not found', 404);
    }
    const findQuotationId = findQuotation.store_quotation_id
    let item;
    const previousAvailablePalletsMap = {};
    switch (req.body.type) {
        case "store":
            item = await models.stores.findOne({ where: { id: req.body.type_id } });
            if (!item) {
                return REST.error(res, 'Store does not exist', 404);
            }
            const chamberPalletMap = req.body.assignedPallets.reduce((acc, pallet) => {
                if (!acc[pallet.chamber_id]) {
                    acc[pallet.chamber_id] = 0;
                }
                acc[pallet.chamber_id] += pallet.assigned_pallets;
                return acc;
            }, {});

            for (const chamberId of Object.keys(chamberPalletMap)) {
                const chamber = await models.store_chambers.findOne({ where: { id: chamberId } });
                if (!chamber) {
                    return REST.error(res, `Chamber ID ${chamberId} does not exist`, 404);
                }
                const previousAvailablePallets = parseInt(chamber.available_pallets) || 0;
                const assignedPallets = parseInt(chamber.available_pallets) || 0;
                const unavailablePallets = parseInt(chamber.unavailable_pallets) || 0;
                const newAssignedPallets = chamberPalletMap[chamberId];
                const newAvailablePallets = assignedPallets - newAssignedPallets;
                const newUnavailablePallets = unavailablePallets + newAssignedPallets;

                if (newAvailablePallets < 0) {
                    return REST.error(res, `Not enough available pallets in Chamber ID ${chamberId}`, 400);
                }

                previousAvailablePalletsMap[chamberId] = previousAvailablePallets;
                await models.store_chambers.update(
                    {
                        available_pallets: newAvailablePallets,
                        unavailable_pallets: newUnavailablePallets,
                    },
                    { where: { id: chamberId } }
                );
            }
            break;

        case "move":
            item = await models.move_details.findOne({ where: { id: req.body.type_id } });
            if (!item) {
                return REST.error(res, 'Move detail does not exist', 404);
            }
            break;

        case "prepare":
            item = await models.prepare_details.findOne({ where: { id: req.body.type_id } });
            if (!item) {
                return REST.error(res, 'Prepare detail does not exist', 404);
            }
            break;
    }

    try {
        await models.sequelize.transaction(async (transaction) => {
            for (const pallet of req.body.assignedPallets) {
                const previousAvailablePallets = previousAvailablePalletsMap[pallet.chamber_id] || 0;
                const pallets = await models.quotation_assigned_assets.create(
                    {
                        user_id: req.body.user_id,
                        quotations_id: req.body.quotations_id,
                        chamber_id: pallet.chamber_id,
                        type: req.body.type,
                        type_id: req.body.type_id,
                        assigned_pallets: pallet.assigned_pallets,
                        previous_available_pallets: previousAvailablePallets,
                        added_by: cUser.id
                    },
                    { transaction }
                );
                if (req.body.type === "store") {
                    await models.document_common_logs.create(
                        {
                            user_id: req.body.user_id,
                            type: 'Store',
                            type_id: req.body.type_id,
                            remarks: pallet.assigned_pallets,
                            action: 'Added_by',
                            added_by: cUser.id,
                        },
                        { transaction }
                    );
                }
                const createdAtFormatted = moment(pallets.createdAt).format('DD MMM YYYY');
                const currentData = pallets.dataValues
                await models.user_activity_logs.create({
                    user_id: findQuotation.customer_id,
                    activity: 'asset_assigned',
                    activity_id: findQuotation.id,
                    activity_type: "pallets_assigned",
                    current_data: currentData,
                    added_by: cUser.id,
                    action: "Added"
                })

                const notificationMessage = `Assets have been assigned for query ${findQuotationId}.`
                const findReceiverToken = await models.User.findOne({
                    where: { id: findQuotation.customer_id }
                });
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReceiverToken.id);
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, notificationMessage)
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findReceiverToken.id,
                    title: "Asset Assigned",
                    messages: notificationMessage,
                    notification_type: 'Store Management'
                }, { transaction });

                if (findReceiverToken.email) {
                    const subject = `IndiLink Support: Query ${findQuotationId} Assigend`;
                    const templatePath = path.join(__dirname, '..', '..', '..', 'templates', 'asset_assgined_template.html');
                    let htmlContent = fs.readFileSync(templatePath, 'utf8');
                    htmlContent = htmlContent
                        .replace(/{{full_name}}/g, findReceiverToken.full_name)
                        .replace(/{{query_id}}/g, findQuotationId)
                        .replace(/{{assignment_date}}/g, createdAtFormatted)
                        .replace(/{{dashboard_link}}/g, 'https://dashboard.indilink.in/');
                    await sendEmail(findReceiverToken.email, subject, htmlContent);
                }
            }
            await models.quotation_store.update(
                {
                    quotation_status: 'asset_assigned',
                    status: "onboard"
                },
                {
                    where: {
                        id: req.body.quotations_id
                    },
                    transaction
                }
            );
            await socketEventEmit('dashboard:update', true);
            if (cUser.role_id === 4) {
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Query",
                    title: "Asset assigned",
                    details: `has assigned asset ${findStoreUid} in ${findQuotationId}.`
                });
            }
            await createQuote('onboard', 'asset_assigned', cUser, req.body.quotations_id, transaction);
            await createQuote('Assign_Assets', 'asset_assigned', cUser, req.body.quotations_id, transaction);
            return REST.success(res, null, 'Assets assigned successfully');
        });
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
const createQuote = async (quotation_action, status, user, quotations_id, transaction) => {
    await models.quotation_action.create({
        user_id: user.id,
        quotation_id: quotations_id,
        quotation_action,
        status,
        title: 'Updated_by',
        updated_by: user.id,
    }, { transaction });
}
router.get('/getAssetslist', async function (req, res) {
    try {
        const type = req.query.type;
        let data;
        if (type === "store") {
            data = await models.quotation_assigned_assets.findAll({
                where: { type: "store" },
                include: [
                    {
                        model: models.User,
                        as: "userDetails",
                    },
                    {
                        model: models.stores,
                        as: "storeDetails",
                        include: {
                            model: models.store_chambers,
                            attributes: {
                                exclude: ["photo_of_entrance", "photo_of_chamber"]
                            },
                            as: "table_of_chamber",
                            include: {
                                model: models.store_chamber_images,
                                as: "chamber_images"
                            }
                        }
                    }
                ],
                order: [["id", "DESC"]],
                attributes: {
                    include: [
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*)
                                FROM store_chambers AS chambers
                                WHERE chambers.store_id = storeDetails.id
                            )`),
                            'totalChambers'
                        ]
                    ]
                }
            });
        } else if (type === "move") {
            data = await models.quotation_assigned_assets.findAll({
                where: { type: "move" },
                include: [
                    {
                        model: models.User,
                        as: "userDetails",
                    },
                    {
                        model: models.move_details,
                        as: "moveDetails"
                    }
                ],
                order: [["id", "DESC"]]
            });
        } else if (type === "prepare") {
            data = await models.quotation_assigned_assets.findAll({
                where: { type: "prepare" },
                include: [
                    {
                        model: models.User,
                        as: "userDetails",
                    },
                    {
                        model: models.prepare_details,
                        as: "prepareDetails"
                    }
                ],
                order: [["id", "DESC"]]
            });
        } else {
            return REST.error(res, 'Invalid type', 400);
        }
        return REST.success(res, data, 'Assets list fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/assignedAssetsLogs/:type_id', async function (req, res) {
    try {
        const store_quotation_id = req.params.type_id;
        const findUser = await models.quotation_store.findOne({
            where: {
                store_quotation_id: store_quotation_id,
            }
        });

        if (!findUser) {
            return REST.error(res, 'Quotation store not found', 404);
        }
        const data = await models.document_common_logs.findAll({
            where: {
                type_id: findUser.id,
                type: "Store"
            },
            include: [
                {
                    model: models.stores,
                    as: "storeDetails",
                    include: {
                        model: models.store_chambers,
                        as: "table_of_chamber",
                        attributes: {
                            exclude: ["photo_of_entrance", "photo_of_chamber"]
                        },
                        include: {
                            model: models.store_chamber_images,
                            as: "chamber_images"
                        }
                    }
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ]
        });
        const transformedData = data.map(record => {
            if (record.addedby) {
                record.addedby.dataValues.created_at = record.dataValues.createdAt;
            }
            return record;
        });
        return REST.success(res, transformedData, 'Get Assets Logs successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/countAssets', async function (req, res) {
    try {
        const storeAssets = await models.quotation_assigned_assets.findAll({
            where: {
                type_id: {
                    [Sequelize.Op.ne]: null
                }
            },
            include: [
                {
                    model: models.quotation_store,
                    as: "StoreQuotationDetails",
                    where: {
                        quotation_status: "asset_assigned"
                    }
                }
            ],
            group: ['type_id']
        });

        const moveCount = await models.quotation_assigned_assets.count({
            where: {
                type: "move"
            }
        });

        const prepareCount = await models.quotation_assigned_assets.count({
            where: {
                type: "prepare"
            }
        });
        return REST.success(res, {
            storeCount: storeAssets.length,
            moveCount,
            prepareCount
        }, 'Get Assets Logs successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get("/customersList", async (req, res) => {
    try {
        const { city, state, today, months, week, start_date, end_date } = req.query;
        let customerFilter = { role_id: 2, is_registered: 1 };
        let findcity = await models.quotation_store.findAll({
            where: {
                ...(state && { state }),
                ...(city && { city: { [Op.in]: city.split(",").map(c => c.trim()) } }),
            },
            attributes: ["customer_id"],
            raw: true
        });
        const customerIds = findcity.map(item => item.customer_id);
        if (customerIds.length > 0) {
            customerFilter.id = { [Op.in]: customerIds };
        }
        if (today || months || week || (start_date && end_date)) {
            const now = new Date();
            let start, end;
            if (today) {
                start = new Date(now.setHours(0, 0, 0, 0));
                end = new Date(now.setHours(23, 59, 59, 999));
            } else if (months) {
                start = new Date(now.setMonth(now.getMonth() - 1, 1));
                end = new Date();
            } else if (week) {
                start = new Date(now.setDate(now.getDate() - 7));
                end = new Date();
            } else if (start_date && end_date) {
                start = new Date(start_date);
                end = new Date(end_date);
                end.setHours(23, 59, 59, 999);
            }
            customerFilter.createdAt = { [Op.between]: [start, end] };
        }
        const customers = await models.User.findAll({
            where: customerFilter,
            order: [["createdAt", "DESC"]],
        });
        return REST.success(res, customers, "Customers fetched successfully");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/quotations', async (req, res) => {
    try {
        const { customer_uid, state, city, today, months, week, start_date, end_date } = req.query;
        let quotationFilter = { quotation_status: 'asset_assigned' };
        if (customer_uid) {
            const customerUIDs = customer_uid.split(',').map(uid => uid.trim());
            const customers = await models.User.findAll({
                where: { user_uid: { [Op.in]: customerUIDs } },
                attributes: ['id']
            });

            if (customers.length > 0) {
                const customerIds = customers.map(customer => customer.id);
                quotationFilter.customer_id = { [Op.in]: customerIds };
            } else {
                return REST.success(res, [], 'Customers not found', 404);
            }
        }

        function formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        if (today) {
            const startOfToday = new Date();
            startOfToday.setHours(0, 0, 0, 0);
            const endOfToday = new Date();
            endOfToday.setHours(23, 59, 59, 999);
            quotationFilter.createdAt = { [Op.between]: [startOfToday, endOfToday] };
        } else if (months) {
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            oneMonthAgo.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            quotationFilter.createdAt = { [Op.between]: [oneMonthAgo, today] };
        } else if (week) {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            oneWeekAgo.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            quotationFilter.createdAt = { [Op.between]: [oneWeekAgo, today] };
        } else if (start_date && end_date) {
            const start = new Date(start_date);
            const end = new Date(end_date);
            end.setHours(23, 59, 59, 999);
            quotationFilter.createdAt = { [Op.between]: [start, end] };
        }

        if (state) {
            quotationFilter.state = state;
        }
        if (city) {
            const cities = city.split(',').map(c => c.trim());
            quotationFilter.city = { [Op.in]: cities };
        }
        const whereCondition = { [Op.and]: [quotationFilter] };
        const quotations = await models.quotation_store.findAll({
            attributes: ['id', 'store_quotation_id'],
            where: whereCondition,
            order: [['createdAt', 'DESC']]
        });
        if (!quotations.length) {
            return REST.success(res, [], 'No quotations found', 404);
        }
        return REST.success(res, quotations, 'Quotations fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

module.exports = router