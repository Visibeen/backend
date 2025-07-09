const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const { sendPushNotification } = require('../../../utils/helper')
const support = require('../../../utils/support')

/*
|----------------------------------------------------------------------------------------------------------------
|                                   Legal Documents Apis
|----------------------------------------------------------------------------------------------------------------
*/
const getNextBlockId = async () => {
    const lastEntry = await models.legal_document_action.findAll({
        order: [["block_id", 'DESC']],
        limit: 1,
        attributes: ["block_id"],
    });
    return lastEntry.length === 0 ? 1 : lastEntry[0].dataValues.block_id + 1;;
};
router.post('/createLegalDocument', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const validator = make(req.body, {
            user_id: "required|integer",
            type: "required|string",
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const allowedTypes = ["store", "move", "prepare"];
        if (!allowedTypes.includes(req.body.type)) {
            return REST.error(res, 'Invalid type', 400);
        }
        const findUser = await models.User.findOne({
            where: {
                id: req.body.user_id
            }
        });
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        const findStore = await models.stores.findOne({
            where: {
                id: req.body.store_id
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        const storeUid = findStore.store_uid;
        const updateStatus = req.body.document_name;
        let Title = '';
        let title2 = '';
        if (updateStatus === "NDA Document") {
            Title = "nda_document";
            title2 = "NDA Document"
        } else if (updateStatus === "MOU Document") {
            Title = "mou_document";
            title2 = "MOU Document"
        } else if (updateStatus === "WSA Document") {
            Title = "wsa_document";
            title2 = "WSA Document"
        }
        let legalNewDocID;
        await models.sequelize.transaction(async (transaction) => {
            legalNewDocID = await models.legal_document.create({
                user_id: req.body.user_id,
                start_date: req.body.start_date,
                end_date: req.body.end_date,
                store_id: req.body.store_id,
                type: req.body.type,
                title: Title,
                documnet_url: req.body.document_url,
                document_name: req.body.document_name,
                status: req.body.status,
                added_by: cUser.id,
            }, { transaction: transaction });
            ;
            let blockId = await getNextBlockId()
            await models.legal_document_action.create({
                legal_id: legalNewDocID.id,
                block_id: blockId,
                type: req.body.document_name,
                document_url: req.body.document_url,
                status: req.body.status,
                added_by: cUser.id
            })
        });
        let notificationMessage = `You have received a legal document ${req.body.title} ${storeUid}. Kindly review it and upload the signed document.`;
        const findReciverToken = await models.User.findOne({
            where: {
                id: findUser.id
            }
        })
        // Find partnerAndKeyManager
        const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

        // send notification
        await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, notificationMessage)

        await models.notification.create({
            sender_id: cUser.id,
            reciver_id: findUser.id,
            title: `Legal Document Received`,
            messages: notificationMessage,
            notification_type: "Store Management"
        });
        if (cUser.role_id === 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: Title,
                title: title2,
                details: `has uploaded a legal ${title2} in ${storeUid}.`
            });
        }
        legalNewDocID = await models.legal_document.findByPk(legalNewDocID.id)
        delete req.body.current_user
        await models.user_activity_logs.create({
            user_id: req.body.user_id,
            activity: "Store",
            activity_id: findStore.id,
            activity_type: 'legal_document',
            current_data: legalNewDocID,
            added_by: cUser.id,
            action: "Added"
        })
        return REST.success(res, null, 'Legal Document created successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getlegaldocs', async function (req, res) {
    try {
        const { type, store_id, move_id, prepare_id } = req.query;
        const findStore = await models.stores.findOne({
            where: {
                store_uid: store_id
            }
        });
        let data;
        if (['store', 'move', 'prepare'].includes(type)) {
            const whereCondition = {
                type: type,
            };
            if (type === "store" && findStore?.id) {
                whereCondition.store_id = findStore.id;
            } else if (type === "move" && move_id) {
                whereCondition.move_id = move_id;
            } else if (type === "prepare" && prepare_id) {
                whereCondition.prepare_id = prepare_id;
            } else {
                return REST.error(res, `${type} id is required`, 400);
            }
            const allDocs = await models.legal_document.findAll({
                where: whereCondition,
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
                        model: models.legal_document_action,
                        as: "legalDocActions",
                        separate: true,
                        limit: 1,
                        order: [['id', 'DESC']],
                        attributes: ["id", "legal_id", "block_id", "type", "document_url", "createdAt", "updatedAt"]
                    }
                ],
                subQuery: false,
                order: [['updatedAt', 'DESC']],
            });
            const titles = ['nda_document', 'mou_document', 'wsa_document'];
            const latestDocs = titles.map(title => {
                return allDocs
                    .filter(doc => doc.title === title)
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
            }).filter(Boolean);
            latestDocs.forEach(doc => {
                if (doc.addedBy) {
                    doc.addedBy.dataValues.created_at = doc.createdAt;
                }
                if (doc.updatedBy) {
                    doc.updatedBy.dataValues.updated_at = doc.updatedAt;
                }
            });
            return REST.success(res, latestDocs, 'Latest Legal Documents fetched successfully', 200);
        } else {
            return REST.error(res, 'Invalid type', 400);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getCustomerDoc', async function (req, res) {
    try {
        const { type, store_id, move_id, prepare_id } = req.query;
        let data;

        if (['store', 'move', 'prepare'].includes(type)) {
            const whereCondition = {
                type: type,
                customer_document_status: "Uploaded"
            };
            if (type === "store" && store_id) {
                whereCondition.store_id = store_id;
            } else if (type === "move" && move_id) {
                whereCondition.move_id = move_id;
            } else if (type === "prepare" && prepare_id) {
                whereCondition.prepare_id = prepare_id;
            } else {
                return REST.error(res, `${type} id is required`, 400);
            }

            data = await models.legal_document.findAll({
                where: whereCondition,
                attributes: [
                    "id", "user_id", "store_id", "customer_document_status",
                    "customer_document_url", "type", "title", "added_by", "updated_by", "createdAt", "updatedAt"
                ],
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
                    }
                ],
            });
            data.forEach(doc => {
                if (doc.addedBy) {
                    doc.addedBy.dataValues.created_at = doc.createdAt;
                }
                if (doc.updatedBy) {
                    doc.updatedBy.dataValues.updated_at = doc.updatedAt;
                }
            });
            return REST.success(res, data, 'Legal Document fetched successfully', 200);
        } else {
            return REST.error(res, 'Invalid type', 400);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getLatestStatus/:store_uid', async function (req, res) {
    try {
        const findStore = await models.stores.findOne({
            where: {
                store_uid: req.params.store_uid
            }
        });
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        const data = await models.legal_document.findAll({
            where: {
                store_id: findStore.id,
            },
            attributes: ["id", "status", "customer_document_status", "createdAt", "updatedAt"],
        });
        if (data.length === 0) {
            return REST.success(res, {}, 'No legal documents found for this store', 200);
        }
        const latestDoc = data.reduce((latest, doc) => {
            return new Date(doc.updatedAt) > new Date(latest.updatedAt) ? doc : latest;
        });
        const response = {
            id: latestDoc.id,
            status: latestDoc.status,
            customer_document_status: latestDoc.customer_document_status,
            createdAt: latestDoc.createdAt,
            updatedAt: latestDoc.updatedAt
        };
        return REST.success(res, response, 'Latest Legal Document status fetched successfully', 200);
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post('/renewedLegalDocument', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const validator = make(req.body, {
            user_id: "required|integer",
            type: "required|string",
        });
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const findUser = await models.User.findOne({
            where: {
                id: req.body.user_id
            }
        });
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        const findStore = await models.stores.findOne({
            where: {
                id: req.body.store_id
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        const storeUid = findStore.store_uid;
        const updateStatus = req.body.document_name;
        let Title = '';
        let title2 = '';
        if (updateStatus === "NDA Document") {
            Title = "nda_document";
            title2 = "NDA Document"
        } else if (updateStatus === "MOU Document") {
            Title = "mou_document";
            title2 = "MOU Document"
        } else if (updateStatus === "WSA Document") {
            Title = "wsa_document";
            title2 = "WSA Document"
        }
        const legal = await models.sequelize.transaction(async (transaction) => {
            const data = await models.legal_document.create({
                user_id: req.body.user_id,
                start_date: req.body.start_date,
                end_date: req.body.end_date,
                store_id: req.body.store_id,
                type: req.body.type,
                title: Title,
                documnet_url: req.body.document_url,
                document_name: req.body.document_name,
                status: req.body.status,
                added_by: cUser.id,
            }, {
                transaction: transaction
            });
            return data;
        });
        let blockId = await getNextBlockId()
        await models.legal_document_action.create({
            legal_id: legal.id,
            block_id: blockId,
            type: req.body.document_name,
            document_url: req.body.documnet_url,
            status: req.body.status,
            updated_by: cUser.id
        })
        if (cUser.role_id === 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: Title,
                title: title2,
                details: `has renewed a legal ${title2} in ${storeUid}.`
            });
        }
        let notificationMessage = `A legal document ${title2} has been renewed for ${storeUid}. Kindly review it and upload signed document`;
        const findReciverToken = await models.User.findOne({
            where: {
                id: findUser.id
            }
        })
       // Find partnerAndKeyManager
       const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

       // send notification
       await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, notificationMessage);
       
        await models.notification.create({
            sender_id: cUser.id,
            reciver_id: findUser.id,
            title: `Legal Document Renewed`,
            messages: notificationMessage,
            notification_type: "Store Management"
        });
        const currentDocs = legal.dataValues;
        delete req.body.current_user
        await models.user_activity_logs.create({
            user_id: req.body.user_id,
            activity: "Store",
            activity_id: req.body.store_id,
            activity_type: 'legal_document',
            current_data: currentDocs,
            added_by: cUser.id,
            action: "Added"
        });
        return REST.success(res, null, 'Legal Document created successfully', 201);
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

router.post('/createEndDate', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const status = req.body.status || "N/A";
        const legal = await models.sequelize.transaction(async (transaction) => {
            const data = await models.legal_document.create({
                user_id: req.body.user_id,
                start_date: req.body.start_date,
                end_date: req.body.end_date,
                store_id: req.body.store_id,
                type: req.body.type,
                status: req.body.status,
                lease_title: req.body.lease_title,
                added_by: cUser.id,
            }, {
                transaction: transaction
            });
            return data;
        });
        const currentDocs = legal.dataValues
        const action = status === "Updated" ? "Updated" : "Added";
        await models.user_activity_logs.create({
            user_id: req.body.user_id,
            activity: "Store",
            activity_id: req.body.store_id,
            activity_type: "legal_document",
            current_data: currentDocs,
            added_by: cUser.id,
            action: action
        });
        return REST.success(res, legal, 'Legal Document created successfully', 201);
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/updateEndDate/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const legalId = req.params.id
        const findLegal = await models.legal_document.findOne({
            where: {
                id: legalId
            }
        })
        if (!findLegal) {
            return REST.error(res, 'legal not found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            await models.legal_document.update({
                start_date: req.body.start_date,
                end_date: req.body.end_date,
                status: req.body.status,
                updated_by: cUser.id
            },
                {
                    where: { id: legalId },
                    transaction: transaction
                }
            )
        })
        const findNew = await models.legal_document.findOne({
            where: { id: legalId },
        })
        const currentDocs = findNew.dataValues
        const previousData = findLegal.dataValues
        await models.user_activity_logs.create({
            user_id: req.body.user_id,
            activity: "Legal_Document",
            activity_id: req.body.store_id,
            activity_type: "legal_document",
            previous_data: previousData,
            current_data: currentDocs,
            updated_by: cUser.id,
            action: "updated"
        });
        return REST.success(res, findNew, 'legal update successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getStartDate/:store_uid', async function (req, res) {
    try {
        const storeUid = req.params.store_uid
        const findStore = await models.stores.findOne({
            where: {
                store_uid: storeUid
            }
        })
        if (!findStore) {
            return REST.error(res, 'stores not found', 404);
        }
        const data = await models.legal_document.findAll({
            where: {
                store_id: findStore.id,
                [Op.or]: [
                    { start_date: { [Op.not]: null } },
                    { end_date: { [Op.not]: null } }
                ]
            },
            attributes: ["id", "store_id", "type", "user_id", "start_date", "end_date", "createdAt", "updatedAt"],
            order: [["id", "DESC"]]
        })
        return REST.success(res, data, 'Legal Get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router
