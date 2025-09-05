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
|                                                  GMB Profile Socre Management Routes
|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
*/

router.post('/save-gmb-profile-socre', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        let gmbProfileSocre = await models.sequelize.transaction(async (transaction) => {
            let data = await models.gmb_profile_socre.create({
                user_id: cUser.id,
                account: req.body.account,
                location: req.body.location,
                verification: req.body.verification,
                business_name_contains_city: req.body.business_name_contains_city,
                address: req.body.address,
                phone_number: req.body.phone_number,
                description_length: req.body.description_length,
                website_link: req.body.website_link,
                timings: req.body.timings,
                labels: req.body.labels,
                categories_primary: req.body.categories_primary,
                categories_additional: req.body.categories_additional,
                category_mentions_city: req.body.category_mentions_city,
                social_media_attached: req.body.social_media_attached,
                appointments_link: req.body.appointments_link,
                service_area: req.body.service_area,
                book_appointment: req.body.book_appointment,
                q_and_a_section_present: req.body.q_and_a_section_present,
                photos: req.body.photos,
                review_rating: req.body.review_rating,
                response_rate: req.body.response_rate,
                reviews_vs_competitors: req.body.reviews_vs_competitors,
                velocity_score: req.body.velocity_score,
                gmb_feed: req.body.gmb_feed,
                total_score: req.body.total_score,
            }, { transaction });
            return data;
        });
        return REST.success(res, gmbProfileSocre, 'GMB Profile Socre saved successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})

// Get GMB Profile Socre list
router.get("/get-gmb-profile-socre", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const gmbProfileSocreList = await models.gmb_profile_socre.findAll({
            where: { user_id: cUser.id },
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                    attributes:["id","user_uid","full_name","email","phone_number","status","account_type","createdAt","updatedAt"]
                }
            ],
            order: [['created_at', 'DESC']]
        });
        return REST.success(res, gmbProfileSocreList, 'Get GMB Profile Socre list success.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// Get GMB Profile Socre by ID
router.get("/get-gmb-profile-socre/:id", async function (req, res) {
    try {
        const gmbProfileSocre = await models.gmb_profile_socre.findOne({
            where: { id: req.params.id },
            include: [
                {
                    model: models.User,
                    as: 'userdetails',
                }
            ]
        });
        if (!gmbProfileSocre) {
            return REST.error(res, 'GMB Profile Socre not found.', 404);
        }
        return REST.success(res, gmbProfileSocre, 'GMB Profile Socre retrieved successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
// delete GMB Profile Socre
router.delete("/delete-gmb-profile-socre/:id", async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const gmbProfileSocre = await models.gmb_profile_socre.findOne({
            where: { id: req.params.id }
        });
        if (!gmbProfileSocre) {
            return REST.error(res, 'GMB Profile Socre not found', 404);
        }

        await gmbProfileSocre.destroy();
        return REST.success(res, {}, 'GMB Profile Socre deleted successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router;