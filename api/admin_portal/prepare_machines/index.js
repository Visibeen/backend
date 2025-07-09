const { make } = require('simple-body-validator');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const { sendPushNotification } = require('../../../utils/helper');
const support = require('../../../utils/support');


/*
|----------------------------------------------------------------------------------------------------------------
|              Prepare Machinses Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createMachines', async function (req, res) {
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
                perpare_id: "required|integer",
                type_of_machine: "required|string",
                name: "required|string",
                make: "required|string",
                model: "required|string",
                purpose: "required|string",
                power_requirement: "required|string"
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findPrepares = await models.prepare_details.findOne({ where: { id: req.body.perpare_id } })
            if (findPrepares == null) {
                return REST.error(res, 'Prepare details not found', 404);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const findPrepareUid = findPrepares.prepare_uid
            const machines = await models.sequelize.transaction(async (transaction) => {
                const data = await models.prepare_machines.create({
                    perpare_id: req.body.perpare_id,
                    type_of_machine: req.body.type_of_machine,
                    name: req.body.name,
                    make: req.body.make,
                    model: req.body.model,
                    purpose: req.body.purpose,
                    power_requirement: req.body.power_requirement,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findPrepares.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare machines request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findPrepares.user_id,
                    title: `Add Request Completed ${findPrepareUid}`,
                    messages: `Your Basic Information prepare machines request is now complete.`,
                    notification_type: "Perpare Management"

                }, { transaction });
                const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id;

                await models.user_activity_logs.create({
                    user_id: findPrepares.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Prepare',
                    activity_id: findPrepares.id,
                    activity_type: "prepare_machine",
                    current_data: data,
                });
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
            return REST.success(res, machines, 'Create Prepare machines Successfully');

        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                perpare_id: "required|integer",
                type_of_machine: "required|string",
                name: "required|string",
                make: "required|string",
                model: "required|string",
                purpose: "required|string",
                power_requirement: "required|string"
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findPrepares = await models.prepare_details.findOne({ where: { id: req.body.perpare_id } })
            if (findPrepares == null) {
                return REST.error(res, 'Prepare details not found', 404);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const findPrepareUid = findPrepares.prepare_uid
            const machines = await models.sequelize.transaction(async (transaction) => {
                const data = await models.prepare_machines.create({
                    perpare_id: req.body.perpare_id,
                    type_of_machine: req.body.type_of_machine,
                    name: req.body.name,
                    make: req.body.make,
                    model: req.body.model,
                    purpose: req.body.purpose,
                    power_requirement: req.body.power_requirement,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findPrepares.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare machines request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added prepare machines for ${findPrepareUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findPrepares.user_id,
                    title: `Add Request Completed ${findPrepareUid}`,
                    messages: `Your Basic Information prepare machines request is now complete.`,
                    notification_type: "Perpare Management"

                }, { transaction });
                const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id;

                await models.user_activity_logs.create({
                    user_id: findPrepares.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Prepare',
                    activity_id: findPrepares.id,
                    activity_type: "prepare_machine",
                    current_data: data,
                });
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
                return REST.success(res, machines, 'Create Prepare machines Successfully');
            } else {
                return REST.success(res, machines, 'Create Prepare machines Successfully');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                perpare_id: "required|integer",
                type_of_machine: "required|string",
                name: "required|string",
                make: "required|string",
                model: "required|string",
                purpose: "required|string",
                power_requirement: "required|string"
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findPrepares = await models.prepare_details.findOne({ where: { id: req.body.perpare_id } })
            if (findPrepares == null) {
                return REST.error(res, 'Prepare details not found', 404);
            }
            const findPrepareUid = findPrepares.prepare_uid
            const machines = await models.sequelize.transaction(async (transaction) => {
                const data = await models.prepare_machines.create({
                    perpare_id: req.body.perpare_id,
                    type_of_machine: req.body.type_of_machine,
                    name: req.body.name,
                    make: req.body.make,
                    model: req.body.model,
                    purpose: req.body.purpose,
                    power_requirement: req.body.power_requirement,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findPrepares.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare machines request is now complete.`)

                const findrequest = await models.request_for_store.findOne({
                    where: {
                        id: req.body.request_id ?? null,
                    }
                })
                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added prepare machines for ${findPrepareUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findPrepares.user_id,
                    title: `Add Request Completed ${findPrepareUid}`,
                    messages: `Your Basic Information prepare machines request is now complete.`,
                    notification_type: "Perpare Management"
                }, { transaction });
                const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id;

                await models.user_activity_logs.create({
                    user_id: findPrepares.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Prepare',
                    activity_id: findPrepares.id,
                    activity_type: "prepare_machine",
                    current_data: data,
                });
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
            return REST.success(res, machines, 'Create Prepare machines Successfully');

        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/updateMachines/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        });
        if (cUser.role_id == 3) {
            var findMachines
            const id = req.params.id;
            findMachines = await models.prepare_machines.findOne({ where: { id: id } })
            if (findMachines == null) {
                return REST.error(res, 'Prepare Machines not found', 404)
            }
            const prepareId = findMachines.perpare_id;
            const prepare = await models.prepare_details.findOne({ where: { id: prepareId } });
            if (prepare == null) {
                return REST.error(res, 'Prepare not found.', 404);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const findPrepareUid = prepare.prepare_uid
            const data = req.body
            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_machines.update({
                    type_of_machine: data.type_of_machine,
                    name: data.name,
                    make: data.make,
                    model: data.model,
                    purpose: data.purpose,
                    power_requirement: data.power_requirement,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findMachines.id },
                        transaction: transaction
                    }
                )
                const findSenderToken = await models.User.findOne({
                    where: {
                        id: prepare.user_id
                    }
                })
                if (findSenderToken && findSenderToken.device_token) {
                    const notificationData = {
                        device_token: findSenderToken.device_token,
                        messages: `Your Basic Information prepare machines request is now complete.`
                    }
                    await sendPushNotification(notificationData)
                }
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: prepare.user_id,
                    title: `Edit Request Completed ${findPrepareUid}`,
                    messages: `Your Basic Information prepare machines request is now complete.`,
                    notification_type: "Perpare Management"

                }, { transaction });

                await models.prepare_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: prepare.id },
                    transaction: transaction
                });
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : prepare.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const findPrepare = await models.prepare_machines.findOne({ where: { id: req.params.id } })
                const previousData = findMachines.dataValues;
                delete req.body.current_user;
                const currentData = findPrepare.dataValues;
                const activityLog = {
                    user_id: prepare.user_id,
                    kmp_id: kmp_ids,
                    activity: `Prepare`,
                    activity_id: prepare.id,
                    activity_type: "prepare_machine",
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
                return REST.success(res, null, 'Update Prepare machines success.');
            } else {
                return REST.success(res, null, 'Update Prepare machines success.');
            }
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            var findMachines
            const id = req.params.id;
            findMachines = await models.prepare_machines.findOne({ where: { id: id } })
            if (findMachines == null) {
                return REST.error(res, 'Prepare Machines not found', 404)
            }
            const prepareId = findMachines.perpare_id;
            const prepare = await models.prepare_details.findOne({ where: { id: prepareId } });
            if (prepare == null) {
                return REST.error(res, 'Prepare not found.', 404);
            }
            const findPrepareUid = prepare.prepare_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id,
                }
            })
            const data = req.body
            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_machines.update({
                    type_of_machine: data.type_of_machine,
                    name: data.name,
                    make: data.make,
                    model: data.model,
                    purpose: data.purpose,
                    power_requirement: data.power_requirement,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findMachines.id },
                        transaction: transaction
                    }
                )
                const findSenderToken = await models.User.findOne({
                    where: {
                        id: prepare.user_id
                    }
                })
                if (findSenderToken && findSenderToken.device_token) {
                    const notificationData = {
                        device_token: findSenderToken.device_token,
                        messages: `Your Basic Information prepare machines request is now complete.`
                    }
                    await sendPushNotification(notificationData)
                }
                const findPartnerUid = findSenderToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit prepare machines for ${findPrepareUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: prepare.user_id,
                    title: `Edit Request Completed ${findPrepareUid}`,
                    messages: `Your Basic Information prepare machines request is now complete.`,
                    notification_type: "Perpare Management"

                }, { transaction });

                await models.prepare_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: prepare.id },
                    transaction: transaction
                });
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : prepare.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const findPrepare = await models.prepare_machines.findOne({ where: { id: req.params.id } })
                const previousData = findMachines.dataValues;
                delete req.body.current_user;
                const currentData = findPrepare.dataValues;
                const activityLog = {
                    user_id: prepare.user_id,
                    kmp_id: kmp_ids,
                    activity: `Prepare`,
                    activity_id: prepare.id,
                    activity_type: "prepare_machine",
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
                return REST.success(res, null, 'Update Prepare machines success.');
            } else {
                return REST.success(res, null, 'Update Prepare machines success.')
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            var findMachines
            const id = req.params.id;
            findMachines = await models.prepare_machines.findOne({ where: { id: id } })
            if (findMachines == null) {
                return REST.error(res, 'Prepare Machines not found', 404)
            }
            const prepareId = findMachines.perpare_id;
            const prepare = await models.prepare_details.findOne({ where: { id: prepareId } });
            if (prepare == null) {
                return REST.error(res, 'Prepare not found.', 404);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id,
                }
            })
            const findPrepareUid = prepare.prepare_uid
            const data = req.body
            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_machines.update({
                    type_of_machine: data.type_of_machine,
                    name: data.name,
                    make: data.make,
                    model: data.model,
                    purpose: data.purpose,
                    power_requirement: data.power_requirement,
                    updated_by: cUser.id
                },
                    {
                        where: { id: findMachines.id },
                        transaction: transaction
                    }
                )
                const findSenderToken = await models.User.findOne({
                    where: {
                        id: prepare.user_id
                    }
                })
                if (findSenderToken && findSenderToken.device_token) {
                    const notificationData = {
                        device_token: findSenderToken.device_token,
                        messages: `Your Basic Information prepare machines request is now complete.`
                    }
                    await sendPushNotification(notificationData)
                }
                const findPartnerUid = findSenderToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit prepare machines for ${findPrepareUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: prepare.user_id,
                    title: `Edit Request Completed ${findPrepareUid}`,
                    messages: `Your Basic Information prepare machines request is now complete.`,
                    notification_type: "Perpare Management"

                }, { transaction });

                await models.prepare_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: prepare.id },
                    transaction: transaction
                });
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : prepare.user_id;

            await models.sequelize.transaction(async (transaction) => {
                const findPrepare = await models.prepare_machines.findOne({ where: { id: req.params.id } })
                const previousData = findMachines.dataValues;
                delete req.body.current_user;
                const currentData = findPrepare.dataValues;
                const activityLog = {
                    user_id: prepare.user_id,
                    kmp_id: kmp_ids,
                    activity: `Prepare`,
                    activity_id: prepare.id,
                    activity_type: "prepare_machine",
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
                            id: req.body.request_id,
                        }
                    })
            }
            return REST.success(res, null, 'Update Prepare machines success.');
        }
    } catch (error) {
        console.log(error, "error")
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPrepareMachines', async function (req, res) {
    try {
        const perpareUid = req.params.prepare_uid
        const findPerpare = await models.prepare_details.findOne({ where: { prepare_uid: perpareUid } })
        if (findPerpare == null) {
            return REST.error(res, 'Prepare not found.', 404);
        }
        const data = await models.prepare_machines.findAll({
            where: { perpare_id: findPerpare.dataValues.id },
            include: [
                {
                    model: models.User,
                    as: "Updated_by",
                    attributes: ["id", "full_name", "updated_at"]
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name", "created_at"]
                }
            ],
            order: [["id", "DESC"]],
        })
        for (let perpare of data) {
            const findPerpare = await models.prepare_details.findOne({ where: { id: perpare.perpare_id } })
            if (findPerpare) {
                const findRequest = await models.request_for_store.findOne({ where: { section_id: findPerpare.id, section_key: "prepare_machines" } })
                perpare.dataValues.requests = findRequest
            } else {
                perpare.dataValues.requests = []
            }
        }
        if (data.length == 0) {
            return REST.error(res, 'Data not found.', 404);
        }
        return REST.success(res, data, 'Get All prepare machines successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.delete('/deletePerpareMachines/:id', async function (req, res) {
    try {
        const id = req.params.id
        const preparedelete = await models.prepare_machines.findOne({ where: { id: id } })
        if (preparedelete == null) {
            return REST.error(res, 'prepare machines not found.', 404)
        }
        await models.prepare_machines.destroy({ where: { id: id } })
        return REST.success(res, null, 'Prepare Machines Deleted successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router
