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


/*
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                 Employee Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

router.post('/add-employee', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const validationRules = {
            role_id: "required|integer"
        };
        const validator = make(req.body, validationRules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        let employeeRecord = await models.sequelize.transaction(async (transaction) => {
            let employeeData = await models.employee.create({
                user_id: cUser.id,
                role_id: req.body.role_id,
                report_to: req.body.report_to,
                email: req.body.email,
                employee_code: req.body.employee_code,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                department: req.body.department,
                official_email: req.body.official_email,
                phone_number: req.body.phone_number,
                alternate_phone_number: req.body.alternate_phone_number,
                date_of_joining: req.body.date_of_joining ? moment(req.body.date_of_joining).toDate() : null,
                employee_type: req.body.employee_type,
                additional_tags: req.body.additional_tags,
                family_member_name: req.body.family_member_name,
                family_relation: req.body.family_relation,
                family_contact: req.body.family_contact,
                comment: req.body.comment,
                permanent_address_line1: req.body.permanent_address_line1,
                permanent_address_line2: req.body.permanent_address_line2,
                permanent_city: req.body.permanent_city,
                permanent_zip_code: req.body.permanent_zip_code,
                permanent_state: req.body.permanent_state,
                current_address_line1: req.body.current_address_line1,
                current_address_line2: req.body.current_address_line2,
                current_city: req.body.current_city,
                current_zip_code: req.body.current_zip_code,
                current_state: req.body.current_state,
                current_country: req.body.current_country,
            }
                , { transaction });
            return employeeData;
        });
        return REST.success(res, employeeRecord, 'Employee added successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.get('/get-employees', async function (req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        const { count, rows: employees } = await models.employee.findAndCountAll({
            include: [
                {
                    model: models.user_role,
                    as: "role"
                },
                {
                    model: models.User,
                    as: "reportby"
                },
                {
                    model: models.User,
                    as: 'userDetails'
                }
            ],
            order: [['created_at', 'DESC']],
            limit: pageSize,
            offset: offset
        });
        const totalPages = Math.ceil(count / pageSize);
        return REST.success(res, { employees, totalItems: count, totalPages, currentPage: page }, 'Employees fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.get('/get-employee/:id', async function (req, res) {
    try {
        const employeeId = req.params.id;
        const employee = await models.employee.findOne({
            where:
                { id: employeeId },
            include: [
                {
                    model: models.user_role,
                    as: "role"
                },
                {
                    model: models.User,
                    as: "reportby"
                },
                {
                    model: models.User,
                    as: 'userDetails'
                }
            ],
        });
        if (!employee) {
            return REST.error(res, 'Employee not found', 404);
        }
        return REST.success(res, employee, 'Employee fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.put('/update-employee/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const employeeId = req.params.id;
        const employee = await models.employee.findOne({ where: { id: employeeId } });
        if (!employee) {
            return REST.error(res, 'Employee not found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            await models.employee.update({
                email: req.body.email,
                employee_code: req.body.employee_code,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                department: req.body.department,
                official_email: req.body.official_email,
                phone_number: req.body.phone_number,
                alternate_phone_number: req.body.alternate_phone_number,
                date_of_joining: req.body.date_of_joining ? moment(req.body.date_of_joining).toDate() : null,
                employee_type: req.body.employee_type,
                additional_tags: req.body.additional_tags,
                family_member_name: req.body.family_member_name,
                family_relation: req.body.family_relation,
                family_contact: req.body.family_contact,
                comment: req.body.comment,
                permanent_address_line1: req.body.permanent_address_line1,
                permanent_address_line2: req.body.permanent_address_line2,
                permanent_city: req.body.permanent_city,
                permanent_zip_code: req.body.permanent_zip_code,
                permanent_state: req.body.permanent_state,
                current_address_line1: req.body.current_address_line1,
                current_address_line2: req.body.current_address_line2,
                current_city: req.body.current_city,
                current_zip_code: req.body.current_zip_code,
                current_state: req.body.current_state,
                current_country: req.body.current_country,
            }, { where: { id: employeeId }, transaction });
        });
        const updatedEmployee = await models.employee.findOne({ where: { id: employeeId } });
        return REST.success(res, updatedEmployee, 'Employee updated successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.delete('/delete-employee/:id', async function (req, res) {
    try {
        const employeeId = req.params.id;
        const employee = await models.employee.findOne({ where: { id: employeeId } });
        if (!employee) {
            return REST.error(res, 'Employee not found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            await models.employee.destroy({ where: { id: employeeId }, transaction });
        }
        );
        return REST.success(res, {}, 'Employee deleted successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
module.exports = router;