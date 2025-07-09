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
|              Store Compliances Details Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/create_compliance', async function (req, res) {
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
                store_id: 'required|string',
                request_id: "integer",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStores = await models.stores.findByPk(req.body.store_id)
            if (!findStores) {
                return REST.error(res, 'store not found', 404);
            }
            const findStoreUid = findStores.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStores.user_id;
            const findStore = await models.store_compliance_details.findOne({
                where: { store_id: req.body.store_id }
            });
            let storeCompliance;
            if (findStore) {
                storeCompliance = await models.sequelize.transaction(async (transaction) => {
                    await findStore.update({
                        store_id: req.body.store_id,
                        fsssai_license_url: req.body.fsssai_license_url || findStore.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no || findStore.fsssai_license_no,
                        fsssai_from: req.body.fsssai_from || findStore.fsssai_from,
                        fssai_till: req.body.fssai_till || findStore.fssai_till,
                        iso_certificate_url: req.body.iso_certificate_url || findStore.iso_certificate_url,
                        certificate_iso_no: req.body.certificate_iso_no || findStore.certificate_iso_no,
                        certificate_agency: req.body.certificate_agency || findStore.certificate_agency,
                        certificate_iso_from: req.body.certificate_iso_from || findStore.certificate_iso_from,
                        certificate_iso_till: req.body.certificate_iso_till || findStore.certificate_iso_till,
                        haccp_url: req.body.haccp_url || findStore.haccp_url,
                        post_control_agency_from: req.body.post_control_agency_from || findStore.post_control_agency_from,
                        post_control_agency_till: req.body.post_control_agency_till || findStore.post_control_agency_till,
                        post_control_url: req.body.post_control_url || findStore.post_control_url,
                        brc_audit_url: req.body.brc_audit_url || findStore.brc_audit_url,
                        brc_license_no: req.body.brc_license_no || findStore.brc_license_no,
                        brc_till: req.body.brc_till || findStore.brc_till,
                        brc_from: req.body.brc_from || findStore.brc_from,
                        fire_safety_noc_url: req.body.fire_safety_noc_url || findStore.fire_safety_noc_url,
                        fire_safety_from: req.body.fire_safety_from || findStore.fire_safety_from,
                        fire_safety_license_no: req.body.fire_safety_license_no || findStore.fire_safety_license_no,
                        fire_safety_till: req.body.fire_safety_till || findStore.fire_safety_till,
                        pollution_noc_url: req.body.pollution_noc_url || findStore.pollution_noc_url,
                        pollution_license_no: req.body.pollution_license_no || findStore.pollution_license_no,
                        pollution_from: req.body.pollution_from || findStore.pollution_from,
                        pollution_till: req.body.pollution_till || findStore.pollution_till,
                        mcd_license_url: req.body.mcd_license_url || findStore.mcd_license_url,
                        mcd_license_from: req.body.mcd_license_from || findStore.mcd_license_from,
                        mcd_license_till: req.body.mcd_license_till || findStore.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url || findStore.up_cold_storage_license_url,
                        up_cold_storage_from: req.body.up_cold_storage_from || findStore.up_cold_storage_from,
                        up_code_storage_till: req.body.up_code_storage_till || findStore.up_code_storage_till,
                        factory_license_url: req.body.factory_license_url || findStore.factory_license_url,
                        factory_license_number: req.body.factory_license_number || findStore.factory_license_number,
                        factory_from: req.body.factory_from || findStore.factory_from,
                        factory_till: req.body.factory_till || findStore.factory_till,
                        panchayat_noc_url: req.body.panchayat_noc_url || findStore.panchayat_noc_url,
                        panchayat_noc_from: req.body.panchayat_noc_from || findStore.panchayat_noc_from,
                        panchayat_noc_till: req.body.panchayat_noc_till || findStore.panchayat_noc_till,
                        added_by: cUser.id

                    }, { transaction });
                    const urlKeys = [
                        'fsssai_license_url',
                        'iso_certificate_url',
                        'haccp_url',
                        'post_control_url',
                        'brc_audit_url',
                        'fire_safety_noc_url',
                        'pollution_noc_url',
                        'mcd_license_url',
                        'up_cold_storage_license_url',
                        'factory_license_url',
                        'panchayat_noc_url'
                    ];

                    const log = urlKeys.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_compliance_details',
                                type_id: findStores.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'store_compliance_documents',
                            activity_id: findStores.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
                    });

                    await Promise.all(log);
                    const currentData = req.body;
                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findStores.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Store',
                        activity_id: findStores.id,
                        activity_type: "store_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    return findStore;
                });
                if (findrequest) {
                    await models.request_for_store.update({
                        status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED
                    },
                        {
                            where: {
                                id: req.body.request_id ?? null,
                            }
                        })
                }
            } else {
                storeCompliance = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        store_id: req.body.store_id,
                        fsssai_license_url: req.body.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no,
                        fsssai_from: req.body.fsssai_from,
                        fssai_till: req.body.fssai_till,
                        iso_certificate_url: req.body.iso_certificate_url,
                        certificate_iso_no: req.body.certificate_iso_no,
                        certificate_agency: req.body.certificate_agency,
                        certificate_iso_from: req.body.certificate_iso_from,
                        certificate_iso_till: req.body.certificate_iso_till,
                        haccp_url: req.body.haccp_url,
                        post_control_agency_from: req.body.post_control_agency_from,
                        post_control_agency_till: req.body.post_control_agency_till,
                        post_control_url: req.body.post_control_url,
                        brc_audit_url: req.body.brc_audit_url,
                        brc_license_no: req.body.brc_license_no,
                        brc_from: req.body.brc_from,
                        brc_till: req.body.brc_till,
                        fire_safety_noc_url: req.body.fire_safety_noc_url,
                        fire_safety_from: req.body.fire_safety_from,
                        fire_safety_till: req.body.fire_safety_till,
                        fire_safety_license_no: req.body.fire_safety_license_no,
                        pollution_noc_url: req.body.pollution_noc_url,
                        pollution_license_no: req.body.pollution_license_no,
                        pollution_from: req.body.pollution_from,
                        pollution_till: req.body.pollution_till,
                        mcd_license_url: req.body.mcd_license_url,
                        mcd_license_valid: req.body.mcd_license_valid,
                        mcd_license_till: req.body.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                        up_cold_storage_from: req.body.up_cold_storage_from,
                        up_code_storage_till: req.body.up_code_storage_till,
                        factory_license_url: req.body.factory_license_url,
                        factory_license_number: req.body.factory_license_number,
                        factory_from: req.body.factory_from,
                        factory_till: req.body.factory_till,
                        panchayat_noc_url: req.body.panchayat_noc_url,
                        panchayat_noc_from: req.body.panchayat_noc_from,
                        panchayat_noc_till: req.body.panchayat_noc_till,
                        added_by: cUser.id
                    };
                    const createCompliance = await models.store_compliance_details.create(data, { transaction });
                    const urlKeys = [
                        'fsssai_license_url',
                        'iso_certificate_url',
                        'haccp_url',
                        'post_control_url',
                        'brc_audit_url',
                        'fire_safety_noc_url',
                        'pollution_noc_url',
                        'mcd_license_url',
                        'up_cold_storage_license_url',
                        'factory_license_url',
                        'panchayat_noc_url'
                    ];

                    const log = urlKeys.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_compliance_details',
                                type_id: findStores.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'store_compliance_documents',
                            activity_id: findStores.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
                    });

                    await Promise.all(log);
                    const currentData = req.body;
                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findStores.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Store',
                        activity_id: findStores.id,
                        activity_type: "stores_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id
                    });

                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findStores.user_id
                        }
                    })

                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store compliance request is now complete.`)

                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findStores.user_id,
                        title: `Add Request Completed ${findStoreUid}`,
                        messages: `Your Basic Information store compliance request is now complete.`,
                        notification_type: "Store Management"

                    }, { transaction });

                    return createCompliance;
                });
            }
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                store_id: 'required|string',
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStores = await models.stores.findByPk(req.body.store_id)
            if (!findStores) {
                return REST.error(res, 'Prepare details not found', 404);
            }
            const findStoreUid = findStores.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStores.user_id;
            const findStore = await models.store_compliance_details.findOne({
                where: { store_id: req.body.store_id }
            });
            let storeCompliance;
            if (findStore) {
                storeCompliance = await models.sequelize.transaction(async (transaction) => {
                    await findStore.update({
                        store_id: req.body.store_id,
                        fsssai_license_url: req.body.fsssai_license_url || findStore.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no || findStore.fsssai_license_no,
                        fsssai_from: req.body.fsssai_from || findStore.fsssai_from,
                        fssai_till: req.body.fssai_till || findStore.fssai_till,
                        iso_certificate_url: req.body.iso_certificate_url || findStore.iso_certificate_url,
                        certificate_iso_no: req.body.certificate_iso_no || findStore.certificate_iso_no,
                        certificate_agency: req.body.certificate_agency || findStore.certificate_agency,
                        certificate_iso_from: req.body.certificate_iso_from || findStore.certificate_iso_from,
                        certificate_iso_till: req.body.certificate_iso_till || findStore.certificate_iso_till,
                        haccp_url: req.body.haccp_url || findStore.haccp_url,
                        post_control_agency_from: req.body.post_control_agency_from || findStore.post_control_agency_from,
                        post_control_agency_till: req.body.post_control_agency_till || findStore.post_control_agency_till,
                        post_control_url: req.body.post_control_url || findStore.post_control_url,
                        brc_audit_url: req.body.brc_audit_url || findStore.brc_audit_url,
                        brc_license_no: req.body.brc_license_no || findStore.brc_license_no,
                        brc_till: req.body.brc_till || findStore.brc_till,
                        brc_from: req.body.brc_from || findStore.brc_from,
                        fire_safety_noc_url: req.body.fire_safety_noc_url || findStore.fire_safety_noc_url,
                        fire_safety_from: req.body.fire_safety_from || findStore.fire_safety_from,
                        fire_safety_license_no: req.body.fire_safety_license_no || findStore.fire_safety_license_no,
                        fire_safety_till: req.body.fire_safety_till || findStore.fire_safety_till,
                        pollution_noc_url: req.body.pollution_noc_url || findStore.pollution_noc_url,
                        pollution_license_no: req.body.pollution_license_no || findStore.pollution_license_no,
                        pollution_from: req.body.pollution_from || findStore.pollution_from,
                        pollution_till: req.body.pollution_till || findStore.pollution_till,
                        mcd_license_url: req.body.mcd_license_url || findStore.mcd_license_url,
                        mcd_license_from: req.body.mcd_license_from || findStore.mcd_license_from,
                        mcd_license_till: req.body.mcd_license_till || findStore.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url || findStore.up_cold_storage_license_url,
                        up_cold_storage_from: req.body.up_cold_storage_from || findStore.up_cold_storage_from,
                        up_code_storage_till: req.body.up_code_storage_till || findStore.up_code_storage_till,
                        factory_license_url: req.body.factory_license_url || findStore.factory_license_url,
                        factory_license_number: req.body.factory_license_number || findStore.factory_license_number,
                        factory_from: req.body.factory_from || findStore.factory_from,
                        factory_till: req.body.factory_till || findStore.factory_till,
                        panchayat_noc_url: req.body.panchayat_noc_url || findStore.panchayat_noc_url,
                        panchayat_noc_from: req.body.panchayat_noc_from || findStore.panchayat_noc_from,
                        panchayat_noc_till: req.body.panchayat_noc_till || findStore.panchayat_noc_till,
                        added_by: cUser.id

                    }, { transaction });
                    const urlKeys = [
                        'fsssai_license_url',
                        'iso_certificate_url',
                        'haccp_url',
                        'post_control_url',
                        'brc_audit_url',
                        'fire_safety_noc_url',
                        'pollution_noc_url',
                        'mcd_license_url',
                        'up_cold_storage_license_url',
                        'factory_license_url',
                        'panchayat_noc_url'
                    ];

                    const log = urlKeys.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_compliance_details',
                                type_id: findStores.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'store_compliance_documents',
                            activity_id: findStores.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
                    });
                    await Promise.all(log);
                    const currentData = req.body;
                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findStores.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Store',
                        activity_id: findStores.id,
                        activity_type: "store_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    return findStore;
                });
                if (findrequest) {
                    await models.request_for_store.update({
                        status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED
                    },
                        {
                            where: {
                                id: req.body.request_id ?? null,
                            }
                        })
                }
            } else {
                storeCompliance = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        store_id: req.body.store_id,
                        fsssai_license_url: req.body.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no,
                        fsssai_from: req.body.fsssai_from,
                        fssai_till: req.body.fssai_till,
                        iso_certificate_url: req.body.iso_certificate_url,
                        certificate_iso_no: req.body.certificate_iso_no,
                        certificate_agency: req.body.certificate_agency,
                        certificate_iso_from: req.body.certificate_iso_from,
                        certificate_iso_till: req.body.certificate_iso_till,
                        haccp_url: req.body.haccp_url,
                        post_control_agency_from: req.body.post_control_agency_from,
                        post_control_agency_till: req.body.post_control_agency_till,
                        post_control_url: req.body.post_control_url,
                        brc_audit_url: req.body.brc_audit_url,
                        brc_license_no: req.body.brc_license_no,
                        brc_from: req.body.brc_from,
                        brc_till: req.body.brc_till,
                        fire_safety_noc_url: req.body.fire_safety_noc_url,
                        fire_safety_from: req.body.fire_safety_from,
                        fire_safety_till: req.body.fire_safety_till,
                        fire_safety_license_no: req.body.fire_safety_license_no,
                        pollution_noc_url: req.body.pollution_noc_url,
                        pollution_license_no: req.body.pollution_license_no,
                        pollution_from: req.body.pollution_from,
                        pollution_till: req.body.pollution_till,
                        mcd_license_url: req.body.mcd_license_url,
                        mcd_license_valid: req.body.mcd_license_valid,
                        mcd_license_till: req.body.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                        up_cold_storage_from: req.body.up_cold_storage_from,
                        up_code_storage_till: req.body.up_code_storage_till,
                        factory_license_url: req.body.factory_license_url,
                        factory_license_number: req.body.factory_license_number,
                        factory_from: req.body.factory_from,
                        factory_till: req.body.factory_till,
                        panchayat_noc_url: req.body.panchayat_noc_url,
                        panchayat_noc_from: req.body.panchayat_noc_from,
                        panchayat_noc_till: req.body.panchayat_noc_till,
                        added_by: cUser.id
                    };
                    const createCompliance = await models.store_compliance_details.create(data, { transaction });
                    const urlKeys = [
                        'fsssai_license_url',
                        'iso_certificate_url',
                        'haccp_url',
                        'post_control_url',
                        'brc_audit_url',
                        'fire_safety_noc_url',
                        'pollution_noc_url',
                        'mcd_license_url',
                        'up_cold_storage_license_url',
                        'factory_license_url',
                        'panchayat_noc_url'
                    ];

                    const log = urlKeys.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_compliance_details',
                                type_id: findStores.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'store_compliance_documents',
                            activity_id: findStores.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
                    });

                    await Promise.all(log);
                    const currentData = req.body;
                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findStores.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Store',
                        activity_id: findStores.id,
                        activity_type: "stores_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id


                    });

                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findStores.user_id
                        }
                    })

                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store compliance request is now complete.`)

                    const findPartnerUid = findReciverToken.user_uid
                    await models.manager_logs.create({
                        user_id: cUser.id,
                        activity: "Add Request",
                        title: "Request",
                        details: `has added store compliance  for ${findStoreUid} in ${findPartnerUid}.`
                    });
                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findStores.user_id,
                        title: `Add Request Completed ${findStoreUid}`,
                        messages: `Your Basic Information store compliance request is now complete.`,
                        notification_type: "Store Management"

                    }, { transaction });

                    return createCompliance;
                });
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                store_id: 'required|string',
                request_id: "integer",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findStores = await models.stores.findByPk(req.body.store_id)
            if (!findStores) {
                return REST.error(res, 'Prepare details not found', 404);
            }
            const findStoreUid = findStores.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : findStores.user_id;
            const findStore = await models.store_compliance_details.findOne({
                where: { store_id: req.body.store_id }
            });
            let storeCompliance;
            if (findStore) {
                storeCompliance = await models.sequelize.transaction(async (transaction) => {
                    await findStore.update({
                        store_id: req.body.store_id,
                        fsssai_license_url: req.body.fsssai_license_url || findStore.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no || findStore.fsssai_license_no,
                        fsssai_from: req.body.fsssai_from || findStore.fsssai_from,
                        fssai_till: req.body.fssai_till || findStore.fssai_till,
                        iso_certificate_url: req.body.iso_certificate_url || findStore.iso_certificate_url,
                        certificate_iso_no: req.body.certificate_iso_no || findStore.certificate_iso_no,
                        certificate_agency: req.body.certificate_agency || findStore.certificate_agency,
                        certificate_iso_from: req.body.certificate_iso_from || findStore.certificate_iso_from,
                        certificate_iso_till: req.body.certificate_iso_till || findStore.certificate_iso_till,
                        haccp_url: req.body.haccp_url || findStore.haccp_url,
                        post_control_agency_from: req.body.post_control_agency_from || findStore.post_control_agency_from,
                        post_control_agency_till: req.body.post_control_agency_till || findStore.post_control_agency_till,
                        post_control_url: req.body.post_control_url || findStore.post_control_url,
                        brc_audit_url: req.body.brc_audit_url || findStore.brc_audit_url,
                        brc_license_no: req.body.brc_license_no || findStore.brc_license_no,
                        brc_till: req.body.brc_till || findStore.brc_till,
                        brc_from: req.body.brc_from || findStore.brc_from,
                        fire_safety_noc_url: req.body.fire_safety_noc_url || findStore.fire_safety_noc_url,
                        fire_safety_from: req.body.fire_safety_from || findStore.fire_safety_from,
                        fire_safety_license_no: req.body.fire_safety_license_no || findStore.fire_safety_license_no,
                        fire_safety_till: req.body.fire_safety_till || findStore.fire_safety_till,
                        pollution_noc_url: req.body.pollution_noc_url || findStore.pollution_noc_url,
                        pollution_license_no: req.body.pollution_license_no || findStore.pollution_license_no,
                        pollution_from: req.body.pollution_from || findStore.pollution_from,
                        pollution_till: req.body.pollution_till || findStore.pollution_till,
                        mcd_license_url: req.body.mcd_license_url || findStore.mcd_license_url,
                        mcd_license_from: req.body.mcd_license_from || findStore.mcd_license_from,
                        mcd_license_till: req.body.mcd_license_till || findStore.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url || findStore.up_cold_storage_license_url,
                        up_cold_storage_from: req.body.up_cold_storage_from || findStore.up_cold_storage_from,
                        up_code_storage_till: req.body.up_code_storage_till || findStore.up_code_storage_till,
                        factory_license_url: req.body.factory_license_url || findStore.factory_license_url,
                        factory_license_number: req.body.factory_license_number || findStore.factory_license_number,
                        factory_from: req.body.factory_from || findStore.factory_from,
                        factory_till: req.body.factory_till || findStore.factory_till,
                        panchayat_noc_url: req.body.panchayat_noc_url || findStore.panchayat_noc_url,
                        panchayat_noc_from: req.body.panchayat_noc_from || findStore.panchayat_noc_from,
                        panchayat_noc_till: req.body.panchayat_noc_till || findStore.panchayat_noc_till,
                        added_by: cUser.id

                    }, { transaction });
                    const urlKeys = [
                        'fsssai_license_url',
                        'iso_certificate_url',
                        'haccp_url',
                        'post_control_url',
                        'brc_audit_url',
                        'fire_safety_noc_url',
                        'pollution_noc_url',
                        'mcd_license_url',
                        'up_cold_storage_license_url',
                        'factory_license_url',
                        'panchayat_noc_url'
                    ];

                    const log = urlKeys.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_compliance_details',
                                type_id: findStores.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'store_compliance_documents',
                            activity_id: findStores.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
                    });

                    await Promise.all(log);
                    const currentData = req.body;
                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findStores.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Store',
                        activity_id: findStores.id,
                        activity_type: "store_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    return findStore;
                });
                if (findrequest) {
                    await models.request_for_store.update({
                        status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED
                    },
                        {
                            where: {
                                id: req.body.request_id ?? null,
                            }
                        })
                }
            } else {
                storeCompliance = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        store_id: req.body.store_id,
                        fsssai_license_url: req.body.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no,
                        fsssai_from: req.body.fsssai_from,
                        fssai_till: req.body.fssai_till,
                        iso_certificate_url: req.body.iso_certificate_url,
                        certificate_iso_no: req.body.certificate_iso_no,
                        certificate_agency: req.body.certificate_agency,
                        certificate_iso_from: req.body.certificate_iso_from,
                        certificate_iso_till: req.body.certificate_iso_till,
                        haccp_url: req.body.haccp_url,
                        post_control_agency_from: req.body.post_control_agency_from,
                        post_control_agency_till: req.body.post_control_agency_till,
                        post_control_url: req.body.post_control_url,
                        brc_audit_url: req.body.brc_audit_url,
                        brc_license_no: req.body.brc_license_no,
                        brc_from: req.body.brc_from,
                        brc_till: req.body.brc_till,
                        fire_safety_noc_url: req.body.fire_safety_noc_url,
                        fire_safety_from: req.body.fire_safety_from,
                        fire_safety_till: req.body.fire_safety_till,
                        fire_safety_license_no: req.body.fire_safety_license_no,
                        pollution_noc_url: req.body.pollution_noc_url,
                        pollution_license_no: req.body.pollution_license_no,
                        pollution_from: req.body.pollution_from,
                        pollution_till: req.body.pollution_till,
                        mcd_license_url: req.body.mcd_license_url,
                        mcd_license_valid: req.body.mcd_license_valid,
                        mcd_license_till: req.body.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                        up_cold_storage_from: req.body.up_cold_storage_from,
                        up_code_storage_till: req.body.up_code_storage_till,
                        factory_license_url: req.body.factory_license_url,
                        factory_license_number: req.body.factory_license_number,
                        factory_from: req.body.factory_from,
                        factory_till: req.body.factory_till,
                        panchayat_noc_url: req.body.panchayat_noc_url,
                        panchayat_noc_from: req.body.panchayat_noc_from,
                        panchayat_noc_till: req.body.panchayat_noc_till,
                        added_by: cUser.id
                    };
                    const createCompliance = await models.store_compliance_details.create(data, { transaction });
                    const urlKeys = [
                        'fsssai_license_url',
                        'iso_certificate_url',
                        'haccp_url',
                        'post_control_url',
                        'brc_audit_url',
                        'fire_safety_noc_url',
                        'pollution_noc_url',
                        'mcd_license_url',
                        'up_cold_storage_license_url',
                        'factory_license_url',
                        'panchayat_noc_url'
                    ];

                    const log = urlKeys.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_compliance_details',
                                type_id: findStores.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            }, { transaction });
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'store_compliance_documents',
                            activity_id: findStores.id,
                            activity_type: key,
                            current_data: {
                                document_type_url: req.body[key]
                            },
                            action: "Added",
                            added_by: cUser.id,
                        })
                    });

                    await Promise.all(log);
                    const currentData = req.body;
                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findStores.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Store',
                        activity_id: findStores.id,
                        activity_type: "stores_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id


                    });

                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findStores.user_id
                        }
                    })

                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store compliance request is now complete.`)

                    const findPartnerUid = findReciverToken.user_uid
                    await models.manager_logs.create({
                        user_id: cUser.id,
                        activity: "Add Request",
                        title: "Request",
                        details: `has added store compliance  for ${findStoreUid} in ${findPartnerUid}.`
                    });

                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findStores.user_id,
                        title: `Add Request Completed ${findStoreUid}`,
                        messages: `Your Basic Information store compliance request is now complete.`,
                        notification_type: "Store Management"
                    }, { transaction });

                    return createCompliance;
                });
            }
            return REST.success(res, storeCompliance, 'Compliance has been created successfully.');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

router.put('/complianceUpdate/:store_id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        })
        if (cUser.role_id == 3) {

            var store_compliance = await models.store_compliance_details.findOne({ where: { store_id: req.params.store_id } })
            if (store_compliance == null) {
                return REST.error(res, 'Store Id not found.', 404)
            }
            const store = await models.stores.findOne({ where: { id: req.params.store_id } });
            if (store == null) {
                return REST.error(res, 'Store not found.', 404);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            const findStoreUid = store.store_uid
            await models.sequelize.transaction(async (transaction) => {
                await models.store_compliance_details.update({
                    fsssai_license_url: req.body.fsssai_license_url,
                    fsssai_license_no: req.body.fsssai_license_no,
                    fsssai_from: req.body.fsssai_from,
                    fssai_till: req.body.fssai_till,
                    iso_certificate_url: req.body.iso_certificate_url,
                    certificate_iso_no: req.body.certificate_iso_no,
                    certificate_agency: req.body.certificate_agency,
                    certificate_iso_from: req.body.certificate_iso_from,
                    certificate_iso_till: req.body.certificate_iso_till,
                    haccp_url: req.body.haccp_url,
                    post_control_agency_from: req.body.post_control_agency_from,
                    post_control_agency_till: req.body.post_control_agency_till,
                    post_control_url: req.body.post_control_url,
                    brc_license_no: req.body.brc_license_no,
                    brc_audit_url: req.body.brc_audit_url,
                    brc_from: req.body.brc_from,
                    brc_till: req.body.brc_till,
                    fire_safety_noc_url: req.body.fire_safety_noc_url,
                    fire_safety_from: req.body.fire_safety_from,
                    fire_safety_till: req.body.fire_safety_till,
                    fire_safety_license_no: req.body.fire_safety_license_no,
                    pollution_noc_url: req.body.pollution_noc_url,
                    pollution_license_no: req.body.pollution_license_no,
                    pollution_from: req.body.pollution_from,
                    pollution_till: req.body.pollution_till,
                    mcd_license_url: req.body.mcd_license_url,
                    mcd_license_from: req.body.mcd_license_from,
                    mcd_license_till: req.body.mcd_license_till,
                    up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                    up_cold_storage_from: req.body.up_cold_storage_from,
                    up_code_storage_till: req.body.up_code_storage_till,
                    factory_license_url: req.body.factory_license_url,
                    factory_license_number: req.body.factory_license_number,
                    factory_from: req.body.factory_from,
                    factory_till: req.body.factory_till,
                    panchayat_noc_url: req.body.panchayat_noc_url,
                    panchayat_noc_from: req.body.panchayat_noc_from,
                    panchayat_noc_till: req.body.panchayat_noc_till,
                    updated_by: cUser.id
                },
                    {
                        where: { store_id: store_compliance.store_id },
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store compliance request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store compliance request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: store.id },
                    transaction: transaction
                });
                const urlKeys = [
                    'fsssai_license_url',
                    'iso_certificate_url',
                    'haccp_url',
                    'post_control_url',
                    'brc_audit_url',
                    'fire_safety_noc_url',
                    'pollution_noc_url',
                    'mcd_license_url',
                    'up_cold_storage_license_url',
                    'factory_license_url',
                    'panchayat_noc_url'
                ];
                const log = urlKeys.map(async (key) => {
                    if (req.body[key]) {
                        const findexistingdocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'store_compliance_details',
                                type_id: store.id,
                                document_type: key
                            },
                            transaction
                        });

                        const currentData = {
                            document_type_url: (req.body[key]),
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
                                activity: 'store_compliance_documents',
                                activity_id: store.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });

                        } else {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_compliance_details',
                                type_id: store.id,
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
                const findComplliance = await models.store_compliance_details.findOne({ where: { store_id: store_compliance.store_id } })
                const previousData = store_compliance.dataValues;
                delete req.body.current_user;
                const currentData = findComplliance.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_compliance_details",
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
                return REST.success(res, null, 'Update compliance success.');
            } else {
                return REST.success(res, null, 'Update compliance success.');
            }
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            var store_compliance
            store_compliance = await models.store_compliance_details.findOne({ where: { store_id: req.params.store_id } })
            if (store_compliance == null) {
                return REST.error(res, 'Store Id not found.', 404)
            }
            const store = await models.stores.findOne({ where: { id: req.params.store_id } });
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
            await models.sequelize.transaction(async (transaction) => {
                await models.store_compliance_details.update({
                    fsssai_license_url: req.body.fsssai_license_url,
                    fsssai_license_no: req.body.fsssai_license_no,
                    fsssai_from: req.body.fsssai_from,
                    fssai_till: req.body.fssai_till,
                    iso_certificate_url: req.body.iso_certificate_url,
                    certificate_iso_no: req.body.certificate_iso_no,
                    certificate_agency: req.body.certificate_agency,
                    certificate_iso_from: req.body.certificate_iso_from,
                    certificate_iso_till: req.body.certificate_iso_till,
                    haccp_url: req.body.haccp_url,
                    post_control_agency_from: req.body.post_control_agency_from,
                    post_control_agency_till: req.body.post_control_agency_till,
                    post_control_url: req.body.post_control_url,
                    brc_license_no: req.body.brc_license_no,
                    brc_audit_url: req.body.brc_audit_url,
                    brc_from: req.body.brc_from,
                    brc_till: req.body.brc_till,
                    fire_safety_noc_url: req.body.fire_safety_noc_url,
                    fire_safety_from: req.body.fire_safety_from,
                    fire_safety_till: req.body.fire_safety_till,
                    fire_safety_license_no: req.body.fire_safety_license_no,
                    pollution_noc_url: req.body.pollution_noc_url,
                    pollution_license_no: req.body.pollution_license_no,
                    pollution_from: req.body.pollution_from,
                    pollution_till: req.body.pollution_till,
                    mcd_license_url: req.body.mcd_license_url,
                    mcd_license_from: req.body.mcd_license_from,
                    mcd_license_till: req.body.mcd_license_till,
                    up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                    up_cold_storage_from: req.body.up_cold_storage_from,
                    up_code_storage_till: req.body.up_code_storage_till,
                    factory_license_url: req.body.factory_license_url,
                    factory_license_number: req.body.factory_license_number,
                    factory_from: req.body.factory_from,
                    factory_till: req.body.factory_till,
                    panchayat_noc_url: req.body.panchayat_noc_url,
                    panchayat_noc_from: req.body.panchayat_noc_from,
                    panchayat_noc_till: req.body.panchayat_noc_till,
                    updated_by: cUser.id
                },
                    {
                        where: { store_id: store_compliance.store_id },
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store compliance request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has edit store compliance  for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store compliance request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: store.id },
                    transaction: transaction
                });
                const urlKeys = [
                    'fsssai_license_url',
                    'iso_certificate_url',
                    'haccp_url',
                    'post_control_url',
                    'brc_audit_url',
                    'fire_safety_noc_url',
                    'pollution_noc_url',
                    'mcd_license_url',
                    'up_cold_storage_license_url',
                    'factory_license_url',
                    'panchayat_noc_url'
                ];
                const log = urlKeys.map(async (key) => {
                    if (req.body[key]) {
                        const findexistingdocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'store_compliance_details',
                                type_id: store.id,
                                document_type: key
                            },
                            transaction
                        });

                        const currentData = {
                            document_type_url: (req.body[key]),
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
                                activity: 'store_compliance_documents',
                                activity_id: store.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_compliance_details',
                                type_id: store.id,
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
                const findComplliance = await models.store_compliance_details.findOne({ where: { store_id: store_compliance.store_id } })
                const previousData = store_compliance.dataValues;
                delete req.body.current_user;
                const currentData = findComplliance.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_compliance_details",
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
                return REST.success(res, null, 'Update compliance success.');
            } else {
                return REST.success(res, null, 'Update compliance success.');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            var store_compliance
            store_compliance = await models.store_compliance_details.findOne({ where: { store_id: req.params.store_id } })
            if (store_compliance == null) {
                return REST.error(res, 'Store Id not found.', 404)
            }
            const store = await models.stores.findOne({ where: { id: req.params.store_id } });
            if (store == null) {
                return REST.error(res, 'Store not found.', 404);
            }
            const findStoreUid = store.store_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id,
                }
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : store.user_id;
            await models.sequelize.transaction(async (transaction) => {
                await models.store_compliance_details.update({
                    fsssai_license_url: req.body.fsssai_license_url,
                    fsssai_license_no: req.body.fsssai_license_no,
                    fsssai_from: req.body.fsssai_from,
                    fssai_till: req.body.fssai_till,
                    iso_certificate_url: req.body.iso_certificate_url,
                    certificate_iso_no: req.body.certificate_iso_no,
                    certificate_agency: req.body.certificate_agency,
                    certificate_iso_from: req.body.certificate_iso_from,
                    certificate_iso_till: req.body.certificate_iso_till,
                    haccp_url: req.body.haccp_url,
                    post_control_agency_from: req.body.post_control_agency_from,
                    post_control_agency_till: req.body.post_control_agency_till,
                    post_control_url: req.body.post_control_url,
                    brc_license_no: req.body.brc_license_no,
                    brc_audit_url: req.body.brc_audit_url,
                    brc_from: req.body.brc_from,
                    brc_till: req.body.brc_till,
                    fire_safety_noc_url: req.body.fire_safety_noc_url,
                    fire_safety_from: req.body.fire_safety_from,
                    fire_safety_till: req.body.fire_safety_till,
                    fire_safety_license_no: req.body.fire_safety_license_no,
                    pollution_noc_url: req.body.pollution_noc_url,
                    pollution_license_no: req.body.pollution_license_no,
                    pollution_from: req.body.pollution_from,
                    pollution_till: req.body.pollution_till,
                    mcd_license_url: req.body.mcd_license_url,
                    mcd_license_from: req.body.mcd_license_from,
                    mcd_license_till: req.body.mcd_license_till,
                    up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                    up_cold_storage_from: req.body.up_cold_storage_from,
                    up_code_storage_till: req.body.up_code_storage_till,
                    factory_license_url: req.body.factory_license_url,
                    factory_license_number: req.body.factory_license_number,
                    factory_from: req.body.factory_from,
                    factory_till: req.body.factory_till,
                    panchayat_noc_url: req.body.panchayat_noc_url,
                    panchayat_noc_from: req.body.panchayat_noc_from,
                    panchayat_noc_till: req.body.panchayat_noc_till,
                    updated_by: cUser.id
                },
                    {
                        where: { store_id: store_compliance.store_id },
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
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information store compliance request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Request",
                    details: `has edit store compliance  for ${findStoreUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: store.user_id,
                    title: `Edit Request Completed ${findStoreUid}`,
                    messages: `Your Basic Information store compliance request is now complete.`,
                    notification_type: "Store Management"

                }, { transaction });

                await models.stores.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: store.id },
                    transaction: transaction
                });
                const urlKeys = [
                    'fsssai_license_url',
                    'iso_certificate_url',
                    'haccp_url',
                    'post_control_url',
                    'brc_audit_url',
                    'fire_safety_noc_url',
                    'pollution_noc_url',
                    'mcd_license_url',
                    'up_cold_storage_license_url',
                    'factory_license_url',
                    'panchayat_noc_url'
                ];
                const log = urlKeys.map(async (key) => {
                    if (req.body[key]) {
                        const findexistingdocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'store_compliance_details',
                                type_id: store.id,
                                document_type: key
                            },
                            transaction
                        });

                        const currentData = {
                            document_type_url: (req.body[key]),
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
                                activity: 'store_compliance_documents',
                                activity_id: store.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'store_compliance_details',
                                type_id: store.id,
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
                const findComplliance = await models.store_compliance_details.findOne({ where: { store_id: store_compliance.store_id } })
                const previousData = store_compliance.dataValues;
                delete req.body.current_user;
                const currentData = findComplliance.dataValues;
                const activityLog = {
                    user_id: store.user_id,
                    kmp_id: kmp_ids,
                    activity: `Store`,
                    activity_id: store.id,
                    activity_type: "store_compliance_details",
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
                return REST.success(res, null, 'Update compliance success.');
            }
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router
