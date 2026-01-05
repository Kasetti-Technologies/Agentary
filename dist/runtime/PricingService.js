"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
// src/runtime/PricingService.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class PricingService {
    pricing;
    constructor(configPath) {
        const file = configPath || path_1.default.join(__dirname, '..', 'config', 'pricing.json');
        const raw = fs_1.default.readFileSync(file, 'utf8');
        this.pricing = JSON.parse(raw);
    }
    /**
     * Resolve the price for a usage event.
     * You can decide where price_id comes from:
     *  - directly from the usage event, OR
     *  - derived from service_type + event_type.
     */
    resolvePrice(params) {
        // simplest: map by serviceType + eventType
        let priceId;
        if (params.serviceType === 'NLP' && params.eventType === 'UDF_CALL') {
            priceId = 'NLP_UDF_CALL_V1';
        }
        else if (params.serviceType === 'AGENTIC_AI' && params.eventType === 'EMAIL_REPLY') {
            priceId = 'AGENTIC_EMAIL_V1';
        }
        else if (params.serviceType === 'SUMMARIZER' && params.eventType === 'DOC_SUMMARY') {
            priceId = 'SUMMARIZER_PAGE_V1';
        }
        else {
            throw new Error(`No pricing rule for serviceType=${params.serviceType}, eventType=${params.eventType}`);
        }
        const record = this.pricing[priceId];
        if (!record) {
            throw new Error(`Unknown priceId=${priceId}`);
        }
        return { priceId, unitPrice: record.unit_price, currency: record.currency };
    }
}
exports.PricingService = PricingService;
