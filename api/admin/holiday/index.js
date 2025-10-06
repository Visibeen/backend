const express = require("express");
const models = require('../../../models');
const moment = require("moment")
const router = express.Router();
const support = require('../../../utils/support');
var REST = require("../../../utils/REST");
const { compare } = require('../../../utils/hash');
const auth = require('../../../utils/auth');
const axios = require('axios');
const { make } = require('simple-body-validator');



/*
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                  Holiday Management Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

router.post("/create-holiday", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const rules = {
            name: 'required|string',
            date: 'required|string',
            template: 'required|string',
        };
        const validator = make(req.body, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().first(), 422);
        }
        const findUser = await models.User.findOne({
            where: {
                id: cUser.id,
            }
        });
        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }

        let holiday = await models.sequelize.transaction(async (transaction) => {
            let data = await models.holiday.create({
                user_id: cUser.id,
                name: req.body.name,
                date: req.body.date,
                template: req.body.template,
                created_by: cUser.id,
                image: req.body.image || null
            }, { transaction });
            return data;
        });
        return REST.success(res, holiday, "Holiday created successfully");
    } catch (error) {
        return REST.error(res, "Failed to create holiday", 500);
    }
});
router.get("/get-all-holidays", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const holidays = await models.holiday.findAll({
            where: { user_id: cUser.id },
            attributes: ['id', 'user_id', 'name', 'date', 'template', 'status', 'created_by', 'updated_by', 'image', 'createdAt', 'updatedAt'],
            order: [['id', 'DESC']],
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                },
                {
                    model: models.User,
                    as: 'createdBy',
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: 'updatedBy',
                    attributes: ["id", "full_name"]
                }
            ]
        });
        return REST.success(res, holidays, "Holidays retrieved successfully");
    } catch (error) {
        console.log(error, "error");
        
        return REST.error(res, "Failed to retrieve holidays", 500);
    }
});
router.get('/search-holidays', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const { name, date, status } = req.query;
        let whereClause = { user_id: cUser.id };
        if (name) {
            whereClause.name = { [models.Sequelize.Op.iLike]: `%${name}%` };
        }
        if (date) {
            whereClause.date = date;
        }
        if (status) {
            whereClause.status = status;
        }
        const holidays = await models.holiday.findAll({
            where: whereClause,
            attributes: ['id', 'user_id', 'name', 'date', 'template', 'status', 'created_by', 'updated_by', 'image', 'createdAt', 'updatedAt'],
            order: [['id', 'DESC']],
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                },
                {
                    model: models.User,
                    as: 'createdBy',
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: 'updatedBy',
                    attributes: ["id", "full_name"]
                }
            ]
        });
        return REST.success(res, holidays, "Holidays retrieved successfully");
    } catch (error) {
        return REST.error(res, "Failed to retrieve holidays", 500);
    }
});
router.put("/update-holiday/:id", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findHoliday = await models.holiday.findOne({
            where: {
                id: req.params.id,
                user_id: cUser.id
            }
        });
        if (!findHoliday) {
            return REST.error(res, 'Holiday not found', 404);
        }
        await findHoliday.update({
            name: req.body.name,
            date: req.body.date,
            template: req.body.template,
            updated_by: cUser.id,
        });
        return REST.success(res, findHoliday, "Holiday updated successfully");
    }

    catch (error) {
        return REST.error(res, "Failed to update holiday", 500);
    }
});
router.delete("/delete-holiday/:id", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findHoliday = await models.holiday.findOne({
            where: {
                id: req.params.id,
                user_id: cUser.id
            }
        });
        if (!findHoliday) {
            return REST.error(res, 'Holiday not found', 404);
        }
        await findHoliday.destroy();
        return REST.success(res, null, "Holiday deleted successfully");
    }
    catch (error) {
        return REST.error(res, "Failed to delete holiday", 500);
    }
});

module.exports = router;