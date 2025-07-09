const { gen, compare } = require('../../../utils/hash');
const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const support = require('../../../utils/support');
const constants = require("../../../constants/index")
const { sendPushNotification } = require('../../../utils/helper')

/*
|----------------------------------------------------------------------------------------------------------------
|              Firm Partnership Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/create', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        });
        if (cUser.role_id == 3) {
            const validator = make(req.body, {
                firm_id: 'required|numeric',
                request_id: "integer",
                partner_name: 'required|string',
                partner_percentage: 'required|numeric',
                address: 'required|string',
                phone_number: 'required|string',
                email: 'required|string|email',
                designation: 'required|string',
                managing_partner: 'required|string'
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findFirm = await models.User_firm.findByPk(req.body.firm_id)
            if (!findFirm) {
                return REST.error(res, 'Firm not found', 404);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const findFirmUid = findFirm.firm_uid
            const userfirm = await models.sequelize.transaction(async (transaction) => {
                const data = await models.Partner_ship.create({
                    firm_id: req.body.firm_id,
                    partner_name: req.body.partner_name,
                    partner_percentage: req.body.partner_percentage,
                    address: req.body.address,
                    phone_number: req.body.phone_number,
                    email: req.body.email,
                    designation: req.body.designation,
                    din_number: req.body.din_number,
                    managing_partner: req.body.managing_partner,
                    updated_by: req.body.updated_by,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                const kmp_ids = req.body.request_id ? findrequest.user_id : findFirm.user_id;
                await models.user_activity_logs.create({
                    user_id: findFirm.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Firm',
                    activity_id: findFirm.id,
                    activity_type: "firm_partnerships",
                    current_data: {
                        firm_partnerships: [data]
                    },
                    action: "Added",
                    added_by: cUser.id
                });
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findFirm.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm partnerships request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findFirm.user_id,
                    title: `Add Request Completed ${findFirmUid}`,
                    messages: `Your Basic Information firm partnerships request is now complete.`,
                    notification_type: "Firm Managament"

                }, { transaction });
                return data;
            })

            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, userfirm, 'Partnership has create successfully');

        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                firm_id: 'required|numeric',
                partner_name: 'required|string',
                partner_percentage: 'required|numeric',
                address: 'required|string',
                phone_number: 'required|string',
                email: 'required|string|email',
                designation: 'required|string',
                managing_partner: 'required|string'
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findFirm = await models.User_firm.findByPk(req.body.firm_id)
            if (!findFirm) {
                return REST.error(res, 'Firm not found', 404);
            }
            const findUser = await models.User.findOne({
                where: {
                    id: findFirm.user_id
                }
            })
            const UserUid = findUser.user_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const findFirmUid = findFirm.firm_uid
            const userfirm = await models.sequelize.transaction(async (transaction) => {
                const data = await models.Partner_ship.create({
                    firm_id: req.body.firm_id,
                    partner_name: req.body.partner_name,
                    partner_percentage: req.body.partner_percentage,
                    address: req.body.address,
                    phone_number: req.body.phone_number,
                    email: req.body.email,
                    designation: req.body.designation,
                    din_number: req.body.din_number,
                    managing_partner: req.body.managing_partner,
                    updated_by: req.body.updated_by,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                const kmp_ids = req.body.request_id ? findrequest.user_id : findFirm.user_id;
                await models.user_activity_logs.create({
                    user_id: findFirm.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Firm',
                    activity_id: findFirm.id,
                    activity_type: "firm_partnerships",
                    current_data: {
                        firm_partnerships: [data]
                    },
                    action: "Added",
                    added_by: cUser.id
                });
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findFirm.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm partnerships request is now complete.`)

                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Customer Requests",
                    details: `has added firm partnership of ${findFirmUid} in ${UserUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findFirm.user_id,
                    title: `Add Request Completed ${findFirmUid}`,
                    messages: `Your Basic Information firm partnerships request is now complete.`,
                    notification_type: "Firm Managament"

                }, { transaction });
                return data;
            })

            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, userfirm, 'Partnership has create successfully');

        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                firm_id: 'required|numeric',
                partner_name: 'required|string',
                partner_percentage: 'required|numeric',
                address: 'required|string',
                phone_number: 'required|string',
                email: 'required|string|email',
                designation: 'required|string',
                managing_partner: 'required|string'
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const findFirm = await models.User_firm.findByPk(req.body.firm_id)
            if (!findFirm) {
                return REST.error(res, 'Firm not found', 404);
            }
            const findFirmUid = findFirm.firm_uid
            const findUser = await models.User.findOne({
                where: {
                    id: findFirm.user_id
                }
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const UserUid = findUser.user_uid
            const userfirm = await models.sequelize.transaction(async (transaction) => {
                const data = await models.Partner_ship.create({
                    firm_id: req.body.firm_id,
                    partner_name: req.body.partner_name,
                    partner_percentage: req.body.partner_percentage,
                    address: req.body.address,
                    phone_number: req.body.phone_number,
                    email: req.body.email,
                    designation: req.body.designation,
                    din_number: req.body.din_number,
                    managing_partner: req.body.managing_partner,
                    updated_by: req.body.updated_by,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                );
                const kmp_ids = req.body.request_id ? findrequest.user_id : findFirm.user_id;
                await models.user_activity_logs.create({
                    user_id: findFirm.user_id,
                    kmp_id: kmp_ids,
                    activity: 'Firm',
                    activity_id: findFirm.id,
                    activity_type: "firm_partnerships",
                    current_data: {
                        firm_partnerships: [data]
                    },
                    action: "Added",
                    added_by: cUser.id
                });
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: findFirm.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm partnerships request is now complete.`)

                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Add Request",
                    title: "Customer Requests",
                    details: `has added firm partnership of ${findFirmUid} in ${UserUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: findFirm.user_id,
                    title: `Add Request Completed ${findFirmUid}`,
                    messages: `Your Basic Information firm partnerships request is now complete.`,
                    notification_type: "Firm Managament"

                }, { transaction });
                return data;
            })

            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, userfirm, 'Partnership has create successfully');

        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.post('/update', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        });
        if (cUser.role_id == 3) {
            var findPartnerhsip;
            const validator = make(req.body, {
                partnershipid: 'required|numeric',
                firm_id: 'required|numeric',
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            findPartnerhsip = await models.Partner_ship.findOne({ where: { id: req.body.partnershipid } })
            if (!findPartnerhsip) {
                return REST.error(res, 'Partnership ID not valid', 400);
            }
            const firms = await models.User_firm.findOne({ where: { id: findPartnerhsip.firm_id } });
            const firmUid = firms.firm_uid
            await models.sequelize.transaction(async (transaction) => {
                await models.Partner_ship.update(
                    {
                        firm_id: req.body.firm_id,
                        partner_name: req.body.partner_name,
                        partner_percentage: req.body.partner_percentage,
                        address: req.body.address,
                        phone_number: req.body.phone_number,
                        email: req.body.email,
                        designation: req.body.designation,
                        din_number: req.body.din_number,
                        managing_partner: req.body.managing_partner,
                        updated_by: cUser.id
                    },
                    {
                        where: { id: req.body.partnershipid },
                        transaction: transaction
                    }
                );
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: firms.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm partnerships request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: firms.user_id,
                    title: `Edit Request Completed ${firmUid}`,
                    messages: `Your Basic Information firm partnerships request is now complete.`,
                    notification_type: "Firm Managament"

                }, { transaction });

                await models.User_firm.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: firms.id },
                    transaction: transaction
                });
            })

            await models.sequelize.transaction(async (transaction) => {
                const findPartnership1 = await models.Partner_ship.findOne({
                    where: { id: req.body.partnershipid }
                });
                const previousData = {
                    firm_partnerships: [findPartnerhsip.dataValues]
                };
                delete req.body.current_user;
                const currentData = {
                    firm_partnerships: [findPartnership1.dataValues]
                };
                const activityLog = {
                    user_id: firms.user_id,
                    activity: `Firm`,
                    activity_id: firms.id,
                    activity_type: "firm_partnerships",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            });
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            const kmp_ids = req.body.request_id ? findrequest.user_id : firms.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const findPartnership1 = await models.Partner_ship.findOne({
                    where: { id: req.body.partnershipid }
                });
                const previousData = {
                    firm_partnerships: [findPartnerhsip.dataValues]
                };
                delete req.body.current_user;
                const currentData = {
                    firm_partnerships: [findPartnership1.dataValues]
                };
                const activityLog = {
                    user_id: firms.user_id,
                    kmp_id: kmp_ids,
                    activity: `Firm`,
                    activity_id: firms.id,
                    activity_type: "firm_partnerships",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            });
            return REST.success(res, null, 'Partnership updated successfully');
        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            var findPartnerhsip;
            const validator = make(req.body, {
                partnershipid: 'required|numeric',
                firm_id: 'required|numeric'
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            findPartnerhsip = await models.Partner_ship.findOne({ where: { id: req.body.partnershipid } })
            if (!findPartnerhsip) {
                return REST.error(res, 'Partnership ID not valid', 400);
            }
            const firms = await models.User_firm.findOne({ where: { id: findPartnerhsip.firm_id } });
            const findUser = await models.User.findOne({
                where: {
                    id: firms.user_id
                }
            })
            const UserUid = findUser.user_uid
            const firmUid = firms.firm_uid
            await models.sequelize.transaction(async (transaction) => {
                await models.Partner_ship.update(
                    {
                        firm_id: req.body.firm_id,
                        partner_name: req.body.partner_name,
                        partner_percentage: req.body.partner_percentage,
                        address: req.body.address,
                        phone_number: req.body.phone_number,
                        email: req.body.email,
                        designation: req.body.designation,
                        din_number: req.body.din_number,
                        managing_partner: req.body.managing_partner,
                        updated_by: cUser.id
                    },
                    {
                        where: { id: req.body.partnershipid },
                        transaction: transaction
                    }
                );
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: firms.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm partnerships request is now complete.`)

                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Customer Requests",
                    details: `has edit firm partnership for ${firmUid} in ${UserUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: firms.user_id,
                    title: `Edit Request Completed ${firmUid}`,
                    messages: `Your Basic Information firm partnerships request is now complete.`,
                    notification_type: "Firm Managament"
                }, { transaction });

                await models.User_firm.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: firms.id },
                    transaction: transaction
                });
            })
            await models.sequelize.transaction(async (transaction) => {

                const findPartnership1 = await models.Partner_ship.findOne({
                    where: { id: req.body.partnershipid }
                });
                const previousData = {
                    firm_partnerships: [findPartnerhsip.dataValues]
                };
                delete req.body.current_user;
                const currentData = {
                    firm_partnerships: [findPartnership1.dataValues]
                };
                const activityLog = {
                    user_id: firms.user_id,
                    activity: `Firm`,
                    activity_id: firms.id,
                    activity_type: "firm_partnerships",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            });
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }

            const kmp_ids = req.body.request_id ? findrequest.user_id : firms.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const findPartnership1 = await models.Partner_ship.findOne({
                    where: { id: req.body.partnershipid }
                });
                const previousData = {
                    firm_partnerships: [findPartnerhsip.dataValues]
                };
                delete req.body.current_user;
                const currentData = {
                    firm_partnerships: [findPartnership1.dataValues]
                };
                const activityLog = {
                    user_id: firms.user_id,
                    kmp_id: kmp_ids,
                    activity: `Firm`,
                    activity_id: firms.id,
                    activity_type: "firm_partnerships",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            });
            return REST.success(res, null, 'Partnership updated successfully');

        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            var findPartnerhsip;
            const validator = make(req.body, {
                partnershipid: 'required|numeric',
                firm_id: 'required|numeric'
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            findPartnerhsip = await models.Partner_ship.findOne({ where: { id: req.body.partnershipid } })
            if (!findPartnerhsip) {
                return REST.error(res, 'Partnership ID not valid', 400);
            }
            const firms = await models.User_firm.findOne({ where: { id: findPartnerhsip.firm_id } });
            const findUser = await models.User.findOne({
                where: {
                    id: firms.user_id
                }
            })
            const UserUid = findUser.user_uid
            const firmUid = firms.firm_uid
            await models.sequelize.transaction(async (transaction) => {
                await models.Partner_ship.update(
                    {
                        firm_id: req.body.firm_id,
                        partner_name: req.body.partner_name,
                        partner_percentage: req.body.partner_percentage,
                        address: req.body.address,
                        phone_number: req.body.phone_number,
                        email: req.body.email,
                        designation: req.body.designation,
                        din_number: req.body.din_number,
                        managing_partner: req.body.managing_partner,
                        updated_by: cUser.id
                    },
                    {
                        where: { id: req.body.partnershipid },
                        transaction: transaction
                    }
                );
                const findReciverToken = await models.User.findOne({
                    where: {
                        id: firms.user_id
                    }
                })

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);

                // send notification
                await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm partnerships request is now complete.`)

                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Customer Requests",
                    details: `has edit firm partnership for ${firmUid} in ${UserUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: firms.user_id,
                    title: `Edit Request Completed ${firmUid}`,
                    messages: `Your Basic Information firm partnerships request is now complete.`,
                    notification_type: "Firm Managament"

                }, { transaction });

                await models.User_firm.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: firms.id },
                    transaction: transaction
                });
            })
            await models.sequelize.transaction(async (transaction) => {
                const findPartnership1 = await models.Partner_ship.findOne({
                    where: { id: req.body.partnershipid }
                });
                const previousData = {
                    firm_partnerships: [findPartnerhsip.dataValues]
                };
                delete req.body.current_user;
                const currentData = {
                    firm_partnerships: [findPartnership1.dataValues]
                };
                const activityLog = {
                    user_id: firms.user_id,
                    activity: `Firm`,
                    activity_id: firms.id,
                    activity_type: "firm_partnerships",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            });

            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })

            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }

            const kmp_ids = req.body.request_id ? findrequest.user_id : firms.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const findPartnership1 = await models.Partner_ship.findOne({
                    where: { id: req.body.partnershipid }
                });
                const previousData = {
                    firm_partnerships: [findPartnerhsip.dataValues]
                };
                delete req.body.current_user;
                const currentData = {
                    firm_partnerships: [findPartnership1.dataValues]
                };
                const activityLog = {
                    user_id: firms.user_id,
                    kmp_id: kmp_ids,
                    activity: `Firm`,
                    activity_id: firms.id,
                    activity_type: "firm_partnerships",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            });
            return REST.success(res, null, 'Partnership updated successfully');

        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router