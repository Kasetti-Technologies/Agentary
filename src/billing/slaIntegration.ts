// src/billing/slaIntegration.ts

import {
  SlaCalculator,
  SlaIncident,
  SlaPolicy,
  SlaCreditLine,
} from '../sla/slaCalculator';

/**
 * Shape of a credit line that billing / invoice code can use.
 * This is close to invoice_lines: description + amount_cents + sla_incident_id.
 */
export interface InvoiceCreditLineInput {
  description: string;
  amountCents: number;   // negative
  slaIncidentId: string;
}

export class SlaIntegrationService {
  private readonly calculator: SlaCalculator;

  constructor() {
    this.calculator = new SlaCalculator();
  }

  /**
   * For now, we accept incidents and policies as parameters.
   * Later, invoice generation can:
   *  - Load incidents from DB for this tenant and billing period
   *  - Load SLA policies from DB
   *  - Call this method to get credit lines
   */
  public calculateCreditsForInvoice(
    incidents: SlaIncident[],
    policies: SlaPolicy[],
  ): InvoiceCreditLineInput[] {
    const creditLines: SlaCreditLine[] =
      this.calculator.calculateCredits(incidents, policies);

    return creditLines.map((c) => ({
      description: c.description,
      amountCents: c.amountCents,
      slaIncidentId: c.slaIncidentId,
    }));
  }
}
