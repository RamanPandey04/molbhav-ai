# Abhay final validation — 24 Oct 2026, 18:05 IST

Scope: AgenticOrg, approvals, traction and supplier evidence (Abhay), plus a
live UI check for Juhi. Everything below was observed directly, or is marked
with its source. Nothing here was simulated.

## Summary

| Item | Status |
|---|---|
| AgenticOrg agent | **VERIFIED** — standalone run on the event tenant |
| AgenticOrg via Molbhav backend (live) | **BLOCKED** — route not yet in the published build |
| Human approvals (3 roles) | **VERIFIED by Raman's API tests** (TEST actors), not re-run by Abhay |
| Genuine activated users in backend | **0** |
| Manually reported ₹1 PhonePe payments | **5 reported, 0 independently verified** |
| Real supplier / kirana quote | **Not available** — only TEST supplier data |
| Pine Labs checkout | **NOT IMPLEMENTED** (no credentials) |

## 1. AgenticOrg

**Standalone run (verified, Abhay, 17:00 IST).**
- Agent `Molbhav Deal Review`, UUID `e899959c-69d1-4b8a-a4a4-daf54b5e4a6e`, shadow mode.
- `POST /api/v1/agents/{uuid}/run` from `lib/agenticorg/client.ts`.
- Input deliberately had no backend evaluation.
- Response: `status: hitl_triggered`, `run_id: msg_fa05b9e8c406`, `confidence: 0.85`, `decision: BLOCKED`.
- Reason codes: `MISSING_BACKEND_EVALUATION`, `MISSING_EVALUATION_ID`, `MISSING_POOL_ID`, `MISSING_POOL_VERSION`, `MISSING_QUOTE_ID`, `MISSING_BACKEND_DECISION`.
- Tool calls in that run were not captured. No PROPOSE / NO_DEAL run on real pool data has been made.

**Through the Molbhav backend (blocked).**
- `POST /api/pools/:id/agent-review` is on `feat/raman-core` (`a584667`). Build passes, and Raman reports 400/401/403 checks passed in his workspace.
- Live check at 18:05 IST on https://molbhav-ai.replit.app: the route returns **404**. The published build predates the merge. `/console` and `/juhi-ui/` also return 404.
- Abhay has no ADMIN credentials, so even after publishing, Raman (ADMIN) must run the call.

**Open risk.** The agent's authorized tools include `ecommerce.create_checkout` and `ecommerce.complete_checkout` (defaults of the Ecommerce Buyer type). Remove them in the AgenticOrg dashboard before any run on real data.

**Agent must never approve.** This is enforced in code: `assessAgentRun` only returns advisory text; approvals go through `/api/proposals/:id/approve|reject` by authenticated humans.

## 2. Human approvals

Source: `docs/SUBMISSION_STATUS.md` (Raman, authenticated TEST actors against the live Supabase). Not independently re-run by Abhay.

- Pool `1f9762fd-5e4f-4ccb-81fb-85bd1391704d`, evaluation `31baa7be-4d85-47ba-a142-7d988024b486`, decision `PROPOSE`.
- Approved proposal `b3414a31-d308-45e9-b1d9-c4f7d26f4784`, termsHash `fa7b1437…22647`.
- Approvals by role, with server timestamps (UTC):
  - BUYER: 11:58:58.802914Z
  - MERCHANT (kirana): 11:58:59.184531Z
  - SUPPLIER: 11:58:59.583191Z
- Negative checks reported: ADMIN cannot approve (403), stale termsHash (409), non-participant read (404), anonymous (401).
- Rejected proposal `a0638799-c007-4be2-9877-e42d0c338756`.
- These are TEST actors, not real-human consent.

**Current pool state (live, 18:05 IST):** `GET /api/pools/1f9762fd…` → quantity 24, version 6, status OPEN. The approved proposal bound an earlier version; a fresh evaluation is needed for a current agent review.

## 3. Traction

The team reports ₹1 PhonePe payments from five people: Gautam Kumar, Sudhanshu Sekher, Ankur Singh, Kishan Singh, Vikash Dugar.

| Check | Status |
|---|---|
| Contact / consent | Not provided to Abhay |
| Account in Molbhav backend | None created |
| Product interaction / demand submitted | None recorded |
| Product and quantity | Unknown |
| Transaction evidence | Not seen by Abhay (PhonePe history is with the recipient, Juhi) |
| Duplicates | Cannot be checked without evidence |

Classification:
- Real activated users (in backend): **0**
- Manually reported ₹1 payments: **5**
- Manually confirmed payments: **0** until Juhi confirms each in her PhonePe history (redact UTR/phone)
- Development/test data: 5 TEST actors (Raman)

Payment method for all five: `MANUAL_PHONEPE`. Not Pine Labs, not `VERIFIED_PAID`.

## 4. Merchant / supplier

No real kirana or supplier quote, MOQ, delivery cost or willingness to participate has been collected. All quote data in the backend is TEST data. **This part of the demo is unverified.**

## 5. Live UI check (for Juhi)

At 18:05 IST:

| Path | Result |
|---|---|
| `/` | 200 — Raman's console (old build) |
| `/juhi-ui/index.html` | 404 — not published yet |
| `/phonepe-qr.png` | 404 — not published yet |
| `/console` | 404 — not published yet |

After the next publish, `/` redirects to Juhi's UI and the console moves to `/console`.

Juhi's UI is a compiled prototype that runs on sample fixtures, not the live API. Present it as a UI walkthrough.

The QR at `public/phonepe-qr.png` is Juhi's original WhatsApp JPEG converted to PNG. The content is identical, but the file is re-encoded. Browser QA (360px, forms, flows) has not been done; it needs a person with a browser.

The Remotion videos on Abhay's Desktop use designed screens, not live screenshots. Do not present them as a live recording.

## 6. Outstanding blockers

1. Raman: re-publish `feat/raman-core` (`1c655ec` or later).
2. Abhay: remove checkout tools from the agent in the AgenticOrg dashboard.
3. Raman (ADMIN): create a fresh evaluation, then call `/agent-review` live. Share the response without the token.
4. Juhi: confirm the five ₹1 payments in PhonePe history.
5. Raman: onboard any of the five who agree, as real BUYER accounts through the UI.
6. Pine Labs checkout: not implemented. Report it as a gap in the submission.
7. Real supplier/kirana quote: not collected.
8. Social posts, demo recording and demo URL: not done. They need team accounts.
