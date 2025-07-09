
const express = require("express");
const router = express.Router();
const REST = require("../../utils/REST");
const manageFile = require("../../utils/manageFile");
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});
const folderName = process.env.AWS_S3_FOLDER_NAME
/*
|----------------------------------------------------------------------------------------------------------------
|              Files Uploade Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get("/:folder/:identifier/:filename", async function (req, res) {
	try {
		const resultGetFile = await manageFile.getFile(req.params?.folder + "/" + req.params?.identifier + "/" + req.params?.filename);
		if (resultGetFile.success) {
			return res.sendFile(resultGetFile.data)
		} else {
			return REST.error(res, resultGetFile.message, 500);
		}
	} catch (error) {
		return REST.error(res, error, 500);
	}
});
router.post("/fileupload", async function (req, res) {
	if (!req.files || req.files.file.length === 0) {
		return REST.error(res, 'No files to upload.', 500);
	} else {
		const foldername = req.body.foldername;
		const uploadedFiles = [];

		if (Array.isArray(req.files.file)) {
			for (const file of req.files.file) {
				const params = {
					Bucket: process.env.AWS_S3_BUCKET_NAME,
					Key: `${folderName}/${foldername}/${Date.now()}_${file.name}`,
					Body: file.data,
					ContentType: getFileContentType(file.name)
				};

				try {
					const data = await s3.upload(params).promise();
					uploadedFiles.push(data.Location);
				} catch (error) {
					return REST.error(res, error.message, 500);
				}
			}
		} else {
			const file = req.files.file;
			const params = {
				Bucket: process.env.AWS_S3_BUCKET_NAME,
				Key: `${folderName}/${foldername}/${Date.now()}_${file.name}`,
				Body: file.data,
				ContentType: getFileContentType(file.name)
			};

			try {
				const data = await s3.upload(params).promise();
				uploadedFiles.push(data.Location);
			} catch (error) {
				return REST.error(res, error.message, 500);
			}
		}
		return REST.success(res, uploadedFiles, 'Files uploaded successfully.');
	}
});
function getFileContentType(fileName) {
	const fileExtension = fileName.split('.').pop().toLowerCase();
	switch (fileExtension) {
		case 'jpg':
			return 'image/jpeg';
		case 'jpeg':
		case 'jfif':
		case 'png':
			if (fileExtension === 'png') {
				return 'image/png';
			} else if (fileExtension === 'jpeg') {
				return 'image/jpeg-alt';
			} else {
				return 'image/jpeg';
			}
		case 'gif':
			return 'image/gif';
		case 'pdf':
			return 'application/pdf';
		default:
			return 'image/jpeg';
	}
}

module.exports = router;

