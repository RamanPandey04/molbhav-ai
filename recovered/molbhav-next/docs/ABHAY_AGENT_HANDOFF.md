# Abhay agent integration status — 24 Oct 2026

This branch contains `lib/agenticorg/client.ts`, a server-side transport for the **event** AgenticOrg endpoint. Airtribe's email specifies the UUID-based `POST /api/v1/agents/{id}/run`, bearer key, `action: "process"`, agent-specific `inputs`, and statuses `completed`, `failed`, `hitl_triggered`, `budget_exceeded`. It is **not yet invoked by a Molbhav API route**. No API key or real run result is stored in this repository.

## Verified in current branches (latest fetched `feat/raman-core`: `d132bd0`)

- `main` now contains Juhi's UI merge (`b7d3d71`), but `git ls-tree origin/main app/api` shows no backend API routes yet. Do not treat the fixture-powered UI as production evidence.
- Raman's current branch has `GET /api/pools/:id`; supplier `POST/GET /api/supplier/quotes` and `GET /api/supplier/quotes/:id`; admin `POST /api/pools/:id/evaluate` with `Idempotency-Key`; admin `GET /api/pools/:id/evaluation`; admin `POST /api/proposals` with `{evaluationId}`; and `GET /api/proposals/:id`, `POST /api/proposals/:id/approve|reject` with `{termsHash}`. The evaluator persists `decision`, `reason_codes`, `pool_version`, `selected_quote_id`, `snapshot`, and server `created_at`. These are source-inspected routes, **not** live authenticated requests.
- The current backend branch diff contains no `POST/GET /api/agent/runs` route or persisted AgenticOrg provider event path. Raman says run tracking is in progress; wait for tested contracts. No actual pool/quote IDs or role-authenticated request examples have been received.
- This branch now includes `workflow.ts`: it passes only a persisted backend evaluation into AgenticOrg and rejects inconsistent quote/decision pairs. Returned model text remains advisory and cannot become approval or payment state. Tests are synthetic.
- This branch's AgenticOrg transport/workflow tests use synthetic responses and do **not** prove provider access or a real run. The transport restricts the event key to the organizer's HTTPS host.
- The organizer-issued key was used for a bounded `GET /api/v1/agents` check against the event host on 24 Oct, and rechecked at about 16:42 IST. Both returned **401** with `Missing or invalid Authorization header`. The key was not written to the repository. The mail says `AGENT_ID = "<agent-uuid>"`—a placeholder, not an actual UUID. Its UUID-looking email `Message-Id` headers are mail IDs, **not** agent IDs. A mentor/workspace check and actual configured agent UUID are needed before a live run.

## Raman: remaining contract and integration needs

1. Confirm exact deployed evaluator contract. Current route is `POST /api/pools/:id/evaluate` with **no quoteId or poolVersion request body**; it reads live pool version and selects among all quotes. If Raman's promised `evaluate_deal(poolId, quoteId, poolVersion)` is a different contract, share its tested route and stale-version semantics.
2. Confirm authenticated agent/tool access to pool context and quotes. Public pool read is basic; supplier quote reads are role-limited. Agent must not bypass RLS or receive a client-side service key.
3. Provide tested `POST/GET /api/agent/runs` shapes, provider status/run ID handling, persisted real events and server timestamps. A provider run ID may be absent; never synthesize one.
4. Share redacted authenticated success/error examples and real test pool, quote, evaluation and proposal IDs; clarify Supabase setup/deployed migration. Share environment variable **names and access method**, not secrets in chat.
5. Confirm approval roles/termsHash invalidation in the tested DB function. Do not represent a manual QR or screenshot as Pine Labs verified payment.

Please freeze response types in `lib/shared` and provide one redacted real response plus failure example per contract. I will wire the AgenticOrg tool path when those contracts land; source presence alone does not prove deployed behavior.

## Agent behavior to configure

> Analyze one current exact-SKU pool and an attributable, unexpired supplier quote. Use trusted backend tools for eligibility, landed cost and savings. Return `PROPOSE` only as a versioned draft that awaits supplier, kirana and buyer approval. Return `NO_DEAL` with reason codes when economics or SKU constraints fail; return `BLOCKED` when evidence, access or tools are missing. Never invent stock, prices, tool logs, approvals, payment state or a run ID. Do not approve commercial terms or initiate a payment for a person. Include source IDs, pool version, uncertainty and actual tool timestamps.

## Real-run proof required before the demo

- Provider agent UUID and configured prompt version in the event workspace.
- A real tool call reading the current pool and a real deterministic evaluator result.
- Provider run status, actual returned run ID if any, and backend audit events cross-referenced by timestamp.
- One approval against the current terms hash by the authorized human.
- `NO_DEAL` or `BLOCKED` tested with real failure/invalid conditions, not a fabricated successful trace.

- **Update 24 Oct ~16:55 IST:** the key *is valid for runs*. `POST /api/v1/agents/<random-uuid>/run` with the key returns **404 NOT_FOUND** (auth passed), while the same call without a key returns 401. The 401s came from `GET /api/v1/agents` (list) and `POST /api/v1/agents` (create: `API key validation failed`), which this key's scope (`agents:run`) does not cover. So: no mentor fix needed for the key; the agent must be created in the event web UI and its UUID copied from the agent page. `scripts/agenticorg-smoke.mjs` reaches the real host and returns `PROVIDER_ERROR 404` for a non-existent UUID, as expected.

## Real run — 24 Oct 2026 17:00 IST

- Event agent `Molbhav Deal Review`, UUID `e899959c-69d1-4b8a-a4a4-daf54b5e4a6e`, shadow mode, created 16:59 IST in the event UI.
- `POST /api/v1/agents/{uuid}/run` via `lib/agenticorg/client.ts`, inputs with **no** backend evaluation (BLOCKED case).
- Provider returned `status: hitl_triggered`, `run_id: msg_fa05b9e8c406`, `confidence: 0.85` (below the 0.88 floor, so it waits for human review in the UI), output `decision: BLOCKED` with reason codes `MISSING_BACKEND_EVALUATION`, `MISSING_EVALUATION_ID`, `MISSING_POOL_ID`, `MISSING_POOL_VERSION`, `MISSING_QUOTE_ID`, `MISSING_BACKEND_DECISION`.
- Not yet tested: a run with a real persisted evaluation from Raman's backend (`PROPOSE` / `NO_DEAL`).
- The agent's authorized tools currently include `ecommerce.create_checkout` and `ecommerce.complete_checkout` (defaults of the Ecommerce Buyer type). Remove them in Scopes/Config; the prompt forbids checkout but should not be the only guard.
