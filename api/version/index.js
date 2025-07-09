
const exec = require('child_process').exec;
const express = require("express");
const config = require('../..//config');
const router = express.Router();
const REST = require("../../utils/REST");
const { name, version } = require("../../package.json")

router.get("/", async function (req, res) {
	try {
        const data = {
            name: name ?? 'E2EGroup',
            version: version ?? '0.0.1',
            config: config
        }
		return REST.success(res, data, 'Get version success!', 200);
	} catch (error) {
		console.log(error)
		return REST.error(res, error, 500);
	}
});

module.exports = router;

