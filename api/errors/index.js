const express = require("express");
var REST = require("../../utils/REST");
var router = express.Router();

router.get("/", async function (req, res) {
	const { service, code } = req.query;
	let message = null
	if (service == 'stripe') {
		message = '';
	} else if (service == 'firebase') {
		message = '';
	}
	return REST.success(res, { message: message }, "Get error message success.");
});

module.exports = router;
