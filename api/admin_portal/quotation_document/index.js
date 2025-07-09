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
const { sendNotificationPartnerAndKeyManager, findPartnerAndKeyManager } = require('../../../utils/support')
const support = require('../../../utils/support');
const { sendEmail } = require('../../../utils/helper')
const fs = require('fs');
const path = require('path')
/*
|----------------------------------------------------------------------------------------------------------------
|                                  Quotaions Document Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/uploadQuotationsDoc', async function (req, res) {
    const cUser = req.body.current_user;
    const transaction = await models.sequelize.transaction();
    try {
        const { customer_id, quotation_id, comment, title, action, status, document_status, start_date, end_date, quotationDocument, legalDocument } = req.body;
        const findCustomer = await models.User.findOne({
            where: {
                id: customer_id
            }
        });
        if (!findCustomer) {
            return REST.error(res, 'Customer not found', 404);
        }
        const findQuotation = await models.quotation_store.findOne({
            where: {
                id: quotation_id
            }
        });
        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }
        const findQuotationId = findQuotation.store_quotation_id
        if (quotationDocument && quotationDocument.length > 0) {
            for (const quotation of quotationDocument) {
                const { type, type_url } = quotation;
                if (type_url && Array.isArray(type_url)) {
                    for (const url of type_url) {
                        const quot_data = await models.quotation_document.create({
                            customer_id,
                            quotation_id,
                            comment,
                            title,
                            action,
                            status,
                            document_status,
                            start_date,
                            end_date,
                            type,
                            type_url: url,
                            updated_by: cUser.id
                        }, { transaction });

                        await models.document_common_logs.create({
                            user_id: cUser.id,
                            type: 'Quotation',
                            type_id: findQuotation.id,
                            document_type: 'quotation_document',
                            document_type_url: url,
                            remarks: req.body.comment,
                            status,
                            title: req.body.title,
                            action: 'Added_by',
                            added_by: cUser.id,
                        }, { transaction });
                        await models.quotation_action.create({
                            user_id: cUser.id,
                            quotation_id: findQuotation.id,
                            quotation_action: 'Quotation_document',
                            status,
                            title: 'Added_by',
                            updated_by: cUser.id,
                        });
                        await models.user_activity_logs.create({
                            user_id: findCustomer.id,
                            activity: 'Quotation',
                            activity_id: findQuotation.id,
                            activity_type: status,
                            current_data: quot_data,
                            action: 'Added',
                            added_by: cUser.id
                        }, { transaction });

                    }
                    if (findCustomer.email) {
                        const subject = `IndiLink Support: Query ${findQuotationId} Documentation Completed`;
                        const templatePath = path.join(__dirname, '..', '..', '..', 'templates', 'query_document_template.html');
                        let htmlContent = fs.readFileSync(templatePath, 'utf8');
                        htmlContent = htmlContent
                            .replace(/{{full_name}}/g, findCustomer.full_name)
                            .replace(/{{query_id}}/g, findQuotationId)
                            .replace(/{{dashboard_link}}/g, 'https://dashboard.indilink.in/');
                        await sendEmail(findCustomer.email, subject, htmlContent);
                    }
                }
            }
        }
        if (legalDocument && legalDocument.length > 0) {
            for (const legal of legalDocument) {
                const { type, type_url } = legal;
                const legal_doc = await models.quotation_document.create({
                    customer_id,
                    quotation_id,
                    title,
                    action,
                    status,
                    document_status,
                    start_date,
                    end_date,
                    type,
                    type_url,
                    updated_by: cUser.id
                }, { transaction });
                await models.quotation_action.create({
                    user_id: cUser.id,
                    quotation_id: findQuotation.id,
                    quotation_action: 'legal_document_uploaded',
                    status: status,
                    title: 'Added_by',
                    updated_by: cUser.id,
                }, { transaction });
                await models.user_activity_logs.create({
                    user_id: findCustomer.id,
                    activity: 'Quotation',
                    activity_id: findQuotation.id,
                    activity_type: status,
                    current_data: legal_doc,
                    action: 'Added',
                    added_by: cUser.id
                }, { transaction });
            }
            if (findCustomer.email) {
                const subject = `IndiLink Support: Query ${findQuotationId} Documentation Completed`;
                const templatePath = path.join(__dirname, '..', '..', '..', 'templates', 'query_document_template.html');
                let htmlContent = fs.readFileSync(templatePath, 'utf8');
                htmlContent = htmlContent
                    .replace(/{{full_name}}/g, findCustomer.full_name)
                    .replace(/{{query_id}}/g, findQuotationId)
                    .replace(/{{dashboard_link}}/g, 'https://dashboard.indilink.in/');
                await sendEmail(findCustomer.email, subject, htmlContent);
            }
        }
        await models.quotation_store.update(
            {
                status: status
            },
            {
                where: {
                    id: quotation_id
                },
                transaction
            }
        );
        if (cUser.role_id === 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "Query",
                title: "Uploaded document",
                details: `has uploaded document in ${findQuotationId}.`
            });
        }
        await transaction.commit();
        return REST.success(res, null, 'Quotation  documents uploaded successfully');
    } catch (error) {
        await transaction.rollback();
        return REST.error(res, error.message, 500);
    }
});
router.get('/getQuotationsDoc/:store_quotation_id', async function (req, res) {
    try {
        const quotationId = req.params.store_quotation_id
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: quotationId
            }
        })
        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }
        const data = await models.quotation_document.findAll({
            where: {
                quotation_id: findQuotation.id,
                status: {
                    [Op.or]: [
                        "quotation_received",
                        "renew_quotation_received"
                    ]
                }
            },
            order: [["id", "DESC"]],
        })
        return REST.success(res, data, 'Quotations Document fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getLegalDocument/:store_quotation_id', async function (req, res) {
    try {
        const quotationId = req.params.store_quotation_id
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: quotationId
            }
        })
        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }
        const data = await models.quotation_document.findAll({
            where: {
                quotation_id: findQuotation.id,
                status: {
                    [Op.or]: [
                        { [Op.eq]: "legal_uploaded" },
                        { [Op.eq]: "legal_received" }
                    ]
                }
            },
            order: [["id", "DESC"]],
        })
        return REST.success(res, data, 'Legal documents fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.post('/quotationsStatusUpdate', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findStoreQuotations = await models.quotation_store.findOne({
            where: { id: req.body.quotation_id }
        });
        if (!findStoreQuotations) {
            return REST.error(res, 'Store quotation not found', 404);
        }
        const findQuotationUid = findStoreQuotations.store_quotation_id;
        const customerId = findStoreQuotations.customer_id;
        await models.sequelize.transaction(async (transaction) => {
            await models.quotation_store.update(
                { status: req.body.status },
                { where: { id: findStoreQuotations.id }, transaction }
            );
            let notificationTitle = '';
            let notificationMessage = '';
            if (findStoreQuotations.is_renewal === true) {
                switch (req.body.status) {
                    case 'renew_negotiation':
                        notificationTitle = "Renewed Negotiation Started";
                        notificationMessage = `Renewed Negotiation has been started for ${findQuotationUid}.`;
                        break;
                    case 'renew_quotation_completed':
                        notificationTitle = "Renewed Quotation Completed";
                        notificationMessage = `Renewed Quotation completed for ${findQuotationUid}.`;
                        break;
                    case 'renew_legal_received':
                        notificationTitle = "Renewed Legal Document Received";
                        notificationMessage = `A legal document has been received for the Renewed of ${findQuotationUid}. Kindly review the document.`;
                        break;
                    case 'renew_quotation_uploaded':
                        notificationTitle = "Renewed Quotation Uploaded";
                        notificationMessage = `Renewed Quotation document received for ${findQuotationUid}`
                        break;
                    case "renew_asset_suggested":
                        notificationTitle = "Renewed Asset Suggested";
                        notificationMessage = `A store has been suggested in Query ${findQuotationUid}. Please review it.`;
                        break;
                    case 'renew_onboard':
                        notificationTitle = "Renewed Onboard";
                        notificationMessage = `Renewed Assets have been assigned for query ${findQuotationUid}.`
                        break;
                    case 'renew_quotation_received':
                        notificationTitle = "Renewed Quotation Received";
                        notificationMessage = `Renewed Quotation Received document received for ${findQuotationUid}`
                }
            } else {
                switch (req.body.status) {
                    case 'negotiation':
                        notificationTitle = "Negotiation Started";
                        notificationMessage = `Negotiation has been started for ${findQuotationUid}.`;
                        break;
                    case 'quotation_completed':
                        notificationTitle = "Quotation Completed";
                        notificationMessage = `Quotation completed for ${findQuotationUid}.`;
                        break;
                    case 'legal_received':
                        notificationTitle = "Legal Document Received";
                        notificationMessage = `A legal document has been received for ${findQuotationUid}. Kindly review the document.`;
                        break;
                    case "quotation_received":
                        notificationTitle = "Quotation Document Received";
                        notificationMessage = `Quotation document received for ${findQuotationUid}`
                        break;
                }
            }
            const findReceiverToken = await models.User.findOne({
                where: { id: customerId }
            });
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReceiverToken.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, notificationMessage)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: customerId,
                title: notificationTitle,
                messages: notificationMessage,
                notification_type: "Store Management"
            }, { transaction });
            await models.quotation_action.create({
                user_id: cUser.id,
                quotation_id: findStoreQuotations.id,
                quotation_action: req.body.status,
                status: req.body.status,
                title: 'Updated_by',
                updated_by: cUser.id,
            });
            await models.user_activity_logs.create({
                user_id: customerId,
                activity: 'Query',
                activity_id: findStoreQuotations.id,
                activity_type: 'suggest_store',
                current_data: req.body,
                action: 'Added',
                added_by: cUser.id
            }, { transaction });
        });
        return REST.success(res, null, 'Quotation status updated successfully');
    } catch (error) {
        return REST.error(res, error.message || 'An error occurred', 500);
    }
});
router.get('/getDocumentLogs/:type_id', async function (req, res) {
    try {
        console.log("Received type_id:", req.params.type_id);
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: req.params.type_id
            }
        });
        
        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }

        const data = await models.document_common_logs.findAll({
            where: {
                type: 'Quotation',
                type_id: findQuotation.id
            },
            include: [
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]]
        });
        data.forEach(document => {
            if (document.addedby) {
                document.addedby.dataValues.created_at = document.createdAt;
            }
        });

        return REST.success(res, data, 'Document logs fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getStore', async function (req, res) {
    try {
        const { store_uid, store_name, state, city, user_uid } = req.query;
        if (!store_uid && !store_name && !state && !city && !user_uid) {
            return REST.success(res, [], 'No search criteria provided. Please provide at least one search parameter.');
        }

        const storeWhereClause = { is_verified: true };
        if (store_uid) {
            const storeUidsArray = store_uid.split(',').map(uid => uid.trim());
            storeWhereClause.store_uid = { [Op.in]: storeUidsArray };
        }
        if (store_name) {
            storeWhereClause.store_name = { [Op.like]: `%${store_name}% ` };
        }
        if (state) {
            storeWhereClause.state = state;
        }
        if (city) {
            const cityArray = city.split(',').map(c => c.trim());
            storeWhereClause.city = { [Op.in]: cityArray };
        }

        const userWhereClause = {};
        if (user_uid) {
            const userUidsArray = user_uid.split(',').map(uid => uid.trim());
            userWhereClause.user_uid = { [Op.in]: userUidsArray };
        }

        const stores = await models.stores.findAll({
            where: storeWhereClause,
            include: [
                {
                    model: models.User,
                    as: 'user',
                },
                {
                    model: models.store_chambers,
                    attributes: {
                        exclude: ['photo_of_entrance', 'photo_of_chamber']
                    },
                    as: 'table_of_chamber',
                    include: {
                        model: models.store_chamber_images,
                        as: 'chamber_images'
                    }
                }
            ],
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                        SELECT COUNT(*)
                            FROM store_chambers
                            WHERE store_chambers.store_id = stores.id
                    )`),
                        'Total_Chambers',
                    ],
                    [
                        sequelize.literal(`(
                        SELECT SUM(no_of_pallets_for_lease)
                            FROM store_chambers
                            WHERE store_chambers.store_id = stores.id
                    )`),
                        'Total_Number_Of_Pallets_For_Lease',
                    ]
                ],
            },
            order: [[sequelize.literal('Total_Chambers'), 'DESC']],
        });

        stores.forEach(store => {
            const totalPallets = store.table_of_chamber?.reduce((sum, chamber) => {
                return sum + (parseInt(chamber.available_pallets, 10) || 0);
            }, 0) || 0;

            store.dataValues.Total_available_pallets = totalPallets.toString();
        });

        if (stores.length === 0) {
            return REST.success(res, [], 'No stores found for the given search criteria');
        }

        return REST.success(res, stores, 'Stores fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post('/suggestStore', async (req, res) => {
    const cUser = req.body.current_user;
    try {
        const { data, quotation_id } = req.body;
        if (!data || !Array.isArray(data) || data.length === 0) {
            return REST.error(res, 'Invalid input data', 400);
        }
        const findUser = await models.User.findOne({
            where: {
                id: cUser.id
            }
        })
        const findUserId = findUser.id
        const findStoreQuotations = await models.quotation_store.findOne({
            where: { id: quotation_id }
        });
        if (!findStoreQuotations) {
            return REST.error(res, 'Store quotation not found', 404);
        }
        let Data = null;
        const findquotatinUid = findStoreQuotations.store_quotation_id;
        await models.sequelize.transaction(async (transaction) => {
            const suggestedStoreUid = []
            for (let i = 0; i < data.length; i++) {
                const item = data[i];
                const findStore = await models.stores.findOne({
                    where: { id: item.store_id }
                });

                if (!findStore) {
                    throw new Error(`Store with ID ${item.store_id} not found.`);
                }
                suggestedStoreUid.push(findStore.store_uid);
                Data = await models.assigned_partners.create({
                    user_id: item.user_id,
                    store_id: item.store_id,
                    quotation_id: quotation_id,
                    admin_assigned: item.admin_assigned,
                }, { transaction });
            }

            await models.quotation_store.update(
                { status: "asset_suggested" },
                { where: { id: quotation_id }, transaction }
            );
            await models.quotation_action.create({
                user_id: cUser.id,
                quotation_id: quotation_id,
                quotation_action: 'Suggest_Partner',
                title: 'Added_by',
                status: 'asset_suggested',
                updated_by: cUser.id,
            }, { transaction });

            await models.user_activity_logs.create({
                user_id: findUserId,
                activity: 'Query',
                activity_id: req.body.quotation_id,
                activity_type: 'suggest_store',
                current_data: Data,
                action: 'Added',
                added_by: cUser.id
            }, { transaction });

            if (cUser.role_id === 4) {
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Query",
                    title: "Asset suggested",
                    details: `has suggested asset ${suggestedStoreUid.join(', ')} in ${findquotatinUid}.`
                });
            }

            const findReceiverToken = await models.User.findOne({
                where: { id: findStoreQuotations.customer_id },
            });
            const message = `A store has been suggested in Query ${findquotatinUid}. Please review it.`;
            const partnerAndKeyManager = await findPartnerAndKeyManager(findReceiverToken.id);
            await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, message)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findReceiverToken.id,
                title: 'Asset Suggested',
                messages: message,
                notification_type: 'Store Management'
            }, { transaction });
        });
        return REST.success(res, null, 'Store Suggested Successfully');
    } catch (error) {
        console.error("Error during the process:", error);
        return REST.error(res, error.message, 500);
    }
});
router.get('/getSuggestStore/:store_quotation_id', async function (req, res) {
    try {
        const quotationId = req.params.store_quotation_id;
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: quotationId
            }
        });

        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }

        const data = await models.assigned_partners.findAll({
            where: {
                [Op.or]: [
                    { is_suggest_selected: true }
                ],
                quotation_id: findQuotation.id,
            },
            include: [
                {
                    model: models.User,
                    as: "userDetails"
                },
                {
                    model: models.stores,
                    as: "storeDetail",
                    include: [
                        {
                            model: models.store_chambers,
                            as: "table_of_chamber",
                            attributes: {
                                exclude: ["photo_of_entrance", "photo_of_chamber"]
                            },
                            include: [
                                {
                                    model: models.store_chamber_images,
                                    as: 'chamber_images',
                                    attributes: ["id", "type", "image", "created_at", "updated_at"],
                                }
                            ]
                        },
                    ],
                    attributes: {
                        include: [
                            [
                                sequelize.literal(`(
                        SELECT COUNT(*)
                                    FROM store_chambers
                                    WHERE store_chambers.store_id = storeDetail.id
                    )`),
                                'Total_Chambers',
                            ],
                            [
                                sequelize.literal(`(
                        SELECT SUM(available_pallets)
                                    FROM store_chambers
                                    WHERE store_chambers.store_id = storeDetail.id
                    )`),
                                'available_pallets',
                            ],
                            [
                                sequelize.literal(`(
                        SELECT SUM(no_of_pallets_for_lease)
                                    FROM store_chambers
                                    WHERE store_chambers.store_id = storeDetail.id
                    )`),
                                'Total_Number_Of_Pallets_For_Lease',
                            ]
                        ],
                    },
                },
            ],
            order: [["id", "DESC"]]
        });

        return REST.success(res, data, 'Suggested partners fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getPartner', async function (req, res) {
    try {
        const { city } = req.query;
        if (!city) {
            return REST.success(res, [], 'No search criteria provided');
        }
        const cityArray = city.split(',').map(c => c.trim());
        const storeWhereClause = {
            is_verified: true,
            city: {
                [Op.in]: cityArray
            }
        };
        const stores = await models.stores.findAll({
            where: storeWhereClause,
            attributes: ["user_id"],
        });
        const userIds = stores.map(store => store.user_id);
        const userWhereClause = {
            id: {
                [Op.in]: userIds
            }
        };
        const users = await models.User.findAll({
            where: userWhereClause,
            attributes: ["id", "user_uid"]
        });
        return REST.success(res, users, 'Partner List fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getStoreByPartnerId', async function (req, res) {
    try {
        const { user_uid } = req.query;
        if (!user_uid) {
            return REST.error(res, 'User UID is required', 400);
        }
        const userUidsArray = user_uid.split(',').map(uid => uid.trim());
        const findUsers = await models.User.findAll({
            where: {
                user_uid: {
                    [Op.in]: userUidsArray
                }
            }
        });

        if (!findUsers || findUsers.length === 0) {
            return REST.error(res, 'No users found for the provided UIDs', 404);
        }

        const userIds = findUsers.map(user => user.id);
        const data = await models.stores.findAll({
            where: {
                user_id: {
                    [Op.in]: userIds
                }
            },
            attributes: ["id", "store_uid"],
            order: [["id", "DESC"]]
        });
        return REST.success(res, data, 'Stores fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getAssigendPartner/:store_uid/:quotation_id', async function (req, res) {
    try {
        const storeUid = req.params.store_uid;
        const findStore = await models.stores.findOne({
            where: {
                store_uid: storeUid
            }
        });
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        const quotationId = req.params.quotation_id;
        const data = await models.assigned_partners.findAll({
            where: {
                quotation_id: quotationId,
                store_id: findStore.id,
                [Op.or]: [
                    { admin_assigned: true },
                    { is_suggest_selected: true }
                ],
            },
            include: [
                {
                    model: models.User,
                    as: "userDetails"
                },
                {
                    model: models.stores,
                    as: "storeDetail",
                    include: [
                        {
                            model: models.store_chambers,
                            as: "table_of_chamber",
                            attributes: {
                                exclude: ["photo_of_entrance", "photo_of_chamber", "assigned_pallets"]
                            },
                            include: [
                                {
                                    model: models.store_chamber_images,
                                    as: 'chamber_images',
                                    attributes: ["id", "type", "image", "created_at", "updated_at"],
                                }
                            ],
                        },
                        {
                            model: models.quotation_assigned_assets,
                            where: {
                                [Op.and]: [
                                    { type: "store" },
                                    { quotations_id: quotationId }
                                ]
                            },
                            as: "quotation_assigned_assets",
                            required: false
                        }
                    ],
                    attributes: {
                        include: [
                            [
                                sequelize.literal(`(
                        SELECT COUNT(*)
                                    FROM store_chambers
                                    WHERE store_chambers.store_id = storeDetail.id
                    )`),
                                'Total_Chambers',
                            ],
                            [
                                sequelize.literal(`(
                        SELECT SUM(no_of_pallet)
                                    FROM store_chambers
                                    WHERE store_chambers.store_id = storeDetail.id
                    )`),
                                'available_pallets',
                            ]
                        ],
                    },
                }
            ],
            order: [["id", "DESC"]]
        })
        return REST.success(res, data, 'Assigned partners fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getDocumentStatus/:store_quotation_id', async function (req, res) {
    try {
        const quoatationId = req.params.store_quotation_id
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: quoatationId
            }
        });
        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }
        const data = await models.quotation_document.findAll({
            where: {
                quotation_id: findQuotation.id
            },
            order: [["id", "DESC"]]
        })
        return REST.success(res, data, 'Document status fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.post('/adminSugesstStore', async (req, res) => {
    const cUser = req.body.current_user;
    try {
        const { data, quotation_id } = req.body;
        if (!data || !Array.isArray(data) || data.length === 0) {
            return REST.error(res, 'Invalid input data', 400);
        }
        await models.sequelize.transaction(async (transaction) => {
            for (const item of data) {
                await models.assigned_partners.update(
                    {
                        user_id: item.user_id,
                        store_id: item.store_id,
                        quotation_id: quotation_id,
                        is_assigned_partners: item.is_assigned_partners
                    },
                    {
                        where: {
                            user_id: item.user_id,
                            store_id: item.store_id,
                            quotation_id: quotation_id
                        },
                        transaction: transaction
                    }
                );
            }
        });
        return REST.success(res, null, 'Store Suggested Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getSuggestedStoreByAdmin/:store_quotation_id', async function (req, res) {
    try {
        const quotationId = req.params.store_quotation_id;
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: quotationId
            }
        });
        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }
        const suggestedStores = await models.assigned_partners.findAll({
            where: {
                quotation_id: findQuotation.id,
                [Op.or]: [
                    { admin_assigned: true },
                    { is_assigned_partners: true },
                    {
                        [Op.and]: [
                            { is_suggest_selected: false },
                            { is_suggest_selected: true },
                        ]
                    }
                ]
            },
            required: false,
            include: [
                {
                    model: models.User,
                    as: "userDetails"
                },
                {
                    model: models.stores,
                    as: "storeDetail",
                    include: [
                        {
                            model: models.store_chambers,
                            as: "table_of_chamber",
                            attributes: {
                                exclude: ["photo_of_entrance", "photo_of_chamber"]
                            },
                            include: [
                                {
                                    model: models.store_chamber_images,
                                    as: "chamber_images"
                                }
                            ]
                        },
                        {
                            model: models.store_audit,
                            where: { quotation_id: findQuotation.id },
                            required: false,
                            as: "auditDetails"
                        }
                    ],
                    attributes: {
                        include: [
                            [
                                sequelize.literal(`(
                        SELECT COUNT(*)
                                    FROM store_chambers
                                    WHERE store_chambers.store_id = storeDetail.id
                    )`),
                                'Total_Chambers',
                            ],
                            [
                                sequelize.literal(`(
                        SELECT SUM(no_of_pallet)
                                    FROM store_chambers
                                    WHERE store_chambers.store_id = storeDetail.id
                    )`),
                                'Total_Pallets',
                            ],
                            [
                                sequelize.literal(`(
                        SELECT SUM(no_of_pallets_for_lease)
                                    FROM store_chambers
                                    WHERE store_chambers.store_id = storeDetail.id
                    )`),
                                'Total_Number_Of_Pallets_For_Lease',
                            ]
                        ],
                    },
                },
            ]
        });

        suggestedStores.forEach(store => {
            if (store.storeDetail) {
                if (store.storeDetail.table_of_chamber) {
                    const totalPallets = store.storeDetail.table_of_chamber.reduce((sum, chamber) => {
                        return sum + (parseInt(chamber.available_pallets, 10) || 0);
                    }, 0);

                    store.storeDetail.dataValues.Total_available_pallets = totalPallets.toString();
                } else {
                    store.storeDetail.dataValues.Total_available_pallets = '0';
                }
            } else {
                store.dataValues = store.dataValues || {};
                store.dataValues.Total_available_pallets = '0';
            }
        });
        return REST.success(res, suggestedStores, 'Suggested Stores fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getSuggestedPartner/:store_quotation_id', async function (req, res) {
    try {
        const store_quotation_id = req.params.store_quotation_id;
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: store_quotation_id
            }
        });
        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }
        const data = await models.assigned_partners.findAll({
            where: {
                [Op.or]: [
                    { is_assigned_partners: true },
                ],
                quotation_id: findQuotation.id,
            },
            include: [
                {
                    model: models.User,
                    as: "userDetails",
                    attributes: ["id", "user_uid"]
                },
                {
                    model: models.stores,
                    as: "storeDetail"
                }
            ],
            order: [["id", "DESC"]]
        })
        return REST.success(res, data, 'Suggested partners fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getStatus/:quotation_id', async function (req, res) {
    try {
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: req.params.quotation_id
            }
        });
        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }
        const latestStatus = await models.quotation_store.findOne({
            where: {
                store_quotation_id: req.params.quotation_id
            },
            attributes: ['status', "quotation_status", "is_renewal"],
            order: [["id", "DESC"]],
        });
        if (!latestStatus) {
            return REST.success(res, { status: 'pending' });
        }
        return REST.success(res, latestStatus, 'Latest Quotation Document status fetched successfully');
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
        });
        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }
        const data = await models.document_common_logs.findAll({
            where: {
                type_id: findQuotation.id,
                status: "comment_update"
            },
            include: [
                {
                    model: models.User,
                    as: "updatedby",
                    attributes: [
                        "id", "full_name"
                    ]
                }
            ],
            attributes: [
                "id", "user_id", "type", "type_id", "remarks", "updated_by", "createdAt", "updatedAt"
            ]
        })
        data.forEach(logs => {
            if (logs.updatedby) {
                logs.updatedby.dataValues.updated_at = logs.updatedAt;
            }
        })
        return REST.success(res, data, 'Comment fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPalletlogs/:store_quotation_id', async function (req, res) {
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
        const data = await models.quotation_assigned_assets.findAll({
            where: {
                quotations_id: findQuotation.id
            },
            include: [
                {
                    model: models.User,
                    as: "userDetails",
                },
                {
                    model: models.stores,
                    as: "storeDetails",
                },
                {
                    model: models.store_chambers,
                    as: "chamberDetails"
                },
                {
                    model: models.quotation_store,
                    as: "StoreQuotationDetails"
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]],
        })
        data.forEach(item => {
            if (item.addedby) {
                item.dataValues.addedby.dataValues.created_at = item.createdAt;
            }
        });
        return REST.success(res, data, 'Get Pallets Logs Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})

module.exports = router
