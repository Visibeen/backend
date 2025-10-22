const { make } = require('simple-body-validator');
const { Op } = require("sequelize");
const express = require("express");
const models = require('../../../models');
const router = express.Router();
const REST = require("../../../utils/REST");
const middleware = require('../../../utils/middleware');

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@visibeen.com';
const ADMIN_ROLE_IDS = [1, 2, 4, 7, 12];

/*
|---------------------------------------------------------------------------------
| Check if current user has access to all features
|---------------------------------------------------------------------------------
*/
router.get('/check-access', middleware.verifyAuthenticate, async function (req, res) {
    try {
        const cUser = req.body.current_user;
        if (!cUser) {
            return REST.error(res, "Unauthorized", 401);
        }

        const user = await models.User.findOne({ where: { id: cUser.id } });
        if (!user) {
            return REST.error(res, "Unauthorized", 401);
        }

        // Check if user is super admin or has admin role - automatic access
        if (user.email === SUPER_ADMIN_EMAIL || ADMIN_ROLE_IDS.includes(user.role_id)) {
            // Get all allowed emails for super admin/admin to view
            const allowedEmails = await models.allowed_email.findAll({
                attributes: ['email'],
                order: [['email', 'ASC']]
            });
            
            return REST.success(res, {
                hasAccess: true,
                userEmail: user.email,
                allowedEmails: allowedEmails.map(item => item.email)
            }, 'Access granted');
        }

        // For regular users, check if they are in the allowed list
        const allowedEmail = await models.allowed_email.findOne({
            where: { 
                email: { 
                    [Op.like]: user.email.toLowerCase() 
                } 
            }
        });

        const hasAccess = allowedEmail !== null;

        // Get all allowed emails for display (only if has access)
        const allowedEmails = hasAccess ? await models.allowed_email.findAll({
            attributes: ['email'],
            order: [['email', 'ASC']]
        }) : [];

        return REST.success(res, {
            hasAccess: hasAccess,
            userEmail: user.email,
            allowedEmails: allowedEmails.map(item => item.email)
        }, hasAccess ? 'Access granted' : 'Access restricted');

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

/*
|---------------------------------------------------------------------------------
| Get all allowed emails (Admin only)
|---------------------------------------------------------------------------------
*/
router.get('/get-allowed-emails', middleware.verifyAuthenticate, middleware.isAdminOrSuperAdmin, async function (req, res) {
    try {
        // Middleware already verified authentication and admin status
        const cUser = req.body.current_user;

        const allowedEmails = await models.allowed_email.findAll({
            include: [
                {
                    model: models.User,
                    as: 'addedByAdmin',
                    attributes: ['id', 'full_name', 'email']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        return REST.success(res, {
            emails: allowedEmails.map(item => item.email),
            details: allowedEmails,
            count: allowedEmails.length
        }, 'Allowed emails fetched successfully');

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

/*
|---------------------------------------------------------------------------------
| Add email to allowed list (Admin only)
|---------------------------------------------------------------------------------
*/
router.post('/add-email', middleware.verifyAuthenticate, middleware.isAdminOrSuperAdmin, async function (req, res) {
    try {
        // Middleware already verified authentication and admin status
        const cUser = req.body.current_user;

        const validationRules = {
            email: "required|email"
        };
        
        const validator = make(req.body, validationRules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }

        const emailToAdd = req.body.email.toLowerCase().trim();

        // Check if email already exists
        const existingEmail = await models.allowed_email.findOne({
            where: { email: emailToAdd }
        });

        if (existingEmail) {
            return REST.error(res, "Email already exists in allowed list", 400);
        }

        // Add the email
        const newAllowedEmail = await models.allowed_email.create({
            email: emailToAdd,
            added_by: cUser.id
        });

        return REST.success(res, {
            email: newAllowedEmail.email,
            id: newAllowedEmail.id
        }, 'Email added successfully');

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

/*
|---------------------------------------------------------------------------------
| Remove email from allowed list (Admin only)
|---------------------------------------------------------------------------------
*/
router.post('/remove-email', middleware.verifyAuthenticate, middleware.isAdminOrSuperAdmin, async function (req, res) {
    try {
        // Middleware already verified authentication and admin status
        const cUser = req.body.current_user;

        const validationRules = {
            email: "required|email"
        };
        
        const validator = make(req.body, validationRules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }

        const emailToRemove = req.body.email.toLowerCase().trim();

        // Find and delete the email
        const deletedCount = await models.allowed_email.destroy({
            where: { email: emailToRemove }
        });

        if (deletedCount === 0) {
            return REST.error(res, "Email not found in allowed list", 404);
        }

        return REST.success(res, {
            email: emailToRemove
        }, 'Email removed successfully');

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

/*
|---------------------------------------------------------------------------------
| Get profile permissions for an email (Admin only)
|---------------------------------------------------------------------------------
*/
router.get('/get-profile-permissions', middleware.verifyAuthenticate, middleware.isAdminOrSuperAdmin, async function (req, res) {
    try {
        const { email } = req.query;
        
        if (!email) {
            return REST.error(res, "Email is required", 400);
        }

        const permissions = await models.profile_permission.findAll({
            where: { email: email.toLowerCase() }
        });

        const profileIds = permissions.map(p => p.profile_id);

        return REST.success(res, {
            email,
            profileIds,
            count: profileIds.length
        }, 'Profile permissions fetched successfully');

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

/*
|---------------------------------------------------------------------------------
| Update profile permissions for an email (Admin only)
|---------------------------------------------------------------------------------
*/
router.post('/update-profile-permissions', middleware.verifyAuthenticate, middleware.isAdminOrSuperAdmin, async function (req, res) {
    try {
        const cUser = req.body.current_user;
        const { email, profileIds } = req.body;

        if (!email) {
            return REST.error(res, "Email is required", 400);
        }

        if (!Array.isArray(profileIds)) {
            return REST.error(res, "profileIds must be an array", 400);
        }

        const emailLower = email.toLowerCase();

        // Delete existing permissions for this email
        await models.profile_permission.destroy({
            where: { email: emailLower }
        });

        // Add new permissions
        if (profileIds.length > 0) {
            const permissionsToCreate = profileIds.map(profileId => ({
                email: emailLower,
                profile_id: profileId,
                added_by: cUser.id
            }));

            await models.profile_permission.bulkCreate(permissionsToCreate);
        }

        return REST.success(res, {
            email: emailLower,
            profileIds,
            count: profileIds.length
        }, 'Profile permissions updated successfully');

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

module.exports = router;
