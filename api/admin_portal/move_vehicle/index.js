const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();




/*
|----------------------------------------------------------------------------------------------------------------
|              Move Vehicle Apis
|----------------------------------------------------------------------------------------------------------------
*/
module.exports = router