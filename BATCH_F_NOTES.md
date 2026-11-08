# Batch F — Ideal Schedule and Approval Foundation

- Added `ideal_planning.js` pure module for local-weekly routine validation, projection, conflict review, and explicit approval conversion.
- Added UI for creating/removing recurring ideal routines, viewing them in My Ideal Schedule, reviewing proposals and individually approving a proposed LifeOS schedule entry.
- Existing schedule is not mutated by viewing, generating or rejecting suggestions. Approval prompts the user, writes only to the LifeOS workspace, and never writes to Google Calendar. Existing calendar change review and atomic synchronization remain separate.
- Repeated approval is guarded by `idealProposalId`; approved plans are ordinary schedule plans, subject to existing sync and conflict safeguards.
- Local timezone is used for routine clock times and weekly recurrence; daylight-saving edge cases (nonexistent/ambiguous clock times) require more testing. The evidence-based predictive engine is not yet connected to automatic proposals. UI browser E2E is still pending.
- Test: `node test_ideal_planning.cjs` (12 assertions); all existing JS regression scripts passed. Python full discovery: 52 tests, 4 errors (environment-dependent connection refused), 1 skipped; not claimed passing.
- No production data, deployment, or external calendar modified.
