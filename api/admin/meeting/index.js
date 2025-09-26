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
|                                                 Meetings Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

router.post('/create-meeting', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const validationRules = {
            lead_id: 'required|integer',
            employee_id: 'required|integer',
            client_id: 'required|integer',
        };
        const validator = make(req.body, validationRules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const findLead = await models.lead.findOne({
            where: {
                id: req.body.lead_id
            }
        })
        if (!findLead) {
            return REST.error(res, 'Lead not found', 404);
        }
        const findEmployee = await models.employee.findOne({
            where: {
                id: req.body.employee_id
            }
        })
        if (!findEmployee) {
            return REST.error(res, 'Employee not found', 404);
        }
        let meetingRecord = await models.sequelize.transaction(async (transaction) => {
            let meeting = await models.meeting.create({
                user_id: cUser.id,
                lead_id: req.body.lead_id,
                employee_id: req.body.employee_id,
                client_id: req.body.client_id,
                comment: req.body.comment,
                title: req.body.title,
                tags: req.body.tags,
                type: req.body.type,
                gst_number: req.body.gst_number,
                meeting_with: req.body.meeting_with,
                lat: req.body.lat,
                long: req.body.long,
                presentation_show: req.body.presentation_show,
                meeting_date: req.body.meeting_date,
                date_time: req.body.date_time,
                month: req.body.month,
                year: req.body.year,
                created_by: cUser.id
            }
                , { transaction });
            return meeting;
        });
        return REST.success(res, meetingRecord, 'meeting added successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.get('/get-meeting', async function (req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        const { count, rows: meetings } = await models.meeting.findAndCountAll({
            include: [
                {
                    model: models.lead,
                    as: "leadDetails"
                },
                {
                    model: models.employee,
                    as: "employeeDetails",
                    include: [
                        {
                            model: models.user_role,
                            as: "role"
                        }
                    ]
                },
                {
                    model: models.User,
                    as: "clientDetails"
                },
                {
                    model: models.User,
                    as: "userDetails"
                },
                {
                    model: models.User,
                    as: "createdby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "updatedBy",
                    attributes: ["id", "full_name"]
                }

            ],
            order: [['created_at', 'DESC']],
            limit: pageSize,
            offset: offset
        });
        const totalPages = Math.ceil(count / pageSize);
        return REST.success(res, { meetings, totalItems: count, totalPages, currentPage: page }, 'Meeting fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.get('/get-meeting/:id', async function (req, res) {
    try {
        const meetingId = req.params.id;
        const meetings = await models.meeting.findOne({
            include: [
                {
                    model: models.lead,
                    as: "leadDetails"
                },
                {
                    model: models.employee,
                    as: "employeeDetails"
                },
                {
                    model: models.User,
                    as: "clientDetails"
                },
                {
                    model: models.User,
                    as: "userDetails"
                },
                {
                    model: models.User,
                    as: "createdby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "updatedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            where:
                { id: meetingId }
        });
        if (!meetings) {
            return REST.error(res, 'meetings not found', 404);
        }
        return REST.success(res, meetings, 'meetings fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.put('/update-meeting/:id', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const findMeeting = await models.meeting.findOne({
            where: {
                id: req.params.id
            }
        })
        if (!findMeeting) {
            return REST.error(res, 'Meeting not found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            await models.meeting.update({
                comment: req.body.comment,
                title: req.body.title,
                tags: req.body.tags,
                type: req.body.type,
                gst_number: req.body.gst_number,
                meeting_with: req.body.meeting_with,
                presentation_show: req.body.presentation_show,
                gmb_status: req.body.gmb_status,
                telly_meeting: req.body.telly_meeting,
                meeting_date: req.body.meeting_date,
                date_time: req.body.date_time,
                month: req.body.month,
                year: req.body.year,
                updated_by: cUser.id
            },
                {
                    where: {
                        id: req.params.id
                    }
                },
                {
                    transaction: transaction
                }
            )
        })
        const NewMeeting = await models.meeting.findOne({
            where: {
                id: req.params.id
            }
        })
        return REST.success(res, NewMeeting, 'Meeting updated successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)

    }
})
router.delete('/delete-meeting/:id', async function (req, res) {
    try {
        const findMeeting = await models.meeting.findOne({
            where: {
                id: req.params.id
            }
        })
        if (!findMeeting) {
            return REST.error(res, 'Meeting not found', 404);
        }
        await models.sequelize.transaction(async (transaction) => {
            await models.meeting.destroy({
                where: {
                    id: req.params.id
                }
            }, {
                transaction: transaction
            })
        })
        return REST.success(res, {}, 'Meeting deleted successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
module.exports = router