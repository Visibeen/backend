const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const AWS = require('aws-sdk');
const path = require('path');
const { sendEmail, sendSubManager } = require('../../../utils/helper');
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
/*
|----------------------------------------------------------------------------------------------------------------
|                             Moves Vendors Partner Api's
|----------------------------------------------------------------------------------------------------------------
*/

const headerMap = {
    "Vendor Name": "vendor_name",
    "Email": "email",
    "Contact Person": "contact_person",
    "Moblie No": "phone_number",
    "Region Location": "region",
    "32 FT": "ft_32",
    "24 FT": "ft_24",
    "22 FT": "ft_22",
    "20 FT": "ft_20",
    "17 FT": "ft_17",
    "407": "model_407",
    "Bolero": "bolero",
    "Tata Ace": "tata_ace",
    "Remark": "remark",
    "Route Served(Mention city to city)": "route_served"
};
router.post('/uploadMoveVendorCsv', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        if (req.body.type !== 'partner') {
            return REST.error(res, "Invalid type. Only 'partner' is allowed.", 400);
        }
        if (!req.files || !req.files.csv) {
            return REST.error(res, "No CSV file was uploaded.", 400);
        }
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
        await models.move_vendor.bulkCreate(records);
        await models.user_activity_logs.create({
            user_id: cUser.id,
            activity: 'Move Vendors',
            activity_type: findCsvName,
            current_data: uploadResult.Location,
            action: "Accepted",
            added_by: cUser.id
        })
        return REST.success(res, "Move Vendors Csv Upload Successfully.");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post('/addMoveVendorCsv', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        if (req.body.type !== 'partner') {
            return REST.error(res, "Invalid type. Only 'partner' is allowed.", 400);
        }
        const create_moveVendors = await models.sequelize.transaction(async (transaction) => {
            const data = await models.move_vendor.create({
                vendor_name: req.body.vendor_name,
                type: req.body.type,
                email: req.body.email,
                contact_person: req.body.contact_person,
                phone_number: req.body.phone_number,
                region: req.body.region,
                na: req.body.na,
                ft_32: req.body.ft_32,
                ft_24: req.body.ft_24,
                ft_22: req.body.ft_22,
                ft_20: req.body.ft_20,
                ft_17: req.body.ft_17,
                model_407: req.body.model_407,
                bolero: req.body.bolero,
                tata_ace: req.body.tata_ace,
                remark: req.body.remark,
                route_served: req.body.route_served,
                added_by: cUser.id
            },
                {
                    transaction: transaction
                }
            )
            return data;
        })
        await models.user_activity_logs.create({
            user_id: cUser.id,
            activity: 'Move Vendors',
            activity_type: "Move vendors csv",
            current_data: create_moveVendors,
            action: "Accepted",
            added_by: cUser.id
        })
        return REST.success(res, create_moveVendors, 'Move Vendors Csv data upload successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getMoveVendorCsv', async function (req, res) {
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
                    ...search.map(term => ({ vendor_name: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ email: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ contact_person: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ phone_number: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ region: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ na: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ ft_32: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ ft_24: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ ft_22: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ ft_20: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ ft_17: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ model_407: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ tata_ace: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ bolero: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ remark: { [Op.like]: `%${term}%` } })),
                    ...search.map(term => ({ route_served: { [Op.like]: `%${term}%` } })),
                ]
            };
        }
        const whereCondition = {
            type: type === 'partner' ? 'partner' : 'customer',
            ...globalSearchFilter
        };
        const totalCount = await models.move_vendor.count({ where: whereCondition });
        const totalPages = Math.ceil(totalCount / pageSize);
        const data = await models.move_vendor.findAll({
            where: whereCondition,
            include: [
                {
                    model: models.User,
                    as: "MoveAddedby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "MoveUpdatedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [["id", "DESC"]],
            offset,
            limit: pageSize,
        });

        data.forEach(move => {
            if (move.MoveAddedby) {
                move.MoveAddedby.dataValues.created_at = move.createdAt;
            }
            if (move.MoveUpdatedBy) {
                move.MoveUpdatedBy.dataValues.updated_at = move.updatedAt;
            }
        });

        const responseKey = type === "partner" ? "movePartner" : "moveCustomer";
        const message = `Get ${type === "partner" ? "Partner" : "Customer"} Move Vendor Data Successfully`;

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
router.put('/updateMoveVendor/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findVendor = await models.move_vendor.findOne({
            where: {
                id: req.params.id
            }
        });
        if (!findVendor) {
            return REST.error(res, 'Vendor not found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            const data = await models.move_vendor.update({
                vendor_name: req.body.vendor_name,
                email: req.body.email,
                contact_person: req.body.contact_person,
                phone_number: req.body.phone_number,
                region: req.body.region,
                na: req.body.na,
                ft_32: req.body.ft_32,
                ft_24: req.body.ft_24,
                ft_22: req.body.ft_22,
                ft_20: req.body.ft_20,
                ft_17: req.body.ft_17,
                model_407: req.body.model_407,
                bolero: req.body.bolero,
                tata_ace: req.body.tata_ace,
                remark: req.body.remark,
                route_served: req.body.route_served,
                updated_by: cUser.id
            }, {
                where: {
                    id: req.params.id
                },
                transaction: transaction
            });

            return data;
        });
        const newVendor = await models.move_vendor.findOne({
            where: {
                id: req.params.id
            }
        })
        const previousData = findVendor.dataValues
        const currentDocs = newVendor.dataValues

        await models.user_activity_logs.create({
            user_id: cUser.id,
            activity: "Move Vendor",
            activity_id: findVendor.id,
            activity_type: "update_move_vendor",
            previous_data: previousData,
            current_data: currentDocs,
            updated_by: cUser.id,
            action: "Updated"
        });
        return REST.success(res, newVendor, 'Move Vendor Updated Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post('/sendSmsEmail', async function (req, res) {
    const cUser = req.body.current_user;
    const { email, phonenumber, type } = req.body;
    if (!email || !phonenumber) {
        return REST.error(res, "Email and phone number are required", 400);
    }

    try {
        const isArray = Array.isArray(email) && Array.isArray(phonenumber);
        const emails = isArray ? email : [email];
        const phoneNumbers = isArray ? phonenumber : [phonenumber];

        const [role, permission] = await Promise.all([
            models.user_role.findOne({ where: { id: cUser.role_id } }),
            models.user_permission.findOne({
                where: {
                    user_id: cUser.id,
                    is_permission: 1,
                    page_name: 'Potential'
                }
            })
        ]);

        if (!role) return REST.error(res, "Role not found", 404);
        if (role.name === 'Subadmin' && !permission) {
            return REST.error(res, "Permission 'Potential' not granted", 403);
        }
        let users;
        if (type === "Store") {
            users = await models.store_vendor.findAll({
                where: {
                    email: emails
                }
            });
        }
        else if (type === "Move") {
            users = await models.move_vendor.findAll({
                where: {
                    email: emails
                }
            });
        }
        else if (type === "Prepare") {
            users = await models.prepare_vendor.findAll({
                where: {
                    email: emails
                }
            });
        }

        const validEmails = users.map(u => u.email);
        const validPhoneMap = users.reduce((acc, u) => {
            acc[u.email] = u.phone_number;
            return acc;
        }, {});

        const results = [];

        for (let i = 0; i < emails.length; i++) {
            const thisEmail = emails[i];
            const thisPhone = phoneNumbers[i];

            if (!validEmails.includes(thisEmail)) {
                results.push({ email: thisEmail, status: 'Email not found' });
                continue;
            }

            const phoneToSend = validPhoneMap[thisEmail] || thisPhone;
            const smsMessage = `Dear Vendor,\n\nThis is a test SMS message.\n\nBest regards,\nYour Company`;
            await sendEmail(thisEmail, "Test Email", "This is a test email.");
            results.push({ email: thisEmail, status: 'Email and SMS sent' });
        }

        return REST.success(res, { results }, 'Messages processed successfully');
    } catch (error) {
        console.error(error);
        return REST.error(res, error.message, 500);
    }
});



