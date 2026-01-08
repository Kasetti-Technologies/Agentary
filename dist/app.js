"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/app.ts
const express_1 = __importDefault(require("express"));
const tenantContext_middleware_1 = require("./middleware/tenantContext.middleware");
const usageEvents_router_1 = require("./routes/usageEvents.router");
const billingSubscriptions_router_1 = require("./routes/billingSubscriptions.router");
const app = (0, express_1.default)();
app.get('/health', (_req, res) => { res.status(200).json({ ok: true }); });
// JSON body parser
app.use(express_1.default.json());
// Critical Setup Middleware (attaches tenantContext + dbClient)
app.use(tenantContext_middleware_1.tenantContextMiddleware);
// Routes
app.use('/api/v1/usage-events', usageEvents_router_1.usageEventsRouter);
app.use('/api/v1/billing/subscriptions', billingSubscriptions_router_1.billingSubscriptionsRouter);
// Cleanup Middleware (releases dbClient after response)
app.use(tenantContext_middleware_1.releaseDbClientMiddleware);
// Centralized Error Handler (typed)
const errorHandler = (err, req, res, next) => {
    console.error(err);
    if (typeof err === 'object' &&
        err !== null &&
        'message' in err &&
        err.message.includes('UsageEvent schema validation failed')) {
        const message = err.message;
        return res.status(422).json({
            code: 'VALIDATION_ERROR',
            message: 'Request body does not conform to usagepilot.v1 schema.',
            details: JSON.parse(message.split(': ')[1]),
        });
    }
    return res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
    });
};
app.use(errorHandler);
exports.default = app;
