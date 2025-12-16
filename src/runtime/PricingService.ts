// src/runtime/PricingService.ts
import fs from 'fs';
import path from 'path';

type PricingRecord = {
  service_type: string;
  unit: string;
  unit_price: number;
  currency: string;
};

type PricingConfig = Record<string, PricingRecord>;

export class PricingService {
  private pricing: PricingConfig;

  constructor(configPath?: string) {
    const file = configPath || path.join(__dirname, '..', 'config', 'pricing.json');
    const raw = fs.readFileSync(file, 'utf8');
    this.pricing = JSON.parse(raw) as PricingConfig;
  }

  /**
   * Resolve the price for a usage event.
   * You can decide where price_id comes from:
   *  - directly from the usage event, OR
   *  - derived from service_type + event_type.
   */
  resolvePrice(params: {
    serviceType: string;
    eventType: string;
  }): { priceId: string; unitPrice: number; currency: string } {
    // simplest: map by serviceType + eventType
    let priceId: string;

    if (params.serviceType === 'NLP' && params.eventType === 'UDF_CALL') {
      priceId = 'NLP_UDF_CALL_V1';
    } else if (params.serviceType === 'AGENTIC_AI' && params.eventType === 'EMAIL_REPLY') {
      priceId = 'AGENTIC_EMAIL_V1';
    } else if (params.serviceType === 'SUMMARIZER' && params.eventType === 'DOC_SUMMARY') {
      priceId = 'SUMMARIZER_PAGE_V1';
    } else {
      throw new Error(`No pricing rule for serviceType=${params.serviceType}, eventType=${params.eventType}`);
    }

    const record = this.pricing[priceId];
    if (!record) {
      throw new Error(`Unknown priceId=${priceId}`);
    }

    return { priceId, unitPrice: record.unit_price, currency: record.currency };
  }
}
