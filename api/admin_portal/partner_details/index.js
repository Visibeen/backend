const { make } = require('simple-body-validator');
const { Op, where } = require('sequelize');
const constants = require("../../../constants");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const Sequelize = require('sequelize')

/*
|----------------------------------------------------------------------------------------------------------------
|              Partner Details Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/partnerDetails', async function (req, res) {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize
    try {
        const whereClause = {
            role_id: 1
        }
        const totalCount = await models.User.count({ where: whereClause });
        const users = await models.User.findAll({
            where: whereClause,
            order: [["id", "DESC"]],
            offset: offset,
            limit: pageSize,
        });
        for (let user of users) {
            const userFirms = await models.User_firm.findAll({
                where: {
                    user_id: user.id
                },
                raw: true
            });
            for (let firm of userFirms) {
                firm.designation = user.designation
            }
            user.user_firms = userFirms;
            delete user['designation'];
        }
        const totalPages = Math.ceil(totalCount / pageSize);
        return REST.success(res, {
            users,
            pagination: {
                totalCount,
                totalPages,
                currentPage: page,
                pageSize,
            },
        }, 'Partner Details Successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getByIdPartner/:id', async function (req, res) {
    try {
        const findUser = await models.User.findOne({ where: { id: req.params.id, role_id: 1 } })
        if (!findUser) {
            throw new Error('Partner id not found')
        }
        const data = await models.User.findOne({
            where: { id: req.params.id, role_id: 1 },
            include: [
                {
                    model: models.User_firm,
                    as: 'user_firm',
                },
                {
                    model: models.stores,
                    as: "stores"
                },
                {
                    model: models.move_details,
                    as: "move_details"
                },
                {
                    model: models.move_compliance_details,
                    as: "move_compliance_details"
                },
                {
                    model: models.prepare_details,
                    as: "prepare_details"
                },
                {
                    model: models.Account_details,
                    as: "Account_details"
                }
            ],
            order: [["id", "DESC"]],
            raw: true,
            nest: true
        })
        return REST.success(res, data, 'Partner Details Get By Id Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.delete('/deletePartner/:id', async function (req, res) {
    try {
        const findUser = await models.User.findOne({ where: { id: req.params.id, role_id: 1 } })
        if (!findUser) {
            throw new Error('Partner id not found')
        }
        const data = await models.User.destroy({ where: { id: req.params.id } })
        return REST.success(res, data, 'Partner Deleted Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/unregisteredPartner', async function (req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;
        const offset = (page - 1) * pageSize;
        const { globalSearch } = req.query;
        let whereClause = {
            [Op.and]: [
                {
                    app_completed_steps: {
                        [Op.in]: [
                            constants.USER.APP_COMPLETED_STEPS.LOGIN,
                            constants.USER.APP_COMPLETED_STEPS.VERIFY,
                            constants.USER.APP_COMPLETED_STEPS.ROLES
                        ]
                    }
                },
                { is_registered: constants.USER.REGISTERED_STATUS.NOT_REGISTERED },
                { is_key_manager: constants.USER.KEY_STATUS.FALSE },
                {
                    role_id: {
                        [Op.or]: [1, 2, null]
                    }
                }
            ]
        };
        if (globalSearch) {
            const searchTerms = globalSearch.split(',').map(term => term.trim());
            whereClause[Op.and].push({
                [Op.or]: [
                    ...searchTerms.map(term => ({ user_uid: { [Op.like]: `%${term}%` } })),
                    ...searchTerms.map(term => ({ phone_number: { [Op.like]: `%${term}%` } })),
                ]
            });
        }
        const totalCount = await models.User.count({ where: whereClause });
        const users = await models.User.findAll({
            where: whereClause,
            order: [["id", "DESC"]],
            offset,
            limit: pageSize,
        });
        const totalPages = Math.ceil(totalCount / pageSize);
        return REST.success(res, {
            users,
            pagination: {
                totalCount,
                totalPages,
                currentPage: page,
                pageSize,
            },
        }, 'Unregistered Partner Get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/registeredPartner', async function (req, res) {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    try {
        let whereClause = {
            is_registered: constants.USER.REGISTERED_STATUS.IS_REGISTERED,
            role_id: 1,
        };
        if (req.query.role_id) {
            if (req.query.role_id === '3' || req.query.role_id === '4') {
                whereClause.role_id = { [Op.notIn]: [3, 4] };
            } else {
                whereClause.role_id = req.query.role_id;
            }
        }

        let filters = [];
        const globalSearch = req.query.search;

        if (globalSearch) {
            filters.push({
                [Op.or]: [
                    { user_uid: { [Op.like]: `%${globalSearch}%` } },
                    { full_name: { [Op.like]: `%${globalSearch}%` } },
                    { email: { [Op.like]: `%${globalSearch}%` } },
                    { phone_number: { [Op.like]: `%${globalSearch}%` } },
                    { designation: { [Op.like]: `%${globalSearch}%` } }
                ]
            });
        }

        ['user_uid', 'full_name', 'email', 'phone_number', 'designation'].forEach(field => {
            if (req.query[field]) {
                filters.push({ [field]: { [Op.like]: `%${req.query[field]}%` } });
            }
        });

        if (filters.length > 0) {
            whereClause = {
                [Op.and]: [whereClause, { [Op.or]: filters }]
            };
        }

        const totalCount = await models.User.count({ where: whereClause });
        const users = await models.User.findAll({
            where: whereClause,
            include: [
                {
                    model: models.User,
                    as: "AddedByCsv",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.user_activity_logs,
                    as: "updated_details",
                    order: [['created_at', 'DESC']],
                    limit: 1,
                    include: [
                        {
                            model: models.User,
                            as: 'updated_details',
                            attributes: ["id", "full_name"]
                        }
                    ]
                },
                {
                    model: models.request_for_store,
                    as: "requests",
                    include: [
                        {
                            model: models.stores,
                            as: "storeDetails",
                            include: [
                                {
                                    model: models.User,
                                    as: 'addedby',
                                    attributes: ["id", "full_name"]
                                },
                                {
                                    model: models.User,
                                    as: "updatedBy",
                                    attributes: ["id", "full_name"]
                                }
                            ]
                        },
                        {
                            model: models.move_details,
                            as: "moveDetails",
                            include: [
                                {
                                    model: models.User,
                                    as: "updatedby",
                                    attributes: ["id", "full_name"]
                                },
                                {
                                    model: models.User,
                                    as: "addedby",
                                    attributes: ["id", "full_name"]
                                }
                            ]
                        },
                        {
                            model: models.User_firm,
                            as: "firmDetails"
                        },
                        {
                            model: models.prepare_details,
                            as: "prepareDetails",
                            include: [
                                {
                                    model: models.User,
                                    as: "addedby",
                                    attributes: ["id", "full_name"]
                                },
                                {
                                    model: models.User,
                                    as: "updatebyUser",
                                    attributes: ["id", "full_name"]
                                }
                            ]
                        },
                        {
                            model: models.User,
                            as: "requested_by", attributes: ["id", "full_name"]
                        }
                    ],
                }
            ],
            order: [["id", "DESC"]],
            offset,
            limit: pageSize,
        });

        if (users.length > 0) {
            for (const user of users) {
                let firms = await models.User_firm.findAll({
                    where: { user_id: user.id },
                    attributes: ["id", "firm_uid", "firm_name", "pan_document", "upload_gst_certificate"],
                    include: [
                        {
                            model: models.Firm_type,
                            as: "firmtype",
                            attributes: ["name"],
                        },
                        {
                            model: models.Account_details,
                            as: "account_details",
                            attributes: ["id"]
                        }
                    ],
                });

                user.dataValues.user_firm = firms || [];

                for (const firm of firms) {
                    if (
                        firm.firmtype &&
                        ["Private Limited", "Public Limited", "Limited Liability Partnership(LLP)"].includes(firm.firmtype.name)
                    ) {
                        const findsharholder = await models.firm_shareholders.findOne({
                            where: { firm_id: firm.id }
                        });
                        firm.dataValues.has_shareholders = !!findsharholder;
                    }
                    if (firm.firmtype && firm.firmtype.name === "Partnership") {
                        const findPartnership = await models.Partner_ship.findOne({
                            where: { firm_id: firm.id }
                        });
                        firm.dataValues.has_partnerships = !!findPartnership;
                    }
                    firm.dataValues.has_account_details = Array.isArray(firm.account_details)
                        ? firm.account_details.length > 0
                        : !!firm.account_details?.id;
                    const findStore = await models.stores.findAll({
                        where: { firm_id: firm.id },
                        attributes: ["id", "store_name", "store_uid"],
                        include: [
                            {
                                model: models.store_compliance_details,
                                as: "store_compliance_details",
                                attributes: [
                                    "fsssai_license_url", "iso_certificate_url", "haccp_url",
                                    "post_control_url", "brc_audit_url", "fire_safety_noc_url",
                                    "pollution_noc_url", "mcd_license_url", "up_cold_storage_license_url",
                                    "factory_license_url", "panchayat_noc_url"
                                ]
                            },
                            {
                                model: models.store_additional_submissions,
                                as: "store_additional_submissions",
                                attributes: ["no_lien_certificate_url", "latest_electricity_bill_url"]
                            }
                        ]
                    });

                    const findPrepare = await models.prepare_details.findAll({
                        where: { firm_id: firm.id },
                        attributes: ["id", "prepare_uid"],
                        include: [
                            {
                                model: models.prepare_compliance_details,
                                as: "prepare_compliance_details",
                                attributes: [
                                    "fsssai_license_url", "iso_certificate_url", "haccp_url",
                                    "pest_control_agency_contract_url", "brc_audit_url", "fire_safety_noc_url",
                                    "pollution_noc_url", "mcd_license_url", "up_cold_storage_license_url",
                                    "factory_license_url", "panchayat_noc_url"
                                ]
                            },
                            {
                                model: models.prepare_additional_submissions,
                                as: "prepare_additional_details",
                                attributes: ["no_lien_certificate_url", "electricity_bill_url"]
                            }
                        ]
                    });
                    const findMove = await models.move_details.findAll({
                        where: { firm_id: firm.id },
                        attributes: ["id", "move_uid"],
                        include: [
                            {
                                model: models.move_compliance_details,
                                as: "move_compliance_details",
                                attributes: ["insurance_policy", "permit_url", "pucc_url", "fitness_certificate"]
                            }
                        ]
                    });

                    firm.dataValues.stores = findStore.map(store => ({
                        id: store.id,
                        store_name: store.store_name,
                        store_uid: store.store_uid,
                        complianceDetails: validateStore(store).complianceDetails,
                        additionalDetails: validateStore(store).additionalDetails
                    }));

                    firm.dataValues.prepares = findPrepare.map(prepare => ({
                        id: prepare.id,
                        prepare_uid: prepare.prepare_uid,
                        complianceDetails: validatePrepare(prepare).complianceDetails,
                        additionalDetails: validatePrepare(prepare).additionalDetails
                    }));

                    firm.dataValues.moves = findMove.map(move => ({
                        id: move.id,
                        move_uid: move.move_uid,
                        complianceDetails: validateMove(move).complianceDetails
                    }));
                }
            }
        }
        users.forEach(added => {
            if (added.AddedByCsv) {
                added.AddedByCsv.dataValues.createdAt = added.createdAt;
            }
        });
        users.forEach(user => {
            if (user.requests) {
                user.requests.forEach(request => {
                    if (request.storeDetails) {
                        if (request.storeDetails.addedby) {
                            request.storeDetails.addedby.dataValues.created_at = request.storeDetails.createdAt;
                        }
                        if (request.storeDetails.updatedBy) {
                            request.storeDetails.updatedBy.dataValues.updated_at = request.storeDetails.updatedAt;
                        }
                    }
                });
            }
        });

        users.forEach(user => {
            if (user.requests) {
                user.requests.forEach(request => {
                    if (request.moveDetails) {
                        if (request.moveDetails.addedby) {
                            request.moveDetails.addedby.dataValues.created_at = request.moveDetails.createdAt;
                        }
                        if (request.moveDetails.updatedby) {
                            request.moveDetails.updatedby.dataValues.updated_at = request.moveDetails.updatedAt;
                        }
                    }
                });
            }
        });

        users.forEach(user => {
            if (user.requests) {
                user.requests.forEach(request => {
                    if (request.prepareDetails) {
                        if (request.prepareDetails.addedby) {
                            request.prepareDetails.addedby.dataValues.created_at = request.prepareDetails.createdAt;
                        }
                        if (request.prepareDetails.updatebyUser) {
                            request.prepareDetails.updatebyUser.dataValues.updated_at = request.prepareDetails.updatedAt;
                        }
                    }
                });
            }
        });

        users.forEach(user => {
            user.dataValues.requests.forEach(items => {
                if (Array.isArray(items.requested_by)) {
                    items.requested_by.forEach(requestedBy => {
                        requestedBy.dataValues.created_at = items.createdAt;
                        requestedBy.dataValues.updated_at = items.updatedAt;
                    });
                } else if (items.requested_by) {
                    const requestedBy = items.requested_by;
                    requestedBy.dataValues.created_at = items.createdAt;
                    requestedBy.dataValues.updated_at = items.updatedAt;
                }
            });
        });

        const totalPages = Math.ceil(totalCount / pageSize);
        return REST.success(res, {
            users,
            pagination: {
                totalCount,
                totalPages,
                currentPage: page,
                pageSize,
            },
        }, 'Registered Partner Get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/firmList/:user_uid', async function (req, res) {
    try {
        const userUid = req.params.user_uid;
        const user = await models.User.findOne({
            where: { user_uid: userUid },
            include: [
                {
                    model: models.User_firm,
                    as: 'user_firm',
                    include: [
                        {
                            model: models.Firm_type,
                            as: 'firmtype'
                        },
                        {
                            model: models.User,
                            as: 'updated_by_details',
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.User,
                            as: 'addedbys',
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.User,
                            as: "Verified_detail",
                            attributes: ["id", "full_name"]
                        }
                    ]
                }
            ]
        });
        if (!user) {
            return REST.error(res, 'User  UID not found', 404);
        }
        user.dataValues.user_firm.forEach(items => {
            if (items.dataValues.addedbys) {
                items.dataValues.addedbys.dataValues.created_at = items.dataValues.createdAt;
            }
            if (items.dataValues.updated_by_details) {
                items.dataValues.updated_by_details.dataValues.updated_at = items.dataValues.updatedAt;
            }
            if (items.dataValues.Verified_detail) {
                items.dataValues.Verified_detail.dataValues.verified_at = items.dataValues.verified_at;
            }
        });
        return REST.success(res, user, 'Firm list fetched successfully!');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getFirmdetails/:firm_uid', async function (req, res) {
    try {
        const findFirm = await models.User_firm.findOne({ where: { firm_uid: req.params.firm_uid } })
        if (!findFirm) {
            return REST.error(res, 'Firm Uid not exist', 404);
        }
        const firm_uid = req.params.firm_uid;
        const firmDetails = await models.User_firm.findOne({
            where: { firm_uid: firm_uid },
            include: [
                {
                    model: models.User,
                    as: "user"
                },
                {
                    model: models.User,
                    as: "updated_by_details",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.Partner_ship,
                    as: "firm_partnerships",
                    include: [
                        {
                            model: models.User,
                            as: "addedby",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.User,
                            as: "updatedby",
                            attributes: ["id", "full_name"]
                        },
                    ]
                },
                {
                    model: models.Firm_type,
                    as: "firmtype"
                },
                {
                    model: models.firm_shareholders,
                    as: 'firm_shareholders',
                    include: [
                        {
                            model: models.User,
                            as: "addedby",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.User,
                            as: "updatedby",
                            attributes: ["id", "full_name"]
                        }
                    ]
                },
                {
                    model: models.Branch,
                    as: "branches",
                    include: [
                        {
                            model: models.User,
                            as: "addedby",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.User,
                            as: "updatedby",
                            attributes: ["id", "full_name"]
                        }
                    ]
                },
                {
                    model: models.Key_management,
                    as: "key_management",
                    include: [
                        {
                            model: models.firm_key_management_permission,
                            as: "management_permission",
                            include: [
                                {
                                    model: models.firm_key_management_permission_list,
                                    as: "permission_Details",
                                    attributes: ["name"]
                                }
                            ]
                        },
                        {
                            model: models.User,
                            as: "addedby",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.User,
                            as: "updatedby",
                            attributes: ["id", "full_name"]
                        }
                    ]
                },
                {
                    model: models.Account_details,
                    as: "account_details",
                    include: [
                        {
                            model: models.User,
                            as: "addedby",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.User,
                            as: "updatedby",
                            attributes: ["id", "full_name"]
                        }
                    ]
                }
            ]
        });
        if (!firmDetails) {
            return REST.error(res, 'Firm Id Not Found', 404);
        }
        if (firmDetails.dataValues.updated_by_details) {
            firmDetails.dataValues.updated_by_details.dataValues.updated_at = firmDetails.dataValues.updatedAt
        }
        for (let partnership of firmDetails.firm_partnerships) {
            if (partnership && partnership.dataValues && partnership.dataValues.addedby) {
                partnership.dataValues.addedby.dataValues.created_at = partnership.dataValues.createdAt;
            }
            if (partnership && partnership.dataValues && partnership.dataValues.updatedby) {
                partnership.dataValues.updatedby.dataValues.updated_at = partnership.dataValues.updatedAt;
            }
        }

        for (let shareholder of firmDetails.firm_shareholders) {
            if (shareholder && shareholder.dataValues && shareholder.dataValues.addedby) {
                shareholder.dataValues.addedby.dataValues.created_at = shareholder.dataValues.createdAt;
            }
            if (shareholder && shareholder.dataValues && shareholder.dataValues.updatedby) {
                shareholder.dataValues.updatedby.dataValues.updated_at = shareholder.dataValues.updatedAt;
            }
        }

        for (let branch of firmDetails.branches) {
            if (branch && branch.dataValues && branch.dataValues.addedby) {
                branch.dataValues.addedby.dataValues.created_at = branch.dataValues.createdAt;
            }
            if (branch && branch.dataValues && branch.dataValues.updatedby) {
                branch.dataValues.updatedby.dataValues.updated_at = branch.dataValues.updatedAt;
            }
        }

        for (let keymanagement of firmDetails.key_management) {
            if (keymanagement && keymanagement.dataValues && keymanagement.dataValues.addedby) {
                keymanagement.dataValues.addedby.dataValues.created_at = keymanagement.dataValues.createdAt;
            }
            if (keymanagement && keymanagement.dataValues && keymanagement.dataValues.updatedby) {
                keymanagement.dataValues.updatedby.dataValues.updated_at = keymanagement.dataValues.updatedAt;
            }
        }

        for (let account of firmDetails.account_details) {
            if (account && account.dataValues && account.dataValues.addedby) {
                account.dataValues.addedby.dataValues.created_at = account.dataValues.createdAt;
            }
            if (account && account.dataValues && account.dataValues.updatedby) {
                account.dataValues.updatedby.dataValues.updated_at = account.dataValues.updatedAt;
            }
        }

        const requestkey = [
            "firm_branches",
            "firm_shareholders",
            "firm_partnerships",
            "firm_branches",
            "firm_account_details"
        ]
        const request = await Promise.all(requestkey.map(async (key) => {
            return await models.request_for_store.findAll({
                where: { section_id: findFirm.id, section_key: key }
            })
        }))
        const requestForFirm = {}
        for (let i = 0; i < requestkey.length; i++) {
            requestForFirm[requestkey[i]] = request[i];
        }
        firmDetails.dataValues.request = requestForFirm;
        return REST.success(res, firmDetails, 'Get All User Firm successfully');
    } catch (error) {
        return REST.error(res, error.message ?? error, 500);
    }
});
router.get('/firmDetails/:id', async function (req, res) {
    try {
        const partnerId = req.params.id;
        const userFirm = await models.User_firm.findOne({
            where: {
                user_id: partnerId
            },
            include: [
                {
                    model: models.Firm_type,
                    as: 'firmtype'
                }
            ]
        });
        if (!userFirm) {
            return REST.error(res, 'Partner Id Not Found!', 404);
        }
        return REST.success(res, userFirm, 'Firm details fetched successfully!');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getkeyPermission/:firm_uid', async (req, res) => {
    try {
        const firmUid = req.params.firm_uid
        const findFirm = await models.User_firm.findOne({ where: { firm_uid: firmUid } })
        if (findFirm == null) {
            return REST.error(res, 'Firm Uid Not Exists', 404)
        }
        const findkeyManagement = await models.Key_management.findOne({ where: { firm_id: findFirm.id } });
        if (findkeyManagement == null) {
            return REST.error(res, 'Key Management Id Not Found', 404)
        }
        const data = await models.Key_management.findOne({
            where: { id: findkeyManagement.id },
            include: [
                {
                    model: models.firm_key_management_permission,
                    as: 'management_permission',
                    include: [
                        {
                            model: models.firm_key_management_permission_list,
                            as: 'permission_Details'
                        }
                    ]
                }
            ]
        });
        return REST.success(res, data, 'Get Key Management Details Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getrequest/:user_uid', async function (req, res) {
    const partnerId = req.params.user_uid;
    try {
        const findUser = await models.User.findOne({
            where: {
                user_uid: partnerId
            }
        });

        if (!findUser) {
            return REST.error(res, 'User not found', 404);
        }

        const findKmp = await models.Key_management.findAll({
            where: {
                user_id: findUser.id
            }
        });

        const keyManagerIds = [];
        if (findKmp && findKmp.length > 0) {
            const keyManagementIds = findKmp.map(kmp => kmp.id);
            const keyManagers = await models.User.findAll({
                where: {
                    key_mangement_id: keyManagementIds
                }
            });
            keyManagerIds.push(...keyManagers.map(keyManager => keyManager.id));
        }

        const data = await models.request_for_store.findAll({
            where: {
                [Op.or]: [
                    { user_id: findUser.id },
                    ...(keyManagerIds.length > 0 ? [{ user_id: { [Op.in]: keyManagerIds } }] : [])
                ]
            },
            include: [
                {
                    model: models.stores,
                    as: "storeDetails",
                    include: [
                        {
                            model: models.User,
                            as: "updatedBy",
                            attributes: ["id", "full_name"]
                        },
                    ]
                },
                {
                    model: models.User_firm,
                    as: "firmDetails",
                    include: [
                        {
                            model: models.User,
                            as: "updated_by_details",
                            attributes: ["id", "full_name"]
                        },
                    ]
                },
                {
                    model: models.move_details,
                    as: "moveDetails",
                    include: [
                        {
                            model: models.User,
                            as: "updatedby",
                            attributes: ["id", "full_name"]
                        },
                    ]
                },
                {
                    model: models.prepare_details,
                    as: "prepareDetails",
                    include: [
                        {
                            model: models.User,
                            as: "updatebyUser",
                            attributes: ["id", "full_name"]
                        },
                    ]
                },
                {
                    model: models.User,
                    as: "requested_by",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "updatedBy",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [
                // ['status', 'ASC'],
                ['createdAt', 'DESC']
            ]
        });

        data.forEach(store => {
            if (store.storeDetails && store.storeDetails.updatedBy) {
                store.storeDetails.updatedBy.dataValues.updated_at = store.storeDetails.updatedAt;
            }
        });
        data.forEach(firm => {
            if (firm.firmDetails && firm.firmDetails.updated_by_details) {
                firm.firmDetails.updated_by_details.dataValues.updated_at = firm.firmDetails.updatedAt;
            }
        });
        data.forEach(move => {
            if (move.moveDetails && move.moveDetails.updatedby) {
                move.moveDetails.updatedby.dataValues.updated_at = move.moveDetails.updatedAt;
            }
        });
        data.forEach(prepare => {
            if (prepare.prepareDetails && prepare.prepareDetails.updatebyUser) {
                prepare.prepareDetails.updatebyUser.dataValues.updated_at = prepare.prepareDetails.updatedAt;
            }
        });
        data.forEach(request => {
            if (request.requested_by) {
                request.requested_by.dataValues.created_at = request.createdAt;
            }
        });
        data.forEach(update => {
            if (update.updatedBy) {
                update.updatedBy.dataValues.updated_at = update.updatedAt;
            }
        })
        return REST.success(res, data, 'Get All Requests successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getrequestedPartners', async function (req, res) {
    try {
        const findrequest = await models.request_for_store.findAll({});
        if (!findrequest || findrequest.length === 0) {
            return REST.error(res, 'No requests found', 404);
        }
        const userIds = findrequest.map(request => request.user_id);
        let filters = [];
        const globalSearch = req.query.search;

        if (globalSearch) {
            filters.push({
                [Op.or]: [
                    { user_uid: { [Op.like]: `%${globalSearch}%` } },
                    { full_name: { [Op.like]: `%${globalSearch}%` } },
                    { email: { [Op.like]: `%${globalSearch}%` } },
                    { phone_number: { [Op.like]: `%${globalSearch}%` } },
                    { designation: { [Op.like]: `%${globalSearch}%` } }
                ]
            });
        }

        ['user_uid', 'full_name', 'email', 'phone_number', 'designation'].forEach(field => {
            if (req.query[field]) {
                filters.push({ [field]: { [Op.like]: `%${req.query[field]}%` } });
            }
        });

        let partnerWhereClause = {
            id: { [Op.in]: userIds },
            is_key_manager: false,
            role_id: 1,
        };

        if (filters.length > 0) {
            partnerWhereClause = {
                ...partnerWhereClause,
                [Op.and]: [
                    partnerWhereClause,
                    { [Op.or]: filters }
                ]
            };
        }

        let keyManagerWhereClause = {
            id: { [Op.in]: userIds },
            is_key_manager: true,
            role_id: 1
        };

        if (filters.length > 0) {
            keyManagerWhereClause = {
                ...keyManagerWhereClause,
                [Op.and]: [
                    keyManagerWhereClause,
                    { [Op.or]: filters }
                ]
            };
        }


        const partners = await models.User.findAll({
            where: partnerWhereClause,
            include: [
                {
                    model: models.request_for_store,
                    as: 'request'
                }
            ],
            order: [
                [
                    Sequelize.literal(`CASE WHEN request.status = 'pending' THEN 1 WHEN request.status = 'verified' THEN 2 ELSE 3 END`), 'ASC'
                ],
                [Sequelize.col('request.created_at'), 'DESC'],
                ["id", "DESC"]
            ]
        });

        const keyManagers = await models.User.findAll({
            where: keyManagerWhereClause,
            include: [
                {
                    model: models.request_for_store,
                    as: 'request'
                }
            ],
        });
        const partnerRequests = partners.map(partner => ({
            ...partner.toJSON(),
            request: partner.request
        }));
        for (const kmp of keyManagers) {
            const kmpRequests = kmp.request || [];
            const associatedPartner = await models.Key_management.findOne({
                where: { id: kmp.key_mangement_id },
            });
            if (associatedPartner) {
                const partnerUser = await models.User.findOne({
                    where: {
                        id: associatedPartner.user_id,
                    },
                });

                if (partnerUser) {
                    const existingPartner = partnerRequests.find(
                        partner => partner.id === partnerUser.id
                    );

                    if (existingPartner) {
                        existingPartner.request = [
                            ...existingPartner.request,
                            ...kmpRequests
                        ];
                    } else {
                        partnerRequests.push({
                            ...partnerUser.toJSON(),
                            request: [...(partnerUser.request || []), ...kmpRequests]
                        });
                    }
                }
            }
        }
        return REST.success(res, partnerRequests, 'Get All Requested Partners successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
const isValidValue = (value) => value !== null && value !== undefined && value !== "";
const validateStore = (store) => {
    const storeData = store.get({ plain: true });

    const complianceFields = [
        "fsssai_license_url", "iso_certificate_url", "haccp_url",
        "post_control_url", "brc_audit_url", "fire_safety_noc_url",
        "pollution_noc_url", "mcd_license_url", "up_cold_storage_license_url",
        "factory_license_url", "panchayat_noc_url"
    ];

    const additionalFields = [
        "no_lien_certificate_url", "latest_electricity_bill_url"
    ];

    const complianceDetails = Array.isArray(storeData.store_compliance_details) && storeData.store_compliance_details.length > 0
        ? storeData.store_compliance_details[0]
        : {};

    const additionalDetails = Array.isArray(storeData.store_additional_submissions) && storeData.store_additional_submissions.length > 0
        ? storeData.store_additional_submissions[0]
        : {};

    const complianceDetailsValid = complianceFields.every(field => {
        const value = complianceDetails[field];
        return isValidValue(value);
    });

    const additionalDetailsValid = additionalFields.every(field => {
        const value = additionalDetails[field];
        return isValidValue(value);
    });

    return {
        complianceDetails: complianceDetailsValid,
        additionalDetails: additionalDetailsValid
    };
};

const validatePrepare = (prepare) => {
    const complianceFields = [
        "fsssai_license_url", "iso_certificate_url", "haccp_url",
        "pest_control_agency_contract_url", "brc_audit_url",
        "fire_safety_noc_url", "pollution_noc_url", "mcd_license_url",
        "up_cold_storage_license_url", "factory_license_url", "panchayat_noc_url"
    ];

    const additionalFields = [
        "no_lien_certificate_url", "electricity_bill_url"
    ];

    let prepareData = prepare.dataValues ? prepare.get({ plain: true }) : prepare;
    const complianceDetails = Array.isArray(prepareData.prepare_compliance_details) && prepareData.prepare_compliance_details.length > 0
        ? prepareData.prepare_compliance_details[0]
        : {};

    const additionalDetails = Array.isArray(prepareData.prepare_additional_details) && prepareData.prepare_additional_details.length > 0
        ? prepareData.prepare_additional_details[0]
        : {};


    const complianceDetailsValid = complianceFields.every(field =>
        isValidValue(complianceDetails[field])
    );

    const additionalDetailsValid = additionalFields.every(field =>
        isValidValue(additionalDetails[field])
    );

    return {
        complianceDetails: complianceDetailsValid,
        additionalDetails: additionalDetailsValid
    };
};
const validateMove = (move) => {
    let moveData = move.dataValues ? move.get({ plain: true }) : move;
    const complianceFields = [
        "insurance_policy", "permit_url", "pucc_url", "fitness_certificate"
    ];
    const complianceDetails = Array.isArray(moveData.move_compliance_details) && moveData.move_compliance_details.length > 0
        ? moveData.move_compliance_details[0]
        : {};
    const complianceDetailsValid = complianceFields.every(field =>
        isValidValue(complianceDetails[field])
    );
    return {
        complianceDetails: complianceDetailsValid
    };
};
router.get('/registeredPartnerDetails/:partner_uid', async function (req, res) {
    try {
        const partnerUid = req.params.partner_uid;
        const userDetails = await models.User.findOne({
            where: {
                is_registered: constants.USER.REGISTERED_STATUS.IS_REGISTERED,
                role_id: 1,
                user_uid: partnerUid,
            },
            attributes: ["user_uid", "id"],
            include: [{
                model: models.User_firm,
                as: 'user_firm',
                attributes: ["id", "firm_uid", "firm_name", "pan_document", "upload_gst_certificate"],
                include: [
                    {
                        model: models.Firm_type,
                        as: 'firmtype',
                        attributes: ["name"]
                    },
                    {
                        model: models.Account_details,
                        as: 'account_details',
                        attributes: ["id"]
                    }
                ]
            }],
        });

        if (!userDetails) {
            return REST.error(res, 'Partner not found', 404);
        }

        if (userDetails.user_firm) {
            for (const firm of userDetails.user_firm) {
                if (firm.firmtype && ["Private Limited", "Public Limited", "Limited Liability Partnership(LLP)"].includes(firm.firmtype.name)) {
                    const findsharholder = await models.firm_shareholders.findOne({
                        where: {
                            firm_id: firm.id
                        }
                    });
                    firm.dataValues.has_shareholders = findsharholder ? true : false;
                }

                if (firm.firmtype && firm.firmtype.name === "Partnership") {
                    const findPartnership = await models.Partner_ship.findOne({
                        where: {
                            firm_id: firm.id
                        }
                    })
                    firm.dataValues.has_partnerships = findPartnership ? true : false;
                }
                firm.dataValues.account_details = firm.account_details.map((account) => account.id)?.length > 0 ? true : false;
                const findStore = await models.stores.findAll({
                    where: { firm_id: firm.id },
                    attributes: ["id", "store_name", "store_uid"],
                    include: [
                        {
                            model: models.store_compliance_details,
                            as: 'store_compliance_details',
                            attributes: ["fsssai_license_url", "iso_certificate_url", "haccp_url", "post_control_url", "brc_audit_url", "fire_safety_noc_url", "pollution_noc_url", "mcd_license_url", "up_cold_storage_license_url", "factory_license_url", "panchayat_noc_url"]
                        },
                        {
                            model: models.store_additional_submissions,
                            as: 'store_additional_submissions',
                            attributes: ["no_lien_certificate_url", "latest_electricity_bill_url"]
                        }
                    ],
                })

                const findPrepare = await models.prepare_details.findAll({
                    where: { firm_id: firm.id },
                    attributes: ["id", "prepare_uid"],
                    include: [
                        {
                            model: models.prepare_compliance_details,
                            as: 'prepare_compliance_details',
                            attributes: [
                                "fsssai_license_url", "iso_certificate_url",
                                "haccp_url", "pest_control_agency_contract_url", "brc_audit_url",
                                "fire_safety_noc_url", "pollution_noc_url", "mcd_license_url",
                                "up_cold_storage_license_url", "factory_license_url", "panchayat_noc_url"
                            ]
                        },
                        {
                            model: models.prepare_additional_submissions,
                            as: 'prepare_additional_details',
                            attributes: ["no_lien_certificate_url", "electricity_bill_url"]
                        }
                    ]
                });

                const findMove = await models.move_details.findAll({
                    where: { firm_id: firm.id },
                    attributes: ["id", "move_uid"],
                    include: [
                        {
                            model: models.move_compliance_details,
                            as: 'move_compliance_details',
                            attributes: ["insurance_policy", "permit_url", "pucc_url", "fitness_certificate"]
                        }
                    ]
                });

                firm.dataValues.stores = findStore.map(store => ({
                    id: store.id,
                    store_name: store.store_name,
                    store_uid: store.store_uid,
                    complianceDetails: validateStore(store).complianceDetails,
                    additionalDetails: validateStore(store).additionalDetails
                }));

                firm.dataValues.prepares = findPrepare.map(prepare => ({
                    id: prepare.id,
                    prepare_uid: prepare.prepare_uid,
                    complianceDetails: validatePrepare(prepare).complianceDetails,
                    additionalDetails: validatePrepare(prepare).additionalDetails
                }));

                firm.dataValues.moves = findMove.map(move => ({
                    id: move.id,
                    move_uid: move.move_uid,
                    complianceDetails: validateMove(move).complianceDetails
                }));
            }
        }
        return REST.success(res, {
            userDetails,
        }, 'Registered Partner Details Fetched Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router