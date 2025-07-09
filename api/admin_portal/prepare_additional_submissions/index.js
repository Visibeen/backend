const { make } = require('simple-body-validator');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const { sendPushNotification } = require('../../../utils/helper')
const support = require('../../../utils/support');

/*
|----------------------------------------------------------------------------------------------------------------
|              Prepare Additional Submissions Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createAdditional', async function (req, res) {
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
                prepare_id: "required|integer",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findPrepares = await models.prepare_details.findByPk(req.body.prepare_id)
            if (!findPrepares) {
                return REST.error(res, 'Prepare details not found', 404);
            }
            const findPrepareUid = findPrepares.prepare_uid
            const findPrepare = await models.prepare_additional_submissions.findOne({
                where: {
                    prepare_id: req.body.prepare_id
                }
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            let additional;
            if (findPrepare) {
                additional = await models.sequelize.transaction(async (transaction) => {
                    await findPrepare.update({
                        no_lien_certificate_url: req.body.no_lien_certificate_url || findPrepare.no_lien_certificate_url,
                        electricity_bill_url: req.body.electricity_bill_url || findPrepare.electricity_bill_url,
                        structural_load_safety_certificate_url: req.body.structural_load_safety_certificate_url || findPrepare.structural_load_safety_certificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url || findPrepare.insurance_certificate_url,
                        insurance_certificate_valid: req.body.insurance_certificate_valid || findPrepare.insurance_certificate_valid,
                        insuring_company: req.body.insuring_company || findPrepare.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount || findPrepare.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock || findPrepare.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage || findPrepare.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown || findPrepare.insurance_machine_breakdown,
                        facility_layout_url: req.body.facility_layout_url || findPrepare.facility_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url || findPrepare.storage_temperature_url,
                        asset_3d_view_url: req.body.asset_3d_view_url || findPrepare.asset_3d_view_url,
                        asset_photo_url: req.body.asset_photo_url || findPrepare.asset_photo_url,
                        added_by: cUser.id
                    }, {
                        transaction: transaction
                    });
                    const urlKeys = [
                        "no_lien_certificate_url",
                        "electricity_bill_url",
                        "structural_load_safety_certificate_url",
                        "insurance_certificate_url",
                        "facility_layout_url",
                        "storage_temperature_url",
                        "asset_3d_view_url",
                        "asset_photo_url"
                    ];
                    const documentLogPromises = urlKeys.flatMap(async (key) => {
                        const urls = Array.isArray(req.body[key]) ? req.body[key] : [req.body[key]];
                        return Promise.all(urls.map(async (url) => {
                            if (url) {
                                await models.document_common_logs.create({
                                    user_id: cUser.id,
                                    type: 'prepare_additional_submissions',
                                    type_id: findPrepares.id,
                                    document_type: key,
                                    document_type_url: url,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }));
                    });
                    await Promise.all(documentLogPromises);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id
                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_additional_submissions",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    }, {
                        transaction: transaction
                    });
                    return findPrepare;
                });
            } else {
                additional = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        prepare_id: req.body.prepare_id,
                        no_lien_certificate_url: req.body.no_lien_certificate_url,
                        electricity_bill_url: req.body.electricity_bill_url,
                        structural_load_safety_certificate_url: req.body.structural_load_safety_certificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url,
                        insurance_certificate_valid: req.body.insurance_certificate_valid,
                        insuring_company: req.body.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                        facility_layout_url: req.body.facility_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url,
                        asset_3d_view_url: req.body.asset_3d_view_url,
                        asset_photo_url: req.body.asset_photo_url,
                        added_by: cUser.id
                    };
                    const createData = await models.prepare_additional_submissions.create(data, {
                        transaction: transaction
                    });
                    const urlKeys = [
                        "no_lien_certificate_url",
                        "electricity_bill_url",
                        "structural_load_safety_certificate_url",
                        "insurance_certificate_url",
                        "facility_layout_url",
                        "storage_temperature_url",
                        "asset_3d_view_url",
                        "asset_photo_url"
                    ];
                    const documentLogPromises = urlKeys.flatMap(async (key) => {
                        const urls = Array.isArray(req.body[key]) ? req.body[key] : [req.body[key]];
                        return Promise.all(urls.map(async (url) => {
                            if (url) {
                                await models.document_common_logs.create({
                                    user_id: cUser.id,
                                    type: 'prepare_additional_submissions',
                                    type_id: findPrepares.id,
                                    document_type: key,
                                    document_type_url: url,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }));
                    });
                    await Promise.all(documentLogPromises);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id
                    delete req.body.current_user;

                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_additional_submissions",
                        current_data: currentData,
                        action: 'Added',
                        added_by: cUser.id

                    }, {
                        transaction: transaction
                    });
                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findPrepares.user_id
                        }
                    })
                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare additional submissions request is now complete.`)

                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findPrepares.user_id,
                        title: `Add Request Completed ${findPrepareUid}`,
                        messages: `Your Basic Information prepare additional submissions request is now complete.`,
                        notification_type: "Perpare Management"
                    }, { transaction });

                    return createData;
                });
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
            return REST.success(res, additional, 'Prepare Additional Details Create Successfully');

        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                prepare_id: "required|integer",
                request_id: "integer",
            });

            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findPrepares = await models.prepare_details.findByPk(req.body.prepare_id)
            if (!findPrepares) {
                return REST.error(res, 'Prepare details not found', 404);
            }
            const findPrepareUid = findPrepares.prepare_uid
            const findPrepare = await models.prepare_additional_submissions.findOne({
                where: {
                    prepare_id: req.body.prepare_id
                }
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            let additional;
            if (findPrepare) {
                additional = await models.sequelize.transaction(async (transaction) => {
                    await findPrepare.update({
                        no_lien_certificate_url: req.body.no_lien_certificate_url || findPrepare.no_lien_certificate_url,
                        electricity_bill_url: req.body.electricity_bill_url || findPrepare.electricity_bill_url,
                        structural_load_safety_certificate_url: req.body.structural_load_safety_certificate_url || findPrepare.structural_load_safety_certificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url || findPrepare.insurance_certificate_url,
                        insurance_certificate_valid: req.body.insurance_certificate_valid || findPrepare.insurance_certificate_valid,
                        insuring_company: req.body.insuring_company || findPrepare.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount || findPrepare.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock || findPrepare.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage || findPrepare.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown || findPrepare.insurance_machine_breakdown,
                        facility_layout_url: req.body.facility_layout_url || findPrepare.facility_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url || findPrepare.storage_temperature_url,
                        asset_3d_view_url: req.body.asset_3d_view_url || findPrepare.asset_3d_view_url,
                        asset_photo_url: req.body.asset_photo_url || findPrepare.asset_photo_url,
                        added_by: cUser.id
                    }, {
                        transaction: transaction
                    });
                    const urlKeys = [
                        "no_lien_certificate_url",
                        "electricity_bill_url",
                        "structural_load_safety_certificate_url",
                        "insurance_certificate_url",
                        "facility_layout_url",
                        "storage_temperature_url",
                        "asset_3d_view_url",
                        "asset_photo_url"
                    ];
                    const documentLogPromises = urlKeys.flatMap(async (key) => {
                        const urls = Array.isArray(req.body[key]) ? req.body[key] : [req.body[key]];
                        return Promise.all(urls.map(async (url) => {
                            if (url) {
                                await models.document_common_logs.create({
                                    user_id: cUser.id,
                                    type: 'prepare_additional_submissions',
                                    type_id: findPrepares.id,
                                    document_type: key,
                                    document_type_url: url,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }));
                    });
                    await Promise.all(documentLogPromises);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id
                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_additional_submissions",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    }, {
                        transaction: transaction
                    });
                    return findPrepare;
                });
            } else {
                additional = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        prepare_id: req.body.prepare_id,
                        no_lien_certificate_url: req.body.no_lien_certificate_url,
                        electricity_bill_url: req.body.electricity_bill_url,
                        structural_load_safety_certificate_url: req.body.structural_load_safety_certificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url,
                        insurance_certificate_valid: req.body.insurance_certificate_valid,
                        insuring_company: req.body.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                        facility_layout_url: req.body.facility_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url,
                        asset_3d_view_url: req.body.asset_3d_view_url,
                        asset_photo_url: req.body.asset_photo_url,
                        added_by: cUser.id
                    };
                    const createData = await models.prepare_additional_submissions.create(data, {
                        transaction: transaction
                    });
                    const urlKeys = [
                        "no_lien_certificate_url",
                        "electricity_bill_url",
                        "structural_load_safety_certificate_url",
                        "insurance_certificate_url",
                        "facility_layout_url",
                        "storage_temperature_url",
                        "asset_3d_view_url",
                        "asset_photo_url"
                    ];
                    const documentLogPromises = urlKeys.flatMap(async (key) => {
                        const urls = Array.isArray(req.body[key]) ? req.body[key] : [req.body[key]];
                        return Promise.all(urls.map(async (url) => {
                            if (url) {
                                await models.document_common_logs.create({
                                    user_id: cUser.id,
                                    type: 'prepare_additional_submissions',
                                    type_id: findPrepares.id,
                                    document_type: key,
                                    document_type_url: url,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }));
                    });
                    await Promise.all(documentLogPromises);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id
                    delete req.body.current_user;

                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_additional_submissions",
                        current_data: currentData,
                        action: 'Added',
                        added_by: cUser.id

                    }, {
                        transaction: transaction
                    });
                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findPrepares.user_id
                        }
                    })
                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare additional submissions request is now complete.`)

                    const findPartnerUid = findReciverToken.user_uid
                    await models.manager_logs.create({
                        user_id: cUser.id,
                        activity: "Add Request",
                        title: "Request",
                        details: `has added prepare additional submissions of ${findPrepareUid} in ${findPartnerUid}.`
                    });
                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findPrepares.user_id,
                        title: `Add Request Completed ${findPrepareUid}`,
                        messages: `Your Basic Information prepare additional submissions request is now complete.`,
                        notification_type: "Perpare Management"

                    }, { transaction });

                    return createData;
                });
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
            return REST.success(res, additional, 'Prepare Additional Details Create Successfully');

        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                prepare_id: "required|integer",
                request_id: "integer",
            });
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findPrepares = await models.prepare_details.findByPk(req.body.prepare_id)
            if (!findPrepares) {
                return REST.error(res, 'Prepare details not found', 404);
            }
            const findPrepareUid = findPrepares.prepare_uid
            const findPrepare = await models.prepare_additional_submissions.findOne({
                where: {
                    prepare_id: req.body.prepare_id
                }
            })
            let additional;
            if (findPrepare) {
                additional = await models.sequelize.transaction(async (transaction) => {
                    await findPrepare.update({
                        no_lien_certificate_url: req.body.no_lien_certificate_url || findPrepare.no_lien_certificate_url,
                        electricity_bill_url: req.body.electricity_bill_url || findPrepare.electricity_bill_url,
                        structural_load_safety_certificate_url: req.body.structural_load_safety_certificate_url || findPrepare.structural_load_safety_certificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url || findPrepare.insurance_certificate_url,
                        insurance_certificate_valid: req.body.insurance_certificate_valid || findPrepare.insurance_certificate_valid,
                        insuring_company: req.body.insuring_company || findPrepare.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount || findPrepare.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock || findPrepare.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage || findPrepare.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown || findPrepare.insurance_machine_breakdown,
                        facility_layout_url: req.body.facility_layout_url || findPrepare.facility_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url || findPrepare.storage_temperature_url,
                        asset_3d_view_url: req.body.asset_3d_view_url || findPrepare.asset_3d_view_url,
                        asset_photo_url: req.body.asset_photo_url || findPrepare.asset_photo_url,
                        added_by: cUser.id
                    }, {
                        transaction: transaction
                    });
                    const urlKeys = [
                        "no_lien_certificate_url",
                        "electricity_bill_url",
                        "structural_load_safety_certificate_url",
                        "insurance_certificate_url",
                        "facility_layout_url",
                        "storage_temperature_url",
                        "asset_3d_view_url",
                        "asset_photo_url"
                    ];
                    const documentLogPromises = urlKeys.flatMap(async (key) => {
                        const urls = Array.isArray(req.body[key]) ? req.body[key] : [req.body[key]];
                        return Promise.all(urls.map(async (url) => {
                            if (url) {
                                await models.document_common_logs.create({
                                    user_id: cUser.id,
                                    type: 'prepare_additional_submissions',
                                    type_id: findPrepares.id,
                                    document_type: key,
                                    document_type_url: url,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }));
                    });
                    await Promise.all(documentLogPromises);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id
                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_additional_submissions",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    }, {
                        transaction: transaction
                    });
                    return findPrepare;
                });
            } else {
                additional = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        prepare_id: req.body.prepare_id,
                        no_lien_certificate_url: req.body.no_lien_certificate_url,
                        electricity_bill_url: req.body.electricity_bill_url,
                        structural_load_safety_certificate_url: req.body.structural_load_safety_certificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url,
                        insurance_certificate_valid: req.body.insurance_certificate_valid,
                        insuring_company: req.body.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                        facility_layout_url: req.body.facility_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url,
                        asset_3d_view_url: req.body.asset_3d_view_url,
                        asset_photo_url: req.body.asset_photo_url,
                        added_by: cUser.id
                    };
                    const createData = await models.prepare_additional_submissions.create(data, {
                        transaction: transaction
                    });
                    const urlKeys = [
                        "no_lien_certificate_url",
                        "electricity_bill_url",
                        "structural_load_safety_certificate_url",
                        "insurance_certificate_url",
                        "facility_layout_url",
                        "storage_temperature_url",
                        "asset_3d_view_url",
                        "asset_photo_url"
                    ];
                    const documentLogPromises = urlKeys.flatMap(async (key) => {
                        const urls = Array.isArray(req.body[key]) ? req.body[key] : [req.body[key]];
                        return Promise.all(urls.map(async (url) => {
                            if (url) {
                                await models.document_common_logs.create({
                                    user_id: cUser.id,
                                    type: 'prepare_additional_submissions',
                                    type_id: findPrepares.id,
                                    document_type: key,
                                    document_type_url: url,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }));
                    });
                    await Promise.all(documentLogPromises);
                    const currentData = req.body;
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id
                    delete req.body.current_user;

                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_ids: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_additional_submissions",
                        current_data: currentData,
                        action: 'Added',
                        added_by: cUser.id

                    }, {
                        transaction: transaction
                    });
                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findPrepares.user_id
                        }
                    })
                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare additional submissions request is now complete.`)

                    const findPartnerUid = findReciverToken.user_uid
                    await models.manager_logs.create({
                        user_id: cUser.id,
                        activity: "Add Request",
                        title: "Request",
                        details: `has added prepare additional submissions of ${findPrepareUid} in ${findPartnerUid}.`
                    });
                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findPrepares.user_id,
                        title: `Add Request Completed ${findPrepareUid}`,
                        messages: `Your Basic Information prepare additional submissions request is now complete.`,
                        notification_type: "Perpare Management"

                    }, { transaction });

                    return createData;
                });
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
            return REST.success(res, additional, 'Prepare Additional Details Create Successfully');

        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/additionalUpdate/:perpare_id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        })
        if (cUser.role_id == 3) {
            let findAdditional = await models.prepare_additional_submissions.findOne({ where: { prepare_id: req.params.perpare_id } });
            if (findAdditional == null) {
                return REST.error(res, 'Prepare Id Not Found', 404);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const prepare = await models.prepare_details.findOne({ where: { id: req.params.perpare_id } });
            if (prepare == null) {
                return REST.error(res, 'Prepare not found.', 404);
            }
            const prepareUid = prepare.prepare_uid;
            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_additional_submissions.update({
                    no_lien_certificate_url: req.body.no_lien_certificate_url,
                    electricity_bill_url: req.body.electricity_bill_url,
                    structural_load_safety_certificate_url: req.body.structural_load_safety_certificate_url,
                    insurance_certificate_url: req.body.insurance_certificate_url,
                    insurance_certificate_valid: req.body.insurance_certificate_valid,
                    insuring_company: req.body.insuring_company,
                    insurance_premium_amount: req.body.insurance_premium_amount,
                    insurance_third_party_stock: req.body.insurance_third_party_stock,
                    insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                    insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                    facility_layout_url: req.body.facility_layout_url,
                    storage_temperature_url: req.body.storage_temperature_url,
                    asset_3d_view_url: req.body.asset_3d_view_url,
                    asset_photo_url: req.body.asset_photo_url,
                    updated_by: cUser.id
                }, {
                    where: { prepare_id: findAdditional.prepare_id },
                    transaction: transaction
                });

                const findReciverToken = await models.User.findOne({
                    where: {
                        id: prepare.user_id
                    }
                });

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare additional submissions request is now complete.`)


                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: prepare.user_id,
                    title: `Edit Request Completed ${prepareUid}`,
                    messages: `Your Basic Information prepare additional submissions request is now complete.`,
                    notification_type: "Perpare Management"

                }, { transaction });

                await models.prepare_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: prepare.id },
                    transaction: transaction
                });

                const urlkey = [
                    "no_lien_certificate_url",
                    "electricity_bill_url",
                    "structural_load_safety_certificate_url",
                    "insurance_certificate_url",
                    "facility_layout_url",
                    "storage_temperature_url",
                    "asset_3d_view_url",
                    "asset_photo_url"
                ];
                const logPromises = urlkey.map(async (key) => {
                    if (req.body[key] !== undefined) {
                        let documentTypeUrl = Array.isArray(req.body[key]) ? JSON.stringify(req.body[key]) : req.body[key];
                        if (documentTypeUrl === '' || documentTypeUrl === undefined) {
                            documentTypeUrl = null;
                        }
                        const findExistingDocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'prepare_additional_submissions',
                                type_id: prepare.id,
                                document_type: key
                            },
                            transaction
                        });
                        if (findExistingDocs) {
                            if (documentTypeUrl) {
                                await findExistingDocs.update({
                                    document_type_url: documentTypeUrl,
                                    action: 'Updated',
                                    updated_by: cUser.id,
                                }, { transaction });
                            }
                        } else {
                            if (documentTypeUrl) {
                                await models.document_common_logs.create({
                                    user_id: cUser.id,
                                    type: 'prepare_additional_submissions',
                                    type_id: prepare.id,
                                    document_type: key,
                                    document_type_url: documentTypeUrl,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }
                        const existingActivityLog = await models.user_activity_logs.findOne({
                            where: {
                                activity_id: prepare.id,
                                activity_type: key,
                            },
                            transaction
                        });
                        const currentData = {
                            document_type_url: (req.body[key]),
                        };
                        let previousData = {};
                        if (existingActivityLog) {
                            previousData = {
                                document_type_url: existingActivityLog.current_data.document_type_url,
                            };
                            await existingActivityLog.update({
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.user_activity_logs.create({
                                user_id: cUser.id,
                                activity: 'prepare_addtional_submission',
                                activity_id: prepare.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: { document_type_url: documentTypeUrl },
                                action: 'Added',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                    }
                })
                await Promise.all(logPromises);
            });
            await models.sequelize.transaction(async (transaction) => {
                const additional = await models.prepare_additional_submissions.findOne({ where: { prepare_id: findAdditional.prepare_id } });
                const previousData = findAdditional.dataValues;
                const kmp_ids = req.body.request_id ? findrequest.user_id : prepare.user_id
                delete req.body.current_user;
                const currentData = additional.dataValues;
                const parseAssetUrl = (url) => {
                    if (typeof url === 'string' && url) {
                        try {
                            return JSON.parse(url);
                        } catch (e) {
                            console.error("Failed to parse asset URL:", e);
                            return null;
                        }
                    }
                    return null;
                };

                if (previousData.asset_3d_view_url) {
                    previousData.asset_3d_view_url = parseAssetUrl(previousData.asset_3d_view_url);
                }

                if (previousData.asset_photo_url) {
                    previousData.asset_photo_url = parseAssetUrl(previousData.asset_photo_url);
                }

                if (currentData.asset_3d_view_url) {
                    currentData.asset_3d_view_url = parseAssetUrl(currentData.asset_3d_view_url);
                }

                if (currentData.asset_photo_url) {
                    currentData.asset_photo_url = parseAssetUrl(currentData.asset_photo_url);
                }

                const activityLog = {
                    user_id: prepare.user_id,
                    kmp_id: kmp_ids,
                    activity: `Prepare`,
                    activity_id: prepare.id,
                    activity_type: "prepare_addtional_submission",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };

                await models.user_activity_logs.create(activityLog, { transaction: transaction });
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
                return REST.success(res, null, 'Prepare Additional Details Updated Successfully');

            } else {
                return REST.success(res, null, 'Prepare Additional Details Updated Successfully');
            }
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            let findAdditional = await models.prepare_additional_submissions.findOne({ where: { prepare_id: req.params.perpare_id } });
            if (findAdditional == null) {
                return REST.error(res, 'Prepare Id Not Found', 404);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            });
            const prepare = await models.prepare_details.findOne({ where: { id: req.params.perpare_id } });
            if (prepare == null) {
                return REST.error(res, 'Prepare not found.', 404);
            }
            const prepareUid = prepare.prepare_uid;
            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_additional_submissions.update({
                    no_lien_certificate_url: req.body.no_lien_certificate_url,
                    electricity_bill_url: req.body.electricity_bill_url,
                    structural_load_safety_certificate_url: req.body.structural_load_safety_certificate_url,
                    insurance_certificate_url: req.body.insurance_certificate_url,
                    insurance_certificate_valid: req.body.insurance_certificate_valid,
                    insuring_company: req.body.insuring_company,
                    insurance_premium_amount: req.body.insurance_premium_amount,
                    insurance_third_party_stock: req.body.insurance_third_party_stock,
                    insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                    insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                    facility_layout_url: req.body.facility_layout_url,
                    storage_temperature_url: req.body.storage_temperature_url,
                    asset_3d_view_url: req.body.asset_3d_view_url,
                    asset_photo_url: req.body.asset_photo_url,
                    updated_by: cUser.id
                }, {
                    where: { prepare_id: findAdditional.prepare_id },
                    transaction: transaction
                });

                const findReciverToken = await models.User.findOne({
                    where: {
                        id: prepare.user_id
                    }
                });
                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare additional submissions request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit prepare additional submissions for ${prepareUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: prepare.user_id,
                    title: `Edit Request Completed ${prepareUid}`,
                    messages: `Your Basic Information prepare additional submissions request is now complete.`,
                    notification_type: "Perpare Management"

                }, { transaction });

                await models.prepare_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: prepare.id },
                    transaction: transaction
                });

                const urlkey = [
                    "no_lien_certificate_url",
                    "electricity_bill_url",
                    "structural_load_safety_certificate_url",
                    "insurance_certificate_url",
                    "facility_layout_url",
                    "storage_temperature_url",
                    "asset_3d_view_url",
                    "asset_photo_url"
                ];
                const logPromises = urlkey.map(async (key) => {
                    if (req.body[key] !== undefined) {
                        let documentTypeUrl = Array.isArray(req.body[key]) ? JSON.stringify(req.body[key]) : req.body[key];
                        if (documentTypeUrl === '' || documentTypeUrl === undefined) {
                            documentTypeUrl = null;
                        }
                        const findExistingDocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'prepare_additional_submissions',
                                type_id: prepare.id,
                                document_type: key
                            },
                            transaction
                        });
                        if (findExistingDocs) {
                            if (documentTypeUrl) {
                                await findExistingDocs.update({
                                    document_type_url: documentTypeUrl,
                                    action: 'Updated',
                                    updated_by: cUser.id,
                                }, { transaction });
                            }
                        } else {
                            if (documentTypeUrl) {
                                await models.document_common_logs.create({
                                    user_id: cUser.id,
                                    type: 'prepare_additional_submissions',
                                    type_id: prepare.id,
                                    document_type: key,
                                    document_type_url: documentTypeUrl,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }
                        const existingActivityLog = await models.user_activity_logs.findOne({
                            where: {
                                activity_id: prepare.id,
                                activity_type: key,
                            },
                            transaction
                        });
                        const currentData = {
                            document_type_url: (req.body[key]),
                        };
                        let previousData = {};
                        if (existingActivityLog) {
                            previousData = {
                                document_type_url: existingActivityLog.current_data.document_type_url,
                            };
                            await existingActivityLog.update({
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.user_activity_logs.create({
                                user_id: cUser.id,
                                activity: 'prepare_addtional_submission',
                                activity_id: prepare.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: { document_type_url: documentTypeUrl },
                                action: 'Added',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                    }
                })
                await Promise.all(logPromises);
            });

            const kmp_ids = req.body.request_id ? findrequest.user_id : prepare.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const additional = await models.prepare_additional_submissions.findOne({ where: { prepare_id: findAdditional.prepare_id } });
                const previousData = findAdditional.dataValues;
                delete req.body.current_user;

                const currentData = additional.dataValues;

                const parseAssetUrl = (url) => {
                    if (typeof url === 'string' && url) {
                        try {
                            return JSON.parse(url);
                        } catch (e) {
                            console.error("Failed to parse asset URL:", e);
                            return null;
                        }
                    }
                    return null;
                };

                if (previousData.asset_3d_view_url) {
                    previousData.asset_3d_view_url = parseAssetUrl(previousData.asset_3d_view_url);
                }

                if (previousData.asset_photo_url) {
                    previousData.asset_photo_url = parseAssetUrl(previousData.asset_photo_url);
                }

                if (currentData.asset_3d_view_url) {
                    currentData.asset_3d_view_url = parseAssetUrl(currentData.asset_3d_view_url);
                }

                if (currentData.asset_photo_url) {
                    currentData.asset_photo_url = parseAssetUrl(currentData.asset_photo_url);
                }

                const activityLog = {
                    user_id: prepare.user_id,
                    kmp_id: kmp_ids,
                    activity: `Prepare`,
                    activity_id: prepare.id,
                    activity_type: "prepare_addtional_submission",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };

                await models.user_activity_logs.create(activityLog, { transaction: transaction });
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
                return REST.success(res, null, 'Prepare Additional Details Updated Successfully');
            } else {
                return REST.success(res, null, 'Prepare Additional Details Updated Successfully');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            let findAdditional = await models.prepare_additional_submissions.findOne({ where: { prepare_id: req.params.perpare_id } });
            if (findAdditional == null) {
                return REST.error(res, 'Prepare Id Not Found', 404);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id,
                }
            });
            const prepare = await models.prepare_details.findOne({ where: { id: req.params.perpare_id } });
            if (prepare == null) {
                return REST.error(res, 'Prepare not found.', 404);
            }
            const prepareUid = prepare.prepare_uid;
            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_additional_submissions.update({
                    no_lien_certificate_url: req.body.no_lien_certificate_url,
                    electricity_bill_url: req.body.electricity_bill_url,
                    structural_load_safety_certificate_url: req.body.structural_load_safety_certificate_url,
                    insurance_certificate_url: req.body.insurance_certificate_url,
                    insurance_certificate_valid: req.body.insurance_certificate_valid,
                    insuring_company: req.body.insuring_company,
                    insurance_premium_amount: req.body.insurance_premium_amount,
                    insurance_third_party_stock: req.body.insurance_third_party_stock,
                    insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                    insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                    facility_layout_url: req.body.facility_layout_url,
                    storage_temperature_url: req.body.storage_temperature_url,
                    asset_3d_view_url: req.body.asset_3d_view_url,
                    asset_photo_url: req.body.asset_photo_url,
                    updated_by: cUser.id
                }, {
                    where: { prepare_id: findAdditional.prepare_id },
                    transaction: transaction
                });

                const findReciverToken = await models.User.findOne({
                    where: {
                        id: prepare.user_id
                    }
                });
                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare additional submissions request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit prepare additional submissions for ${prepareUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: prepare.user_id,
                    title: `Edit Request Completed ${prepareUid}`,
                    messages: `Your Basic Information prepare additional submissions request is now complete.`,
                    notification_type: "Perpare Management"

                }, { transaction });

                await models.prepare_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: prepare.id },
                    transaction: transaction
                });

                const urlkey = [
                    "no_lien_certificate_url",
                    "electricity_bill_url",
                    "structural_load_safety_certificate_url",
                    "insurance_certificate_url",
                    "facility_layout_url",
                    "storage_temperature_url",
                    "asset_3d_view_url",
                    "asset_photo_url"
                ];
                const logPromises = urlkey.map(async (key) => {
                    if (req.body[key] !== undefined) {
                        let documentTypeUrl = Array.isArray(req.body[key]) ? JSON.stringify(req.body[key]) : req.body[key];
                        if (documentTypeUrl === '' || documentTypeUrl === undefined) {
                            documentTypeUrl = null;
                        }
                        const findExistingDocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'prepare_additional_submissions',
                                type_id: prepare.id,
                                document_type: key
                            },
                            transaction
                        });
                        if (findExistingDocs) {
                            if (documentTypeUrl) {
                                await findExistingDocs.update({
                                    document_type_url: documentTypeUrl,
                                    action: 'Updated',
                                    updated_by: cUser.id,
                                }, { transaction });
                            }
                        } else {
                            if (documentTypeUrl) {
                                await models.document_common_logs.create({
                                    user_id: cUser.id,
                                    type: 'prepare_additional_submissions',
                                    type_id: prepare.id,
                                    document_type: key,
                                    document_type_url: documentTypeUrl,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }
                        const existingActivityLog = await models.user_activity_logs.findOne({
                            where: {
                                activity_id: prepare.id,
                                activity_type: key,
                            },
                            transaction
                        });
                        const currentData = {
                            document_type_url: (req.body[key]),
                        };
                        let previousData = {};
                        if (existingActivityLog) {
                            previousData = {
                                document_type_url: existingActivityLog.current_data.document_type_url,
                            };
                            await existingActivityLog.update({
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.user_activity_logs.create({
                                user_id: cUser.id,
                                activity: 'prepare_addtional_submission',
                                activity_id: prepare.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: { document_type_url: documentTypeUrl },
                                action: 'Added',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                    }
                })
                await Promise.all(logPromises);
            });

            const kmp_ids = req.body.request_id ? findrequest.user_id : prepare.user_id
            await models.sequelize.transaction(async (transaction) => {
                const additional = await models.prepare_additional_submissions.findOne({ where: { prepare_id: findAdditional.prepare_id } });
                const previousData = findAdditional.dataValues;
                delete req.body.current_user;
                const currentData = additional.dataValues;

                const parseAssetUrl = (url) => {
                    if (typeof url === 'string' && url) {
                        try {
                            return JSON.parse(url);
                        } catch (e) {
                            console.error("Failed to parse asset URL:", e);
                            return null;
                        }
                    }
                    return null;
                };

                if (previousData.asset_3d_view_url) {
                    previousData.asset_3d_view_url = parseAssetUrl(previousData.asset_3d_view_url);
                }

                if (previousData.asset_photo_url) {
                    previousData.asset_photo_url = parseAssetUrl(previousData.asset_photo_url);
                }

                if (currentData.asset_3d_view_url) {
                    currentData.asset_3d_view_url = parseAssetUrl(currentData.asset_3d_view_url);
                }

                if (currentData.asset_photo_url) {
                    currentData.asset_photo_url = parseAssetUrl(currentData.asset_photo_url);
                }

                const activityLog = {
                    user_id: prepare.user_id,
                    kmp_id: kmp_ids,
                    activity: `Prepare`,
                    activity_id: prepare.id,
                    activity_type: "prepare_addtional_submission",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };

                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            });
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, {
                    where: {
                        id: req.body.request_id,
                    }
                });
                return REST.success(res, null, 'Prepare Additional Details Updated Successfully');
            }
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router