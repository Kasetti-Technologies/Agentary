"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.usageEventsRouter = void 0;
const express_1 = require("express");
const usageEvents_controller_1 = require("../controllers/usageEvents.controller");
const router = (0, express_1.Router)();
exports.usageEventsRouter = router;
// Define the route
router.post('/', usageEvents_controller_1.ingestUsageEventHandler);
