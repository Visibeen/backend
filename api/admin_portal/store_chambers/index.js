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
|             Stores Chambers Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createChambers', async function (req, res) {
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
                chambers_name: "required|string",
                no_of_pallet: "required|string",
                racking_type: 'required|string',
                no_of_floors: 'required|string',
                staircase: 'required|string',
                floor_area: "required|string",
                temperature_min: "required|string",
                temperature_max: "required|string",
                floor_height: "required|string",
            });

            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }

            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } });
            if (!findStore) {
                return REST.error(res, 'Store not found', 404);
            }
            const findStoerUid = findStore.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            });
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const latestChamber = await models.store_chambers.findOne({
                where: {
                    store_id: findStore.id
                },
                order: [['created_at', 'DESC']]
            });

            let serialNumber = 1;
            if (latestChamber) {
                const latestSerial = parseInt(latestChamber.chamber_uid.slice(3));
                if (!isNaN(latestSerial)) {
                    serialNumber = latestSerial + 1;
                }
            }

            const chamber_uid = `CH-${serialNumber.toString().padStart(2, '0')}`;
            const totalLeas = req.body.no_of_pallets_for_lease;
            const leasToCustomer = req.body.available_pallets;
            const unavailablePallets = totalLeas - leasToCustomer;
            const availablePallets = totalLeas;

            const create_chambers = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_chambers.create({
                    store_id: req.body.store_id,
                    chamber_uid: chamber_uid,
                    chambers_name: req.body.chambers_name,
                    chamber_length: req.body.chamber_length,
                    chamber_width: req.body.chamber_width,
                    chamber_height: req.body.chamber_height,
                    no_of_pallet: req.body.no_of_pallet,
                    pallet_size: req.body.pallet_size,
                    pallet_length: req.body.pallet_length,
                    pallet_width: req.body.pallet_width,
                    pallet_height: req.body.pallet_height,
                    available_pallets: availablePallets,
                    unavailable_pallets: unavailablePallets,
                    racking_type: req.body.racking_type,
                    photo_of_entrance: req.body.photo_of_entrance,
                    photo_of_chamber: req.body.photo_of_chamber,
                    no_of_floors: req.body.no_of_floors,
                    no_of_pallets_for_lease: req.body.no_of_pallets_for_lease,
                    staircase: req.body.staircase,
                    floor_area: req.body.floor_area,
                    temperature_min: req.body.temperature_min,
                    temperature_max: req.body.temperature_max,
                    floor_height: req.body.floor_height,
                    status: constants.STORE_CHAMBERS.STATUSES.ACTIVE,
                    added_by: cUser.id
                }, { transaction });
                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: req.body.store_id },
                    transaction: transaction
                })
                if (Array.isArray(req.body.photo_of_entrance)) {
                    for (const imageUrl of req.body.photo_of_entrance) {
                        await models.store_chamber_images.create({
                            chamber_id: data.dataValues.id,
                            type: 'photo_of_entrance',
                            image: imageUrl,
                        }, { transaction });
                    }
                }

                if (Array.isArray(req.body.photo_of_chamber)) {
                    for (const imageUrl of req.body.photo_of_chamber) {
                        await models.store_chamber_images.create({
                            chamber_id: data.dataValues.id,
                            type: 'photo_of_chamber',
                            image: imageUrl,
                        }, { transaction });
                    }
                }

                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_chambers",
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store chamber request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findStoerUid}`,
                    messages: `Your Basic Information store chamber request is now complete.`,
                    notification_type: "Store Management"
                }, { transaction });

                return data;
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
            }
            return REST.success(res, create_chambers, 'Add chambers Successfully');

        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                store_id: "required|integer",
                chambers_name: "required|string",
                no_of_pallet: "required|string",
                racking_type: 'required|string',
                no_of_floors: 'required|string',
                staircase: 'required|string',
                floor_area: "required|string",
                temperature_min: "required|string",
                temperature_max: "required|string",
                floor_height: "required|string",
            });

            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }

            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } });
            if (!findStore) {
                return REST.error(res, 'Store not found', 404);
            }
            const findStoerUid = findStore.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            });
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const latestChamber = await models.store_chambers.findOne({
                where: {
                    store_id: findStore.id
                },
                order: [['created_at', 'DESC']]
            });

            let serialNumber = 1;
            if (latestChamber) {
                const latestSerial = parseInt(latestChamber.chamber_uid.slice(3));
                if (!isNaN(latestSerial)) {
                    serialNumber = latestSerial + 1;
                }
            }

            const chamber_uid = `CH-${serialNumber.toString().padStart(2, '0')}`;
            const totalLeas = req.body.no_of_pallets_for_lease;
            const leasToCustomer = req.body.available_pallets;
            const unavailablePallets = totalLeas - leasToCustomer;
            const availablePallets = totalLeas;

            const create_chambers = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_chambers.create({
                    store_id: req.body.store_id,
                    chamber_uid: chamber_uid,
                    chambers_name: req.body.chambers_name,
                    chamber_length: req.body.chamber_length,
                    chamber_width: req.body.chamber_width,
                    chamber_height: req.body.chamber_height,
                    no_of_pallet: req.body.no_of_pallet,
                    pallet_size: req.body.pallet_size,
                    pallet_length: req.body.pallet_length,
                    pallet_width: req.body.pallet_width,
                    pallet_height: req.body.pallet_height,
                    available_pallets: availablePallets,
                    unavailable_pallets: unavailablePallets,
                    racking_type: req.body.racking_type,
                    photo_of_entrance: req.body.photo_of_entrance,
                    photo_of_chamber: req.body.photo_of_chamber,
                    no_of_floors: req.body.no_of_floors,
                    no_of_pallets_for_lease: req.body.no_of_pallets_for_lease,
                    staircase: req.body.staircase,
                    floor_area: req.body.floor_area,
                    temperature_min: req.body.temperature_min,
                    temperature_max: req.body.temperature_max,
                    floor_height: req.body.floor_height,
                    status: constants.STORE_CHAMBERS.STATUSES.ACTIVE,
                    added_by: cUser.id
                }, { transaction });
                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: req.body.store_id },
                    transaction: transaction
                })
                if (Array.isArray(req.body.photo_of_entrance)) {
                    for (const imageUrl of req.body.photo_of_entrance) {
                        await models.store_chamber_images.create({
                            chamber_id: data.dataValues.id,
                            type: 'photo_of_entrance',
                            image: imageUrl,
                        }, { transaction });
                    }
                }

                if (Array.isArray(req.body.photo_of_chamber)) {
                    for (const imageUrl of req.body.photo_of_chamber) {
                        await models.store_chamber_images.create({
                            chamber_id: data.dataValues.id,
                            type: 'photo_of_chamber',
                            image: imageUrl,
                        }, { transaction });
                    }
                }

                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_chambers",
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
                 await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store chamber request is now complete.`)
                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store chambers of ${findStoerUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findStoerUid}`,
                    messages: `Your Basic Information store chamber request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                return data;
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
            }

            return REST.success(res, create_chambers, 'Add chambers Successfully');
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                store_id: "required|integer",
                request_id: "integer",
                chambers_name: "required|string",
                no_of_pallet: "required|string",
                racking_type: 'required|string',
                no_of_floors: 'required|string',
                staircase: 'required|string',
                floor_area: "required|string",
                temperature_min: "required|string",
                temperature_max: "required|string",
                floor_height: "required|string",
            });

            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }

            const findStore = await models.stores.findOne({ where: { id: req.body.store_id } });
            if (!findStore) {
                return REST.error(res, 'Store not found', 404);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            });
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStore.user_id;
            const findStoerUid = findStore.store_uid
            const latestChamber = await models.store_chambers.findOne({
                where: {
                    store_id: findStore.id
                },
                order: [['created_at', 'DESC']]
            });

            let serialNumber = 1;
            if (latestChamber) {
                const latestSerial = parseInt(latestChamber.chamber_uid.slice(3));
                if (!isNaN(latestSerial)) {
                    serialNumber = latestSerial + 1;
                }
            }

            const chamber_uid = `CH-${serialNumber.toString().padStart(2, '0')}`;
            const totalLeas = req.body.no_of_pallets_for_lease;
            const leasToCustomer = req.body.available_pallets;
            const unavailablePallets = totalLeas - leasToCustomer;
            const availablePallets = totalLeas;

            const create_chambers = await models.sequelize.transaction(async (transaction) => {
                const data = await models.store_chambers.create({
                    store_id: req.body.store_id,
                    chamber_uid: chamber_uid,
                    chambers_name: req.body.chambers_name,
                    chamber_length: req.body.chamber_length,
                    chamber_width: req.body.chamber_width,
                    chamber_height: req.body.chamber_height,
                    no_of_pallet: req.body.no_of_pallet,
                    pallet_size: req.body.pallet_size,
                    pallet_length: req.body.pallet_length,
                    pallet_width: req.body.pallet_width,
                    pallet_height: req.body.pallet_height,
                    available_pallets: availablePallets,
                    unavailable_pallets: unavailablePallets,
                    racking_type: req.body.racking_type,
                    photo_of_entrance: req.body.photo_of_entrance,
                    photo_of_chamber: req.body.photo_of_chamber,
                    no_of_floors: req.body.no_of_floors,
                    no_of_pallets_for_lease: req.body.no_of_pallets_for_lease,
                    staircase: req.body.staircase,
                    floor_area: req.body.floor_area,
                    temperature_min: req.body.temperature_min,
                    temperature_max: req.body.temperature_max,
                    floor_height: req.body.floor_height,
                    status: constants.STORE_CHAMBERS.STATUSES.ACTIVE,
                    added_by: cUser.id
                }, { transaction });
                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: req.body.store_id },
                    transaction: transaction
                })
                if (Array.isArray(req.body.photo_of_entrance)) {
                    for (const imageUrl of req.body.photo_of_entrance) {
                        await models.store_chamber_images.create({
                            chamber_id: data.dataValues.id,
                            type: 'photo_of_entrance',
                            image: imageUrl,
                        }, { transaction });
                    }
                }

                if (Array.isArray(req.body.photo_of_chamber)) {
                    for (const imageUrl of req.body.photo_of_chamber) {
                        await models.store_chamber_images.create({
                            chamber_id: data.dataValues.id,
                            type: 'photo_of_chamber',
                            image: imageUrl,
                        }, { transaction });
                    }
                }

                await models.user_activity_logs.create({
                    user_id: findStore.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStore.id,
                    activity_type: "store_chambers",
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
               await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store chamber request is now complete.`)
                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store chambers for ${findStoerUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStore.user_id,
                    title: `Add Request Completed ${findStoerUid}`,
                    messages: `Your Basic Information store chamber request is now complete.`,
                    notification_type: "Store Management"
                }, { transaction });

                return data;
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
            }

            return REST.success(res, create_chambers, 'Add chambers Successfully');
        }
    } catch (error) {
        console.log(error)
        return REST.error(res, error.message, 500);
    }
});
router.put('/updateChambers/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        })
        if (cUser.role_id == 3) {
            var findChambers;
            findChambers = await models.store_chambers.findOne({ where: { id: req.params.id } })
            if (findChambers == null) {
                return REST.error(res, 'Chambers id not found', 404)
            }
            const storeId = findChambers.store_id;
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
            const data = req.body;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_chambers.update({
                    chambers_name: data.chambers_name,
                    chamber_length: data.chamber_length,
                    chamber_width: data.chamber_width,
                    chamber_height: data.chamber_height,
                    no_of_pallet: data.no_of_pallet,
                    pallet_size: data.pallet_size,
                    pallet_length: data.pallet_length,
                    pallet_width: data.pallet_width,
                    pallet_height: data.pallet_height,
                    available_pallets: data.available_pallets,
                    racking_type: data.racking_type,
                    no_of_floors: data.no_of_floors,
                    photo_of_entrance: data.photo_of_entrance,
                    photo_of_chamber: data.photo_of_chamber,
                    no_of_pallets_for_lease: data.no_of_pallets_for_lease,
                    staircase: data.staircase,
                    floor_area: data.floor_area,
                    temperature_min: data.temperature_min,
                    temperature_max: data.temperature_max,
                    floor_height: data.floor_height,
                    updated_by: cUser.id,
                    status: data.status
                },
                    {
                        where: { id: findChambers.id },
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
                 await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store chamber request is now complete.`)
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store chamber request is now complete.`
                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: storeId },
                    transaction: transaction
                });
            })

            if (Array.isArray(data.photo_of_entrance)) {
                await models.sequelize.transaction(async (transaction) => {
                    await models.store_chamber_images.destroy({
                        where: {
                            chamber_id: findChambers.id,
                            type: 'photo_of_entrance'
                        },
                        transaction: transaction
                    });
                    for (const imageUrl of data.photo_of_entrance) {
                        await models.store_chamber_images.create({
                            chamber_id: findChambers.id,
                            type: 'photo_of_entrance',
                            image: imageUrl,
                        }, {
                            transaction: transaction
                        });
                    }
                });
            }
            if (Array.isArray(data.photo_of_chamber)) {
                await models.sequelize.transaction(async (transaction) => {
                    await models.store_chamber_images.destroy({
                        where: {
                            chamber_id: findChambers.id,
                            type: 'photo_of_chamber'
                        },
                        transaction: transaction
                    });

                    for (const imageUrl of data.photo_of_chamber) {
                        await models.store_chamber_images.create({
                            chamber_id: findChambers.id,
                            type: 'photo_of_chamber',
                            image: imageUrl,
                        }, {
                            transaction: transaction
                        });
                    }
                });
            }
            await models.sequelize.transaction(async (transaction) => {
                const findCurret = await models.store_chambers.findOne({ where: { id: findChambers.id } });
                const previousData = findChambers.dataValues;
                const currentData = findCurret.dataValues;
                previousData.photo_of_entrance = JSON.parse(previousData.photo_of_entrance);
                previousData.photo_of_chamber = JSON.parse(previousData.photo_of_chamber);
                currentData.photo_of_entrance = JSON.parse(currentData.photo_of_entrance);
                currentData.photo_of_chamber = JSON.parse(currentData.photo_of_chamber);
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_chambers",
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
            return REST.success(res, null, 'Update chambers success.');
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            var findChambers;
            findChambers = await models.store_chambers.findOne({ where: { id: req.params.id } })
            if (findChambers == null) {
                return REST.error(res, 'Chambers id not found', 404)
            }
            const storeId = findChambers.store_id;
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
            const data = req.body;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_chambers.update({
                    chambers_name: data.chambers_name,
                    chamber_length: data.chamber_length,
                    chamber_width: data.chamber_width,
                    chamber_height: data.chamber_height,
                    no_of_pallet: data.no_of_pallet,
                    pallet_size: data.pallet_size,
                    pallet_length: data.pallet_length,
                    pallet_width: data.pallet_width,
                    pallet_height: data.pallet_height,
                    available_pallets: data.available_pallets,
                    racking_type: data.racking_type,
                    no_of_floors: data.no_of_floors,
                    photo_of_entrance: data.photo_of_entrance,
                    photo_of_chamber: data.photo_of_chamber,
                    no_of_pallets_for_lease: data.no_of_pallets_for_lease,
                    staircase: data.staircase,
                    floor_area: data.floor_area,
                    temperature_min: data.temperature_min,
                    temperature_max: data.temperature_max,
                    floor_height: data.floor_height,
                    updated_by: cUser.id,
                    status: data.status
                },
                    {
                        where: { id: findChambers.id },
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store chamber request is now complete.`)
                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store chambers for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store chamber request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: storeId },
                    transaction: transaction
                });
            })

            if (Array.isArray(data.photo_of_entrance)) {
                await models.sequelize.transaction(async (transaction) => {
                    await models.store_chamber_images.destroy({
                        where: {
                            chamber_id: findChambers.id,
                            type: 'photo_of_entrance'
                        },
                        transaction: transaction
                    });
                    for (const imageUrl of data.photo_of_entrance) {
                        await models.store_chamber_images.create({
                            chamber_id: findChambers.id,
                            type: 'photo_of_entrance',
                            image: imageUrl,
                        }, {
                            transaction: transaction
                        });
                    }
                });
            }
            if (Array.isArray(data.photo_of_chamber)) {
                await models.sequelize.transaction(async (transaction) => {
                    await models.store_chamber_images.destroy({
                        where: {
                            chamber_id: findChambers.id,
                            type: 'photo_of_chamber'
                        },
                        transaction: transaction
                    });

                    for (const imageUrl of data.photo_of_chamber) {
                        await models.store_chamber_images.create({
                            chamber_id: findChambers.id,
                            type: 'photo_of_chamber',
                            image: imageUrl,
                        }, {
                            transaction: transaction
                        });
                    }
                });
            }
            await models.sequelize.transaction(async (transaction) => {
                const findCurret = await models.store_chambers.findOne({ where: { id: findChambers.id } });
                const previousData = findChambers.dataValues;
                const currentData = findCurret.dataValues;
                previousData.photo_of_entrance = JSON.parse(previousData.photo_of_entrance);
                previousData.photo_of_chamber = JSON.parse(previousData.photo_of_chamber);
                currentData.photo_of_entrance = JSON.parse(currentData.photo_of_entrance);
                currentData.photo_of_chamber = JSON.parse(currentData.photo_of_chamber);
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_chambers",
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
            return REST.success(res, null, 'Update chambers success.');
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            var findChambers;
            findChambers = await models.store_chambers.findOne({ where: { id: req.params.id } })
            if (findChambers == null) {
                return REST.error(res, 'Chambers id not found', 404)
            }
            const storeId = findChambers.store_id;
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
            const data = req.body;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_chambers.update({
                    chambers_name: data.chambers_name,
                    chamber_length: data.chamber_length,
                    chamber_width: data.chamber_width,
                    chamber_height: data.chamber_height,
                    no_of_pallet: data.no_of_pallet,
                    pallet_size: data.pallet_size,
                    pallet_length: data.pallet_length,
                    pallet_width: data.pallet_width,
                    pallet_height: data.pallet_height,
                    available_pallets: data.available_pallets,
                    racking_type: data.racking_type,
                    no_of_floors: data.no_of_floors,
                    photo_of_entrance: data.photo_of_entrance,
                    photo_of_chamber: data.photo_of_chamber,
                    no_of_pallets_for_lease: data.no_of_pallets_for_lease,
                    staircase: data.staircase,
                    floor_area: data.floor_area,
                    temperature_min: data.temperature_min,
                    temperature_max: data.temperature_max,
                    floor_height: data.floor_height,
                    updated_by: cUser.id,
                    status: data.status
                },
                    {
                        where: { id: findChambers.id },
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
                 await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store chamber request is now complete.`)
                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store chambers for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store chamber request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: storeId },
                    transaction: transaction
                });
            })

            if (Array.isArray(data.photo_of_entrance)) {
                await models.sequelize.transaction(async (transaction) => {
                    await models.store_chamber_images.destroy({
                        where: {
                            chamber_id: findChambers.id,
                            type: 'photo_of_entrance'
                        },
                        transaction: transaction
                    });
                    for (const imageUrl of data.photo_of_entrance) {
                        await models.store_chamber_images.create({
                            chamber_id: findChambers.id,
                            type: 'photo_of_entrance',
                            image: imageUrl,
                        }, {
                            transaction: transaction
                        });
                    }
                });
            }
            if (Array.isArray(data.photo_of_chamber)) {
                await models.sequelize.transaction(async (transaction) => {
                    await models.store_chamber_images.destroy({
                        where: {
                            chamber_id: findChambers.id,
                            type: 'photo_of_chamber'
                        },
                        transaction: transaction
                    });

                    for (const imageUrl of data.photo_of_chamber) {
                        await models.store_chamber_images.create({
                            chamber_id: findChambers.id,
                            type: 'photo_of_chamber',
                            image: imageUrl,
                        }, {
                            transaction: transaction
                        });
                    }
                });
            }
            await models.sequelize.transaction(async (transaction) => {
                const findCurret = await models.store_chambers.findOne({ where: { id: findChambers.id } });
                const previousData = findChambers.dataValues;
                const currentData = findCurret.dataValues;
                previousData.photo_of_entrance = JSON.parse(previousData.photo_of_entrance);
                previousData.photo_of_chamber = JSON.parse(previousData.photo_of_chamber);
                currentData.photo_of_entrance = JSON.parse(currentData.photo_of_entrance);
                currentData.photo_of_chamber = JSON.parse(currentData.photo_of_chamber);
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_chambers",
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
            return REST.success(res, null, 'Update chambers success.');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getChambers', async function (req, res) {
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
        const data = await models.store_chambers.findAll({
            where: {
                store_id: findStore.dataValues.id,
            },
            attributes: {
                exclude: ["photo_of_entrance", "photo_of_chamber"]
            },
            include: [
                {
                    model: models.User,
                    as: "updatedBy_user",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.store_chamber_images,
                    as: 'chamber_images',
                    attributes: {
                        exclude: ["photo_of_entrance", "photo_of_chamber"]
                    }
                }
            ],
            order: [["id", "DESC"]],
        });

        const requestKeys = [
            "store_chambers",
        ]
        const requests = await Promise.all(requestKeys.map(async (key) => {
            return models.request_for_store.findAll({
                where: { section_id: findStore.id, section_key: key }
            });
        }));
        const flatArray = requests.flat();
        data.forEach(storeChambers => {
            if (storeChambers.addedby) {
                storeChambers.dataValues.addedby.dataValues.created_at = storeChambers.createdAt;
                if (storeChambers.dataValues.addedby !== null) {
                    storeChambers.dataValues.addedby.dataValues.created_at = storeChambers.createdAt;
                }
            }
            if (storeChambers.updatedBy_user) {
                if (storeChambers.dataValues.updatedBy_user !== null) {
                    storeChambers.dataValues.updatedBy_user.dataValues.updated_at = storeChambers.updatedAt;
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
        return REST.success(res, newData, 'Get All chambers successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.delete('/deleteChambers/:id', async function (req, res) {
    try {
        const id = req.params.id
        const findChambers = await models.store_chambers.findOne({ where: { id: id } })
        if (findChambers == null) {
            return REST.error(res, 'chambers not found.', 404)
        }
        await models.store_chambers.destroy({ where: { id: id } })
        return REST.success(res, null, 'chambers delete successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router

