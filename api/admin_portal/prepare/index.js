const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();


/*
|----------------------------------------------------------------------------------------------------------------
|              Prepare Details Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createPrepare', async function (req, res) {
    const cUser = req.body.current_user
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        });
        if (cUser.role_id == 3) {
            const validator = make(req.body, {
                user_id: "required",
                firm_id: "required",
                request_id: "integer",
                state: "required|string",
                city: "required|string",
                address: "required|string",
                total_hourly_throughput: "required|string",
                type_of_prepare: "required|string",
                product_category: "required|array",
                product_type: "required|array",
                number_of_docks: "required|integer",
                temperature_min: "required|string",
                temperature_max: "required|string",
                batch_size: "required|string",
                throughput: "required|string",
                avg_case_size: "required|string",
                area: "required|string",
            });

            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }

            const latestPrepare = await models.prepare_details.findOne({
                order: [['created_at', 'DESC']]
            });
            let serialNumber = 1;
            if (latestPrepare) {
                serialNumber = parseInt(latestPrepare.prepare_uid.slice(3)) + 1;
            }
            const prepareId = `PRE${serialNumber.toString().padStart(6, '0')}`;
            await models.sequelize.transaction(async (transaction) => {
                const data = await models.prepare_details.create({
                    user_id: req.body.user_id,
                    firm_id: req.body.firm_id,
                    prepare_uid: prepareId,
                    state: req.body.state,
                    city: req.body.city,
                    address: req.body.address,
                    total_hourly_throughput: req.body.total_hourly_throughput,
                    type_of_prepare: req.body.type_of_prepare,
                    product_category: JSON.stringify(req.body.product_category),
                    product_type: JSON.stringify(req.body.product_type),
                    throughput: req.body.throughput,
                    avg_case_size: req.body.avg_case_size,
                    number_of_docks: req.body.number_of_docks,
                    temperature_min: req.body.temperature_min,
                    temperature_max: req.body.temperature_max,
                    batch_size: req.body.batch_size,
                    area: req.body.area,
                    latitude: req.body.latitude,
                    longitude: req.body.longitude,
                    status: constants.PREPARE_DETAILS.STATUSES.VERIFIED,
                    updated_by: req.body.updated_by,
                    added_by: cUser.id

                },
                    { transaction: transaction }
                )
                await models.user_activity_logs.create({
                    user_id: req.body.user_id,
                    activity: 'Prepare',
                    activity_id: data.id,
                    activity_type: "prepare_basics",
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id
                });
                return data;
            });
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, null, 'Prepare created successfully');

        } else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                user_id: "required",
                firm_id: "required",
                state: "required|string",
                city: "required|string",
                address: "required|string",
                total_hourly_throughput: "required|string",
                type_of_prepare: "required|string",
                product_category: "required|array",
                product_type: "required|array",
                number_of_docks: "required|integer",
                temperature_min: "required|string",
                temperature_max: "required|string",
                batch_size: "required|string",
                throughput: "required|string",
                avg_case_size: "required|string",
                area: "required|string",
            });

            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }

            const latestPrepare = await models.prepare_details.findOne({
                order: [['created_at', 'DESC']]
            });
            let serialNumber = 1;
            if (latestPrepare) {
                serialNumber = parseInt(latestPrepare.prepare_uid.slice(3)) + 1;
            }
            const prepareId = `PRE${serialNumber.toString().padStart(6, '0')}`;
            await models.sequelize.transaction(async (transaction) => {
                const data = await models.prepare_details.create({
                    user_id: req.body.user_id,
                    firm_id: req.body.firm_id,
                    prepare_uid: prepareId,
                    state: req.body.state,
                    city: req.body.city,
                    address: req.body.address,
                    total_hourly_throughput: req.body.total_hourly_throughput,
                    type_of_prepare: req.body.type_of_prepare,
                    product_category: JSON.stringify(req.body.product_category),
                    product_type: JSON.stringify(req.body.product_type),
                    throughput: req.body.throughput,
                    avg_case_size: req.body.avg_case_size,
                    number_of_docks: req.body.number_of_docks,
                    temperature_min: req.body.temperature_min,
                    temperature_max: req.body.temperature_max,
                    batch_size: req.body.batch_size,
                    area: req.body.area,
                    latitude: req.body.latitude,
                    longitude: req.body.longitude,
                    status: constants.PREPARE_DETAILS.STATUSES.VERIFIED,
                    updated_by: req.body.updated_by,
                    added_by: cUser.id

                },
                    { transaction: transaction }
                )
                await models.user_activity_logs.create({
                    user_id: req.body.user_id,
                    activity: 'Prepare',
                    activity_id: data.id,
                    activity_type: "prepare_basics",
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id
                });
                return data;
            });
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, null, 'Prepare created successfully');

        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                user_id: "required",
                firm_id: "required",
                request_id: "integer",
                state: "required|string",
                city: "required|string",
                address: "required|string",
                total_hourly_throughput: "required|string",
                type_of_prepare: "required|string",
                product_category: "required|array",
                product_type: "required|array",
                number_of_docks: "required|integer",
                temperature_min: "required|string",
                temperature_max: "required|string",
                batch_size: "required|string",
                throughput: "required|string",
                avg_case_size: "required|string",
                area: "required|string",
                request_id: "required|integer"
            });

            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }

            const latestPrepare = await models.prepare_details.findOne({
                order: [['created_at', 'DESC']]
            });
            let serialNumber = 1;
            if (latestPrepare) {
                serialNumber = parseInt(latestPrepare.prepare_uid.slice(3)) + 1;
            }
            const prepareId = `PRE${serialNumber.toString().padStart(6, '0')}`;
            await models.sequelize.transaction(async (transaction) => {
                const data = await models.prepare_details.create({
                    user_id: req.body.user_id,
                    firm_id: req.body.firm_id,
                    prepare_uid: prepareId,
                    state: req.body.state,
                    city: req.body.city,
                    address: req.body.address,
                    total_hourly_throughput: req.body.total_hourly_throughput,
                    type_of_prepare: req.body.type_of_prepare,
                    product_category: JSON.stringify(req.body.product_category),
                    product_type: JSON.stringify(req.body.product_type),
                    throughput: req.body.throughput,
                    avg_case_size: req.body.avg_case_size,
                    number_of_docks: req.body.number_of_docks,
                    temperature_min: req.body.temperature_min,
                    temperature_max: req.body.temperature_max,
                    batch_size: req.body.batch_size,
                    area: req.body.area,
                    latitude: req.body.latitude,
                    longitude: req.body.longitude,
                    status: constants.PREPARE_DETAILS.STATUSES.VERIFIED,
                    updated_by: req.body.updated_by,
                    added_by: cUser.id

                },
                    { transaction: transaction }
                )
                await models.user_activity_logs.create({
                    user_id: req.body.user_id,
                    activity: 'Prepare',
                    activity_id: data.id,
                    activity_type: "prepare_basics",
                    current_data: data,
                    action: "Added",
                    added_by: cUser.id
                });
                return data;
            });
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id ?? null,
                }
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, null, 'Prepare created successfully');

        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
router.put('/updatePrepare/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        });
        if (cUser.role_id == 3 || req.body.request_id) {

            var findPrepare
            findPrepare = await models.prepare_details.findOne({ where: { id: req.params.id } });
            if (!findPrepare) {
                return REST.error(res, 'Prepare Uid Not Exist', 404);
            }

            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_details.update({
                    updated_by: cUser.id,
                    state: req.body.state,
                    city: req.body.city,
                    address: req.body.address,
                    total_hourly_throughput: req.body.total_hourly_throughput,
                    type_of_prepare: req.body.type_of_prepare,
                    product_category: JSON.stringify(req.body.product_category),
                    product_type: JSON.stringify(req.body.product_type),
                    throughput: req.body.throughput,
                    avg_case_size: req.body.avg_case_size,
                    number_of_docks: req.body.number_of_docks,
                    temperature: req.body.temperature,
                    batch_size: req.body.batch_size,
                    area: req.body.area,
                    latitude: req.body.latitude,
                    longitude: req.body.longitude,
                    status: constants.PREPARE_DETAILS.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, {
                    where: { id: findPrepare.id },
                    transaction: transaction
                }
                );
            })
            await models.sequelize.transaction(async (transaction) => {
                const movedetails = await models.prepare_details.findOne({ where: { id: findPrepare.id } });
                const previousData = findPrepare.dataValues;
                delete req.body.current_user;
                const currentData = movedetails.dataValues;
                const activityLog = {
                    user_id: findPrepare.user_id,
                    activity: `Prepare`,
                    activity_id: findPrepare.id,
                    activity_type: "prepare_basics",
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
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, null, 'Update prepare success.');

        }else if (findPermission.length > 0 && (cUser.role_id == 4 || req.body.request_id)){

            var findPrepare
            findPrepare = await models.prepare_details.findOne({ where: { id: req.params.id } });
            if (!findPrepare) {
                return REST.error(res, 'Prepare Uid Not Exist', 404);
            }

            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_details.update({
                    updated_by: cUser.id,
                    state: req.body.state,
                    city: req.body.city,
                    address: req.body.address,
                    total_hourly_throughput: req.body.total_hourly_throughput,
                    type_of_prepare: req.body.type_of_prepare,
                    product_category: JSON.stringify(req.body.product_category),
                    product_type: JSON.stringify(req.body.product_type),
                    throughput: req.body.throughput,
                    avg_case_size: req.body.avg_case_size,
                    number_of_docks: req.body.number_of_docks,
                    temperature: req.body.temperature,
                    batch_size: req.body.batch_size,
                    area: req.body.area,
                    latitude: req.body.latitude,
                    longitude: req.body.longitude,
                    status: constants.PREPARE_DETAILS.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, {
                    where: { id: findPrepare.id },
                    transaction: transaction
                }
                );
            })
            await models.sequelize.transaction(async (transaction) => {
                const movedetails = await models.prepare_details.findOne({ where: { id: findPrepare.id } });
                const previousData = findPrepare.dataValues;
                delete req.body.current_user;
                const currentData = movedetails.dataValues;
                const activityLog = {
                    user_id: findPrepare.user_id,
                    activity: `Prepare`,
                    activity_id: findPrepare.id,
                    activity_type: "prepare_basics",
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
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, null, 'Update prepare success.');

        }else{
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            var findPrepare
            findPrepare = await models.prepare_details.findOne({ where: { id: req.params.id } });
            if (!findPrepare) {
                return REST.error(res, 'Prepare Uid Not Exist', 404);
            }

            await models.sequelize.transaction(async (transaction) => {
                await models.prepare_details.update({
                    updated_by: cUser.id,
                    state: req.body.state,
                    city: req.body.city,
                    address: req.body.address,
                    total_hourly_throughput: req.body.total_hourly_throughput,
                    type_of_prepare: req.body.type_of_prepare,
                    product_category: JSON.stringify(req.body.product_category),
                    product_type: JSON.stringify(req.body.product_type),
                    throughput: req.body.throughput,
                    avg_case_size: req.body.avg_case_size,
                    number_of_docks: req.body.number_of_docks,
                    temperature: req.body.temperature,
                    batch_size: req.body.batch_size,
                    area: req.body.area,
                    latitude: req.body.latitude,
                    longitude: req.body.longitude,
                    status: constants.PREPARE_DETAILS.STATUSES.VERIFIED,
                    updated_by: cUser.id
                }, {
                    where: { id: findPrepare.id },
                    transaction: transaction
                }
                );
            })
            await models.sequelize.transaction(async (transaction) => {
                const movedetails = await models.prepare_details.findOne({ where: { id: findPrepare.id } });
                const previousData = findPrepare.dataValues;
                delete req.body.current_user;
                const currentData = movedetails.dataValues;
                const activityLog = {
                    user_id: findPrepare.user_id,
                    activity: `Prepare`,
                    activity_id: findPrepare.id,
                    activity_type: "prepare_basics",
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
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED
                },
                    {
                        where: {
                            id: req.body.request_id ?? null,
                        }
                    })
            }
            return REST.success(res, null, 'Update prepare success.');

        }
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
});
module.exports = router