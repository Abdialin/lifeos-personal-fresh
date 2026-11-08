# LifeOS Unified V4.0 — Stage 39: Deployment Preflight and Packaging

## Implemented
- Fixed the Dockerfile to include the backend's imported Python modules (`google_calendar.py`, `calendar_audit_store.py`, `atomic_calendar.py`) and calendar UI assets (`calendar.html`, `calendar.js`). Previously these files were missing from the image and could prevent startup.
- Added `deployment_preflight.py`, a read-only, offline deployment configuration and package checker. It checks required files, Dockerfile COPY coverage, mandatory LifeOS credentials, optional PostgreSQL URL syntax and incomplete Google OAuth settings. It **does not** contact databases or services and does not print credentials.
- Added four automated regression tests in `test_stage39_preflight.py`.

## Local verification
- 25 selected Python tests passed (including four Stage 39 preflight tests).
- 28 JavaScript regression scripts passed.
- Python source compiled successfully.
- No live PostgreSQL, Google OAuth, Render deployment, Docker image build, or full browser UI test was performed.

## How to run the preflight
From the project directory, after setting environment variables in a private terminal:

    python deployment_preflight.py
    python deployment_preflight.py --strict
    python -m unittest -v test_stage39_preflight

Exit code 0 means the static preflight passed, not that deployment is production-ready. A warning means additional review is required. Do not put secrets in source files, issue trackers or chat.

## Controlled rollout checklist
1. Export and independently verify a private LifeOS backup before deployment.
2. Configure `LIFEOS_USERNAME`, `LIFEOS_PASSWORD`, and a random `LIFEOS_TOKEN`; set a persistent storage backend. On Render, local SQLite without a persistent disk is not durable.
3. For PostgreSQL, use a dedicated test database to apply `postgres_schema.sql` and run the opt-in test `test_stage22_postgres_live.py`. **This test drops the lifeos schema and must never run against production.**
4. Verify database schema and migration compatibility on a disposable database before touching existing data.
5. Build and start the Docker image in a suitable local/CI environment; validate `/healthz`, login, calendar UI and authenticated APIs.
6. Run actual browser interactions and Google OAuth against a test Google account; require user approval for calendar changes.
7. Only after these gates pass, plan a backed-up, explicitly approved deployment. Do not infer production readiness from offline tests alone.

## Compatibility and safety
No change to the persisted LifeOS activity format, PostgreSQL schema or calendar decision protocol. No live data was read or modified. Existing browser synchronization conflict behavior remains conservative: no automatic merge.
