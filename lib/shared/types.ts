export type ActorRole = 'BUYER' | 'MERCHANT' | 'SUPPLIER' | 'ADMIN';
export type PaymentMode = 'UAT' | 'LIVE';
export type PaymentStatus = 'CREATED' | 'PENDING' | 'VERIFIED_PAID' | 'FAILED' | 'EXPIRED';
export type AgentDecision = 'PROPOSE' | 'NO_DEAL' | 'BLOCKED';
export type Paise = number & { readonly __paise: unique symbol };
export type ApiResponse<T> = { data: T | null; error: { code: string; message: string; details?: unknown } | null };
export type Demand = { id: string; buyer_id: string; merchant_id: string; product_id: string; quantity: number; allocated_existing_stock: number; status: string; expires_at: string; created_at: string };
export type RestockRequest = { id: string; merchant_id: string; product_id: string; quantity: number; status: string; expires_at: string; created_at: string };
