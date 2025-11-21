"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tenantContext_middleware_1 = require("./middleware/tenantContext.middleware");
const usageEvents_router_1 = require("./routes/usageEvents.router");
const app = (0, express_1.default)();
app.use(express_1.default.json()); // JSON body parser
app.use(tenantContext_middleware_1.tenantContextMiddleware); //  Critical Setup Middleware
app.use('/api/v1/usage-events', usageEvents_router_1.usageEventsRouter); //  Routes
app.use(tenantContext_middleware_1.releaseDbClientMiddleware); //  Cleanup Middleware
//  Centralized Error Handler (typed)
app.use((err, req, res, next) => {
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
    res.status(500).json({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
    });
});
exports.default = app;
