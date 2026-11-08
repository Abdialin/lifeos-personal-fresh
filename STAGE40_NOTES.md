# Stage 40 — Isolated Deployment HTTP Validation

## Implemented
- `deployment_smoke.py`: launches the real LifeOS HTTP server with temporary SQLite storage and randomly generated local-only credentials. Tests startup, authentication boundaries, main/calendar assets, read/write state, revision conflict rejection, backup export, and calendar configuration status. It terminates the server and deletes the temporary database. No production service is contacted.
- `test_stage40_deployment.py`: four regression tests for HTTP behavior, Docker packaging coverage, additive PostgreSQL schema checks, and explicit Docker availability reporting.

## Boundaries
- Docker is not installed in this environment, so no Docker image was built or started.
- No PostgreSQL service or psycopg dependency was available for live database integration; no live migrations were executed.
- Google OAuth and browser UI interaction remain untested.
- Existing Render/Supabase instances and activity data were not accessed or modified.

## How to run
`python deployment_smoke.py`
`python -m unittest -v test_stage40_deployment`

## Next gate
Run a Docker build/start smoke test in CI or an environment with Docker, and use a disposable PostgreSQL instance for migrations and transaction tests. Do not run destructive schema tests against production.
