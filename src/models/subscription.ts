export type SubscriptionStatus = 'active' | 'canceled' | 'trial';

export interface Subscription {
  subscription_id: string;
  tenant_id: string;
  service_type: string;      // e.g. "NLP", "AGENTIC_AI"
  driver_id: string | null;
  status: SubscriptionStatus;
  quantity: number;
  price_id: string;          // immutable pricing handle (snapshot at purchase)
  unit_price_cents: number;  // price per unit at purchase
  currency: string;          // e.g. "USD"
  starts_at: Date;
  ends_at: Date | null;
  created_at: Date;
}
