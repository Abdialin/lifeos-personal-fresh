# LifeOS Personal — remaining work and release gates

## Current release status
**Local integration candidate, not production ready.** This release combines the existing unified interface, weekly dashboard, goal/recovery analytics, scheduling evidence, server verification, and a quantity-unit safety fix. No production services or user records were modified.

## A. Local app completion (can be worked on together)
- [x] Unified mobile navigation with six sections (previous milestone).
- [x] Active timers, simultaneous tracking, distraction, manual corrections and recovery foundations (previous milestones).
- [x] Weekly analytics, data quality, goals and sleep summary foundations (previous milestones).
- [x] Quantity-based personal goals require a unit for **new** goals; mixed units excluded from progress.
- [x] Local JS regression suite and Python unit suite run.
- [ ] End-to-end browser interaction test on an unrestricted Chromium runner (current runner blocks both file:// and localhost navigation).
- [ ] Test accessibility: keyboard navigation, screen readers, focus management, contrast, 320px layouts.
- [ ] Confirm timer pause/resume, switch, concurrent sessions, midnight/DST, offline interruption and reload using browser tests.
- [ ] Review and migrate **older** personal quantity goals that have no quantityUnit; never silently assume units.
- [ ] Add explicit logged-data completeness indicators to every chart and date range.
- [ ] Improve prediction from rule-based review to validated, user-controlled day-type forecasts; do not equate missing logs with free time.
- [ ] Finish notification permissions, background reminders, snooze and missed-event recovery on supported platforms.
- [ ] Add backup/restore user walkthrough, import preview and non-destructive data migrations.

## B. Live integration validation (requires configured nonproduction services)
- [ ] PostgreSQL live atomicity, CAS and migration tests using disposable database and credentials.
- [ ] Google OAuth sign-in, token renewal, calendar read-only import and user-approved writes against test account.
- [ ] Offline/multi-device conflict and recovery tests; avoid silent overwrites.
- [ ] Security review of auth, CORS, CSRF, secrets, session management, rate limits, backups and logs.
- [ ] Load/performance tests with representative, anonymized datasets.
- [ ] Backup restore drill and disaster recovery plan.

## C. Production release (requires explicit user approval)
- [ ] Decide hosting and domains; verify Render/Supabase configuration and secrets without exposing them.
- [ ] Staging deployment, smoke test, rollback test and monitoring.
- [ ] User acceptance testing on Android and desktop browsers.
- [ ] Confirm data retention, export, privacy notices and permission prompts.
- [ ] Explicit go/no-go approval **before** any production deployment or data migration.

## What the tests mean
- `node test_*.cjs` validates isolated JS modules and static integration contracts, **not** real browser behavior.
- `python -m unittest discover` validates local Python tests; live Postgres and browser checks are skipped or separate.
- `LIFEOS_BROWSER_E2E=1 python -m unittest test_personal_browser_e2e -v` is an opt-in real-browser smoke test for a permissive local environment; it did not run successfully here because Chromium navigation is administratively blocked.
- Predictive scheduling remains conservative and rule-based; confidence is a heuristic, not an empirically validated probability.

## Safety rules
Never connect to or modify production Render, Supabase, calendar or existing user data without authorization. Keep LifeOS Work paused. Never auto-approve calendar changes or inferred scheduling. Treat unlogged time as unknown, not available.
