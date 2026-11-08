# LifeOS Personal — verification and smoke-test stabilization

This milestone continues the Unified Interface Integration package without changing application state formats, UI business logic, production configuration, or external accounts.

## Changes

- Made four legacy standalone smoke tests safe to import during `python -m unittest discover`: `test_stage12_browser.py`, `test_stage22_postgres_live.py`, `test_stage41_postgres_atomic_live.py`, `test_v3_2.py`. Each runs only when explicitly executed as a script.
- Repaired `test_v3_2.py`'s isolated-server smoke test: it now copies the server's local Python dependencies into its temporary test directory and selects an available ephemeral loopback port rather than hardcoding 18791.
- No destructive database or OAuth operations were run.

## Verified in this environment

- `python -m unittest discover -p 'test_*.py'`: 48 tests run, 1 skipped, 0 errors/failures. Four standalone smoke tests are intentionally not counted as unittest cases.
- All 45 `test_*.cjs` JavaScript regression scripts passed.
- `python test_v3_2.py`: passed isolated SQLite server HTTP smoke test (auth, token, backup checksum, revision conflict and update).
- `python test_stage22_postgres_live.py` and `python test_stage41_postgres_atomic_live.py`: skipped safely without isolated test database credentials and explicit opt-in.

## Remaining validation

- Actual browser interaction test (Playwright/Chromium environment access), live isolated PostgreSQL integration, Google Calendar OAuth, offline/multi-device recovery, Docker build, security review and production deployment remain unverified.
- Python tests emit some ResourceWarnings about unclosed SQLite connections in older tests; these are not currently failing tests and merit later cleanup.

## Safety

Never set `LIFEOS_TEST_DATABASE_URL` to a production database. Live PostgreSQL scripts can create/drop test schemas and require a dedicated empty disposable database plus `LIFEOS_ALLOW_DESTRUCTIVE_TEST=YES`.
