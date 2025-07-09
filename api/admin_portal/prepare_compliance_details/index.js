const { make } = require('simple-body-validator');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const { sendPushNotification } = require('../../../utils/helper');
const support = require('../../../utils/support');

/*
|----------------------------------------------------------------------------------------------------------------
|              Prepare Compliances Details Apis
|----------------------------------------------------------------------------------------------------------------
*/

router.post('/createPrepareCompliance', async function (req, res) {
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
            const findPrepare = await models.prepare_compliance_details.findOne({
                where: {
                    prepare_id: req.body.prepare_id
                }
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            let prepareCompliance;

            if (findPrepare) {
                prepareCompliance = await models.sequelize.transaction(async (transaction) => {
                    await findPrepare.update({
                        prepare_id: req.body.prepare_id,
                        fsssai_license_url: req.body.fsssai_license_url || findPrepare.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no || findPrepare.fsssai_license,
                        fsssai_license_valid: req.body.fsssai_license_valid || findPrepare.fsssai_license,
                        fsssai_license_till: req.body.fsssai_license_till || findPrepare.fsssai_license,
                        iso_certificate_url: req.body.iso_certificate_url || findPrepare.iso_certificate,
                        iso_no: req.body.iso_no || findPrepare.iso_no,
                        certifying_agency: req.body.certifying_agency || findPrepare.certifying_agency,
                        iso_certificate_valid: req.body.iso_certificate_valid || findPrepare.iso_certificate_valid,
                        iso_certificate_till: req.body.iso_certificate_till || findPrepare.iso_certificate_till,
                        haccp_url: req.body.haccp_url || findPrepare.haccp_url,
                        haccp_plan: req.body.haccp_plan || findPrepare.haccp_plan,
                        pest_control_agency_contract_url: req.body.pest_control_agency_contract_url || findPrepare.pest_control_agency_contract_url,
                        pest_control_agency_contract_valid: req.body.pest_control_agency_contract_valid || findPrepare.pest_control_agency_contract_valid,
                        pest_control_agency_contract_till: req.body.pest_control_agency_contract_till || findPrepare.pest_control_agency_contract_till,
                        brc_license_no: req.body.brc_license_no || findPrepare.brc_license_no,
                        brc_valid: req.body.brc_valid || findPrepare.brc_valid,
                        brc_till: req.body.brc_till || findPrepare.brc_till || findPrepare.brc_till,
                        fire_safety_noc_url: req.body.fire_safety_noc_url || findPrepare.fire_safety_noc_url,
                        fire_safety_license_no: req.body.fire_safety_license_no || findPrepare.fire_safety_license_no,
                        fire_safety_valid: req.body.fire_safety_valid || findPrepare.fire_safety_valid,
                        fire_safety_till: req.body.fire_safety_till || findPrepare.fire_safety_till,
                        pollution_noc_url: req.body.pollution_noc_url || findPrepare.pollution_noc_url,
                        pollution_noc_license_no: req.body.pollution_noc_license_no || findPrepare.pollution_noc_license_no,
                        pollution_noc_valid: req.body.pollution_noc_valid || findPrepare.pollution_noc_valid,
                        pollution_noc_till: req.body.pollution_noc_till || findPrepare.pollution_noc_till,
                        mcd_license_url: req.body.mcd_license_url || findPrepare.mcd_license_url,
                        mcd_license_valid: req.body.mcd_license_valid || findPrepare.mcd_license_valid,
                        mcd_license_till: req.body.mcd_license_till || findPrepare.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url || findPrepare.up_cold_storage_license_url,
                        up_cold_storage_license_valid: req.body.up_cold_storage_license_valid || findPrepare.up_cold_storage_license_valid,
                        up_cold_storage_license_till: req.body.up_cold_storage_license_till || findPrepare.up_cold_storage_license_till,
                        factory_license_url: req.body.factory_license_url || findPrepare.factory_license_url,
                        factory_license_no: req.body.factory_license_no || findPrepare.factory_license_no,
                        factory_license_valid: req.body.factory_license_valid || findPrepare.factory_license_valid,
                        factory_license_till: req.body.factory_license_till || findPrepare.factory_license_till,
                        panchayat_noc_url: req.body.panchayat_noc_url || findPrepare.panchayat_noc_url,
                        panchayat_noc_valid: req.body.panchayat_noc_valid || findPrepare.panchayat_noc_valid,
                        panchayat_noc_till: req.body.panchayat_noc_till || findPrepare.panchayat_noc_till,
                        added_by: cUser.id
                    },
                        {
                            transaction: transaction
                        }
                    );
                    const urlkey = [
                        "fsssai_license_url",
                        "iso_certificate_url",
                        "haccp_url",
                        "pest_control_agency_contract_url",
                        "brc_audit_url",
                        "fire_safety_noc_url",
                        "pollution_noc_url",
                        "mcd_license_url",
                        "up_cold_storage_license_url",
                        "factory_license_url",
                        "panchayat_noc_url"
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'prepare_compliance_details',
                                type_id: findPrepares.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            })
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'prepare_compliance_documents',
                            activity_id: findPrepares.id,
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
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id;

                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    return findPrepare
                })

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
                prepareCompliance = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        prepare_id: req.body.prepare_id,
                        fsssai_license_url: req.body.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no,
                        fsssai_license_valid: req.body.fsssai_license_valid,
                        fsssai_license_till: req.body.fsssai_license_till,
                        iso_certificate_url: req.body.iso_certificate_url,
                        iso_no: req.body.iso_no,
                        certifying_agency: req.body.certifying_agency,
                        iso_certificate_valid: req.body.iso_certificate_valid,
                        iso_certificate_till: req.body.iso_certificate_till,
                        haccp_url: req.body.haccp_url,
                        haccp_plan: req.body.haccp_plan,
                        pest_control_agency_contract_url: req.body.pest_control_agency_contract_url,
                        pest_control_agency_contract_valid: req.body.pest_control_agency_contract_valid,
                        pest_control_agency_contract_till: req.body.pest_control_agency_contract_till,
                        brc_audit_url: req.body.brc_audit_url,
                        brc_license_no: req.body.brc_license_no,
                        brc_valid: req.body.brc_valid,
                        brc_till: req.body.brc_till,
                        fire_safety_noc_url: req.body.fire_safety_noc_url,
                        fire_safety_license_no: req.body.fire_safety_license_no,
                        fire_safety_valid: req.body.fire_safety_valid,
                        fire_safety_till: req.body.fire_safety_till,
                        pollution_noc_url: req.body.pollution_noc_url,
                        pollution_noc_license_no: req.body.pollution_noc_license_no,
                        pollution_noc_valid: req.body.pollution_noc_valid,
                        pollution_noc_till: req.body.pollution_noc_till,
                        mcd_license_url: req.body.mcd_license_url,
                        mcd_license_valid: req.body.mcd_license_valid,
                        mcd_license_till: req.body.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                        up_cold_storage_license_valid: req.body.up_cold_storage_license_valid,
                        up_cold_storage_license_till: req.body.up_cold_storage_license_till,
                        factory_license_url: req.body.factory_license_url,
                        factory_license_no: req.body.factory_license_no,
                        factory_license_valid: req.body.factory_license_valid,
                        factory_license_till: req.body.factory_license_till,
                        panchayat_noc_url: req.body.panchayat_noc_url,
                        panchayat_noc_valid: req.body.panchayat_noc_valid,
                        panchayat_noc_till: req.body.panchayat_noc_till,
                        added_by: cUser.id
                    }
                    const createCompliance = await models.prepare_compliance_details.create(data, {
                        transaction: transaction
                    })
                    const urlkey = [
                        "fsssai_license_url",
                        "iso_certificate_url",
                        "haccp_url",
                        "pest_control_agency_contract_url",
                        "brc_audit_url",
                        "fire_safety_noc_url",
                        "pollution_noc_url",
                        "mcd_license_url",
                        "up_cold_storage_license_url",
                        "factory_license_url",
                        "panchayat_noc_url"
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'prepare_compliance_details',
                                type_id: findPrepares.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            })
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'prepare_compliance_documents',
                            activity_id: findPrepares.id,
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
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id;

                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findPrepares.user_id
                        }
                    })

                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare compliance request is now complete.`)

                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findPrepares.user_id,
                        title: `Add Request Completed ${findPrepareUid}`,
                        messages: `Your Basic Information prepare compliance request is now complete.`,
                        notification_type: "Perpare Management"

                    }, { transaction });

                    return createCompliance

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
            return REST.success(res, prepareCompliance, 'Prepare Compliance Details Create Successfully');
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
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
            const findPrepare = await models.prepare_compliance_details.findOne({
                where: {
                    prepare_id: req.body.prepare_id
                }
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            let prepareCompliance;
            if (findPrepare) {
                prepareCompliance = await models.sequelize.transaction(async (transaction) => {
                    await findPrepare.update({
                        prepare_id: req.body.prepare_id,
                        fsssai_license_url: req.body.fsssai_license_url || findPrepare.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no || findPrepare.fsssai_license,
                        fsssai_license_valid: req.body.fsssai_license_valid || findPrepare.fsssai_license,
                        fsssai_license_till: req.body.fsssai_license_till || findPrepare.fsssai_license,
                        iso_certificate_url: req.body.iso_certificate_url || findPrepare.iso_certificate,
                        iso_no: req.body.iso_no || findPrepare.iso_no,
                        certifying_agency: req.body.certifying_agency || findPrepare.certifying_agency,
                        iso_certificate_valid: req.body.iso_certificate_valid || findPrepare.iso_certificate_valid,
                        iso_certificate_till: req.body.iso_certificate_till || findPrepare.iso_certificate_till,
                        haccp_url: req.body.haccp_url || findPrepare.haccp_url,
                        haccp_plan: req.body.haccp_plan || findPrepare.haccp_plan,
                        pest_control_agency_contract_url: req.body.pest_control_agency_contract_url || findPrepare.pest_control_agency_contract_url,
                        pest_control_agency_contract_valid: req.body.pest_control_agency_contract_valid || findPrepare.pest_control_agency_contract_valid,
                        pest_control_agency_contract_till: req.body.pest_control_agency_contract_till || findPrepare.pest_control_agency_contract_till,
                        brc_license_no: req.body.brc_license_no || findPrepare.brc_license_no,
                        brc_valid: req.body.brc_valid || findPrepare.brc_valid,
                        brc_till: req.body.brc_till || findPrepare.brc_till || findPrepare.brc_till,
                        fire_safety_noc_url: req.body.fire_safety_noc_url || findPrepare.fire_safety_noc_url,
                        fire_safety_license_no: req.body.fire_safety_license_no || findPrepare.fire_safety_license_no,
                        fire_safety_valid: req.body.fire_safety_valid || findPrepare.fire_safety_valid,
                        fire_safety_till: req.body.fire_safety_till || findPrepare.fire_safety_till,
                        pollution_noc_url: req.body.pollution_noc_url || findPrepare.pollution_noc_url,
                        pollution_noc_license_no: req.body.pollution_noc_license_no || findPrepare.pollution_noc_license_no,
                        pollution_noc_valid: req.body.pollution_noc_valid || findPrepare.pollution_noc_valid,
                        pollution_noc_till: req.body.pollution_noc_till || findPrepare.pollution_noc_till,
                        mcd_license_url: req.body.mcd_license_url || findPrepare.mcd_license_url,
                        mcd_license_valid: req.body.mcd_license_valid || findPrepare.mcd_license_valid,
                        mcd_license_till: req.body.mcd_license_till || findPrepare.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url || findPrepare.up_cold_storage_license_url,
                        up_cold_storage_license_valid: req.body.up_cold_storage_license_valid || findPrepare.up_cold_storage_license_valid,
                        up_cold_storage_license_till: req.body.up_cold_storage_license_till || findPrepare.up_cold_storage_license_till,
                        factory_license_url: req.body.factory_license_url || findPrepare.factory_license_url,
                        factory_license_no: req.body.factory_license_no || findPrepare.factory_license_no,
                        factory_license_valid: req.body.factory_license_valid || findPrepare.factory_license_valid,
                        factory_license_till: req.body.factory_license_till || findPrepare.factory_license_till,
                        panchayat_noc_url: req.body.panchayat_noc_url || findPrepare.panchayat_noc_url,
                        panchayat_noc_valid: req.body.panchayat_noc_valid || findPrepare.panchayat_noc_valid,
                        panchayat_noc_till: req.body.panchayat_noc_till || findPrepare.panchayat_noc_till,
                        added_by: cUser.id
                    },
                        {
                            transaction: transaction
                        }
                    );
                    const urlkey = [
                        "fsssai_license_url",
                        "iso_certificate_url",
                        "haccp_url",
                        "pest_control_agency_contract_url",
                        "brc_audit_url",
                        "fire_safety_noc_url",
                        "pollution_noc_url",
                        "mcd_license_url",
                        "up_cold_storage_license_url",
                        "factory_license_url",
                        "panchayat_noc_url"
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'prepare_compliance_details',
                                type_id: findPrepares.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            })
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'prepare_compliance_documents',
                            activity_id: findPrepares.id,
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
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id;

                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    return findPrepare
                })

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
                prepareCompliance = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        prepare_id: req.body.prepare_id,
                        fsssai_license_url: req.body.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no,
                        fsssai_license_valid: req.body.fsssai_license_valid,
                        fsssai_license_till: req.body.fsssai_license_till,
                        iso_certificate_url: req.body.iso_certificate_url,
                        iso_no: req.body.iso_no,
                        certifying_agency: req.body.certifying_agency,
                        iso_certificate_valid: req.body.iso_certificate_valid,
                        iso_certificate_till: req.body.iso_certificate_till,
                        haccp_url: req.body.haccp_url,
                        haccp_plan: req.body.haccp_plan,
                        pest_control_agency_contract_url: req.body.pest_control_agency_contract_url,
                        pest_control_agency_contract_valid: req.body.pest_control_agency_contract_valid,
                        pest_control_agency_contract_till: req.body.pest_control_agency_contract_till,
                        brc_audit_url: req.body.brc_audit_url,
                        brc_license_no: req.body.brc_license_no,
                        brc_valid: req.body.brc_valid,
                        brc_till: req.body.brc_till,
                        fire_safety_noc_url: req.body.fire_safety_noc_url,
                        fire_safety_license_no: req.body.fire_safety_license_no,
                        fire_safety_valid: req.body.fire_safety_valid,
                        fire_safety_till: req.body.fire_safety_till,
                        pollution_noc_url: req.body.pollution_noc_url,
                        pollution_noc_license_no: req.body.pollution_noc_license_no,
                        pollution_noc_valid: req.body.pollution_noc_valid,
                        pollution_noc_till: req.body.pollution_noc_till,
                        mcd_license_url: req.body.mcd_license_url,
                        mcd_license_valid: req.body.mcd_license_valid,
                        mcd_license_till: req.body.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                        up_cold_storage_license_valid: req.body.up_cold_storage_license_valid,
                        up_cold_storage_license_till: req.body.up_cold_storage_license_till,
                        factory_license_url: req.body.factory_license_url,
                        factory_license_no: req.body.factory_license_no,
                        factory_license_valid: req.body.factory_license_valid,
                        factory_license_till: req.body.factory_license_till,
                        panchayat_noc_url: req.body.panchayat_noc_url,
                        panchayat_noc_valid: req.body.panchayat_noc_valid,
                        panchayat_noc_till: req.body.panchayat_noc_till,
                        added_by: cUser.id
                    }
                    const createCompliance = await models.prepare_compliance_details.create(data, {
                        transaction: transaction
                    })
                    const urlkey = [
                        "fsssai_license_url",
                        "iso_certificate_url",
                        "haccp_url",
                        "pest_control_agency_contract_url",
                        "brc_audit_url",
                        "fire_safety_noc_url",
                        "pollution_noc_url",
                        "mcd_license_url",
                        "up_cold_storage_license_url",
                        "factory_license_url",
                        "panchayat_noc_url"
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'prepare_compliance_details',
                                type_id: findPrepares.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            })
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'prepare_compliance_documents',
                            activity_id: findPrepares.id,
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
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id;
                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findPrepares.user_id
                        }
                    })

                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare compliance request is now complete.`)

                    const findPartnerUid = findReciverToken.user_uid
                    await models.manager_logs.create({
                        user_id: cUser.id,
                        activity: "Add Request",
                        title: "Request",
                        details: `has added prepare compliance for ${findPrepareUid} in ${findPartnerUid}.`
                    });
                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findPrepares.user_id,
                        title: `Add Request Completed ${findPrepareUid}`,
                        messages: `Your Basic Information prepare compliance request is now complete.`,
                        notification_type: "Perpare Management"

                    }, { transaction });

                    return createCompliance

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
            return REST.success(res, prepareCompliance, 'Prepare Compliance Details Create Successfully');
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
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
            const findPrepare = await models.prepare_compliance_details.findOne({
                where: {
                    prepare_id: req.body.prepare_id
                }
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            let prepareCompliance;
            if (findPrepare) {
                prepareCompliance = await models.sequelize.transaction(async (transaction) => {
                    await findPrepare.update({
                        prepare_id: req.body.prepare_id,
                        fsssai_license_url: req.body.fsssai_license_url || findPrepare.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no || findPrepare.fsssai_license,
                        fsssai_license_valid: req.body.fsssai_license_valid || findPrepare.fsssai_license,
                        fsssai_license_till: req.body.fsssai_license_till || findPrepare.fsssai_license,
                        iso_certificate_url: req.body.iso_certificate_url || findPrepare.iso_certificate,
                        iso_no: req.body.iso_no || findPrepare.iso_no,
                        certifying_agency: req.body.certifying_agency || findPrepare.certifying_agency,
                        iso_certificate_valid: req.body.iso_certificate_valid || findPrepare.iso_certificate_valid,
                        iso_certificate_till: req.body.iso_certificate_till || findPrepare.iso_certificate_till,
                        haccp_url: req.body.haccp_url || findPrepare.haccp_url,
                        haccp_plan: req.body.haccp_plan || findPrepare.haccp_plan,
                        pest_control_agency_contract_url: req.body.pest_control_agency_contract_url || findPrepare.pest_control_agency_contract_url,
                        pest_control_agency_contract_valid: req.body.pest_control_agency_contract_valid || findPrepare.pest_control_agency_contract_valid,
                        pest_control_agency_contract_till: req.body.pest_control_agency_contract_till || findPrepare.pest_control_agency_contract_till,
                        brc_license_no: req.body.brc_license_no || findPrepare.brc_license_no,
                        brc_valid: req.body.brc_valid || findPrepare.brc_valid,
                        brc_till: req.body.brc_till || findPrepare.brc_till || findPrepare.brc_till,
                        fire_safety_noc_url: req.body.fire_safety_noc_url || findPrepare.fire_safety_noc_url,
                        fire_safety_license_no: req.body.fire_safety_license_no || findPrepare.fire_safety_license_no,
                        fire_safety_valid: req.body.fire_safety_valid || findPrepare.fire_safety_valid,
                        fire_safety_till: req.body.fire_safety_till || findPrepare.fire_safety_till,
                        pollution_noc_url: req.body.pollution_noc_url || findPrepare.pollution_noc_url,
                        pollution_noc_license_no: req.body.pollution_noc_license_no || findPrepare.pollution_noc_license_no,
                        pollution_noc_valid: req.body.pollution_noc_valid || findPrepare.pollution_noc_valid,
                        pollution_noc_till: req.body.pollution_noc_till || findPrepare.pollution_noc_till,
                        mcd_license_url: req.body.mcd_license_url || findPrepare.mcd_license_url,
                        mcd_license_valid: req.body.mcd_license_valid || findPrepare.mcd_license_valid,
                        mcd_license_till: req.body.mcd_license_till || findPrepare.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url || findPrepare.up_cold_storage_license_url,
                        up_cold_storage_license_valid: req.body.up_cold_storage_license_valid || findPrepare.up_cold_storage_license_valid,
                        up_cold_storage_license_till: req.body.up_cold_storage_license_till || findPrepare.up_cold_storage_license_till,
                        factory_license_url: req.body.factory_license_url || findPrepare.factory_license_url,
                        factory_license_no: req.body.factory_license_no || findPrepare.factory_license_no,
                        factory_license_valid: req.body.factory_license_valid || findPrepare.factory_license_valid,
                        factory_license_till: req.body.factory_license_till || findPrepare.factory_license_till,
                        panchayat_noc_url: req.body.panchayat_noc_url || findPrepare.panchayat_noc_url,
                        panchayat_noc_valid: req.body.panchayat_noc_valid || findPrepare.panchayat_noc_valid,
                        panchayat_noc_till: req.body.panchayat_noc_till || findPrepare.panchayat_noc_till,
                        added_by: cUser.id
                    },
                        {
                            transaction: transaction
                        }
                    );
                    const urlkey = [
                        "fsssai_license_url",
                        "iso_certificate_url",
                        "haccp_url",
                        "pest_control_agency_contract_url",
                        "brc_audit_url",
                        "fire_safety_noc_url",
                        "pollution_noc_url",
                        "mcd_license_url",
                        "up_cold_storage_license_url",
                        "factory_license_url",
                        "panchayat_noc_url"
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'prepare_compliance_details',
                                type_id: findPrepares.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            })
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'prepare_compliance_documents',
                            activity_id: findPrepares.id,
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
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id;

                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    return findPrepare
                })

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
                prepareCompliance = await models.sequelize.transaction(async (transaction) => {
                    const data = {
                        prepare_id: req.body.prepare_id,
                        fsssai_license_url: req.body.fsssai_license_url,
                        fsssai_license_no: req.body.fsssai_license_no,
                        fsssai_license_valid: req.body.fsssai_license_valid,
                        fsssai_license_till: req.body.fsssai_license_till,
                        iso_certificate_url: req.body.iso_certificate_url,
                        iso_no: req.body.iso_no,
                        certifying_agency: req.body.certifying_agency,
                        iso_certificate_valid: req.body.iso_certificate_valid,
                        iso_certificate_till: req.body.iso_certificate_till,
                        haccp_url: req.body.haccp_url,
                        haccp_plan: req.body.haccp_plan,
                        pest_control_agency_contract_url: req.body.pest_control_agency_contract_url,
                        pest_control_agency_contract_valid: req.body.pest_control_agency_contract_valid,
                        pest_control_agency_contract_till: req.body.pest_control_agency_contract_till,
                        brc_audit_url: req.body.brc_audit_url,
                        brc_license_no: req.body.brc_license_no,
                        brc_valid: req.body.brc_valid,
                        brc_till: req.body.brc_till,
                        fire_safety_noc_url: req.body.fire_safety_noc_url,
                        fire_safety_license_no: req.body.fire_safety_license_no,
                        fire_safety_valid: req.body.fire_safety_valid,
                        fire_safety_till: req.body.fire_safety_till,
                        pollution_noc_url: req.body.pollution_noc_url,
                        pollution_noc_license_no: req.body.pollution_noc_license_no,
                        pollution_noc_valid: req.body.pollution_noc_valid,
                        pollution_noc_till: req.body.pollution_noc_till,
                        mcd_license_url: req.body.mcd_license_url,
                        mcd_license_valid: req.body.mcd_license_valid,
                        mcd_license_till: req.body.mcd_license_till,
                        up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                        up_cold_storage_license_valid: req.body.up_cold_storage_license_valid,
                        up_cold_storage_license_till: req.body.up_cold_storage_license_till,
                        factory_license_url: req.body.factory_license_url,
                        factory_license_no: req.body.factory_license_no,
                        factory_license_valid: req.body.factory_license_valid,
                        factory_license_till: req.body.factory_license_till,
                        panchayat_noc_url: req.body.panchayat_noc_url,
                        panchayat_noc_valid: req.body.panchayat_noc_valid,
                        panchayat_noc_till: req.body.panchayat_noc_till,
                        added_by: cUser.id
                    }
                    const createCompliance = await models.prepare_compliance_details.create(data, {
                        transaction: transaction
                    })
                    const urlkey = [
                        "fsssai_license_url",
                        "iso_certificate_url",
                        "haccp_url",
                        "pest_control_agency_contract_url",
                        "brc_audit_url",
                        "fire_safety_noc_url",
                        "pollution_noc_url",
                        "mcd_license_url",
                        "up_cold_storage_license_url",
                        "factory_license_url",
                        "panchayat_noc_url"
                    ]
                    const log = urlkey.map(async (key) => {
                        if (req.body[key]) {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'prepare_compliance_details',
                                type_id: findPrepares.id,
                                document_type: key,
                                document_type_url: req.body[key],
                                action: 'Added_by',
                                added_by: cUser.id,
                            })
                        }
                        await models.user_activity_logs.create({
                            user_id: cUser.id,
                            activity: 'prepare_compliance_documents',
                            activity_id: findPrepares.id,
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
                    const kmp_ids = req.body.request_id ? findrequest.user_id : findPrepares.user_id;

                    delete req.body.current_user;
                    await models.user_activity_logs.create({
                        user_id: findPrepares.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Prepare',
                        activity_id: findPrepares.id,
                        activity_type: "prepare_compliance_details",
                        current_data: currentData,
                        action: "Added",
                        added_by: cUser.id

                    });
                    const findReciverToken = await models.User.findOne({
                        where: {
                            id: findPrepares.user_id
                        }
                    })
                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                    // send notification
                    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare compliance request is now complete.`)

                    const findPartnerUid = findReciverToken.user_uid
                    await models.manager_logs.create({
                        user_id: cUser.id,
                        activity: "Add Request",
                        title: "Request",
                        details: `has added prepare compliance for ${findPrepareUid} in ${findPartnerUid}.`
                    });
                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findPrepares.user_id,
                        title: `Add Request Completed ${findPrepareUid}`,
                        messages: `Your Basic Information prepare compliance request is now complete.`,
                        notification_type: "Perpare Management"
                    }, { transaction });

                    return createCompliance

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
            return REST.success(res, prepareCompliance, 'Prepare Compliance Details Create Successfully');
        }

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/prepareComplianceUpdate/:prepare_id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        })
        if (cUser.role_id == 3) {
            var prepares;
            const findPrepare = await models.prepare_compliance_details.findOne({ where: { prepare_id: req.params.prepare_id } })
            if (findPrepare == null) {
                return REST.error(res, 'Prepare id not Found', 404);
            }
            prepares = await models.prepare_details.findOne({ where: { id: req.params.prepare_id } });
            if (prepares == null) {
                return REST.error(res, 'Prepare not found.', 404);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const findPrepareUid = prepares.prepare_uid
            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_compliance_details.update({
                    fsssai_license_url: req.body.fsssai_license_url,
                    fsssai_license_no: req.body.fsssai_license_no,
                    fsssai_license_valid: req.body.fsssai_license_valid,
                    fsssai_license_till: req.body.fsssai_license_till,
                    iso_certificate_url: req.body.iso_certificate_url,
                    iso_no: req.body.iso_no,
                    certifying_agency: req.body.certifying_agency,
                    iso_certificate_valid: req.body.iso_certificate_valid,
                    iso_certificate_till: req.body.iso_certificate_till,
                    haccp_url: req.body.haccp_url,
                    haccp_plan: req.body.haccp_plan,
                    pest_control_agency_contract_url: req.body.pest_control_agency_contract_url,
                    pest_control_agency_contract_valid: req.body.pest_control_agency_contract_valid,
                    pest_control_agency_contract_till: req.body.pest_control_agency_contract_till,
                    brc_audit_url: req.body.brc_audit_url,
                    brc_license_no: req.body.brc_license_no,
                    brc_valid: req.body.brc_valid,
                    brc_till: req.body.brc_till,
                    fire_safety_noc_url: req.body.fire_safety_noc_url,
                    fire_safety_license_no: req.body.fire_safety_license_no,
                    fire_safety_valid: req.body.fire_safety_valid,
                    fire_safety_till: req.body.fire_safety_till,
                    pollution_noc_url: req.body.pollution_noc_url,
                    pollution_noc_license_no: req.body.pollution_noc_license_no,
                    pollution_noc_valid: req.body.pollution_noc_valid,
                    pollution_noc_till: req.body.pollution_noc_till,
                    mcd_license_url: req.body.mcd_license_url,
                    mcd_license_valid: req.body.mcd_license_valid,
                    mcd_license_till: req.body.mcd_license_till,
                    up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                    up_cold_storage_license_valid: req.body.up_cold_storage_license_valid,
                    up_cold_storage_license_till: req.body.up_cold_storage_license_till,
                    factory_license_url: req.body.factory_license_url,
                    factory_license_no: req.body.factory_license_no,
                    factory_license_valid: req.body.factory_license_valid,
                    factory_license_till: req.body.factory_license_till,
                    panchayat_noc_url: req.body.panchayat_noc_url,
                    panchayat_noc_valid: req.body.panchayat_noc_valid,
                    panchayat_noc_till: req.body.panchayat_noc_till,
                    updated_by: cUser.id
                },
                    {
                        where: { prepare_id: findPrepare.prepare_id },
                        transaction: transaction
                    });
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: prepares.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare compliance request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: prepares.user_id,
                    title: `Edit Request Completed ${findPrepareUid}`,
                    messages: `Your Basic Information prepare compliance request is complete.`,
                    notification_type: "Perpare Management"

                }, { transaction });

                await models.prepare_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: prepares.id },
                    transaction: transaction
                });
                const urlkey = [
                    "fsssai_license_url",
                    "iso_certificate_url",
                    "haccp_url",
                    "pest_control_agency_contract_url",
                    "brc_audit_url",
                    "fire_safety_noc_url",
                    "pollution_noc_url",
                    "mcd_license_url",
                    "up_cold_storage_license_url",
                    "factory_license_url",
                    "panchayat_noc_url"
                ]
                const log = urlkey.map(async (key) => {
                    if (req.body[key]) {
                        const findexistingdocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'prepare_compliance_details',
                                type_id: prepares.id,
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
                                activity: 'prepare_compliance_documents',
                                activity_id: prepares.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'prepare_compliance_details',
                                type_id: prepares.id,
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
            const kmp_ids = req.body.request_id ? findrequest.user_id : prepares.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const prepare = await models.prepare_compliance_details.findOne({ where: { prepare_id: findPrepare.prepare_id } });
                const previousData = findPrepare.dataValues;
                delete req.body.current_user;
                const currentData = prepare.dataValues;
                const activityLog = {
                    user_id: prepares.user_id,
                    kmp_id: kmp_ids,
                    activity: `Prepare`,
                    activity_id: prepares.id,
                    activity_type: "prepare_compliance_details",
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
                return REST.success(res, null, 'Prepare Compliance Details Updated Successfully');

            } else {
                return REST.success(res, null, 'Prepare Compliance Details Updated Successfully');
            }
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            var prepares;
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const findPrepare = await models.prepare_compliance_details.findOne({ where: { prepare_id: req.params.prepare_id } })
            if (findPrepare == null) {
                return REST.error(res, 'Prepare id not Found', 404);
            }
            prepares = await models.prepare_details.findOne({ where: { id: req.params.prepare_id } });
            if (prepares == null) {
                return REST.error(res, 'Prepare not found.', 404);
            }
            const findPrepareUid = prepares.prepare_uid
            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_compliance_details.update({
                    fsssai_license_url: req.body.fsssai_license_url,
                    fsssai_license_no: req.body.fsssai_license_no,
                    fsssai_license_valid: req.body.fsssai_license_valid,
                    fsssai_license_till: req.body.fsssai_license_till,
                    iso_certificate_url: req.body.iso_certificate_url,
                    iso_no: req.body.iso_no,
                    certifying_agency: req.body.certifying_agency,
                    iso_certificate_valid: req.body.iso_certificate_valid,
                    iso_certificate_till: req.body.iso_certificate_till,
                    haccp_url: req.body.haccp_url,
                    haccp_plan: req.body.haccp_plan,
                    pest_control_agency_contract_url: req.body.pest_control_agency_contract_url,
                    pest_control_agency_contract_valid: req.body.pest_control_agency_contract_valid,
                    pest_control_agency_contract_till: req.body.pest_control_agency_contract_till,
                    brc_audit_url: req.body.brc_audit_url,
                    brc_license_no: req.body.brc_license_no,
                    brc_valid: req.body.brc_valid,
                    brc_till: req.body.brc_till,
                    fire_safety_noc_url: req.body.fire_safety_noc_url,
                    fire_safety_license_no: req.body.fire_safety_license_no,
                    fire_safety_valid: req.body.fire_safety_valid,
                    fire_safety_till: req.body.fire_safety_till,
                    pollution_noc_url: req.body.pollution_noc_url,
                    pollution_noc_license_no: req.body.pollution_noc_license_no,
                    pollution_noc_valid: req.body.pollution_noc_valid,
                    pollution_noc_till: req.body.pollution_noc_till,
                    mcd_license_url: req.body.mcd_license_url,
                    mcd_license_valid: req.body.mcd_license_valid,
                    mcd_license_till: req.body.mcd_license_till,
                    up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                    up_cold_storage_license_valid: req.body.up_cold_storage_license_valid,
                    up_cold_storage_license_till: req.body.up_cold_storage_license_till,
                    factory_license_url: req.body.factory_license_url,
                    factory_license_no: req.body.factory_license_no,
                    factory_license_valid: req.body.factory_license_valid,
                    factory_license_till: req.body.factory_license_till,
                    panchayat_noc_url: req.body.panchayat_noc_url,
                    panchayat_noc_valid: req.body.panchayat_noc_valid,
                    panchayat_noc_till: req.body.panchayat_noc_till,
                    updated_by: cUser.id
                },
                    {
                        where: { prepare_id: findPrepare.prepare_id },
                        transaction: transaction
                    });
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: prepares.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare compliance request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: `has edit prepare compliance for ${findPrepareUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: prepares.user_id,
                    title: `Edit Request Completed ${findPrepareUid}`,
                    messages: `Your Basic Information prepare compliance request is complete.`,
                    notification_type: "Perpare Management"

                }, { transaction });

                await models.prepare_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: prepares.id },
                    transaction: transaction
                });
                const urlkey = [
                    "fsssai_license_url",
                    "iso_certificate_url",
                    "haccp_url",
                    "pest_control_agency_contract_url",
                    "brc_audit_url",
                    "fire_safety_noc_url",
                    "pollution_noc_url",
                    "mcd_license_url",
                    "up_cold_storage_license_url",
                    "factory_license_url",
                    "panchayat_noc_url"
                ]
                const log = urlkey.map(async (key) => {
                    if (req.body[key]) {
                        const findexistingdocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'prepare_compliance_details',
                                type_id: prepares.id,
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
                                activity: 'prepare_compliance_documents',
                                activity_id: prepares.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'prepare_compliance_details',
                                type_id: prepares.id,
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
            const kmp_ids = req.body.request_id ? findrequest.user_id : prepares.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const prepare = await models.prepare_compliance_details.findOne({ where: { prepare_id: findPrepare.prepare_id } });
                const previousData = findPrepare.dataValues;
                delete req.body.current_user;
                const currentData = prepare.dataValues;
                const activityLog = {
                    user_id: prepares.user_id,
                    kmp_id: kmp_ids,
                    activity: `Prepare`,
                    activity_id: prepares.id,
                    activity_type: "prepare_compliance_details",
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
                return REST.success(res, null, 'Prepare Compliance Details Updated Successfully');

            } else {
                return REST.success(res, null, 'Prepare Compliance Details Updated Successfully');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            var prepares;
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id,
                }
            })
            const findPrepare = await models.prepare_compliance_details.findOne({ where: { prepare_id: req.params.prepare_id } })
            if (findPrepare == null) {
                return REST.error(res, 'Prepare id not Found', 404);
            }
            prepares = await models.prepare_details.findOne({ where: { id: req.params.prepare_id } });
            if (prepares == null) {
                return REST.error(res, 'Prepare not found.', 404);
            }
            const findPrepareUid = prepares.prepare_uid
            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_compliance_details.update({
                    fsssai_license_url: req.body.fsssai_license_url,
                    fsssai_license_no: req.body.fsssai_license_no,
                    fsssai_license_valid: req.body.fsssai_license_valid,
                    fsssai_license_till: req.body.fsssai_license_till,
                    iso_certificate_url: req.body.iso_certificate_url,
                    iso_no: req.body.iso_no,
                    certifying_agency: req.body.certifying_agency,
                    iso_certificate_valid: req.body.iso_certificate_valid,
                    iso_certificate_till: req.body.iso_certificate_till,
                    haccp_url: req.body.haccp_url,
                    haccp_plan: req.body.haccp_plan,
                    pest_control_agency_contract_url: req.body.pest_control_agency_contract_url,
                    pest_control_agency_contract_valid: req.body.pest_control_agency_contract_valid,
                    pest_control_agency_contract_till: req.body.pest_control_agency_contract_till,
                    brc_audit_url: req.body.brc_audit_url,
                    brc_license_no: req.body.brc_license_no,
                    brc_valid: req.body.brc_valid,
                    brc_till: req.body.brc_till,
                    fire_safety_noc_url: req.body.fire_safety_noc_url,
                    fire_safety_license_no: req.body.fire_safety_license_no,
                    fire_safety_valid: req.body.fire_safety_valid,
                    fire_safety_till: req.body.fire_safety_till,
                    pollution_noc_url: req.body.pollution_noc_url,
                    pollution_noc_license_no: req.body.pollution_noc_license_no,
                    pollution_noc_valid: req.body.pollution_noc_valid,
                    pollution_noc_till: req.body.pollution_noc_till,
                    mcd_license_url: req.body.mcd_license_url,
                    mcd_license_valid: req.body.mcd_license_valid,
                    mcd_license_till: req.body.mcd_license_till,
                    up_cold_storage_license_url: req.body.up_cold_storage_license_url,
                    up_cold_storage_license_valid: req.body.up_cold_storage_license_valid,
                    up_cold_storage_license_till: req.body.up_cold_storage_license_till,
                    factory_license_url: req.body.factory_license_url,
                    factory_license_no: req.body.factory_license_no,
                    factory_license_valid: req.body.factory_license_valid,
                    factory_license_till: req.body.factory_license_till,
                    panchayat_noc_url: req.body.panchayat_noc_url,
                    panchayat_noc_valid: req.body.panchayat_noc_valid,
                    panchayat_noc_till: req.body.panchayat_noc_till,
                    updated_by: cUser.id
                },
                    {
                        where: { prepare_id: findPrepare.prepare_id },
                        transaction: transaction
                    });
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: prepares.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information prepare compliance request is now complete.`)

                const findPartnerUid = findReciverToken.user_uid
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Request",
                    details: ` has edit prepare compliance for ${findPrepareUid} in ${findPartnerUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: prepares.user_id,
                    title: `Edit Request Completed ${findPrepareUid}`,
                    messages: `Your Basic Information prepare compliance request is complete.`,
                    notification_type: "Perpare Management"

                }, { transaction });

                await models.prepare_details.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: prepares.id },
                    transaction: transaction
                });
                const urlkey = [
                    "fsssai_license_url",
                    "iso_certificate_url",
                    "haccp_url",
                    "pest_control_agency_contract_url",
                    "brc_audit_url",
                    "fire_safety_noc_url",
                    "pollution_noc_url",
                    "mcd_license_url",
                    "up_cold_storage_license_url",
                    "factory_license_url",
                    "panchayat_noc_url"
                ]
                const log = urlkey.map(async (key) => {
                    if (req.body[key]) {
                        const findexistingdocs = await models.document_common_logs.findOne({
                            where: {
                                type: 'prepare_compliance_details',
                                type_id: prepares.id,
                                document_type: key
                            },
                            transaction
                        });
                        const currentData = {
                            document_type_url: (req.body[key]),
                        };
                        const previousData = {
                            document_type_url: findexistingdocs.document_type_url,
                        }
                        if (findexistingdocs) {
                            await findexistingdocs.update({
                                document_type_url: (req.body[key]),
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                            await models.user_activity_logs.create({
                                user_id: cUser.id,
                                activity: 'prepare_compliance_documents',
                                activity_id: prepares.id,
                                activity_type: key,
                                previous_data: previousData,
                                current_data: currentData,
                                action: 'Updated',
                                updated_by: cUser.id,
                            }, { transaction });
                        } else {
                            await models.document_common_logs.create({
                                user_id: cUser.id,
                                type: 'prepare_compliance_details',
                                type_id: prepares.id,
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
            const kmp_ids = req.body.request_id ? findrequest.user_id : prepares.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const prepare = await models.prepare_compliance_details.findOne({ where: { prepare_id: findPrepare.prepare_id } });
                const previousData = findPrepare.dataValues;
                delete req.body.current_user;
                const currentData = prepare.dataValues;
                const activityLog = {
                    user_id: prepares.user_id,
                    kmp_id: kmp_ids,
                    activity: `Prepare`,
                    activity_id: prepares.id,
                    activity_type: "prepare_compliance_details",
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
                return REST.success(res, null, 'Prepare Compliance Details Updated Successfully');
            }
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

module.exports = router