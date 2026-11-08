# LifeOS Unified V4.0 — Stage 36

## Delivered
Added `test_stage36_http.py`: actual HTTP multi-client integration tests against a disposable local SQLite database and server subprocess. Covers competing clients on the same revision, replay after lost acknowledgement, replay after unrelated later writes, duplicate decision-ID collision, restart persistence, preserved tracking records, authorization, and validation failures. No production data or external service is contacted.

## Verified locally
- Python unittest suite (Stage 24, 25, 32, 34, 36): 15 passed.
- All 28 included `test_*.cjs` JavaScript scripts: passed.
- Stage 22 database tests: passed (SQLite and simulated PostgreSQL).
- Stage 12 real HTTP integration: passed.
- Python compileall: passed.

## Remaining limits
- Real PostgreSQL/Supabase integration not tested; simulated PostgreSQL is not equivalent.
- Live Google OAuth not tested.
- Chromium browser end-to-end UI testing not performed.
- Multi-device conflicts are rejected, not automatically merged. On an older retry, a duplicate decision can be identified server-side, but the client still needs to verify its workspace before acknowledging.
- No production deployment or data migration performed.

## Run
`python -m unittest -v test_stage36_http test_stage34 test_stage24 test_stage25 test_stage32`
`python test_stage12_integration.py`
`python test_stage22_database.py`
`for f in test_*.cjs; do node "$f" || exit 1; done`
