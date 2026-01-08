// src/sla/slaCalculator.ts

// 1) Types for SLA incidents and policies.
// These are simple for now; later they can match your DB schema.
export interface SlaIncident {
  id: string;           // SLA incident id (UUID string)
  tenantId: string;     // Tenant id
  serviceType: string;  // e.g. "NLP", "AGENTIC_AI", "SUMMARIZER"
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  // 0.25 means 25% breach of SLA (for example, uptime or latency)
  breachPercent: number;
  // Cost, in cents, that was affected by this incident
  baseCostCents: number;
}

export interface SlaPolicy {
  id: string;
  serviceType: string;   // must match incident.serviceType
  // If breachPercent is between these, this policy applies
  minBreachPercent: number;
  maxBreachPercent: number;
  // e.g. 0.1 means 10% credit on baseCostCents
  creditPercent: number;
  active: boolean;
}

// This is what we will attach to invoices as negative line items.
// Later, invoice_lines can include these as credits.
export interface SlaCreditLine {
  description: string;
  amountCents: number;   // NEGATIVE amount (credit)
  slaIncidentId: string; // link back to incident for audit
}

// 2) The main calculator class.
export class SlaCalculator {
  /**
   * Given SLA incidents and SLA policies, compute credit lines.
   * Each incident will generate ONE credit line (for now).
   */
  public calculateCredits(
    incidents: SlaIncident[],
    policies: SlaPolicy[],
  ): SlaCreditLine[] {
    const creditLines: SlaCreditLine[] = [];

    for (const incident of incidents) {
      // Find a matching policy for this incident
      const policy = policies.find((p) =>
        p.active &&
        p.serviceType === incident.serviceType &&
        incident.breachPercent >= p.minBreachPercent &&
        incident.breachPercent < p.maxBreachPercent
      );

      if (!policy) {
        // No policy → no credit for this incident
        continue;
      }

      // Example credit math:
      // credit = baseCostCents * creditPercent
      // Make it NEGATIVE (credit = -amount).
      const creditAmount = Math.floor(
        incident.baseCostCents * policy.creditPercent
      );
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
