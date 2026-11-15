# LifeOS Personal — V104: Reviewed exercise-plan preference transfer
Date: 2026-11-15
Branch: main

## Implemented
- V88 Preferences: added optional exercise plan templates as fourth export/import preference group; no actual workout records or tracked session history included.
- V88 Review: import compares canonicalized JSON objects without relying on key insertion order (important for PostgreSQL JSONB and cross-device backups). Strict known group selection is still required before any local overwrite.
- V89 Cloud: exercise plan templates can be independently selected for single-workspace upload/restore, with existing revision/CAS conflict protection and user confirmation. Device notifications remain local.
- V89 backend validator: validates ID, plan name, workout type, exercise count, per-exercise sets/repetitions/load and the maximum number of templates before saving. Existing local workout favorites and durations retain their earlier behavior.
- V104 regression source: test_preferences_v104.test.cjs, run with `node --test test_preferences_v104.test.cjs`.

## Source-level checks performed
- Exercise plan snapshot, cloud allowlist, JSON key-order-independent review and selected local restore checks passed in the JS evaluation environment.
- Existing V95 script loads before V88/V89 in index.html; V89 cloud endpoint already exists in server.py.
- Node test file committed, but not executed in Node runtime during this work. A direct external download attempt was unavailable due to container network resolution; GitHub connector commits were successful.

## Boundaries
- This is a single private workspace, **not** multi-user account isolation.
- This synchronizes exercise **plan definitions only**, not completed workout records, individual exercise progress, timers or nutrition.
- No automatic cloud writes: users must compare cloud settings and explicitly approve the upload/restore.
- Real PostgreSQL, real cross-device restore and mobile UI still need acceptance tests.
- Local templates may not live-update an open exercise form until LifeOS is reloaded.
