const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const { LOG } = require('../../../constants');
const router = express.Router();
const { sendPushNotification } = require('../../../utils/helper');
const support = require('../../../utils/support');

/*
|----------------------------------------------------------------------------------------------------------------
|              Stores Acu Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/create', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        });
        if (cUser.role_id == 3) {
            const validator = make(req.body, {
                store_id: "required|integer",
                make: "required|string",
                model: "required|string",
                hp: "required|string",
                cfm: "required|string",
                tr: "required|string",
                defrosting: "required|string",
                amc: "required|string",
                discharge_outlet_pipe: "required|string",
            });

            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } });
            if (!findStore) {
                return REST.error(res, 'Store not found', 404);
            }

            const findStoreUid = findStore.store_uid;
            const findrequest = await models.request_for_store.findOne({ where: { id: req.body.request_id } });
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const acu_create = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_acu.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    hp: req.body.hp,
                    cfm: req.body.cfm,
                    tr: req.body.tr,
                    defrosting: req.body.defrosting,
                    amc: req.body.amc,
                    discharge_outlet_pipe: req.body.discharge_outlet_pipe,
                    added_by: cUser.id
                }, { transaction });

                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_acu",
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id
                }, { transaction });

                const findReciverToken = await models.User.findOne({ where: { id: findStore.user_id } });

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ACU request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store ACU request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                return data;
            });
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, { where: { id: req.body.request_id } });
            }
            return REST.success(res, acu_create, 'ACU added successfully');
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                store_id: "required|integer",
                make: "required|string",
                model: "required|string",
                hp: "required|string",
                cfm: "required|string",
                tr: "required|string",
                defrosting: "required|string",
                amc: "required|string",
                discharge_outlet_pipe: "required|string",
            });

            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }

            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } });
            if (!findStore) {
                return REST.error(res, 'Store not found', 404);
            }

            const findStoreUid = findStore.store_uid;
            const findrequest = await models.request_for_store.findOne({ where: { id: req.body.request_id } });
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const acu_create = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_acu.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    hp: req.body.hp,
                    cfm: req.body.cfm,
                    tr: req.body.tr,
                    defrosting: req.body.defrosting,
                    amc: req.body.amc,
                    discharge_outlet_pipe: req.body.discharge_outlet_pipe,
                    added_by: cUser.id
                }, { transaction });

                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_acu",
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id
                }, { transaction });

                const findReciverToken = await models.User.findOne({ where: { id: findStore.user_id } });

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ACU request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store acu for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store ACU request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                return data;
            });
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, { where: { id: req.body.request_id } });
            }
            return REST.success(res, acu_create, 'ACU added successfully');
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                store_id: "required|integer",
                request_id: "integer",
                make: "required|string",
                model: "required|string",
                hp: "required|string",
                cfm: "required|string",
                tr: "required|string",
                defrosting: "required|string",
                amc: "required|string",
                discharge_outlet_pipe: "required|string",
            });

            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } });
            if (!findStore) {
                return REST.error(res, 'Store not found', 404);
            }

            const findStoreUid = findStore.store_uid;
            const findrequest = await models.request_for_store.findOne({ where: { id: req.body.request_id } });
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const acu_create = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_acu.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    hp: req.body.hp,
                    cfm: req.body.cfm,
                    tr: req.body.tr,
                    defrosting: req.body.defrosting,
                    amc: req.body.amc,
                    discharge_outlet_pipe: req.body.discharge_outlet_pipe,
                    added_by: cUser.id
                }, { transaction });

                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_acu",
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id
                }, { transaction });

                const findReciverToken = await models.User.findOne({ where: { id: findStore.user_id } });

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ACU request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store acu for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store ACU request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });
                return data;
            });
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, { where: { id: req.body.request_id } });
            }
            return REST.success(res, acu_create, 'ACU added successfully');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.put('/update/:id', async (req, res) => {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        });
        if (cUser.role_id == 3) {
            const id = req.params.id;
            let acuUpdate = await models.store_acu.findOne({ where: { id: id } });
            if (acuUpdate == null) {
                return REST.error(res, 'store acu ID Not Found', 404);
            }
            const storeId = acuUpdate.store_id;
            const store = await models.stores.findOne({ where: { id: storeId } });
            if (!store) {
                return REST.error(res, 'Store not found.', 404);
            }
            const findStoreUid = store.store_uid;
            const findrequest = await models.request_for_store.findOne({ where: { id: req.body.request_id ?? null } });
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_acu.update({
                    make: req.body.make,
                    model: req.body.model,
                    hp: req.body.hp,
                    cfm: req.body.cfm,
                    tr: req.body.tr,
                    defrosting: req.body.defrosting,
                    amc: req.body.amc,
                    discharge_outlet_pipe: req.body.discharge_outlet_pipe,
                    updated_by: cUser.id
                }, {
                    where: { id: acuUpdate.id },
                    transaction
                });
                const updatedData = await models.store_acu.findOne({ where: { id: acuUpdate.id }, transaction });
                const previousData = acuUpdate.dataValues;
                await models.user_activity_logs.create({
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: store.id,
                    activity_type: "store_acu",
                    previous_data: previousData,
                    current_data: updatedData,
                    updated_by: cUser.id,
                    action: "Updated"
                }, { transaction });

                const findReciverToken = await models.User.findOne({ where: { id: store.user_id } });

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ACU request is now complete.`)


                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store ACU request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await models.stores.update(
                    { last_updated_by: cUser.id },
                    { where: { id: store.id }, transaction }
                );
            });
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, {
                    where: {
                        id: req.body.request_id ?? null,
                    }
                });
                return REST.success(res, null, 'Update Store Acu successfully.');
            } else {
                return REST.success(res, null, 'Update Store Acu successfully.');
            }
        }
        else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const id = req.params.id;
            let acuUpdate = await models.store_acu.findOne({ where: { id: id } });
            if (acuUpdate == null) {
                return REST.error(res, 'store acu ID Not Found', 404);
            }
            const storeId = acuUpdate.store_id;
            const store = await models.stores.findOne({ where: { id: storeId } });
            if (!store) {
                return REST.error(res, 'Store not found.', 404);
            }
            const findStoreUid = store.store_uid;
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null
                }
            });
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_acu.update({
                    make: req.body.make,
                    model: req.body.model,
                    hp: req.body.hp,
                    cfm: req.body.cfm,
                    tr: req.body.tr,
                    defrosting: req.body.defrosting,
                    amc: req.body.amc,
                    discharge_outlet_pipe: req.body.discharge_outlet_pipe,
                    updated_by: cUser.id
                }, {
                    where: { id: acuUpdate.id },
                    transaction
                });
                const updatedData = await models.store_acu.findOne({ where: { store_id: req.params.id }, transaction });
                const previousData = acuUpdate.dataValues;
                await models.user_activity_logs.create({
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: store.id,
                    activity_type: "store_acu",
                    previous_data: previousData,
                    current_data: updatedData,
                    updated_by: cUser.id,
                    action: "Updated"
                }, { transaction });

                const findReciverToken = await models.User.findOne({
                    where: {
                        id: store.user_id
                    }
                });

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ACU request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store acu for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store ACU request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await models.stores.update(
                    { last_updated_by: cUser.id },
                    {
                        where: { id: store.id },
                        transaction
                    }
                );
            });
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, {
                    where: {
                        id: req.body.request_id ?? null,
                    }
                });
                return REST.success(res, null, 'Update Store Acu successfully.');
            } else {
                return REST.success(res, null, 'Update Store Acu successfully.');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const id = req.params.id;
            let acuUpdate = await models.store_acu.findOne({ where: { id: id } });
            if (acuUpdate == null) {
                return REST.error(res, 'store acu ID Not Found', 404);
            }
            const storeId = acuUpdate.store_id;
            const store = await models.stores.findOne({ where: { id: storeId } });
            if (!store) {
                return REST.error(res, 'Store not found.', 404);
            }
            const findStoreUid = store.store_uid;
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null
                }
            });
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_acu.update({
                    make: req.body.make,
                    model: req.body.model,
                    hp: req.body.hp,
                    cfm: req.body.cfm,
                    tr: req.body.tr,
                    defrosting: req.body.defrosting,
                    amc: req.body.amc,
                    discharge_outlet_pipe: req.body.discharge_outlet_pipe,
                    updated_by: cUser.id
                }, {
                    where: { id: acuUpdate.id },
                    transaction
                });
                const updatedData = await models.store_acu.findOne({ where: { store_id: req.params.id }, transaction });
                const previousData = acuUpdate.dataValues;
                await models.user_activity_logs.create({
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: store.id,
                    activity_type: "store_acu",
                    previous_data: previousData,
                    current_data: updatedData,
                    updated_by: cUser.id,
                    action: "Updated"
                }, { transaction });

                const findReciverToken = await models.User.findOne({
                    where: {
                        id: store.user_id
                    }
                });

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ACU request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store acu for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store ACU request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await models.stores.update(
                    { last_updated_by: cUser.id },
                    {
                        where: { id: store.id },
                        transaction
                    }
                );
            });
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, {
                    where: {
                        id: req.body.request_id ?? null,
                    }
                });
                return REST.success(res, null, 'Update Store Acu successfully.');
            }
        }
    } catch (error) {
        console.log(error, "error")
        return REST.error(res, 'An error occurred while processing the request', 500);
    }
});
router.get('/getAcu', async function (req, res) {
    try {
        const storeUid = req.query.store_uid;
        const findStore = await models.stores.findOne({
            where: {
                store_uid: storeUid
            }
        });
        if (findStore == null) {
            return REST.error(res, 'Store not found.', 404);
        }
        const data = await models.store_acu.findAll({
            where: { store_id: findStore.dataValues.id },
            include: [
                {
                    model: models.User,
                    as: "UpdatedByusers",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]],
        })
        const requestKeys = [
            "store_acu",
        ]
        const requests = await Promise.all(requestKeys.map(async (key) => {
            return models.request_for_store.findAll({
                where: { section_id: findStore.id, section_key: key }
            });
        }));
        const flatArray = requests.flat();
        data.forEach(storeAcu => {
            if (storeAcu.addedby) {
                storeAcu.dataValues.addedby.dataValues.created_at = storeAcu.createdAt;
                if (storeAcu.dataValues.addedby !== null) {
                    storeAcu.dataValues.addedby.dataValues.created_at = storeAcu.createdAt;
                }
            }
            if (storeAcu.UpdatedByusers) {
                if (storeAcu.dataValues.UpdatedByusers !== null) {
                    storeAcu.dataValues.UpdatedByusers.dataValues.updated_at = storeAcu.updatedAt;
                }
            }
        });
        if (data.length === 0 && flatArray.length > 0) {
            const newData = {
                data: [],
                requests: flatArray,
            };
            return REST.success(res, newData, 'Get request successfully.');
        }

        const newData = {
            data,
            requests: flatArray,
        };
        if (data.length == 0) {
            return REST.error(res, 'Data not found.', 200);
        }
        return REST.success(res, newData, 'Get All acu successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.delete('/deleteAcu/:id', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const id = req.params.id
        const store = await models.store_acu.findOne({ where: { id: id } })
        if (store == null) {
            return REST.error(res, 'acu not found.', 404)
        }
        await models.store_acu.destroy({ where: { id: id } })
        return REST.success(res, null, 'acu delete successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router;