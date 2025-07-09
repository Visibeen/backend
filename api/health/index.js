const express = require("express");
var REST = require("../../utils/REST");
var router = express.Router();

router.get("/", async function (req, res) {
	return REST.success(res, null, "Still Ok");
});

module.exports = router;
