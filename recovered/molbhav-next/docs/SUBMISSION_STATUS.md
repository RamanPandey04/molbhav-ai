# Molbhav.AI submission status

## Release status
Not ready for a verified public submission. The recovered Next.js demo runs in
the Replit development preview. Supabase API access works, but database
administration is blocked by an invalid database password. No public
deployment currently exists. Do not submit the development preview as a
published production URL.

## Source and checks
- Required source checkpoint: `d132bd07d36d5c2d1a9f516760793504dbc79434`.
- Release changes belong only on `feat/raman-core`.
- `npm ci`: passed.
- `npm run build`: passed after the demo UI was added.
- `npm run lint`: passed.
- `npm test`: 2 files, 7 tests passed.
- These tests cover domain aggregation and pricing, not the cloud database,
  role provisioning, human approvals, or payment providers.

## HTTP checks through Replit's shared proxy
- `GET /api/health`: 200, `status: ready`, `databaseConfigured: true`.
  This reports configuration presence, not schema readiness.
- `GET /api/products`: `DB_ERROR`; the products table is unavailable.
- `GET /api/pools/not-a-uuid`: 400, `INVALID_ID`.
- Homepage and sampled Next.js JavaScript assets: 200.

## Implemented endpoint inventory (not cloud-verified)
- `GET /api/health`, `GET /api/products`.
- `POST /api/demands`, `GET /api/demands/:id`.
- `GET|POST /api/merchant/restock`.
- `GET /api/pools/:id`.
- `POST /api/pools/:id/evaluate`, `GET /api/pools/:id/evaluation`.
- `GET|POST /api/supplier/quotes`, `GET /api/supplier/quotes/:id`,
  `POST /api/supplier/quotes/:id/counteroffer`.
- `POST /api/proposals`, `GET /api/proposals/:id`,
  `POST /api/proposals/:id/approve`, `POST /api/proposals/:id/reject`.

## Cloud and migration status
The existing Molbhav Supabase project responds to authenticated API requests.
Its administrative Auth API returned 200. REST requests for products,
actor profiles, and pool evaluations returned PGRST205 (tables absent from
the API schema cache). A direct SQL inspection is still required to determine
the complete database and migration state.

The supplied connection URI retained a password placeholder. A subsequently
supplied password value was an API key rather than a database password, and
PostgreSQL rejected authentication (28P01). A personal access token was
requested as an alternative but not supplied. No cloud migrations, provisioning,
or database writes have been performed, and no reset was attempted.

Source review found RLS policies, role checks, security-definer functions with
fixed search paths, immutable proposal terms/hash checks, participant checks,
server-side approval timestamps, and stale pool/quote version checks. These
must still be tested on the actual target database.

Important migration blocker: the Phase 2 migration adds binding-term
constraints to existing demand/restock tables without backfilling legacy rows.
Inspect existing rows before applying it. Do not reset data or guess consent,
pricing, delivery deadlines, or fulfillment terms to make old rows pass.
Confirm the target project and migration history before any application.

## External integration evidence
- AgenticOrg: no genuine provider integration or run IDs verified.
- Pine Labs: no UAT checkout or server-side payment verification verified.
- PhonePe QR: not treated as Pine Labs or verified payment.
- Human approval proof: unavailable until a real authenticated database test.
- Genuine external users: unverified; no count claimed.
- Test transactions: no provider-backed transactions executed by this release.
- Live transactions: no provider-backed transactions executed by this release.
  Existing cloud counts remain unknown.

## Demo instructions once the database is connected
1. Provision explicitly labelled TEST buyer, merchant, supplier, and admin
   accounts through trusted administration, never through browser role editing.
2. Create/reuse a TEST product, zone, merchant, supplier, and merchant pricing
   terms. Record their real identifiers without exposing credentials.
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
A valid database password or a Supabase personal access token is required for
migration-history review and application. Cloud-backed end-to-end verification
and publishing remain blocked. API keys alone cannot authorize SQL migrations.
