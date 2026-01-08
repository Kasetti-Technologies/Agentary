// src/sla/manualSlaTest.ts
import { SlaCalculator, SlaIncident, SlaPolicy } from './slaCalculator';

async function main() {
  const calculator = new SlaCalculator();

  // Example SLA incident: 25% breach on AGENTIC_AI, affecting \$100.00 of cost
  const incidents: SlaIncident[] = [
    {
      id: 'incident-0001',
      tenantId: '00000000-0000-0000-0000-000000000001',
      serviceType: 'AGENTIC_AI',
      severity: 'MAJOR',
      breachPercent: 0.25,   // 25% breach
      baseCostCents: 10000,  // \$100.00
    },
  ];

  // Example policies: 0–10% -> 5% credit, 10–50% -> 20% credit
  const policies: SlaPolicy[] = [
    {
      id: 'policy-001',
      serviceType: 'AGENTIC_AI',
      minBreachPercent: 0.0,
      maxBreachPercent: 0.10,
      creditPercent: 0.05,   // 5% credit
      active: true,
    },
    {
      id: 'policy-002',
      serviceType: 'AGENTIC_AI',
      minBreachPercent: 0.10,
      maxBreachPercent: 0.50,
      creditPercent: 0.20,   // 20% credit
      active: true,
    },
  ];

  const creditLines = calculator.calculateCredits(incidents, policies);

  console.log('=== SLA Credit Calculation Demo ===');
  console.log('Incidents:', JSON.stringify(incidents, null, 2));
  console.log('Policies :', JSON.stringify(policies, null, 2));
  console.log('Credits  :', JSON.stringify(creditLines, null, 2));

  if (creditLines.length > 0) {
    const c = creditLines[0];
    console.log('\nHuman summary:');
    console.log(
      `Incident ${c.slaIncidentId}: credit amountCents=${c.amountCents} (should be negative)`,
    );
  }
}

main().catch((err) => {
  console.error('manualSlaTest failed:', err);
  process.exit(1);
});
