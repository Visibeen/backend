const { make } = require('simple-body-validator');
const { Op } = require("sequelize");
const config = require('../../../config');
const constants = require("../../../constants/index");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const moment = require("moment")
const router = express.Router();
const support = require('../../../utils/support');
var REST = require("../../../utils/REST");
const { compare, gen } = require('../../../utils/hash');
const auth = require('../../../utils/auth');
const axios = require('axios');
const nodemailer = require('nodemailer')
const bcrypt = require('bcrypt');
const { log } = require('console');




router.get('/get-roles', async function (req, res) {
    try {
        const data = await models.user_role.findAll({
            order: [["id", "ASC"]]
        })
        return REST.success(res, data, 'Get Role successfully.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router