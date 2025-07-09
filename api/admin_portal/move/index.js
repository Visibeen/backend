const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const express = require("express");
const models = require('../../../models');
const REST = require("../../../utils/REST");
const router = express.Router();


/*
|----------------------------------------------------------------------------------------------------------------
|              Moves Apis
|----------------------------------------------------------------------------------------------------------------
*/
router.post('/createMove', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        });
        if (cUser.role_id == 3 || req.body.request_id) {
            const validator = make(req.body, {
                user_id: "required",
                firm_id: "required",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const latestmove = await models.move_details.findOne({
                order: [['created_at', 'DESC']]
            });
            let serialNumber = 1;
            if (latestmove) {
                serialNumber = parseInt(latestmove.move_uid.slice(3)) + 1;
            }
            const moveId = `MOV${serialNumber.toString().padStart(6, '0')}`;
            const moves = await models.sequelize.transaction(async (transaction) => {
                const data = await models.move_details.create({
                    user_id: req.body.user_id,
                    firm_id: req.body.firm_id,
                    move_uid: moveId,
                    state: req.body.state,
                    city: req.body.city,
                    make: req.body.make,
                    model: req.body.model,
                    vehicle_number: req.body.vehicle_number,
                    mfg_month_year: req.body.mfg_month_year,
                    move_class: req.body.move_class,
                    emission_norms: req.body.emission_norms,
                    actual_payload: req.body.actual_payload,
                    crate_capacity: req.body.crate_capacity,
                    length: req.body.length,
                    width: req.body.width,
                    height: req.body.height,
                    gv_weight: req.body.gv_weight,
                    unladen_weight_rc: req.body.unladen_weight_rc,
                    engine_no: req.body.engine_no,
                    side_door: req.body.side_door,
                    hatch_window: req.body.hatch_window,
                    dual_temperature: req.body.dual_temperature,
                    rc_image_url: req.body.rc_image_url,
                    chassis_no: req.body.chassis_no,
                    rc_no: req.body.rc_no,
                    status: constants.MOVE_DETAILS.STATUSES.PENDING,
                    last_updated_by: req.body.last_updated_by,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                )
                const currentData = req.body;
                await models.user_activity_logs.create({
                    user_id: req.body.user_id,
                    activity: 'Move',
                    activity_id: data.id,
                    activity_type: "move_basics",
                    current_data: currentData,
                    action: "Added",
                    added_by: cUser.id
                })
                return data;
            })
            const findrequest = await models.request_for_store.findOne({
                where: {
                    id: req.body.request_id,
                }
            })
            if (findrequest) {
                await models.request_for_store.update({
                    status: constants.REQUEST_FOR_STORE.STATUSES.VERIFIED,
                    updated_by: cUser.id
                },
                    {
                        where: {
                            id: req.body.request_id,
                        }
                    })

                return REST.success(res, moves, 'Moves  Create Successfully');
            }
        } else if (findPermission > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            const validator = make(req.body, {
                user_id: "required",
                firm_id: "required",

            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const latestmove = await models.move_details.findOne({
                order: [['created_at', 'DESC']]
            });
            let serialNumber = 1;
            if (latestmove) {
                serialNumber = parseInt(latestmove.move_uid.slice(3)) + 1;
            }
            const moveId = `MOV${serialNumber.toString().padStart(6, '0')}`;
            const moves = await models.sequelize.transaction(async (transaction) => {
                const data = await models.move_details.create({
                    user_id: req.body.user_id,
                    firm_id: req.body.firm_id,
                    move_uid: moveId,
                    state: req.body.state,
                    city: req.body.city,
                    make: req.body.make,
                    model: req.body.model,
                    vehicle_number: req.body.vehicle_number,
                    mfg_month_year: req.body.mfg_month_year,
                    move_class: req.body.move_class,
                    emission_norms: req.body.emission_norms,
                    actual_payload: req.body.actual_payload,
                    crate_capacity: req.body.crate_capacity,
                    length: req.body.length,
                    width: req.body.width,
                    height: req.body.height,
                    gv_weight: req.body.gv_weight,
                    unladen_weight_rc: req.body.unladen_weight_rc,
                    engine_no: req.body.engine_no,
                    side_door: req.body.side_door,
                    hatch_window: req.body.hatch_window,
                    dual_temperature: req.body.dual_temperature,
                    rc_image_url: req.body.rc_image_url,
                    chassis_no: req.body.chassis_no,
                    rc_no: req.body.rc_no,
                    status: constants.MOVE_DETAILS.STATUSES.PENDING,
                    last_updated_by: req.body.last_updated_by,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                )
                const currentData = req.body;
                await models.user_activity_logs.create({
                    user_id: req.body.user_id,
                    activity: 'Move',
                    activity_id: data.id,
                    activity_type: "move_basics",
                    current_data: currentData,
                    action: "Added",
                    added_by: cUser.id
                })
                return data;
            })
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

                return REST.success(res, moves, 'Moves  Create Successfully');
            }
        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            const validator = make(req.body, {
                user_id: "required",
                firm_id: "required",
                request_id: "integer",
            });
            if (!validator.validate()) {
                return REST.error(res, validator.errors().all(), 422);
            }
            const latestmove = await models.move_details.findOne({
                order: [['created_at', 'DESC']]
            });
            let serialNumber = 1;
            if (latestmove) {
                serialNumber = parseInt(latestmove.move_uid.slice(3)) + 1;
            }
            const moveId = `MOV${serialNumber.toString().padStart(6, '0')}`;
            const moves = await models.sequelize.transaction(async (transaction) => {
                const data = await models.move_details.create({
                    user_id: req.body.user_id,
                    firm_id: req.body.firm_id,
                    move_uid: moveId,
                    state: req.body.state,
                    city: req.body.city,
                    make: req.body.make,
                    model: req.body.model,
                    vehicle_number: req.body.vehicle_number,
                    mfg_month_year: req.body.mfg_month_year,
                    move_class: req.body.move_class,
                    emission_norms: req.body.emission_norms,
                    actual_payload: req.body.actual_payload,
                    crate_capacity: req.body.crate_capacity,
                    length: req.body.length,
                    width: req.body.width,
                    height: req.body.height,
                    gv_weight: req.body.gv_weight,
                    unladen_weight_rc: req.body.unladen_weight_rc,
                    engine_no: req.body.engine_no,
                    side_door: req.body.side_door,
                    hatch_window: req.body.hatch_window,
                    dual_temperature: req.body.dual_temperature,
                    rc_image_url: req.body.rc_image_url,
                    chassis_no: req.body.chassis_no,
                    rc_no: req.body.rc_no,
                    status: constants.MOVE_DETAILS.STATUSES.PENDING,
                    last_updated_by: req.body.last_updated_by,
                    added_by: cUser.id
                },
                    {
                        transaction: transaction
                    }
                )
                const currentData = req.body;
                await models.user_activity_logs.create({
                    user_id: req.body.user_id,
                    activity: 'Move',
                    activity_id: data.id,
                    activity_type: "move_basics",
                    current_data: currentData,
                    action: "Added",
                    added_by: cUser.id
                })
                return data;
            })
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

                return REST.success(res, moves, 'Moves  Create Successfully');
            }
        }

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/updateMove/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findPermission = await models.user_permission.findAll({
            where: {
                user_id: cUser.id,
                is_permission: true
            }
        })
        if (cUser.role_id == 3 || req.body.request_id) {
            var findMoves;
            findMoves = await models.move_details.findOne({ where: { id: req.params.id } })
            if (findMoves == null) {
                return REST.error(res, 'Moves Id not found', 404)
            }
            await models.sequelize.transaction(async (transaction) => {
                await models.move_details.update({
                    state: req.body.state,
                    city: req.body.city,
                    make: req.body.make,
                    model: req.body.model,
                    vehicle_number: req.body.vehicle_number,
                    mfg_month_year: req.body.mfg_month_year,
                    move_class: req.body.move_class,
                    emission_norms: req.body.emission_norms,
                    actual_payload: req.body.actual_payload,
                    crate_capacity: req.body.crate_capacity,
                    length: req.body.length,
                    width: req.body.width,
                    height: req.body.height,
                    gv_weight: req.body.gv_weight,
                    unladen_weight_rc: req.body.unladen_weight_rc,
                    engine_no: req.body.engine_no,
                    side_door: req.body.side_door,
                    hatch_window: req.body.hatch_window,
                    dual_temperature: req.body.dual_temperature,
                    rc_image_url: req.body.rc_image_url,
                    chassis_no: req.body.chassis_no,
                    rc_no: req.body.rc_no,
                    status: constants.MOVE_DETAILS.STATUSES.VERIFIED,
                    last_updated_by: cUser.id
                },
                    {
                        where: { id: findMoves.id },
                        transaction: transaction
                    }
                )
            })
            await models.sequelize.transaction(async (transaction) => {
                const findMoveDetails = await models.move_details.findOne({ where: { id: req.params.id } })
                const previousData = findMoves.dataValues;
                delete req.body.current_user;
                const currentData = findMoveDetails.dataValues;
                const activityLog = {
                    user_id: findMoves.user_id,
                    activity: `Move`,
                    activity_id: findMoves.id,
                    activity_type: "move_basics",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            })
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
            return REST.success(res, null, 'Moves Updated Successfully');

        } else if (findPermission > 0 && (cUser.role_id == 4 || req.body.request_id)) {
            var findMoves;
            findMoves = await models.move_details.findOne({ where: { id: req.params.id } })
            if (findMoves == null) {
                return REST.error(res, 'Moves Id not found', 404)
            }
            await models.sequelize.transaction(async (transaction) => {
                await models.move_details.update({
                    state: req.body.state,
                    city: req.body.city,
                    make: req.body.make,
                    model: req.body.model,
                    vehicle_number: req.body.vehicle_number,
                    mfg_month_year: req.body.mfg_month_year,
                    move_class: req.body.move_class,
                    emission_norms: req.body.emission_norms,
                    actual_payload: req.body.actual_payload,
                    crate_capacity: req.body.crate_capacity,
                    length: req.body.length,
                    width: req.body.width,
                    height: req.body.height,
                    gv_weight: req.body.gv_weight,
                    unladen_weight_rc: req.body.unladen_weight_rc,
                    engine_no: req.body.engine_no,
                    side_door: req.body.side_door,
                    hatch_window: req.body.hatch_window,
                    dual_temperature: req.body.dual_temperature,
                    rc_image_url: req.body.rc_image_url,
                    chassis_no: req.body.chassis_no,
                    rc_no: req.body.rc_no,
                    status: constants.MOVE_DETAILS.STATUSES.VERIFIED,
                    last_updated_by: cUser.id
                },
                    {
                        where: { id: findMoves.id },
                        transaction: transaction
                    }
                )
            })
            await models.sequelize.transaction(async (transaction) => {
                const findMoveDetails = await models.move_details.findOne({ where: { id: req.params.id } })
                const previousData = findMoves.dataValues;
                delete req.body.current_user;
                const currentData = findMoveDetails.dataValues;
                const activityLog = {
                    user_id: findMoves.user_id,
                    activity: `Move`,
                    activity_id: findMoves.id,
                    activity_type: "move_basics",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            })
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
            return REST.success(res, null, 'Moves Updated Successfully');

        } else {
            if (!req.body.request_id) return REST.error(res, 'Request id is required', 500);
            var findMoves;
            findMoves = await models.move_details.findOne({ where: { id: req.params.id } })
            if (findMoves == null) {
                return REST.error(res, 'Moves Id not found', 404)
            }
            await models.sequelize.transaction(async (transaction) => {
                await models.move_details.update({
                    state: req.body.state,
                    city: req.body.city,
                    make: req.body.make,
                    model: req.body.model,
                    vehicle_number: req.body.vehicle_number,
                    mfg_month_year: req.body.mfg_month_year,
                    move_class: req.body.move_class,
                    emission_norms: req.body.emission_norms,
                    actual_payload: req.body.actual_payload,
                    crate_capacity: req.body.crate_capacity,
                    length: req.body.length,
                    width: req.body.width,
                    height: req.body.height,
                    gv_weight: req.body.gv_weight,
                    unladen_weight_rc: req.body.unladen_weight_rc,
                    engine_no: req.body.engine_no,
                    side_door: req.body.side_door,
                    hatch_window: req.body.hatch_window,
                    dual_temperature: req.body.dual_temperature,
                    rc_image_url: req.body.rc_image_url,
                    chassis_no: req.body.chassis_no,
                    rc_no: req.body.rc_no,
                    status: constants.MOVE_DETAILS.STATUSES.VERIFIED,
                    last_updated_by: cUser.id
                },
                    {
                        where: { id: findMoves.id },
                        transaction: transaction
                    }
                )
            })
            await models.sequelize.transaction(async (transaction) => {
                const findMoveDetails = await models.move_details.findOne({ where: { id: req.params.id } })
                const previousData = findMoves.dataValues;
                delete req.body.current_user;
                const currentData = findMoveDetails.dataValues;
                const activityLog = {
                    user_id: findMoves.user_id,
                    activity: `Move`,
                    activity_id: findMoves.id,
                    activity_type: "move_basics",
                    previous_data: previousData,
                    current_data: currentData,
                    updated_by: cUser.id,
                    action: "Updated"
                };
                await models.user_activity_logs.create(activityLog, { transaction: transaction });
            })
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
            return REST.success(res, null, 'Moves Updated Successfully');

        }

    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
router.put('/updateMoveDoc/:id', async function (req, res) {
    const cUser = req.body.current_user;
    try {
        const findMove = await models.move_details.findOne({
            where: {
                id: req.params.id
            }
        })
        if (!findMove) {
            return REST.error(res, 'Moves Id not found', 404)

        }
        const data = req.body
        await models.sequelize.transaction(async (transaction) => {
            await models.move_details.update({
                rc_image_url: data.rc_image_url,
                last_updated_by: cUser.id
            },
                {
                    where: {
                        id: req.params.id
                    }
                })
        })
        const findNeWMove = await models.move_details.findOne({
            where: {
                id: req.params.id
            }
        })
        const previousData = findMove.dataValues
        const currentData = req.body
        delete req.body.current_user
        const activityLog = {
            user_id: findMove.user_id,
            activity: `Move`,
            activity_id: findMove.id,
            activity_type: "move_basic",
            previous_data: previousData,
            current_data: currentData,
            updated_by: cUser.id,
            action: "Updated"
        };
        await models.user_activity_logs.create(activityLog);
        return REST.success(res, findNeWMove, 'Moves Updated Successfully');
    } catch (error) {
        return REST.error(res, error.message, 500);
    }
})
module.exports = router