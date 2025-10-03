const { make } = require('simple-body-validator');
const { Op } = require("sequelize");
const config = require('../../../config');
const constants = require("../../../constants/index");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const router = express.Router();
const support = require('../../../utils/support');
var REST = require("../../../utils/REST");
const user = require('../../../constants/user');





router.post('/schedule-post', async function (req, res) {
    const transaction = await models.sequelize.transaction();
    const cUser = req.body.current_user;
    try {
        const data = req.body;
        const rules = {
            post_name: "required|string",
            post_url: "required|string",
            scheduled_time: "required|date",
        };
        const validator = make(data, rules);
        if (!validator.validate()) {
            await transaction.rollback();
            return REST.error(res, validator.errors().all(), 422);
        }

        const newPost = await models.post_scheduler.create({
            user_id: cUser.id,
            post_name: data.post_name,
            post_url: data.post_url,
            scheduled_time: data.scheduled_time,
            title: data.title,
            description: data.description,
            status: data.status,
            created_by: cUser.id,
        }, { transaction });
        await transaction.commit();
        return REST.success(res, newPost, 'Post scheduled successfully.');
    }
    catch (error) {
        await transaction.rollback();
        return REST.error(res, error.message, 500);
    }
})
router.get('/get-scheduled-posts', async function (req, res) {
    const cUser = req.body.current_user;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    try {
        const { count, rows: posts } = await models.post_scheduler.findAndCountAll({
            where: {
                user_id: cUser.id
            },
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                }
            ],
            order: [['id', 'DESC']],
            limit: pageSize,
            offset: offset
        })
        const totalPages = Math.ceil(count / pageSize);
        return REST.success(res, { posts, totalItems: count, totalPages, currentPage: page }, 'Get scheduled posts successfully.');
    }
    catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/get-scheduled-post/:id', async function (req, res) {
    const postId = req.params.id;
    try {
        const post = await models.post_scheduler.findOne({
            where: {
                id: postId,
            },
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                }
            ],
        })
        if (!post) {
            return REST.error(res, 'Post not found.', 422);
        }
        return REST.success(res, post, 'Get scheduled post successfully.');
    }
    catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/update-scheduled-post/:id', async function (req, res) {
    const transaction = await models.sequelize.transaction();
    const cUser = req.body.current_user;
    const postId = req.params.id;
    try {
        const data = req.body;
        const checkPost = await models.post_scheduler.findOne({
            where: { id: postId },
            transaction
        });
        if (!checkPost) {
            await transaction.rollback();
            return REST.error(res, 'Post not found.', 422);
        }
        await models.post_scheduler.update({
            post_name: data.post_name,
            post_url: data.post_url,
            scheduled_time: data.scheduled_time,
            title: data.title,
            description: data.description,
            status: data.status,
            updated_by: cUser.id,
        }, { where: { id: postId }, transaction });
        const postDetails = await models.post_scheduler.findOne({ where: { id: postId }, transaction });
        await transaction.commit();
        return REST.success(res, postDetails, 'Post updated successfully.');
    }
    catch (error) {
        await transaction.rollback();
        return REST.error(res, error.message, 500);
    }
})
router.delete('/delete-scheduled-post/:id', async function (req, res) {
    const transaction = await models.sequelize.transaction();
    const postId = req.params.id;
    try {
        const checkPost = await models.post_scheduler.findOne({
            where: { id: postId },
            transaction
        });
        if (!checkPost) {
            await transaction.rollback();
            return REST.error(res, 'Post not found.', 422);
        }
        await models.post_scheduler.destroy({ where: { id: postId }, transaction });
        await transaction.commit();
        return REST.success(res, {}, 'Post deleted successfully.');
    }
    catch (error) {
        await transaction.rollback();
        return REST.error(res, error.message, 500);
    }
})
router.get('/get-upcoming-posts', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const posts = await models.post_scheduler.findAll({
            where: {
                user_id: cUser.id,
                scheduled_time: {
                    [Op.gte]: new Date()
                }
            },
            order: [['scheduled_time', 'ASC']],
            limit: 5
        })
        return REST.success(res, posts, 'Get upcoming posts successfully.');
    }
    catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router