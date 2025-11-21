"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUsagePilotEvent = validateUsagePilotEvent;
// file: src/validators/usageEventValidator.ts
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
// **IMPORTANT:** Ensure this path is correct based on your file structure.
// If 'schemas' is a sibling of 'src' and this file is in 'src/validators', then "../../schemas/usagepilot.v1.json" is correct.
const usagepilot_v1_json_1 = __importDefault(require("../../schemas/usagepilot.v1.json"));
// Configuration:
// - allErrors: Collect all validation errors for detailed debugging.
// - removeAdditional: false: Strictly reject properties not defined in the schema.
const ajv = new ajv_1.default({
    allErrors: true,
    removeAdditional: false,
    verbose: true
});
// Required to validate ISO-8601 "date-time" format:
(0, ajv_formats_1.default)(ajv);
// Compile the schema once upon startup
const validate = ajv.compile(usagepilot_v1_json_1.default);
/**
 * Validates an incoming usage event payload against the canonical usagepilot.v1 JSON Schema.
 *
 * Producers MUST run this validation synchronously before producing. Invalid events
 * must be rejected or routed to a schema-fix queue, and NOT emitted to main usage topics ().
 *
 * @param event The JSON object representing the usage event.
 * @returns {boolean} Returns true if the event is valid.
 * @throws {Error} Throws an error with AJV validation details if validation fails.
 */
function validateUsagePilotEvent(event) {
    const ok = validate(event);
    if (!ok) {
        // Producer behavior: reject/queue for schema-fix; do NOT produce invalid events to Kafka @12.
        const errorDetails = JSON.stringify(validate.errors, null, 2);
        throw new Error(`UsagePilot validation failed: ${errorDetails}`);
    }
    return true;
}
