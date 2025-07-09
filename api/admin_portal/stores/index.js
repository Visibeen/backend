const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const constants = require("../../../constants");
const dbHelper = require('../../../utils/dbHelper');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();
const sequelize = require('sequelize')
const axios = require('axios');
const { Sequelize } = require("sequelize");
const { sendVerificationMessage } = require('../../../utils/helper')
const { sendAssetVerifiedMessagse } = require('../../../utils/helper')
const { sendMoveVerifiedMessage } = require('../../../utils/helper')
const { sendPreparVerifiedMessage } = require('../../../utils/helper')
const { sendPushNotification } = require('../../../utils/helper');
const support = require('../../../utils/support');



/*
|----------------------------------------------------------------------------------------------------------------
|              Stores  Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/get_store', async function (req, res) {
    try {
        const data = await models.stores.findAll({
            include: [
                {
                    model: models.User,
                    as: "updatedBy",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User_firm,
                    as: "firm_details",
                    attributes: ["id", "firm_name"],
                    include: {
                        model: models.Firm_type,
                        as: "firmtype"
                    }

                },
                {
                    model: models.store_chambers,
                    as: "table_of_chamber",
                    attributes: ["id", "no_of_pallet", "no_of_pallets_for_lease"]
                },
                {
                    model: models.User,
                    as: "Verified_details",
                    attributes: ["id", "full_name"]
                }
            ],
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                                SELECT COUNT(*)
                                FROM store_chambers
                                WHERE
                                    store_chambers.store_id = stores.id
                            )`),
                        'Total_Chambers',
                    ]
                ],
            },
            order: [[sequelize.literal('Total_Chambers'), 'DESC']],
        });
        data.forEach(store => {
            if (store.Verified_details) {
                store.Verified_details.dataValues.verified_at = store.verified_at;
            }
        })
        data.forEach(item => {
            if (item.updatedBy) {
                item.dataValues.updatedBy.dataValues.updated_at = item.updatedAt;
            }
        })
        data.forEach((item) => {
            item.type_of_store = JSON.parse(item.type_of_store)
        })
        return REST.success(res, data, 'Data fetched Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getStore/:store_uid', async function (req, res) {
    try {
        const findStore = await models.stores.findOne({ where: { store_uid: req.params.store_uid } });
        if (!findStore) {
            return REST.error(res, 'Store UID does not exist', 404);
        }

        const data = await models.stores.findOne({
            where: { store_uid: req.params.store_uid },
            include: [
                {
                    model: models.User_firm,
                    as: "firm_details",
                    include: [
                        {
                            model: models.Firm_type,
                            as: "firmtype"
                        },
                        {
                            model: models.User,
                            as: "user"
                        },
                    ]
                },

                {
                    model: models.User,
                    as: "updatedBy",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.store_additional_submissions,
                    as: "store_additional_submissions"
                },
                {
                    model: models.store_compliance_details,
                    as: "store_compliance_details"
                },
                {
                    model: models.User,
                    as: "Verified_details",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }

            ],
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                            SELECT COUNT(*)
                            FROM store_chambers
                            WHERE store_chambers.store_id = stores.id
                        )`),
                        'Total_Chambers'
                    ]
                ]
            },
            order: [[sequelize.literal('Total_Chambers'), 'DESC']]
        })
        let result = data.dataValues.firm_details.user;
        data.dataValues.user = result;
        delete data.dataValues.firm_details.dataValues.user;

        if (data.dataValues.Verified_details) {
            data.Verified_details.dataValues.verified_at = data.verified_at;
        }
        if (data && data.updatedBy) {
            data.dataValues.updatedBy.dataValues.updated_at = data.dataValues.updatedAt;
        }
        if (data && data.addedby) {
            data.dataValues.addedby.dataValues.created_at = data.dataValues.createdAt;
        }
        if (!data) {
            return REST.error(res, 'Store ID Not Found!', 404);
        }
        const requestkey = [
            "store_acu",
            "store_amc",
            "store_ca_equipment",
            "store_chambers",
            "store_compressors",
            "store_condensor",
            "store_generator",
            "store_iot_devices",
            "store_it_devices",
            "store_mhe",
            "store_solar_inverters"
        ]
        const requests = await Promise.all(requestkey.map(async (key) => {
            return models.request_for_store.findAll({
                where: { section_id: findStore.id, section_key: key }
            });
        }));
        const requestForStore = {};
        requestkey.forEach((key, index) => {
            requestForStore[key] = requests[index];
        });
        if (data.dataValues.type_of_store) {
            data.dataValues.type_of_store = JSON.parse(data.dataValues.type_of_store);
        }
        data.dataValues.request_for_store = requestForStore;
        data.store_additional_submissions.forEach(stores => {
            if (stores.asset_3d_url) {
                stores.asset_3d_url = JSON.parse(stores.asset_3d_url)
            }
            if (stores.photo_of_asset_url) {
                stores.photo_of_asset_url = JSON.parse(stores.photo_of_asset_url)
            }
        })
        return REST.success(res, data, 'Data fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getStoreById/:store_uid', async function (req, res) {
    try {
        const findStore = await models.stores.findOne({ where: { store_uid: req.params.store_uid } });
        if (!findStore) {
            return REST.error(res, 'Store Uid not exist', 404);
        }

        const store_uid = req.params.store_uid;
        const data = await models.stores.findOne({
            where: { store_uid: store_uid },
            include: [
                {
                    model: models.User_firm,
                    as: "firm_details",
                    include: [
                        {
                            model: models.Firm_type,
                            as: "firmtype"
                        },
                        {
                            model: models.User,
                            as: "user"
                        },
                    ]
                },

                {
                    model: models.store_additional_submissions,
                    as: "store_additional_submissions",
                    include: [
                        {
                            model: models.User,
                            as: "UpdatedByUsers",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.User,
                            as: "AddedByUsers",
                            attributes: ["id", "full_name"]
                        }
                    ]
                },
                {
                    model: models.store_compliance_details,
                    as: "store_compliance_details",
                    include: [
                        {
                            model: models.User,
                            as: "UpdatedByUser",
                            attributes: ["id", "full_name"]
                        },
                        {
                            model: models.User,
                            as: "AddedByUser",
                            attributes: ["id", "full_name"]
                        }
                    ]
                },
                {
                    model: models.User,
                    as: "Verified_details",
                    attributes: ["id", "full_name"]
                }
            ]
        });

        if (!data) {
            return REST.error(res, 'Store Id Not Found!', 404);
        }
        let result = data.dataValues.firm_details.user;
        data.dataValues.user = result;
        delete data.dataValues.firm_details.dataValues.user;

        const requestKeys = [
            "store_additional_information",
            "store_compliance_details"
        ];

        const request_for_store = await Promise.all(requestKeys.map(async (key) => {
            return await models.request_for_store.findAll({
                where: { section_id: findStore.id, section_key: key }
            })
        }))
        const requestForStore = {}
        for (let i = 0; i < requestKeys.length; i++) {
            requestForStore[requestKeys[i]] = request_for_store[i]
        }
        data.dataValues.store_compliance_details.forEach(storeCompliance => {
            if (storeCompliance.dataValues.UpdatedByUser) {
                storeCompliance.dataValues.UpdatedByUser.dataValues.updated_at = storeCompliance.dataValues.updatedAt;
            }
            if (storeCompliance.dataValues.AddedByUser) {
                storeCompliance.dataValues.AddedByUser.dataValues.created_at = storeCompliance.dataValues.createdAt;
            }
        });

        data.dataValues.store_additional_submissions.forEach(storeAdditional => {
            if (storeAdditional.dataValues.UpdatedByUsers) {
                storeAdditional.dataValues.UpdatedByUsers.dataValues.updated_at = storeAdditional.dataValues.updatedAt;
            }
            if (storeAdditional.dataValues.AddedByUsers) {
                storeAdditional.dataValues.AddedByUsers.dataValues.created_at = storeAdditional.dataValues.createdAt;
            }
        });

        data.dataValues.request_for_store = requestForStore;
        data.dataValues.type_of_store = JSON.parse(data.dataValues.type_of_store);
        data.store_additional_submissions.forEach(store => {
            if (store.asset_3d_url) {
                store.asset_3d_url = JSON.parse(store.asset_3d_url)
            }
            if (store.photo_of_asset_url) {
                store.photo_of_asset_url = JSON.parse(store.photo_of_asset_url)
            }
        })
        return REST.success(res, data, 'Data fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getStoreByFirmId/:firm_uid', async function (req, res) {
    try {
        const findFirm = await models.User_firm.findOne({ where: { firm_uid: req.params.firm_uid } });
        if (!findFirm) {
            return REST.error(res, 'Firm Uid not exist', 404);
        }
        const firm_uid = req.params.firm_uid;
        const data = await models.stores.findAll({
            where: { firm_id: findFirm.id },
            include: [
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "updatedBy",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "Verified_details",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User_firm,
                    as: "firm_details",
                    where: { firm_uid: firm_uid },
                    attributes: ["id", "firm_name"]
                },
                {
                    model: models.store_chambers,
                    as: "table_of_chamber",
                    attributes: ["id", "no_of_pallet", "no_of_pallets_for_lease"]
                }
            ],
            attributes: {
                include: [
                    [
                        sequelize.literal(`(
                                SELECT COUNT(*)
                                FROM store_chambers
                                WHERE
                                    store_chambers.store_id = stores.id
                            )`),
                        'Total_Chambers',
                    ],
                    [
                        sequelize.literal(`(
                        SELECT SUM(available_pallets)
                        FROM store_chambers
                         WHERE store_chambers.store_id = stores.id
                         )`),
                        'available_pallets',
                    ],
                    [
                        sequelize.literal(`(
                        SELECT SUM(unavailable_pallets)
                        FROM store_chambers
                         WHERE store_chambers.store_id = stores.id
                         )`),
                        'unavailable_pallets',
                    ]

                ],
            },
        });

        // if (!data || data.length === 0) {
        //     return REST.error(res, 'No Stores Found for this Firm!', 404);
        // }

        data.forEach(item => {
            if (item.Verified_details) {
                item.Verified_details.dataValues.verified_at = item.verified_at;
            }
            if (item.addedby) {
                item.dataValues.addedby.dataValues.created_at = item.createdAt;
            }
            if (item.updatedBy) {
                item.dataValues.updatedBy.dataValues.updated_at = item.updatedAt;
            }

            try {
                if (item.dataValues.type_of_store) {
                    item.dataValues.type_of_store = JSON.parse(item.dataValues.type_of_store);
                }
            } catch (err) {
                item.dataValues.type_of_store = [];
            }
        });

        return REST.success(res, data, 'Data fetched Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getAllStore', async function (req, res) {
    try {
        const { state, city, verified } = req.query
        const storeWhereClause = {}
        if (city) {
            const cityArray = city.split(',').map(c => c.trim());
            storeWhereClause.city = { [Op.in]: cityArray };
        }
        if (state) {
            storeWhereClause.state = state;
        }
        if (verified === "false") {
            storeWhereClause.is_verified = 0;
        }
        else if (verified === "true") {
            storeWhereClause.is_verified = 1;
        }
        const data = await models.stores.findAll({
            where: storeWhereClause,
            attributes: ["id", "store_uid"]
        })
        return REST.success(res, data, 'Stores fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.get('/getAllMove', async function (req, res) {
    try {
        const { state, city, verified } = req.query
        const moveWhereClause = {}
        if (city) {
            const cityArray = city.split(',').map(c => c.trim());
            moveWhereClause.city = { [Op.in]: cityArray };
        }
        if (state) {
            moveWhereClause.state = state;
        }
        if (verified === "false") {
            moveWhereClause.is_verified = 0;
        }
        else if (verified === "true") {
            moveWhereClause.is_verified = 1;
        }
        const data = await models.move_details.findAll({
            where: moveWhereClause,
            attributes: ["id", "move_uid"]

        })
        return REST.success(res, data, 'Move fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.get('/getAllPrepare', async function (req, res) {
    try {
        const { state, city, verified } = req.query
        const prepareWhereClause = {}
        if (city) {
            const cityArray = city.split(',').map(c => c.trim());
            prepareWhereClause.city = { [Op.in]: cityArray };
        }
        if (state) {
            prepareWhereClause.state = state;
        }
        if (verified === "false") {
            prepareWhereClause.is_verified = 0;
        }
        else if (verified === "true") {
            prepareWhereClause.is_verified = 1;
        }
        const data = await models.prepare_details.findAll({
            where: prepareWhereClause,
            attributes: ["id", "prepare_uid"]
        })
        return REST.success(res, data, 'Move fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500)
    }
})
router.get('/getStoreAssets', async function (req, res) {
    const role = req.query.role
    const verified = req.query.verified
    try {
        if (role === "partner") {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * pageSize;
            const {
                store_uid,
                state,
                city,
                today,
                months,
                week,
                start_date,
                end_date,
                Total_available_pallets,
                Total_Number_Of_Pallets_For_Lease,
                globalSearch,
            } = req.query;

            let storeFilter = {};
            let havingClause = {};

            function formatDate(date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            if (today) {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const endOfToday = new Date();
                endOfToday.setHours(23, 59, 59, 999);
                storeFilter.createdAt = { [Op.between]: [startOfToday, endOfToday] };
            } else if (months) {
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                oneMonthAgo.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                storeFilter.createdAt = { [Op.between]: [oneMonthAgo, today] };
            } else if (week) {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                oneWeekAgo.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                storeFilter.createdAt = { [Op.between]: [oneWeekAgo, today] };
            } else if (start_date && end_date) {
                const start = new Date(start_date);
                const end = new Date(end_date);
                end.setHours(23, 59, 59, 999);
                storeFilter.createdAt = { [Op.between]: [start, end] };
            }
            if (store_uid) {
                const storeUids = store_uid.split(',').map(uid => uid.trim());
                storeFilter.store_uid = { [Op.in]: storeUids };
            }
            if (state) {
                storeFilter.state = state;
            }
            if (city) {
                const cities = city.split(',').map(c => c.trim());
                storeFilter.city = { [Op.in]: cities };
            }
            if (Total_available_pallets) {
                havingClause['Total_available_pallets'] = { [Op.gte]: Number(Total_available_pallets) };
            }
            if (Total_Number_Of_Pallets_For_Lease) {
                havingClause['Total_Number_Of_Pallets_For_Lease'] = { [Op.gte]: Number(Total_Number_Of_Pallets_For_Lease) };
            }
            let globalSearchFilter = {};
            if (globalSearch) {
                const search = globalSearch.split(',').map(term => term.trim());
                globalSearchFilter = {
                    [Op.or]: [
                        ...search.map(store => ({ store_uid: { [Op.like]: `%${store}%` } })),
                        ...search.map(store => ({ store_name: { [Op.like]: `%${store}%` } })),
                        ...search.map(store => ({ state: { [Op.like]: `%${store}%` } })),
                        ...search.map(store => ({ city: { [Op.like]: `%${store}%` } })),
                        ...search.map(store => ({ address: { [Op.like]: `%${store}%` } })),
                        ...search.map(store => ({ '$user.full_name$': { [Op.like]: `%${store}%` } })),
                        ...search.map(store => ({ '$user.user_uid$': { [Op.like]: `%${store}%` } }))
                    ]
                };
            }
            if (verified === "true") {
                storeFilter.is_verified = true;
            } else if (verified === "false") {
                storeFilter.is_verified = false;
            }
            const whereCondition = {
                [Op.and]: [
                    storeFilter,
                    globalSearchFilter
                ]
            };
            const totalCount = await models.stores.count({
                where: whereCondition,
                include: [
                    {
                        model: models.User,
                        as: "user",
                        required: false
                    }
                ]
            });
            const storeDetails = await models.stores.findAll({
                where: whereCondition,
                include: [
                    {
                        model: models.User,
                        as: "user",
                        attributes: ["id", "user_uid", "full_name", "createdAt", "updatedAt"],
                        required: true
                    },
                    {
                        model: models.store_chambers,
                        as: "table_of_chamber",
                        attributes: ["id", "store_id", "no_of_pallets_for_lease", "available_pallets", "unavailable_pallets"],
                    }
                ],
                attributes: {
                    include: [
                        [
                            Sequelize.literal(`(
                                SELECT COUNT(*)
                                FROM store_chambers
                                WHERE store_chambers.store_id = stores.id
                            )`),
                            'Total_Chambers',
                        ],
                        [
                            Sequelize.literal(`(
                               SELECT SUM(no_of_pallets_for_lease)
                                FROM store_chambers
                                WHERE store_chambers.store_id = stores.id
                            )`),
                            'Total_Number_Of_Pallets_For_Lease',
                        ],
                        [
                            Sequelize.literal(`(
                               SELECT SUM(available_pallets)
                                FROM store_chambers
                                WHERE store_chambers.store_id = stores.id
                            )`),
                            'Total_available_pallets',
                        ],
                        [
                            Sequelize.literal(`(
                               SELECT SUM(unavailable_pallets)
                                FROM store_chambers
                                WHERE store_chambers.store_id = stores.id
                            )`),
                            'Total_unavailable_pallets',
                        ]
                    ],
                },
                order: [["id", "ASC"]],
                offset: offset,
                limit: pageSize,
                having: havingClause
            });
            storeDetails.forEach(item => {
                if (item.type_of_store && typeof item.type_of_store === 'string') {
                    try {
                        item.type_of_store = JSON.parse(item.type_of_store);
                    } catch (e) {
                        console.error('Error parsing type_of_store:', e);
                    }
                }
            })
            if (Total_Number_Of_Pallets_For_Lease || Total_available_pallets) {
                let totalPalletCount = []
                storeDetails.forEach(store => {
                    totalPalletCount.push(parseInt(store.getDataValue(Total_Number_Of_Pallets_For_Lease ? 'Total_Number_Of_Pallets_For_Lease' : 'Total_available_pallets')));
                });
                return REST.success(res, {
                    storeDetails,
                    pagination: {
                        totalCount: totalPalletCount.length,
                        totalPages: Math.ceil(totalPalletCount.length / pageSize),
                        currentPage: page,
                        pageSize,
                    },
                }, 'Get Store Assets fetched successfully');
            }
            return REST.success(res, {
                storeDetails,
                pagination: {
                    totalCount,
                    totalPages: Math.ceil(totalCount / pageSize),
                    currentPage: page,
                    pageSize,
                },
            }, 'Get Store Assets fetched successfully');
        } else if (role === "customer") {
            const page = parseInt(req.query.page) || 1;
            const pageSize = parseInt(req.query.pageSize) || 10;
            const offset = (page - 1) * pageSize;
            const {
                store_uid,
                state,
                city,
                today,
                months,
                week,
                start_date,
                end_date,
                store_quotation_id,
                user_uid,
                globalSearch,
                type
            } = req.query;
            let storeFilter = {};
            if (today || months || week || (start_date && end_date)) {
                const now = new Date();
                let start, end;
                if (today) {
                    start = new Date(now.setHours(0, 0, 0, 0));
                    end = new Date(now.setHours(23, 59, 59, 999));
                } else if (months) {
                    start = new Date(now.setMonth(now.getMonth() - 1, 1));
                    end = new Date();
                } else if (week) {
                    start = new Date(now.setDate(now.getDate() - 7));
                    end = new Date();
                } else if (start_date && end_date) {
                    start = new Date(start_date);
                    end = new Date(end_date);
                    end.setHours(23, 59, 59, 999);
                }
                storeFilter.createdAt = { [Op.between]: [start, end] };
            }
            const searchTerms = globalSearch ? globalSearch.split(",").map(term => `%${term.trim()}%`) : [];
            const userDetailsWhere = {};
            const storeDetailsWhere = {};
            const chamberDetailsWhere = {};
            const quotationDetailsWhere = {};
            const quotationUserWhere = {};
            const quotationStoreWhere = {
                quotation_status: "asset_assigned"
            };
            if (state) quotationStoreWhere.state = state;
            if (city) {
                const cityList = city.split(",").map(c => c.trim());
                quotationStoreWhere.city = { [Op.in]: cityList };
            }
            if (store_quotation_id) {
                const quotationList = store_quotation_id.split(",").map(id => id.trim());
                quotationStoreWhere.store_quotation_id = { [Op.in]: quotationList };
            }
            if (user_uid) {
                const userList = Array.isArray(user_uid)
                    ? user_uid.map(id => id.trim())
                    : user_uid.split(',').map(id => id.trim());

                quotationUserWhere[Op.or] = [
                    { user_uid: { [Op.in]: userList } },
                    ...userList.map(uid => ({
                        full_name: { [Op.like]: `%${uid}%` }
                    }))
                ];
            }
            if (searchTerms.length) {
                userDetailsWhere[Op.or] = searchTerms.map(term => ({
                    [Op.or]: [
                        { user_uid: { [Op.like]: term } },
                        { full_name: { [Op.like]: term } }
                    ]
                }));
                storeDetailsWhere[Op.or] = searchTerms.map(term => ({
                    [Op.or]: [
                        { store_uid: { [Op.like]: term } },
                        { store_name: { [Op.like]: term } }
                    ]
                }));
                chamberDetailsWhere[Op.or] = searchTerms.map(term => ({
                    [Op.or]: [
                        { chamber_uid: { [Op.like]: term } },
                        { chambers_name: { [Op.like]: term } }
                    ]
                }));
                quotationDetailsWhere[Op.or] = searchTerms.map(term => ({
                    [Op.or]: [
                        { store_quotation_id: { [Op.like]: term } },
                        { state: { [Op.like]: term } },
                        { city: { [Op.like]: term } }
                    ]
                }));
                quotationUserWhere[Op.or] = searchTerms.map(term => ({
                    user_uid: { [Op.like]: term }
                })).concat(
                    searchTerms.map(term => ({
                        full_name: { [Op.like]: term }
                    }))
                );
            }
            let totalCount;
            let storeDetails;
            const baseWhere = { ...storeFilter };
            if (type === "store") {
                baseWhere.type_id = { [Op.ne]: null };
                totalCount = await models.quotation_assigned_assets.count({
                    where: {
                        ...baseWhere,
                    },
                    include: [
                        {
                            model: models.quotation_store,
                            as: "StoreQuotationDetails",
                            where: {
                                quotation_status: "asset_assigned"
                            },
                        }
                    ],
                    group: ['type_id'],
                    distinct: true
                });
                totalCount = totalCount.length;
                const rawStoreDetails = await models.quotation_assigned_assets.findAll({
                    where: baseWhere,
                    include: [
                        {
                            model: models.User,
                            as: "userDetails",
                            required: true,
                        },
                        {
                            model: models.stores,
                            as: "storeDetails",
                            required: true,
                        },
                        {
                            model: models.store_chambers,
                            as: "chamberDetails",
                            required: true,
                        },
                        {
                            model: models.quotation_store,
                            as: "StoreQuotationDetails",
                            required: true,
                            where: quotationStoreWhere,
                            include: [
                                {
                                    model: models.User,
                                    as: "user",
                                    required: true,
                                    where: quotationUserWhere
                                },
                                {
                                    model: models.assigned_quotation,
                                    as: "AssignedSubUser",
                                    where: { admin_assigned: true },
                                    required: false,
                                    include: [
                                        {
                                            model: models.User,
                                            as: "managerDetails",
                                            attributes: ["id", "role_id", "full_name", "email", "phone_number", "designation", "city", "department", "createdAt", "updatedAt"]
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    group: ['type_id'],
                    distinct: true,
                    order: [["id", "DESC"]]
                });

                const seenQuotationIds = new Set();
                storeDetails = rawStoreDetails.filter(item => {
                    if (!seenQuotationIds.has(item.StoreQuotationDetails.id)) {
                        seenQuotationIds.add(item.StoreQuotationDetails.id);
                        return true;
                    }
                    return false;
                }).slice(offset, offset + pageSize);

            } else if (type === "chamber") {
                totalCount = await models.quotation_assigned_assets.count({
                    where: baseWhere,
                    include: [
                        {
                            model: models.quotation_store,
                            as: "StoreQuotationDetails",
                            required: true,
                            where: {
                                quotation_status: "asset_assigned"
                            }
                        }
                    ],
                    col: 'chamber_id'
                });
                storeDetails = await models.quotation_assigned_assets.findAll({
                    where: baseWhere,
                    include: [
                        {
                            model: models.User,
                            as: "userDetails",
                            required: true,
                            where: Object.keys(userDetailsWhere).length ? userDetailsWhere : undefined,
                        },
                        {
                            model: models.stores,
                            as: "storeDetails",
                            required: true,
                            where: {
                                ...(store_uid && {
                                    store_uid: { [Op.in]: store_uid.split(",").map(id => id.trim()) }
                                }),
                                ...(storeDetailsWhere && Object.keys(storeDetailsWhere).length ? storeDetailsWhere : {})
                            },
                        },
                        {
                            model: models.store_chambers,
                            as: "chamberDetails",
                            required: true,
                            where: Object.keys(chamberDetailsWhere).length ? chamberDetailsWhere : undefined
                        },
                        {
                            model: models.quotation_store,
                            as: "StoreQuotationDetails",
                            required: true,
                            where: quotationStoreWhere,
                            include: [
                                {
                                    model: models.User,
                                    as: "user",
                                    required: true,
                                    where: quotationUserWhere
                                },
                                {
                                    model: models.assigned_quotation,
                                    as: "AssignedSubUser",
                                    where: { admin_assigned: true },
                                    required: false,
                                    include: [
                                        {
                                            model: models.User,
                                            as: "managerDetails",
                                            attributes: ["id", "role_id", "full_name", "email", "phone_number", "designation", "city", "department", "createdAt", "updatedAt"]
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    order: [["id", "DESC"]],
                    offset,
                    limit: pageSize,
                });
            } else {
                totalCount = await models.quotation_assigned_assets.count({
                    where: baseWhere
                });
                storeDetails = await models.quotation_assigned_assets.findAll({
                    where: baseWhere,
                    include: [
                        {
                            model: models.User,
                            as: "userDetails",
                            required: true,
                            where: Object.keys(userDetailsWhere).length ? userDetailsWhere : undefined
                        },
                        {
                            model: models.stores,
                            as: "storeDetails",
                            required: true,
                            where: Object.keys(storeDetailsWhere).length ? storeDetailsWhere : undefined,
                            include: [
                                {
                                    model: models.store_chambers,
                                    attributes: {
                                        exclude: ["photo_of_entrance", "photo_of_chamber"]
                                    },
                                    as: "table_of_chamber",
                                    include: [
                                        {
                                            model: models.store_chamber_images,
                                            as: 'chamber_images',
                                            attributes: ["id", "type", "image", "created_at", "updated_at"]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            model: models.store_chambers,
                            as: "chamberDetails",
                            required: true,
                            where: Object.keys(chamberDetailsWhere).length ? chamberDetailsWhere : undefined
                        },
                        {
                            model: models.quotation_store,
                            as: "StoreQuotationDetails",
                            required: true,
                            where: quotationStoreWhere,
                            include: [
                                {
                                    model: models.User,
                                    as: "user",
                                    required: true,
                                    where: quotationUserWhere
                                },
                                {
                                    model: models.assigned_quotation,
                                    as: "AssignedSubUser",
                                    where: { admin_assigned: true },
                                    required: false,
                                    include: [
                                        {
                                            model: models.User,
                                            as: "managerDetails",
                                            attributes: ["id", "role_id", "full_name", "email", "phone_number", "designation", "city", "department", "createdAt", "updatedAt"]
                                        }
                                    ]
                                }
                            ]
                        }
                    ],
                    order: [["id", "DESC"]],
                    offset,
                    limit: pageSize
                });
            }
            return REST.success(res, {
                storeDetails,
                pagination: {
                    totalCount: storeDetails.length,
                    totalPages: Math.ceil(totalCount / pageSize),
                    currentPage: page,
                    pageSize,
                },
            }, "Get Store Assets fetched successfully.");
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }

});
router.get('/getMoveAssets', async function (req, res) {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize
    const role = req.query.role
    try {
        if (role === "partner") {
            const {
                move_uid,
                state,
                city,
                today,
                months,
                week,
                start_date,
                end_date,
                globalSearch,
                verified
            } = req.query;
            let moveFilter = {}
            function formatDate(date) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            if (today) {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const endOfToday = new Date();
                endOfToday.setHours(23, 59, 59, 999);
                moveFilter.createdAt = { [Op.between]: [startOfToday, endOfToday] };
            } else if (months) {
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                oneMonthAgo.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                moveFilter.createdAt = { [Op.between]: [oneMonthAgo, today] };
            } else if (week) {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                oneWeekAgo.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                moveFilter.createdAt = { [Op.between]: [oneWeekAgo, today] };
            } else if (start_date && end_date) {
                const start = new Date(start_date);
                const end = new Date(end_date);
                end.setHours(23, 59, 59, 999);
                moveFilter.createdAt = { [Op.between]: [start, end] };
            }
            if (move_uid) {
                const moveUids = move_uid.split(',').map(uid => uid.trim());
                moveFilter.move_uid = { [Op.in]: moveUids };
            }
            if (state) {
                moveFilter.state = state;
            }
            if (city) {
                const cities = city.split(',').map(c => c.trim());
                moveFilter.city = { [Op.in]: cities };
            }
            if (verified === "false") {
                moveFilter.is_verified = 0;
            }
            else if (verified === "true") {
                moveFilter.is_verified = 1;
            }

            let globalSearchFilter = {};
            if (globalSearch) {
                const search = globalSearch.split(',').map(term => term.trim());
                globalSearchFilter = {
                    [Op.or]: [
                        ...search.map(move => ({ move_uid: { [Op.like]: `%${move}%` } })),
                        ...search.map(move => ({ city: { [Op.like]: `%${move}%` } })),
                        ...search.map(move => ({ state: { [Op.like]: `%${move}%` } })),
                        ...search.map(move => ({ make: { [Op.like]: `%${move}%` } })),
                        ...search.map(move => ({ model: { [Op.like]: `%${move}%` } })),
                        ...search.map(move => ({ actual_payload: { [Op.like]: `%${move}%` } })),
                        ...search.map(store => ({ '$user.full_name$': { [Op.like]: `%${store}%` } })),
                        ...search.map(store => ({ '$user.user_uid$': { [Op.like]: `%${store}%` } }))
                    ]
                };
            }
            const whereCondition = {
                [Op.and]: [
                    moveFilter,
                    globalSearchFilter
                ]
            };
            const totalCount = await models.move_details.count({
                where: whereCondition,
                include: [
                    {
                        model: models.User,
                        as: "user",
                        attributes: ["id", "user_uid", "full_name", "createdAt", "updatedAt"],
                        required: true
                    },
                ],
            });
            const data = await models.move_details.findAll({
                where: whereCondition,
                include: [
                    {
                        model: models.User,
                        as: "user",
                        attributes: ["id", "user_uid", "full_name", "createdAt", "updatedAt"],
                        required: true

                    },
                ],
                order: [["id", "ASC"]],
                offset: offset,
                limit: pageSize,
            })
            const totalPages = Math.ceil(totalCount / pageSize);
            return REST.success(res, {
                moveFilter: data,
                pagination: {
                    totalCount,
                    totalPages,
                    currentPage: page,
                    pageSize,
                },
            }, 'Get Move Assets fetched successfully')
        } else if (role === "customer") {
            return REST.success(res, [], 'Data Not Found');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPrepareAssets', async function (req, res) {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const role = req.query.role
    try {
        if (role === "partner") {
            const {
                prepare_uid,
                state,
                city,
                today,
                months,
                week,
                start_date,
                end_date,
                globalSearch,
                verified
            } = req.query;

            let PrepareFilter = {};
            if (today) {
                const startOfToday = new Date();
                startOfToday.setHours(0, 0, 0, 0);
                const endOfToday = new Date();
                endOfToday.setHours(23, 59, 59, 999);
                PrepareFilter.createdAt = { [Op.between]: [startOfToday, endOfToday] };
            } else if (months) {
                const oneMonthAgo = new Date();
                oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                oneMonthAgo.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                PrepareFilter.createdAt = { [Op.between]: [oneMonthAgo, today] };
            } else if (week) {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                oneWeekAgo.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(23, 59, 59, 999);
                PrepareFilter.createdAt = { [Op.between]: [oneWeekAgo, today] };
            } else if (start_date && end_date) {
                const start = new Date(start_date);
                const end = new Date(end_date);
                end.setHours(23, 59, 59, 999);
                PrepareFilter.createdAt = { [Op.between]: [start, end] };
            }
            if (prepare_uid) {
                const prepareUids = prepare_uid.split(',').map(uid => uid.trim());
                PrepareFilter.prepare_uid = { [Op.in]: prepareUids };
            }
            if (state) {
                PrepareFilter.state = state;
            }
            if (city) {
                const cities = city.split(',').map(c => c.trim());
                PrepareFilter.city = { [Op.in]: cities };
            }
            if (verified === "false") {
                PrepareFilter.is_verified = 0;
            }
            else if (verified === "true") {
                PrepareFilter.is_verified = 1;
            }
            let globalSearchFilter = {};
            if (globalSearch) {
                const search = globalSearch.split(',').map(term => term.trim());
                globalSearchFilter = {
                    [Op.or]: [
                        ...search.map(prepare => ({ prepare_uid: { [Op.like]: `%${prepare}%` } })),
                        ...search.map(prepare => ({ state: { [Op.like]: `%${prepare}%` } })),
                        ...search.map(prepare => ({ city: { [Op.like]: `%${prepare}%` } })),
                        ...search.map(prepare => ({ address: { [Op.like]: `%${prepare}%` } })),
                        ...search.map(user => ({ '$user.full_name$': { [Op.like]: `%${user}%` } })),
                        ...search.map(user => ({ '$user.user_uid$': { [Op.like]: `%${user}%` } }))
                    ]
                };
            }
            const whereCondition = {
                [Op.and]: [
                    PrepareFilter,
                    globalSearchFilter
                ]
            };
            const totalCount = await models.prepare_details.count({
                where: whereCondition,
                include: [
                    {
                        model: models.User,
                        as: "user",
                        attributes: ["id", "user_uid", "full_name", "createdAt", "updatedAt"],
                        required: true
                    }
                ],
            });
            const data = await models.prepare_details.findAll({
                where: whereCondition,
                include: [
                    {
                        model: models.User,
                        as: "user",
                        attributes: ["id", "user_uid", "full_name", "createdAt", "updatedAt"],
                        required: true
                    }
                ],
                order: [["id", "ASC"]],
                offset: offset,
                limit: pageSize,
            });

            data.forEach(item => {
                if (item.product_category && typeof item.product_category === 'string') {
                    try {
                        item.product_category = JSON.parse(item.product_category);
                    } catch (e) {
                        console.error('Error parsing product_category:', e);
                    }
                }
                if (item.product_type && typeof item.product_type === 'string') {
                    try {
                        item.product_type = JSON.parse(item.product_type);
                    } catch (e) {
                        console.error('Error parsing product_type:', e);
                    }
                }
            });
            const totalPages = Math.ceil(totalCount / pageSize);
            return REST.success(res, {
                PrepareFilter: data,
                pagination: {
                    totalCount,
                    totalPages,
                    currentPage: page,
                    pageSize,
                },
            }, 'Get Prepare Assets fetched successfully');
        } else if (role === "customer") {
            return REST.success(res, [], 'Data Not Found');
        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});


/*
|----------------------------------------------------------------------------------------------------------------
|              Moves Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/getAllMoves', async function (req, res) {
    try {
        const cUser = req.body.current_user;
        console.log(cUser.id, 'current user')
        const data = await models.move_details.findAll({
            include: [
                {
                    model: models.User,
                    as: "user"
                },
                {
                    model: models.User,
                    as: 'updatedby',
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "verified_By",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User_firm,
                    as: "firm_details",
                    attributes: ["id", "firm_name"],
                    include: {
                        model: models.Firm_type,
                        as: "firmtype"
                    }
                }
            ],
            order: [["id", "DESC"]],
        })

        data.forEach(item => {
            if (item.verified_By) {
                item.verified_By.dataValues.verified_at = item.verified_at;
            }
            if (item.updatedby) {
                item.dataValues.updatedby.dataValues.created_at = item.updatedAt;
            }
        });
        return REST.success(res, data, 'Data fetched successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getMoves/:move_uid', async function (req, res) {
    try {
        const findMove = await models.move_details.findOne({ where: { move_uid: req.params.move_uid } })
        if (!findMove) {
            return REST.error(res, 'Move Uid not exist', 404);
        }
        const move_uid = req.params.move_uid
        const data = await models.move_details.findOne({
            where: { move_uid: move_uid },
            order: [["id", "DESC"]],
            include: [
                {
                    model: models.User_firm,
                    as: "firm_details",
                    include: [
                        {
                            model: models.Firm_type,
                            as: "firmtype"
                        },
                        {
                            model: models.User,
                            as: "user"
                        },
                    ]
                },
                {
                    model: models.User,
                    as: "updatedby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.move_compliance_details,
                    as: "move_compliance_details"
                },
                {
                    model: models.User,
                    as: "verified_By",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ]

        });
        let result = data.dataValues.firm_details.user;
        data.dataValues.user = result;
        delete data.dataValues.firm_details.dataValues.user;

        if (data.verified_By) {
            data.verified_By.dataValues.verified_at = data.verified_at;
        }
        if (data && data.updatedby) {
            data.dataValues.updatedby.dataValues.updated_at = data.dataValues.updatedAt;
        }
        if (data && data.addedby) {
            data.dataValues.addedby.dataValues.created_at = data.dataValues.createdAt;
        }
        if (!data) {
            return REST.error(res, 'Move Id Not Found!', 404);
        }
        return REST.success(res, data, 'Data fetched Successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getMovesById/:move_uid', async function (req, res) {
    try {
        const findMove = await models.move_details.findOne({ where: { move_uid: req.params.move_uid } })
        if (!findMove) {
            return REST.error(res, 'Move Uid not exist', 404);
        }
        const move_uid = req.params.move_uid
        const data = await models.move_details.findOne({
            where: { move_uid: move_uid },
            order: [["id", "DESC"]],
            include: [
                {
                    model: models.User,
                    as: "updatedby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User_firm,
                    as: "firm_details",
                    include: [{
                        model: models.Firm_type,
                        as: "firmtype"
                    },
                    {
                        model: models.User,
                        as: "user"
                    },
                    ]
                },
                {
                    model: models.move_compliance_details,
                    as: "move_compliance_details",
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
                    model: models.User,
                    as: "verified_By",
                    attributes: ["id", "full_name"]
                }
            ]
        });
        let result = data.dataValues.firm_details.user;
        data.dataValues.user = result;
        delete data.dataValues.firm_details.dataValues.user;

        const requestkey = [
            "move_details",
            "move_compliance_details"
        ]
        const request_for_move = await Promise.all(requestkey.map(async (key) => {
            return await models.request_for_store.findAll({
                where: { section_id: findMove.id, section_key: key }
            })
        }))
        const requestForMove = {}
        for (let i = 0; i < requestkey.length; i++) {
            requestForMove[requestkey[i]] = request_for_move[i]
        }
        if (data.verified_By) {
            data.verified_By.dataValues.verified_at = data.verified_at;
        }
        if (data && data.updatedby) {
            data.dataValues.updatedby.dataValues.updated_at = data.dataValues.updatedAt;

        }

        if (data.move_compliance_details) {
            data.dataValues.move_compliance_details.forEach(moveCompliance => {
                if (moveCompliance.addedby) {
                    moveCompliance.addedby.dataValues.created_at = moveCompliance.createdAt;
                }
                if (moveCompliance.updatedby) {
                    moveCompliance.updatedby.dataValues.updated_at = moveCompliance.updatedAt;
                }
            });

        }
        data.dataValues.request_for_move = requestForMove;
        if (!data) {
            return REST.error(res, 'Move Id Not Found!', 404);
        }
        return REST.success(res, data, 'Data fetched Successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.delete('/deleteMoves/:id', async function (req, res) {
    try {
        const moves = await models.move_details.findOne({ where: { id: req.params.id } })
        if (moves == null) {
            return REST.error(res, 'Moves Id Not Found', 404)
        }
        const id = req.params.id
        const data = await models.move_details.destroy({ where: { id: id } })
        return REST.success(res, data, 'Data fetched Successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getMoveByFirmId/:firm_uid', async function (req, res) {
    try {
        const findFirm = await models.User_firm.findOne({ where: { firm_uid: req.params.firm_uid } });
        if (!findFirm) {
            return REST.error(res, 'Firm Uid not exist', 404);
        }
        const firm_uid = req.params.firm_uid
        const data = await models.move_details.findAll({
            where: { firm_id: findFirm.id },
            include: [

                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "user"
                },
                {
                    model: models.User,
                    as: 'updatedby',
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "verified_By",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User_firm,
                    as: "firm_details",
                    where: { firm_uid: firm_uid },
                    include: {
                        model: models.Firm_type,
                        as: "firmtype"
                    }
                }
            ],
            order: [["id", "DESC"]],
        })
        data.forEach(item => {
            if (item.verified_By) {
                item.verified_By.dataValues.verified_at = item.verified_at;
            }
            if (item.addedby) {
                item.dataValues.addedby.dataValues.created_at = item.createdAt;
            }
            if (item.updatedby) {
                item.dataValues.updatedby.dataValues.updated_at = item.updatedAt;
            }
        });
        return REST.success(res, data, 'Data fetched Successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
/*
|----------------------------------------------------------------------------------------------------------------
|              Prepares Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.get('/getPrepare', async function (req, res) {
    try {
        const cUser = req.body.current_user;
        const data = await models.prepare_details.findAll({
            include: [
                {
                    model: models.User,
                    as: "user"
                },
                {
                    model: models.User,
                    as: "updatebyUser",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.prepare_machines,
                    as: "prepare_machines",
                    include: [
                        {
                            model: models.User,
                            as: "Updated_by",
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
                    as: "firm",
                    attributes: ["id", "firm_name"],
                    include: {
                        model: models.Firm_type,
                        as: "firmtype"
                    }
                },
                {
                    model: models.User,
                    as: "verifiedby",
                    attributes: ["id", "full_name"]
                },
            ],
            order: [["id", "DESC"]],
        });
        data.forEach(item => {
            if (item.verifiedby) {
                item.dataValues.verifiedby.dataValues.verified_at = item.verified_at;
            }
            if (item.updatebyUser) {
                item.dataValues.updatebyUser.dataValues.updated_at = item.updatedAt;
            }
        });
        data.forEach(machines => {
            machines.dataValues.prepare_machines.forEach(machine => {
                if (machine.dataValues.Updated_by) {
                    machine.dataValues.Updated_by.dataValues.updated_at = machine.dataValues.updatedAt
                }
                if (machine.dataValues.addedby) {
                    machine.dataValues.addedby.dataValues.created_at = machine.dataValues.updatedAt
                }
            })
        })
        data.forEach(item => {
            item.product_category = JSON.parse(item.product_category);
            if (item.product_type) {
                item.product_type = JSON.parse(item.product_type);
            }
        });
        return REST.success(res, data, 'Data fetched Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getPrepareById/:prepare_uid', async function (req, res) {
    try {
        const findPrepare = await models.prepare_details.findOne({ where: { prepare_uid: req.params.prepare_uid } });
        if (!findPrepare) {
            return REST.error(res, 'Prepare Uid not exist', 404);
        }
        const prepare_uid = req.params.prepare_uid
        const data = await models.prepare_details.findOne({
            where: { prepare_uid: prepare_uid },
            include: [

                {
                    model: models.User_firm,
                    as: "firm",
                    include: [
                        {
                            model: models.Firm_type,
                            as: "firmtype"
                        },
                        {
                            model: models.User,
                            as: "user"
                        },
                    ]
                },
                {
                    model: models.prepare_machines,
                    as: "prepare_machines",
                    include: [
                        {
                            model: models.User,
                            as: "Updated_by",
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
                    model: models.prepare_compliance_details,
                    as: "prepare_compliance_details",
                    include: {
                        model: models.User,
                        as: "updated_Details",
                        attributes: ["id", "full_name"]
                    }
                },
                {
                    model: models.prepare_additional_submissions,
                    as: "prepare_additional_details"
                },
                {
                    model: models.User,
                    as: "verifiedby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                }
            ],
            order: [
                [{ model: models.prepare_machines, as: 'prepare_machines' }, 'id', 'DESC']
            ],
        })

        let result = data.dataValues.firm.user;
        data.dataValues.user = result;
        delete data.dataValues.firm.dataValues.user;

        const requestkey = [
            "prepare_machines",
            "prepare_details",
            "prepare_compliance_details",
            "prepare_additional_submissions"
        ]
        const requests = await Promise.all(requestkey.map(async (key) => {
            return models.request_for_store.findAll({
                where: { section_id: findPrepare.id, section_key: key }
            });
        }));
        const requestForPrepare = {};
        requestkey.forEach((key, index) => {
            requestForPrepare[key] = requests[index];
        });
        if (data.verifiedby) {
            data.verifiedby.dataValues.verified_at = data.verified_at;
        }
        if (data.addedby) {
            data.addedby.dataValues.created_at = data.createdAt
        }
        data.dataValues.prepare_compliance_details.forEach(prepareCompliance => {
            if (prepareCompliance.dataValues.updated_Details) {
                prepareCompliance.dataValues.updated_Details.dataValues.updated_at = prepareCompliance.dataValues.updatedAt
            }
        })
        data.dataValues.prepare_machines.forEach(machine => {
            if (machine.dataValues.Updated_by) {
                machine.dataValues.Updated_by.dataValues.updated_at = machine.dataValues.updatedAt
            }
            if (machine.dataValues.addedby) {
                machine.dataValues.addedby.dataValues.created_at = machine.dataValues.createdAt
            }
        })
        data.dataValues.request_for_prepare = requestForPrepare;
        if (typeof data.product_category === "string") {
            data.product_category = JSON.parse(data.product_category);
        }
        if (data.product_type && typeof data.product_type === "string") {
            data.product_type = JSON.parse(data.product_type);
        }
        data.prepare_additional_details.forEach(prepares => {
            if (prepares.asset_3d_view_url && typeof prepares.asset_3d_view_url === 'string') {
                prepares.asset_3d_view_url = JSON.parse(prepares.asset_3d_view_url);
            }
            if (prepares.asset_photo_url && typeof prepares.asset_photo_url === 'string') {
                prepares.asset_photo_url = JSON.parse(prepares.asset_photo_url);
            }
        });

        return REST.success(res, data, 'Data fetched Successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPrepareDetails/:prepare_uid', async function (req, res) {
    try {
        const findPrepare = await models.prepare_details.findOne({ where: { prepare_uid: req.params.prepare_uid } });
        if (!findPrepare) {
            return REST.error(res, 'Prepare Uid not exist', 404);
        }
        const prepare_uid = req.params.prepare_uid
        const data = await models.prepare_details.findOne({
            where: { prepare_uid: prepare_uid },
            include: [
                {
                    model: models.User_firm,
                    as: "firm",
                    include: [
                        {
                            model: models.Firm_type,
                            as: "firmtype"
                        },
                        {
                            model: models.User,
                            as: "user"
                        },
                    ]
                },
                {
                    model: models.prepare_machines,
                    as: "prepare_machines",
                    include: [
                        {
                            model: models.User,
                            as: "Updated_by",
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
                    model: models.prepare_compliance_details,
                    as: "prepare_compliance_details",
                    include: [{
                        model: models.User,
                        as: "updated_Details",
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
                    model: models.prepare_additional_submissions,
                    as: "prepare_additional_details",
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
                    model: models.User,
                    as: "verifiedby",
                    attributes: ["id", "full_name"]
                },
            ],
            order: [["id", "DESC"]],
        })

        let result = data.dataValues.firm.user;
        data.dataValues.user = result;
        delete data.dataValues.firm.dataValues.user;

        const requestkey = [
            "prepare_machines",
            "prepare_details",
            "prepare_compliance_details",
            "prepare_additional_submissions"
        ]
        const requests = await Promise.all(requestkey.map(async (key) => {
            return models.request_for_store.findAll({
                where: { section_id: findPrepare.id, section_key: key }
            });
        }));
        const requestForPrepare = {};
        requestkey.forEach((key, index) => {
            requestForPrepare[key] = requests[index];
        });
        if (data.verifiedby) {
            data.verifiedby.dataValues.verified_at = data.verified_at;
        }
        data.dataValues.prepare_compliance_details.forEach(prepareCompliance => {
            if (prepareCompliance.dataValues.updated_Details) {
                prepareCompliance.dataValues.updated_Details.dataValues.updated_at = prepareCompliance.dataValues.updatedAt;
            }
            if (prepareCompliance.dataValues.addedby) {
                prepareCompliance.dataValues.addedby.dataValues.created_at = prepareCompliance.dataValues.createdAt;
            }
        });
        data.dataValues.prepare_machines.forEach(machine => {
            if (machine.dataValues.Updated_by) {
                machine.dataValues.Updated_by.dataValues.updated_at = machine.dataValues.updatedAt
            }
            if (machine.dataValues.addedby) {
                machine.dataValues.addedby.dataValues.created_at = machine.dataValues.createdAt
            }
        })
        data.dataValues.prepare_additional_details.forEach(additionalDetail => {
            if (additionalDetail.dataValues.updatedby) {
                additionalDetail.dataValues.updatedby.dataValues.updated_at = additionalDetail.dataValues.updatedAt;
            }
            if (additionalDetail.dataValues.addedby) {
                additionalDetail.dataValues.addedby.dataValues.created_at = additionalDetail.dataValues.createdAt;
            }
        });
        data.dataValues.request_for_prepare = requestForPrepare;
        if (typeof data.product_category === "string") {
            data.product_category = JSON.parse(data.product_category);
        }
        if (data.product_type && typeof data.product_type === "string") {
            data.product_type = JSON.parse(data.product_type);
        }
        data.prepare_additional_details.forEach(prepares => {
            if (prepares.asset_3d_view_url && typeof prepares.asset_3d_view_url === 'string') {
                prepares.asset_3d_view_url = JSON.parse(prepares.asset_3d_view_url);
            }
            if (prepares.asset_photo_url && typeof prepares.asset_photo_url === 'string') {
                prepares.asset_photo_url = JSON.parse(prepares.asset_photo_url);
            }
        });
        return REST.success(res, data, 'Data fetched Successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.delete('/deletePrepare/:id', async function (req, res) {
    try {
        const findPrepare = await models.prepare_details.findOne({ where: { id: req.params.id } })
        if (findPrepare == null) {
            return REST.error(res, 'prepare Id Not Found', 404)
        }
        const id = req.params.id
        const data = await models.prepare_details.destroy({ where: { id: id } })
        return REST.success(res, data, 'Prepare Deleted Successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getPrepareByFirmId/:firm_uid', async function (req, res) {
    try {
        const findFirm = await models.User_firm.findOne({ where: { firm_uid: req.params.firm_uid } });
        if (!findFirm) {
            return REST.error(res, 'Firm Uid not exist', 404);
        }
        const firm_uid = req.params.firm_uid
        const data = await models.prepare_details.findAll({
            where: { firm_id: findFirm.id },
            include: [
                {
                    model: models.User,
                    as: "addedby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "user"
                },
                {
                    model: models.User,
                    as: "updatebyUser",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.User,
                    as: "verifiedby",
                    attributes: ["id", "full_name"]
                },
                {
                    model: models.prepare_machines,
                    as: "prepare_machines",
                    include: [
                        {
                            model: models.User,
                            as: "Updated_by",
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
                    as: "firm",
                    where: { firm_uid: firm_uid },
                    include: {
                        model: models.Firm_type,
                        as: "firmtype"
                    }
                }

            ],
            order: [["id", "DESC"]],
        })
        data.forEach(item => {
            if (item.verifiedby) {
                item.dataValues.verifiedby.dataValues.verified_at = item.verified_at;
            }
            if (item.addedby) {
                item.dataValues.addedby.dataValues.created_at = item.createdAt;
            }
            if (item.updatebyUser) {
                item.dataValues.updatebyUser.dataValues.updated_at = item.updatedAt;
            }
        });
        data.forEach(machines => {
            machines.dataValues.prepare_machines.forEach(machine => {
                if (machine.dataValues.Updated_by) {
                    machine.dataValues.Updated_by.dataValues.updated_at = machine.dataValues.updatedAt
                }
                if (machine.dataValues.addedby) {
                    machine.dataValues.addedby.dataValues.created_at = machine.dataValues.updatedAt
                }
            })
        })
        for (let value of data) {
            value.dataValues.product_category = JSON.parse(value.dataValues.product_category);
            value.dataValues.product_type = JSON.parse(value.dataValues.product_type);
        }
        return REST.success(res, data, 'Data fetched Successfully')
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
/*
|----------------------------------------------------------------------------------------------------------------
|              Admin Verifications Apis
|----------------------------------------------------------------------------------------------------------------
*/
const sendDocumentNotification = async (cUser, user, documentNames, heading, documentType, documentDisplayNames, referenceUid, notificationType) => {
    const displayNames = documentNames.map(name => documentDisplayNames[name] || name);
    const documentName = displayNames.join(", ");
    const fullName = user.full_name
    await sendVerificationMessage(user.phone_number, documentName, fullName);
    const findReciverToken = await models.User.findOne({
        where: {
            id: user.id
        }
    });
    const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);
    await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your ${heading} ${documentType} document ${displayNames.length > 1 ? 's' : ''} ${documentName} for ${referenceUid} has been successfully verified.`)
    await models.notification.create({
        sender_id: cUser.id,
        reciver_id: user.id,
        title: `Document Verified`,
        messages: `Your ${heading} ${documentType} document ${displayNames.length > 1 ? 's' : ''} ${documentName} for ${referenceUid} has been successfully verified.`,
        notification_type: notificationType
    });
};
router.post('/adminVerification', async function (req, res) {
    const cUser = req.body.current_user;
    const { user_id, details } = req.body;
    const logEntries = [];
    try {
        const verifiedFirmIds = new Set()
        const verifiedStoreIds = new Set();
        const verifiedMoveIds = new Set();
        const verifiedPrepareIds = new Set();

        let firmField = [
            "upload_gst_certificate",
            // "profile",
            // "aadhar_front",
            // "aadhar_back",
            // "aadhar_number",
            // "gst_number"
        ];
        let storeField = [
            "fsssai_license_url",
            "iso_certificate_url",
            "haccp_url",
            "post_control_url",
            "brc_audit_url",
            "fire_safety_noc_url",
            "pollution_noc_url",
            "mcd_license_url",
            "up_cold_storage_license_url",
            "factory_license_url",
            "panchayat_noc_url",
            "no_lien_certificate_url",
            "latest_electricity_bill_url",
        ];
        let moveField = [
            "permit_url",
            "pucc_url",
            "insurance_policy",
            // "no_entry_permit",
            "fitness_certificate"
        ];
        let prepareField = [
            "fsssai_license_url",
            "iso_certificate_url",
            "haccp_url",
            "pest_control_agency_contract_url",
            "brc_audit_url",
            "fire_safety_noc_url",
            "pollution_noc_url",
            "mcd_license_url",
            "up_cold_storage_license_url",
            "factory_license_url",
            "panchayat_noc_url",
            "no_lien_certificate_url",
            "electricity_bill_url",
        ];

        for (const detail of details) {
            let { type, type_id, action, remarks, documentDetalis } = detail;
            if (!type_id) {
                return REST.error(res, 'type_id is required', 400);
            }
            let data;
            switch (type) {
                case 'firm':
                    data = await models.User_firm.findOne({ where: { id: type_id, user_id: user_id } });
                    let document = await models.document_common_logs.findAll({
                        where: {
                            type_id: type_id,
                            type: "firm",
                            user_id: user_id
                        }
                    });
                    if (document.length > 0) {
                        let documentLogsData = document.map((data) => data.document_name);
                        let verifiedDocuments = [...new Set(documentLogsData)];
                        firmField = firmField.filter(item => !verifiedDocuments.includes(item));
                    }
                    if (data) {
                        let documentNames = documentDetalis.map(data => data.document_name);
                        let allFieldsPresent = firmField.every(field => documentNames.includes(field));
                        if (allFieldsPresent) {
                            await models.User_firm.update(
                                {
                                    is_verified: action === "verified",
                                    verified_by: cUser.id,
                                    status: "verified",
                                    verified_at: new Date()
                                },
                                { where: { id: type_id } }
                            );
                            verifiedFirmIds.add(type_id);
                            const user = await models.User.findOne({ where: { id: data.user_id } });
                            if (user && user.phone_number) {
                                const documentNames = ['upload_gst_certificate'];
                                const documentDisplayNames = {
                                    'upload_gst_certificate': 'Gst Certificate',
                                };
                                const displayNames = documentNames.map(name => documentDisplayNames[name] || name);
                                const documentName = displayNames.join(", ");
                                const fullName = user.full_name;
                                await sendVerificationMessage(user.phone_number, documentName, fullName);
                            } else {
                                console.log('No phone number found for user:', user_id);
                            }
                        }
                    }
                    // case 'firm':
                    //     data = await models.User_firm.findOne({ where: { id: type_id, user_id: user_id } });
                    //     let document = await models.document_common_logs.findAll({
                    //         where: {
                    //             type_id: type_id,
                    //             type: "firm",
                    //             user_id: user_id
                    //         }
                    //     });
                    //     if (document.length > 0) {
                    //         let documentLogsData = document.map((data) => data.document_name);
                    //         let verifiedDocuments = [...new Set(documentLogsData)];
                    //         firmField = firmField.filter(item => !verifiedDocuments.includes(item));
                    //     }
                    //     if (data) {
                    //         let documentNames = documentDetalis.map(data => data.document_name);
                    //         const user = await models.User.findOne({ where: { id: data.user_id } });

                    //         let requiredDocs = [];
                    //         if (user.role_id === 1) {
                    //             requiredDocs = ['upload_gst_certificate',
                    //                 // 'profile', 'aadhar_front', 'aadhar_back', 'aadhar_number', 'gst_number'
                    //             ];
                    //         } else if (user.role_id === 2) {
                    //             requiredDocs = ['upload_gst_certificate'];
                    //         }
                    //         let allFieldsPresent = requiredDocs.every(field => documentNames.includes(field));
                    //         if (allFieldsPresent) {
                    //             await models.User_firm.update(
                    //                 {
                    //                     is_verified: action === "verified",
                    //                     verified_by: cUser.id,
                    //                     status: "verified",
                    //                     verified_at: new Date()
                    //                 },
                    //                 { where: { id: type_id } }
                    //             );
                    //             verifiedFirmIds.add(type_id);
                    //             if (user && user.phone_number) {
                    //                 const documentDisplayNames = {
                    //                     'upload_gst_certificate': 'Gst Certificate',
                    //                     "profile": 'Profile Picture',
                    //                     "aadhar_front": 'Aadhar front',
                    //                     "aadhar_back": 'Aadhar back',
                    //                     "aadhar_number": 'Aadhar Number',
                    //                     "gst_number": 'GST Number'
                    //                 };
                    //                 const displayNames = requiredDocs.map(name => documentDisplayNames[name] || name);
                    //                 const documentName = displayNames.join(", ");
                    //                 const fullName = user.full_name;
                    //                 await sendVerificationMessage(user.phone_number, documentName, fullName);
                    //             } else {
                    //                 console.log('No phone number found for user:', user_id);
                    //             }
                    //         }
                    //     }
                    break;
                case 'store':
                    data = await models.stores.findOne({ where: { id: type_id, user_id: user_id } });
                    break;
                case 'store_compliance':
                case 'store_additional':
                    let storeData;
                    let extractedTypeId;
                    if (type === "store_compliance") {
                        data = await models.store_compliance_details.findOne({ where: { id: type_id } });
                        storeData = await models.stores.findOne({
                            where: { id: data?.store_id },
                            attributes: ["id", "is_verified"],
                            include: {
                                model: models.store_additional_submissions,
                                as: "store_additional_submissions",
                                attributes: ["id"]
                            },
                        });
                        if (storeData?.store_additional_submissions && storeData.store_additional_submissions[0]) {
                            extractedTypeId = storeData.store_additional_submissions[0]?.id;
                        }
                    } else {
                        data = await models.store_additional_submissions.findOne({ where: { id: type_id } });
                        storeData = await models.stores.findOne({
                            where: { id: data?.store_id },
                            attributes: ["id", "is_verified"],
                            include: {
                                model: models.store_compliance_details,
                                as: "store_compliance_details",
                                attributes: ["id"]
                            },
                        });
                        if (storeData?.store_compliance_details && storeData.store_compliance_details[0]) {
                            extractedTypeId = storeData.store_compliance_details[0]?.id;
                        }
                    }
                    let storeDocumentLogWhereCondition = {
                        [Op.and]: [
                            {
                                [Op.or]: [
                                    {
                                        type_id: type_id,
                                        type: type === "store_compliance" ? "store_compliance" : "store_additional"
                                    },
                                    ...(extractedTypeId ? [{
                                        type_id: extractedTypeId,
                                        type: type === "store_compliance" ? "store_additional" : "store_compliance"
                                    }] : [])
                                ]
                            },
                            {
                                user_id: user_id
                            }
                        ]
                    };
                    const documentlogs = await models.document_common_logs.findAll({
                        where: storeDocumentLogWhereCondition
                    });

                    if (documentlogs.length > 0) {
                        let storeData = documentlogs.map((data) => {
                            return data.document_name;
                        });
                        let verifiedDocuments = [...new Set(storeData)];
                        storeField = storeField.filter(item => !verifiedDocuments.includes(item));
                    }
                    if (data && storeData?.dataValues?.is_verified == false) {
                        let documentNames = documentDetalis.map(data => data.document_name);
                        const allStore = storeField.every(field => documentNames.includes(field));
                        if (allStore) {
                            await models.store_compliance_details.update(
                                { document_status: action === "verified" },
                                {
                                    where: {
                                        id: type === "store_compliance" ? type_id : extractedTypeId
                                    }
                                }
                            );
                            await models.store_additional_submissions.update(
                                { document_status: action === "verified" },
                                {
                                    where: {
                                        id: type === "store_additional" ? type_id : extractedTypeId
                                    }
                                },
                            )
                            verifiedStoreIds.add(data.store_id);
                        }
                    }
                    const findStore = await models.stores.findOne({
                        where: { id: data.store_id, user_id: user_id }
                    })
                    const storeUid = findStore.store_uid
                    if (findStore) {
                        const user = await models.User.findOne({ where: { id: findStore.user_id } });
                        const documentDisplayNames = {
                            'fsssai_license_url': 'Fsssai License',
                            'iso_certificate_url': 'ISO Certificate',
                            "haccp_url": 'Haccp',
                            "post_control_url": 'Post Control',
                            "brc_audit_url": 'Brc Audit',
                            "fire_safety_noc_url": 'Fire Safety Noc',
                            "pollution_noc_url": 'Pollution Noc',
                            "mcd_license_url": 'Mcd License',
                            "up_cold_storage_license_url": 'Up Cold Storage License',
                            "factory_license_url": 'Factory License',
                            "panchayat_noc_url": 'Panchayat Noc',
                            "no_lien_certificate_url": "No Lien Certificate",
                            "latest_electricity_bill_url": "Latest Electricity Bill",
                        };
                        if (user && user.phone_number) {
                            const verifiedDoc = documentDetalis.map(detail => detail.document_name)
                            const notificationType = "Store Management";
                            if (type === 'store_compliance') {
                                await sendDocumentNotification(cUser, user, verifiedDoc, 'Store', 'Compliance', documentDisplayNames, storeUid, notificationType);
                            } else {
                                await sendDocumentNotification(cUser, user, verifiedDoc, 'Store', 'Compliance', documentDisplayNames, storeUid, notificationType);
                            }
                        } else {
                            console.log('No phone number found for user:', user_id);
                        }
                    }
                    break;
                case 'move':
                    data = await models.move_details.findOne({ where: { id: type_id, user_id: user_id } });
                    break;
                case 'move_compliance':
                    data = await models.move_compliance_details.findOne({ where: { id: type_id } });
                    let documentLogs = await models.document_common_logs.findAll({
                        where: {
                            type_id: type_id,
                            type: "move_compliance",
                            user_id: user_id
                        }
                    });
                    if (documentLogs.length > 0) {
                        let documentLogsData = documentLogs.map((data) => {
                            return data.document_name;
                        });
                        let verifiedDocuments = [...new Set(documentLogsData)];
                        moveField = moveField.filter(item => !verifiedDocuments.includes(item));
                    }
                    const moveData = await models.move_details.findOne({
                        where: { id: data.move_id, user_id: user_id },
                        attributes: ["id", "is_verified"]
                    })
                    if (data && moveData?.dataValues?.is_verified == false) {
                        let documentNames = documentDetalis.map(data => data.document_name);
                        let allFieldsPresent = moveField.every(field => documentNames.includes(field));
                        if (allFieldsPresent) {
                            await models.move_compliance_details.update(
                                { document_status: action === "verified" },
                                { where: { id: type_id } }
                            );
                            verifiedMoveIds.add(data.move_id);
                        }
                    }
                    const findMove = await models.move_details.findOne({
                        where: { id: data.move_id, user_id: user_id }
                    })
                    const findMoveUid = findMove.move_uid
                    if (findMove) {
                        const user = await models.User.findOne({ where: { id: findMove.user_id } });
                        if (user && user.phone_number) {
                            const verifiedDoc = documentDetalis.map(detail => detail.document_name)
                            const documentDisplayNames = {
                                "permit_url": "Permit",
                                "pucc_url": "Pucc",
                                "insurance_policy": "Insurance Policy",
                                "fitness_certificate": "Fitness Certificate"
                            };
                            const displayNames = verifiedDoc.map(name => documentDisplayNames[name] || name);
                            const documentName = displayNames.join(", ");
                            const fullName = user.full_name;
                            await sendVerificationMessage(user.phone_number, documentName, fullName);
                            const findReciverToken = await models.User.findOne({
                                where: {
                                    id: findMove.user_id
                                }
                            });
                            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);
                            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `Your Move Compliance document ${displayNames.length > 1 ? 's' : ''} ${documentName} for ${findMoveUid} has been successfully verified.`)
                            await models.notification.create({
                                sender_id: cUser.id,
                                reciver_id: findMove.user_id,
                                title: `Document Verified`,
                                messages: `Your Move Compliance document ${displayNames.length > 1 ? 's' : ''} ${documentName} for ${findMoveUid} has been successfully verified.`,
                                notification_type: "Move Management"

                            });
                        } else {
                            console.log('No phone number found for user:', user_id);
                        }
                    }
                    break;
                case 'prepare':
                    data = await models.prepare_details.findOne({ where: { id: type_id, user_id: user_id } });
                    break;
                case 'prepare_compliance':
                case 'prepare_additional':
                    let prepareData;
                    let extractedPrepareTypeId;
                    if (type === "prepare_compliance") {
                        data = await models.prepare_compliance_details.findOne({ where: { id: type_id } });

                        prepareData = await models.prepare_details.findOne({
                            where: { id: data?.prepare_id },
                            attributes: ["id", "is_verified"],
                            include: {
                                model: models.prepare_additional_submissions,
                                as: "prepare_additional_details",
                                attributes: ["id"]
                            },
                        });
                        if (prepareData?.prepare_additional_details && prepareData?.prepare_additional_details?.[0]) {
                            extractedPrepareTypeId = prepareData.prepare_additional_details[0]?.id;
                        }
                    } else {
                        data = await models.prepare_additional_submissions.findOne({ where: { id: type_id } });
                        prepareData = await models.prepare_details.findOne({
                            where: { id: data?.prepare_id },
                            attributes: ["id", "is_verified"],
                            include: {
                                model: models.prepare_compliance_details,
                                as: "prepare_compliance_details",
                                attributes: ["id"]
                            },
                        });
                        if (prepareData?.prepare_compliance_details && prepareData.prepare_compliance_details[0]) {
                            extractedPrepareTypeId = prepareData.prepare_compliance_details[0]?.id;
                        }
                    }
                    let prepareDocumentLogWhereCondition = {
                        [Op.and]: [
                            {
                                [Op.or]: [
                                    {
                                        type_id: type_id,
                                        type: type === "prepare_compliance" ? "prepare_compliance" : "prepare_additional"
                                    },
                                    ...(extractedPrepareTypeId ? [{
                                        type_id: extractedPrepareTypeId,
                                        type: type === "prepare_compliance" ? "prepare_additional" : "prepare_compliance"
                                    }] : [])
                                ]
                            },
                            {
                                user_id: user_id
                            }
                        ]
                    };

                    const prepareDocumentlogs = await models.document_common_logs.findAll({
                        where: prepareDocumentLogWhereCondition
                    });

                    if (prepareDocumentlogs.length > 0) {
                        let documentLogsData = prepareDocumentlogs.map((data) => {
                            return data.document_name;
                        });
                        let verifiedDocuments = [...new Set(documentLogsData)];
                        prepareField = prepareField.filter(item => !verifiedDocuments.includes(item));
                    }
                    if (data && prepareData?.dataValues?.is_verified == false) {
                        let documentNames = documentDetalis.map(data => data.document_name);
                        let allFieldsPresent = prepareField.every(field => documentNames.includes(field));
                        if (allFieldsPresent) {
                            await models.prepare_compliance_details.update(
                                { document_status: action === "verified" },
                                {
                                    where: {
                                        id: type === "prepare_compliance" ? type_id : extractedPrepareTypeId
                                    }
                                },
                            );
                            await models.prepare_additional_submissions.update(
                                { document_status: action === "verified" },
                                {
                                    where: {
                                        id: type === "prepare_additional" ? type_id : extractedPrepareTypeId
                                    }
                                },
                            )
                            verifiedPrepareIds.add(data.prepare_id);
                        }
                    }
                    const findPrepare = await models.prepare_details.findOne({
                        where: { id: data.prepare_id, user_id: user_id }
                    })
                    const perpareUid = findPrepare.prepare_uid
                    if (findPrepare) {
                        const user = await models.User.findOne({ where: { id: findPrepare.user_id } });
                        const documentDisplayNames = {
                            "fsssai_license_url": "FSSAI License",
                            "iso_certificate_url": "ISO Certificate",
                            "haccp_url": "HACCP",
                            "pest_control_agency_contract_url": "Pest Control Agency Contract",
                            "brc_audit_url": "BRC Audit",
                            "fire_safety_noc_url": "Fire Safety Noc",
                            "pollution_noc_url": "Pollution Noc",
                            "mcd_license_url": "MCD License",
                            "up_cold_storage_license_url": "UP Cold Storage License",
                            "factory_license_url": "Factory License",
                            "panchayat_noc_url": "Panchayat Noc",
                            "no_lien_certificate_url": "No Lien Certificate",
                            "electricity_bill_url": "Latest Electricity Bill",
                        };
                        if (user && user.phone_number) {
                            const verifiedPrepareDoc = documentDetalis.map(detail => detail.document_name)
                            const notificationType = "Perpare Management";
                            if (type === 'prepare_compliance') {
                                await sendDocumentNotification(cUser, user, verifiedPrepareDoc, 'Prepare', 'Compliance', documentDisplayNames, perpareUid, notificationType);
                            } else {
                                await sendDocumentNotification(cUser, user, verifiedPrepareDoc, 'Prepare', 'Additional', documentDisplayNames, perpareUid, notificationType);
                            }

                        } else {
                            console.log('No phone number found for user:', user_id);
                        }
                    }
                    break;
                default:
                    return REST.error(res, 'Invalid detail type', 400);
            }

            if (documentDetalis) {
                for (const docDetail of documentDetalis) {
                    const { document_name } = docDetail;
                    logEntries.push({
                        user_id: user_id,
                        type: type,
                        type_id: type_id,
                        action: action,
                        remarks: remarks,
                        document_name: document_name,
                        updated_by: cUser.id
                    });
                }
            }
        }
        for (const firmid of verifiedFirmIds) {
            const firmStatus = await models.User_firm.findOne({
                where: { id: firmid, is_verified: true }
            });
            await models.User_firm.update(
                {
                    is_verified: !!firmStatus,
                    verified_by: cUser.id,
                    verified_at: new Date()
                },
                { where: { id: firmid, user_id: user_id } }
            );

            const findFrim = await models.User_firm.findOne({
                where: {
                    id: firmid, user_id: user_id
                },
            });
            const firmName = findFrim.firm_name;
            const firmUid = findFrim.firm_uid;
            const findReciverToken = await models.User.findOne({
                where: {
                    id: findFrim.user_id
                }
            });

            const partnerUid = findReciverToken.user_uid;
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `We are pleased to inform you that your firm ${firmName} ${firmUid} has been successfully verified.`);

            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findFrim.user_id,
                title: `Firm Verified`,
                messages: `We are pleased to inform you that your firm ${firmName} ${firmUid} has been successfully verified.`,
                notification_type: "Firm Managament"
            });

            if (cUser.role_id === 4) {
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Verify Assets",
                    title: "Verify Firm",
                    details: `has verified ${firmUid} of ${partnerUid}.`
                });
            }

            const user = await models.User.findOne({ where: { id: findFrim.user_id } });
            if (user && user.phone_number) {
                const fullName = user.full_name;
                const assetName = findFrim.firm_name;
                await sendAssetVerifiedMessagse(user.phone_number, fullName, assetName);
            } else {
                console.log('No phone number found for user:', user_id);
            }

            const previousData = findFrim.dataValues;
            delete req.body.current_user;
            const currentData = findFrim.dataValues;
            const activityLog = {
                user_id: findFrim.user_id,
                activity: 'Firm',
                activity_id: findFrim.id,
                activity_type: 'firm_basics',
                previous_data: previousData,
                current_data: currentData,
                action: "Verified",
                added_by: cUser.id
            };
            await models.user_activity_logs.create(activityLog);
        }

        for (const storeId of verifiedStoreIds) {
            const complianceStatus = await models.store_compliance_details.findOne({
                where: { store_id: storeId, document_status: true },
            });
            const additionalStatus = await models.store_additional_submissions.findOne({
                where: { store_id: storeId, document_status: true },
            });
            await models.stores.update(
                {
                    is_verified: !!(complianceStatus && additionalStatus),
                    status: "verified",
                    verified_by: cUser.id,
                    verified_at: new Date()
                },
                { where: { id: storeId } }
            );
            const findStore = await models.stores.findOne({
                where: { user_id: user_id, id: storeId }
            })
            const findStoreName = findStore.store_name
            const findstroeUid = findStore.store_uid
            const findReciverToken = await models.User.findOne({
                where: {
                    id: findStore.user_id
                }
            })
            const partnerUid = findReciverToken.user_uid
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `We are pleased to inform you that your store ${findStoreName} ${findstroeUid} has been successfully verified.`)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findStore.user_id,
                title: `Store Verified`,
                messages: `We are pleased to inform you that your store ${findStoreName} ${findstroeUid} has been successfully verified.`,
                notification_type: "Store Management"
            });
            if (cUser.role_id === 4) {
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Verify Assets",
                    title: "Verify Store",
                    details: `has verified ${findstroeUid} of ${partnerUid}.`
                });
            }
            if (findStore) {
                const user = await models.User.findOne({ where: { id: findStore.user_id } });
                if (user && user.phone_number) {
                    const fullName = user.full_name;
                    const assetName = findStore.store_name
                    await sendAssetVerifiedMessagse(user.phone_number, fullName, assetName);
                } else {
                    console.log('No phone number found for user:', user_id);
                }
            }
            const previousData = findStore.dataValues;
            delete req.body.current_user;
            const currentData = findStore.dataValues;
            const activityLog = {
                user_id: findStore.user_id,
                activity: 'Store',
                activity_id: findStore.id,
                activity_type: 'store_basics',
                previous_data: previousData,
                current_data: currentData,
                action: "Verified",
                added_by: cUser.id
            };
            await models.user_activity_logs.create(activityLog);
        }
        for (const moveId of verifiedMoveIds) {
            const complianceStatus = await models.move_compliance_details.findOne({
                where: { move_id: moveId, document_status: true }
            });
            await models.move_details.update(
                {
                    is_verified: !!complianceStatus,
                    status: "verified",
                    verified_by: cUser.id,
                    verified_at: new Date()

                },
                { where: { id: moveId } }
            );
            const findMove = await models.move_details.findOne({
                where: { user_id: user_id, id: moveId }
            })
            const findmoveUid = findMove.move_uid
            const findReciverToken = await models.User.findOne({
                where: {
                    id: findMove.user_id
                }
            })
            const partnerUid = findReciverToken.user_uid
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `We are pleased to inform you that your move ${findmoveUid} has been successfully verified.`)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findMove.user_id,
                title: `Move Verified`,
                messages: `We are pleased to inform you that your move ${findmoveUid} has been successfully verified.`,
                notification_type: "Move Management"
            });
            if (cUser.role_id === 4) {
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Verify Assets",
                    title: "Verify Move",
                    details: `has verified ${findmoveUid} of ${partnerUid}.`
                });
            }
            if (findMove) {
                const user = await models.User.findOne({ where: { id: findMove.user_id } });
                if (user && user.phone_number) {
                    const fullName = user.full_name;
                    await sendMoveVerifiedMessage(user.phone_number, fullName);
                } else {
                    console.log('No phone number found for user:', user_id);
                }
            }
            const previousData = findMove.dataValues;
            delete req.body.current_user;
            const currentData = findMove.dataValues;
            const activityLog = {
                user_id: findMove.user_id,
                activity: 'Move',
                activity_id: findMove.id,
                activity_type: 'move_basics',
                previous_data: previousData,
                current_data: currentData,
                action: "Verified",
                added_by: cUser.id
            };
            await models.user_activity_logs.create(activityLog);
        }
        for (const prepareId of verifiedPrepareIds) {
            const complianceStatus = await models.prepare_compliance_details.findOne({
                where: { prepare_id: prepareId, document_status: true }
            });
            const additionalStatus = await models.prepare_additional_submissions.findOne({
                where: { prepare_id: prepareId, document_status: true }
            });
            await models.prepare_details.update(
                {
                    is_verified: !!(complianceStatus && additionalStatus),
                    status: "verified",
                    verified_by: cUser.id,
                    verified_at: new Date()
                },
                { where: { id: prepareId } }
            );
            const findPrepare = await models.prepare_details.findOne({
                where: { user_id: user_id, id: prepareId }
            })
            const findPrepareUid = findPrepare.prepare_uid
            const findReciverToken = await models.User.findOne({
                where: {
                    id: findPrepare.user_id
                }
            })
            const partnerUid = findReciverToken.user_uid
            const partnerAndKeyManager = await support.findPartnerAndKeyManager(findReciverToken.id);
            await support.sendNotificationPartnerAndKeyManager(partnerAndKeyManager, `We are pleased to inform you that your prepare ${findPrepareUid} has been successfully verified.`)
            await models.notification.create({
                sender_id: cUser.id,
                reciver_id: findPrepare.user_id,
                title: `Prepare Verified`,
                messages: `We are pleased to inform you that your prepare ${findPrepareUid} has been successfully verified.`,
                notification_type: "Perpare Management"
            });
            if (cUser.role_id === 4) {
                await models.manager_logs.create({
                    user_id: cUser.id,
                    activity: "Verify Assets",
                    title: "Verify Prepare",
                    details: `has verified ${findPrepareUid} of ${partnerUid}.`
                });
            }
            if (findPrepare) {
                const user = await models.User.findOne({ where: { id: findPrepare.user_id } });
                if (user && user.phone_number) {
                    const fullName = user.full_name;
                    await sendPreparVerifiedMessage(user.phone_number, fullName);
                } else {
                    console.log('No phone number found for user:', user_id);
                }

            }
            const previousData = findPrepare.dataValues;
            delete req.body.current_user;
            const currentData = findPrepare.dataValues;
            const activityLog = {
                user_id: findPrepare.user_id,
                activity: 'Prepare',
                activity_id: findPrepare.id,
                activity_type: 'prepare_basics',
                previous_data: previousData,
                current_data: currentData,
                action: "Verified",
                added_by: cUser.id
            };
            await models.user_activity_logs.create(activityLog);
        }
        const verifydata = await models.document_common_logs.bulkCreate(logEntries);
        return REST.success(res, verifydata, 'Admin verification successful');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.get('/getVerificationLogs', async function (req, res) {
    try {
        const type = req.query.type
        let data;
        if (type === "firm") {
            data = await models.document_common_logs.findAll({
                where: { type: 'firm' },
                attributes: ["id", "user_id", "type", "type_id", "action", "remarks", "document_name", "updated_by", "createdAt", "updatedAt"],
                include: [
                    {
                        model: models.User,
                        as: "updatedby",
                        attributes: ["id", "full_name"]
                    }
                ],
                order: [['created_at', 'DESC']],
            });
            data.forEach(firm => {
                if (firm.dataValues.updatedby) {
                    firm.dataValues.updatedby.dataValues.updated_at = firm.dataValues.updatedAt
                }
            })
        } else if (type === 'store') {
            data = await models.document_common_logs.findAll({
                where: { type: 'store' },
                order: [['created_at', 'DESC']],
            });
        } else if (type === 'store_compliance') {
            data = await models.document_common_logs.findAll({
                where: { type: 'store_compliance' },
                attributes: ["id", "user_id", "type", "type_id", "action", "remarks", "document_name", "updated_by", "createdAt", "updatedAt"],
                include: [
                    {
                        model: models.User,
                        as: "updatedby",
                        attributes: ["id", "full_name"]
                    }
                ],
                order: [['created_at', 'DESC']],
            });
            data.forEach(storeCompliance => {
                if (storeCompliance.dataValues.updatedby) {
                    storeCompliance.dataValues.updatedby.dataValues.updated_at = storeCompliance.dataValues.updatedAt
                }
            })
        } else if (type === 'store_additional') {
            data = await models.document_common_logs.findAll({
                where: { type: 'store_additional' },
                attributes: ["id", "user_id", "type", "type_id", "action", "remarks", "document_name", "updated_by", "createdAt", "updatedAt"],
                include: [
                    {
                        model: models.User,
                        as: "updatedby",
                        attributes: ["id", "full_name"]
                    }
                ],
                order: [['created_at', 'DESC']],
            });
            data.forEach(storeAdditional => {
                if (storeAdditional.dataValues.updatedby) {
                    storeAdditional.dataValues.updatedby.dataValues.updated_at = storeAdditional.dataValues.updatedAt
                }
            })
        } else if (type === 'move') {
            data = await models.document_common_logs.findAll({
                where: { type: 'move' },
                order: [['created_at', 'DESC']],
            });
        } else if (type === 'move_compliance') {
            data = await models.document_common_logs.findAll({
                where: { type: 'move_compliance' },
                attributes: ["id", "user_id", "type", "type_id", "action", "remarks", "document_name", "updated_by", "createdAt", "updatedAt"],
                include: [
                    {
                        model: models.User,
                        as: "updatedby",
                        attributes: ["id", "full_name"]
                    }
                ],
                order: [['created_at', 'DESC']],
            });
            data.forEach(moveCompliance => {
                if (moveCompliance.dataValues.updatedby) {
                    moveCompliance.dataValues.updatedby.dataValues.updated_at = moveCompliance.dataValues.updatedAt
                }
            })
        } else if (type === 'prepare') {
            data = await models.document_common_logs.findAll({
                where: { type: 'prepare' },
                order: [['created_at', 'DESC']],
            });
        } else if (type === 'prepare_compliance') {
            data = await models.document_common_logs.findAll({
                where: { type: 'prepare_compliance' },
                attributes: ["id", "user_id", "type", "type_id", "action", "remarks", "document_name", "updated_by", "createdAt", "updatedAt"],
                include: [
                    {
                        model: models.User,
                        as: "updatedby",
                        attributes: ["id", "full_name"]
                    }
                ],
                order: [['created_at', 'DESC']],
            });
            data.forEach(prepareCompliance => {
                if (prepareCompliance.dataValues.updatedby) {
                    prepareCompliance.dataValues.updatedby.dataValues.updated_at = prepareCompliance.dataValues.updatedAt
                }
            })
        } else if (type === 'prepare_additional') {
            data = await models.document_common_logs.findAll({
                where: { type: 'prepare_additional' },
                attributes: ["id", "user_id", "type", "type_id", "action", "remarks", "document_name", "updated_by", "createdAt", "updatedAt"],
                include: [
                    {
                        model: models.User,
                        as: "updatedby",
                        attributes: ["id", "full_name"]
                    }
                ],
                order: [['created_at', 'DESC']],
            });
            data.forEach(prepareAdditional => {
                if (prepareAdditional.dataValues.updatedby) {
                    prepareAdditional.dataValues.updatedby.dataValues.updated_at = prepareAdditional.dataValues.updatedAt
                }
            })
        } else {
            return REST.error(res, 'Invalid type', 400);
        }
        return REST.success(res, data, 'Get verification logs successful');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.get('/getStoreDetails/:store_uid', async function (req, res) {
    try {
        const findStore = await models.stores.findOne({
            where: { store_uid: req.params.store_uid }
        });

        if (!findStore) {
            return REST.error(res, 'Store not found', 404);
        }
        return REST.success(res, findStore, 'Get store successful');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});

router.post('/individualFirmVerified', async function (req, res) {
    const cUser = req.body.current_user;
    const { user_id, details } = req.body;
    try {
        const verifiedFirmIds = new Set()
        const firmDoc = [
            "pan_document",
            "profile",
            "aadhar_front",
            "aadhar_back",
            "driving_licence_front",
            "driving_licence_back",
            "cancelled_cheque",
            "tds_certificate",
            "msme_certificate",
            "gst_certificate",
            "visiting_card",
            "registration_certificate"
        ]
        for (let detail of details) {

        }

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})


module.exports = router
