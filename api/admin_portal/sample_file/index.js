const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const { LOG } = require('../../../constants');
const router = express.Router();
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const axios = require('axios')
const csvParser = require('csv-parser')
const { parse } = require('json2csv');
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

router.post('/sampleFiles', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        if (!req.files || !req.files.csv) {
            return REST.error(res, "No CSV file was uploaded.", 400);
        }
        let csvFile = req.files.csv;
        const csvData = csvFile.data.toString("utf8").trim();
        const rows = csvData.split("\n").map(row => row.trim()).filter(row => row);
        if (rows.length < 2) {
            return REST.error(res, "CSV must contain at least one data row.", 400);
        }
        const params = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: "FirmCsv",
            Body: csvFile.data,
            ContentType: 'text/csv',
            ACL: 'public-read'
        };
        const uploadResult = await s3.upload(params).promise();
        console.log(uploadResult.Location, "uploadResult");
        rows[0].split(",").map(header => header.trim());
        await models.sample_file.create({
            name: "FirmCsv",
            file_url: uploadResult.Location,
            added_by: cUser.id,
            status: "active"
        });
        return res.status(200).json({
            message: 'File uploaded successfully.',
            fileUrl: uploadResult.Location
        });

    } catch (error) {
        return REST.error(res, "Internal server error. " + error.message, 500);
    }
});
router.get('/partnerCsvSample', async function (req, res) {
    try {
        const data = await models.sample_file.findAll({
            where: {
                name: "partnerCsv"
            }
        })
        return REST.success(res, data, 'Get Partner Csv Upload Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/customerCsvSample', async function (req, res) {
    try {
        const data = await models.sample_file.findAll({
            where: {
                name: "Customer_csv"
            }
        })
        return REST.success(res, data, 'Get Customer Csv Upload Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/firmCsvSample', async function (req, res) {
    try {
        const { partner_id } = req.query;
        if (!partner_id) {
            return REST.error(res, "Partner ID is required", 400);
        }
        const data = await models.sample_file.findOne({
            where: {
                name: "FirmCsv"
            }
        });

        if (!data) {
            return REST.error(res, "Sample file not found", 404);
        }
        const fileUrl = data.file_url;
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        let csvData = [];
        await new Promise((resolve, reject) => {
            response.data.pipe(csvParser())
                .on('data', (row) => {
                    csvData.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (csvData.length > 0) {
            csvData[0].PartnerID = partner_id;
            const modifiedCsv = parse(csvData);
            if (modifiedCsv) {
                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: "FirmCsvNew",
                    Body: modifiedCsv,
                    ContentType: 'text/csv',
                    ACL: 'public-read',
                    CacheControl: 'no-store',
                };

                const uploadResult = await s3.upload(uploadParams).promise();
                await models.sample_file.update(
                    { file_url: uploadResult.Location },
                    { where: { name: "FirmCsv" } }
                );

                const updatedData = await models.sample_file.findOne({
                    where: { name: "FirmCsv" }
                });

                return REST.success(res, {
                    updated_data: updatedData
                }, 'File URL updated successfully');
            } else {
                return REST.error(res, "Failed to convert modified data to CSV", 500);
            }
        } else {
            return REST.error(res, "CSV file is empty", 400);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/storeCsvSample', async function (req, res) {
    try {
        const { firm_id } = req.query;
        if (!firm_id) {
            return REST.error(res, "Firm Id is required", 400);
        }
        const data = await models.sample_file.findOne({
            where: {
                name: "StoreCsv"
            }
        });
        if (!data) {
            return REST.error(res, "Sample file not found", 404);
        }
        const fileUrl = data.file_url;
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        let csvData = [];
        await new Promise((resolve, reject) => {
            response.data.pipe(csvParser())
                .on('data', (row) => {
                    csvData.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });
        if (csvData.length > 0) {
            csvData[0].FirmID = firm_id;
            const modifiedCsv = parse(csvData);
            if (modifiedCsv) {
                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: "StoreCsvNew",
                    Body: modifiedCsv,
                    ContentType: 'text/csv',
                    ACL: 'public-read',
                    CacheControl: 'no-store',
                };

                const uploadResult = await s3.upload(uploadParams).promise();
                await models.sample_file.update(
                    { file_url: uploadResult.Location },
                    { where: { name: "StoreCsv" } }
                );

                const updatedData = await models.sample_file.findOne({
                    where: { name: "StoreCsv" }
                });

                return REST.success(res, {
                    updated_data: updatedData
                }, 'File URL updated successfully');
            } else {
                return REST.error(res, "Failed to convert modified data to CSV", 500);
            }
        } else {
            return REST.error(res, "CSV file is empty", 400);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/prepareCsvSample', async function (req, res) {
    try {
        const { firm_id } = req.query;
        if (!firm_id) {
            return REST.error(res, "Firm Id is required", 400);
        }
        const data = await models.sample_file.findOne({
            where: {
                name: "Prepare_csv"
            }
        });
        if (!data) {
            return REST.error(res, "Sample file not found", 404);
        }
        const fileUrl = data.file_url;
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        let csvData = [];
        await new Promise((resolve, reject) => {
            response.data.pipe(csvParser())
                .on('data', (row) => {
                    csvData.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });
        if (csvData.length > 0) {
            csvData[0].FirmID = firm_id;
            const modifiedCsv = parse(csvData);
            if (modifiedCsv) {
                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: "Prepare_csvNew",
                    Body: modifiedCsv,
                    ContentType: 'text/csv',
                    ACL: 'public-read',
                    CacheControl: 'no-store',
                };

                const uploadResult = await s3.upload(uploadParams).promise();
                await models.sample_file.update(
                    { file_url: uploadResult.Location },
                    { where: { name: "Prepare_csv" } }
                );

                const updatedData = await models.sample_file.findOne({
                    where: { name: "Prepare_csv" }
                });

                return REST.success(res, {
                    updated_data: updatedData
                }, 'File URL updated successfully');
            } else {
                return REST.error(res, "Failed to convert modified data to CSV", 500);
            }
        } else {
            return REST.error(res, "CSV file is empty", 400);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/moveCsvSample', async function (req, res) {
    try {
        const { firm_id } = req.query;
        if (!firm_id) {
            return REST.error(res, "Firm Id is required", 400);
        }
        const data = await models.sample_file.findOne({
            where: {
                name: "MoveCsv"
            }
        });
        if (!data) {
            return REST.error(res, "Sample file not found", 404);
        }
        const fileUrl = data.file_url;
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        let csvData = [];
        await new Promise((resolve, reject) => {
            response.data.pipe(csvParser())
                .on('data', (row) => {
                    csvData.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });
        if (csvData.length > 0) {
            csvData[0].FirmID = firm_id;
            const modifiedCsv = parse(csvData);
            if (modifiedCsv) {
                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: "MoveCsvNew",
                    Body: modifiedCsv,
                    ContentType: 'text/csv',
                    ACL: 'public-read',
                    CacheControl: 'no-store',
                };

                const uploadResult = await s3.upload(uploadParams).promise();
                await models.sample_file.update(
                    { file_url: uploadResult.Location },
                    { where: { name: "MoveCsv" } }
                );

                const updatedData = await models.sample_file.findOne({
                    where: { name: "MoveCsv" }
                });

                return REST.success(res, {
                    updated_data: updatedData
                }, 'File URL updated successfully');
            } else {
                return REST.error(res, "Failed to convert modified data to CSV", 500);
            }
        } else {
            return REST.error(res, "CSV file is empty", 400);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/customerfirmCsvSample', async function (req, res) {
    try {
        const { customer_id } = req.query;
        if (!customer_id) {
            return REST.error(res, "Customer ID is required", 400);
        }
        const data = await models.sample_file.findOne({
            where: {
                name: "CustomerFirmCsv"
            }
        });

        if (!data) {
            return REST.error(res, "Sample file not found", 404);
        }
        const fileUrl = data.file_url;
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        let csvData = [];
        await new Promise((resolve, reject) => {
            response.data.pipe(csvParser())
                .on('data', (row) => {
                    csvData.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });

        if (csvData.length > 0) {
            csvData[0].CustomerID = customer_id;
            const modifiedCsv = parse(csvData);
            if (modifiedCsv) {
                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: "CustomerFirmCsvNew",
                    Body: modifiedCsv,
                    ContentType: 'text/csv',
                    ACL: 'public-read',
                    CacheControl: 'no-store',
                };

                const uploadResult = await s3.upload(uploadParams).promise();
                await models.sample_file.update(
                    { file_url: uploadResult.Location },
                    { where: { name: "CustomerFirmCsv" } }
                );

                const updatedData = await models.sample_file.findOne({
                    where: { name: "CustomerFirmCsv" }
                });

                return REST.success(res, {
                    updated_data: updatedData
                }, 'File URL updated successfully');
            } else {
                return REST.error(res, "Failed to convert modified data to CSV", 500);
            }
        } else {
            return REST.error(res, "CSV file is empty", 400);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/QuotationCsvSample', async function (req, res) {
    try {
        const { customer_id } = req.query;
        if (!customer_id) {
            return REST.error(res, "Customer Id is required", 400);
        }
        const data = await models.sample_file.findOne({
            where: {
                name: "QuotationCsv"
            }
        });
        if (!data) {
            return REST.error(res, "Sample file not found", 404);
        }
        const fileUrl = data.file_url;
        const response = await axios.get(fileUrl, { responseType: 'stream' });
        let csvData = [];
        await new Promise((resolve, reject) => {
            response.data.pipe(csvParser())
                .on('data', (row) => {
                    csvData.push(row);
                })
                .on('end', resolve)
                .on('error', reject);
        });
        if (csvData.length > 0) {
            csvData[0].CustomerID = customer_id;
            const modifiedCsv = parse(csvData);
            if (modifiedCsv) {
                const uploadParams = {
                    Bucket: process.env.AWS_S3_BUCKET_NAME,
                    Key: "QuotationCsvNew",
                    Body: modifiedCsv,
                    ContentType: 'text/csv',
                    ACL: 'public-read',
                    CacheControl: 'no-store',
                };

                const uploadResult = await s3.upload(uploadParams).promise();
                await models.sample_file.update(
                    { file_url: uploadResult.Location },
                    { where: { name: "QuotationCsv" } }
                );

                const updatedData = await models.sample_file.findOne({
                    where: { name: "QuotationCsv" }
                });

                return REST.success(res, {
                    updated_data: updatedData
                }, 'File URL updated successfully');
            } else {
                return REST.error(res, "Failed to convert modified data to CSV", 500);
            }
        } else {
            return REST.error(res, "CSV file is empty", 400);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getVendorMove', async function (req, res) {
    try {
        const data = await models.sample_file.findAll({
            where: {
                name: "MoveVendor"
            }
        })
        return REST.success(res, data, 'Get Move Vendor Csv successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getCustomerVendorMove', async function (req, res) {
    try {
        const data = await models.sample_file.findAll({
            where: {
                name: "CustomerMoveVendor"
            }
        })
        return REST.success(res, data, 'Get Move Customer Vendor Csv successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPartnerVendorStore', async function (req, res) {
    try {
        const data = await models.sample_file.findAll({
            where: {
                name: "StoreVendorCsv"
            }
        })
        return REST.success(res, data, 'Get Store Partner Vendor Csv successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPrepareVendorCsv', async function (req, res) {
    try {
        const data = await models.sample_file.findAll({
            where: {
                name: "PrepareVendorCsv"
            }
        })
        return REST.success(res, data, 'Get Prepare Vendor Csv successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router