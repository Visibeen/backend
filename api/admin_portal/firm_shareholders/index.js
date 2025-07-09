const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const constants = require("../../../constants");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const sequelize = require('sequelize')
const { sendPushNotification } = require('../../../utils/helper')
const { sendNotificationPartnerAndKeyManager, findPartnerAndKeyManager } = require('../../../utils/support')

/*
|----------------------------------------------------------------------------------------------------------------
|              Firm Shareholders Apis
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
                user_id: "required|integer",
                firm_id: "required|integer",
                request_id: "integer",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const shareholder = {
                shareholder_name: "required|string",
                address: "required|string",
                phone_number: "required|string",
                email: "email",
                designation: "required|string",
                authorized_signatory: "required|string"
            }
            for (let shareholders of req.body.shareholderdata) {
                const shareholderValidations = make(shareholders, shareholder)
                if (!shareholderValidations.validate()) {
                    return REST.error(res, shareholderValidations.errors().all(), 422);
                }
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
            var shareholderdata = req.body.shareholderdata;
            for (var i = 0; i < shareholderdata.length; i++) {
                await models.sequelize.transaction(async (transaction) => {
                    const data = await models.firm_shareholders.create({
                        firm_id: req.body.firm_id,
                        user_id: req.body.user_id,
                        shareholder_name: shareholderdata[i].shareholder_name,
                        shareholder_percentage: shareholderdata[i].shareholder_percentage,
                        address: shareholderdata[i].address,
                        phone_number: shareholderdata[i].phone_number,
                        email: shareholderdata[i].email,
                        designation: shareholderdata[i].designation,
                        din_number: shareholderdata[i].din_number,
                        authorized_signatory: shareholderdata[i].authorized_signatory,
                        status: constants.KEY_MANAGEMENT.STATUSES.VERIFIED,
                        updated_by: req.body.updated_by,
                        added_by: cUser.id
                    },
                        {
                            transaction: transaction
                        }
                    );
                    const kmp_ids = req.body.request_id ? findrequest.user_id : cUser.id;
                    await models.user_activity_logs.create({
                        user_id: findFirm.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Firm',
                        activity_id: findFirm.id,
                        activity_type: "firm_shareholders",
                        current_data: {
                            firm_shareholders: [data]
                        },
                        action: "Added",
                        added_by: cUser.id
                    });
                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await findPartnerAndKeyManager(req.body.user_id);

                    // send notification
                    await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm shareholders request is now complete.`)

                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findFirm.user_id,
                        title: `Add Request Completed ${findFirmUid}`,
                        messages: `Your Basic Information firm shareholders request is now complete.`,
                        notification_type: "Firm Managament"
                    }, { transaction });

                    return data;
                })
            }

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
            const findFirm1 = await models.firm_shareholders.findOne({ where: { id: req.body.firm_id } });
            return REST.success(res, findFirm1, 'Shareholder has create successfully');

        } else if (findPermission.length > 0 && (cUser.role_id = 4 || req.body.request_id)) {
            const validator = make(req.body, {
                user_id: "required|integer",
                firm_id: "required|integer",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const shareholder = {
                shareholder_name: "required|string",
                address: "required|string",
                phone_number: "required|string",
                email: "email",
                designation: "required|string",
                authorized_signatory: "required|string"
            }
            for (let shareholders of req.body.shareholderdata) {
                const shareholderValidations = make(shareholders, shareholder)
                if (!shareholderValidations.validate()) {
                    return REST.error(res, shareholderValidations.errors().all(), 422);
                }
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
            const findFirmUid = findFirm.firm_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })



            var shareholderdata = req.body.shareholderdata;
            for (var i = 0; i < shareholderdata.length; i++) {
                await models.sequelize.transaction(async (transaction) => {
                    const data = await models.firm_shareholders.create({
                        firm_id: req.body.firm_id,
                        user_id: req.body.user_id,
                        shareholder_name: shareholderdata[i].shareholder_name,
                        shareholder_percentage: shareholderdata[i].shareholder_percentage,
                        address: shareholderdata[i].address,
                        phone_number: shareholderdata[i].phone_number,
                        email: shareholderdata[i].email,
                        designation: shareholderdata[i].designation,
                        din_number: shareholderdata[i].din_number,
                        authorized_signatory: shareholderdata[i].authorized_signatory,
                        status: constants.KEY_MANAGEMENT.STATUSES.VERIFIED,
                        updated_by: req.body.updated_by,
                        added_by: cUser.id
                    },
                        {
                            transaction: transaction
                        }
                    );
                    const kmp_ids = req.body.request_id ? findrequest.user_id : req.body.user_id;
                    await models.user_activity_logs.create({
                        user_id: findFirm.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Firm',
                        activity_id: findFirm.id,
                        activity_type: "firm_shareholders",
                        current_data: {
                            firm_shareholders: [data]
                        },
                        action: "Added",
                        added_by: cUser.id
                    });

                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await findPartnerAndKeyManager(req.body.user_id);

                    // send notification
                    await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm shareholders request is now complete.`)

                    await models.manager_logs.create({
                        user_id: cUser.id,
                        activity: "Add Request",
                        title: "Customer Requests",
                        details: `has added firm shareholders for ${findFirmUid} in ${UserUid}.`
                    });
                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findFirm.user_id,
                        title: `Add Request Completed ${findFirmUid}`,
                        messages: `Your Basic Information firm shareholders request is now complete.`,
                        notification_type: "Firm Managament"

                    }, { transaction });

                    return data;
                })
            }

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
            const findFirm1 = await models.firm_shareholders.findOne({ where: { id: req.body.firm_id } });
            return REST.success(res, findFirm1, 'Shareholder has create successfully');

        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                user_id: "required|integer",
                firm_id: "required|integer",
                request_id: "required|integer",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const shareholder = {
                shareholder_name: "required|string",
                address: "required|string",
                phone_number: "required|string",
                email: "email",
                designation: "required|string",
                authorized_signatory: "required|string"
            }
            for (let shareholders of req.body.shareholderdata) {
                const shareholderValidations = make(shareholders, shareholder)
                if (!shareholderValidations.validate()) {
                    return REST.error(res, shareholderValidations.errors().all(), 422);
                }
            }
            const findFirm = await models.User_firm.findByPk(req.body.firm_id)
            if (!findFirm) {
                return REST.error(res, 'Firm not found', 404);
            }

            const findFirmUid = findFirm.firm_uid
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            if (!findrequest) {
                return REST.error(res, 'Id Not Found', 404);
            }


            for (var i = 0; i < shareholderdata.length; i++) {
                await models.sequelize.transaction(async (transaction) => {
                    const data = await models.firm_shareholders.create({
                        firm_id: req.body.firm_id,
                        user_id: req.body.user_id,
                        shareholder_name: shareholderdata[i].shareholder_name,
                        shareholder_percentage: shareholderdata[i].shareholder_percentage,
                        address: shareholderdata[i].address,
                        phone_number: shareholderdata[i].phone_number,
                        email: shareholderdata[i].email,
                        designation: shareholderdata[i].designation,
                        din_number: shareholderdata[i].din_number,
                        authorized_signatory: shareholderdata[i].authorized_signatory,
                        status: constants.KEY_MANAGEMENT.STATUSES.VERIFIED,
                        updated_by: req.body.updated_by,
                        added_by: cUser.id
                    },
                        {
                            transaction: transaction
                        }
                    );
                    const kmp_ids = req.body.request_id ? findrequest.user_id : req.body.user_id;
                    await models.user_activity_logs.create({
                        user_id: findFirm.user_id,
                        kmp_id: kmp_ids,
                        activity: 'Firm',
                        activity_id: findFirm.id,
                        activity_type: "firm_shareholders",
                        current_data: {
                            firm_shareholders: [data]
                        },
                        action: "Added",
                        added_by: cUser.id
                    });
                    // Find partnerAndKeyManager
                    const partnerAndKeyManager = await findPartnerAndKeyManager(req.body.user_id);

                    // send notification
                    await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm shareholders request is now complete.`)

                    const bodyUser = await models.User.findOne({
                        where: {
                            id: req.body.user_id
                        }
                    })
                    const UserUid = bodyUser.user_uid;
                    await models.manager_logs.create({
                        user_id: cUser.id,
                        activity: "Add Request",
                        title: "Customer Requests",
                        details: `has added firm shareholders for ${findFirmUid} in ${UserUid}.`
                    });
                    await models.notification.create({
                        sender_id: cUser.id,
                        reciver_id: findFirm.user_id,
                        title: `Add Request Completed ${findFirmUid}`,
                        messages: `Your Basic Information firm shareholders request is now complete.`,
                        notification_type: "Firm Managament"
                    }, { transaction });

                    return data;
                })
            }

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

            const findFirm1 = await models.firm_shareholders.findOne({ where: { id: req.body.firm_id } });
            return REST.success(res, findFirm1, 'Shareholder has create successfully');

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
            var findShareholder;
            const validator = make(req.body, {
                shareholderid: 'required|numeric',
                firm_id: 'required|numeric',
                shareholder_percentage: 'required|numeric'
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            findShareholder = await models.firm_shareholders.findOne({ where: { id: req.body.shareholderid } })
            if (!findShareholder) {
                return REST.error(res, 'Shareholder ID not valid', 400);
            }
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const firms = await models.User_firm.findOne({ where: { id: findShareholder.firm_id } });
            const firmUid = firms.firm_uid
            await models.sequelize.transaction(async (transaction) => {
                await models.firm_shareholders.update(
                    {
                        user_id: req.body.user_id,
                        firm_id: req.body.firm_id,
                        shareholder_name: req.body.shareholder_name,
                        shareholder_percentage: req.body.shareholder_percentage,
                        address: req.body.address,
                        phone_number: req.body.phone_number,
                        email: req.body.email,
                        designation: req.body.designation,
                        din_number: req.body.din_number,
                        authorized_signatory: req.body.authorized_signatory,
                        updated_by: cUser.id,
                        status: constants.KEY_MANAGEMENT.STATUSES.VERIFIED,

                    },
                    {
                        where: { id: req.body.shareholderid },
                        transaction: transaction
                    }
                );

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await findPartnerAndKeyManager(findShareholder.user_id);

                // send notification
                await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm shareholders request is now complete.`)

                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: firms.user_id,
                    title: `Edit Request Completed ${firmUid}`,
                    messages: `Your Basic Information firm shareholders request is now complete.`,
                    notification_type: "Firm Managament"
                }, { transaction });

                await models.User_firm.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: firms.id },
                    transaction: transaction
                });
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : firms.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const findFirm1 = await models.firm_shareholders.findOne({ where: { id: req.body.shareholderid } });
                const previousData = {
                    firm_shareholders: [findShareholder.dataValues]
                };
                delete req.body.current_user;
                const currentData = {
                    firm_shareholders: [findFirm1.dataValues]
                };
                const activityLog = {
                    user_id: firms.user_id,
                    kmp_id: kmp_ids,
                    activity: `Firm`,
                    activity_id: firms.id,
                    activity_type: "firm_shareholders",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            });

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
            return REST.success(res, null, 'Shareholder updated Successfully');

        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            var findShareholder;
            const validator = make(req.body, {
                shareholderid: 'required|numeric',
                firm_id: 'required|numeric',
                shareholder_percentage: 'required|numeric'
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            findShareholder = await models.firm_shareholders.findOne({ where: { id: req.body.shareholderid } })
            if (!findShareholder) {
                return REST.error(res, 'Shareholder ID not valid', 400);
            }
            const firms = await models.User_firm.findOne({ where: { id: findShareholder.firm_id } });
            const findUser = await models.User.findOne({
                where: {
                    id: firms.user_id
                }
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            const UserUid = findUser.user_uid
            const firmUid = firms.firm_uid
            await models.sequelize.transaction(async (transaction) => {
                await models.firm_shareholders.update(
                    {
                        user_id: req.body.user_id,
                        firm_id: req.body.firm_id,
                        shareholder_name: req.body.shareholder_name,
                        shareholder_percentage: req.body.shareholder_percentage,
                        address: req.body.address,
                        phone_number: req.body.phone_number,
                        email: req.body.email,
                        designation: req.body.designation,
                        din_number: req.body.din_number,
                        authorized_signatory: req.body.authorized_signatory,
                        updated_by: cUser.id,
                        status: constants.KEY_MANAGEMENT.STATUSES.VERIFIED,

                    },
                    {
                        where: { id: req.body.shareholderid },
                        transaction: transaction
                    }
                );

                // Find partnerAndKeyManager
                const partnerAndKeyManager = await findPartnerAndKeyManager(req.body.user_id);

                // send notification
                await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm shareholders request is now complete.`)

                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Customer Requests",
                    details: `has edit firm shareholders for ${firmUid} in ${UserUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: firms.user_id,
                    title: `Edit Request Completed ${firmUid}`,
                    messages: `Your Basic Information firm shareholders request is now complete.`,
                    notification_type: "Firm Managament"
                }, { transaction });

                await models.User_firm.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: firms.id },
                    transaction: transaction
                });
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : firms.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const findFirm1 = await models.firm_shareholders.findOne({ where: { id: req.body.shareholderid } });
                const previousData = {
                    firm_shareholders: [findShareholder.dataValues]
                };
                delete req.body.current_user;
                const currentData = {
                    firm_shareholders: [findFirm1.dataValues]
                };
                const activityLog = {
                    user_id: firms.user_id,
                    kmp_id: kmp_ids,
                    activity: `Firm`,
                    activity_id: firms.id,
                    activity_type: "firm_shareholders",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
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
            return REST.success(res, null, 'Shareholder updated Successfully');

        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            var findShareholder;
            const validator = make(req.body, {
                shareholderid: 'required|numeric',
                firm_id: 'required|numeric',
                shareholder_percentage: 'required|numeric'
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            findShareholder = await models.firm_shareholders.findOne({ where: { id: req.body.shareholderid } })
            if (!findShareholder) {
                return REST.error(res, 'Shareholder ID not valid', 400);
            }
            const firms = await models.User_firm.findOne({ where: { id: findShareholder.firm_id } });
            const findUser = await models.User.findOne({
                where: {
                    id: firms.user_id
                }
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })

            const UserUid = findUser.user_uid
            const firmUid = firms.firm_uid
            await models.sequelize.transaction(async (transaction) => {
                await models.firm_shareholders.update(
                    {
                        user_id: req.body.user_id,
                        firm_id: req.body.firm_id,
                        shareholder_name: req.body.shareholder_name,
                        shareholder_percentage: req.body.shareholder_percentage,
                        address: req.body.address,
                        phone_number: req.body.phone_number,
                        email: req.body.email,
                        designation: req.body.designation,
                        din_number: req.body.din_number,
                        authorized_signatory: req.body.authorized_signatory,
                        updated_by: cUser.id,
                        status: constants.KEY_MANAGEMENT.STATUSES.VERIFIED,

                    },
                    {
                        where: { id: req.body.shareholderid },
                        transaction: transaction
                    }
                );
                // Find partnerAndKeyManager
                const partnerAndKeyManager = await findPartnerAndKeyManager(req.body.user_id);

                // send notification
                await sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Basic Information firm shareholders request is now complete.`)
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Edit Request",
                    title: "Customer Requests",
                    details: `has edit firm shareholders for ${firmUid} in ${UserUid}.`
                });
                await models.notification.create({
                    sender_id: cUser.id,
                    reciver_id: firms.user_id,
                    title: `Edit Request Completed ${firmUid}`,
                    messages: `Your Basic Information firm shareholders request is now complete.`,
                    notification_type: "Firm Managament"
                }, { transaction });

                await models.User_firm.update({
                    last_updated_by: cUser.id
                }, {
                    where: { id: firms.id },
                    transaction: transaction
                });
            })
            const kmp_ids = req.body.request_id ? findrequest.user_id : firms.user_id;
            await models.sequelize.transaction(async (transaction) => {
                const findFirm1 = await models.firm_shareholders.findOne({ where: { id: req.body.shareholderid } });
                const previousData = {
                    firm_shareholders: [findShareholder.dataValues]
                };
                delete req.body.current_user;
                const currentData = {
                    firm_shareholders: [findFirm1.dataValues]
                };
                const activityLog = {
                    user_id: firms.user_id,
                    kmp_id: kmp_ids,
                    activity: `Firm`,
                    activity_id: firms.id,
                    activity_type: "firm_shareholders",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            });

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
            return REST.success(res, null, 'Shareholder updated Successfully');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router