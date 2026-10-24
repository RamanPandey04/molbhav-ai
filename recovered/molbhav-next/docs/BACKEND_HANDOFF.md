# Molbhav backend handoff

The source PRD, architecture, agent workflow, team plan, frontend plan, API contracts v1, and Raman start guide were not present. The two named ZIP archives were also absent from Downloads. This contract is the current implementation contract.

## Response format

All endpoints return `{ "data": T | null, "error": { "code": string, "message": string, "details"?: unknown } | null }`. Errors use appropriate HTTP status codes. Money fields use integer paise.

## Endpoints for Juhi

| Method | Path | Auth | Data |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | `{ status: "ready" | "degraded", databaseConfigured: boolean }` |
| GET | `/api/products` | Public | Active products `{ id, name, unit, active }[]` |
| GET | `/api/pools/:id` | Public | `{ id, zone_id, product_id, quantity, version, status, expires_at }` |
| POST | `/api/demands` | Buyer sign in | New demand row |
| GET | `/api/demands/:id` | Owner only | Demand row plus `effectiveStatus` |
| POST | `/api/merchant/restock` | Merchant owner | New restock row |
| GET | `/api/merchant/restock?merchantId=:id` | Merchant owner | Restock rows plus `effectiveStatus` |

POST writes require `Idempotency-Key` header (8 to 128 characters). A matching retry returns 200 with the original row; a changed payload returns 409. `expiresAt` must be an ISO timestamp within the next 30 days.

Demand body: `{ "merchantId": "uuid", "productId": "uuid", "quantity": 10, "expiresAt": "2026-10-25T12:00:00Z" }`. The server sets the buyer ID from Supabase Auth and stock allocation to zero. Restock body has the same fields. The server verifies the merchant belongs to the caller.

New Supabase Auth users receive a `BUYER` profile. Merchant access requires a trusted administrator to change the profile role to `MERCHANT` and create an owned merchant row. Client requests cannot assign roles.

Example success: `{ "data": { "id": "uuid", "merchant_id": "uuid", "product_id": "uuid", "quantity": 10, "status": "ACTIVE", "expires_at": "2026-10-25T12:00:00Z", "created_at": "..." }, "error": null }`. Example failure: `{ "data": null, "error": { "code": "UNAUTHENTICATED", "message": "Sign in required" } }`.

## Tool contracts for Abhay

The agent may read active products and live pool totals through the public GET endpoints. Pool `version` changes when quantity changes; use it when preparing a proposal so stale decisions can be rejected. The `proposals`, `supplier_quotes`, `approvals`, `orders`, `payments`, `agent_runs`, and `audit_events` tables exist but have no client grants or public write API yet. Agent code must not directly write these tables from a browser or reuse a buyer session. No proposal or payment execution endpoint is implemented. `AgentDecision` is `PROPOSE | NO_DEAL | BLOCKED`.

Pool quantity equals, per merchant, `max(0, eligible consumer demand - allocated existing stock) + independent restock`, summed across active merchants in the zone. Only active, unexpired requests count. Pool reads refresh expired totals under a database row lock. Payment statuses are `CREATED | PENDING | VERIFIED_PAID | FAILED | EXPIRED`; `PAID_UAT` and `PAID_LIVE` are display states only. A redirect never verifies payment.

## Integration status

Migration is local only. No Molbhav Supabase project or credentials were found. Protected endpoint behavior and database policies need live integration testing after the project is connected. No seeded products, zones, or merchants are included.
