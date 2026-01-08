"use strict";
// src/sla/slaCalculator.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.SlaCalculator = void 0;
// 2) The main calculator class.
class SlaCalculator {
    /**
     * Given SLA incidents and SLA policies, compute credit lines.
     * Each incident will generate ONE credit line (for now).
     */
    calculateCredits(incidents, policies) {
        const creditLines = [];
        for (const incident of incidents) {
            // Find a matching policy for this incident
            const policy = policies.find((p) => p.active &&
                p.serviceType === incident.serviceType &&
                incident.breachPercent >= p.minBreachPercent &&
                incident.breachPercent < p.maxBreachPercent);
            if (!policy) {
                // No policy → no credit for this incident
                continue;
            }
            // Example credit math:
            // credit = baseCostCents * creditPercent
            // Make it NEGATIVE (credit = -amount).
            const creditAmount = Math.floor(incident.baseCostCents * policy.creditPercent);
            const creditAmountCents = -Math.abs(creditAmount); // ensure negative
            // Build description for invoice line
            const percentText = (incident.breachPercent * 100).toFixed(1);
            const creditPercentText = (policy.creditPercent * 100).toFixed(1);
            const description = [
                `SLA credit for ${incident.serviceType} outage`,
                `severity=${incident.severity}`,
                `breach=${percentText}%`,
                `credit=${creditPercentText}%`,
            ].join(' | ');
            creditLines.push({
                description,
                amountCents: creditAmountCents,
                slaIncidentId: incident.id,
            });
        }
        return creditLines;
    }
}
exports.SlaCalculator = SlaCalculator;
