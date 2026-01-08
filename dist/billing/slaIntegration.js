"use strict";
// src/billing/slaIntegration.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaIntegrationService = void 0;
const slaCalculator_1 = require("../sla/slaCalculator");
class SlaIntegrationService {
    calculator;
    constructor() {
        this.calculator = new slaCalculator_1.SlaCalculator();
    }
    /**
     * For now, we accept incidents and policies as parameters.
     * Later, invoice generation can:
     *  - Load incidents from DB for this tenant and billing period
     *  - Load SLA policies from DB
     *  - Call this method to get credit lines
     */
    calculateCreditsForInvoice(incidents, policies) {
        const creditLines = this.calculator.calculateCredits(incidents, policies);
        return creditLines.map((c) => ({
            description: c.description,
            amountCents: c.amountCents,
            slaIncidentId: c.slaIncidentId,
        }));
    }
}
exports.SlaIntegrationService = SlaIntegrationService;
