const express = require('express');
const crypto = require('crypto');
const razorpay = require('../../../config/razorpay');
const models = require('../../../models');
const REST = require('../../../utils/REST');
const { make } = require('simple-body-validator');
const { Op } = require('sequelize');
const router = express.Router();

// Create Razorpay order
router.post('/create-order', async (req, res) => {
    const cUser = req.body.current_user;
    try {
        const { amount, currency = 'INR', receipt, notes } = req.body;
        const rules = {
            amount: 'required|numeric|min:1',
            currency: 'string',
            receipt: 'required|string',
            notes: 'object'
        };
        const validator = make(req.body, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const options = {
            amount: Math.round(Number(amount) * 100),
            currency: currency,
            receipt: receipt,
            notes: notes || {}
        };
        const order = await razorpay.orders.create(options);
        await models.sequelize.transaction(async (transaction) => {
            await models.Payment.create({
                order_id: order.id,
                amount: Number(amount),
                currency: currency,
                receipt: receipt,
                status: 'created',
                user_id: cUser?.id,
                notes: JSON.stringify(notes || {})
            }, { transaction });
        });
                console.log("log3")

        return REST.success(res, {
            order_id: order.id,
            amount: order.amount,
            currency: order.currency,
            receipt: order.receipt,
            status: order.status
        }, 'Order created successfully');

    } catch (error) {
        return REST.error(res, error.message || 'Failed to create order', 500);
    }
});

router.post('/verify-payment', async (req, res) => {
    try {
        const { order_id, payment_id, signature } = req.body;
        const rules = {
            order_id: 'required|string',
            payment_id: 'required|string',
            signature: 'required|string'
        };
        const validator = make(req.body, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }
        const body = order_id + "|" + payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature !== signature) {
            return REST.error(res, 'Invalid signature', 400);
        }

        await models.sequelize.transaction(async (transaction) => {
            const payment = await models.Payment.findOne({ where: { order_id }, transaction, lock: transaction.LOCK.UPDATE });
            if (!payment) {
                throw new Error('Order not found');
            }
            await payment.update({
                payment_id: payment_id,
                status: 'captured',
                signature: signature,
                paid_at: new Date()
            }, { transaction });
        });

        return REST.success(res, {
            payment_id: payment_id,
            order_id: order_id,
            status: 'success'
        }, 'Payment verified successfully');

    } catch (error) {
        return REST.error(res, error.message || 'Failed to verify payment', 500);
    }
});

// Get payment details
router.get('/payment/:order_id', async (req, res) => {
    try {
        const { order_id } = req.params;

        const payment = await models.Payment.findOne({
            where: { order_id },
            include: [{
                model: models.User,
                attributes: ['id', 'full_name', 'email']
            }]
        });

        if (!payment) {
            return REST.error(res, 'Payment not found', 404);
        }

        return REST.success(res, payment, 'Payment details retrieved');
    } catch (error) {
        console.error('Error fetching payment:', error);
        return REST.error(res, error.message || 'Failed to fetch payment', 500);
    }
});

// Get user payments
router.get('/my-payments', async (req, res) => {
    try {
        const userId = req.body.current_user?.id;

        const payments = await models.Payment.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']]
        });

        return REST.success(res, payments, 'Payments retrieved successfully');

    } catch (error) {
        console.error('Error fetching payments:', error);
        return REST.error(res, error.message || 'Failed to fetch payments', 500);
    }
});

// Refund payment
router.post('/refund', async (req, res) => {
    try {
        const { payment_id, amount, notes } = req.body;
        const rules = {
            payment_id: 'required|string',
            amount: 'numeric|min:1',
            notes: 'string'
        };
        const validator = make(req.body, rules);
        if (!validator.validate()) {
            return REST.error(res, validator.errors().all(), 422);
        }

        const refundOptions = {
            payment_id: payment_id,
            amount: amount ? Math.round(Number(amount) * 100) : undefined,
            notes: notes || {}
        };

        const refund = await razorpay.payments.refund(payment_id, refundOptions);

        await models.sequelize.transaction(async (transaction) => {
            const payment = await models.Payment.findOne({ where: { payment_id }, transaction, lock: transaction.LOCK.UPDATE });
            if (payment) {
                await payment.update({
                    status: 'refunded',
                    refund_id: refund.id,
                    refunded_at: new Date()
                }, { transaction });
            }
        });

        return REST.success(res, {
            refund_id: refund.id,
            amount: refund.amount,
            status: refund.status
        }, 'Refund processed successfully');

    } catch (error) {
        return REST.error(res, error.message || 'Failed to process refund', 500);
    }
});

// Transactions listing with filters and pagination
router.get('/transactions', async (req, res) => {
    try {
        const userId = req.body.current_user?.id;
        const { page = 1, limit = 20, status, from, to, receipt } = req.query;
        const where = { user_id: userId };
        if (status) where.status = status;
        if (receipt) where.receipt = receipt;
        if (from || to) {
            where.created_at = {};
            if (from) where.created_at[Op.gte] = new Date(from);
            if (to) where.created_at[Op.lte] = new Date(to);
        }
        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await models.Payment.findAndCountAll({
            where,
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset
        });
        return REST.success(res, { items: rows, total: count, page: Number(page), pageSize: Number(limit) }, 'Transactions fetched');
    } catch (error) {
        return REST.error(res, error.message || 'Failed to fetch transactions', 500);
    }
});

module.exports = router;
