"use strict";
// src/billing/subscriptionRoutes.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionRouter = void 0;
const express_1 = require("express");
const subscriptionService_1 = require("./subscriptionService");
exports.subscriptionRouter = (0, express_1.Router)();
exports.subscriptionRouter.post('/subscriptions', async (req, res, next) => {
    try {
        const tenantContext = req.tenantContext;
        if (!tenantContext || !tenantContext.sub) {
            return res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'Missing or invalid TenantContext',
            });
        }
        const tenantId = tenantContext.sub;
        const { serviceType, driverId, quantity, startsAt } = req.body ?? {};
        if (!serviceType || typeof serviceType !== 'string') {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'serviceType is required and must be a string',
            });
        }
        const qtyNumber = Number(quantity);
        if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
            return res.status(400).json({
                error: 'VALIDATION_ERROR',
                message: 'quantity is required and must be a positive number',
            });
        }
        let startsAtDate;
        if (startsAt) {
            const parsed = new Date(startsAt);
            if (isNaN(parsed.getTime())) {
                return res.status(400).json({
                    error: 'VALIDATION_ERROR',
                    message: 'startsAt must be a valid ISO date string if provided',
                });
            }
            startsAtDate = parsed;
        }
        const input = {
            tenantId,
            serviceType,
            driverId,
            quantity: qtyNumber,
            startsAt: startsAtDate,
        };
        const subscription = await (0, subscriptionService_1.createSubscriptionWithPriceSnapshot)(input);
        return res.status(201).json(subscription);
    }
    catch (err) {
        return next(err);
    }
});
