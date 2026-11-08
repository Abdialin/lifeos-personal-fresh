# LifeOS Personal — Local Phase 1 safety integration

This release adds a safer rule-based weekly routine review to the unified application. The planner now uses **only completed sessions in the preceding 28 days**, excluding future and stale records. It counts distinct local dates rather than total session count, reports history record count, and checks conflicts against both planned activities and already recorded sessions. Approval refuses overlaps with the current plan list, as well as proposals already marked with conflicts. The planner remains review-only until the user explicitly approves a proposal; it does not write to Google Calendar.

## Verified locally
- 47 JavaScript test scripts, including the new `test_planner_safety.cjs`, pass.
- Python unittest discovery passes (3 skipped); this does not substitute for isolated live integration checks.
- No production database, deployment, or personal data was modified.

## Important limits and next release gates
- Proposed timing comes from user-authored ideal routines, **not** machine-learned predictions.
- Confidence is a simple count of recent tracking days, not a statistically calibrated probability; actual precision and missing time need separate assessment.
- Cross-device concurrent approvals, real-browser interaction, Android background notifications, offline persistence, timezone travel and DST transitions still need end-to-end tests.
- Staging PostgreSQL, OAuth, backup restore, security and production release remain gated by isolated credentials/environments and explicit user approval.
- LifeOS Work remains out of scope.
