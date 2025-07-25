const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();


/*
|----------------------------------------------------------------------------------------------------------------
|                                Routes Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/create_page', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const defaultSlug = req.body.page_name.replace(/\s+/g, '-').toLowerCase();
        const slug = (req.body.slug || defaultSlug);
        const pages = await models.sequelize.transaction(async (transaction) => {
            const data = await models.admin_pages.create({
                slug: slug,
                page_name: req.body.page_name,
                status: req.body.status,
            }, { transaction });
            if (cUser.role_id == 3) {
                await models.user_permission.create({
                    user_id: cUser.id,
                    page_id: data.id,
                    page_name: data.page_name,
                    status: "active",
                    is_permission: true
                }, { transaction });
            }
            return data;
        });
        return REST.success(res, pages, 'Page Added Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getPage', async function (req, res) {
    try {
        const data = await models.admin_pages.findAll({
            order: [["id", "ASC"]],
            raw: true,
            nest: true
        })
        return REST.success(res, data, 'Get All Pages Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/updatePage/:id', async function (req, res) {
    try {
        const id = req.params.id;
        const page = await models.admin_pages.findOne({ where: { id: id } });
        if (!page) {
            return REST.error(res, 'Page ID not found.', 404);
        }

        const { slug, page_name, status } = req.body;
        await models.sequelize.transaction(async (transaction) => {
            await models.admin_pages.update(
                { slug, page_name, status },
                { where: { id: id }, transaction }
            );
        });

        const updatedPage = await models.admin_pages.findOne({ where: { id: id } });
        return REST.success(res, updatedPage, 'Page updated successfully.');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.delete('/deletePages/:id', async function (req, res) {
    try {
        const id = req.params.id
        const pages = await models.admin_pages.findOne({ where: { id: id } })
        if (pages == null) {
            return REST.error(res, 'pages id not found', 404)
        }
        await models.admin_pages.destroy({ where: { id: id } })
        return REST.success(res, null, 'pages delete successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router