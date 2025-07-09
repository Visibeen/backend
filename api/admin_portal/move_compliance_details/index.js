const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const { sendPushNotification } = require('../../../utils/helper')
const support = require('../../../utils/support')

/*
|----------------------------------------------------------------------------------------------------------------
|              Moves Compliances Detials Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createMoveCompliances', async function (req, res) {
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
                move_id: "required|integer",
            })
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findMove = await models.move_details.findByPk(req.body.move_id)
            if (!findMove) {
                return REST.error(res, 'move  not found', 404);
            }
            const findMoveUid = findMove.move_uid
            const findMoveCompliance = await models.move_compliance_details.findOne({ where: { move_id: req.body.move_id } })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            let moveCompliance
            if (findMoveCompliance) {
                moveCompliance = await models.sequelize.transaction(async (transaction) => {
                    await findMoveCompliance.update({
                        move_id: req.body.move_id,
                        insurance_policy: req.body.insurance_policy || findMoveCompliance.insurance_policy,
                        insurance_till: req.body.insurance_till || findMoveCompliance.insurance_till,
                        insurance_authority: req.body.insurance_authority || findMoveCompliance.insurance_authority,
                        permit_url: req.body.permit_url || findMoveCompliance.permit_url,
                        permit: req.body.permit || findMoveCompliance.permit,
                        permit_no: req.body.permit_no || findMoveCompliance.permit_no,
                        permit_till: req.body.permit_till || findMoveCompliance.permit_till,
                        pucc_url: req.body.pucc_url || findMoveCompliance.pucc_url,
                        pucc_no: req.body.pucc_no || findMoveCompliance.pucc_no,
                        pucc_till: req.body.pucc_till || findMoveCompliance.pucc_till,
                        fitness_certificate: req.body.fitness_certificate || findMoveCompliance.fitness_certificate,
                        fitness_certificate_till: req.body.fitness_certificate_till || findMoveCompliance.fitness_certificate_till,
                        no_entry_permit: req.body.no_entry_permit || findMoveCompliance.no_entry_permit,
                        added_by: cUser.id
                    },
                        {
                            transaction: transaction
                        }
                    );
                    const urlkey = [
                        "permit_url",
                        "pucc_url",
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'move_compliance_details',
                                type_id: findMove.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'move_comliance_documents',
                            activity_id: findMove.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
                    })


                    await Promise.all(log);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findMove.user_id;
                    await models.user_activity_logs.create({

                        user_id: findMove.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Move',
                        activity_id: findMove.id,
                        activity_type: "move_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id
                    });
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
                    return findMoveCompliance
                })
            } else {

                moveCompliance = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        move_id: req.body.move_id,
                        insurance_policy: req.body.insurance_policy,
                        insurance_till: req.body.insurance_till,
                        insurance_authority: req.body.insurance_authority,
                        permit_url: req.body.permit_url,
                        permit: req.body.permit,
                        permit_no: req.body.permit_no,
                        permit_till: req.body.permit_till,
                        pucc_url: req.body.pucc_url,
                        pucc_no: req.body.pucc_no,
                        pucc_till: req.body.pucc_till,
                        fitness_certificate: req.body.fitness_certificate,
                        fitness_certificate_till: req.body.fitness_certificate_till,
                        no_entry_permit: req.body.no_entry_permit,
                        added_by: cUser.id
                    }
                    const createmove = await models.move_compliance_details.create(data, {
                        transaction: transaction
                    })
                    const urlkey = [
                        "permit_url",
                        "pucc_url",
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'move_compliance_details',
                                type_id: findMove.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'move_comliance_documents',
                            activity_id: findMove.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
                    })

                    await Promise.all(log);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findMove.user_id;
                    await models.user_activity_logs.create({
                        user_id: cUser.id,
                        kmp_id: kmp_ids,
                        activity: 'Move',
                        activity_id: findMove.id,
                        activity_type: "move_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findMove.user_id
                        }
                    })
                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information move compliance request is now complete.`)

                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findMove.user_id,
                        title: `Add Request Completed ${findMoveUid}`,
                        messages: `Your Basic Information move compliance request is now complete.`,
                        notification_type: "Move Management"

                    }, { transaction });

                    return createmove
                })
            }

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
                return REST.success(res, moveCompliance, 'Move Compliance Details Updated Successfully');
            } else {
                return REST.success(res, moveCompliance, 'Move Compliance Details Updated Successfully');
            }

        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                move_id: "required|integer",
                request_id: "integer",
            })
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findMove = await models.move_details.findByPk(req.body.move_id)
            if (!findMove) {
                return REST.error(res, 'move  not found', 404);
            }
            const findMoveUid = findMove.move_uid

            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const findMoveCompliance = await models.move_compliance_details.findOne({ where: { move_id: req.body.move_id } })
            let moveCompliance
            if (findMoveCompliance) {
                moveCompliance = await models.sequelize.transaction(async (transaction) => {
                    await findMoveCompliance.update({
                        move_id: req.body.move_id,
                        insurance_policy: req.body.insurance_policy || findMoveCompliance.insurance_policy,
                        insurance_till: req.body.insurance_till || findMoveCompliance.insurance_till,
                        insurance_authority: req.body.insurance_authority || findMoveCompliance.insurance_authority,
                        permit_url: req.body.permit_url || findMoveCompliance.permit_url,
                        permit: req.body.permit || findMoveCompliance.permit,
                        permit_no: req.body.permit_no || findMoveCompliance.permit_no,
                        permit_till: req.body.permit_till || findMoveCompliance.permit_till,
                        pucc_url: req.body.pucc_url || findMoveCompliance.pucc_url,
                        pucc_no: req.body.pucc_no || findMoveCompliance.pucc_no,
                        pucc_till: req.body.pucc_till || findMoveCompliance.pucc_till,
                        fitness_certificate: req.body.fitness_certificate || findMoveCompliance.fitness_certificate,
                        fitness_certificate_till: req.body.fitness_certificate_till || findMoveCompliance.fitness_certificate_till,
                        no_entry_permit: req.body.no_entry_permit || findMoveCompliance.no_entry_permit,
                        added_by: cUser.id
                    },
                        {
                            transaction: transaction
                        }
                    );
                    const urlkey = [
                        "permit_url",
                        "pucc_url",
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'move_compliance_details',
                                type_id: findMove.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'move_comliance_documents',
                            activity_id: findMove.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
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
                    await Promise.all(log);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findMove.user_id;
                    await models.user_activity_logs.create({
                        user_id: findMove.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Move',
                        activity_id: findMove.id,
                        activity_type: "move_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id
                    });
                    return findMoveCompliance
                })
            } else {

                moveCompliance = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        move_id: req.body.move_id,
                        insurance_policy: req.body.insurance_policy,
                        insurance_till: req.body.insurance_till,
                        insurance_authority: req.body.insurance_authority,
                        permit_url: req.body.permit_url,
                        permit: req.body.permit,
                        permit_no: req.body.permit_no,
                        permit_till: req.body.permit_till,
                        pucc_url: req.body.pucc_url,
                        pucc_no: req.body.pucc_no,
                        pucc_till: req.body.pucc_till,
                        fitness_certificate: req.body.fitness_certificate,
                        fitness_certificate_till: req.body.fitness_certificate_till,
                        no_entry_permit: req.body.no_entry_permit,
                        added_by: cUser.id
                    }
                    const createmove = await models.move_compliance_details.create(data, {
                        transaction: transaction
                    })
                    const urlkey = [
                        "permit_url",
                        "pucc_url",
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'move_compliance_details',
                                type_id: findMove.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'move_comliance_documents',
                            activity_id: findMove.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
                    })
                    await Promise.all(log);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findMove.user_id;
                    await models.user_activity_logs.create({
                        user_id: cUser.id,
                        kmp_id: kmp_ids,
                        activity: 'Move',
                        activity_id: findMove.id,
                        activity_type: "move_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findMove.user_id
                        }
                    })
                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information move compliance request is now complete.`)
                    const findPartnerUid = findReciverToken.user_uid
                    await models.manager_logs.create({
                        user_id: cUser.id,
                        activity: "Add Request",
                        title: "Request",
                        details: `has added move compliance for ${findMoveUid} in ${findPartnerUid}.`
                    });
                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findMove.user_id,
                        title: `Add Request Completed ${findMoveUid}`,
                        messages: `Your Basic Information move compliance request is now complete.`,
                        notification_type: "Move Management"

                    }, { transaction });

                    return createmove
                })
            }

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
                return REST.success(res, moveCompliance, 'Move Compliance Details Updated Successfully');
            } else {
                return REST.success(res, moveCompliance, 'Move Compliance Details Updated Successfully');
            }

        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                move_id: "required|integer",
                request_id: "integer",
            })
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findMove = await models.move_details.findByPk(req.body.move_id)
            if (!findMove) {
                return REST.error(res, 'move  not found', 404);
            }
            const findMoveUid = findMove.move_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const findMoveCompliance = await models.move_compliance_details.findOne({ where: { move_id: req.body.move_id } })
            let moveCompliance
            if (findMoveCompliance) {
                moveCompliance = await models.sequelize.transaction(async (transaction) => {
                    await findMoveCompliance.update({
                        move_id: req.body.move_id,
                        insurance_policy: req.body.insurance_policy || findMoveCompliance.insurance_policy,
                        insurance_till: req.body.insurance_till || findMoveCompliance.insurance_till,
                        insurance_authority: req.body.insurance_authority || findMoveCompliance.insurance_authority,
                        permit_url: req.body.permit_url || findMoveCompliance.permit_url,
                        permit: req.body.permit || findMoveCompliance.permit,
                        permit_no: req.body.permit_no || findMoveCompliance.permit_no,
                        permit_till: req.body.permit_till || findMoveCompliance.permit_till,
                        pucc_url: req.body.pucc_url || findMoveCompliance.pucc_url,
                        pucc_no: req.body.pucc_no || findMoveCompliance.pucc_no,
                        pucc_till: req.body.pucc_till || findMoveCompliance.pucc_till,
                        fitness_certificate: req.body.fitness_certificate || findMoveCompliance.fitness_certificate,
                        fitness_certificate_till: req.body.fitness_certificate_till || findMoveCompliance.fitness_certificate_till,
                        no_entry_permit: req.body.no_entry_permit || findMoveCompliance.no_entry_permit,
                        added_by: cUser.id
                    },
                        {
                            transaction: transaction
                        }
                    );
                    const urlkey = [
                        "permit_url",
                        "pucc_url",
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'move_compliance_details',
                                type_id: findMove.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'move_comliance_documents',
                            activity_id: findMove.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
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
                    await Promise.all(log);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findMove.user_id
                    await models.user_activity_logs.create({
                        user_id: findMove.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Move',
                        activity_id: findMove.id,
                        activity_type: "move_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id
                    });
                    return findMoveCompliance
                })
            } else {
                moveCompliance = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        move_id: req.body.move_id,
                        insurance_policy: req.body.insurance_policy,
                        insurance_till: req.body.insurance_till,
                        insurance_authority: req.body.insurance_authority,
                        permit_url: req.body.permit_url,
                        permit: req.body.permit,
                        permit_no: req.body.permit_no,
                        permit_till: req.body.permit_till,
                        pucc_url: req.body.pucc_url,
                        pucc_no: req.body.pucc_no,
                        pucc_till: req.body.pucc_till,
                        fitness_certificate: req.body.fitness_certificate,
                        fitness_certificate_till: req.body.fitness_certificate_till,
                        no_entry_permit: req.body.no_entry_permit,
                        added_by: cUser.id
                    }
                    const createmove = await models.move_compliance_details.create(data, {
                        transaction: transaction
                    })
                    const urlkey = [
                        "permit_url",
                        "pucc_url",
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'move_compliance_details',
                                type_id: findMove.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'move_comliance_documents',
                            activity_id: findMove.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
                    })
                    await Promise.all(log);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findMove.user_id
                    await models.user_activity_logs.create({
                        user_id: cUser.id,
                        kmp_id: kmp_ids,
                        activity: 'Move',
                        activity_id: findMove.id,
                        activity_type: "move_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findMove.user_id
                        }
                    })
                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information move compliance request is now complete.`)
                    const findPartnerUid = findReciverToken.user_uid
                    await models.manager_logs.create({
                        user_id: cUser.id,
                        activity: "Add Request",
                        title: "Request",
                        details: `has added move compliance for ${findMoveUid} in ${findPartnerUid}.`
                    });
                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findMove.user_id,
                        title: `Add Request Completed ${findMoveUid}`,
                        messages: `Your Basic Information move compliance request is now complete.`,
                        notification_type: "Move Management"
                    }, { transaction });

                    return createmove
                })
            }

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
            return REST.success(res, moveCompliance, 'Move Compliance Details Updated Successfully');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);

    }
})
router.put('/updateCompliance/:move_id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        })
        if (cUser.role_id == 3) {
            var findmoveCompliance
            findmoveCompliance = await models.move_compliance_details.findOne({ where: { move_id: req.params.move_id } })
            if (findmoveCompliance == null) {
                return REST.error(res, 'Move Compliance id not found', 404)
            }
            const findMoves = await models.move_details.findOne({ where: { id: findmoveCompliance.move_id } })
            if (findMoves == null) {
                return REST.error(res, 'Moves Id not found', 404)
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findMoves.user_id;
            const findMovesUid = findMoves.move_uid
            await models.sequelize.transaction(async (transaction) => {
                await models.move_compliance_details.update({
                    move_id: req.params.move_id,
                    insurance_policy: req.body.insurance_policy,
                    insurance_till: req.body.insurance_till,
                    insurance_authority: req.body.insurance_authority,
                    permit_url: req.body.permit_url,
                    permit: req.body.permit,
                    permit_no: req.body.permit_no,
                    permit_till: req.body.permit_till,
                    pucc_url: req.body.pucc_url,
                    pucc_no: req.body.pucc_no,
                    pucc_till: req.body.pucc_till,
                    fitness_certificate: req.body.fitness_certificate,
                    fitness_certificate_till: req.body.fitness_certificate_till,
                    no_entry_permit: req.body.no_entry_permit,
                },
                    {
                        where: { move_id: findmoveCompliance.move_id },
                        transaction: transaction
                    }
                )
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findMoves.user_id
                    }
                })
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information move compliance request is now complete.`)
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findMoves.user_id,
                    title: `Edit Request Completed ${findMovesUid}`,
                    messages: `Your Basic Information move compliance request is now complete.`
                }, { transaction });
                await models.move_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: findMoves.id },
                    transaction: transaction
                });
                const urlkey = [
                    "permit_url",
                    "pucc_url",
                ]
                const log = urlkey.map(async (key) => {
                    if (req.body[key]) {
                        const findexistingdocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'move_compliance_details',
                                type_id: findMoves.id,
                                document_type: key
                            },
                            transaction
                        });
                        const currentData = {
                            document_type_url: req.body[key],
                        };
                        const previousData = {
                            document_type_url: findexistingdocs.document_type_url,
                        };
                        if (findexistingdocs) {
                            await findexistingdocs.update({
                                document_type_url: (req.body[key]),
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                            await models.user_activity_logs.create({
                                user_id: cUser.id,
                                activity: 'move_comliance_documents',
                                activity_id: findMoves.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'move_compliance_details',
                                type_id: findMoves.id,
                                document_type: key,
                                document_type_url: (req.body[key]),
                                action: 'Added_by',
                                updated_by: cUser.id,
                            }, { transaction });
                        }
                    }
                });
                await Promise.all(log);
            })
            await models.sequelize.transaction(async (transaction) => {
                const findmove = await models.move_compliance_details.findOne({ where: { move_id: req.params.move_id } })
                const previousData = findmoveCompliance.dataValues;
                delete req.body.current_user;
                const currentData = findmove.dataValues;
                const activityLog = {
                    user_id: findmoveCompliance.user_id,
                    kmp_id: kmp_ids,
                    activity: `Move`,
                    activity_id: findMoves.id,
                    activity_type: "move_compliance_details",
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
                return REST.success(res, null, 'Move Compliance Updated Successfully');
            } else {
                return REST.success(res, null, 'Move Compliance Updated Successfully');
            }
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            var findmoveCompliance
            findmoveCompliance = await models.move_compliance_details.findOne({ where: { move_id: req.params.move_id } })
            if (findmoveCompliance == null) {
                return REST.error(res, 'Move Compliance id not found', 404)
            }
            const findMoves = await models.move_details.findOne({ where: { id: findmoveCompliance.move_id } })
            if (findMoves == null) {
                return REST.error(res, 'Moves Id not found', 404)
            }
            const findMovesUid = findMoves.move_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findMoves.user_id;
            await models.sequelize.transaction(async (transaction) => {
                await models.move_compliance_details.update({
                    move_id: req.params.move_id,
                    insurance_policy: req.body.insurance_policy,
                    insurance_till: req.body.insurance_till,
                    insurance_authority: req.body.insurance_authority,
                    permit_url: req.body.permit_url,
                    permit: req.body.permit,
                    permit_no: req.body.permit_no,
                    permit_till: req.body.permit_till,
                    pucc_url: req.body.pucc_url,
                    pucc_no: req.body.pucc_no,
                    pucc_till: req.body.pucc_till,
                    fitness_certificate: req.body.fitness_certificate,
                    fitness_certificate_till: req.body.fitness_certificate_till,
                    no_entry_permit: req.body.no_entry_permit,
                },
                    {
                        where: { move_id: findmoveCompliance.move_id },
                        transaction: transaction
                    }
                )
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findMoves.user_id
                    }
                })
                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information move compliance request is now complete.`)
                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit move compliance for ${findMovesUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findMoves.user_id,
                    title: `Edit Request Completed ${findMovesUid}`,
                    messages: `Your Basic Information move compliance request is now complete.`
                }, { transaction });

                await models.move_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: findMoves.id },
                    transaction: transaction
                });
                const urlkey = [
                    "permit_url",
                    "pucc_url",
                ]
                const log = urlkey.map(async (key) => {
                    if (req.body[key]) {
                        const findexistingdocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'move_compliance_details',
                                type_id: findMoves.id,
                                document_type: key
                            },
                            transaction
                        });
                        const currentData = {
                            document_type_url: req.body[key],
                        };
                        const previousData = {
                            document_type_url: findexistingdocs.document_type_url,
                        };
                        if (findexistingdocs) {
                            await findexistingdocs.update({
                                document_type_url: (req.body[key]),
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                            await models.user_activity_logs.create({
                                user_id: cUser.id,
                                activity: 'move_comliance_documents',
                                activity_id: findMoves.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'move_compliance_details',
                                type_id: findMoves.id,
                                document_type: key,
                                document_type_url: (req.body[key]),
                                action: 'Added_by',
                                updated_by: cUser.id,
                            }, { transaction });
                        }
                    }
                });
                await Promise.all(log);
            })
            await models.sequelize.transaction(async (transaction) => {
                const findmove = await models.move_compliance_details.findOne({ where: { move_id: req.params.move_id } })
                const previousData = findmoveCompliance.dataValues;
                delete req.body.current_user;
                const currentData = findmove.dataValues;
                const activityLog = {
                    user_id: findmoveCompliance.user_id,
                    kmp_id: kmp_ids,
                    activity: `Move`,
                    activity_id: findMoves.id,
                    activity_type: "move_compliance_details",
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
                return REST.success(res, null, 'Move Compliance Updated Successfully');
            } else {
                return REST.success(res, null, 'Move Compliance Updated Successfully');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            var findmoveCompliance
            findmoveCompliance = await models.move_compliance_details.findOne({ where: { move_id: req.params.move_id } })
            if (findmoveCompliance == null) {
                return REST.error(res, 'Move Compliance id not found', 404)
            }
            const findMoves = await models.move_details.findOne({ where: { id: findmoveCompliance.move_id } })
            if (findMoves == null) {
                return REST.error(res, 'Moves Id not found', 404)
            }
            const findMovesUid = findMoves.move_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findMoves.user_id;
            await models.sequelize.transaction(async (transaction) => {
                await models.move_compliance_details.update({
                    move_id: req.params.move_id,
                    insurance_policy: req.body.insurance_policy,
                    insurance_till: req.body.insurance_till,
                    insurance_authority: req.body.insurance_authority,
                    permit_url: req.body.permit_url,
                    permit: req.body.permit,
                    permit_no: req.body.permit_no,
                    permit_till: req.body.permit_till,
                    pucc_url: req.body.pucc_url,
                    pucc_no: req.body.pucc_no,
                    pucc_till: req.body.pucc_till,
                    fitness_certificate: req.body.fitness_certificate,
                    fitness_certificate_till: req.body.fitness_certificate_till,
                    no_entry_permit: req.body.no_entry_permit,
                },
                    {
                        where: { move_id: findmoveCompliance.move_id },
                        transaction: transaction
                    }
                )
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findMoves.user_id
                    }
                })
                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information move compliance request is now complete.`)
                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit move compliance for ${findMovesUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findMoves.user_id,
                    title: `Edit Request Completed ${findMovesUid}`,
                    messages: `Your Basic Information move compliance request is now complete.`
                }, { transaction });

                await models.move_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: findMoves.id },
                    transaction: transaction
                });
                const urlkey = [
                    "permit_url",
                    "pucc_url",
                ]
                const log = urlkey.map(async (key) => {
                    if (req.body[key]) {
                        const findexistingdocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'move_compliance_details',
                                type_id: findMoves.id,
                                document_type: key
                            },
                            transaction
                        });
                        const currentData = {
                            document_type_url: req.body[key],
                        };
                        const previousData = {
                            document_type_url: findexistingdocs.document_type_url,
                        };
                        if (findexistingdocs) {
                            await findexistingdocs.update({
                                document_type_url: (req.body[key]),
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                            await models.user_activity_logs.create({
                                user_id: cUser.id,
                                activity: 'move_comliance_documents',
                                activity_id: findMoves.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'move_compliance_details',
                                type_id: findMoves.id,
                                document_type: key,
                                document_type_url: (req.body[key]),
                                action: 'Added_by',
                                updated_by: cUser.id,
                            }, { transaction });
                        }
                    }
                });
                await Promise.all(log);
            })
            await models.sequelize.transaction(async (transaction) => {
                const findmove = await models.move_compliance_details.findOne({ where: { move_id: req.params.move_id } })
                const previousData = findmoveCompliance.dataValues;
                delete req.body.current_user;
                const currentData = findmove.dataValues;
                const activityLog = {
                    user_id: findmoveCompliance.user_id,
                    kmp_id: kmp_ids,
                    activity: `Move`,
                    activity_id: findMoves.id,
                    activity_type: "move_compliance_details",
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

            return REST.success(res, null, 'Move Compliance Updated Successfully');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router