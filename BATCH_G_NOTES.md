# Batch G — Advanced Live Tracking & Recovery (first increment)

Preserves Batch F and adds a non-destructive forgotten-timer review panel for running sessions older than four hours. The user chooses an approximate finish time; no timer is closed automatically. A recovery event records the previous state and selected time. Failed local persistence restores the in-memory snapshot. This is local-only recovery, not an atomic multi-device transaction.

`personal_tracking_recovery.js` adds tested pure functions for stale-timer identification, explicit recovery, cycle-safe optional parent-child links, and unknown/unlogged gaps >=45 minutes (with merged overlaps). The hierarchy and gap APIs are **not yet connected to the UI**. Gaps remain unknown, never assumed to be free time or distraction.

Tests: `node test_tracking_recovery.cjs` (7 checks); `node --check personal_tracking_recovery.js`; inline script syntax check. Full Python suite currently has four environment-dependent errors and one skip, unchanged from prior batches. Full browser interaction, DST, offline crash-recovery and sync conflicts remain unverified.

No Render/Supabase changes; no migrations. Next Batch G increment should add hierarchy UI and robust correction history before moving to Batch H reminders.
