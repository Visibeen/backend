const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const constants = require("../../../constants");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const sequelize = require('sequelize')
const generateUniqueId = require('generate-unique-id')
const AWS = require('aws-sdk');
const streamifier = require("streamifier");
const csvParser = require('csv-parser')
const ExcelJS = require('exceljs');



const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

/*
|----------------------------------------------------------------------------------------------------------------
|                                       Firm & csv Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.put('/updateFirmDoc/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        var findFirm = await models.User_firm.findOne({ where: { id: req.params.id } });
        if (!findFirm) {
            return REST.error(res, 'Firm Id not found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            await models.User_firm.update({
                upload_gst_certificate: req.body.upload_gst_certificate,
                profile: req.body.profile,
                aadhar_front: req.body.aadhar_front,
                aadhar_back: req.body.aadhar_back,
                driving_licence_front: req.body.driving_licence_front,
                driving_licence_back: req.body.driving_licence_back,
                cancelled_cheque: req.body.cancelled_cheque,
                tds_certificate: req.body.tds_certificate,
                msme_certificate: req.body.msme_certificate,
                gst_certificate: req.body.gst_certificate,
                visiting_card: req.body.visiting_card,
                registration_certificate: req.body.registration_certificate,
                firm_registered_city: req.body.firm_registered_city,
                last_updated_by: cUser.id
            }, {
                where: { id: findFirm.id },
                transaction: transaction
            });

        })
        const findNewFirm = await models.User_firm.findOne({
            where: {
                id: findFirm.id
            }
        })
        const previousData = findFirm.dataValues
        const currentData = req.body
        delete req.body.current_user
        const activityLog = {
            user_id: findFirm.user_id,
            activity: `Firm`,
            activity_id: findFirm.id,
            activity_type: "firm_basic",
            previous_data: previousData,
            current_data: currentData,
            updated_by: cUser.id,
            action: "Updated"
        };
        await models.user_activity_logs.create(activityLog);
        return REST.success(res, findNewFirm, 'Firm Documents Updated Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post("/importFirm", async function (req, res) {
    const cUser = req.body.current_user;
    const partnerIds = req.body.partner_id;
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
        const firmTypes = await models.Firm_type.findAll();
        const firmTypeMap = {};
        firmTypes.forEach(firmType => {
            firmTypeMap[firmType.name] = firmType.id;
        });
        const getFirmTypeName = (firmTypeId) => {
            return Object.keys(firmTypeMap).find(key => firmTypeMap[key] === firmTypeId) || firmTypeId;
        };

        const validFirmTypes = [
            "Private Limited",
            "Proprietorship",
            "Partnership",
            "Public Limited",
            "Limited Liability Partnership(LLP)"
        ];
        const headers = rows[0].split(",").map(header => header.trim());
        const exampleFirm = await models.User_firm.findAll();
        if (!exampleFirm) {
            return REST.error(res, "Firm model structure not found.", 500);
        }
        const expectedHeaders = {
            "PartnerID": "user_uid",
            "Firm Name": "firm_name",
            "FirmType": "firm_type",
            "PAN NO": "pan_no",
            "CIN NO": "cin_no",
            "Firm Registered Country": "firm_registered_country",
            "Firm Registered State": "firm_registered_state",
            "Firm Registered City": "firm_registered_city",
            "Firm Registered Address": "firm_registered_addresss",
            "Firm Registered Pincode": "firm_registered_pincode",
            "Gst Number": "gst_number",
            // "Aadhar Number": "aadhar_number",
            // "No of Vehicles": "no_of_vehicles",
        };

        const filteredHeaders = Object.keys(expectedHeaders).filter(header => headers.includes(header));
        if (filteredHeaders.length !== Object.keys(expectedHeaders).length) {
            return REST.error(res, "CSV headers do not match required fields.", 400);
        }
        const headerToDBKey = filteredHeaders.reduce((acc, key) => {
            acc[key] = expectedHeaders[key];
            return acc;
        }, {});

        const createdFirm = [];
        const invalidData = [];
        const validData = [];
        let lastUserId = null;

        const panNoRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const cinNoRegex = /^[L|U]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
        const gstNumberRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}[Z]{1}[0-9A-Z]{1}$/;
        const pincodeRegex = /^[0-9]{6}$/;
        // const aadharRegex = /^\d{12}$/;

        for (let i = 1; i < rows.length; i++) {
            const rowValues = rows[i].split(",").map(value => value.trim());
            if (rowValues[0] == '')
                continue;
            let rowObject = {};
            filteredHeaders.forEach((header, index) => {
                const dbKey = headerToDBKey[header];
                if (dbKey && dbKey !== "id") {
                    rowObject[dbKey] = rowValues[index]?.trim() || "";
                }
            });

            const invalidColumns = [];
            if (!rowObject.firm_name) {
                invalidColumns.push("Firm Name");
            } else if (rowObject.firm_name.length > 50) {
                invalidColumns.push("Firm Name");
            }
            if (!rowObject.firm_type) {
                invalidColumns.push("FirmType");
            } else if (!validFirmTypes.includes(rowObject.firm_type)) {
                invalidColumns.push("FirmType");
            }

            if (!rowObject.firm_registered_pincode) {
                invalidColumns.push("Firm Registered Pincode");
            }

            if (!rowObject.cin_no) {
                invalidColumns.push("CIN NO");
            }

            if (!rowObject.pan_no) {
                invalidColumns.push("PAN NO");
            }

            if (!rowObject.firm_registered_country) {
                invalidColumns.push("Firm Registered Country");
            }

            if (!rowObject.firm_registered_state) {
                invalidColumns.push("Firm Registered State");
            }

            if (!rowObject.firm_registered_city) {
                invalidColumns.push("Firm Registered City");
            }

            if (!rowObject.firm_registered_addresss) {
                invalidColumns.push("Firm Registered Address");
            }

            if (!rowObject.gst_number) {
                invalidColumns.push("Gst Number");
            }
            if (rowObject.pan_no && !panNoRegex.test(rowObject.pan_no)) {
                invalidColumns.push("PAN NO");
            }

            if (rowObject.cin_no && !cinNoRegex.test(rowObject.cin_no)) {
                invalidColumns.push("CIN NO");
            }

            if (rowObject.gst_number && !gstNumberRegex.test(rowObject.gst_number)) {
                invalidColumns.push("Gst Number");
            }

            if (rowObject.firm_registered_pincode && !pincodeRegex.test(rowObject.firm_registered_pincode)) {
                invalidColumns.push("Firm Registered Pincode");
            }
            // const cleanedAadhar = rowObject.aadhar_number?.replace(/\s/g, '');
            // if (!cleanedAadhar || !aadharRegex.test(cleanedAadhar)) {
            //     invalidColumns.push("Aadhar Number");
            // }
            // if (!rowObject.no_of_vehicles || isNaN(rowObject.no_of_vehicles) || Number(rowObject.no_of_vehicles) <= 0 || !Number.isInteger(Number(rowObject.no_of_vehicles))) {
            //     invalidColumns.push("No of Vehicles");
            // }
            const firmUid = `FRM${generateUniqueId({ length: 6, useLetters: false })}`;
            rowObject.firm_uid = firmUid;
            rowObject.added_by = cUser.id;
            rowObject.admin_status = "pending";
            rowObject.document_status = "pending";
            rowObject.status = "pending";

            const firmTypeName = rowObject.firm_type;
            if (validFirmTypes.includes(firmTypeName) && firmTypeMap[firmTypeName]) {
                rowObject.firm_type = firmTypeMap[firmTypeName];
            } else if (rowObject.firm_type && !invalidColumns.includes("FirmType")) {
                invalidColumns.push("FirmType");
            }

            const user = await models.User.findOne({ where: { user_uid: rowObject.user_uid } });
            if (user && user.user_uid == partnerIds) {
                rowObject.user_id = user.id;
                lastUserId = user.id;
            } else {
                invalidColumns.push("PartnerID");
            }

            const panNo = rowObject.pan_no;
            const cinNo = rowObject.cin_no;
            // const AadharNumber = rowObject.aadhar_number;
            const [existingPanNo, existingCinNo] = await Promise.all([
                models.User_firm.findOne({ where: { pan_no: panNo } }),
                models.User_firm.findOne({ where: { cin_no: cinNo } }),
                // models.User_firm.findOne({ where: { aadhar_number: AadharNumber } })
            ]);

            if (existingPanNo) {
                invalidColumns.push("PAN NO");
            }
            if (existingCinNo) {
                invalidColumns.push("CIN NO");
            }
            // if (existingAadharNumber) {
            //     invalidColumns.push("Aadhar Number");
            // }
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
                "PartnerID",
                "Firm Name",
                "FirmType",
                "PAN NO",
                "CIN NO",
                "Firm Registered Country",
                "Firm Registered State",
                "Firm Registered City",
                "Firm Registered Address",
                "Firm Registered Pincode",
                "Gst Number",
                // "Aadhar Number",
                // "No of Vehicles"
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
                    record.user_uid || "",
                    record.firm_name || "",
                    record.firm_type || "",
                    record.pan_no || "",
                    record.cin_no || "",
                    record.firm_registered_country || "",
                    record.firm_registered_state || "",
                    record.firm_registered_city || "",
                    record.firm_registered_addresss || "",
                    record.firm_registered_pincode || "",
                    record.gst_number || "",
                    // record.aadhar_number || "",
                    // record.no_of_vehicles || ""
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
                    record.user_uid || "",
                    record.firm_name || "",
                    getFirmTypeName(record.firm_type) || "",
                    record.pan_no || "",
                    record.cin_no || "",
                    record.firm_registered_country || "",
                    record.firm_registered_state || "",
                    record.firm_registered_city || "",
                    record.firm_registered_addresss || "",
                    record.firm_registered_pincode || "",
                    record.gst_number || "",
                    // record.aadhar_number || "",
                    // record.no_of_vehicles || ""
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
            const excelKey = `invalid_data/InvalidFirmData_${Date.now()}.xlsx`;
            const uploadResultInvalid = await s3.upload({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: excelKey,
                Body: buffer,
                ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ACL: "public-read"
            }).promise();
            const findUser = await models.User.findOne({
                where: {
                    user_uid: partnerIds
                }
            })
            if (!findUser) {
                return REST.error(res, 'User Id Not Found', 400);
            }
            lastUserId = findUser.dataValues.id;
            await models.user_activity_logs.create({
                user_id: cUser.id,
                activity: findCsvName,
                added_by: cUser.id,
                current_data: uploadResultInvalid.Location,
                activity_type: "firm_csv",
                activity_id: lastUserId,
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
        for (const record of validData) {
            try {
                const createdFirms = await models.User_firm.create(record);
                createdFirm.push(createdFirms);
                lastUserId = record.user_id;
            } catch (createError) {
                return REST.error(res, `Failed to create firm: ${createError.message}`, 500);
            }
        }
        if (lastUserId) {
            await models.user_activity_logs.create({
                user_id: lastUserId,
                activity: findCsvName,
                added_by: cUser.id,
                activity_type: "firm_csv",
                activity_id: lastUserId,
                current_data: uploadResult.Location,
                action: "Accepted"
            });
        }
        if (cUser.role_id == 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "Firm CSV Uploaded",
                title: "Firm CSV Uploaded",
                details: `has added a Firm CSV file ${findCsvName} in partner ${req.body.partner_id}.`
            });
        }
        return REST.success(res, createdFirm, 'Firm imported successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post("/importStore", async function (req, res) {
    const cUser = req.body.current_user;
    let firmUid = req.body.firm_uid;
    try {
        if (!req.files || !req.files.csv) {
            return REST.error(res, "No CSV file was uploaded.", 400);
        }
        let csvFile = req.files.csv;
        const findCsvName = csvFile.name;
        const fileName = `partner_csv/${findCsvName}`;
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: csvFile.data,
            ContentType: "text/csv",
            ACL: "public-read",
        };
        const uploadResult = await s3.upload(params).promise();
        console.log("Uploaded CSV to S3:", uploadResult.Location);
        const stream = streamifier.createReadStream(csvFile.data);
        const rows = [];
        await new Promise((resolve, reject) => {
            stream
                .pipe(csvParser())
                .on("data", (row) => {
                    if (row["FirmID"] && row["FirmID"].trim()) {
                        rows.push(row);
                    }
                })
                .on("end", resolve)
                .on("error", reject);
        });
        if (rows.length === 0) {
            return REST.error(res, "No valid rows with FirmID found.", 400);
        }
        const expectedHeaders = {
            "FirmID": "firm_uid",
            "Store Name": "store_name",
            "State": "state",
            "City": "city",
            "Address": "address",
            "Total Tonnage": "total_tonnage",
            "Type Of Store": "type_of_store",
            "Type Of Cold Storage": "type_of_cold_storage",
            "No Of Chambers": "no_of_chambers",
            "Ante Room Area": "ante_room_area",
            "Total No Of Docks": "total_no_of_docks",
            "Total Office Space": "total_office_space",
            "Type Of Docks": "type_of_docks",
            "Processing Area": "processing_area",
            "Parking Area": "parking_area",
            "Type Of Refrigeration": "type_of_refrigeration",
            "Year Of Installation": "year_of_installation",
            "Vendor Name": "vendor_name",
            "Vendor Number": "vendor_number",
            "Weighbridge": "weighbridge",
            "Road Condition": "road_condition",
            "Internet": "internet",
            "Wifi": "wifi",
            "Cctv": "cctv",
            "Food & Drink": "food_drink"
        };
        const validOptions = ["yes", "no"];
        const validAntRoom = ["Sq ft"]
        const validTotalRoom = ["Sq ft"]
        const validProcessing = ["Sq ft"]
        const totalOfiices = ["Sq ft"]
        const validStoreTypes = ['Chilled', 'Frozen', 'Ambient', 'CA'];
        const validRefrigerationTypes = ['Ammonia', 'Glycol', 'CO2', 'Freon'];
        const validDockTypes = ['Dock Leveller', 'Dock Seal', 'Dock Shelter', 'Fixed', 'Mobile'];
        const validColdStorageTypes = ['Single Commodity', 'Multi Commodity'];
        const validWeighbridgeLocations = ['In Premises', 'Within 1 km', 'Within 5 km'];
        const validRoadConditions = ['Excellent', 'Good', 'Overhead Obstruction at less than 25 feet'];
        const createdStore = [];
        const invalidData = [];
        const validData = [];

        let firm = null;
        const phoneRegex = /^\+91[0-9]{10}$/;
        const yearRegex = /^[0-9]{4}$/;
        const latestStore = await models.stores.findOne({ order: [["created_at", "DESC"]] });
        let serialNumber = latestStore ? parseInt(latestStore.store_uid.slice(3)) + 1 : 1;
        for (let i = 0; i < rows.length; i++) {
            let storeData = {};
            const row = rows[i];
            for (const key in expectedHeaders) {
                storeData[expectedHeaders[key]] = row[key]?.trim() || "";
            }
            const invalidColumns = [];
            if (!storeData.store_name) invalidColumns.push("Store Name");
            if (!storeData.state) invalidColumns.push("State");
            if (!storeData.city) invalidColumns.push("City");
            if (!storeData.address) invalidColumns.push("Address");
            if (!storeData.total_tonnage) invalidColumns.push("Total Tonnage");
            if (!storeData.type_of_store) {
                invalidColumns.push("Type Of Store");
            } else if (!validStoreTypes.some(type => type.toLowerCase() === storeData.type_of_store.toLowerCase())) {
                invalidColumns.push("Type Of Store");
            }
            if (!storeData.type_of_cold_storage) {
                invalidColumns.push("Type Of Cold Storage");
            } else if (!validColdStorageTypes.some(type => type.toLowerCase() === storeData.type_of_cold_storage.toLowerCase())) {
                invalidColumns.push("Type Of Cold Storage");
            }
            if (!storeData.no_of_chambers) invalidColumns.push("No Of Chambers");
            if (!storeData.total_no_of_docks) invalidColumns.push("Total No Of Docks");
            if (!storeData.total_office_space) invalidColumns.push("Total Office Space");
            if (!storeData.type_of_docks) {
                invalidColumns.push("Type Of Docks");
            } else if (!validDockTypes.some(type => type.toLowerCase() === storeData.type_of_docks.toLowerCase())) {
                invalidColumns.push("Type Of Docks");
            }
            if (!storeData.ante_room_area) {
                invalidColumns.push("Ante Room Area");
            } else {
                const antroom = storeData.ante_room_area.split(" ");
                const unit = antroom[1] + " " + antroom[2];
                if (!validAntRoom.some(u => u.toLowerCase() === unit.toLowerCase())) {
                    invalidColumns.push("Ante Room Area");
                }
            }
            if (!storeData.total_office_space) {
                invalidColumns.push("Total Office Space");
            } else {
                const totalOffic = storeData.total_office_space.split(" ");
                const unit = totalOffic[1] + " " + totalOffic[2];
                if (!totalOfiices.some(u => u.toLowerCase() === unit.toLowerCase())) {
                    invalidColumns.push("Total Office Space");
                }
            }
            if (!storeData.parking_area) {
                invalidColumns.push("Parking Area");
            } else {
                const totalParking = storeData.parking_area.split(" ");
                const unit = totalParking[1] + " " + totalParking[2];
                if (!validProcessing.some(u => u.toLowerCase() === unit.toLowerCase())) {
                    invalidColumns.push("Parking Area");
                }
            }
            if (!storeData.processing_area) {
                invalidColumns.push("Processing Area");
            } else {
                const processing = storeData.processing_area.split(" ");
                const unit = processing[1] + " " + processing[2];
                if (!validTotalRoom.some(u => u.toLowerCase() === unit.toLowerCase())) {
                    invalidColumns.push("Processing Area");
                }
            }
            if (!storeData.type_of_refrigeration) {
                invalidColumns.push("Type Of Refrigeration");
            } else if (!validRefrigerationTypes.some(type => type.toLowerCase() === storeData.type_of_refrigeration.toLowerCase())) {
                invalidColumns.push("Type Of Refrigeration");
            }
            else if (!yearRegex.test(storeData.year_of_installation)) {
                invalidColumns.push("Year Of Installation");
            }
            if (!storeData.vendor_name) invalidColumns.push("Vendor Name");
            if (!storeData.vendor_number) invalidColumns.push("Vendor Number");
            if (!storeData.weighbridge) {
                invalidColumns.push("Weighbridge");
            } else if (!validWeighbridgeLocations.some(location => location.toLowerCase() === storeData.weighbridge.toLowerCase())) {
                invalidColumns.push("Weighbridge");
            }
            if (!storeData.road_condition) {
                invalidColumns.push("Road Condition");
            } else if (!validRoadConditions.some(condition => condition.toLowerCase() === storeData.road_condition.toLowerCase())) {
                invalidColumns.push("Road Condition");
            }
            let phone = storeData.vendor_number;
            let formattedPhone = null;
            if (phone) {
                const justDigits = phone.replace(/[^0-9]/g, '');
                if (justDigits.length === 10) {
                    formattedPhone = `+91${justDigits}`;
                }
            }
            storeData.vendor_number = formattedPhone;
            if (!formattedPhone) {
                invalidColumns.push("Vendor Number");
            } else if (!phoneRegex.test(formattedPhone)) {
                invalidColumns.push("Vendor Number");
            }
            if (storeData.type_of_store && !invalidColumns.includes("Type Of Store")) {
                storeData.type_of_store = JSON.stringify(
                    storeData.type_of_store.split("\n").map(value => value.trim()).filter(Boolean)
                );
            }
            const validateYesNo = (value) => {
                return validOptions.includes(value.toLowerCase());
            };
            if (!validateYesNo(storeData.internet)) {
                invalidColumns.push("Internet");
            }
            if (!validateYesNo(storeData.wifi)) {
                invalidColumns.push("Wifi");
            }
            if (!validateYesNo(storeData.cctv)) {
                invalidColumns.push("Cctv");
            }
            if (!validateYesNo(storeData.food_drink)) {
                invalidColumns.push("Food & Drink");
            }
            if (storeData.store_name && storeData.state && storeData.city && storeData.address && storeData.total_tonnage && storeData.type_of_store && storeData.type_of_cold_storage && storeData.no_of_chambers && storeData.ante_room_area && storeData.type_of_docks && storeData.total_office_space && storeData.type_of_docks && storeData.processing_area && storeData.parking_area && storeData.type_of_refrigeration && storeData.vendor_name && storeData.vendor_number && storeData.weighbridge && storeData.road_condition && validateYesNo(storeData.internet) && validateYesNo(storeData.wifi) && validateYesNo(storeData.cctv) && validateYesNo(storeData.food_drink)) {
                storeData.internet = storeData.internet.toLowerCase() === "yes" ? 1 : 0;
                storeData.wifi = storeData.wifi.toLowerCase() === "yes" ? 1 : 0;
                storeData.cctv = storeData.cctv.toLowerCase() === "yes" ? 1 : 0;
                storeData.food_drink = storeData.food_drink.toLowerCase() === "yes" ? 1 : 0;
            }
            storeData.store_uid = `STR${serialNumber.toString().padStart(6, "0")}`;
            serialNumber++;
            storeData.added_by = cUser.id;
            const firmId = storeData.firm_uid;
            firm = await models.User_firm.findOne({ where: { firm_uid: firmId } });
            if (firm && firm.firm_uid === firmUid) {
                storeData.user_id = firm.user_id;
                storeData.firm_id = firm.id;
                latestUserId = firm.user_id;
            } else {
                invalidColumns.push("FirmID");
            }
            if (invalidColumns.length > 0) {
                storeData.invalidColumns = invalidColumns;
                invalidData.push(storeData);
            } else {
                validData.push(storeData);
            }
        }
        if (invalidData.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet("Invalid Data");
            const headers = Object.keys(expectedHeaders);
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
            sheet.columns = headers.map(() => ({ width: 20 }));
            validData.forEach((record) => {
                const row = [
                    record.firm_uid || "",
                    record.store_name || "",
                    record.state || "",
                    record.city || "",
                    record.address || "",
                    record.total_tonnage || "",
                    record.type_of_store || "",
                    record.type_of_cold_storage || "",
                    record.no_of_chambers || "",
                    record.ante_room_area || "",
                    record.total_no_of_docks || "",
                    record.total_office_space || "",
                    record.type_of_docks || "",
                    record.processing_area || "",
                    record.parking_area || "",
                    record.type_of_refrigeration || "",
                    record.year_of_installation || "",
                    record.vendor_name || "",
                    record.vendor_number || "",
                    record.weighbridge || "",
                    record.road_condition || "",
                    record.internet ? "Yes" : "No",
                    record.wifi ? "Yes" : "No",
                    record.cctv ? "Yes" : "No",
                    record.food_drink ? "Yes" : "No"
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
                    record.firm_uid || "",
                    record.store_name || "",
                    record.state || "",
                    record.city || "",
                    record.address || "",
                    record.total_tonnage || "",
                    record.type_of_store || "",
                    record.type_of_cold_storage || "",
                    record.no_of_chambers || "",
                    record.ante_room_area || "",
                    record.total_no_of_docks || "",
                    record.total_office_space || "",
                    record.type_of_docks || "",
                    record.processing_area || "",
                    record.parking_area || "",
                    record.type_of_refrigeration || "",
                    record.year_of_installation || "",
                    record.vendor_name || "",
                    record.vendor_number || "",
                    record.weighbridge || "",
                    record.road_condition || "",
                    record.internet || "",
                    record.wifi || "",
                    record.cctv || "",
                    record.food_drink || ""
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
            const excelKey = `invalid_data/InvalidStoreData_${Date.now()}.xlsx`;
            const uploadResultInvalid = await s3.upload({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: excelKey,
                Body: buffer,
                ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ACL: "public-read"
            }).promise();
            const findFirm = await models.User_firm.findOne({
                where: {
                    firm_uid: firmUid
                }
            })
            if (!findFirm) {
                return REST.error(res, 'Firm Id Not Found', 400);
            }
            firm = findFirm.id;
            await models.user_activity_logs.create({
                user_id: cUser.id,
                activity: findCsvName,
                added_by: cUser.id,
                current_data: uploadResultInvalid.Location,
                activity_type: "store_csv",
                activity_id: firm,
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
        if (rows.length == validData.length) {
            for (const record of validData) {
                try {
                    const createdStoreRecord = await models.stores.create(record);
                    createdStore.push(createdStoreRecord);
                } catch (err) {
                    return REST.error(res, `Error saving store: ${err.message}`, 500);
                }
            }
            if (firm) {
                await models.user_activity_logs.create({
                    user_id: firm.user_id,
                    activity: findCsvName,
                    added_by: cUser.id,
                    activity_type: "store_csv",
                    activity_id: firm.id,
                    current_data: uploadResult.Location,
                    action: "Accepted"
                });
            }
            return REST.success(res, createdStore, 'Store imported successfully');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post("/importPrepare", async function (req, res) {
    const cUser = req.body.current_user;
    const firmUid = req.body.firm_uid;
    try {
        if (!req.files || !req.files.csv) {
            return REST.error(res, "No CSV file was uploaded.", 400);
        }
        let csvFile = req.files.csv;
        const findCsvName = csvFile.name;
        const fileName = `partner_csv/${findCsvName}`;
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: csvFile.data,
            ContentType: "text/csv",
            ACL: "public-read",
        };
        const uploadResult = await s3.upload(params).promise();
        console.log("Uploaded CSV to S3:", uploadResult.Location);
        const stream = streamifier.createReadStream(csvFile.data);
        const rows = [];
        await new Promise((resolve, reject) => {
            stream
                .pipe(csvParser())
                .on("data", (row) => {
                    if (row["FirmID"] && row["FirmID"].trim()) {
                        rows.push(row);
                    }
                })
                .on("end", resolve)
                .on("error", reject);
        });
        if (rows.length === 0) {
            return REST.error(res, "No valid rows with FirmID found.", 400);
        }
        const expectedHeaders = {
            "FirmID": "firm_uid",
            "State": "state",
            "City": "city",
            "Address": "address",
            "Total Hourly Throughput": "total_hourly_throughput",
            "Type Of Prepare": "type_of_prepare",
            "Product Category": "product_category",
            "Product Type": "product_type",
            "Throughput": "throughput",
            "Avg Case Size": "avg_case_size",
            "Number Of Docks": "number_of_docks",
            "Temperature Min": "temperature_min",
            "Temperature Max": "temperature_max",
            "Batch Size": "batch_size",
            "Area": "area"
        };
        const validPrepareTypes = [
            'Blast Freezing', 'IQF', 'Clearing and Forwarding Services', 'Packaging Services', 'Grading of Fresh Produce'
        ];
        const validProductCategories = [
            'Dairy', 'Seafood', 'Meat', 'QSR', 'FMCG Raw Material', 'Frozen Foods', 'Fresh'
        ];
        const validProductTypes = [
            'Dairy', 'Milk', 'Condensed Milk', 'Cream', 'Butter', 'Ghee', 'Buttermilk', 'Yogurt', 'Cheese', 'Casein',
            'Seafood', 'Shrimp', 'Lobster', 'Crab', 'Fish', 'Clams', 'Oysters', 'Squid', 'Octopus',
            'Meat', 'Beef', 'Lamb', 'Pork', 'Veal', 'Chicken', 'Duck', 'Goose', 'Kangaroo',
            'QSR', 'Fast foods', 'Drinks',
            'FMCG Raw Material', 'Food', 'Beverages', 'Stationery', 'Cleaning products', 'Electronics',
            'Frozen Foods', 'Fruits', 'Vegetables', 'Meat', 'Chicken', 'Ready-to-eat', 'Poultry', 'Sea food',
            'Fresh', 'Fruits', 'Vegetables', 'Meat', 'Poultry', 'Fish'
        ];
        const validBatchSizeUnits = ['MT', 'Cases', 'Pallets'];
        const createdPrepare = [];
        const invalidData = [];
        const validData = [];
        let lastUserId = null;
        let firm = null

        const latestPrepare = await models.prepare_details.findOne({ order: [["created_at", "DESC"]] });
        let serialNumber = latestPrepare ? parseInt(latestPrepare.prepare_uid.slice(3)) + 1 : 1;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            let prepareData = {};
            for (const key in expectedHeaders) {
                prepareData[expectedHeaders[key]] = row[key]?.trim() || "";
            }
            const invalidColumns = [];
            if (!prepareData.state) invalidColumns.push("State");
            if (!prepareData.city) invalidColumns.push("City");
            if (!prepareData.address) invalidColumns.push("Address");
            if (!prepareData.total_hourly_throughput) invalidColumns.push("Total Hourly Throughput");
            if (!prepareData.type_of_prepare) {
                invalidColumns.push("Type Of Prepare");
            } else if (!validPrepareTypes.some(type => type.toLowerCase() === prepareData.type_of_prepare.toLowerCase())) {
                invalidColumns.push("Type Of Prepare");
            }
            if (!prepareData.product_category) {
                invalidColumns.push("Product Category");
            } else {
                const categories = prepareData.product_category.split("\n").map(value => value.trim()).filter(Boolean);
                if (!categories.every(cat => validProductCategories.some(valid => valid.toLowerCase() === cat.toLowerCase()))) {
                    invalidColumns.push("Product Category");
                }
            }
            if (!prepareData.product_type) {
                invalidColumns.push("Product Type");
            } else if (!validProductTypes.some(valid => valid.toLowerCase() === prepareData.product_type.toLowerCase())) {
                invalidColumns.push("Product Type");
            }
            if (!prepareData.throughput) {
                invalidColumns.push("Throughput");
            } else {
                const throughputParts = prepareData.throughput.split(" ");
                const unit = throughputParts.pop();
                if (!validBatchSizeUnits.some(u => u.toLowerCase() === unit.toLowerCase())) {
                    invalidColumns.push("Throughput");
                }
            }
            if (!prepareData.avg_case_size) invalidColumns.push("Avg Case Size");
            if (!prepareData.number_of_docks) invalidColumns.push("Number Of Docks");
            if (!prepareData.temperature_min) invalidColumns.push("Temperature Min");
            if (!prepareData.temperature_max) invalidColumns.push("Temperature Max");

            if (!prepareData.batch_size) {
                invalidColumns.push("Batch Size");
            } else {
                const batchSizeParts = prepareData.batch_size.split(" ");
                const unit = batchSizeParts.pop();
                if (!validBatchSizeUnits.some(u => u.toLowerCase() === unit.toLowerCase())) {
                    invalidColumns.push("Batch Size");
                }
            }
            if (!prepareData.area) invalidColumns.push("Area");
            if (prepareData.product_category && !invalidColumns.includes("Product Category")) {
                prepareData.product_category = JSON.stringify(
                    prepareData.product_category.split("\n").map(value => value.trim()).filter(Boolean)
                );
            }
            if (prepareData.product_type && !invalidColumns.includes("Product Type")) {
                prepareData.product_type = JSON.stringify(
                    prepareData.product_type.split("\n").map(value => value.trim()).filter(Boolean)
                );
            }
            prepareData.prepare_uid = `PRE${serialNumber.toString().padStart(6, "0")}`;
            serialNumber++;
            prepareData.added_by = cUser.id;
            prepareData.status = "pending";
            const firmId = prepareData.firm_uid;
            firm = await models.User_firm.findOne({ where: { firm_uid: firmId } });
            if (firm && firm.firm_uid === firmUid) {
                prepareData.user_id = firm.user_id;
                prepareData.firm_id = firm.id;
                lastUserId = firm.user_id;
            } else {
                invalidColumns.push("FirmID");
            }
            if (invalidColumns.length > 0) {
                prepareData.invalidColumns = invalidColumns;
                invalidData.push(prepareData);
            } else {
                validData.push(prepareData);
            }
        }
        if (invalidData.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet("Invalid Data");
            const headers = Object.keys(expectedHeaders);
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
            sheet.columns = headers.map(() => ({ width: 20 }));
            validData.forEach((record) => {
                const row = [
                    record.firm_uid || "",
                    record.state || "",
                    record.city || "",
                    record.address || "",
                    record.total_hourly_throughput || "",
                    record.type_of_prepare || "",
                    record.product_category || "",
                    record.product_type || "",
                    record.throughput || "",
                    record.avg_case_size || "",
                    record.number_of_docks || "",
                    record.temperature_min || "",
                    record.temperature_max || "",
                    record.batch_size || "",
                    record.area || ""
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
                    record.firm_uid || "",
                    record.state || "",
                    record.city || "",
                    record.address || "",
                    record.total_hourly_throughput || "",
                    record.type_of_prepare || "",
                    record.product_category || "",
                    record.product_type || "",
                    record.throughput || "",
                    record.avg_case_size || "",
                    record.number_of_docks || "",
                    record.temperature_min || "",
                    record.temperature_max || "",
                    record.batch_size || "",
                    record.area || ""
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
            const excelKey = `invalid_data/InvalidPrepareData_${Date.now()}.xlsx`;
            const uploadResultInvalid = await s3.upload({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: excelKey,
                Body: buffer,
                ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ACL: "public-read"
            }).promise();
            const findFirm = await models.User_firm.findOne({
                where: {
                    firm_uid: firmUid
                }
            })
            if (!findFirm) {
                return REST.error(res, 'Firm Id Not Found', 400);
            }
            let prepareUid = findFirm.dataValues.id;
            await models.user_activity_logs.create({
                user_id: cUser.id,
                activity: findCsvName,
                added_by: cUser.id,
                current_data: uploadResultInvalid.Location,
                activity_type: "prepare_csv",
                activity_id: prepareUid,
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
        for (const record of validData) {
            try {
                const createdPrepareRecord = await models.prepare_details.create(record);
                createdPrepare.push(createdPrepareRecord);
            } catch (err) {
                return REST.error(res, `Error saving prepare record: ${err.message}`, 500);
            }
        }
        if (lastUserId) {
            await models.user_activity_logs.create({
                user_id: lastUserId,
                activity: findCsvName,
                added_by: cUser.id,
                activity_type: "prepare_csv",
                activity_id: firm.id,
                current_data: uploadResult.Location,
                action: "Accepted"
            });
        }
        return REST.success(res, createdPrepare, "Prepare imported successfully");
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post("/importMove", async function (req, res) {
    const cUser = req.body.current_user;
    const firmUid = req.body.firm_uid;
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
        const exampleMove = await models.move_details.findAll();
        if (!exampleMove) {
            return REST.error(res, "Move model structure not found.", 500);
        }

        const expectedHeaders = {
            "FirmID": "firm_uid",
            "State": "state",
            "City": "city",
            "Make": "make",
            "Model": "model",
            "Vehicle Number": "vehicle_number",
            "Mfg Month Year": "mfg_month_year",
            "Move Class": "move_class",
            "Emission Norms": "emission_norms",
            "Payload": "actual_payload",
            "Crate Capacity": "crate_capacity",
            "Length": "length",
            "Width": "width",
            "Height": "height",
            "Gv Weight": "gv_weight",
            "Unladen Weight Rc": "unladen_weight_rc",
            "Engine No": "engine_no",
            "Side Door": "side_door",
            "Hatch Window": "hatch_window",
            "Dual Temperature / BulkHead": "dual_temperature",
            "Chassis No": "chassis_no",
            "Rc No": "rc_no"
        };

        const filteredHeaders = Object.keys(expectedHeaders).filter(header => headers.includes(header));
        console.log(filteredHeaders, "filteredHeaders")
        if (filteredHeaders.length !== Object.keys(expectedHeaders).length) {
            return REST.error(res, "CSV headers do not match required fields.", 400);
        }

        const headerToDBKey = filteredHeaders.reduce((acc, key) => {
            acc[key] = expectedHeaders[key];
            return acc;
        }, {});

        const createdMove = [];
        const invalidData = [];
        const validData = [];
        let latestUserId = null;
        let firm = null

        const latestMove = await models.move_details.findOne({
            order: [['created_at', 'DESC']]
        });
        let serialNumber = latestMove ? parseInt(latestMove.move_uid.slice(3)) + 1 : 1;
        for (let i = 1; i < rows.length; i++) {
            const rowValues = rows[i].split(",").map(value => value.trim());
            let rowObject = {};

            if (rowValues[0] == "") {
                continue;
            }
            filteredHeaders.forEach((header, index) => {
                const dbKey = headerToDBKey[header];
                if (dbKey && dbKey !== "id") {
                    rowObject[dbKey] = rowValues[index]?.trim() || "";
                }
            });
            let invalidColumns = []
            if (!rowObject.state) invalidColumns.push("State");
            if (!rowObject.city) invalidColumns.push("City");
            if (!rowObject.make) invalidColumns.push("Make");
            if (!rowObject.model) invalidColumns.push("Model");
            if (!rowObject.vehicle_number) invalidColumns.push("Vehicle Number");
            if (!rowObject.mfg_month_year) invalidColumns.push("Mfg Month Year");
            if (!rowObject.move_class) invalidColumns.push("Move Class");
            if (!rowObject.emission_norms) invalidColumns.push("Emission Norms");
            if (!rowObject.actual_payload) invalidColumns.push("Payload");
            if (!rowObject.crate_capacity) invalidColumns.push("Crate Capacity");
            if (!rowObject.length) invalidColumns.push("Length");
            if (!rowObject.width) invalidColumns.push("Width");
            if (!rowObject.height) invalidColumns.push("Height");
            if (!rowObject.gv_weight) invalidColumns.push("Gv Weight");
            if (!rowObject.side_door) invalidColumns.push("Side Door");
            if (!rowObject.hatch_window) invalidColumns.push("Hatch Window");
            if (!rowObject.dual_temperature) invalidColumns.push("Dual Temperature /BulkHead");
            if (!rowObject.chassis_no) invalidColumns.push("Chassis No");
            if (!rowObject.rc_no) invalidColumns.push("Rc No");
            if (!rowObject.engine_no) invalidColumns.push("Engine No");
            const moveId = `MOV${serialNumber.toString().padStart(6, '0')}`;
            serialNumber++
            rowObject.move_uid = moveId;
            rowObject.added_by = cUser.id;
            rowObject.status = "pending";

            const firmId = rowObject.firm_uid;
            firm = await models.User_firm.findOne({ where: { firm_uid: firmId } });
            if (firm && firm.firm_uid === firmUid) {
                rowObject.user_id = firm.user_id;
                rowObject.firm_id = firm.id;
                latestUserId = firm.user_id;
            } else {
                invalidColumns.push("FirmID");
            }
            const [existingVehicleNumber, existingEngineNo, existingRcNo, existingChassisNo] = await Promise.all([
                models.move_details.findOne({ where: { vehicle_number: rowObject.vehicle_number } }),
                models.move_details.findOne({ where: { engine_no: rowObject.engine_no } }),
                models.move_details.findOne({ where: { rc_no: rowObject.rc_no } }),
                models.move_details.findOne({ where: { chassis_no: rowObject.chassis_no } })
            ]);

            if (existingVehicleNumber) invalidColumns.push("Vehicle Number");
            if (existingEngineNo) invalidColumns.push("Engine No");
            if (existingRcNo) invalidColumns.push("Rc No");
            if (existingChassisNo) invalidColumns.push("Chassis No");
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
            const headers = Object.keys(expectedHeaders);
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

            sheet.columns = headers.map(() => ({ width: 20 }));
            validData.forEach((record) => {
                const row = [
                    record.firm_uid || "",
                    record.state || "",
                    record.city || "",
                    record.make || "",
                    record.model || "",
                    record.vehicle_number || "",
                    record.mfg_month_year || "",
                    record.move_class || "",
                    record.emission_norms || "",
                    record.actual_payload || "",
                    record.crate_capacity || "",
                    record.length || "",
                    record.width || "",
                    record.height || "",
                    record.gv_weight || "",
                    record.unladen_weight_rc || "",
                    record.engine_no || "",
                    record.side_door || "",
                    record.hatch_window || "",
                    record.dual_temperature || "",
                    record.chassis_no || "",
                    record.rc_no || ""
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
                    record.firm_uid || "",
                    record.state || "",
                    record.city || "",
                    record.make || "",
                    record.model || "",
                    record.vehicle_number || "",
                    record.mfg_month_year || "",
                    record.move_class || "",
                    record.emission_norms || "",
                    record.actual_payload || "",
                    record.crate_capacity || "",
                    record.length || "",
                    record.width || "",
                    record.height || "",
                    record.gv_weight || "",
                    record.unladen_weight_rc || "",
                    record.engine_no || "",
                    record.side_door || "",
                    record.hatch_window || "",
                    record.dual_temperature || "",
                    record.chassis_no || "",
                    record.rc_no || ""
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
            const excelKey = `invalid_data/InvalidMoveData_${Date.now()}.xlsx`;
            const uploadResultInvalid = await s3.upload({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: excelKey,
                Body: buffer,
                ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ACL: "public-read"
            }).promise();
            const findFirm = await models.User_firm.findOne({
                where: {
                    firm_uid: firmUid
                }
            })
            if (!findFirm) {
                return REST.error(res, 'Firm Id Not Found', 400);
            }
            firm = findFirm.dataValues.id;
            await models.user_activity_logs.create({
                user_id: cUser.id,
                activity: findCsvName,
                added_by: cUser.id,
                current_data: uploadResultInvalid.Location,
                activity_type: "move_csv",
                activity_id: firm,
                action: "Rejected",
                additional_info: uploadResultInvalid.Location
            });
            return REST.error(res, `Invalid data found. Check the uploaded file for details: ${uploadResultInvalid.Location}`, 400);
        }

        for (const record of validData) {
            try {
                const createdMoveRecord = await models.move_details.create(record);
                createdMove.push(createdMoveRecord);
            } catch (createError) {
                return REST.error(res, `Failed to create move: ${createError.message}`, 500);
            }
        }
        if (latestUserId) {
            await models.user_activity_logs.create({
                user_id: latestUserId,
                activity: findCsvName,
                added_by: cUser.id,
                activity_type: "move_csv",
                activity_id: firm.id,
                current_data: uploadResult.Location,
                action: "Accepted"
            });
        }
        return REST.success(res, createdMove, 'Move imported successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post("/importCustomerFirm", async function (req, res) {
    const cUser = req.body.current_user;
    const customerUid = req.body.customer_uid;
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

        const firmTypes = await models.Firm_type.findAll();
        const firmTypeMap = {};
        firmTypes.forEach(firmType => {
            firmTypeMap[firmType.name] = firmType.id;
        });
        const getFirmTypeName = (firmTypeId) => {
            return Object.keys(firmTypeMap).find(key => firmTypeMap[key] === firmTypeId) || firmTypeId;
        };
        const validFirmTypes = [
            "Private Limited",
            "Proprietorship",
            "Partnership",
            "Public Limited",
            "Limited Liability Partnership(LLP)"
        ];

        const headers = rows[0].split(",").map(header => header.trim());
        const exampleFirm = await models.User_firm.findAll();
        if (!exampleFirm) {
            return REST.error(res, "Firm model structure not found.", 500);
        }
        const expectedHeaders = {
            "CustomerID": "user_uid",
            "Firm Name": "firm_name",
            "FirmType": "firm_type",
            "PAN NO": "pan_no",
            "CIN NO": "cin_no",
            "Firm Registered Country": "firm_registered_country",
            "Firm Registered State": "firm_registered_state",
            "Firm Registered City": "firm_registered_city",
            "Firm Registered Address": "firm_registered_addresss",
            "Firm Registered Pincode": "firm_registered_pincode",
            "Gst Number": "gst_number",
        };

        const filteredHeaders = Object.keys(expectedHeaders).filter(header => headers.includes(header));
        if (filteredHeaders.length !== Object.keys(expectedHeaders).length) {
            return REST.error(res, "CSV headers do not match required fields.", 400);
        }

        const headerToDBKey = filteredHeaders.reduce((acc, key) => {
            acc[key] = expectedHeaders[key];
            return acc;
        }, {});

        const createdFirm = [];
        const invalidData = [];
        const validData = [];
        let latestUserId = null;

        const panNoRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
        const cinNoRegex = /^[L|U]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
        const gstNumberRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9]{1}[Z]{1}[0-9A-Z]{1}$/;
        const pincodeRegex = /^[0-9]{6}$/;

        for (let i = 1; i < rows.length; i++) {
            const rowValues = rows[i].split(",").map(value => value.trim());
            let rowObject = {};
            if (rowValues[0] === "") {
                continue;
            }

            filteredHeaders.forEach((header, index) => {
                const dbKey = headerToDBKey[header];
                if (dbKey && dbKey !== "id") {
                    rowObject[dbKey] = rowValues[index]?.trim() || "";
                }
            });
            const invalidColumns = [];
            if (!rowObject.firm_name) {
                invalidColumns.push("Firm Name");
            } else if (rowObject.firm_name.length > 50) {
                invalidColumns.push("Firm Name");
            }
            if (!rowObject.cin_no) invalidColumns.push("CIN NO");
            if (!rowObject.pan_no) invalidColumns.push("PAN NO");
            if (!rowObject.gst_number) invalidColumns.push("Gst Number");
            if (!rowObject.firm_registered_country) invalidColumns.push("Firm Registered Country");
            if (!rowObject.firm_registered_state) invalidColumns.push("Firm Registered State");
            if (!rowObject.firm_registered_city) invalidColumns.push("Firm Registered City");
            if (!rowObject.firm_registered_addresss) invalidColumns.push("Firm Registered Address");
            if (!rowObject.firm_registered_pincode) invalidColumns.push("Firm Registered Pincode");
            if (!rowObject.firm_type) {
                invalidColumns.push("FirmType");
            } else if (!validFirmTypes.includes(rowObject.firm_type)) {
                invalidColumns.push("FirmType");
            }
            if (rowObject.pan_no && !panNoRegex.test(rowObject.pan_no)) {
                invalidColumns.push("PAN NO");
            }
            if (rowObject.cin_no && !cinNoRegex.test(rowObject.cin_no)) {
                invalidColumns.push("CIN NO");
            }
            if (rowObject.gst_number && !gstNumberRegex.test(rowObject.gst_number)) {
                invalidColumns.push("Gst Number");
            }
            if (rowObject.firm_registered_pincode && !pincodeRegex.test(rowObject.firm_registered_pincode)) {
                invalidColumns.push("Firm Registered Pincode");
            }
            const firmUid = `FRM${generateUniqueId({ length: 6, useLetters: false })}`;
            rowObject.firm_uid = firmUid;
            rowObject.added_by = cUser.id;
            rowObject.admin_status = "pending";
            rowObject.document_status = "pending";
            rowObject.status = "pending";
            const firmTypeName = rowObject.firm_type;
            if (validFirmTypes.includes(firmTypeName) && firmTypeMap[firmTypeName]) {
                rowObject.firm_type = firmTypeMap[firmTypeName];
            } else if (rowObject.firm_type && !invalidColumns.includes("FirmType")) {
                invalidColumns.push("FirmType");
            }
            const customerId = rowObject.user_uid;
            const user = await models.User.findOne({ where: { user_uid: customerId } });
            if (user && user.user_uid === customerUid) {
                rowObject.user_id = user.id;
                latestUserId = user.id;
            } else {
                invalidColumns.push("CustomerID");
            }

            const panNo = rowObject.pan_no;
            const cinNo = rowObject.cin_no;
            const gstNumber = rowObject.gst_number;
            const [existingPanNo, existingCinNo, existingGstNumber] = await Promise.all([
                models.User_firm.findOne({ where: { pan_no: panNo } }),
                models.User_firm.findOne({ where: { cin_no: cinNo } }),
                models.User_firm.findOne({ where: { gst_number: gstNumber } }),
            ]);
            if (existingPanNo) invalidColumns.push("PAN NO");
            if (existingCinNo) invalidColumns.push("CIN NO");
            if (existingGstNumber) invalidColumns.push("Gst Number");
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
            const headers = Object.keys(expectedHeaders);
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

            sheet.columns = headers.map(() => ({ width: 20 }));
            validData.forEach((record) => {
                const row = [
                    record.user_uid || "",
                    record.firm_name || "",
                    record.firm_type || "",
                    record.pan_no || "",
                    record.cin_no || "",
                    record.firm_registered_country || "",
                    record.firm_registered_state || "",
                    record.firm_registered_city || "",
                    record.firm_registered_addresss || "",
                    record.firm_registered_pincode || "",
                    record.gst_number || "",
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
                    record.user_uid || "",
                    record.firm_name || "",
                    getFirmTypeName(record.firm_type) || "",
                    record.pan_no || "",
                    record.cin_no || "",
                    record.firm_registered_country || "",
                    record.firm_registered_state || "",
                    record.firm_registered_city || "",
                    record.firm_registered_addresss || "",
                    record.firm_registered_pincode || "",
                    record.gst_number || "",
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
            const excelKey = `invalid_data/InvalidCustomerFirmData_${Date.now()}.xlsx`;
            const uploadResultInvalid = await s3.upload({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: excelKey,
                Body: buffer,
                ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                ACL: "public-read"
            }).promise();
            const findUser = await models.User.findOne({
                where: {
                    user_uid: customerUid
                }
            })
            if (!findUser) {
                return REST.error(res, 'Customer Id Not Found', 400);
            }
            customer = findUser.dataValues.id;
            await models.user_activity_logs.create({
                user_id: cUser.id,
                activity: findCsvName,
                added_by: cUser.id,
                current_data: uploadResultInvalid.Location,
                activity_type: "customerfirm_csv",
                activity_id: customer,
                action: "Rejected",
                additional_info: uploadResultInvalid.Location
            });
            return REST.error(res, `Invalid data found. Check the uploaded file for details: ${uploadResultInvalid.Location}`, 400);
        }
        for (const record of validData) {
            try {
                const createdFirms = await models.User_firm.create(record);
                createdFirm.push(createdFirms);
            } catch (createError) {
                return REST.error(res, `Failed to create firm: ${createError.message}`, 500);
            }
        }

        if (latestUserId) {
            await models.user_activity_logs.create({
                user_id: latestUserId,
                activity: findCsvName,
                added_by: cUser.id,
                activity_type: "customerfirm_csv",
                activity_id: latestUserId,
                current_data: uploadResult.Location,
                action: "Accepted"
            });
        }
        if (cUser.role_id == 4) {
            await models.manager_logs.create({
                user_id: cUser.id,
                activity: "Firm CSV Uploaded",
                title: "Firm CSV Uploaded",
                details: `has added a Firm CSV file ${findCsvName} in Customer ${req.body.customer_uid}.`
            });
        }
        return REST.success(res, createdFirm, 'Customer Firm imported successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
const getAndUploadCSV = async (res, csvFile, heading) => {
    const findCsvName = csvFile.name;
    const csvData = csvFile.data.toString("utf8").trim();
    const rows = csvData.split("\n").map(row => row.trim()).filter(row => row);
    if (rows.length < 2) {
        return REST.error(res, "CSV must contain at least one data row.", 400);
    }
    const fileName = `${heading}/${findCsvName}`;
    const params = {
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: fileName,
        Body: csvFile.data,
        ContentType: 'text/csv',
        ACL: 'public-read'
    };
    const uploadResult = await s3.upload(params).promise();
    return { findCsvName, rows, uploadResult }
}
const validateCSVHeaders = (headers, expectedHeaders, res) => {
    const filteredHeaders = Object.keys(expectedHeaders).filter(header => headers.includes(header));
    if (filteredHeaders.length !== Object.keys(expectedHeaders).length) {
        return REST.error(res, "CSV headers do not match required fields.", 400);
    }
    const headerToDBKey = filteredHeaders.reduce((acc, key) => {
        acc[key] = expectedHeaders[key];
        return acc;
    }, {});
    return { filteredHeaders, headerToDBKey };
};
router.post("/importQuotation", async function (req, res) {
    const customerUid = req.body.customer_uid;
    const cUser = req.body.current_user;
    try {
        if (!req.files || !req.files.csv) {
            return REST.error(res, "No CSV file was uploaded.", 400);
        }
        const { findCsvName, rows, uploadResult } = await getAndUploadCSV(res, req.files.csv, 'quotation_csv')
        const headers = rows[0].split(",").map(header => header.trim());
        const exampleQuotation = await models.quotation_store.findAll();
        if (!exampleQuotation) {
            return REST.error(res, "Quotation model structure not found.", 500);
        }
        const expectedHeaders = {
            "CustomerID": "customer_id",
            "State": "state",
            "City": "city",
            "Product Type": "product_type",
            "Temperature Min": "temperature_min",
            "Temperature Max": "temperature_max",
            "Unit": "unit",
            "Quantity": "quantity",
            "Certification": "certification",
            "Storage Start Date": "date_of_storage",
            "Storage End Date": "end_date",
            "PartnerID": "user_id",
            "StoreID": "store_uid",
            "ChamberID": "chamber_uid",
            "Assigned Pallets": "assigned_pallets"
        };

        const validProductType = ['Fresh Product', 'Dairy Products', 'Dairy Products', 'Meat and Poultry', 'Seafood', 'Beverages', 'Pharmaceuticals', 'Confectioneries', 'Bakery Items', 'Ice cream and Desserts', 'Flowers and Plants'];
        const validUnits = ["Pallets", "MT", "Cubic Feet", "Sq. Feet"]
        const validCertification = ["Indicold Gold", "Indicold Bronze", "Indicold Silver", "BRC Global Standard Certification", "ISO"]
        const { filteredHeaders, headerToDBKey } = validateCSVHeaders(headers, expectedHeaders, res)
        const createdQuotations = [];
        const createAssets = [];
        const createAssigned = [];
        const invalidData = [];
        let validData = [];
        let latestUserId = null;
        let partnerId;
        let customerId;

        for (let i = 1; i < rows.length; i++) {
            const firstRowValues = rows[i].split(",").map(value => value.trim());
            if (firstRowValues[0] == '') {
                continue;
            }
            let firstRowObject = {};
            filteredHeaders.forEach((header, index) => {
                const dbKey = headerToDBKey[header];
                if (dbKey && dbKey !== "id") {
                    customerId = firstRowValues[0];
                    partnerId = firstRowValues[11];
                    firstRowObject[dbKey] = firstRowValues[index] || "";
                }
            });
            const invalidColumns = [];
            if (firstRowObject.customer_id !== customerUid) {
                invalidColumns.push("CustomerID");
            }
            if (!firstRowObject.state) invalidColumns.push("State");
            if (!firstRowObject.city) invalidColumns.push("City");
            if (!firstRowObject.product_type) {
                invalidColumns.push("Product Type");
            } else if (!validProductType.some(type => type.toLowerCase() === firstRowObject.product_type.toLowerCase())) {
                invalidColumns.push("Product Type");
            }
            if (!firstRowObject.temperature_min) invalidColumns.push("Temperature Min");
            if (!firstRowObject.temperature_max) invalidColumns.push("Temperature Max");

            if (!firstRowObject.unit) {
                invalidColumns.push("Unit");
            } else if (!validUnits.some(type => type.toLowerCase() === firstRowObject.unit.toLowerCase())) {
                invalidColumns.push("Unit");
            }
            if (!firstRowObject.quantity) invalidColumns.push("Quantity");
            if (!firstRowObject.certification) {
                invalidColumns.push("Certification");
            } else if (!validCertification.some(type => type.toLowerCase() === firstRowObject.certification.toLowerCase())) {
                invalidColumns.push("Certification");
            }
            if (!firstRowObject.date_of_storage) invalidColumns.push("Storage Start Date");
            if (!firstRowObject.end_date) invalidColumns.push("Storage End Date");
            if (!firstRowObject.assigned_pallets) invalidColumns.push("Assigned Pallets");
            const quotationUid = `SQTN${generateUniqueId({ length: 6, useLetters: false })}`;
            firstRowObject.store_quotation_id = quotationUid;
            firstRowObject.added_by = customerUid;
            firstRowObject.quotation_status = "asset_assigned";
            const StoreID = firstRowObject.store_uid;
            const store = await models.stores.findOne({ where: { store_uid: StoreID } });
            if (!store) invalidColumns.push("StoreID");
            if (store) {
                firstRowObject.type_id = store.id;
                firstRowObject.type = "store";
                if (firstRowObject.state) {
                    if (!(store.state === firstRowObject.state)) {
                        invalidColumns.push(`State`);
                    }
                }
                else {
                    invalidColumns.push(`State`);
                }
                if (firstRowObject.city) {
                    if (!(store.city === firstRowObject.city)) {
                        invalidColumns.push(`City`);
                    }
                } else {
                    invalidColumns.push(`City`);
                }
                let findChamber;
                const ChamberID = firstRowObject.chamber_uid;
                const assignedPallets = parseInt(firstRowObject.assigned_pallets) || 0;
                const findChamberByStore = await models.store_chambers.findAll({
                    where: { store_id: store.id },
                    attributes: ["id", "chamber_uid"]
                });
                if (findChamberByStore.find(item => item.chamber_uid === ChamberID)) {
                    findChamber = await models.store_chambers.findOne({
                        where: { chamber_uid: ChamberID, store_id: store.id }
                    });
                    if (findChamber) {
                        firstRowObject.chamber_id = findChamber.id;
                        const availablePallets = parseInt(findChamber?.available_pallets) || 0;
                        const unavailablePallets = parseInt(findChamber?.unavailable_pallets) || 0;
                        const newAvailablePallets = availablePallets - assignedPallets;
                        const newUnavailablePallets = unavailablePallets + assignedPallets;
                        if (newAvailablePallets < 0) {
                            invalidColumns.push("Assigned Pallets")
                        }
                        else {
                            await findChamber.update({
                                available_pallets: newAvailablePallets,
                                unavailable_pallets: newUnavailablePallets
                            });
                        }
                    } else {
                        invalidColumns.push(`ChamberID "${ChamberID}" not found`);
                    }
                } else {
                    invalidColumns.push(`ChamberID "${ChamberID}" not found`);
                }
            } else {
                invalidColumns.push(`StoreID "${StoreID}" not found`);
            }

            if (customerId === customerUid) {
                const PartnerID = partnerId;
                let [user, partnerData] = await Promise.all([
                    models.User.findOne({ where: { user_uid: customerUid } }),
                    models.User.findOne({ where: { user_uid: PartnerID } })
                ]);
                if (user && user.role_id == 2 && user.user_uid === customerUid) {
                    firstRowObject.customer_id = user.user_uid;
                    latestUserId = user.id;
                } else {
                    invalidColumns.push(`CustomerID "${customerId}" not found or invalid role`);
                }
                if (partnerData) {
                    if (partnerData && partnerData.role_id == 1) {
                        firstRowObject.user_id = partnerData.user_uid;
                    } else {
                        invalidColumns.push(`PartnerID "${PartnerID}" not found or invalid role`);
                    }
                }
                else {
                    invalidColumns.push(`PartnerID "${PartnerID}" not found`);
                }
            }
            else {
                invalidColumns.push(`CustomerID "${customerId}" not found`);
            }
            if (invalidColumns.length > 0) {
                firstRowObject.invalidColumns = invalidColumns;
                invalidData.push(firstRowObject);
            } else {
                validData.push(firstRowObject);
            }
        }
        if (validData) {
            let combined = {};
            validData.forEach((record) => {
                const recordKey = `${record.state},${record.city},${record.product_type},${record.temperature_min},${record.temperature_max},${record.unit},${record.quantity},${record.certification},${record.date_of_storage},${record.end_date},${record.user_id},${record.store_uid}`;
                if (!combined[recordKey]) {
                    combined[recordKey] = {
                        ...record,
                        chambers: [{
                            chamber_uid: record.chamber_uid,
                            chamber_id: record.chamber_id,
                            assigned_pallets: Number(record.assigned_pallets)
                        }]
                    };
                } else {
                    combined[recordKey].chambers.push({
                        chamber_uid: record.chamber_uid,
                        chamber_id: record.chamber_id,
                        assigned_pallets: Number(record.assigned_pallets)
                    });
                }
            });
            validData = Object.values(combined);
        }
        if (invalidData.length > 0) {
            const ExcelJS = require('exceljs');
            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet("Invalid Data");
            const headers = Object.keys(expectedHeaders);
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
            sheet.columns = headers.map(() => ({ width: 20 }));
            validData.forEach((record) => {
                const row = [
                    record.customer_id || "",
                    record.state || "",
                    record.city || "",
                    record.product_type || "",
                    record.temperature_min || "",
                    record.temperature_max || "",
                    record.unit || "",
                    record.quantity || "",
                    record.certification || "",
                    record.date_of_storage || "",
                    record.end_date || "",
                    record.user_id || "",
                    record.store_uid || "",
                    record.chamber_uid || "",
                    record.assigned_pallets || ""
                ];
                sheet.addRow(row);
            });
            invalidData.forEach((record) => {
                const row = [
                    record.customer_id || "",
                    record.state || "",
                    record.city || "",
                    record.product_type || "",
                    record.temperature_min || "",
                    record.temperature_max || "",
                    record.unit || "",
                    record.quantity || "",
                    record.certification || "",
                    record.date_of_storage || "",
                    record.end_date || "",
                    record.user_id || "",
                    record.store_uid || "",
                    record.chamber_uid || "",
                    record.assigned_pallets || ""
                ];
                const addedRow = sheet.addRow(row);
                const invalidColumns = record.invalidColumns || [];
                invalidColumns.forEach((col) => {
                    let colIndex = headers.indexOf(col) + 1;
                    if (colIndex > 0 && addedRow) {
                        const cell = addedRow.getCell(colIndex);
                        if (cell) {
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
                    }
                });
            });
            const buffer = await workbook.xlsx.writeBuffer();
            const excelKey = `invalid_data/InvalidQuotationData_${Date.now()}.xlsx`;
            const uploadResultInvalid = await s3.upload({
                Bucket: process.env.AWS_S3_BUCKET_NAME,
                Key: excelKey,
                Body: buffer,
                ContentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }).promise();
            const findUser = await models.User.findOne({
                where: {
                    user_uid: customerUid
                }
            })
            if (!findUser) {
                return REST.error(res, 'Customer Id Not Found', 400);
            }
            const customer = findUser.dataValues.id
            await models.user_activity_logs.create({
                user_id: findUser.id,
                activity: findCsvName,
                added_by: cUser.id,
                current_data: uploadResultInvalid.Location,
                activity_type: "Quotation_csv",
                activity_id: customer,
                action: "Rejected",
                additional_info: uploadResultInvalid.Location
            });
            if (invalidData.length > 0) {
                return REST.error(res, {
                    status: true,
                    valid: false,
                    message: "Invalid data processed and uploaded.",
                    invalidFileUrl: uploadResultInvalid.Location
                }, 400);
            }
        }
        for (const record of validData) {
            try {
                const customerData = await models.User.findOne({ where: { user_uid: record.customer_id, role_id: 2 } });
                const partnerData = await models.User.findOne({ where: { user_uid: record.user_id, role_id: 1 } });
                const store = await models.stores.findOne({ where: { store_uid: record.store_uid } });
                const newRecord = {
                    ...record,
                    customer_id: customerData.id,
                    user_id: partnerData.id,
                    added_by: cUser.id,
                    status: "pending",
                    quotation_status: "asset_assigned"
                };
                delete newRecord.chambers;
                const createdQuotation = await models.quotation_store.create(newRecord);
                createdQuotations.push(createdQuotation);
                for (const chamber of record.chambers) {
                    const findChamber = await models.store_chambers.findOne({ where: { chamber_uid: chamber.chamber_uid } });
                    let newAvailablePallet = findChamber.available_pallets;
                    const assignedAssetData = {
                        user_id: partnerData.id,
                        quotations_id: createdQuotation.id,
                        chamber_id: chamber.chamber_id,
                        type_id: record.type_id,
                        type: 'store',
                        previous_available_pallets: newAvailablePallet,
                        assigned_pallets: chamber.assigned_pallets,
                        added_by: cUser.id
                    };
                    const createAsset = await models.quotation_assigned_assets.create(assignedAssetData);
                    createAssets.push(createAsset);
                }
                const assignedPartnerData = {
                    user_id: partnerData.id,
                    quotation_id: createdQuotation.id,
                    store_id: store.id,
                    is_assigned_partners: true,
                    is_suggest_selected: true,
                    admin_assigned: true
                };
                const createData = await models.assigned_partners.create(assignedPartnerData);
                createAssigned.push(createData);

                await models.quotation_action.create({
                    user_id: partnerData.id,
                    quotation_id: createdQuotation.id,
                    quotation_action: 'Suggest_Partner',
                    title: 'Added_by',
                    status: 'asset_suggested',
                    updated_by: cUser.id,
                });
                await models.quotation_action.create({
                    user_id: partnerData.id,
                    quotation_id: createdQuotation.id,
                    quotation_action: "Assign_Assets",
                    status: "asset_assigned",
                    title: 'Updated_by',
                    updated_by: cUser.id,
                });
            } catch (createError) {
                return REST.error(res, `Failed to create quotation: ${createError.message}`, 500);
            }
        }
        if (latestUserId) {
            await models.user_activity_logs.create({
                user_id: latestUserId,
                activity: findCsvName,
                added_by: cUser.id,
                activity_type: "Quotation_csv",
                activity_id: latestUserId,
                current_data: uploadResult.Location,
                action: "Accepted"
            });
        }
        return REST.success(res, createdQuotations, 'Quotation imported successfully');
    } catch (error) {
        console.log(error, "error");
        return REST.error(res, error.message, 500);
    }
});


module.exports = router