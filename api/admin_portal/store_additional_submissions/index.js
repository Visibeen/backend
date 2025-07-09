const { make } = require('simple-body-validator');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const { sendPushNotification } = require('../../../utils/helper');
const { findPartnerAndKeyManager, sendNotificationPartnerAndKeyManager } = require('../../../utils/support');

/*
|----------------------------------------------------------------------------------------------------------------
|              Store Additional Submissions Apis
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
                store_id: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStores = await models.stores.findByPk(req.body.store_id);
            if (!findStores) {
                return REST.error(res, 'Store not found', 404);
            }
            const findStoreUid = findStores.store_uid
            const findRequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            });
            const kmp_ids = req.body.request_id ? findRequest.user_id : findStores.user_id;
            const findStore = await models.store_additional_submissions.findOne({
                where: { store_id: req.body.store_id }
            });
            const additional = await models.sequelize.transaction(async (transaction) => {
                if (findStore) {
                    await findStore.update({
                        store_id: req.body.store_id,
                        compliance_id: req.body.compliance_id,
                        no_lien_certificate_url: req.body.no_lien_certificate_url || findStore.no_lien_certificate_url,
                        latest_electricity_bill_url: req.body.latest_electricity_bill_url || findStore.latest_electricity_bill_url,
                        structural_safety_cerfificate_url: req.body.structural_safety_cerfificate_url || findStore.structural_safety_cerfificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url || findStore.insurance_certificate_url,
                        insurance_certificate_from: req.body.insurance_certificate_from || findStore.insurance_certificate_from,
                        insurance_certificate_till: req.body.insurance_certificate_till || findStore.insurance_certificate_till,
                        insuring_company: req.body.insuring_company || findStore.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount || findStore.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock || findStore.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage || findStore.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown || findStore.insurance_machine_breakdown,
                        plant_layout_url: req.body.plant_layout_url || findStore.plant_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url || findStore.storage_temperature_url,
                        asset_3d_url: req.body.asset_3d_url || findStore.asset_3d_url,
                        photo_of_asset_url: req.body.photo_of_asset_url || findStore.photo_of_asset_url,
                        added_by: cUser.id
                    }, { transaction });
                } else {
                    await models.store_additional_submissions.create({
                        store_id: req.body.store_id,
                        compliance_id: req.body.compliance_id,
                        no_lien_certificate_url: req.body.no_lien_certificate_url,
                        latest_electricity_bill_url: req.body.latest_electricity_bill_url,
                        structural_safety_cerfificate_url: req.body.structural_safety_cerfificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url,
                        insurance_certificate_from: req.body.insurance_certificate_from,
                        insurance_certificate_till: req.body.insurance_certificate_till,
                        insuring_company: req.body.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                        plant_layout_url: req.body.plant_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url,
                        asset_3d_url: req.body.asset_3d_url,
                        photo_of_asset_url: req.body.photo_of_asset_url,
                        added_by: cUser.id
                    }, { transaction });
                }
                const urlKeys = [
                    "no_lien_certificate_url",
                    "latest_electricity_bill_url",
                    "structural_safety_cerfificate_url",
                    "insurance_certificate_url",
                    "plant_layout_url",
                    "storage_temperature_url",
                    "asset_3d_url",
                    "photo_of_asset_url"
                ];

                const documentLogPromises = urlKeys.flatMap(async (key) => {
                    const urls = Array.isArray(req.body[key]) ? req.body[key] : [req.body[key]];
                    return Promise.all(urls.map(async (url) => {
                        if (url) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_additional_submissions',
                                type_id: findStores.id,
                                document_type: key,
                                document_type_url: url,
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                    }));
                });
                await Promise.all(documentLogPromises);
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findStores.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store additional submissions request is now complete.`)


                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStores.user_id,
                    title: `Add Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store additinal submissions request is now complete.`,
                    notification_type: "Store Management"
                }, { transaction });

                const currentData = { ...req.body };
                delete currentData.current_user;
                const jsonFields = ["asset_3d_url", "photo_of_asset_url"];
                jsonFields.forEach(field => {
                    if (typeof currentData[field] === "string") {
                        try {
                            currentData[field] = JSON.parse(currentData[field]);
                        } catch (e) {
                            currentData[field] = null;
                        }
                    }
                });
                await models.user_activity_logs.create({
                    user_id: findStores.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStores.id,
                    activity_type: "store_additional_submissions",
                    current_data: currentData,
                    action: "Added",
                    added_by: cUser.id

                }, { transaction });

                return findStore || currentData;
            });
            if (findRequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, {
                    where: {
                        id: req.body.request_id ?? null,
                    }
                });
                return REST.success(res, additional, 'Store Additional Details Created Successfully');
            } else {
                return REST.success(res, additional, 'Store Additional Details Created Successfully');
            }
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                store_id: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStores = await models.stores.findByPk(req.body.store_id);
            if (!findStores) {
                return REST.error(res, 'Store not found', 404);
            }
            const findStoreUid = findStores.store_uid
            const findRequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            });
            const kmp_ids = req.body.request_id ? findRequest.user_id : findStores.user_id;
            const findStore = await models.store_additional_submissions.findOne({
                where: { store_id: req.body.store_id }
            });
            const additional = await models.sequelize.transaction(async (transaction) => {
                if (findStore) {
                    await findStore.update({
                        store_id: req.body.store_id,
                        compliance_id: req.body.compliance_id,
                        no_lien_certificate_url: req.body.no_lien_certificate_url || findStore.no_lien_certificate_url,
                        latest_electricity_bill_url: req.body.latest_electricity_bill_url || findStore.latest_electricity_bill_url,
                        structural_safety_cerfificate_url: req.body.structural_safety_cerfificate_url || findStore.structural_safety_cerfificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url || findStore.insurance_certificate_url,
                        insurance_certificate_from: req.body.insurance_certificate_from || findStore.insurance_certificate_from,
                        insurance_certificate_till: req.body.insurance_certificate_till || findStore.insurance_certificate_till,
                        insuring_company: req.body.insuring_company || findStore.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount || findStore.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock || findStore.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage || findStore.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown || findStore.insurance_machine_breakdown,
                        plant_layout_url: req.body.plant_layout_url || findStore.plant_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url || findStore.storage_temperature_url,
                        asset_3d_url: req.body.asset_3d_url || findStore.asset_3d_url,
                        photo_of_asset_url: req.body.photo_of_asset_url || findStore.photo_of_asset_url,
                        added_by: cUser.id
                    }, { transaction });
                } else {
                    await models.store_additional_submissions.create({
                        store_id: req.body.store_id,
                        compliance_id: req.body.compliance_id,
                        no_lien_certificate_url: req.body.no_lien_certificate_url,
                        latest_electricity_bill_url: req.body.latest_electricity_bill_url,
                        structural_safety_cerfificate_url: req.body.structural_safety_cerfificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url,
                        insurance_certificate_from: req.body.insurance_certificate_from,
                        insurance_certificate_till: req.body.insurance_certificate_till,
                        insuring_company: req.body.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                        plant_layout_url: req.body.plant_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url,
                        asset_3d_url: req.body.asset_3d_url,
                        photo_of_asset_url: req.body.photo_of_asset_url,
                        added_by: cUser.id
                    }, { transaction });
                }
                const urlKeys = [
                    "no_lien_certificate_url",
                    "latest_electricity_bill_url",
                    "structural_safety_cerfificate_url",
                    "insurance_certificate_url",
                    "plant_layout_url",
                    "storage_temperature_url",
                    "asset_3d_url",
                    "photo_of_asset_url"
                ];

                const documentLogPromises = urlKeys.flatMap(async (key) => {
                    const urls = Array.isArray(req.body[key]) ? req.body[key] : [req.body[key]];
                    return Promise.all(urls.map(async (url) => {
                        if (url) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_additional_submissions',
                                type_id: findStores.id,
                                document_type: key,
                                document_type_url: url,
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                    }));
                });
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findStores.user_id
                    }
                })
                // Find partnerAndKeyManager
                const partnerAndKeyManager = await findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store additional submissions request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store additional submissions for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStores.user_id,
                    title: `Add Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store additinal submissions request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await Promise.all(documentLogPromises);
                const currentData = { ...req.body };
                delete currentData.current_user;
                const jsonFields = ["asset_3d_url", "photo_of_asset_url"];
                jsonFields.forEach(field => {
                    if (typeof currentData[field] === "string") {
                        try {
                            currentData[field] = JSON.parse(currentData[field]);
                        } catch (e) {
                            currentData[field] = null;
                        }
                    }
                });
                await models.user_activity_logs.create({
                    user_id: findStores.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStores.id,
                    activity_type: "store_additional_submissions",
                    current_data: currentData,
                    action: "Added",
                    added_by: cUser.id

                }, { transaction });

                return findStore || currentData;
            });
            if (findRequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, {
                    where: {
                        id: req.body.request_id ?? null,
                    }
                });
                return REST.success(res, additional, 'Store Additional Details Created Successfully');
            } else {
                return REST.success(res, additional, 'Store Additional Details Created Successfully');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                store_id: "required|string",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStores = await models.stores.findByPk(req.body.store_id);
            if (!findStores) {
                return REST.error(res, 'Store not found', 404);
            }
            const findStoreUid = findStores.store_uid
            const findRequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id,
                }
            });
            const kmp_ids = req.body.request_id ? findRequest.user_id : findStores.user_id;
            const findStore = await models.store_additional_submissions.findOne({
                where: { store_id: req.body.store_id }
            });
            const additional = await models.sequelize.transaction(async (transaction) => {
                if (findStore) {
                    await findStore.update({
                        store_id: req.body.store_id,
                        compliance_id: req.body.compliance_id,
                        no_lien_certificate_url: req.body.no_lien_certificate_url || findStore.no_lien_certificate_url,
                        latest_electricity_bill_url: req.body.latest_electricity_bill_url || findStore.latest_electricity_bill_url,
                        structural_safety_cerfificate_url: req.body.structural_safety_cerfificate_url || findStore.structural_safety_cerfificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url || findStore.insurance_certificate_url,
                        insurance_certificate_from: req.body.insurance_certificate_from || findStore.insurance_certificate_from,
                        insurance_certificate_till: req.body.insurance_certificate_till || findStore.insurance_certificate_till,
                        insuring_company: req.body.insuring_company || findStore.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount || findStore.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock || findStore.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage || findStore.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown || findStore.insurance_machine_breakdown,
                        plant_layout_url: req.body.plant_layout_url || findStore.plant_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url || findStore.storage_temperature_url,
                        asset_3d_url: req.body.asset_3d_url || findStore.asset_3d_url,
                        photo_of_asset_url: req.body.photo_of_asset_url || findStore.photo_of_asset_url,
                        added_by: cUser.id
                    }, { transaction });
                } else {
                    await models.store_additional_submissions.create({
                        store_id: req.body.store_id,
                        compliance_id: req.body.compliance_id,
                        no_lien_certificate_url: req.body.no_lien_certificate_url,
                        latest_electricity_bill_url: req.body.latest_electricity_bill_url,
                        structural_safety_cerfificate_url: req.body.structural_safety_cerfificate_url,
                        insurance_certificate_url: req.body.insurance_certificate_url,
                        insurance_certificate_from: req.body.insurance_certificate_from,
                        insurance_certificate_till: req.body.insurance_certificate_till,
                        insuring_company: req.body.insuring_company,
                        insurance_premium_amount: req.body.insurance_premium_amount,
                        insurance_third_party_stock: req.body.insurance_third_party_stock,
                        insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                        insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                        plant_layout_url: req.body.plant_layout_url,
                        storage_temperature_url: req.body.storage_temperature_url,
                        asset_3d_url: req.body.asset_3d_url,
                        photo_of_asset_url: req.body.photo_of_asset_url,
                        added_by: cUser.id
                    }, { transaction });
                }
                const urlKeys = [
                    "no_lien_certificate_url",
                    "latest_electricity_bill_url",
                    "structural_safety_cerfificate_url",
                    "insurance_certificate_url",
                    "plant_layout_url",
                    "storage_temperature_url",
                    "asset_3d_url",
                    "photo_of_asset_url"
                ];

                const documentLogPromises = urlKeys.flatMap(async (key) => {
                    const urls = Array.isArray(req.body[key]) ? req.body[key] : [req.body[key]];
                    return Promise.all(urls.map(async (url) => {
                        if (url) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_additional_submissions',
                                type_id: findStores.id,
                                document_type: key,
                                document_type_url: url,
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                    }));
                });
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findStores.user_id
                    }
                })
                // Find partnerAndKeyManager
                const partnerAndKeyManager = await findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store additional submissions request is now complete.`)


                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has added store additional submissions for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findStores.user_id,
                    title: `Add Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store additinal submissions request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await Promise.all(documentLogPromises);
                const currentData = { ...req.body };
                delete currentData.current_user;
                const jsonFields = ["asset_3d_url", "photo_of_asset_url"];
                jsonFields.forEach(field => {
                    if (typeof currentData[field] === "string") {
                        try {
                            currentData[field] = JSON.parse(currentData[field]);
                        } catch (e) {
                            currentData[field] = null;
                        }
                    }
                });
                await models.user_activity_logs.create({
                    user_id: findStores.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Store',
                    activity_id: findStores.id,
                    activity_type: "store_additional_submissions",
                    current_data: currentData,
                    action: "Added",
                    added_by: cUser.id

                }, { transaction });
                return findStore || currentData;
            });
            if (findRequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, {
                    where: {
                        id: req.body.request_id,
                    }
                });
            }
            return REST.success(res, additional, 'Store Additional Details Created Successfully');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.put('/additionalUpdate/:store_id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        })
        if (cUser.role_id == 3) {
            let findStore = await models.store_additional_submissions.findOne({
                where: { store_id: req.params.store_id }
            });
            if (findStore == null) {
                return REST.error(res, 'Store ID Not Found', 404);
            }
            const store = await models.stores.findOne({ where: { id: req.params.store_id } });
            if (store == null) {
                return REST.error(res, 'Store not found.', 404);
            }
            const findStoreUid = store.store_uid;
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            });
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_additional_submissions.update({
                    no_lien_certificate_url: req.body.no_lien_certificate_url,
                    latest_electricity_bill_url: req.body.latest_electricity_bill_url,
                    structural_safety_cerfificate_url: req.body.structural_safety_cerfificate_url,
                    insurance_certificate_url: req.body.insurance_certificate_url,
                    insurance_certificate_from: req.body.insurance_certificate_from,
                    insurance_certificate_till: req.body.insurance_certificate_till,
                    insuring_company: req.body.insuring_company,
                    insurance_premium_amount: req.body.insurance_premium_amount,
                    insurance_third_party_stock: req.body.insurance_third_party_stock,
                    insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                    insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                    plant_layout_url: req.body.plant_layout_url,
                    storage_temperature_url: req.body.storage_temperature_url,
                    asset_3d_url: req.body.asset_3d_url,
                    photo_of_asset_url: req.body.photo_of_asset_url,
                    updated_by: cUser.id
                }, {
                    where: { store_id: findStore.store_id },
                    transaction: transaction
                });

                const findReciverToken = await models.User.findOne({
                    where: {
                        id: store.user_id
                    }
                });
                // Find partnerAndKeyManager
                const partnerAndKeyManager = await findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store additional submissions request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store additional submissions request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: store.id },
                    transaction: transaction
                });

                const urlkey = [
                    "no_lien_certificate_url",
                    "latest_electricity_bill_url",
                    "structural_safety_cerfificate_url",
                    "insurance_certificate_url",
                    "plant_layout_url",
                    "storage_temperature_url",
                    "asset_3d_url",
                    "photo_of_asset_url"
                ];

                const logPromises = urlkey.map(async (key) => {
                    if (req.body[key] !== undefined) {
                        let documentTypeUrl = Array.isArray(req.body[key]) ? JSON.stringify(req.body[key]) : req.body[key];
                        if (documentTypeUrl === '' || documentTypeUrl === undefined) {
                            documentTypeUrl = null;
                        }
                        const findExistingDocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'store_additional_submissions',
                                type_id: store.id,
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
                                    type: 'store_additional_submissions',
                                    type_id: store.id,
                                    document_type: key,
                                    document_type_url: documentTypeUrl,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }
                        const existingActivityLog = await models.user_activity_logs.findOne({
                            where: {
                                activity_id: store.id,
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
                                current_data: { document_type_url: documentTypeUrl },
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.user_activity_logs.create({
                                user_id: cUser.id,
                                activity: 'store_additional_documents',
                                activity_id: store.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: { document_type_url: documentTypeUrl },
                                action: 'Added',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                    }
                });
                await Promise.all(logPromises);
            });
            await models.sequelize.transaction(async (transaction) => {
                const additional = await models.store_additional_submissions.findOne({ where: { store_id: findStore.store_id } });
                const previousData = findStore.dataValues;
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
                if (previousData.asset_3d_url) {
                    previousData.asset_3d_url = parseAssetUrl(previousData.asset_3d_url);
                }
                if (previousData.photo_of_asset_url) {
                    previousData.photo_of_asset_url = parseAssetUrl(previousData.photo_of_asset_url);
                }
                if (currentData.asset_3d_url) {
                    currentData.asset_3d_url = parseAssetUrl(currentData.asset_3d_url);
                }
                if (currentData.photo_of_asset_url) {
                    currentData.photo_of_asset_url = parseAssetUrl(currentData.photo_of_asset_url);
                }
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_additional_submissions",
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
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    });
                return REST.success(res, null, 'Store Additional Details Updated Successfully');
            } else {
                return REST.success(res, null, 'Store Additional Details Updated Successfully');
            }
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            let findStore = await models.store_additional_submissions.findOne({
                where: { store_id: req.params.store_id }
            });
            if (findStore == null) {
                return REST.error(res, 'Store ID Not Found', 404);
            }
            const store = await models.stores.findOne({ where: { id: req.params.store_id } });
            if (store == null) {
                return REST.error(res, 'Store not found.', 404);
            }
            const findStoreUid = store.store_uid;
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            });
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_additional_submissions.update({
                    no_lien_certificate_url: req.body.no_lien_certificate_url,
                    latest_electricity_bill_url: req.body.latest_electricity_bill_url,
                    structural_safety_cerfificate_url: req.body.structural_safety_cerfificate_url,
                    insurance_certificate_url: req.body.insurance_certificate_url,
                    insurance_certificate_from: req.body.insurance_certificate_from,
                    insurance_certificate_till: req.body.insurance_certificate_till,
                    insuring_company: req.body.insuring_company,
                    insurance_premium_amount: req.body.insurance_premium_amount,
                    insurance_third_party_stock: req.body.insurance_third_party_stock,
                    insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                    insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                    plant_layout_url: req.body.plant_layout_url,
                    storage_temperature_url: req.body.storage_temperature_url,
                    asset_3d_url: req.body.asset_3d_url,
                    photo_of_asset_url: req.body.photo_of_asset_url,
                    updated_by: cUser.id
                }, {
                    where: { store_id: findStore.store_id },
                    transaction: transaction
                });

                const findReciverToken = await models.User.findOne({
                    where: {
                        id: store.user_id
                    }
                });
                // Find partnerAndKeyManager
                const partnerAndKeyManager = await findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store additional submissions request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store additional submissions for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store additional submissions request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: store.id },
                    transaction: transaction
                });

                const urlkey = [
                    "no_lien_certificate_url",
                    "latest_electricity_bill_url",
                    "structural_safety_cerfificate_url",
                    "insurance_certificate_url",
                    "plant_layout_url",
                    "storage_temperature_url",
                    "asset_3d_url",
                    "photo_of_asset_url"
                ];

                const logPromises = urlkey.map(async (key) => {
                    if (req.body[key] !== undefined) {
                        let documentTypeUrl = Array.isArray(req.body[key]) ? JSON.stringify(req.body[key]) : req.body[key];
                        if (documentTypeUrl === '' || documentTypeUrl === undefined) {
                            documentTypeUrl = null;
                        }
                        const findExistingDocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'store_additional_submissions',
                                type_id: store.id,
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
                                    type: 'store_additional_submissions',
                                    type_id: store.id,
                                    document_type: key,
                                    document_type_url: documentTypeUrl,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }
                        const existingActivityLog = await models.user_activity_logs.findOne({
                            where: {
                                activity_id: store.id,
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
                                current_data: { document_type_url: documentTypeUrl },
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.user_activity_logs.create({
                                user_id: cUser.id,
                                activity: 'store_additional_documents',
                                activity_id: store.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: { document_type_url: documentTypeUrl },
                                action: 'Added',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                    }
                });
                await Promise.all(logPromises);
            });
            await models.sequelize.transaction(async (transaction) => {
                const additional = await models.store_additional_submissions.findOne({ where: { store_id: findStore.store_id } });
                const previousData = findStore.dataValues;
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
                if (previousData.asset_3d_url) {
                    previousData.asset_3d_url = parseAssetUrl(previousData.asset_3d_url);
                }
                if (previousData.photo_of_asset_url) {
                    previousData.photo_of_asset_url = parseAssetUrl(previousData.photo_of_asset_url);
                }
                if (currentData.asset_3d_url) {
                    currentData.asset_3d_url = parseAssetUrl(currentData.asset_3d_url);
                }
                if (currentData.photo_of_asset_url) {
                    currentData.photo_of_asset_url = parseAssetUrl(currentData.photo_of_asset_url);
                }
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_additional_submissions",
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
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    });
                return REST.success(res, null, 'Store Additional Details Updated Successfully');
            } else {
                return REST.success(res, null, 'Store Additional Details Updated Successfully');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            let findStore = await models.store_additional_submissions.findOne({
                where: { store_id: req.params.store_id }
            });
            if (findStore == null) {
                return REST.error(res, 'Store ID Not Found', 404);
            }
            const store = await models.stores.findOne({ where: { id: req.params.store_id } });
            if (store == null) {
                return REST.error(res, 'Store not found.', 404);
            }
            const findStoreUid = store.store_uid;
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id,
                }
            });
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_additional_submissions.update({
                    no_lien_certificate_url: req.body.no_lien_certificate_url,
                    latest_electricity_bill_url: req.body.latest_electricity_bill_url,
                    structural_safety_cerfificate_url: req.body.structural_safety_cerfificate_url,
                    insurance_certificate_url: req.body.insurance_certificate_url,
                    insurance_certificate_from: req.body.insurance_certificate_from,
                    insurance_certificate_till: req.body.insurance_certificate_till,
                    insuring_company: req.body.insuring_company,
                    insurance_premium_amount: req.body.insurance_premium_amount,
                    insurance_third_party_stock: req.body.insurance_third_party_stock,
                    insurance_ammonia_leakage: req.body.insurance_ammonia_leakage,
                    insurance_machine_breakdown: req.body.insurance_machine_breakdown,
                    plant_layout_url: req.body.plant_layout_url,
                    storage_temperature_url: req.body.storage_temperature_url,
                    asset_3d_url: req.body.asset_3d_url,
                    photo_of_asset_url: req.body.photo_of_asset_url,
                    updated_by: cUser.id
                }, {
                    where: { store_id: findStore.store_id },
                    transaction: transaction
                });

                const findReciverToken = await models.User.findOne({
                    where: {
                        id: store.user_id
                    }
                });
                // Find partnerAndKeyManager
                const partnerAndKeyManager = await findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store additional submissions request is now complete.`)
                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit store additional submissions for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store additional submissions request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: store.id },
                    transaction: transaction
                });

                const urlkey = [
                    "no_lien_certificate_url",
                    "latest_electricity_bill_url",
                    "structural_safety_cerfificate_url",
                    "insurance_certificate_url",
                    "plant_layout_url",
                    "storage_temperature_url",
                    "asset_3d_url",
                    "photo_of_asset_url"
                ];

                const logPromises = urlkey.map(async (key) => {
                    if (req.body[key] !== undefined) {
                        let documentTypeUrl = Array.isArray(req.body[key]) ? JSON.stringify(req.body[key]) : req.body[key];
                        if (documentTypeUrl === '' || documentTypeUrl === undefined) {
                            documentTypeUrl = null;
                        }
                        const findExistingDocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'store_additional_submissions',
                                type_id: store.id,
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
                                    type: 'store_additional_submissions',
                                    type_id: store.id,
                                    document_type: key,
                                    document_type_url: documentTypeUrl,
                                    action: 'Added_by',
                                    added_by: cUser.id,
                                }, { transaction });
                            }
                        }
                        const existingActivityLog = await models.user_activity_logs.findOne({
                            where: {
                                activity_id: store.id,
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
                                current_data: { document_type_url: documentTypeUrl },
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.user_activity_logs.create({
                                user_id: cUser.id,
                                activity: 'store_additional_documents',
                                activity_id: store.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: { document_type_url: documentTypeUrl },
                                action: 'Added',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                    }
                });
                await Promise.all(logPromises);
            });
            await models.sequelize.transaction(async (transaction) => {
                const additional = await models.store_additional_submissions.findOne({ where: { store_id: findStore.store_id } });
                const previousData = findStore.dataValues;
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
                if (previousData.asset_3d_url) {
                    previousData.asset_3d_url = parseAssetUrl(previousData.asset_3d_url);
                }
                if (previousData.photo_of_asset_url) {
                    previousData.photo_of_asset_url = parseAssetUrl(previousData.photo_of_asset_url);
                }
                if (currentData.asset_3d_url) {
                    currentData.asset_3d_url = parseAssetUrl(currentData.asset_3d_url);
                }
                if (currentData.photo_of_asset_url) {
                    currentData.photo_of_asset_url = parseAssetUrl(currentData.photo_of_asset_url);
                }
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_additional_submissions",
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
                },
                    {
                        where: {
                            id: req.body.request_id,
                        }
                    });
            }
            return REST.success(res, null, 'Store Additional Details Updated Successfully');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});


module.exports = router;
