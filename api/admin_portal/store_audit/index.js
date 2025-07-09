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
const { sendEmail } = require('../../../utils/helper')
const fs = require('fs');
const path = require('path')
/*
|----------------------------------------------------------------------------------------------------------------
|                     Partner Audit Apis
|----------------------------------------------------------------------------------------------------------------
*/

router.post('/UploadAuditDocument', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const validator = make(req.body, {
            user_id: "required|integer",
            store_id: "required|integer",
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const findStore = await models.stores.findOne({
            where: {
                id: req.body.store_id,
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        const storeName = findStore.store_name
        const storeUid = findStore.store_uid
        const findUser = await models.User.findOne({
            where: {
                id: req.body.user_id
            }
        })
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        let auditDoc;
        const audit = await models.sequelize.transaction(async (transaction) => {
            auditDoc = await models.store_audit.create({
                user_id: req.body.user_id,
                store_id: req.body.store_id,
                audit_document_url: req.body.audit_document_url,
                action: req.body.action,
                added_by: cUser.id
            },
                {
                    transaction: transaction
                })
            return auditDoc;
        })
        const findReciverToken = await models.User.findOne({
            where: {
                id: findUser.id
            }
        })
        const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);
        await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `An Audit document has been received for ${storeName} in your account. Kindly review the document and acknowledge it`)
        await models.notification.create({
            sender_id: cUser.id,
            reciver_id: req.body.user_id,
            title: `Partner audit document received`,
            messages: `An Audit document has been received for ${storeName} in your account. Kindly review the document and acknowledge it`,
            notification_type: "Store Management"

        });
        if (cUser.role_id === 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "audit_document",
                title: 'partner_audit',
                details: `has uploaded an audit document in ${storeUid}.`
            });
        }
        auditDoc = await models.store_audit.findByPk(auditDoc.id)
        delete req.body.current_user
        await models.user_activity_logs.create({
            user_id: req.body.user_id,
            activity: "Quotation",
            activity_id: findStore.id,
            activity_type: "audit_document",
            current_data: auditDoc,
            added_by: cUser.id,
            action: "Added"
        })
        return REST.success(res, audit, 'Store Audit Dcocument Uploaded Success');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getAudit/:store_uid', async function (req, res) {
    try {
        const findStore = await models.stores.findOne({
            where: {
                store_uid: req.params.store_uid,
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        const data = await models.store_audit.findAll({
            where: {
                store_id: findStore.id
            },
            attributes: {
                exclude: ["customer_status"]
            },
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "updatedBy",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.stores,
                    as: "storeDetails",
                    include: [{
                        model: models.store_chambers,
                        attributes: {
                            exclude: ["photo_of_entrance", "photo_of_chamber"]
                        },
                        as: "table_of_chamber",
                        include: [
                            {
                                model: models.store_chamber_images,
                                as: 'chamber_images',
                                attributes: ["id", "type", "image", "created_at", "updated_at"],
                            }
                        ]
                    },
                    ]
                }
            ],
            order: [['id', 'DESC']],
        })
        data.forEach(store => {
            store.addedBy.dataValues.created_at = store.createdAt
        })
        data.forEach(store => {
            if (store.updatedBy)
                store.updatedBy.dataValues.updated_at = store.updatedAt
        })
        return REST.success(res, data, 'Store Audit Dcocuments');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.post('/renewedAuditDoc', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const validator = make(req.body, {
            user_id: "required|integer",
            store_id: "required|integer",
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const findStore = await models.stores.findOne({
            where: {
                id: req.body.store_id,
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        const storeUid = findStore.store_uid
        const findUser = await models.User.findOne({
            where: {
                id: req.body.user_id
            }
        })
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        const audit = await models.sequelize.transaction(async (transaction) => {
            const data = await models.store_audit.create({
                user_id: req.body.user_id,
                store_id: req.body.store_id,
                audit_document_url: req.body.audit_document_url,
                action: req.body.action,
                status: req.body.status,
                added_by: cUser.id
            },
                {
                    transaction: transaction
                })
            return data;
        })
        if (cUser.role_id === 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "audit_document",
                title: 'partner_audit_update',
                details: `has renewed audit document in ${storeUid}.`
            });
        }
        let notificationMessage = `An audit document has been renewed for ${storeUid} in your account. Kindly review the document and acknowlege it `;
        const findReciverToken = await models.User.findOne({
            where: {
                id: findUser.id
            }
        })
        const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);
        await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, notificationMessage)
        await models.notification.create({
            sender_id: cUser.id,
            reciver_id: findUser.id,
            title: `Audit Document Renewed`,
            messages: notificationMessage,
            notification_type: "Store Management"
        });
        const currentDocs = audit.dataValues;
        delete req.body.current_user
        await models.user_activity_logs.create({
            user_id: req.body.user_id,
            activity: "Quotation",
            activity_id: req.body.store_id,
            activity_type: "audit_document",
            current_data: currentDocs,
            added_by: cUser.id,
            action: "Added"
        });
        return REST.success(res, audit, 'Store Audit Document updated Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})

/*
|----------------------------------------------------------------------------------------------------------------
|                     Customer Audit Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.put('/updateAuditStatus/:audit_id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findAudit = await models.store_audit.findOne({
            where: {
                id: req.params.audit_id,
            }
        })
        if (!findAudit) {
            return REST.error(res, 'Store Audit not found', 404);
        }
        const findUser = await models.User.findOne({
            where: {
                id: findAudit.user_id
            }
        })
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        const userUid = findUser.user_uid
        const findStore = await models.stores.findOne({
            where: {
                id: findAudit.store_id
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        const findQuotation = await models.quotation_store.findOne({
            where: {
                id: findAudit.dataValues.quotation_id
            }
        })
        if (!findQuotation) {
            return REST.error(res, 'QuotationId not found', 404);
        }
        const storeUid = findStore.store_name
        const stroeName = findStore.store_uid
        const quotationId = findQuotation.store_quotation_id
        await models.sequelize.transaction(async (transaction) => {
            await models.store_audit.update({
                status: req.body.status,
                updated_by: cUser.id
            },
                {
                    where: {
                        id: req.params.audit_id
                    },
                    transaction: transaction
                })
            const updateStatus = req.body.status;
            let Title = '';
            let notificationMessage = '';
            if (updateStatus === "Approved") {
                Title = "Audit Document Approved";
                notificationMessage = `An Audit document has been Approved for ${storeUid} in ${quotationId} account ${userUid}`
            } else if (updateStatus === "Declined") {
                Title = "Audit Document Declined";
                notificationMessage = `An Audit document has been Declined for ${storeUid} in ${quotationId} in account ${userUid}`
            }
            const findReceiverToken = await models.User.findOne({
                where: {
                    id: findUser.id
                }
            })
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReceiverToken.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, notificationMessage)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findUser.id,
                title: Title,
                messages: notificationMessage,
                notification_type: "Store Management"
            });
        })
        const findAudit2 = await models.store_audit.findOne({
            where: {
                id: req.params.audit_id,
            }
        })
        await models.quotation_action.create({
            user_id: cUser.id,
            quotation_id: findAudit2.quotation_id,
            quotation_action: 'Audit_Status',
            title: 'updated_by',
            status: req.body.status,
            updated_by: cUser.id,
        })
        if (cUser.role_id === 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "Query",
                title: `Audit ${req.body.status}`,
                details: `${req.body.status} audit of ${stroeName} in ${quotationId}.`
            });
        }
        const currentData = findAudit2.dataValues
        previousData = findAudit.dataValues
        delete req.body.current_user
        await models.user_activity_logs.create({
            user_id: findQuotation.customer_id,
            activity: "Quotation",
            activity_id: findQuotation.id,
            activity_type: "customer_audit",
            previous_data: previousData,
            current_data: currentData,
            updated_by: cUser.id,
            action: "Updated"
        })
        return REST.success(res, findAudit2, 'Store Audit Status Updated');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.post('/uploadeCustomerAuidt', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const validator = make(req.body, {
            user_id: "required|integer",
            store_id: "required|integer",
            quotation_id: "required|integer"
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const findUser = await models.User.findOne({
            where: {
                id: req.body.user_id
            }
        })
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        const findQuotation = await models.quotation_store.findOne({
            where: {
                id: req.body.quotation_id
            }
        })
        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }
        const findqotationUid = findQuotation.store_quotation_id
        const findStore = await models.stores.findOne({
            where: {
                id: req.body.store_id
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        const storeName = findStore.store_name
        const storeUid = findStore.store_uid
        const audit = await models.sequelize.transaction(async (transaction) => {
            const data = await models.store_audit.create({
                user_id: req.body.user_id,
                store_id: req.body.store_id,
                quotation_id: req.body.quotation_id,
                audit_document_url: req.body.audit_document_url,
                action: req.body.action,
                status: constants.STORE_AUDIT.STATUSES.PENDING,
                is_acknowledge: req.body.is_acknowledge,
                added_by: cUser.id
            },
                {
                    transaction: transaction
                })
            return data;
        })
        const findReciverToken = await models.User.findOne({
            where: {
                id: findQuotation.customer_id
            }
        })
        const message = `An Audit document has been received for ${storeName} for your query ${findqotationUid}.Kindly review the document and acknowledge it`
        const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);
        await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, message)
        await models.notification.create({
            sender_id: cUser.id,
            reciver_id: req.body.user_id,
            title: `Customer's Audit Document Received`,
            messages: message,
            notification_type: "Store Management"
        });
        if (findReciverToken.email) {
            const subject = `IndiLink Support: Query ${findqotationUid} Documentation Completed`;
            const templatePath = path.join(__dirname, '..', '..', '..', 'templates', 'query_document_template.html');
            let htmlContent = fs.readFileSync(templatePath, 'utf8');
            htmlContent = htmlContent
                .replace(/{{full_name}}/g, findReciverToken.full_name)
                .replace(/{{query_id}}/g, findqotationUid)
                .replace(/{{dashboard_link}}/g, 'https://dashboard.indilink.in/');
            await sendEmail(findReciverToken.email, subject, htmlContent);
        }
        await models.quotation_action.create({
            user_id: cUser.id,
            quotation_id: req.body.quotation_id,
            quotation_action: 'Audit_Documents',
            title: 'Added_by',
            status: 'pending',
            added_by: cUser.id,
        })
        if (cUser.role_id === 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "audit",
                title: `customer audit`,
                details: `has  audit of ${storeUid} in ${findqotationUid}.`
            });
        }
        const currentDocs = req.body;
        delete req.body.current_user
        await models.user_activity_logs.create({
            user_id: findQuotation.customer_id,
            activity: "Quotation",
            activity_id: findQuotation.id,
            activity_type: "customer_audit",
            current_data: currentDocs,
            added_by: cUser.id,
            action: "Added"
        });
        return REST.success(res, audit, 'Customer Audit created successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router