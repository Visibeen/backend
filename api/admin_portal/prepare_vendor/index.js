const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const AWS = require('aws-sdk');
const { LOG } = require('../../../constants');
const path = require('path');
const router = express.Router();
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
/*
|----------------------------------------------------------------------------------------------------------------
|                             Prepare Vendors Partner Api's
|----------------------------------------------------------------------------------------------------------------
*/
const headerMap = {
    "Location": "location",
    "State": "state",
    "Company Name": "company_name",
    "Contact Person": "contact_person",
    "Address": "address",
    "Mobile Number": "mobile_number",
    "Email": "email"
};
router.post('/PrepareVendorCsv', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        if (req.body.type !== 'partner' && req.body.type !== 'customer') {
            return REST.error(res, "Invalid type. Only 'partner' or 'customer' is allowed.", 400);
        }
        if (!req.files || !req.files.csv) {
            return REST.error(res, "No CSV file was uploaded.", 400);
        }
        const activityName = req.body.type === 'partner' ? 'partner_prepare' : 'customer_prepare';
        const csvFile = req.files.csv;
        const findCsvName = path.basename(csvFile.name);
        const csvData = csvFile.data.toString("utf8").trim();
        const rows = csvData.split("\n").map(row => row.trim()).filter(row => row);
        if (rows.length < 2) {
            return REST.error(res, "CSV must contain at least one data row.", 400);
        }
        const fileName = `${findCsvName}`;
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: csvFile.data,
            ContentType: 'text/csv',
            ACL: 'public-read'
        };
        const uploadResult = await s3.upload(params).promise();
        console.log(uploadResult.Location, "uploadResult");
        const rawHeaders = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim());
        const dataRows = rows.slice(1);
        const mappedHeaders = rawHeaders.map(header => headerMap[header]);
        if (mappedHeaders.includes(undefined)) {
            const missing = rawHeaders.filter((h, i) => !mappedHeaders[i]);
            return REST.error(res, `Unrecognized headers in CSV: ${missing.join(", ")}`, 400);
        }

        const records = dataRows.map(row => {
            const values = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(val => val.trim());
            const record = {};
            mappedHeaders.forEach((fieldName, index) => {
                record[fieldName] = values[index] || null;
            });
            record.added_by = cUser.id;
            record.type = req.body.type
            return record;
        });
        await models.prepare_vendor.bulkCreate(records);
        await models.user_activity_logs.create({
            user_id: cUser.id,
            activity: activityName,
            activity_type: findCsvName,
            current_data: uploadResult.Location,
            action: "Accepted",
            added_by: cUser.id
        })
        return REST.success(res, "Prepare Vendors Csv Upload Successfully.");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post('/addPrepareVendor', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        if (req.body.type !== 'partner' && req.body.type !== 'customer') {
            return REST.error(res, "Invalid type. Only 'partner' or 'customer' is allowed.", 400);
        }
        const createPrepareVendor = await models.sequelize.transaction(async (transaction) => {
            const data = await models.prepare_vendor.create({
                type: req.body.type,
                location: req.body.location,
                state: req.body.state,
                company_name: req.body.company_name,
                contact_person: req.body.contact_person,
                address: req.body.address,
                mobile_number: req.body.mobile_number,
                email: req.body.email,
                added_by: cUser.id
            },
                {
                    transaction: transaction
                }
            )
            return data
        })
        await models.user_activity_logs.create({
            user_id: cUser.id,
            activity: 'prepare_vendor',
            activity_type: "prepare_csv",
            current_data: createPrepareVendor,
            action: "Accepted",
            added_by: cUser.id
        })
        return REST.success(res, createPrepareVendor, 'Prepare Vendors Csv data upload successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPrepareVendorCsv', async function (req, res) {
    const type = req.query.type;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;

    try {
        const { globalSearch } = req.query;
        let globalSearchFilter = {};
        if (globalSearch) {
            const search = globalSearch.split(',').map(term => term.trim());
            globalSearchFilter = {
                [Op.or]: [
                    ...search.map(term => ({ location: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ state: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ company_name: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ contact_person: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ address: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ mobile_number: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ email: { [Op.like]: `%${term}%` } })),
                ]
            };
        }

        const whereCondition = {
            type: type === 'partner' ? 'partner' : 'customer',
            ...globalSearchFilter
        };
        const totalCount = await models.prepare_vendor.count({ where: whereCondition });
        const totalPages = Math.ceil(totalCount / pageSize);
        const data = await models.prepare_vendor.findAll({
            where: whereCondition,
            include: [
                {
                    model: models.User,
                    as: "PrepareAddedby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "PrepareUpdatedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]],
            offset,
            limit: pageSize,
        });

        data.forEach(prepare => {
            if (prepare.PrepareAddedby) {
                prepare.PrepareAddedby.dataValues.created_at = prepare.createdAt;
            }
            if (prepare.PrepareUpdatedBy) {
                prepare.PrepareUpdatedBy.dataValues.updated_at = prepare.updatedAt;
            }
        });

        const responseKey = type === "partner" ? "preparePartner" : "prepareCustomer";
        const message = `Get ${type === "partner" ? "Partner" : "Customer"} Prepare Vendor Data Successfully`;
        return REST.success(res, {
            [responseKey]: data,
            pagination: {
                totalCount,
                totalPages,
                currentPage: page,
                pageSize,
            },
        }, message);

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.put('/updatePreparVendors/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findVendor = await models.prepare_vendor.findOne({
            where: {
                id: req.params.id
            }
        });
        if (!findVendor) {
            return REST.error(res, 'Vendor not found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            const data = await models.prepare_vendor.update({
                location: req.body.location,
                state: req.body.state,
                company_name: req.body.company_name,
                contact_person: req.body.contact_person,
                address: req.body.address,
                mobile_number: req.body.mobile_number,
                email: req.body.email,
                updated_by: cUser.id
            }, {
                where: {
                    id: req.params.id
                },
                transaction: transaction
            });

            return data;
        });
        const newVendor = await models.prepare_vendor.findOne({
            where: {
                id: req.params.id
            }
        })
        const previousData = findVendor.dataValues
        const currentDocs = newVendor.dataValues
        await models.user_activity_logs.create({
            user_id: cUser.id,
            activity: "Prepare Vendor",
            activity_id: findVendor.id,
            activity_type: "update_prepare_vendor",
            previous_data: previousData,
            current_data: currentDocs,
            updated_by: cUser.id,
            action: "Updated"
        });
        return REST.success(res, newVendor, 'Prepare Vendor Updated Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router