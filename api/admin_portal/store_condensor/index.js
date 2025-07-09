const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
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
|              Stores Condensor Apis
|----------------------------------------------------------------------------------------------------------------
*/

router.post('/createCondensor', async function (req, res) {
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
                tr: "required|string",
                amc: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const findstoreUid = findStore.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const create_condensor = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_condensor.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    tr: req.body.tr,
                    amc: req.body.amc,
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
                    activity_type: "store_condensor",
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store condensor request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findstoreUid}`,
                    messages: `Your Basic Information store condensor request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });
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
                return REST.success(res, create_condensor, 'Add store_condensor Successfully');
            } else {
                return REST.success(res, create_condensor, 'Add store_condensor Successfully');
            }

        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                store_id: "required|integer",
                make: "required|string",
                model: "required|string",
                tr: "required|string",
                amc: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const findstoreUid = findStore.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const create_condensor = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_condensor.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    tr: req.body.tr,
                    amc: req.body.amc,
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
                    activity_type: "store_condensor",
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store condensor request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store condensor for ${findstoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findstoreUid}`,
                    messages: `Your Basic Information store condensor request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });
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
                return REST.success(res, create_condensor, 'Add store_condensor Successfully');
            } else {
                return REST.success(res, create_condensor, 'Add store_condensor Successfully');
            }

        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                store_id: "required|integer",
                make: "required|string",
                model: "required|string",
                tr: "required|string",
                amc: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const findstoreUid = findStore.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const create_condensor = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_condensor.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    tr: req.body.tr,
                    amc: req.body.amc,
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
                    activity_type: "store_condensor",
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store condensor request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store condensor for ${findstoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findstoreUid}`,
                    messages: `Your Basic Information store condensor request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });
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
            return REST.success(res, create_condensor, 'Add store_condensor Successfully');
        }
    }
    catch (error) {
        return REST.error(res, error.message, 500);
    }
})

