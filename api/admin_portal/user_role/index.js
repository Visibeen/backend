const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const constants = require("../../../constants");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const support = require('../../../utils/support');

/*
|----------------------------------------------------------------------------------------------------------------
|              Roles Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/get', async function (req, res) {
    try {
        const result = await models.user_role.findAll({
            where: {
                id: [1, 2],
            },
        });
        return REST.success(res, result, 'Get roles list.');
    } catch (error) {
        return REST.error(res, error.message ?? error, 500);
    }
})

module.exports = router 