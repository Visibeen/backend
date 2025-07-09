const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const { LOG } = require('../../../constants');
const router = express.Router();

/*
|----------------------------------------------------------------------------------------------------------------
|              Quotation Timeline Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/getQuotationLogs/:store_quotation_id', async function (req, res) {
    try {
        const quotationId = req.params.store_quotation_id;
        const findQuotation = await models.quotation_store.findOne({
            where: {
                store_quotation_id: quotationId
            },
        });

        if (!findQuotation) {
            return REST.error(res, 'Quotation not found', 404);
        }

        const findlogs = await models.quotation_action.findAll({
            where: {
                quotation_id: findQuotation.id,
            },
            include: [
                {
                    model: models.quotation_store,
                    as: "quotationDetails",
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"],
                },
                {
                    model: models.User,
                    as: "updatedBy",
                    attributes: ["id", "full_name"],
                },
            ],
            order: [["id", "DESC"]],
        });

        findlogs.forEach(document => {
            if (document.addedby) {
                document.addedby.dataValues.created_at = document.createdAt;
            }
            if (document.updatedBy) {
                document.updatedBy.dataValues.updated_at = document.updatedAt;
            }
        });

        const response = {
            "Quotation_request_received": [],
            "Suggest_Partner": [],
            "Audit_Documents": [],
            "Audit_Status": [],
            "Interested_Partner": [],
            "Quotation_document": [],
            "negotiation": [],
            "quotation_completed": [],
            "legal_document_uploaded": [],
            "Legal_Document_received": [],
            "Assign_Assets": [],
            "Complete": [],
            "Terminate": [],
            "Decline": [],
            "quotation_renewed": [],
            "renew_negotiation": [],
            "renew_quotation_completed": [],
            "renew_legal_received": [],
            "renew_quotation_received": [],
            "renew_asset_suggested": [],
            "renew_legal_uploaded": [],
            "renew_onboard": [],
            "onboard": [],
            "due_for_renewal": []
        };

        findlogs.forEach(log => {
            const logEntry = {
                createdAt: log.createdAt,
                updatedAt: log.updatedAt,
                status: log.status,
                added_by: log.added_by,
                updated_by: log.updated_by,
                addedby: log.addedby,
                updatedBy: log.updatedBy,
            };
            switch (log.quotation_action) {
                case 'Quotation_request_received':
                    response.Quotation_request_received.push(logEntry);
                    break;
                case 'Suggest_Partner':
                    response.Suggest_Partner.push(logEntry);
                    break;
                case 'Audit_Documents':
                    response.Audit_Documents.push(logEntry);
                    break;
                case 'Audit_Status':
                    response.Audit_Status.push(logEntry);
                    break;
                case 'Interested_Partner':
                    response.Interested_Partner.push(logEntry);
                    break;
                case 'Quotation_document':
                    response.Quotation_document.push(logEntry);
                    break;
                case 'negotiation':
                    response.negotiation.push(logEntry);
                    break;
                case 'quotation_completed':
                    response.quotation_completed.push(logEntry);
                    break;
                case 'legal_document_uploaded':
                    response.legal_document_uploaded.push(logEntry);
                    break;
                case 'Legal_Document_received':
                    response.Legal_Document_received.push(logEntry);
                    break;
                case 'Assign_Assets':
                    response.Assign_Assets.push(logEntry);
                    break;
                case 'Complete':
                    response.Complete.push(logEntry);
                    break;
                case 'Terminate':
                    response.Terminate.push(logEntry);
                    break;
                case 'Decline':
                    response.Decline.push(logEntry);
                    break;
                case 'quotation_renewed':
                    response.quotation_renewed.push(logEntry);
                    break;
                case 'renew_negotiation':
                    response.renew_negotiation.push(logEntry);
                    break;
                case 'renew_quotation_completed':
                    response.renew_quotation_completed.push(logEntry);
                    break;
                case 'renew_legal_received':
                    response.renew_legal_received.push(logEntry);
                    break;
                case 'renew_quotation_received':
                    response.renew_quotation_received.push(logEntry);
                    break;
                case 'renew_asset_suggested':
                    response.renew_asset_suggested.push(logEntry);
                    break;
                case 'renew_legal_uploaded':
                    response.renew_legal_uploaded.push(logEntry);
                    break;
                case 'renew_onboard':
                    response.renew_onboard.push(logEntry);
                    break;
                case 'onboard':
                    response.onboard.push(logEntry);
                    break;
                default:
                    break;
            }
        });

        findlogs.forEach(log => {
            if (log.status === "due_for_renewal") {
                response.due_for_renewal.push({
                    createdAt: log.createdAt,
                    updatedAt: log.updatedAt,
                    status: log.status,
                    updated_by: log.updated_by,
                    updatedBy: log.updatedBy,
                });
            }
        });

        return REST.success(res, response, 'Quotation Logs fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router



