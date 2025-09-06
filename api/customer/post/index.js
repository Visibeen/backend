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
const { compare } = require('../../../utils/hash');
const auth = require('../../../utils/auth');
const axios = require('axios');


/*
|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|                                                Post Management Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

router.post("/create-post", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const rules = {
            name: 'required|string',
            testimonial_text: 'required|string'
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
        let post = await models.sequelize.transaction(async (transaction) => {
            let data = await models.post.create({
                user_id: cUser.id,
                name: req.body.name,
                testimonial_text: req.body.testimonial_text,
                image: req.body.image,
            }, { transaction });
            return data;
        });
        return REST.success(res, post, 'Post created successfully');
    } catch (error) {
        console.log(error, "error in create post");
        return REST.error(res, error.message, 500);
    }
});
router.get("/get-posts", async function (req, res) {
    try {
        const posts = await models.post.findAll({
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                }
            ],
            order: [['created_at', 'DESC']]
        });
        return REST.success(res, posts, 'Posts retrieved successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router;