# Temporary demo fallback — Juhi PhonePe QR and human review

The source image is the downloaded PhonePe QR showing **Juhi Dugar** as recipient. An unchanged copy is staged at `/public/demo/juhi-phonepe-qr.jpeg` for local preview. This is a personal PhonePe QR, **not a Pine Labs hosted checkout**, and it cannot be presented as proof that the hackathon Pine Labs deliverable is complete. Do not publish or use it for a real order until Juhi confirms she is the authorized recipient for that order and the team agrees how to reconcile it.

## UI copy for Juhi

> **Manual payment demo — PhonePe QR (Juhi Dugar)**
>
> Scan only after reviewing the final offer and amount. Your payment will remain **pending manual confirmation** until the recipient checks the transaction. This is not Pine Labs checkout.

Place the image below this copy in a demo-only panel and show the amount from Raman's server, never from agent output. Do not render `PAID_UAT`, `PAID_LIVE`, `VERIFIED_PAID`, revenue, or a successful order because the QR was viewed, scanned, or a screenshot was uploaded. Keep the domain payment state `PENDING` until a separate, authenticated verification workflow exists. A person can confirm a PhonePe receipt, but that must be recorded as a **manual payment method**, not Pine Labs verification.

## Human approval for the agent proposal

This is a separate step from payment. The agent may return a draft `PROPOSE`; it cannot accept commercial terms. The supplier, kirana and buyer each review the exact SKU, quantity, price, pickup terms, proposal version and `termsHash`. The appropriate human selects Approve or Reject. Raman's current branch has approval/rejection routes and a DB decision function, but an authenticated deployed request and response have not yet been verified. Do not claim recorded approval until that test passes.

**Current source-inspected routes:** `POST /api/proposals/:id/approve` and `POST /api/proposals/:id/reject` with authenticated role and `{termsHash}`, plus `GET /api/proposals/:id`. A changed pool/quote/price/quantity must invalidate old approvals; confirm this with real role-based tests before the demo.

## Demo sequence with current fallback

1. Show actual buyer demand, kirana restock and attributable supplier quote.
2. Run AgenticOrg using real tools; show actual provider status and reason codes. If access remains blocked, show `BLOCKED`, not a staged trace.
3. Show an authorized supplier/kirana/buyer approving the current proposal through Raman's recorded decision API. If the API is unavailable, explain that approval is pending and stop the commercial flow.
4. Show the labelled PhonePe QR **only as an optional manual-payment demo**. The payment and order remain pending until verified by an authorized recipient and recorded under a separate manual method.
5. In the submission, report the Pine Labs integration as a gap if it remains unavailable. A PhonePe payment cannot be counted as a Pine Labs checkout.
