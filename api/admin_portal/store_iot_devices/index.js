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
const { sendPushNotification } = require('../../../utils/helper')


/*
|----------------------------------------------------------------------------------------------------------------
|              Stores Iot Devices Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createIotDevices', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        })
        if (cUser.role_id == 3) {
            const validator = make(req.body, {
                store_id: "required|integer",
                type: "required|string",
                make: "required|string",
                model: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const storeUid = findStore.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const create_iot_devices = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_iot_devices.create({
                    store_id: req.body.store_id,
                    type: req.body.type,
                    iot_devices_id: req.body.iot_devices_id,
                    make: req.body.make,
                    model: req.body.model,
                    internet_status: req.body.internet_status,
                    added_by: cUser.id

                },
                    {
                        transaction: transaction
                    }
                );
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findStore.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store iot devices request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${storeUid}`,
                    messages: `Your Basic Information store iot devices request is now complete.`,
                    notification_type: "Store Management"
                }, { transaction });

                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: 'store_iot_devices',
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id

                });
                return data;
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
                return REST.success(res, create_iot_devices, 'Add iot_devices Successfully');
            } else {
                return REST.success(res, create_iot_devices, 'Add iot_devices Successfully');
            }
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                store_id: "required|integer",
                type: "required|string",
                make: "required|string",
                model: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const storeUid = findStore.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const create_iot_devices = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_iot_devices.create({
                    store_id: req.body.store_id,
                    type: req.body.type,
                    iot_devices_id: req.body.iot_devices_id,
                    make: req.body.make,
                    model: req.body.model,
                    internet_status: req.body.internet_status,
                    added_by: cUser.id

                },
                    {
                        transaction: transaction
                    }
                );
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findStore.user_id
                    }
                })
                const findPartnerUid = findReciverToken.user_uid

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store iot devices request is now complete.`)

                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store iot devices for ${storeUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${storeUid}`,
                    messages: `Your Basic Information store iot devices request is now complete.`,
                    notification_type: "Store Management"
                }, { transaction });

                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: 'store_iot_devices',
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id

                });
                return data;
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, create_iot_devices, 'Add iot_devices Successfully');

        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                store_id: "required|integer",
                type: "required|string",
                make: "required|string",
                model: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const storeUid = findStore.store_uid
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const create_iot_devices = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_iot_devices.create({
                    store_id: req.body.store_id,
                    type: req.body.type,
                    iot_devices_id: req.body.iot_devices_id,
                    make: req.body.make,
                    model: req.body.model,
                    internet_status: req.body.internet_status,
                    added_by: cUser.id

                },
                    {
                        transaction: transaction
                    }
                );
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findStore.user_id
                    }
                })
                const findPartnerUid = findReciverToken.user_uid

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store iot devices request is now complete.`)

                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store iot devices for ${storeUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${storeUid}`,
                    messages: `Your Basic Information store iot devices request is now complete.`,
                    notification_type: "Store Management"
                }, { transaction });

                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: 'store_iot_devices',
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id

                });
                return data;
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, create_iot_devices, 'Add iot_devices Successfully');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/updateIotDevices/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        })
        if (cUser.role_id == 3) {
            var findIotDevices;
            findIotDevices = await models.store_iot_devices.findOne({ where: { id: req.params.id } })
            if (findIotDevices == null) {
                return REST.error(res, 'Iot Devices not found', 404)
            }
            const storeId = findIotDevices.store_id;
            const store = await models.stores.findOne({ where: { id: storeId } });
            if (store == null) {
                return REST.error(res, 'Store not found.', 404);
            }
            const storeUid = store.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const data = req.body
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_iot_devices.update({
                    type: data.type,
                    iot_devices_id: req.body.iot_devices_id,
                    make: data.make,
                    model: data.model,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findIotDevices.id },
                        transaction: transaction
                    }
                )
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: store.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store iot devices request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${storeUid}`,
                    messages: `Your Basic Information store iot devices request is complete.`,
                    notification_type: "Store Management"
                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: storeId },
                    transaction: transaction
                });
            })
            await models.sequelize.transaction(async (transaction) => {
                const storeIt = await models.store_iot_devices.findOne({ where: { id: req.params.id } })
                const previousData = findIotDevices.dataValues;
                delete req.body.current_user;
                const currentData = storeIt.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_iot_devices",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, null, 'Update iot_devices success.');
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            var findIotDevices;
            findIotDevices = await models.store_iot_devices.findOne({ where: { id: req.params.id } })
            if (findIotDevices == null) {
                return REST.error(res, 'Iot Devices not found', 404)
            }
            const storeId = findIotDevices.store_id;
            const store = await models.stores.findOne({ where: { id: storeId } });
            if (store == null) {
                return REST.error(res, 'Store not found.', 404);
            }
            const storeUid = store.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            const data = req.body
            await models.sequelize.transaction(async (transaction) => {
                await models.store_iot_devices.update({
                    type: data.type,
                    iot_devices_id: req.body.iot_devices_id,
                    make: data.make,
                    model: data.model,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findIotDevices.id },
                        transaction: transaction
                    }
                )
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: store.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store iot devices request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store iot devices for ${storeUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${storeUid}`,
                    messages: `Your Basic Information store iot devices request is complete.`,
                    notification_type: "Store Management"
                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: storeId },
                    transaction: transaction
                });
            })
            await models.sequelize.transaction(async (transaction) => {
                const storeIt = await models.store_iot_devices.findOne({ where: { id: req.params.id } })
                const previousData = findIotDevices.dataValues;
                delete req.body.current_user;
                const currentData = storeIt.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_iot_devices",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
                return REST.success(res, null, 'Update iot_devices success.');
            } else {
                return REST.success(res, null, 'Update iot_devices success.');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            var findIotDevices;
            findIotDevices = await models.store_iot_devices.findOne({ where: { id: req.params.id } })
            if (findIotDevices == null) {
                return REST.error(res, 'Iot Devices not found', 404)
            }
            const storeId = findIotDevices.store_id;
            const store = await models.stores.findOne({ where: { id: storeId } });
            if (store == null) {
                return REST.error(res, 'Store not found.', 404);
            }
            const storeUid = store.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            const data = req.body
            await models.sequelize.transaction(async (transaction) => {
                await models.store_iot_devices.update({
                    type: data.type,
                    iot_devices_id: req.body.iot_devices_id,
                    make: data.make,
                    model: data.model,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findIotDevices.id },
                        transaction: transaction
                    }
                )
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: store.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store iot devices request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store iot devices for ${storeUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${storeUid}`,
                    messages: `Your Basic Information store iot devices request is complete.`,
                    notification_type: "Store Management"
                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: storeId },
                    transaction: transaction
                });
            })
            await models.sequelize.transaction(async (transaction) => {
                const storeIt = await models.store_iot_devices.findOne({ where: { id: req.params.id } })
                const previousData = findIotDevices.dataValues;
                delete req.body.current_user;
                const currentData = storeIt.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_iot_devices",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, null, 'Update iot_devices success.');
        }

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getIotDevices', async function (req, res) {
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
        const data = await models.store_iot_devices.findAll({
            where: { store_id: findStore.dataValues.id },
            include: [
                {
                    model: models.User,
                    as: "updated_detail",
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
            "store_iot_devices",
        ]
        const requests = await Promise.all(requestKeys.map(async (key) => {
            return models.request_for_store.findAll({
                where: { section_id: findStore.id, section_key: key }
            });
        }));
        const flatArray = requests.flat();
        data.forEach(stroeIotdevices => {
            if (stroeIotdevices.addedby) {
                stroeIotdevices.dataValues.addedby.dataValues.created_at = stroeIotdevices.createdAt;
                if (stroeIotdevices.dataValues.addedby !== null) {
                    stroeIotdevices.dataValues.addedby.dataValues.created_at = stroeIotdevices.createdAt;
                }
            }
            if (stroeIotdevices.updated_detail) {
                if (stroeIotdevices.dataValues.updated_detail !== null) {
                    stroeIotdevices.dataValues.updated_detail.dataValues.updated_at = stroeIotdevices.updatedAt;
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
        return REST.success(res, newData, 'Get All iot_devices successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.delete('/deleteIotDevices/:id', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const id = req.params.id
        const devices = await models.store_iot_devices.findOne({ where: { id: id } })
        if (devices == null) {
            return REST.error(res, 'iot_devices not found.', 404)
        }
        await models.store_iot_devices.destroy({ where: { id: id } })
        return REST.success(res, null, 'Iot Devices Deleted successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router

