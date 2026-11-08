# LifeOS Personal — Unified Goals & Recovery snapshot

- Added read-only weekly goals and sleep snapshot to the existing HTML app.
- Goal progress reuses existing `goalProgress` calculations and local week boundaries; it does not modify goals.
- Sleep logs are separated by measured, estimated and unknown precision. Missing sleep logs do not imply zero sleep; no recovery score is inferred.
- Added `personal_goal_recovery_dashboard.js` and `test_goal_recovery_dashboard.cjs`.
- No production deployment, external calendar write, or database migration performed.
- Full browser, PostgreSQL, and Google OAuth verification remain pending.
