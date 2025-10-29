// file: src/schemas/usagepilot.v1.types.ts

// --- Core Event Structure ---
export interface UsagePilotEvent {
    schema_version: "usagepilot.v1";
    id: string; // Maps to event_id (UUID)
    customer_id: string; // Maps to tenant_id
    timestamp: string; // ISO-8601
    event_type: "udf_call" | "email_reply" | "doc_summary" | string;
    metric: string;
    quantity: number;
    properties: UdfCallProperties | EmailReplyProperties | DocSummaryProperties | Record<string, any>;
    
    // Optional Fields
    idempotency_key?: string;
    estimated_cost_usd?: number;
    region_tag?: string;
    event_hash?: string;
    schema_meta?: { producer?: string; producer_version?: string; topic?: string; };
}

// --- Event-Type Specific Properties ---
export interface UdfCallProperties {
    udf_name: string;
    query_id: string;
    model_version: string;
    execution_time_ms: number; // >= 0
    estimated_cost_usd: number; // >= 0
    data_processed_mb?: number;
    snowflake_warehouse?: string;
}

export interface EmailReplyProperties {
    email_id: string;
    reply_generated: boolean;
    confidence_score: number; // 0 - 1
    processing_time_ms: number; // >= 0
    model_version: string;
    estimated_cost_usd: number; // >= 0
    human_review_required?: boolean;
    intent?: string;
}

export interface DocSummaryProperties {
    document_id: string;
    word_count: number; // >= 0, integer
    summary_length_words: number; // >= 0, integer
    model_version: string;
    estimated_cost_usd: number; // >= 0
}
