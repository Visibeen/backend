const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();


/*
|----------------------------------------------------------------------------------------------------------------
|                                  Get State And City Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/getCities', async function (req, res) {
    try {
        const data = await models.cities.findAll({
            attributes: {
                exclude: ['state']
            },
            order: [["city", "ASC"]]
        });
        return REST.success(res, data, 'Data fetched successfully!');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/search', async function (req, res) {
    try {
        const { state } = req.query
        const whereClause = {}
        if (state) {
            whereClause.state = { [Op.like]: `%${state}%` };
        }
        const data = await models.cities.findAll({
            where: whereClause,
            attributes: {
                exclude: ['state']
            },
            order: [['city', 'ASC']]
        });
        return REST.success(res, data, 'Data fetched successfully!');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getAllState', async function (req, res) {
    try {
        const data = await models.cities.findAll({
            attributes: ['state'],
            group: ['state'],
            order: [['state', 'ASC']]
        });
        return REST.success(res, data, 'Data fetched successfully!');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})


module.exports = router