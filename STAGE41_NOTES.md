# Stage 41 — Container and isolated PostgreSQL integration gates

## Delivered
- `docker_smoke_stage41.py`: optional real Docker build/start/HTTP test, using a temporary SQLite volume and generated local credentials. No external services contacted. Requires Docker installed and daemon available.
- `test_stage41_postgres_atomic_live.py`: optional real PostgreSQL test of atomic workspace+audit commit, replay, conflicting decision ID, stale revision, validation rejection, and persisted state. **Destructive:** creates then drops the `lifeos` schema in a newly provisioned empty database. Explicit opt-in and dedicated test URL are required; refuses databases with existing user schemas or public tables.
- `test_stage41_gates.py`: offline tests for safety gates and configuration coverage.

## Execution
```bash
python -m unittest -v test_stage41_gates
python docker_smoke_stage41.py
# Only against a NEW, DISPOSABLE, EMPTY PostgreSQL database, NEVER production:
LIFEOS_TEST_DATABASE_URL='postgresql://.../disposable_db' LIFEOS_ALLOW_DESTRUCTIVE_TEST=YES python test_stage41_postgres_atomic_live.py
```

## Remaining gates
Docker is unavailable in this authoring environment, so the Docker build/start was **not** run. No disposable PostgreSQL service/credentials were supplied, so the real PostgreSQL test was **not** run. Browser end-to-end and live Google OAuth remain pending. Do not deploy to Render or connect to Supabase production before completing these checks and taking a backup.
