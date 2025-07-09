const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const constants = require("../../../constants");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const sequelize = require('sequelize');
const { promises } = require('nodemailer/lib/xoauth2');


/*
|----------------------------------------------------------------------------------------------------------------
|              Users Activity Logs Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/getActivityLogsByUid/:user_uid', async function (req, res) {
    try {
        const userUid = req.params.user_uid;
        const user = await models.User.findOne({
            attributes: ['id', 'full_name', 'role_id', 'user_uid', 'email', "phone_number", "designation", "city", "department"],
            where: { user_uid: userUid },
        });
        if (!user) {
            return REST.error(res, 'User not found', 404);
        }
        const findkmp = await models.Key_management.findAll({
            where: { user_id: user.id },
        })
        const keyManagerIds = [];
        if (findkmp && findkmp.length > 0) {
            const keyManagementIds = findkmp.map(kmp => kmp.id);
            const keyManagers = await models.User.findAll({
                where: {
                    key_mangement_id: keyManagementIds
                }
            });
            keyManagerIds.push(...keyManagers.map(keyManager => keyManager.id));
        }
        const allUser = [user.id, ...keyManagerIds]
        const excludedActivityTypes = [
            'fsssai_license_url', 'iso_certificate_url', 'haccp_url', 'post_control_url', 'brc_audit_url',
            'fire_safety_noc_url', 'pollution_noc_url', 'mcd_license_url', 'up_cold_storage_license_url',
            'factory_license_url', 'panchayat_noc_url', 'no_lien_certificate_url', 'latest_electricity_bill_url',
            'structural_safety_cerfificate_url', 'insurance_certificate_url', 'plant_layout_url', 'storage_temperature_url',
            'asset_3d_url', 'photo_of_asset_url', 'permit_url', 'pucc_url', 'asset_photo_url', 'asset_3d_view_url', 'structural_load_safety_certificate_url',
            'facility_layout_url', 'electricity_bill_url', 'pest_control_agency_contract_url', 'partner_csv', 'firm_csv', "customer_csv", "prepare_csv", "move_csv", "store_csv", "Quotation_csv"
        ];
        const activityLogs = await models.user_activity_logs.findAll({
            where: {
                user_id: { [Op.in]: allUser },
                activity_type: {
                    [Op.notIn]: excludedActivityTypes
                }
            },
            include: [
                {
                    model: models.User,
                    as: "updated_details",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                },
            ],
            order: [['created_at', 'DESC']]
        })
        activityLogs.forEach(activityLog => {
            if (activityLog.updated_details) {
                activityLog.updated_details.dataValues.updated_at = activityLog.updatedAt;
            }
        });
        activityLogs.forEach(activityLog => {
            if (activityLog.addedBy) {
                activityLog.addedBy.dataValues.created_at = activityLog.createdAt;
            }
        });
        const activityDetails = await Promise.all(activityLogs.map(async (log) => {
            let additionalDetails = {};
            if (log.activity && log.activity.includes('Store')) {
                additionalDetails.store_details = await models.stores.findByPk(log.activity_id, {
                    include: [
                        {
                            model: models.User,
                            as: "Verified_details",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.request_for_store,
                            as: "requests",
                            where: { user_id: log.user_id },
                            attributes: ['id', "user_id", "section_id", "action", "section_name", "createdAt", "updatedAt"],
                            include: [
                                {
                                    model: models.User,
                                    as: "requested_by",
                                    required: false,
                                    attributes: ["id", "role_id", "is_key_manager", "full_name"],
                                }
                            ],
                            order: [["createdAt", "DESC"]],
                            limit: 1
                        }
                    ],
                })
                if (additionalDetails.store_details) {
                    if (additionalDetails.store_details.Verified_details) {
                        additionalDetails.store_details.Verified_details.dataValues.verified_at = additionalDetails.store_details.verified_at;
                    }

                    if (Array.isArray(additionalDetails.store_details.requests)) {
                        additionalDetails.store_details.requests.forEach((request) => {
                            if (request.requested_by) {
                                if (request.requested_by.role_id === 1) {
                                    request.requested_by.dataValues.roleName = request.requested_by.is_key_manager ? 'KMP' : 'Partner';
                                } else if (request.requested_by.role_id === 2) {
                                    request.requested_by.dataValues.roleName = 'Customer';
                                }
                            }
                        });
                    }
                }
            } else if (log.activity && log.activity.includes('Firm')) {
                additionalDetails.firm_details = await models.User_firm.findByPk(log.activity_id, {
                    include: [
                        {
                            model: models.User,
                            as: "Verified_detail",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.request_for_store,
                            as: "requests",
                            where: { user_id: log.user_id },
                            attributes: ['id', "user_id", "section_id", "action", "section_name", "createdAt", "updatedAt"],
                            include: [
                                {
                                    model: models.User,
                                    as: "requested_by",
                                    required: false,
                                    attributes: ["id", "role_id", "is_key_manager", "full_name"]
                                }
                            ],
                            order: [["createdAt", "DESC"]],
                            limit: 1
                        }
                    ],
                });
                if (additionalDetails.firm_details) {
                    if (additionalDetails.firm_details.Verified_detail) {
                        additionalDetails.firm_details.Verified_detail.dataValues.verified_at = additionalDetails.firm_details.verified_at;
                    }

                    if (Array.isArray(additionalDetails.firm_details.requests)) {
                        additionalDetails.firm_details.requests.forEach((request) => {
                            if (request.requested_by) {
                                if (request.requested_by.role_id === 1) {
                                    request.requested_by.dataValues.roleName = request.requested_by.is_key_manager ? 'KMP' : 'Partner';
                                } else if (request.requested_by.role_id === 2) {
                                    request.requested_by.dataValues.roleName = 'Customer';
                                }
                            }
                        });
                    }
                }
            } else if (log.activity && log.activity.includes('Move')) {
                additionalDetails.move_details = await models.move_details.findByPk(log.activity_id, {
                    include: [
                        {
                            model: models.User,
                            as: "verified_By",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.request_for_store,
                            as: "requests",
                            where: { user_id: log.user_id },
                            attributes: ['id', "user_id", "section_id", "action", "section_name", "createdAt", "updatedAt"],
                            include: [
                                {
                                    model: models.User,
                                    as: "requested_by",
                                    required: false,
                                    attributes: ["id", "role_id", "is_key_manager", "full_name"],
                                }
                            ],
                            order: [["createdAt", "DESC"]],
                            limit: 1
                        }
                    ],
                });
                if (additionalDetails.move_details) {
                    if (additionalDetails.move_details.verified_By) {
                        additionalDetails.move_details.verified_By.dataValues.verified_at = additionalDetails.move_details.verified_at;
                    }

                    if (Array.isArray(additionalDetails.move_details.requests)) {
                        additionalDetails.move_details.requests.forEach((request) => {
                            if (request.requested_by) {
                                if (request.requested_by.role_id === 1) {
                                    request.requested_by.dataValues.roleName = request.requested_by.is_key_manager ? 'KMP' : 'Partner';
                                } else if (request.requested_by.role_id === 2) {
                                    request.requested_by.dataValues.roleName = 'Customer';
                                }
                            }
                        });
                    }
                }

            } else if (log.activity && log.activity.includes('Prepare')) {
                additionalDetails.prepare_details = await models.prepare_details.findByPk(log.activity_id, {
                    include: [
                        {
                            model: models.User,
                            as: "verifiedby",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.request_for_store,
                            as: "requests",
                            where: { user_id: log.user_id },
                            attributes: ['id', "user_id", "section_id", "action", "section_name", "createdAt", "updatedAt"],
                            include: [
                                {
                                    model: models.User,
                                    as: "requested_by",
                                    required: false,
                                    attributes: ["id", "role_id", "is_key_manager", "full_name"],
                                }
                            ],
                            order: [["createdAt", "DESC"]],
                            limit: 1
                        }
                    ],
                });
                if (additionalDetails.prepare_details) {
                    if (additionalDetails.prepare_details.verifiedby) {
                        additionalDetails.prepare_details.verifiedby.dataValues.verified_at = additionalDetails.prepare_details.verified_at;
                    }
                    if (Array.isArray(additionalDetails.prepare_details.requests)) {
                        additionalDetails.prepare_details.requests.forEach((request) => {
                            if (request.requested_by) {
                                if (request.requested_by.role_id === 1) {
                                    request.requested_by.dataValues.roleName = request.requested_by.is_key_manager ? 'KMP' : 'Partner';
                                } else if (request.requested_by.role_id === 2) {
                                    request.requested_by.dataValues.roleName = 'Customer';
                                }
                            }
                        });
                    }
                }
            } else if (log.activity && log.activity.includes('Quotation')) {
                additionalDetails.quotation_store = await models.quotation_store.findByPk(log.activity_id, {

                });
            }
            const { user_id, ...restLog } = log.toJSON();
            return { ...restLog, ...additionalDetails };
        }));
        return REST.success(res, {
            activityDetails,
            user_details: user
        }, 'Activity logs fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/storedocuments/:store_uid', async function (req, res) {
    try {
        const storeUid = req.params.store_uid;
        const store = await models.stores.findOne({
            where: { store_uid: storeUid }
        });
        if (!store) {
            return REST.error(res, 'Store not found', 404);
        }

        const documents = await models.user_activity_logs.findAll({
            where: {
                activity_id: store.id,
                activity: {
                    [Op.or]: ["store_compliance_documents", "store_additional_documents"]
                }
            },
            include: [
                {
                    model: models.User,
                    as: "updated_details",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']]
        });

        documents.forEach(documentData => {
            if (documentData.current_data) {
                try {
                    if (typeof documentData.current_data === "string") {
                        documentData.current_data = JSON.parse(documentData.current_data);
                    }
                    if (documentData.current_data.document_type_url) {
                        if (typeof documentData.current_data.document_type_url === "string") {
                            try {
                                documentData.current_data.document_type_url = JSON.parse(documentData.current_data.document_type_url);
                            } catch (e) {
                                documentData.current_data.document_type_url = [documentData.current_data.document_type_url];
                            }
                        }
                    } else {
                        documentData.current_data.document_type_url = [];
                    }

                    if (documentData.current_data.asset_3d_url) {
                        if (typeof documentData.current_data.asset_3d_url === "string") {
                            documentData.current_data.asset_3d_url = [documentData.current_data.asset_3d_url];
                        }
                    }

                    if (documentData.current_data.photo_of_asset_url) {
                        if (typeof documentData.current_data.photo_of_asset_url === "string") {
                            documentData.current_data.photo_of_asset_url = [documentData.current_data.photo_of_asset_url];
                        }
                    }

                } catch (e) {
                    documentData.current_data = {};
                }
            }

            if (documentData.previous_data) {
                try {
                    if (typeof documentData.previous_data === "string") {
                        documentData.previous_data = JSON.parse(documentData.previous_data);
                    }

                    if (documentData.previous_data.document_type_url) {
                        if (typeof documentData.previous_data.document_type_url === "string") {
                            try {
                                documentData.previous_data.document_type_url = JSON.parse(documentData.previous_data.document_type_url);
                            } catch (e) {
                                documentData.previous_data.document_type_url = [documentData.previous_data.document_type_url];
                            }
                        }
                    } else {
                        documentData.previous_data.document_type_url = [];
                    }

                    if (documentData.previous_data.asset_3d_url) {
                        if (typeof documentData.previous_data.asset_3d_url === "string") {
                            documentData.previous_data.asset_3d_url = [documentData.previous_data.asset_3d_url];
                        }
                    }

                    if (documentData.previous_data.photo_of_asset_url) {
                        if (typeof documentData.previous_data.photo_of_asset_url === "string") {
                            documentData.previous_data.photo_of_asset_url = [documentData.previous_data.photo_of_asset_url];
                        }
                    }

                } catch (e) {
                    documentData.previous_data = {};
                }
            }
        });

        documents.forEach(document => {
            if (document.updated_details) {
                document.updated_details.dataValues.updated_at = document.updatedAt;
            }
            if (document.addedby) {
                document.addedby.dataValues.created_at = document.createdAt;
            }
        });

        return REST.success(res, documents, 'Store documents fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/moveDocument/:moveuid', async function (req, res) {
    try {
        const moveUid = req.params.moveuid;
        const move = await models.move_details.findOne({
            where: { move_uid: moveUid }
        });
        if (!move) {
            return REST.error(res, 'Move not found', 404);
        }
        const document = await models.user_activity_logs.findAll({
            where: {
                activity_id: move.id,
                activity: {
                    [Op.or]: ["move_comliance_documents"]
                }
            },
            include: [
                {
                    model: models.User,
                    as: "updated_details",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']]
        });
        document.forEach(document => {
            if (document.updated_details) {
                document.updated_details.dataValues.updated_at = document.updatedAt;
            }
            if (document.addedby) {
                document.addedby.dataValues.created_at = document.createdAt;
            }
        })

        return REST.success(res, document, 'Move document fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/moveVehicleDocument/:firm_id', async function (req, res) {
    try {
        const { firm_id } = req.params;
        const moveFirm = await models.User_firm.findOne({
            where: { id: firm_id }
        });
        if (!moveFirm) return REST.error(res, 'Firm not found', 404);
        
        const document = await models.user_activity_logs.findAll({
            where: {
                activity_id: moveFirm.id,
                activity: {
                    [Op.or]: ["Move_Vehicle_Kyc_Document"]
                }
            },
            include: [
                {
                    model: models.User,
                    as: "updated_details",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']]
        });
        document.forEach(document => {
            if (document.updated_details) {
                document.updated_details.dataValues.updated_at = document.updatedAt;
            }
            if (document.addedby) {
                document.addedby.dataValues.created_at = document.createdAt;
            }
        })

        return REST.success(res, document, 'Move vehicle fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/prepareDocument/:preparuid', async function (req, res) {
    try {
        const prepareUid = req.params.preparuid;
        const prepare = await models.prepare_details.findOne({
            where: { prepare_uid: prepareUid }
        });
        if (!prepare) {
            return REST.error(res, 'Prepare not found', 404);
        }

        const document = await models.user_activity_logs.findAll({
            where: {
                activity_id: prepare.id,
                activity: {
                    [Op.or]: ["prepare_compliance_documents", "prepare_addtional_submission"]
                }
            },
            include: [
                {
                    model: models.User,
                    as: "updated_details",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']]
        });

        document.forEach(documentData => {
            if (documentData.current_data) {
                try {
                    if (typeof documentData.current_data === "string") {
                        documentData.current_data = JSON.parse(documentData.current_data);
                    }

                    if (documentData.current_data.document_type_url) {
                        if (typeof documentData.current_data.document_type_url === "string") {
                            try {
                                documentData.current_data.document_type_url = JSON.parse(documentData.current_data.document_type_url);
                            } catch (e) {
                                documentData.current_data.document_type_url = [documentData.current_data.document_type_url];
                            }
                        }
                    } else {
                        documentData.current_data.document_type_url = [];
                    }

                    if (documentData.current_data.asset_3d_view_url) {
                        if (typeof documentData.current_data.asset_3d_view_url === "string") {
                            documentData.current_data.asset_3d_view_url = [documentData.current_data.asset_3d_view_url];
                        }
                    }

                    if (documentData.current_data.asset_photo_url) {
                        if (typeof documentData.current_data.asset_photo_url === "string") {
                            documentData.current_data.asset_photo_url = [documentData.current_data.asset_photo_url];
                        }
                    }

                } catch (e) {
                    documentData.current_data = {};
                }
            }

            if (documentData.previous_data) {
                try {
                    if (typeof documentData.previous_data === "string") {
                        documentData.previous_data = JSON.parse(documentData.previous_data);
                    }

                    if (documentData.previous_data.document_type_url) {
                        if (typeof documentData.previous_data.document_type_url === "string") {
                            try {
                                documentData.previous_data.document_type_url = JSON.parse(documentData.previous_data.document_type_url);
                            } catch (e) {
                                documentData.previous_data.document_type_url = [documentData.previous_data.document_type_url];
                            }
                        }
                    } else {
                        documentData.previous_data.document_type_url = [];
                    }

                    if (documentData.previous_data.asset_3d_view_url) {
                        if (typeof documentData.previous_data.asset_3d_view_url === "string") {
                            documentData.previous_data.asset_3d_view_url = [documentData.previous_data.asset_3d_view_url];
                        }
                    }

                    if (documentData.previous_data.asset_photo_url) {
                        if (typeof documentData.previous_data.asset_photo_url === "string") {
                            documentData.previous_data.asset_photo_url = [documentData.previous_data.asset_photo_url];
                        }
                    }

                } catch (e) {
                    documentData.previous_data = {};
                }
            }
        });

        document.forEach(document => {
            if (document.updated_details) {
                document.updated_details.dataValues.updated_at = document.updatedAt;
            }
            if (document.addedby) {
                document.addedby.dataValues.created_at = document.createdAt;
            }
        });

        return REST.success(res, document, 'Prepare document fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getUser/:user_uid', async function (req, res) {
    try {
        const findUser = await models.User.findOne({
            where: {
                user_uid: req.params.user_uid
            }
        })
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                user_id: findUser.id
            },
            attributes: ["id", "user_id", "activity", "activity_id", "activity_type", "createdAt", "updatedAt"],
            order: [['createdAt', 'DESC']],
            limit: 1
        })
        return REST.success(res, data, 'User activity logs fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPartnerCsvLogs', async function (req, res) {
    try {
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_type: "partner_csv"
            },
            include: [
                {
                    model: models.User,
                    as: "userDetails",
                    attributes: ["id", "user_uid", "full_name", "email", "phone_number", "createdAt", "updatedAt"]
                },
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']],
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "added_by", "action", "createdAt", "updatedAt"]
        })
        data.forEach(logs => {
            if (logs.addedBy) {
                logs.addedBy.dataValues.created_at = logs.createdAt;
            }
        });
        return REST.success(res, data, 'Get Partner CSVs log Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getFirmCsvLogs/:user_uid', async function (req, res) {
    try {
        const userUid = req.params.user_uid
        const findUser = await models.User.findOne({
            where: {
                user_uid: userUid
            }
        })
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_type: "firm_csv",
                activity_id: findUser.id
            },
            include: [
                {
                    model: models.User,
                    as: "userDetails",
                    attributes: ["id", "user_uid", "full_name", "email", "phone_number", "createdAt", "updatedAt"]
                },
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']],
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "added_by", "action", "createdAt", "updatedAt"]
        })
        data.forEach(logs => {
            if (logs.addedBy) {
                logs.addedBy.dataValues.created_at = logs.createdAt;
            }
        });
        return REST.success(res, data, 'Get Firm CSV logs Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getStoreCsvLogs/:firm_uid', async function (req, res) {
    try {
        const firmUid = req.params.firm_uid;
        const findFirm = await models.User_firm.findOne({
            where: { firm_uid: firmUid }
        });
        if (!findFirm) {
            return REST.error(res, 'Firm not found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_type: "store_csv",
                activity_id: findFirm.id
            },
            include: [
                {
                    model: models.User,
                    as: "userDetails",
                    attributes: [
                        "id", "user_uid", "full_name", "email",
                        "phone_number", "createdAt", "updatedAt"
                    ]
                },
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']],
            attributes: [
                "id", "user_id", "activity", "activity_type",
                "current_data", "added_by", "action", "createdAt", "updatedAt"
            ]
        });

        data.forEach(logs => {
            if (logs.addedBy) {
                logs.addedBy.dataValues.created_at = logs.createdAt;
            }
        });

        return REST.success(res, data, 'Get Store CSV logs Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getMoveCsvLogs/:firm_uid', async function (req, res) {
    try {
        const firmUid = req.params.firm_uid;
        const findFirm = await models.User_firm.findOne({
            where: { firm_uid: firmUid }
        });
        if (!findFirm) {
            return REST.error(res, 'Firm not found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_type: "move_csv",
                activity_id: findFirm.id
            },
            include: [
                {
                    model: models.User,
                    as: "userDetails",
                    attributes: ["id", "user_uid", "full_name", "email", "phone_number", "createdAt", "updatedAt"]
                },
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']],
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "added_by", "action", "createdAt", "updatedAt"]
        })
        data.forEach(logs => {
            if (logs.addedBy) {
                logs.addedBy.dataValues.created_at = logs.createdAt;
            }
        });
        return REST.success(res, data, 'Get Move CSV logs Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPrepareCsvLogs/:firm_uid', async function (req, res) {
    try {
        const firmUid = req.params.firm_uid;
        const findFirm = await models.User_firm.findOne({
            where: { firm_uid: firmUid }
        });
        if (!findFirm) {
            return REST.error(res, 'Firm not found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_type: "prepare_csv",
                activity_id: findFirm.id
            },
            include: [
                {
                    model: models.User,
                    as: "userDetails",
                    attributes: ["id", "user_uid", "full_name", "email", "phone_number", "createdAt", "updatedAt"]
                },
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']],
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "added_by", "action", "createdAt", "updatedAt"]
        })
        data.forEach(logs => {
            if (logs.addedBy) {
                logs.addedBy.dataValues.created_at = logs.createdAt;
            }
        });
        return REST.success(res, data, 'Get Prepare CSV logs Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getCustomerCsvLogs', async function (req, res) {
    try {
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_type: "customer_csv"
            },
            include: [
                {
                    model: models.User,
                    as: "userDetails",
                    attributes: ["id", "user_uid", "full_name", "email", "phone_number", "createdAt", "updatedAt"]
                },
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']],
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "added_by", "action", "createdAt", "updatedAt"]
        })
        data.forEach(logs => {
            if (logs.addedBy) {
                logs.addedBy.dataValues.created_at = logs.createdAt;
            }
        });
        return REST.success(res, data, 'Get Partner CSV logs Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/customerFirmCsvLogs/:user_uid', async function (req, res) {
    try {
        const userUid = req.params.user_uid
        const findUser = await models.User.findOne({
            where: {
                user_uid: userUid
            }
        })
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_type: "customerfirm_csv",
                activity_id: findUser.id
            },
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "added_by", "action", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "userDetails",
                    attributes: ["id", "user_uid", "full_name", "email", "phone_number", "createdAt", "updatedAt"]
                },
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']],
        })
        data.forEach(logs => {
            if (logs.addedBy) {
                logs.addedBy.dataValues.created_at = logs.createdAt;
            }
        });
        return REST.success(res, data, 'Get Customer Firm CSV logs Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/QuotationCsvLogs/:user_uid', async function (req, res) {
    try {
        const userUid = req.params.user_uid
        const findUser = await models.User.findOne({
            where: {
                user_uid: userUid
            }
        })
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_type: "Quotation_csv",
                activity_id: findUser.id
            },
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "added_by", "action", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "userDetails",
                    attributes: ["id", "user_uid", "full_name", "email", "phone_number", "createdAt", "updatedAt"]
                },
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']],
        })
        data.forEach(logs => {
            if (logs.addedBy) {
                logs.addedBy.dataValues.created_at = logs.createdAt;
            }
        });
        return REST.success(res, data, 'Get Quotation CSV logs Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getManager/:id', async function (req, res) {
    try {
        const findUser = await models.User.findOne({
            where: {
                id: req.params.id
            }
        })
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                user_id: findUser.id,
                activity: "Manager"
            },
            include: [
                {
                    model: models.User,
                    as: "user_details"
                },
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "updated_details",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [['id', 'DESC']],
        })
        data.forEach(logs => {
            if (logs.previous_data && logs.previous_data.permissions) {
                logs.previous_data.page = logs.previous_data.permissions;
                delete logs.previous_data.permissions;
            }

            if (logs.previous_data && logs.previous_data.page) {
                logs.previous_data.page = logs.previous_data.page.map(data => ({
                    id: data.id,
                    page_name: data.page_name,
                    is_permission: data.is_permission
                }))
            }
            if (logs.current_data) {
                const { city, email, status, full_name, department, phone_number, password, ...rest } = logs.current_data;
                logs.current_data = { ...rest, user: { city, email, status, full_name, department, phone_number } };
            }
            if (logs.previous_data && logs.previous_data.user) {
                logs.previous_data.user = {
                    city: logs.previous_data.user.city,
                    email: logs.previous_data.user.email,
                    status: logs.previous_data.user.status,
                    full_name: logs.previous_data.user.full_name,
                    department: logs.previous_data.user.department,
                    phone_number: logs.previous_data.user.phone_number
                }
            }
            if (logs.addedBy) {
                logs.dataValues.addedBy.dataValues.created_at = logs.createdAt;
            }
            if (logs.updated_details) {
                logs.updated_details.dataValues.updated_at = logs.updatedAt
            }
        });

        return REST.success(res, data, 'Manager Logs fetched sucessfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getMoveVendorLogs', async function (req, res) {
    try {
        const data = await models.user_activity_logs.findAll({
            where: {
                activity: "Move Vendors"
            },
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "action", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]]
        })
        data.forEach(move => {
            if (move.addedBy) {
                move.addedBy.dataValues.created_at = move.createdAt
            }
        })
        return REST.success(res, data, 'Move Vendor Logs fetched sucessfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getMoveCustomerVendorLogs', async function (req, res) {
    try {
        const data = await models.user_activity_logs.findAll({
            where: {
                activity: "Customer_vendors"
            },
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "action", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]]
        })
        data.forEach(move => {
            if (move.addedBy) {
                move.addedBy.dataValues.created_at = move.createdAt
            }
        })
        return REST.success(res, data, 'Move Vendor Logs fetched sucessfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getStoreVendorLogs', async function (req, res) {
    try {
        const data = await models.user_activity_logs.findAll({
            where: {
                activity: "partner_store"
            },
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "action", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]]
        })
        data.forEach(move => {
            if (move.addedBy) {
                move.addedBy.dataValues.created_at = move.createdAt
            }
        })
        return REST.success(res, data, 'Store Vendor Logs fetched sucessfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPrepareVendorLogs', async function (req, res) {
    try {
        const data = await models.user_activity_logs.findAll({
            where: {
                activity: "partner_prepare"
            },
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "action", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]]
        })
        data.forEach(move => {
            if (move.addedBy) {
                move.addedBy.dataValues.created_at = move.createdAt
            }
        })
        return REST.success(res, data, 'Prepare Vendor Logs fetched sucessfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
const filterDataAccordingToData = (params) => {
    const { today, months, week, start_date, end_date } = params;
    const filter = {};
    const startDate = new Date();
    const endDate = new Date();
    const setStartOfDay = (date) => date.setHours(0, 0, 0, 0);
    const setEndOfDay = (date) => date.setHours(23, 59, 59, 999);
    if (today) {
        setStartOfDay(startDate);
        setEndOfDay(endDate);
    } else if (months) {
        startDate.setMonth(startDate.getMonth() - 1);
        setStartOfDay(startDate);
        setEndOfDay(endDate);
    } else if (week) {
        startDate.setDate(startDate.getDate() - 7);
        setStartOfDay(startDate);
        setEndOfDay(endDate);
    } else if (start_date && end_date) {
        startDate.setTime(new Date(start_date).getTime());
        endDate.setTime(new Date(end_date).getTime());
        setEndOfDay(endDate);
    } else {
        return filter;
    }
    filter.createdAt = { [Op.between]: [startDate, endDate] };
    return filter;
}
router.get('/getAuditlogs/:store_uid', async function (req, res) {
    try {
        const filter = filterDataAccordingToData(req.query)
        const storeUid = req.params.store_uid
        const findStore = await models.stores.findOne({
            where: {
                store_uid: storeUid
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_id: findStore.id,
                activity_type: "audit_document",
                ...filter,
            },
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "updated_details",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [[
                "id", "DESC"
            ]]
        })
        data.forEach(audit => {
            if (audit.addedBy) {
                audit.addedBy.dataValues.created_at = audit.dataValues.createdAt
            }
            if (audit.updated_details) {
                audit.updated_details.dataValues.updated_at = audit.dataValues.updatedAt
            }
        })
        return REST.success(res, data, 'Audit Logs Get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getCustomerAudit/:store_quotation_id', async function (req, res) {
    try {
        const filter = filterDataAccordingToData(req.query);
        const quotationUid = req.params.store_quotation_id;
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: quotationUid
            }
        });

        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_id: findQuotation.id,
                activity_type: "customer_audit",
                ...filter
            },
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "updated_details",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]]
        });

        for (const audit of data) {
            if (audit.addedBy) {
                audit.addedBy.dataValues.created_at = audit.dataValues.createdAt;
            }
            if (audit.updated_details) {
                audit.updated_details.dataValues.updated_at = audit.dataValues.updatedAt;
            }
            const storeId = audit.dataValues.current_data.store_id;
            if (storeId) {
                const findStore = await models.stores.findOne({
                    where: { id: storeId },
                    include: [
                        {
                            model: models.User,
                            as: "user"
                        }
                    ]
                });
                if (findStore) {
                    audit.dataValues.store_details = findStore;
                }
            }
        }
        return REST.success(res, data, 'Audit Logs Retrieved Successfully with Store Details');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getLegalLogs/:store_id', async function (req, res) {
    try {
        const storeUid = req.params.store_id
        const findStore = await models.stores.findOne({
            where: {
                store_uid: storeUid
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_id: findStore.id,
                activity_type: "legal_document",
                activity: "Store"
            },
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "updated_details",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [[
                "id", "DESC"
            ]]
        })
        data.forEach(legal => {
            if (legal.addedBy) {
                legal.addedBy.dataValues.created_at = legal.dataValues.createdAt
            }
            if (legal.updated_details) {
                legal.updated_details.dataValues.updated_at = legal.dataValues.updatedAt
            }
        })
        return REST.success(res, data, 'Get Legal Logs successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getLegalDocument/:legal_id', async function (req, res) {
    try {
        const legalId = req.params.legal_id
        const findLegal = await models.legal_document_action.findAll({
            where: {
                legal_id: legalId,
            },
            order: [["id", "DESC"]]
        })
        if (findLegal.length === 0) {
            return REST.error(res, 'legal not found', 404);
        }
        const groupedByBlockId = findLegal.reduce((acc, item) => {
            const key = item.block_id;
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(item);
            return acc;
        }, {});
        return REST.success(res, groupedByBlockId, 'Legal Document Logs Fetched Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getQuotationLogs/:store_quotation_id', async function (req, res) {
    try {
        const quoataionUid = req.params.store_quotation_id
        const findQuotation = await models.quotation_store.findOne({
            where: { store_quotation_id: quoataionUid }
        })
        if (!findQuotation) {
            return REST.error(res, 'Quotation Id Not Found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_id: findQuotation.id,
                activity_type: "store_quotations"
            },
            include: [
                {
                    model: models.User,
                    as: "user_details"
                },
                {
                    model: models.User,
                    as: "updated_details",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                },
            ],
            order: [["id", "DESC"]]
        })
        data.forEach(quotation => {
            if (quotation.updated_details) {
                quotation.updated_details.dataValues.updated_at = quotation.dataValues.updatedAt
            }
            if (quotation.addedBy) {
                quotation.addedBy.dataValues.created_at = quotation.dataValues.createdAt
            }
        })
        return REST.success(res, data, 'Quotation Logs Fetched Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getStartDateLogs/:store_uid', async function (req, res) {
    try {
        const storeUid = req.params.store_uid
        const findStore = await models.stores.findOne({
            where: {
                store_uid: storeUid
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store Id Not Found', 404);
        }
        const data = await models.user_activity_logs.findAll({
            where: {
                activity_id: findStore.id,
                activity_type: "lease_date"
            },
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "updated_details",
                    attributes: ["id", "full_name"]
                }
            ]
        })
        data.forEach(legal => {
            if (legal.addedBy) {
                legal.addedBy.dataValues.created_at = legal.dataValues.createdAt
            }
            if (legal.updated_details) {
                legal.updated_details.dataValues.updated_at = legal.dataValues.updatedAt
            }
        })
        return REST.success(res, data, 'Get Logs Fetched Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getCustomerStoreVendorLogs', async function (req, res) {
    try {
        const data = await models.user_activity_logs.findAll({
            where: {
                activity: "customer_store"
            },
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "action", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]]
        })
        data.forEach(move => {
            if (move.addedBy) {
                move.addedBy.dataValues.created_at = move.createdAt
            }
        })
        return REST.success(res, data, 'Store Vendor Logs fetched sucessfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getCustomerPrepareLogs', async function (req, res) {
    try {
        const data = await models.user_activity_logs.findAll({
            where: {
                activity: "customer_prepare"
            },
            attributes: ["id", "user_id", "activity", "activity_type", "current_data", "action", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]]
        })
        data.forEach(move => {
            if (move.addedBy) {
                move.addedBy.dataValues.created_at = move.createdAt
            }
        })
        return REST.success(res, data, 'Prepare Vendor Logs fetched sucessfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPalletsLogs/:store_quotation_id', async function (req, res) {
    try {
        const quotationUid = req.params.store_quotation_id;

        const findQuotation = await models.quotation_store.findOne({
            where: { store_quotation_id: quotationUid }
        });

        if (!findQuotation) {
            return REST.error(res, 'Quotation ID Not Found', 404);
        }

        const data = await models.user_activity_logs.findAll({
            where: {
                activity_id: findQuotation.id,
                activity_type: "pallets_assigned"
            },
            include: [
                {
                    model: models.User,
                    as: "addedBy",
                    attributes: ["id", "full_name"]
                },
            ],
            order: [["id", "DESC"]]
        });
        for (const log of data) {
            if (log.addedBy) {
                log.addedBy.dataValues.created_at = log.dataValues.createdAt;
            }
            const currentData = typeof log.dataValues.current_data === 'string'
                ? JSON.parse(log.dataValues.current_data)
                : log.dataValues.current_data;
            const storeId = currentData.type_id;
            const userId = currentData.user_id;
            const chamberId = currentData.chamber_id;

            const findStore = await models.stores.findOne({
                where: { id: storeId }
            });

            const findUser = await models.User.findOne({
                where: { id: userId },
            });
            const findChamber = await models.store_chambers.findOne({
                where: {
                    id: chamberId
                }
            })
            log.dataValues.store_details = findStore || null;
            log.dataValues.user_details = findUser || null;
            log.dataValues.chamber_details = findChamber || null
        }

        return REST.success(res, data, 'Get Pallets Fetched Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getTermsAndCondtionLogs', async function (req, res) {
    try {
        const activity = req.query.activity
        let data
        if (activity == "TermsAndCondtion") {
            data = await models.user_activity_logs.findAll({
                where: {
                    activity: "TermsAndCondtion"
                },
                include: [
                    {
                        model: models.User,
                        as: "addedBy",
                        attributes: ["id", "full_name"]
                    },
                    {
                        model: models.User,
                        as: "updated_details",
                        attributes: ["id", "full_name"]
                    }
                ],
                order: [["id", "DESC"]]
            })
            data.forEach(legal => {
                if (legal.addedBy) {
                    legal.addedBy.dataValues.created_at = legal.dataValues.createdAt
                }
                if (legal.updated_details) {
                    legal.updated_details.dataValues.updated_at = legal.dataValues.updatedAt
                }
            })
            return REST.success(res, data, 'Get Logs Fetched Successfully');
        } else if (activity == "AppVersion") {
            data = await models.user_activity_logs.findAll({
                where: {
                    activity: "AppVersion"
                },
                include: [
                    {
                        model: models.User,
                        as: "addedBy",
                        attributes: ["id", "full_name"]
                    },
                    {
                        model: models.User,
                        as: "updated_details",
                        attributes: ["id", "full_name"]
                    }
                ],
                order: [["id", "DESC"]]
            })
            data.forEach(legal => {
                if (legal.addedBy) {
                    legal.addedBy.dataValues.created_at = legal.dataValues.createdAt
                }
                if (legal.updated_details) {
                    legal.updated_details.dataValues.updated_at = legal.dataValues.updatedAt
                }
            })
        }
        return REST.success(res, data, 'Get Logs Fetched Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router