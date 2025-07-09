const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const constants = require("../../../constants");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const auth = require("../../../utils/auth");
const config = require("../../../config");
const prepare = require('../../../models/prepare');
const csv = require('csv-parser')
const generateUniqueId = require('generate-unique-id')
const { getIoInstance } = require('../../../socket');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');
const ExcelJS = require('exceljs');
const Sequelize = require('sequelize')
const { socketEventEmit } = require("../../../utils/support")
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

/*
|----------------------------------------------------------------------------------------------------------------
|                                  Admin Auth And Partner Customer csv Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/change_password', async function (req, res) {
    try {
        const data = req.body;
        const rules = {
            oldPassword: "required|string",
            newPassword: "required|string",
            confirmPassword: "required|same:newPassword",
        };
        const validator = make(data, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const cUser = req.body.current_user
        const findUser = await models.User.findOne({ where: { id: cUser.id } });
        if (findUser) {
            const passwordMatch = await compare(data.oldPassword, findUser.password);
            if (passwordMatch) {
                const hashedNewPassword = await gen(data.newPassword);
                await models.User.update(
                    { password: hashedNewPassword },
                    { where: { id: cUser.id } }
                );
                return REST.success(res, 'Password changed successfully');
            } else {
                return REST.error(res, 'Old password is incorrect', 422);
            }
        } else {
            return REST.error(res, 'User not found', 404);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.put('/updateAdmin/:id', async function (req, res) {
    try {
        const id = req.params.id;
        const findAdmin = await models.User.findOne({ where: { id: id } });
        if (!findAdmin) {
            return REST.error(res, 'ID not found', 404);
        }
        const data = req.body;
        await models.sequelize.transaction(async (transaction) => {
            await models.User.update({
                full_name: data.full_name,
                phone_number: data.phone_number,
                designation: data.designation,
                city: data.city,
                department: data.department,
                status: data.status,
                image: data.image
            }, {
                where: { id: findAdmin.id },
            });
        });
        const updatedAdmin = await models.User.findOne({ where: { id: findAdmin.id } });
        return REST.success(res, updatedAdmin, 'Admin Updated Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/adminDashboardCount', async function (req, res) {
    try {
        const { today, months, week, start_date, end_date, city, allFilters } = req.query;
        let filter = {};
        let dateRange = "";
        if (city) {
            filter.city = city;
        }
        if (allFilters !== 'true') {
            function formatDate(date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            if (today) {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const endOfToday = new Date();
                endOfToday.setHours(23, 59, 59, 999);
                filter.createdAt = { [Op.between]: [startOfToday, endOfToday] };
                dateRange = formatDate(new Date());
            } else if (months) {
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                oneMonthAgo.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                filter.createdAt = { [Op.between]: [oneMonthAgo, today] };
                dateRange = `${formatDate(oneMonthAgo)} - ${formatDate(today)}`;
            } else if (week) {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                oneWeekAgo.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                filter.createdAt = { [Op.between]: [oneWeekAgo, today] };
                dateRange = `${formatDate(oneWeekAgo)} - ${formatDate(today)}`;
            } else if (start_date && end_date) {
                const start = new Date(start_date);
                const end = new Date(end_date);
                end.setHours(23, 59, 59, 999);
                filter.createdAt = { [Op.between]: [start, end] };
                dateRange = `${formatDate(start)} - ${formatDate(end)}`;
            }
        }

        const totalStores = await models.stores.count({
            where: { ...filter },
            include: [
                {
                    model: models.User,
                    as: "user",
                    required: false
                },

            ]
        });
        const totalMoves = await models.move_details.count({ where: { ...filter } });
        const totalPrepare = await models.prepare_details.count({ where: { ...filter } });
        const totalRegisteredPartner = await models.User.count({
            where: {
                is_registered: "1",
                role_id: 1,
                ...filter
            },
        });
        const totalRegisteredCustomers = await models.User.count({
            where: {
                is_registered: "1",
                role_id: 2,
                ...filter,
            },
        });
        const unregisteredUsers = await models.User.count({
            where: {
                app_completed_steps: [constants.USER.APP_COMPLETED_STEPS.LOGIN, constants.USER.APP_COMPLETED_STEPS.VERIFY, constants.USER.APP_COMPLETED_STEPS.ROLES],
                is_registered: constants.USER.REGISTERED_STATUS.NOT_REGISTERED,
                is_key_manager: constants.USER.KEY_STATUS.FALSE,
                role_id: {
                    [Op.or]: [1, 2, null]
                },
                ...filter
            }
        });
        const TotalStoreQuotation = await models.quotation_store.count({ where: { ...filter } });
        const TotalQuotations = await models.quotation_store.count({ where: { ...filter } })
        const totalReceivedQuotations = await models.quotation_store.count({ where: { ...filter } });
        const storeQuotationPercentage = TotalQuotations
            ? ((TotalStoreQuotation / TotalQuotations) * 100).toFixed(2)
            : 0;
        const mainStatusAssignedCount = await models.quotation_store.count({
            where: {
                ...filter,
                quotation_status: "asset_assigned"
            }
        })
        const findAssetsAssigned = await models.quotation_store.count({
            where: {
                quotation_status: "asset_assigned"
            }
        })
        const getPalletPerStore = await models.quotation_assigned_assets.findAll({
            where: {
                ...filter,
            },
            include: [
                {
                    model: models.quotation_store,
                    as: "StoreQuotationDetails",
                    where: {
                        quotation_status: "asset_assigned"
                    },
                }
            ],
            group: ['type_id'],
            distinct: true
        });
        const PalletAssignedPerChamber = await models.quotation_assigned_assets.count({
            where: {
                ...filter,
            },
            include: [
                {
                    model: models.quotation_store,
                    as: "StoreQuotationDetails",
                    required: true,
                    where: {
                        quotation_status: "asset_assigned"
                    }
                }
            ],
            col: 'chamber_id'
        });
        const statuses = {
            pending: "pending",
            legal_received: "legal_received",
            asset_assigned: "asset_assigned",
            negotiation: "negotiation",
            quotation_completed: "quotation_completed",
            asset_suggested: "asset_suggested",
            legal_uploaded: "legal_uploaded",
            onboard: "onboard",
            quotation_received: "quotation_received",
            quotation_renewed: "quotation_renewed",
            quotation_uploaded: "quotation_uploaded",
            due_for_renewal: "due_for_renewal",
            renew_legal_received: "renew_legal_received",
            renew_onboard: "renew_onboard",
            renew_quotation_uploaded: "renew_quotation_uploaded",
            renew_negotiation: "renew_negotiation",
            renew_quotation_completed: "renew_quotation_completed",
            renew_asset_suggested: "renew_asset_suggested",
            renew_legal_uploaded: "renew_legal_uploaded",
            renew_quotation_received: "renew_quotation_received",
            declined: "declined",
            completed: "completed",
            terminated: "terminated"
        };
        const initialStatuses = [
            statuses.pending,
            statuses.legal_received,
            statuses.due_for_renewal,
            statuses.asset_suggested,
            statuses.quotation_uploaded,
            statuses.negotiation,
            statuses.quotation_completed,
            statuses.legal_uploaded,
            statuses.quotation_received,
            statuses.onboard,
            statuses.due_for_renewal

        ];
        const renewedStatuses = [
            statuses.renew_legal_received,
            statuses.renew_onboard,
            statuses.renew_quotation_uploaded,
            statuses.renew_negotiation,
            statuses.renew_quotation_completed,
            statuses.renew_legal_uploaded,
            statuses.renew_quotation_received,



        ];
        const StoreQueryStatues = {};
        const renewed_statues = {};
        const allInitialStatuses = [...initialStatuses];
        const allRenewedStatuses = [...renewedStatuses];
        const totalInitialCount = await models.quotation_store.count({
            where: {
                status: allInitialStatuses
            }
        });
        const totalRenewedCount = await models.quotation_store.count({
            where: {
                status: allRenewedStatuses
            }
        });
        for (const status of initialStatuses) {
            const count = await models.quotation_store.count({ where: { status } });
            const percentage = totalInitialCount ? ((count / totalInitialCount) * 100).toFixed(2) : "0.00";
            StoreQueryStatues[status] = `${percentage}%`;
        }
        for (const status of renewedStatuses) {
            const count = await models.quotation_store.count({ where: { status } });
            const percentage = totalRenewedCount ? ((count / totalRenewedCount) * 100).toFixed(2) : "0.00";
            renewed_statues[status] = `${percentage}%`;
        }
        const assetAssignedCount = await models.quotation_store.count({
            where: {
                ...filter,
                [Op.or]: [
                    {
                        status: {
                            [Op.in]: ['legal_received',
                                'asset_assigned',
                                'quotation_uploaded',
                                'negotiation',
                                'quotation_completed',
                                'asset_suggested',
                                'legal_uploaded',
                                'onboard']
                        }
                    },
                    { quotation_status: 'asset_assigned' }
                ]
            }
        });
        const pendingCount = await models.quotation_store.count({
            where: {
                [Op.and]: [
                    { status: 'pending' },
                    { quotation_status: 'pending' }
                ]
            }
        });
        const percentageFulfillment = totalReceivedQuotations
            ? ((assetAssignedCount / totalReceivedQuotations) * 100).toFixed(2)
            : "0.00";

        const decline_quotation = await models.quotation_store.count({
            where: {
                ...filter,
                [Op.and]: [
                    { status: 'declined' },
                    { quotation_status: 'declined' }
                ]
            }
        })
        const declineQuotationPercentage = totalReceivedQuotations ? ((decline_quotation / totalReceivedQuotations) * 100).toFixed(2) : "0.00";
        const terminated_quotations = await models.quotation_store.count({
            where: {
                ...filter,
                [Op.or]: [
                    { status: 'terminated' },
                    { quotation_status: 'terminated' }
                ]
            }
        })
        const TerminatedQuotationPercentage = totalReceivedQuotations ? ((terminated_quotations / totalReceivedQuotations) * 100).toFixed(2) : "0.00";
        const renewed_quotations = await models.quotation_store.count({
            where: {
                [Op.or]: [
                    {
                        status: {
                            [Op.in]: [
                                'quotation_renewed',
                                'renew_onboard',
                                'renew_legal_received',
                                'renew_quotation_uploaded',
                                'renew_negotiation',
                                'renew_quotation_completed',
                                'renew_asset_suggested',
                                'renew_legal_uploaded',
                                'renew_quotation_received']
                        }
                    },
                    { quotation_status: 'asset_assigned' }
                ]
            }
        })
        const renewedQuotationPercentage = totalReceivedQuotations ? ((renewed_quotations / totalReceivedQuotations) * 100).toFixed(2) : "0.00";
        const pending_quotations = await models.quotation_store.count({
            where: {
                [Op.or]: [
                    { status: 'pending' },
                    { quotation_status: 'pending' }
                ]
            }
        })
        const pendingQuotationPercentage = totalReceivedQuotations ? ((pending_quotations / totalReceivedQuotations) * 100).toFixed(2) : "0.00";
        const completed_quotations = await models.quotation_store.count({
            where: {
                ...filter,
                [Op.and]: [
                    { status: 'completed' },
                    { quotation_status: 'completed' }
                ]
            }
        })
        const CompletedQuotationPercentage = totalReceivedQuotations ? ((completed_quotations / totalReceivedQuotations) * 100).toFixed(2) : "0.00";
        const activeQuotations = await models.quotation_store.count({
            where: {
                [Op.or]: [
                    {
                        status: {
                            [Op.in]: [
                                "asset_suggested",
                                "quotation_uploaded",
                                "quotation_received",
                                "negotiation",
                                "quotation_completed",
                                "legal_received",
                                "legal_uploaded",
                            ]
                        }
                    },
                    { quotation_status: 'pending' }
                ]
            }
        });
        const onlyPendingQuotation = await models.quotation_store.count({
            where: {
                status: "pending"
            }
        });
        const inprocessCount = activeQuotations - onlyPendingQuotation
        const inProcessPercentage = totalReceivedQuotations
            ? ((inprocessCount / totalReceivedQuotations) * 100).toFixed(2)
            : "0.00";
        const activeRenewedQuotations = await models.quotation_store.count({
            where: {
                [Op.and]: [
                    {
                        status: {
                            [Op.in]: [
                                "renew_asset_suggested",
                                "renew_negotiation",
                                "renew_quotation_completed",
                                "renew_quotation_uploaded",
                                "renew_legal_uploaded",
                                "renew_legal_received",
                                "renew_quotation_received",
                                "due_for_renewal"
                            ]
                        }
                    },
                    { quotation_status: 'asset_assigned' }
                ]
            }
        });
        const Renewed_in_processCount = activeRenewedQuotations
        const RenewedinprocessPercentage = totalReceivedQuotations
            ? ((Renewed_in_processCount / totalReceivedQuotations) * 100).toFixed(2)
            : "0.00";
        const solutions = await models.quotation_store.count({
            where: {
                ...filter,
                [Op.not]: [
                    { status: 'pending' },
                    { quotation_status: 'pending' }
                ]
            }
        });
        const responseData = {
            storeCount: totalStores,
            moveCount: totalMoves,
            prepareCount: totalPrepare,
            totalRegisteredPartner,
            totalRegisteredCustomers,
            unregisteredUsers,
            TotalStoreQuotation,
            TotalMoveQuotation: 0,
            TotalPrepareQuotation: 0,
            TotalSolutions: solutions,
            storeQuotationPercentage: `${storeQuotationPercentage}%`,
            moveQuotationPercentage: 0,
            prepareQuotationPercentage: 0,
            FulfilledQuotation: `${percentageFulfillment}%`,
            InProcessQuotation: `${inProcessPercentage}%`,
            assetassigned: `${mainStatusAssignedCount}`,
            decline_Quotation: `${declineQuotationPercentage}%`,
            terminatedQuotation: `${TerminatedQuotationPercentage}%`,
            RenewedQuotation: `${renewedQuotationPercentage}%`,
            PendingQuotation: `${pendingQuotationPercentage}%`,
            completedQuotation: `${CompletedQuotationPercentage}%`,
            StoreQueryStatues: StoreQueryStatues,
            RenewedQueryStatues: renewed_statues,
            RenewedInProcessQuery: `${RenewedinprocessPercentage}%`,
            Pending_Query_Count: pendingCount,
            Completed_Quotation_Count: completed_quotations,
            Terminated_Quotation_Count: terminated_quotations,
            Declined_Quotation_count: decline_quotation,
            PalletAssignedPerStore: getPalletPerStore.length,
            PalletAssignedPerChamber: PalletAssignedPerChamber,
            AssetsAssigned: findAssetsAssigned

        };
        if (dateRange) {
            responseData.dateRange = dateRange;
        }
        return REST.success(res, responseData, 'Admin dashboard counts fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post("/importPartner", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        if (!req.files || !req.files.csv) {
            return REST.error(res, "No CSV file was uploaded.", 400);
        }
        let csvFile = req.files.csv;
        const findCsvName = csvFile.name;
        const csvData = csvFile.data.toString("utf8").trim();
        const rows = csvData.split("\n").map(row => row.trim()).filter(row => row);

        if (rows.length < 2) {
            return REST.error(res, "CSV must contain at least one data row.", 400);
        }

        const fileName = `partner_csv/${findCsvName}`;
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: csvFile.data,
            ContentType: 'text/csv',
            ACL: 'public-read'
        };
        const uploadResult = await s3.upload(params).promise();
        console.log(uploadResult.Location, "uploadResult");
        const headers = rows[0].split(",").map(header => header.trim());
        const exampleUser = await models.User.findOne();
        if (!exampleUser) {
            return REST.error(res, "User model structure not found.", 500);
        }
        const expectedHeaders = {
            "Full Name": "full_name",
            "Email": "email",
            "Phone Number": "phone_number",
            "Designation": "designation"
        };
        const filteredHeaders = Object.keys(expectedHeaders).filter(header => headers.includes(header));
        if (filteredHeaders.length !== Object.keys(expectedHeaders).length) {
            return REST.error(res, "CSV headers do not match required fields.", 400);
        }

        const createdUsers = [];
        const invalidData = [];
        const validData = [];
        const existingEmails = [];
        const existingPhoneNumbers = [];

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+91[0-9]{10}$/;
        const validDesignations = [
            "Director", "Proprietor", "Manager", "Owner", "Founder",
            "CEO", "COO", "CFO", "CMO"
        ];
        for (let i = 1; i < rows.length; i++) {
            var newId = generateUniqueId({ length: 6, useLetters: false });
            const rowValues = rows[i].split(",").map(value => value.trim());
            if (rowValues.filter(value => value).length === 1 && validDesignations.includes(rowValues[0])) {
                continue;
            }
            let rowObject = {};
            filteredHeaders.forEach((header, index) => {
                const dbKey = expectedHeaders[header];
                if (dbKey) {
                    rowObject[dbKey] = rowValues[index]?.trim() || "";
                }
            });

            rowObject.user_uid = `PTN${newId}`;
            rowObject.role_id = 1;
            rowObject.is_key_manager = 0;
            rowObject.is_registered = 1;
            rowObject.app_completed_steps = 3;
            const fullName = rowObject.full_name;
            const email = rowObject.email;
            const designation = rowObject.designation;
            let phone = rowObject.phone_number;
            let formattedPhone = null;
            const invalidColumns = [];
            if (!phone) {
                invalidColumns.push("Phone Number");
            }
            if (phone) {
                const justDigits = phone.replace(/[^0-9]/g, '');
                if (justDigits.length === 10) {
                    if (existingPhoneNumbers.includes(justDigits)) {
                        invalidColumns.push("Phone Number");
                    }
                    else {
                        formattedPhone = `+91${justDigits}`;
                        if (!formattedPhone) {
                            invalidColumns.push("Phone Number");
                        } else if (!phoneRegex.test(formattedPhone)) {
                            invalidColumns.push("Phone Number");
                        }
                        else {
                            rowObject.phone_number = formattedPhone;
                            const existingPhone = await models.User.findOne({ where: { phone_number: formattedPhone } });
                            if (existingPhone) {
                                invalidColumns.push("Phone Number");
                            }
                            existingPhoneNumbers.push(justDigits);
                        }
                    }
                } else {
                    invalidColumns.push("Phone Number");
                }
            }

            if (!email) {
                invalidColumns.push("Email");
            } else if (!emailRegex.test(email)) {
                invalidColumns.push("Email");
            }
            else if (email) {
                if (existingEmails.includes(email)) {
                    invalidColumns.push("Email");
                }
                else {
                    const existingEmail = await models.User.findOne({ where: { email } });
                    if (existingEmail) {
                        invalidColumns.push("Email");
                    }
                    existingEmails.push(email);
                }
            }

            if (!fullName) {
                invalidColumns.push("Full Name");
            } else if (fullName.length > 25) {
                invalidColumns.push("Full Name");
            }

            if (!designation) {
                invalidColumns.push("Designation");
            } else if (!validDesignations.includes(designation)) {
                invalidColumns.push("Designation");
            }

            if (invalidColumns.length > 0) {
                rowObject.invalidColumns = invalidColumns;
                invalidData.push(rowObject);
            } else {
                validData.push(rowObject);
            }
        }
        if (invalidData.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet("Invalid Data");
            const headers = [
                "Full Name",
                "Email",
                "Phone Number",
                "Designation"
            ];
            const headerRow = sheet.addRow(headers);
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FF4F81BD" },
                };
                cell.font = {
                    color: { argb: "FFFFFFFF" },
                    bold: true,
                };
                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                };
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" },
                };
            });

            sheet.columns = headers.map(() => ({
                width: 20,
            }));

            validData.forEach((record) => {
                const row = [
                    record.full_name || "",
                    record.email || "",
                    record.phone_number || "",
                    record.designation || ""
                ];
                const addedRow = sheet.addRow(row);
                const invalidColumns = record.invalidColumns || [];
                invalidColumns.forEach((col) => {
                    const colIndex = headers.indexOf(col) + 1;
                    if (colIndex > 0) {
                        const cell = addedRow.getCell(colIndex);
                        cell.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "FFFF00" },
                        };
                        cell.font = {
                            bold: true,
                            color: { argb: "FF0000" },
                        };
                        cell.border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            bottom: { style: "thin" },
                            right: { style: "thin" },
                        };
                    }
                });
            });

            invalidData.forEach((record) => {
                const row = [
                    record.full_name || "",
                    record.email || "",
                    record.phone_number || "",
                    record.designation || ""
                ];
                const addedRow = sheet.addRow(row);
                const invalidColumns = record.invalidColumns || [];
                invalidColumns.forEach((col) => {
                    const colIndex = headers.indexOf(col) + 1;
                    if (colIndex > 0) {
                        const cell = addedRow.getCell(colIndex);
                        cell.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "FFFF00" },
                        };
                        cell.font = {
                            bold: true,
                            color: { argb: "FF0000" },
                        };
                        cell.border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            bottom: { style: "thin" },
                            right: { style: "thin" },
                        };
                    }
                });
            });
            const buffer = await workbook.xlsx.writeBuffer();
            const excelKey = `invalid_data/InvalidPartnerData_${Date.now()}.xlsx`;
            const uploadResultInvalid = await s3.upload({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: excelKey,
                Body: buffer,
                ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ACL: "public-read"
            }).promise();
            await models.user_activity_logs.create({
                user_id: cUser.id,
                activity: findCsvName,
                added_by: cUser.id,
                current_data: uploadResultInvalid.Location,
                activity_type: "partner_csv",
                action: "Rejected",
                additional_info: uploadResultInvalid.Location
            });
            return REST.error(res, {
                status: true,
                valid: false,
                message: "Invalid data processed and uploaded.",
                invalidFileUrl: uploadResultInvalid.Location
            }, 400);

        }
        let lastCreatedUserId = null;
        for (const record of validData) {
            try {
                const createdUser = await models.User.create(record);
                createdUsers.push(createdUser);
                lastCreatedUserId = createdUser.id;
            } catch (createError) {
                return REST.error(res, `Failed to create user: ${createError.message}`, 500);
            }
        }
        if (lastCreatedUserId) {
            await models.user_activity_logs.create({
                user_id: lastCreatedUserId,
                activity: findCsvName,
                added_by: cUser.id,
                current_data: uploadResult.Location,
                activity_type: "partner_csv",
                action: "Accepted"
            });
        }
        return REST.success(res, createdUsers, 'Partner imported successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post("/importCutomer", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        if (!req.files || !req.files.csv) {
            return REST.error(res, "No CSV file was uploaded.", 400);
        }
        let csvFile = req.files.csv;
        const findCsvName = csvFile.name;
        const csvData = csvFile.data.toString("utf8").trim();
        const rows = csvData.split("\n").map(row => row.trim()).filter(row => row);

        if (rows.length < 2) {
            return REST.error(res, "CSV must contain at least one data row.", 400);
        }

        const fileName = `customer_csv/${findCsvName}`;
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: csvFile.data,
            ContentType: 'text/csv',
            ACL: 'public-read'
        };
        const uploadResult = await s3.upload(params).promise();
        console.log(uploadResult.Location, "uploadResult");
        const headers = rows[0].split(",").map(header => header.trim());
        const exampleUser = await models.User.findOne();
        if (!exampleUser) {
            return REST.error(res, "User model structure not found.", 500);
        }

        const expectedHeaders = {
            "Full Name": "full_name",
            "Email": "email",
            "Phone Number": "phone_number",
            "Designation": "designation"
        };

        const filteredHeaders = Object.keys(expectedHeaders).filter(header => headers.includes(header));
        if (filteredHeaders.length !== Object.keys(expectedHeaders).length) {
            return REST.error(res, "CSV headers do not match required fields.", 400);
        }

        const createdCustomers = [];
        const existingEmails = [];
        const existingPhoneNumbers = [];
        const invalidData = [];
        const validData = [];
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\+91[0-9]{10}$/;
        const validDesignations = [
            "Director", "Proprietor", "Manager", "Owner", "Founder",
            "CEO", "COO", "CFO", "CMO"
        ];
        for (let i = 1; i < rows.length; i++) {
            const newId = generateUniqueId({
                length: 6,
                useLetters: false
            });
            const rowValues = rows[i].split(",").map(value => value.trim());
            if (rowValues.filter(value => value).length === 1 && validDesignations.includes(rowValues[0])) {
                continue;
            }
            let rowObject = {};
            filteredHeaders.forEach((header, index) => {
                const dbKey = expectedHeaders[header];
                if (dbKey) {
                    rowObject[dbKey] = rowValues[index]?.trim() || "";
                }
            });
            const requiredFields = ['full_name', 'email', 'phone_number', 'designation'];
            const invalidColumns = [];
            requiredFields.forEach(field => {
                if (!rowObject[field] || rowObject[field].toLowerCase() === 'na') {
                    const headerLabel = Object.keys(expectedHeaders).find(key => expectedHeaders[key] === field);
                    invalidColumns.push(headerLabel);
                }
            });
            // const requiredFields = ['full_name', 'email', 'phone_number', 'designation'];
            // const hasAllFields = requiredFields.every(field => rowObject[field]);
            // if (!hasAllFields) {
            //     invalidData.push(rowObject);
            //     continue;
            // }
            rowObject.user_uid = `CUS${newId}`;
            rowObject.role_id = 2;
            rowObject.is_key_manager = 0;
            rowObject.added_by = cUser.id
            rowObject.is_registered = 1;
            rowObject.app_completed_steps = 3;

            const fullName = rowObject.full_name;
            const email = rowObject.email;
            const designation = rowObject.designation;
            let phone = rowObject.phone_number;
            let formattedPhone = null;
            // const invalidColumns = [];
            if (!phone) {
                invalidColumns.push("Phone Number");
            }
            if (phone) {
                const justDigits = phone.replace(/[^0-9]/g, '');
                if (justDigits.length === 10) {
                    if (existingPhoneNumbers.includes(justDigits)) {
                        invalidColumns.push("Phone Number");
                    }
                    else {
                        formattedPhone = `+91${justDigits}`;
                        if (!formattedPhone) {
                            invalidColumns.push("Phone Number");
                        } else if (!phoneRegex.test(formattedPhone)) {
                            invalidColumns.push("Phone Number");
                        }
                        else {
                            rowObject.phone_number = formattedPhone;
                            const existingPhone = await models.User.findOne({ where: { phone_number: formattedPhone } });
                            if (existingPhone) {
                                invalidColumns.push("Phone Number");
                            }
                            existingPhoneNumbers.push(justDigits);
                        }
                    }
                } else {
                    invalidColumns.push("Phone Number");
                }
            }
            if (!email) {
                invalidColumns.push("Email");
            } else if (!emailRegex.test(email)) {
                invalidColumns.push("Email");
            }
            else if (email) {
                if (existingEmails.includes(email)) {
                    invalidColumns.push("Email");
                }
                else {
                    const existingEmail = await models.User.findOne({ where: { email } });
                    if (existingEmail) {
                        invalidColumns.push("Email");
                    }
                    existingEmails.push(email);
                }
            }
            if (!fullName) {
                invalidColumns.push("Full Name");
            } else if (fullName.length > 25) {
                invalidColumns.push("Full Name");
            }
            if (!designation) {
                invalidColumns.push("Designation");
            } else if (!validDesignations.includes(designation)) {
                invalidColumns.push("Designation");
            }
            if (invalidColumns.length > 0) {
                rowObject.invalidColumns = invalidColumns;
                invalidData.push(rowObject);
            } else {
                validData.push(rowObject);
            }
        }
        if (invalidData.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet("Invalid Data");
            const headers = [
                "Full Name",
                "Email",
                "Phone Number",
                "Designation"
            ];

            const headerRow = sheet.addRow(headers);
            headerRow.eachCell((cell) => {
                cell.fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FF4F81BD" },
                };
                cell.font = {
                    color: { argb: "FFFFFFFF" },
                    bold: true,
                };
                cell.alignment = {
                    vertical: "middle",
                    horizontal: "center",
                };
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" },
                };
            });

            sheet.columns = headers.map(() => ({
                width: 20,
            }));
            validData.forEach((record) => {
                const row = [
                    record.full_name || "",
                    record.email || "",
                    record.phone_number || "",
                    record.designation || ""
                ];
                const addedRow = sheet.addRow(row);
                const invalidColumns = record.invalidColumns || [];
                invalidColumns.forEach((col) => {
                    const colIndex = headers.indexOf(col) + 1;
                    if (colIndex > 0) {
                        const cell = addedRow.getCell(colIndex);
                        cell.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "FFFF00" },
                        };
                        cell.font = {
                            bold: true,
                            color: { argb: "FF0000" },
                        };
                        cell.border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            bottom: { style: "thin" },
                            right: { style: "thin" },
                        };
                    }
                });
            });
            invalidData.forEach((record) => {
                const row = [
                    record.full_name || "",
                    record.email || "",
                    record.phone_number || "",
                    record.designation || ""
                ];
                const addedRow = sheet.addRow(row);
                const invalidColumns = record.invalidColumns || [];
                invalidColumns.forEach((col) => {
                    const colIndex = headers.indexOf(col) + 1;
                    if (colIndex > 0) {
                        const cell = addedRow.getCell(colIndex);
                        cell.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "FFFF00" },
                        };
                        cell.font = {
                            bold: true,
                            color: { argb: "FF0000" },
                        };
                        cell.border = {
                            top: { style: "thin" },
                            left: { style: "thin" },
                            bottom: { style: "thin" },
                            right: { style: "thin" },
                        };
                    }
                });
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const excelKey = `invalid_data/InvalidCustomerData_${Date.now()}.xlsx`;
            const uploadResultInvalid = await s3.upload({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: excelKey,
                Body: buffer,
                ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ACL: "public-read"
            }).promise();

            await models.user_activity_logs.create({
                user_id: cUser.id,
                activity: findCsvName,
                added_by: cUser.id,
                current_data: uploadResultInvalid.Location,
                activity_type: "customer_csv",
                action: "Rejected",
                additional_info: uploadResultInvalid.Location
            });
            return REST.error(res, {
                status: true,
                valid: false,
                message: "Invalid data processed and uploaded.",
                invalidFileUrl: uploadResultInvalid.Location
            }, 400);

        }
        let lastCreatedUserId = null;
        for (const record of validData) {
            try {
                const createdCustomer = await models.User.create(record);
                createdCustomers.push(createdCustomer);
                lastCreatedUserId = createdCustomer.id;
            } catch (createError) {
                return REST.error(res, `Failed to create customer: ${createError.message}`, 500);
            }
        }

        if (lastCreatedUserId) {
            await models.user_activity_logs.create({
                user_id: lastCreatedUserId,
                activity: findCsvName,
                added_by: cUser.id,
                current_data: uploadResult.Location,
                activity_type: "customer_csv",
                action: "Accepted"
            });
        }

        return REST.success(res, createdCustomers, 'Customer imported successfully');

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router