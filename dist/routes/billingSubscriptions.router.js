"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.billingSubscriptionsRouter = void 0;
// src/routes/billingSubscriptions.router.ts
const express_1 = require("express");
const billingSubscriptions_controller_1 = require("../controllers/billingSubscriptions.controller");
const router = (0, express_1.Router)();
exports.billingSubscriptionsRouter = router;
// POST /api/v1/billing/subscriptions
router.post('/', billingSubscriptions_controller_1.createSubscriptionHandler);
