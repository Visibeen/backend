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
|              Stores Ca Equipment Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createEquipment', async function (req, res) {
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
                cfm: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const findStoreUid = findStore.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const ca_equipments = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_ca_equipment.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    cfm: req.body.cfm,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_ca_equipment",
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id
                });

                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findStore.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ca equipment request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store ca equipment request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });
                return data
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
                return REST.success(res, ca_equipments, 'Add store_ca_equipment Successfully');
            } else {
                return REST.success(res, ca_equipments, 'Add store_ca_equipment Successfully');
            }
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                store_id: "required|integer",
                make: "required|string",
                model: "required|string",
                cfm: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const findStoreUid = findStore.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const ca_equipments = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_ca_equipment.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    cfm: req.body.cfm,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_ca_equipment",
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id
                });

                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findStore.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ca equipment request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store ca equipment for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store ca equipment request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });
                return data
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
                return REST.success(res, ca_equipments, 'Add store_ca_equipment Successfully');
            } else {
                return REST.success(res, ca_equipments, 'Add store_ca_equipment Successfully');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                store_id: "required|integer",
                request_id: "required|integer",
                make: "required|string",
                model: "required|string",
                cfm: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const findStoreUid = findStore.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const ca_equipments = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_ca_equipment.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    cfm: req.body.cfm,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_ca_equipment",
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id
                });

                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findStore.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ca equipment request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store ca equipment for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store ca equipment request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });
                return data
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
            return REST.success(res, ca_equipments, 'Add store_ca_equipment Successfully');
        }
    }
    catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/update/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        })
        if (cUser.role_id == 3) {
            var findEquiment;
            const id = req.params.id;
            findEquiment = await models.store_ca_equipment.findOne({ where: { id: id } })
            if (findEquiment == null) {
                return REST.error(res, 'store_ca_equipment id not found', 404)
            }
            const storeId = findEquiment.store_id;
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
            const data = req.body;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_ca_equipment.update({
                    make: data.make,
                    model: data.model,
                    cfm: data.cfm,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findEquiment.id },
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ca equipment request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${storeUid}`,
                    messages: `Your Basic Information store ca equipment request is now complete.`,
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
                const findEquiments = await models.store_ca_equipment.findOne({ where: { id: req.params.id } })
                const previousData = findEquiment.dataValues;
                delete req.body.current_user;
                const currentData = findEquiments.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_ca_equipment",
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
                return REST.success(res, null, 'Update store_ca_equipment success.');
            } else {
                return REST.success(res, null, 'Update store_ca_equipment success.');
            }
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            var findEquiment;
            const id = req.params.id;
            findEquiment = await models.store_ca_equipment.findOne({ where: { id: id } })
            if (findEquiment == null) {
                return REST.error(res, 'store_ca_equipment id not found', 404)
            }
            const storeId = findEquiment.store_id;
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
            const data = req.body;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_ca_equipment.update({
                    make: data.make,
                    model: data.model,
                    cfm: data.cfm,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findEquiment.id },
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ca equipment request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store ca equipment for ${storeUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${storeUid}`,
                    messages: `Your Basic Information store ca equipment request is now complete.`,
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
                const findEquiments = await models.store_ca_equipment.findOne({ where: { id: req.params.id } })
                const previousData = findEquiment.dataValues;
                delete req.body.current_user;
                const currentData = findEquiments.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_ca_equipment",
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
                return REST.success(res, null, 'Update store_ca_equipment success.');
            } else {
                return REST.success(res, null, 'Update store_ca_equipment success.');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            var findEquiment;
            const id = req.params.id;
            findEquiment = await models.store_ca_equipment.findOne({ where: { id: id } })
            if (findEquiment == null) {
                return REST.error(res, 'store_ca_equipment id not found', 404)
            }
            const storeId = findEquiment.store_id;
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
            const data = req.body;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_ca_equipment.update({
                    make: data.make,
                    model: data.model,
                    cfm: data.cfm,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findEquiment.id },
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store ca equipment request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store ca equipment for ${storeUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${storeUid}`,
                    messages: `Your Basic Information store ca equipment request is now complete.`,
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
                const findEquiments = await models.store_ca_equipment.findOne({ where: { id: req.params.id } })
                const previousData = findEquiment.dataValues;
                delete req.body.current_user;
                const currentData = findEquiments.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_ca_equipment",
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
            return REST.success(res, null, 'Update store_ca_equipment success.');
        }

    }
    catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getEquipment', async function (req, res) {
    try {
        const storeUid = req.query.store_uid;
        const findStore = await models.stores.findOne({
            where: { store_uid: storeUid }
        });

        if (findStore == null) {
            return REST.error(res, 'Store not found.', 404);
        }
        const data = await models.store_ca_equipment.findAll({
            where: { store_id: findStore.dataValues.id },
            include: [
                {
                    model: models.User,
                    as: "UpdatedBy_user",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]],
        });
        const requestKeys = [
            "store_ca_equipment",
        ]
        const requests = await Promise.all(requestKeys.map(async (key) => {
            return models.request_for_store.findAll({
                where: { section_id: findStore.id, section_key: key }
            });
        }));
        const flatArray = requests.flat();
        data.forEach(storeEquipment => {
            if (storeEquipment.addedby) {
                storeEquipment.dataValues.addedby.dataValues.created_at = storeEquipment.createdAt;
                if (storeEquipment.dataValues.addedby !== null) {
                    storeEquipment.dataValues.addedby.dataValues.created_at = storeEquipment.createdAt;
                }
            }
            if (storeEquipment.UpdatedBy_user) {
                if (storeEquipment.dataValues.UpdatedBy_user !== null) {
                    storeEquipment.dataValues.UpdatedBy_user.dataValues.updated_at = storeEquipment.updatedAt;
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
        return REST.success(res, newData, 'Get All store_ca_equipment successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.delete('/deleteEquipment/:id', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const id = req.params.id
        const findEquiment = await models.store_ca_equipment.findOne({ where: { id: id } })
        if (findEquiment == null) {
            return REST.error(res, 'store_ca_equipment not found.', 404)
        }
        await models.store_ca_equipment.destroy({ where: { id: id } })
        return REST.success(res, null, 'store_ca_equipment delete successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router