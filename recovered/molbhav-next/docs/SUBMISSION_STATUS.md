# Molbhav.AI submission status

## Release status
The recovered Next.js demo runs against the existing Molbhav Supabase project.
The database-backed P0 API flow has passed with authenticated TEST actors.
Public URL: https://molbhav-ai.replit.app
The public homepage and products endpoint returned 200. A published BUYER
demand write and its idempotent retry returned 201 and 200 respectively.
The latest AgenticOrg merge is not published yet: its endpoint returns 404 on
the current public deployment. Re-publish the updated source to expose it.

## Source and checks
- Required source checkpoint: `d132bd07d36d5c2d1a9f516760793504dbc79434`.
- Release changes belong only on `feat/raman-core`.
- `npm ci`: passed.
- `npm run build`: passed after the demo UI was added.
- `npm run lint`: passed.
- `npm test`: 5 files, 17 tests passed after the AgenticOrg branch merge.
- Unit tests cover aggregation, pricing, and timestamp normalization for
  idempotent retries. Separate live API checks cover the cloud flow below.

## HTTP checks through Replit's shared proxy
- `GET /api/health`: 200, `status: ready`, `databaseConfigured: true`.
  This reports configuration presence, not schema readiness.
- `GET /api/products`: 200, actual TEST SKU returned.
- `POST /api/demands`: 201 for BUYER; identical retry 200 without duplication.
- `POST /api/merchant/restock`: 201 for its MERCHANT owner.
- Live pool quantity: 7 buyer units + 13 independent restock units = 20.
- `POST /api/supplier/quotes`: 201 for its SUPPLIER owner.
- Admin evaluation returned `PROPOSE`; proposal creation returned 201.
- BUYER, MERCHANT, and SUPPLIER approval calls each returned 200; all three
  together changed the persisted proposal to `APPROVED`.
- A separate proposal was rejected by its SUPPLIER participant.
- Anonymous demand creation: 401. Wrong-role demand/evaluation: 403.
- A non-participant cannot read a proposal: 404. ADMIN cannot approve: 403.
- A stale terms hash cannot be approved: 409.
- `GET /api/pools/not-a-uuid`: 400, `INVALID_ID`.
- Homepage and sampled Next.js JavaScript assets: 200.

## Browser verification
- Initial preview hydration was blocked by Next.js development-origin checks;
  the Replit hostname and local preview hosts are now explicitly allowed.
- BUYER sign-in succeeded; the role, TEST SKU, and TEST Kirana loaded.
- Browser demand quantity 3 returned 201:
  `082f5fa6-2fa2-4021-8841-319cc4c30ba3`.
- Find pool returned 200 and quantity 23 (previous 20 + new demand 3).
- Reload preserved the authenticated BUYER session.
- The active response view exposed a 402px layout overflow; grid/card minimum
  widths and JSON wrapping were corrected afterwards. The signed-in UI for
  the other roles was not browser-tested; their API paths were verified above.

## Published buyer-flow verification
At `2026-10-24T12:23:38Z`, a real authenticated TEST buyer submitted one unit
through the public HTTPS API. Demand
`0fb0ee8a-a6e4-4a60-b1af-5aa62efd6bb4` was persisted (201); retrying the same
idempotency key returned the same demand (200), without double counting.
The live public pool then returned quantity 24: the previous 23 plus this unit.
This was TEST procurement only, not a purchase or payment.

## Implemented endpoint inventory
The P0 subset above is cloud-verified; counteroffers and other secondary
read endpoints below have not all been exercised end-to-end.
- `GET /api/health`, `GET /api/products`.
- `POST /api/demands`, `GET /api/demands/:id`.
- `GET|POST /api/merchant/restock`.
- `GET /api/pools/:id`.
- `POST /api/pools/:id/evaluate`, `GET /api/pools/:id/evaluation`.
- `POST /api/pools/:id/agent-review` (ADMIN-only advisory provider route;
  actual provider invocation remains unverified).
- `GET|POST /api/supplier/quotes`, `GET /api/supplier/quotes/:id`,
  `POST /api/supplier/quotes/:id/counteroffer`.
- `POST /api/proposals`, `GET /api/proposals/:id`,
  `POST /api/proposals/:id/approve`, `POST /api/proposals/:id/reject`.

## Cloud and migration status
A TLS-verified SQL inspection confirmed the existing project's public schema,
migration history, and Auth user inventory were empty before setup.
These recovered migrations were applied together in one transaction, recorded
in `supabase_migrations.schema_migrations`, and the Data API cache reloaded:
- `20261024101844_core_schema.sql`
- `20261024102804_actor_roles.sql`
- `20261024103858_phase2_procurement.sql`

