const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const { LOG } = require('../../../constants');
const user = require('../../../constants/user');
const router = express.Router();
const support = require('../../../utils/support');
const { sendPushNotification } = require('../../../utils/helper')
const { sendEmail } = require('../../../utils/helper')
const moment = require('moment');
const fs = require('fs');
const path = require('path')
/*
|----------------------------------------------------------------------------------------------------------------
|             Quotations Stores Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/getStoreQuotation', async function (req, res) {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const {
        state,
        city,
        globalSearch,
        status,
        quotation_status,
        quotationId,
        assignee,
        type
    } = req.query;
    let filters = {};

    if (quotationId) {
        filters.store_quotation_id = quotationId;
    }
    if (state) {
        filters.state = state;
    }
    if (city) {
        filters.city = city;
    }
    if (status) {
        filters.status = status;
    }
    if (quotation_status) {
        filters.quotation_status = quotation_status
    }
    if (type === 'query') {
        filters.status = 'pending';
        filters.quotation_status = 'pending';
    } else if (type === 'solution') {
        filters[Op.not] = {
            [Op.and]: [
                { status: 'pending' },
                { quotation_status: 'pending' }
            ]
        };
    }
    let globalSearchCondition = {};
    if (globalSearch) {
        globalSearchCondition = {
            [Op.or]: [
                { store_quotation_id: { [Op.like]: '%' + globalSearch + '%' } },
                { state: { [Op.like]: '%' + globalSearch + '%' } },
                { city: { [Op.like]: '%' + globalSearch + '%' } },
                { '$customer_details.user_uid$': { [Op.like]: '%' + globalSearch + '%' } },
                { '$customer_details.full_name$': { [Op.like]: '%' + globalSearch + '%' } },
                { status: { [Op.like]: '%' + globalSearch + '%' } },
                { quotation_status: { [Op.like]: '%' + globalSearch + '%' } },
            ]
        };
    }

    const whereCondition = {
        [Op.and]: [
            filters,
            globalSearchCondition
        ]
    };

    try {
        const count = await models.quotation_store.count({
            where: whereCondition,
            include: [
                {
                    model: models.User,
                    as: "customer_details",
                    required: false
                },
                {
                    model: models.assigned_quotation,
                    as: "AssignedSubUser",
                    required: !!assignee,
                    where: {
                        admin_assigned: true
                    },
                    include: [
                        {
                            model: models.User,
                            as: "managerDetails",
                            where: assignee ? {
                                full_name: { [Op.like]: `%${assignee}%` }
                            } : undefined,
                            required: !!assignee
                        },
                        {
                            model: models.User,
                            as: "assignedby"
                        }
                    ]
                }
            ],
            distinct: true
        });
        let rows = await models.quotation_store.findAll({
            where: whereCondition,
            include: [
                {
                    model: models.User,
                    as: "customer_details",
                    required: true
                },
                {
                    model: models.assigned_quotation,
                    as: "AssignedSubUser",
                    where: {
                        admin_assigned: true
                    },
                    required: false,
                    include: [
                        {
                            model: models.User,
                            as: "managerDetails",
                            attributes: ["id", "role_id", "full_name", "email", "phone_number", "designation", "city", "department", "createdAt", "updatedAt"],
                            where: assignee ? { full_name: { [Op.like]: `%${assignee}%` } } : undefined
                        },
                        {
                            model: models.User,
                            as: "assignedby",
                            attributes: ["id", "full_name"]
                        }
                    ]
                },
                {
                    model: models.quotation_assigned_assets,
                    as: "quotationAssignedAssets"
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]],
            offset: offset,
            limit: pageSize,
            distinct: true
        });

        for (let document of rows) {
            let customer = document.customer_details;
            if (customer && customer.is_key_manager === 1) {
                try {
                    const keyManagement = await models.Key_management.findOne({
                        where: {
                            id: customer.key_mangement_id,
                        }
                    });
                    if (keyManagement) {
                        const actualCustomer = await models.User.findOne({
                            where: {
                                id: keyManagement.added_by,
                            }
                        });
                        if (actualCustomer) {
                            document.customer_details.dataValues = actualCustomer.dataValues;
                        }
                    }
                } catch (error) {
                    console.error('Error fetching key management/user:', error);
                }
            }
            if (document.addedby) {
                document.addedby.dataValues.created_at = document.createdAt;
            }
        }
        const totalPages = Math.ceil(count / pageSize);
        return REST.success(res, {
            quotation: rows,
            pagination: {
                totalCount: count,
                totalPages,
                currentPage: page,
                pageSize,
            },
        }, 'Get Store Quotation List');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getStoreQuotation/:store_quotation_id', async function (req, res) {
    try {
        const quotationId = req.params.store_quotation_id;
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: quotationId
            }
        });
        if (!findQuotation) {
            return REST.error(res, 'Quotation Id Not Found', 404);
        }
        const data = await models.quotation_store.findOne({
            where: { store_quotation_id: quotationId },
            include: [
                {
                    model: models.quotation_assigned_assets,
                    as: "quotationAssignedAssets"
                },
                {
                    model: models.User,
                    as: "customer_details",
                    attributes: ["id", "user_uid", "full_name", "phone_number", "email", "city", "designation"]
                }
            ]
        })
        return REST.success(res, data, 'Store Quotation Details Get Successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getQuoations/:store_quotation_id', async function (req, res) {
    try {
        const quotationId = req.params.store_quotation_id;
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: quotationId
            }
        });
        if (!findQuotation) {
            return REST.error(res, 'Quotation Id Not Found', 404);
        }
        const data = await models.quotation_store.findOne({
            where: { store_quotation_id: quotationId },
            include: [{
                model: models.User,
                as: "customer_details",
                attributes: ["id", "user_uid", "full_name", "phone_number", "email", "city", "designation"]
            }
            ]
        })
        return REST.success(res, data, 'Store Quotation Details Get Successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getStoreQuotations/:customer_uid', async function (req, res) {
    const customerUid = req.params.customer_uid;
    try {
        const customer = await models.User.findOne({
            where: { user_uid: customerUid },
        });
        if (!customer) {
            return REST.error(res, 'Customer not found.', 404);
        }
        const quotationCount = await models.quotation_store.count({
            where: { customer_id: customer.id }
        })
        const storeQuotations = await models.quotation_store.findAll({
            where: { customer_id: customer.id },
            include: [
                {
                    model: models.assigned_quotation,
                    as: "AssignedSubUser",
                    where: { admin_assigned: true },
                    required: false,
                    include: [
                        {
                            model: models.User,
                            as: "managerDetails",
                            attributes: ["id", "role_id", "full_name", "email", "phone_number", "designation", "city", "department", "createdAt", "updatedAt"],
                        },
                        {
                            model: models.User,
                            as: "assignedby",
                            attributes: ["id", "full_name"]
                        }
                    ]
                }
            ],
            order: [['id', 'DESC']],
        });
        if (!storeQuotations) {
            return REST.error(res, 'No store quotations found.', 404);
        }
        return REST.success(res, { storeQuotations, quotationCount, }, 'Customer Store quotations fetched successfully.');
    } catch (error) {
        return REST.error(res, 500);
    }
});
router.get('/getAllAssignee', async (req, res) => {
    try {
        const data = await models.User.findAll({
            attributes: ['id', 'full_name'],
            where: {
                is_assigned: true
            }
        });
        return REST.success(res, {
            data
        }, "Get All Assignee");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/allQuotations', async (req, res) => {
    try {
        const { state, city } = req.query;
        let quotationFilter = {};

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
router.put('/quotationUpdate/:id', async function (req, res) {
    const cUser = req.body.current_user;
    const notify_key = req.body.notify;
    try {
        const quoatationId = req.params.id
        const findQuotation = await models.quotation_store.findOne({
            where: {
                id: quoatationId
            }
        })
        if (!findQuotation) {
            return REST.error(res, 'Quotation Id Not Found', 404);
        }
        const findQuotationId = findQuotation.store_quotation_id
        await models.sequelize.transaction(async (transaction) => {
            const data = await models.quotation_store.update({
                status: req.body.status,
                description: req.body.description,
                quotation_status: req.body.quotation_status,
                updated_by: cUser.id
            }, {
                where: {
                    id: quoatationId,
                },
                transaction: transaction
            })
            return data
        })
        const findNewQuotation = await models.quotation_store.findOne({
            where: {
                id: quoatationId,
            }
        })
        const endDate = moment(findNewQuotation.end_date).format('DD MMM YYYY');
        let findCustomer = await models.User.findOne({
            where: {
                id: findQuotation.customer_id
            }
        })
        if (!findCustomer) {
            return REST.error(res, 'Customer Id Not Found', 404);
        }
        await models.quotation_action.create({
            user_id: cUser.id,
            quotation_id: findQuotation.id,
            quotation_action: req.body.description,
            status: req.body.status,
            title: 'Updated_by',
            updated_by: cUser.id,
        });
        if (notify_key == "complete_notify") {
            const messageTerminated = `Query ${findQuotationId} will be completed if documents are not renewed by end date.`;
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findCustomer.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, messageTerminated)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findCustomer.id,
                title: 'Query Update',
                messages: messageTerminated,
                notification_type: "Store Management"
            });
        } else if (notify_key == "terminate_notify") {
            const messageTerminated = `Query ${findQuotationId} will be terminated if not renewed before end date.`;
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findCustomer.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, messageTerminated)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findCustomer.id,
                title: 'Query Update',
                messages: messageTerminated,
                notification_type: "Store Management"
            });
        } else if (notify_key == "decline_notify") {
            const messageDeclined = `We regret to inform you that your query ${findQuotationId} has been declined.If you have any questions, feel free to reach out.Decline Reason: ${req.body.reason}.`;
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findCustomer.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, messageDeclined)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findCustomer.id,
                title: 'Query Declined',
                messages: messageDeclined,
                notification_type: "Store Management"
            });
        }
        if (req.body.description === 'Complete') {
            const messageTerminated = `Your query ${findQuotationId} has been complete.Looking forward to continued collaboration.`;
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findCustomer.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, messageTerminated)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findCustomer.id,
                title: 'Query Complete',
                messages: messageTerminated,
                notification_type: "Store Management"

            });
            const assets = await models.quotation_assigned_assets.findAll({
                where: { quotations_id: findQuotation.id },
                attributes: ["id", "quotations_id", 'chamber_id', "assigned_pallets"],
            });
            for (const asset of assets) {
                const chamber = await models.store_chambers.findByPk(asset.chamber_id);
                if (chamber) {
                    const palletsToRestore = Number(asset.assigned_pallets) || 0;
                    const currentAvailable = Number(chamber.available_pallets) || 0;
                    const currentUnavailable = Number(chamber.unavailable_pallets) || 0;
                    const updatedAvailable = currentAvailable + palletsToRestore;
                    const updatedUnavailable = currentUnavailable - palletsToRestore;
                    await models.store_chambers.update({
                        available_pallets: updatedAvailable,
                        unavailable_pallets: updatedUnavailable
                    }, { where: { id: chamber.id } });
                }
                await models.quotation_assigned_assets.update({
                    assigned_pallets: 0
                }, { where: { id: asset.id } });
                const findquotationAssigned = await models.quotation_assigned_assets.findOne({
                    where: {
                        id: asset.id
                    }
                })
                const currentData = findquotationAssigned.dataValues
                await models.user_activity_logs.create({
                    user_id: findQuotation.customer_id,
                    activity: 'asset_assigned',
                    activity_id: findQuotation.id,
                    activity_type: "pallets_assigned",
                    current_data: currentData,
                    added_by: cUser.id,
                    action: "Added"
                })
            }
        } else if (req.body.status === 'quotation_renewed') {
            let findCustomer;
            findCustomer = await models.User.findOne({
                where: {
                    id: findQuotation.customer_id
                }
            })
            if (!findCustomer) {
                return REST.error(res, 'Customer Id Not Found', 404);
            }
            const messageRenewed = `Your query ${findQuotationId} has been renewed.The new start and end dates are ${findNewQuotation.date_of_storage} to ${findNewQuotation.end_date}.`;
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findCustomer.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, messageRenewed)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findCustomer.id,
                title: 'Query Renewed',
                messages: messageRenewed,
                notification_type: "Store Management"
            });
            await models.quotation_store.update({
                is_renewal: true
            }, { where: { id: findNewQuotation.id } })
        } else if (req.body.description === 'Terminate') {
            const messageTerminated = `Please be informed that query ${findQuotationId} has been terminated as per your request.For further assistance, you may initiate a new query.`;
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findCustomer.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, messageTerminated)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findCustomer.id,
                title: 'Query Terminated',
                messages: messageTerminated,
                notification_type: "Store Management"
            });
            const assets = await models.quotation_assigned_assets.findAll({
                where: { quotations_id: findQuotation.id },
                attributes: ["id", "quotations_id", 'chamber_id', "assigned_pallets"],
            });
            for (const asset of assets) {
                const chamber = await models.store_chambers.findByPk(asset.chamber_id);
                if (chamber) {
                    const palletsToRestore = Number(asset.assigned_pallets) || 0;
                    const currentAvailable = Number(chamber.available_pallets) || 0;
                    const currentUnavailable = Number(chamber.unavailable_pallets) || 0;
                    const updatedAvailable = currentAvailable + palletsToRestore;
                    const updatedUnavailable = currentUnavailable - palletsToRestore;
                    await models.store_chambers.update({
                        available_pallets: updatedAvailable,
                        unavailable_pallets: updatedUnavailable
                    }, { where: { id: chamber.id } });
                }
                await models.quotation_assigned_assets.update({
                    assigned_pallets: 0
                }, { where: { id: asset.id } });
                const findquotationAssigned = await models.quotation_assigned_assets.findOne({
                    where: {
                        id: asset.id
                    }
                })
                const findAssets = await models.stores.findOne({
                    where: {
                        id: findquotationAssigned.type_id
                    }
                })
                const findStoreUid = findAssets.store_uid
                const currentData = findquotationAssigned.dataValues
                await models.user_activity_logs.create({
                    user_id: findQuotation.customer_id,
                    activity: 'asset_assigned',
                    activity_id: findQuotation.id,
                    activity_type: "pallets_assigned",
                    current_data: currentData,
                    added_by: cUser.id,
                    action: "Added"
                })
                if (findCustomer.email) {
                    const subject = `IndiLink: Contract Renewal for Asset`;
                    const templatePath = path.join(__dirname, '..', '..', '..', 'templates', 'query_termination_template.html');
                    let htmlContent = fs.readFileSync(templatePath, 'utf8');
                    htmlContent = htmlContent
                        .replace(/{{full_name}}/g, findCustomer.full_name)
                        .replace(/{{asset_id}}/g, findStoreUid)
                        .replace(/{{asset_type}}/g)
                        .replace(/{{contract_expire_date}}/g, endDate)
                    await sendEmail(findCustomer.email, subject, htmlContent);
                }
            }
        } else if (req.body.description === 'Decline') {
            const messageDeclined = `We regret to inform you that your query ${findQuotationId} has been declined.If you have any questions, feel free to reach out.Decline Reason: ${req.body.reason}.`;
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findCustomer.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, messageDeclined)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findCustomer.id,
                title: 'Query Declined',
                messages: messageDeclined,
                notification_type: "Store Management"
            });
        }
        await models.quotation_store.update({
            is_renewal: true,
            status: req.body.status,
            reason: req.body.reason,
            quotation_status: req.body.quotation_status,
            description: req.body.description
        }, { where: { id: findNewQuotation.id } })
        return REST.success(res, null, 'Quotations update successfully');
    } catch (error) {
        console.log(error, "error")
        return REST.error(res, error.message, 500);
    }
})
router.put('/updateQuotationDate/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const quoatationId = req.params.id
        const findQuotation = await models.quotation_store.findOne({
            where: {
                id: quoatationId
            }
        })
        if (!findQuotation) {
            return REST.error(res, 'Quotation Id Not Found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            const data = await models.quotation_store.update({
                date_of_storage: req.body.date_of_storage,
                end_date: req.body.end_date,
                status: req.body.status,
                updated_by: cUser.id
            }, {
                where: {
                    id: quoatationId,
                },
                transaction: transaction
            })
            return data
        })
        const findNewQuotation = await models.quotation_store.findOne({
            where: {
                id: quoatationId,
            }
        })
        const previousData = findQuotation.dataValues
        await models.user_activity_logs.create({
            user_id: findQuotation.customer_id,
            activity: "Quotation",
            activity_id: findQuotation.id,
            activity_type: "store_quotations",
            previous_data: previousData,
            current_data: findNewQuotation,
            updated_by: cUser.id,
            action: "Updated"
        });
        return REST.success(res, findNewQuotation, 'Quotations Update Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})

module.exports = router