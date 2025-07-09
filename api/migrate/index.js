const express = require("express");
const models = require('../../models');
const REST = require("../../utils/REST");
const router = express.Router();
const support = require("../../utils/support")
const util = require('util');
const exec = util.promisify(require('child_process').exec);

router.get("/", async function (req, res) {
	try {
		models.sequelize.authenticate().then(() => { }).catch(err => {
			return REST.error(res, 'Connect DB failed: ' + err, 500);
		});
		const { errorMigrate } = await exec('npx sequelize-cli db:migrate');
		if (errorMigrate) {
			throw new Error(errorMigrate);
		}
		const { errorDBSeed } = await exec('npx sequelize-cli db:seed:all');
		if (errorDBSeed) {
			throw new Error(errorDBSeed);
		}
		return REST.success(res, null, 'Migrate success!', 200);
	} catch (error) {
		console.log(error)
		return REST.error(res, error, 500);
	}
});

module.exports = router;