/*
|----------------------------------------------------------------------------------------------------------------
|                             Moves Vendors Customer Api's
|----------------------------------------------------------------------------------------------------------------
*/
const headerMaps = {
    "Vendor Name": "vendor_name",
    "Email": "email",
    "Contact Person": "contact_person",
    "Moblie No": "phone_number",
    "Region Location": "region",
    "32 FT": "ft_32",
    "24 FT": "ft_24",
    "22 FT": "ft_22",
    "20 FT": "ft_20",
    "17 FT": "ft_17",
    "407": "model_407",
    "Bolero": "bolero",
    "Tata Ace": "tata_ace",
};
router.post('/MoveVendorCustomerCsv', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        if (req.body.type !== 'customer') {
            return REST.error(res, "Invalid type. Only 'customer' is allowed.", 400);
        }
        if (!req.files || !req.files.csv) {
            return REST.error(res, "No CSV file was uploaded.", 400);
        }
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
        const mappedHeaders = rawHeaders.map(header => headerMaps[header]);
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
        await models.move_vendor.bulkCreate(records);
        await models.user_activity_logs.create({
            user_id: cUser.id,
            activity: 'Customer_vendors',
            activity_type: findCsvName,
            current_data: uploadResult.Location,
            action: "Accepted",
            added_by: cUser.id
        })
        return REST.success(res, "Move Vendors Csv Upload Successfully.");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post('/addCustomerMoveVendorCsv', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        if (req.body.type !== 'customer') {
            return REST.error(res, "Invalid type. Only 'customer' is allowed.", 400);
        }
        const create_moveVendors = await models.sequelize.transaction(async (transaction) => {
            const data = await models.move_vendor.create({
                vendor_name: req.body.vendor_name,
                email: req.body.email,
                type: req.body.type,
                contact_person: req.body.contact_person,
                phone_number: req.body.phone_number,
                region: req.body.region,
                na: req.body.na,
                ft_32: req.body.ft_32,
                ft_24: req.body.ft_24,
                ft_22: req.body.ft_22,
                ft_20: req.body.ft_20,
                ft_17: req.body.ft_17,
                model_407: req.body.model_407,
                bolero: req.body.bolero,
                tata_ace: req.body.tata_ace,
                added_by: cUser.id
            },
                {
                    transaction: transaction
                }
            )
            return data;
        })
        await models.user_activity_logs.create({
            user_id: cUser.id,
            activity: 'customer_vendor',
            activity_type: "Move vendors csv",
            current_data: create_moveVendors,
            action: "Accepted",
            added_by: cUser.id
        })
        return REST.success(res, create_moveVendors, 'Move Vendors Csv data upload successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router