No reset or replacement database was used. Five explicitly labelled TEST
accounts (buyer, merchant, supplier, admin, and non-participant buyer) were
provisioned through trusted administration. TEST catalogue/pricing records
were seeded; demand, restock, quote, evaluation, proposal, and approval writes
were performed through the real authenticated API.

Source review found RLS policies, role checks, security-definer functions with
fixed search paths, immutable proposal terms/hash checks, participant checks,
server-side approval timestamps, and stale pool/quote version checks. These
were exercised for the P0 flow on the actual target database.

Important future migration constraint: the Phase 2 migration adds binding-term
constraints to existing demand/restock tables without backfilling legacy rows.
Inspect existing rows before applying it. Do not reset data or guess consent,
pricing, delivery deadlines, or fulfillment terms to make old rows pass.
The target was empty on this application, so no legacy backfill was needed.

## Authenticated TEST approval evidence
These are automated tests of role-authorized human-approval controls, not a
claim that real humans consented to procurement.
- Pool: `1f9762fd-5e4f-4ccb-81fb-85bd1391704d`.
- Evaluation: `31baa7be-4d85-47ba-a142-7d988024b486`.
- Approved proposal: `b3414a31-d308-45e9-b1d9-c4f7d26f4784`.
- Immutable terms hash:
  `fa7b14376ac72d49cf0348af9cb96571edfe479d29bd3bc7ed7683faf6e22647`.
- BUYER approval: `2026-10-24T11:58:58.802914Z`.
- MERCHANT approval: `2026-10-24T11:58:59.184531Z`.
- SUPPLIER approval: `2026-10-24T11:58:59.583191Z`.
- Rejected proposal: `a0638799-c007-4be2-9877-e42d0c338756`.
- Pool contents can change after this verification; proposals bind to the
  version and terms evaluated at the time.

## External integration evidence
- AgenticOrg: `feat/agent-route` was fast-forward merged into `feat/raman-core`
  at `a584667`, preserving the existing demo changes and teammate history.
  The server-side API key and agent ID are configured securely in Replit.
  Build, lint, and 17 tests pass. Invalid pool ID, anonymous access, and BUYER
  access to the advisory route returned 400, 401, and 403 respectively.
- The provider's read-only agent-details endpoint returned 401 with this key;
  the teammate handoff documents run-only key scope, so this does not establish
  that the run key is invalid. Current agent mode/tools could not be inspected.
- The teammate handoff warns that checkout write tools were enabled at agent
  creation. No new provider invocation was performed without confirmation
  that those permissions are removed or safely disabled. The imported route
  returns advisory output only; it does not persist provider run IDs/tool events.
  No real run ID or trace from this deployment is claimed.
- Pine Labs: no UAT checkout or server-side payment verification verified.
- Pine Labs client credentials are not configured in this workspace.
- PhonePe QR: not treated as Pine Labs or verified payment.
- Juhi frontend branch inspected: fixture-backed multi-page UI was not merged
  into the verified backend console during this release.
- Genuine external users at initial setup: 0. Five TEST actors are not traction.
- Test transactions: no provider-backed transactions executed by this release.
- Live transactions: no provider-backed transactions executed by this release.
  No provider checkout integration is enabled.

## Demo instructions
1. Use the privately provisioned TEST role accounts, or create a buyer account
   with your own email using the UI. New buyers may need email confirmation.
   Merchant, supplier, and admin roles require trusted administration; they
   cannot be selected or escalated by the browser.
2. Select the TEST product and TEST Kirana. Merchant selection and supplier ID
   populate from authorized database records after sign-in. Use the exact SKU.
3. Sign in as the buyer and submit demand for the exact product UUID.
4. Sign in as its merchant owner and add independent restock quantity.
5. Use Find pool with the merchant/product IDs; verify aggregation.
6. Sign in as the supplier owner and submit a quote for that exact SKU/pool.
7. Sign in as admin to evaluate and create a proposal from its evaluation ID.
8. Each required participant signs in, reads the proposal, and approves or
   rejects its actual immutable terms hash. A single approval need not finalize
   a multi-party proposal; inspect its real status and approval records.
9. Publish only after the cloud-backed flow passes; verify the real HTTPS URL.

## Current blockers
- The public P0 demo is live. Re-publish to include the latest AgenticOrg route;
  the current deployment predates that merge.
- AgenticOrg invocation requires confirmation of safe provider tool permissions
  and a current persisted evaluation. Run persistence remains a follow-up.
- Pine Labs UAT requires its own credentials/contracts; AgenticOrg's key is not
  a payment credential and does not establish a checkout integration.
- TEST records are not LIVE commerce, real-human consent, or traction.
- The database password was exposed in chat; rotate it through the project
  owner's secure database settings after the release, updating dependent
  connections together. Never put it in source or submission evidence.
