const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const constants = require("../../../constants");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const auth = require("../../../utils/auth");
const config = require("../../../config")
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');

/*
|----------------------------------------------------------------------------------------------------------------
|              Admins  Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/signup', async function (req, res) {
    try {
        const data = req.body;
        const rules = {
            full_name: 'required|string',
            email: 'required|string|ends_with:@indicold.com',
            password: 'required|string',
            phone_number: 'required|string',
        };

        const validator = make(data, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const adminDuplicateEmail = await models.User.findOne({ where: { email: data.email } });
        if (adminDuplicateEmail) {
            return REST.error(res, 'Email has been already taken.', 422);
        }
        const adminDuplicatePhone = await models.User.findOne({ where: { phone_number: data.phone_number } });
        if (adminDuplicatePhone) {
            return REST.error(res, 'Phone number has been already taken.', 422);
        }
        const adminVm = {
            full_name: data.full_name,
            role_id: data.role_id,
            email: data.email,
            phone_number: data.phone_number,
            avatar: data.avatar ?? null,
            status: constants.USER.STATUSES.ACTIVE
        };
        adminVm.password = await gen(data.password);
        const admin = await models.sequelize.transaction(async (transaction) => {
            return await models.User.create(adminVm, { transaction: transaction });
        });
        return REST.success(res, admin, 'Signup Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.post('/login', async function (req, res) {
    try {
        const data = req.body;
        const rules = {
            email: "required|string",
            password: "required|string"
        };
        const validator = make(data, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const user = await models.User.findOne({ where: { email: data.email } });
        if (!user || (user.role_id !== 3 && user.role_id !== 4)) {
            return REST.error(res, 'User not found or invalid role.', 422);
        }
        if (user.role_id === 4 && user.status !== constants.USER.STATUSES.ACTIVE) {
            return REST.error(res, 'Your account has been suspended. Please contact administration.', 400);
        }
        if (user) {
            const passwordMatch = await compare(data.password, user.password);
            if (passwordMatch) {
                const token = auth.shortTermToken({ userid: user.id }, config.USER_SECRET);
                await models.sequelize.transaction(async (transaction) => {
                    await models.User.update(
                        {
                            token: token,
                            login_status: constants.USER.LOGIN_STATUS.ACTIVE,
                            login_date: new Date()
                        },
                        {
                            where: { id: user.id },
                            transaction: transaction
                        }
                    );
                });
                const finalRecord = await models.User.findOne({ where: { id: user.id } });
                const userPermissions = await models.user_permission.findAll({
                    where: { user_id: user.id }
                });

                const pageData = await Promise.all(userPermissions.map(async (permission) => {
                    const pageDetails = await models.admin_pages.findOne({
                        where: {
                            id: permission.page_id
                        }
                    });

                    return {
                        id: permission.id,
                        page_id: permission.page_id,
                        status: permission.status,
                        slug: pageDetails?.slug,
                        page_name: permission.page_name,
                        is_permission: permission.is_permission
                    };
                }));
                finalRecord.dataValues.page = pageData;
                return REST.success(res, finalRecord, 'Login Successful.');
            } else {
                return REST.error(res, 'Incorrect password', 401);
            }
        } else {
            return REST.error(res, 'User not found', 404);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.post('/forget_password', async function (req, res) {
    try {
        const data = req.body;
        const rules = {
            email: "required|string",
        };
        const validator = make(data, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const user = await models.User.findOne({ where: { email: data.email } });
        if (!user) {
            return REST.error(res, 'User not found', 404);
        }
        const token = user.generateResetPasswordToken();
        user.reset_password_token = token;
        user.reset_password_expires = Date.now() + 3600000;
        await user.save();
        var transporter = nodemailer.createTransport({
            host: "sandbox.smtp.mailtrap.io",
            port: 2525,
            auth: {
                user: "0761d47e6abf15",
                pass: "e90935065ade5a"
            }
        });
        const mailOptions = {
            from: '"raman Foo Koch 👻" <raman@minterminds.com>',
            to: user.email,
            subject: "Reset your Password",
            html: `
            <!DOCTYPE html>
            <html>
            
            <head>
              <title>Prosmap</title>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link rel="preconnect" href="https://fonts.googleapis.com">
              <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
              <link
                href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
                rel="stylesheet">
              <style>
                * {
                  padding: 0;
                  margin: 0;
                  font-family: 'Poppins', sans-serif;
                  border-collapse: collapse;
                }
              </style>
            </head>
            
            
            <body>
              <div style="width: 530px;margin: auto;">
                <div style="background: #000;text-align: center;padding: 30px 30px;box-sizing: border-box;">
                     
                <table style="width: 100%;">
                  <tbody><tr>
                    <td>
                      <div style="background: #fff;box-sizing: border-box;padding: 0;border-radius:30px;">
                        <table style="width: 100%;">
                          <tbody><tr>
                            <td style="padding: 50px 0 50px;text-align: center;">
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 0;">
                            <div style="background: #f5f5f5; border-radius: 36px; padding: 32px 20px;">
                              <strong style="font-size: 26px; margin: 0 0 9px; display: block;">Reset Password</strong>
                              <p>If you have lost your password or wish to reset it,
                                use the link to get started.</p>
                              <p style="margin: 0 0 30px;">OTP is</p>
                              <a href="http:localhost:8000/api/v1/admin_portal/auth/reset-password/${user.id}/${token}" target="_blank" class="link c-white"
                              style="display: block; padding: 15px 35px; text-decoration:none; color:#ffffff;background: #000;border-radius: 110px;font-weight: bold;font-size: 17px;width: 50%;margin: 0 auto;">
                              Reset your Password
                            </a>
                            </div>
                            </td>
                          </tr>
                         </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </tbody></table>  
                  
              </div>
              </div>
            </body>
            
            </html>`,
        }
        const link = `${`http:localhost://8000`}/api/v1/admin_portal/auth/reset-password/${user.id}/${token}`;
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                return res.status(500).json({
                    success: false,
                    message: "Error sending email",
                });
            } else {
                return res.status(200).json({
                    success: true,
                    message: "Password reset email sent",
                    body: link,
                });
            }
        });
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/reset-password:/id:token', async function (req, res) {
    try {
        const { id, token } = req.params;
        const user = await models.User.findOne({
            where: {
                id: id,
                reset_password_token: token,
                reset_password_expires: { $gt: Date.now() }
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Token not found or expired",
            });
        }
        return res.status(200).json({
            success: true,
            message: "Token found and valid",
            body: {},
        });
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.post('/update_Password', async function (req, res) {
    try {
        let checkToken = await models.User.findOne({
            where: {
                reset_password_token: req.body.token,
            },
        });
        if (checkToken) {
            const data = req.body;
            const rules = {
                password: 'required|string',
                confirm_password: 'required|string',
            };

            const validator = make(data, rules);
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }

            const salt = await bcrypt.genSalt(10);
            const newPasswordHash = await bcrypt.hash(req.body.password, salt);
            await models.User.update({
                password: newPasswordHash,
                reset_password_token: '',
            }, {
                where: {
                    reset_password_token: req.body.token,
                },
            })
            return REST.success(res, null, 'Password updated successfully')
        } else {
            return REST.error(res, 'Invalid token', 401);
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

module.exports = router