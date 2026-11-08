# LifeOS Unified V4.0 — Stage 37

## Scope
Multi-device conflict/recovery hardening through executable real-HTTP integration tests. This is a **test-focused stage**; no application or database schema migration is made.

## New test
`python -m unittest -q test_stage37_recovery.py`

The new tests exercise: a lost commit acknowledgement; retry after process restart; duplicate decision recognition; subsequent independent device update; rejection of a reused decision ID with a changed action; preservation of the original sessions and current server workspace. Uses a disposable local SQLite database and an actual HTTP server.

## Verification
- All JavaScript `test_stage*.cjs` scripts passed.
- 21 Python tests passed in the selected combined suite (some inherited tests execute twice because the Stage 37 class extends the Stage 36 class).
- Python compilation passed.
- Existing Chromium smoke test reports **SKIP**: navigation blocked by the execution environment. It is **not** a passed browser E2E test.
- No live Google OAuth, PostgreSQL/Supabase, or Render deployment was tested or changed.

## Known risks / Stage 38
- Browser UI interactions remain unverified. Run Playwright in a permitted local/CI environment.
- Conflict handling rejects stale changes; it does not merge concurrent edits.
- Real PostgreSQL transaction isolation and OAuth flows require controlled external integration tests.
- After another device updates the server following a successful commit, a duplicate decision acknowledgement must be reconciled against current remote state rather than assumed to mean the current snapshot matches.
