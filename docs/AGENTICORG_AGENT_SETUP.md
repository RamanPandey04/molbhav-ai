# Molbhav deal-review agent — event workspace setup

Owner: Abhay. Create this agent on **https://agenticorg.hackathon.pinelabs.com** (the Airtribe event tenant), not the general `app.agenticorg.ai` account. The email contains an API key and an invocation example with `AGENT_ID = "<agent-uuid>"`; that value is a placeholder. Copy the real UUID from the created agent's detail page only.

## Configure

1. Sign in to the event workspace with Abhay's account. If access or the emailed key still fails with 401, ask the event mentor to confirm organization membership, key scope (`agents:run`), tenant URL and key activation. Do not paste the key into chat, prompt, repository or screen recording.
2. Open **Agents → Create**. Name: `Molbhav Deal Review`. Domain: commerce/operations or custom. Set visibility to the hackathon organization, and start in **Shadow** for testing.
3. Choose the available configured model. For the first safe test, grant **no write tools**. Once Raman supplies an authenticated, least-privilege backend tool contract, add only current pool/quote read and deterministic evaluation tools, then re-test. A registered connector alone is not evidence that those tools work.
4. Paste and review the prompt below. Save the prompt version and actual agent UUID. Do not promote to active or grant money actions until a human owner approves the tested behavior.
5. Test one real current evaluation, one `NO_DEAL`, one missing/stale evaluation and one contradictory input. Save actual provider run status, returned run ID if present, timestamps and tool trace. Never invent a run ID or tool event.

## Prompt (copy into AgenticOrg)

> You are Molbhav Deal Review. You work for the buyer pool and the kirana. Your job is to explain a current, persisted Molbhav backend evaluation to an authorized human. Inputs include evaluationId, poolId, poolVersion, quoteId, backendDecision, backendReasonCodes, backendSnapshot and evaluatedAt. The Molbhav backend is the sole authority for SKU, quantities, integer-paise prices, landed cost, savings, eligibility, approval and payment state. Do not recalculate, override or invent these facts. If verified current backend data or required tool access is missing, say BLOCKED and specify what is missing. If backendDecision is NO_DEAL, report NO_DEAL as a valid outcome; do not push a proposal. If backendDecision is PROPOSE, describe a draft only, and clearly state that the current termsHash must be approved by authorized supplier, kirana and buyer in Molbhav before any commercial commitment. You cannot approve terms, initiate checkout, mark payment verified or claim an order is paid. Never claim PhonePe/manual QR as Pine Labs payment. Do not invent provider run IDs, tool logs or timestamps. Return concise JSON with decision (PROPOSE, NO_DEAL or BLOCKED), summary, reasonCodes, evaluationId, poolId, poolVersion, quoteId, and `humanApprovalRequired: true` for PROPOSE. Do not include private contacts or secrets.

## Real-run handoff

After the agent exists, set server-side `AGENTICORG_AGENT_ID` and `AGENTICORG_API_KEY` in the deployment secret store. The local smoke script `node scripts/agenticorg-smoke.mjs` requires those plus `AGENTICORG_INPUTS_JSON` containing an explicitly safe, real evaluation payload. It prints only provider status, the actual returned run ID (or `null`) and whether output was received. Backend integration must authenticate admin, persist server events and keep human approvals in Molbhav.

As of 24 Oct 2026 about 16:42 IST: event `GET /api/v1/agents` with the emailed bearer key returned 401 twice. No event agent UUID or real run has been verified.

- **Update 24 Oct ~16:55 IST:** the key *is valid for runs*. `POST /api/v1/agents/<random-uuid>/run` with the key returns **404 NOT_FOUND** (auth passed), while the same call without a key returns 401. The 401s came from `GET /api/v1/agents` (list) and `POST /api/v1/agents` (create: `API key validation failed`), which this key's scope (`agents:run`) does not cover. So: no mentor fix needed for the key; the agent must be created in the event web UI and its UUID copied from the agent page. `scripts/agenticorg-smoke.mjs` reaches the real host and returns `PROVIDER_ERROR 404` for a non-existent UUID, as expected.
