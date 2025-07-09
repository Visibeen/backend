const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();

/*
|----------------------------------------------------------------------------------------------------------------
|               Document Url Logs Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/storeComplianceDocumentlogs', async function (req, res) {
    const cUser = req.body.current_user;
    const document_type = req.query.document_type;
    const validDocumentTypes = [
        "fsssai_license_url", "iso_certificate_url", "haccp_url",
        "post_control_url", "brc_audit_url", "fire_safety_noc_url",
        "pollution_noc_url", "mcd_license_url", "up_cold_storage_license_url",
        "factory_license_url", "panchayat_noc_url"
    ];

    if (!validDocumentTypes.includes(document_type)) {
        return REST.error(res, "Invalid document type", 400);
    }

    try {
        const data = await models.document_common_logs.findAll({
            where: {
                type: "store_compliance_details",
                document_type: document_type,
            },
            attributes: ["id", "user_id", "type", "type_id", "document_type", "document_type_url", "action", "updated_by", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "updatedby",
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
        data.forEach(record => {
            if (record.updatedby) {
                record.updatedby.dataValues.updated_at = record.dataValues.updatedAt;
            }
        });
        data.forEach(record => {
            if (record.addedby) {
                record.addedby.dataValues.created_at = record.dataValues.createdAt;
            }
        });
        return REST.success(res, data, "Get Store Compliance Document Logs");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/storeAddtionalDocumentLogs', async function (req, res) {
    try {
        const document_type = req.query.document_type;
        const validDocumentTypes = [
            "no_lien_certificate_url",
            "latest_electricity_bill_url",
            "structural_safety_cerfificate_url",
            "insurance_certificate_url",
            "plant_layout_url",
            "storage_temperature_url",
            "asset_3d_url",
            "photo_of_asset_url"
        ];

        if (!validDocumentTypes.includes(document_type)) {
            return REST.error(res, "Invalid document type", 400);
        }
        const data = await models.document_common_logs.findAll({
            where: {
                type: "store_additional_submissions",
                document_type: document_type,
            },
            attributes: ["id", "user_id", "type", "type_id", "document_type", "document_type_url", "action", "updated_by", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "updatedby",
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

        data.forEach(record => {
            if (record.updatedby) {
                record.updatedby.dataValues.updated_at = record.dataValues.updatedAt;
            }
        });
        data.forEach(record => {
            if (record.addedby) {
                record.addedby.dataValues.created_at = record.dataValues.createdAt;
            }
        });

        return REST.success(res, data, "Get Store Additional Document Logs");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/moveVehiclesDocumentLogs', async function (req, res) {
    try {
        const document_type = req.query.document_type;
        const validDocumentTypes = [
            "pan_document", "aadhar_front", "aadhar_back",
            "driving_licence_front", "driving_licence_back", "cancelled_cheque",
            "tds_certificate", "msme_certificate", "gst_certificate", "visiting_card",
            "registration_certificate"
        ];

        if (!validDocumentTypes.includes(document_type)) {
            return REST.error(res, "Invalid document type", 400);
        }
        const data = await models.document_common_logs.findAll({
            where: {
                type: "move_vehicle_kyc",
                document_type: document_type,
            },
            attributes: ["id", "user_id", "type", "type_id", "document_type", "document_type_url", "action", "updated_by", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "updatedby",
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

        data.forEach(record => {
            if (record.updatedby) {
                record.updatedby.dataValues.updated_at = record.dataValues.updatedAt;
            }
        });
        data.forEach(record => {
            if (record.addedby) {
                record.addedby.dataValues.created_at = record.dataValues.createdAt;
            }
        });
        return REST.success(res, data, "Get Move Vehicles Document Logs");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/moveComplianceDocumentLogs', async function (req, res) {
    const cUser = req.body.current_user;

    try {
        const document_type = req.query.document_type;
        const validDocumentTypes = ["permit_url", "pucc_url", "insurance_policy", "fitness_certificate", "no_entry_permit"];

        if (!validDocumentTypes.includes(document_type)) {
            return REST.error(res, "Invalid document type", 400);
        }

        const data = await models.document_common_logs.findAll({
            where: {
                type: "move_compliance_details",
                document_type: document_type,
            },
            attributes: ["id", "user_id", "type", "type_id", "document_type", "document_type_url", "action", "updated_by", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "updatedby",
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

        data.forEach(record => {
            if (record.updatedby) {
                record.updatedby.dataValues.updated_at = record.dataValues.updatedAt;
            }
        });
        data.forEach(record => {
            if (record.addedby) {
                record.addedby.dataValues.created_at = record.dataValues.createdAt;
            }
        });
        return REST.success(res, data, "Get Move Compliance Document Logs");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/prepareComplianceDocumentLogs', async function (req, res) {
    try {
        const document_type = req.query.document_type;
        const validDocumentTypes = [
            "fsssai_license_url", "iso_certificate_url", "haccp_url",
            "pest_control_agency_contract_url", "brc_audit_url",
            "fire_safety_noc_url", "pollution_noc_url", "mcd_license_url",
            "up_cold_storage_license_url", "factory_license_url",
            "panchayat_noc_url"
        ];

        if (!validDocumentTypes.includes(document_type)) {
            return REST.error(res, "Invalid document type", 400);
        }

        const data = await models.document_common_logs.findAll({
            where: {
                type: "prepare_compliance_details",
                document_type: document_type,
            },
            attributes: ["id", "user_id", "type", "type_id", "document_type", "document_type_url", "action", "updated_by", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "updatedby",
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

        data.forEach(record => {
            if (record.updatedby) {
                record.updatedby.dataValues.updated_at = record.dataValues.updatedAt;
            }
        });
        data.forEach(record => {
            if (record.addedby) {
                record.addedby.dataValues.created_at = record.dataValues.createdAt;
            }
        })

        return REST.success(res, data, "Get Prepare Compliance Document Logs");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/prepareAdditionalDocumentsLogs', async function (req, res) {
    try {
        const document_type = req.query.document_type;
        const validDocumentTypes = [
            "no_lien_certificate_url", "electricity_bill_url",
            "structural_load_safety_certificate_url", "insurance_certificate_url",
            "facility_layout_url", "storage_temperature_url",
            "asset_3d_view_url", "asset_photo_url"
        ];
        if (!validDocumentTypes.includes(document_type)) {
            return REST.error(res, "Invalid document type", 400);
        }

        const data = await models.document_common_logs.findAll({
            where: {
                type: "prepare_additional_submissions",
                document_type: document_type,
            },
            attributes: ["id", "user_id", "type", "type_id", "document_type", "document_type_url", "action", "updated_by", "added_by", "createdAt", "updatedAt"],
            include: [
                {
                    model: models.User,
                    as: "updatedby",
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
        data.forEach(record => {
            if (record.updatedby) {
                record.updatedby.dataValues.updated_at = record.dataValues.updatedAt;
            }
        });
        data.forEach(record => {
            if (record.addedby) {
                record.addedby.dataValues.created_at = record.dataValues.createdAt;
            }
        });

        return REST.success(res, data, "Get Prepare Additional Documents Logs");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getAssignedPalletLogs/:type_id', async function (req, res) {
    try {
        const storeUid = req.params.type_id
        const findStore = await models.stores.findOne({
            where: {
                store_uid: storeUid
            }
        })
        if (!findStore) {
            return REST.error(res, 'Store Uid Not Found', 404)
        }
        const data = await models.document_common_logs.findAll({
            where: {
                type: "Store",
                type_id: findStore.id
            },
            include: [
                {
                    model: models.stores,
                    as: "storeDetails",
                    include: [
                        {
                            model: models.store_chambers,
                            as: "table_of_chamber",
                            attributes: {
                                exclude: ["photo_of_entrance", "photo_of_chamber"]
                            },
                        },
                    ],
                }
            ],
            attributes: ["id", "user_id", "type", "type_id", "action", "remarks", "added_by", "createdAt", "updatedAt"],
            order: [['id', 'DESC']]
        });
        return REST.success(res, data, "Get Assigned Pallets Logs Success");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router