router.put('/updateCondensor/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        })
        if (cUser.role_id == 3) {
            var findCondensor;
            findCondensor = await models.store_condensor.findOne({ where: { id: req.params.id } })
            if (findCondensor == null) {
                return REST.error(res, 'Condensor id not found', 404)
            }
            const storeId = findCondensor.store_id;
            const store = await models.stores.findOne({ where: { id: storeId } });
            if (store == null) {
                return REST.error(res, 'Store not found.', 404);
            }
            const findStoreUid = store.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            const data = req.body
            await models.sequelize.transaction(async (transaction) => {
                await models.store_condensor.update({
                    make: data.make,
                    model: data.model,
                    tr: data.tr,
                    amc: data.amc,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findCondensor.id },
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store condensor request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store condensor request is now complete.`,
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
                const condensors = await models.store_condensor.findOne({ where: { id: req.params.id } })
                const previousData = findCondensor.dataValues;
                delete req.body.current_user;
                const currentData = condensors.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_condensor",
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
            return REST.success(res, null, 'Update condensor success.');
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            console.log(req.body.request_id)
            var findCondensor;
            findCondensor = await models.store_condensor.findOne({ where: { id: req.params.id } })
            if (findCondensor == null) {
                return REST.error(res, 'Condensor id not found', 404)
            }
            const storeId = findCondensor.store_id;
            const store = await models.stores.findOne({ where: { id: storeId } });
            if (store == null) {
                return REST.error(res, 'Store not found.', 404);
            }
            const findStoreUid = store.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            const data = req.body
            await models.sequelize.transaction(async (transaction) => {
                await models.store_condensor.update({
                    make: data.make,
                    model: data.model,
                    tr: data.tr,
                    amc: data.amc,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findCondensor.id },
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store condensor request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store condensor for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store condensor request is now complete.`,
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
                const condensors = await models.store_condensor.findOne({ where: { id: req.params.id } })
                const previousData = findCondensor.dataValues;
                delete req.body.current_user;
                const currentData = condensors.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_condensor",
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
            return REST.success(res, null, 'Update condensor success.');
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            console.log(req.body.request_id)
            var findCondensor;
            findCondensor = await models.store_condensor.findOne({ where: { id: req.params.id } })
            if (findCondensor == null) {
                return REST.error(res, 'Condensor id not found', 404)
            }
            const storeId = findCondensor.store_id;
            const store = await models.stores.findOne({ where: { id: storeId } });
            if (store == null) {
                return REST.error(res, 'Store not found.', 404);
            }
            const findStoreUid = store.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            const data = req.body
            await models.sequelize.transaction(async (transaction) => {
                await models.store_condensor.update({
                    make: data.make,
                    model: data.model,
                    tr: data.tr,
                    amc: data.amc,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findCondensor.id },
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store condensor request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store condensor for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store condensor request is now complete.`,
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
                const condensors = await models.store_condensor.findOne({ where: { id: req.params.id } })
                const previousData = findCondensor.dataValues;
                delete req.body.current_user;
                const currentData = condensors.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_condensor",
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
            return REST.success(res, null, 'Update condensor success.');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})

router.get('/getCondensor', async function (req, res) {
    try {
        const cUser = req.body.current_user;
        console.log(cUser.id, 'current user')
        const storeUid = req.query.store_uid;
        const findStore = await models.stores.findOne({
            where: {
                store_uid: storeUid
            }
        });
        if (findStore == null) {
            return REST.error(res, 'Store not found.', 404);
        }
        const data = await models.store_condensor.findAll({
            where: { store_id: findStore.dataValues.id },
            include: [
                {
                    model: models.User,
                    as: "updated_by_user",
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
            "store_condensor",
        ]
        const requests = await Promise.all(requestKeys.map(async (key) => {
            return models.request_for_store.findAll({
                where: { section_id: findStore.id, section_key: key }
            });
        }));
        const flatArray = requests.flat();
        data.forEach(storeCondensor => {
            if (storeCondensor.addedby) {
                storeCondensor.dataValues.addedby.dataValues.created_at = storeCondensor.createdAt;
                if (storeCondensor.dataValues.addedby !== null) {
                    storeCondensor.dataValues.addedby.dataValues.created_at = storeCondensor.createdAt;
                }
            }
            if (storeCondensor.updated_by_user) {
                if (storeCondensor.dataValues.updated_by_user !== null) {
                    storeCondensor.dataValues.updated_by_user.dataValues.updated_at = storeCondensor.updatedAt;
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
        return REST.success(res, newData, 'Get All store_condensor successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.delete('/deleteCondensor/:id', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const id = req.params.id
        const findCondensor = await models.store_condensor.findOne({ where: { id: id } })
        if (findCondensor == null) {
            return REST.error(res, 'condensor not found.', 404)
        }
        await models.store_condensor.destroy({ where: { id: id } })
        return REST.success(res, null, 'Condensor deleted successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router
router.post('/createCondensor', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        });
        if (cUser.role_id == 3 || req.body.request_id) {

            const validator = make(req.body, {
                store_id: "required|integer",
                make: "required|string",
                model: "required|string",
                tr: "required|string",
                amc: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const findstoreUid = findStore.store_uid
            const create_condensor = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_condensor.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    tr: req.body.tr,
                    amc: req.body.amc,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_condensor",
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store condensor request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findstoreUid}`,
                    messages: `Your Basic Information store condensor request is now complete.`
                }, { transaction });
                return data;
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
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
            return REST.success(res, create_condensor, 'Add store_condensor Successfully');

        } else if (findPermission > 0 && (cUser.role_id == 4 || req.body.request_id)) {

            const validator = make(req.body, {
                store_id: "required|integer",
                make: "required|string",
                model: "required|string",
                tr: "required|string",
                amc: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const findstoreUid = findStore.store_uid
            const create_condensor = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_condensor.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    tr: req.body.tr,
                    amc: req.body.amc,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_condensor",
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store condensor request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findstoreUid}`,
                    messages: `Your Basic Information store condensor request is now complete.`
                }, { transaction });
                return data;
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
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
            return REST.success(res, create_condensor, 'Add store_condensor Successfully');

        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                store_id: "required|integer",
                request_id: "required|integer",
                make: "required|string",
                model: "required|string",
                tr: "required|string",
                amc: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } })
            if (!findStore) {
                return REST.error(res, 'Store not found', 404)
            }
            const findstoreUid = findStore.store_uid
            const create_condensor = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_condensor.create({
                    store_id: req.body.store_id,
                    make: req.body.make,
                    model: req.body.model,
                    tr: req.body.tr,
                    amc: req.body.amc,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_condensor",
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store condensor request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findstoreUid}`,
                    messages: `Your Basic Information store condensor request is now complete.`
                }, { transaction });
                return data;
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
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
            return REST.success(res, create_condensor, 'Add store_condensor Successfully');

        }
    }
    catch (error) {
        return REST.error(res, error.message, 500);
    }
})

