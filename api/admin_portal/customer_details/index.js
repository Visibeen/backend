const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const constants = require("../../../constants");
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const Sequelize = require('sequelize')



/*
|----------------------------------------------------------------------------------------------------------------
|                                      Customers Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/customerDetails', async function (req, res) {
    const page = parseInt(req.query.page) || 1
    const pageSize = parseInt(req.query.pageSize) || 20
    const offset = (page - 1) * pageSize
    try {
        let whereClause = {
            is_registered: constants.USER.REGISTERED_STATUS.IS_REGISTERED,
            role_id: 2
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
        const data = await models.User.findAll({
            where: whereClause,
            include: [
                {
                    model: models.User,
                    as: "AddedByCsv",
                    attributes: ["id", "full_name"]
                },
            ],
            order: [["id", "DESC"]],
            offset: offset,
            limit: pageSize,
        })

        for (let user of data) {
            let userFirms = await models.User_firm.findAll({
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
            user.dataValues.isFirmAvailable = userFirms || [];
            for (const firm of userFirms) {
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
            }
            const quotationCount = await models.quotation_store.count({
                where: { customer_id: user.id }
            });
            user.user_firms = userFirms;
            user.dataValues.quotationCount = quotationCount;
            delete user['designation'];
        }
        data.forEach(added => {
            if (added.AddedByCsv) {
                added.AddedByCsv.dataValues.createdAt = added.createdAt;
            }
        });
        const totalPages = Math.ceil(totalCount / pageSize);
        return REST.success(res, {
            customer: data,
            pagination: {
                totalCount,
                totalPages,
                currentPage: page,
                pageSize,
            },
        }, 'Coustmore Details get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/customerGetById/:user_uid', async function (req, res) {
    try {
        const findCustomer = await models.User.findOne({
            where: { user_uid: req.params.user_uid, role_id: 2 }
        });
        if (!findCustomer) {
            return REST.error(res, 'Customer Uid  Not Found', 404)
        }
        const data = await models.User.findOne({
            where: { user_uid: req.params.user_uid, role_id: 2 },
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
                            attributes: ["id", "full_name", "updated_at"]
                        },
                        {
                            model: models.User,
                            as: "Verified_detail",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.User,
                            as: 'addedbys',
                            attributes: ["id", "full_name"]
                        },
                    ]
                },

                {
                    model: models.quotation_store,
                    as: "quotation_store_details"
                },
                {
                    model: models.quotation_move,
                    as: "quotation_move_details"
                },
                {
                    model: models.quotation_prepare,
                    as: "quotation_prepare_details"
                },

            ],
            order: [["id", "DESC"]],
        });
        data.dataValues.user_firm.forEach(items => {
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
        return REST.success(res, data, 'Customer Details Get By Id Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.delete('/deleteComstomer/:id', async function (req, res) {
    try {
        const findUser = await models.User.findOne({ where: { id: req.params.id, role_id: 2 } })
        if (!findUser) {
            throw new Error('Custmore id not found')
        }
        const data = await models.User.destroy({ where: { id: req.params.id } })
        return REST.success(res, data, 'Customers Deleted Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getBasicDetails/:firm_uid', async function (req, res) {
    try {
        const firmUid = req.params.firm_uid
        const findFirm = await models.User_firm.findOne({ where: { firm_uid: firmUid } })
        if (findFirm == null) {
            return REST.error(res, 'Firm Uid Not Exists', 404)
        }
        const data = await models.User_firm.findOne({
            where: {
                id: findFirm.id
            },
            include: [
                {
                    model: models.User,
                    as: "user",
                },
                {
                    model: models.Firm_type,
                    as: 'firmtype'
                }
            ]
        })
        const requestkey = [
            "firm_shareholders",
            "firm_partnerships"
        ]
        const requests = await Promise.all(requestkey.map(async (key) => {
            return models.request_for_store.findAll({
                where: { section_id: findFirm.id, section_key: key }
            });
        }));
        const requestForFirm = {};
        requestkey.forEach((key, index) => {
            requestForFirm[key] = requests[index];
        });
        data.dataValues.requestForFirm = requestForFirm
        return REST.success(res, data, 'Basic Customer Details Get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getBranches/:firm_uid', async function (req, res) {
    try {
        const firmUid = req.params.firm_uid
        const findFirm = await models.User_firm.findOne({ where: { firm_uid: firmUid } })
        if (findFirm == null) {
            return REST.error(res, 'Firm Uid Not Exists', 404)
        }
        const data = await models.Branch.findAll({
            where: { firm_id: findFirm.id },
            include: [
                {
                    model: models.User,
                    as: "user"
                },
                {
                    model: models.User_firm,
                    as: "User_firm",
                    include: {
                        model: models.Firm_type,
                        as: 'firmtype'
                    }
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
                },

            ]
        })
        data.forEach(branch => {
            if (branch.dataValues.addedby) {
                branch.addedby.dataValues.created_at = branch.dataValues.createdAt;
            }
            if (branch.dataValues.updatedby) {
                branch.updatedby.dataValues.updated_at = branch.dataValues.updatedAt;
            }
        })
        return REST.success(res, data, 'Branches Get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getKeyManagement/:firm_uid', async function (req, res) {
    try {
        const firmUid = req.params.firm_uid;
        const findFirm = await models.User_firm.findOne({ where: { firm_uid: firmUid } });
        if (findFirm == null) {
            return REST.error(res, 'Firm Uid Not Exists', 404);
        }
        const data = await models.Key_management.findAll({
            where: { firm_id: findFirm.id },
            include: [
                {
                    model: models.firm_key_management_permission,
                    as: 'management_permission',
                    include: [
                        {
                            model: models.firm_key_management_permission_list,
                            as: 'permission_Details',
                            attributes: ["id", "name"]
                        }
                    ]
                },
                {
                    model: models.User,
                    as: "user"
                },
                {
                    model: models.User_firm,
                    as: "User_firm",
                    include: {
                        model: models.Firm_type,
                        as: 'firmtype'
                    }
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
        });
        data.forEach(key => {
            if (key.dataValues.addedby) {
                key.addedby.dataValues.created_at = key.dataValues.createdAt;
            }
            if (key.dataValues.updatedby) {
                key.updatedby.dataValues.updated_at = key.dataValues.updatedAt;
            }
        })
        return REST.success(res, data, 'Key Management Details Retrieved Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getPartnerships/:firm_uid', async function (req, res) {
    try {
        const firmUid = req.params.firm_uid
        const findFirm = await models.User_firm.findOne({ where: { firm_uid: firmUid } })
        if (findFirm == null) {
            return REST.error(res, 'Firm Uid Not Exists', 404)
        }
        const data = await models.Partner_ship.findAll({
            where: { firm_id: findFirm.id },
            include: [
                {
                    model: models.User_firm,
                    as: "User_firm",
                    include: [
                        {
                            model: models.User,
                            as: 'user'
                        },
                        {
                            model: models.Firm_type,
                            as: 'firmtype'
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
        })
        const requestkey = [
            "firm_partnerships"
        ]
        const requests = await Promise.all(requestkey.map(async (key) => {
            return models.request_for_store.findAll({
                where: { section_id: findFirm.id, section_key: key }
            });
        }));
        const requestForPartnership = {};
        requestkey.forEach((key, index) => {
            requestForPartnership[key] = requests[index];
        });
        data.forEach(item => {
            item.dataValues.requestForPartnership = requestForPartnership;
        });
        data.forEach(partnership => {
            if (partnership.dataValues.addedby) {
                partnership.addedby.dataValues.created_at = partnership.dataValues.createdAt;
            }
            if (partnership.dataValues.updatedby) {
                partnership.updatedby.dataValues.updated_at = partnership.dataValues.updatedAt;
            }
        })
        return REST.success(res, data, 'Partnerships Get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getAccounts/:firm_uid', async function (req, res) {
    try {
        const firmUid = req.params.firm_uid
        const findFirm = await models.User_firm.findOne({ where: { firm_uid: firmUid } })
        if (findFirm == null) {
            return REST.error(res, 'Firm Uid Not Exists', 404)
        }
        const data = await models.Account_details.findAll({
            where: { firm_id: findFirm.id },
            include: [
                {
                    model: models.User,
                    as: "user"
                },
                {
                    model: models.User_firm,
                    as: "User_firm",
                    include: {
                        model: models.Firm_type,
                        as: 'firmtype'
                    }
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
        })
        data.forEach(account => {
            if (account.dataValues.addedby) {
                account.addedby.dataValues.created_at = account.dataValues.createdAt;
            }
            if (account.dataValues.updatedby) {
                account.updatedby.dataValues.updated_at = account.dataValues.updatedAt;
            }
        })
        return REST.success(res, data, 'Accounts Get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getShareholderDetails/:firm_uid', async function (req, res) {
    try {
        const firmUid = req.params.firm_uid;
        const findFirm = await models.User_firm.findOne({ where: { firm_uid: firmUid } });
        if (!findFirm) {
            return REST.error(res, 'Firm Uid Not Exists', 404);
        }
        const data = await models.firm_shareholders.findAll({
            where: { firm_id: findFirm.id },
            include: [
                {
                    model: models.User,
                    as: "user"
                },
                {
                    model: models.User_firm,
                    as: "User_firms",
                    include: {
                        model: models.Firm_type,
                        as: 'firmtype'
                    }
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
        });
        const requestkey = [
            "firm_shareholders"
        ]
        const requests = await Promise.all(requestkey.map(async (key) => {
            return models.request_for_store.findAll({
                where: { section_id: findFirm.id, section_key: key }
            });
        }));
        const requestForShareholders = {};
        requestkey.forEach((key, index) => {
            requestForShareholders[key] = requests[index];
        });
        data.forEach(item => {
            item.dataValues.requestForShareholders = requestForShareholders;
        });
        data.forEach(items => {
            if (items.dataValues.addedby) {
                items.addedby.dataValues.created_at = items.dataValues.createdAt;
            }
            if (items.dataValues.updatedby) {
                items.updatedby.dataValues.updated_at = items.dataValues.updatedAt;
            }
        })

        return REST.success(res, data, 'Shareholder Details Retrieved Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getCustomerlist', async function (req, res) {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    try {
        let whereClause = {
            is_registered: constants.USER.REGISTERED_STATUS.IS_REGISTERED,
            role_id: 2,
        };
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
        const customer = await models.User.findAll({
            where: whereClause,
            order: [["id", "DESC"]],
            offset,
            limit: pageSize,
        });
        const totalPages = Math.ceil(totalCount / pageSize);
        return REST.success(res, {
            customer,
            pagination: {
                totalCount,
                totalPages,
                currentPage: page,
                pageSize,
            },
        }, 'Get All Customers Successful');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getCustomerRequest/:user_uid', async function (req, res) {
    const customerId = req.params.user_uid
    try {
        const findCustomer = await models.User.findOne({
            where: {
                user_uid: customerId,
                role_id: 2,
            }
        })
        if (!findCustomer) {
            return REST.error(res, 'Customer Not Found', 404);
        }
        const data = await models.request_for_store.findAll({
            where: {
                user_id: findCustomer.id
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
                        }
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
                        }
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
                        }
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
                ['updatedAt', 'DESC']
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
        data.forEach(storeRequest => {
            if (storeRequest.updatedBy) {
                storeRequest.updatedBy.dataValues.updated_at = storeRequest.updatedAt;
            }
        });
        return REST.success(res, data, 'Customer Request Get Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getrequestedCustomers', async function (req, res) {
    try {
        const findrequest = await models.request_for_store.findAll({});
        if (!findrequest) {
            return REST.error(res, 'No requests found', 404);
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

        let whereClause = {
            role_id: 2
        };

        if (filters.length > 0) {
            whereClause = {
                [Op.and]: [whereClause, { [Op.or]: filters }]
            };
        }

        const customer = await models.User.findAll({
            where: whereClause,
            include: [
                {
                    model: models.request_for_store,
                    as: 'request',
                    required: true
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
        return REST.success(res, customer, 'Get All Requested Customers successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/registeredCustomerDetails/:user_uid', async function (req, res) {
    try {
        const partnerUid = req.params.user_uid;
        const userDetails = await models.User.findOne({
            where: {
                is_registered: constants.USER.REGISTERED_STATUS.IS_REGISTERED,
                role_id: 2,
                user_uid: partnerUid,
            },
            attributes: ["user_uid", "id",],
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
            return REST.error(res, 'Customer not found', 404);
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
            }
        }
        return REST.success(res, {
            userDetails,
        }, 'Registered Customer Details Fetched Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router