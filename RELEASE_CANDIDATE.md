# LifeOS V4.0 — stages 42–45, release-candidate preparation

This package **does not deploy anything**. It extends Stage 41 without changing
application state or production data. The remaining stages are not a fixed finite
list; this batch closes the currently defined release-preparation tasks only.

## Stage 42 — Repeatable CI
GitHub Actions offline Python/Node tests plus a Docker smoke job. A Docker
runner with Docker daemon is required; the current authoring environment lacks
Docker. CI does not automatically connect to external PostgreSQL or OAuth.

## Stage 43 — Packaging hygiene
`.dockerignore` and `.gitignore` exclude local database, credentials, logs and
runtime files. No live credentials are included. Docker smoke uses generated
credentials and isolated local SQLite.

## Stage 44 — Release gates
`release_gate.py` checks required files and reports six explicit, unverified
external gates. Default command is non-blocking for missing *attestations* to
allow CI to validate the package; `--require-release` fails closed until all
six are operator-attested. Flags are NOT independently verified evidence.

## Stage 45 — Release handoff
Release checklist and tests for gate behavior. No deployment is authorized.

### Commands
```
python offline_tests.py
for f in test_stage*.cjs; do node "$f"; done
python release_gate.py --json
python release_gate.py --require-release
python docker_smoke_stage41.py
```

### Mandatory human-controlled production checklist
1. Make and restore-test an independent backup of the actual LifeOS database.
2. Build/start the Docker image; run HTTP smoke checks and inspect logs.
3. Run real atomic transaction tests on a **new, disposable PostgreSQL DB**.
   The optional Stage 41 PostgreSQL test is destructive and must NEVER be used
   against Supabase production or any database with user data.
4. Verify the actual browser UI (activity tracking, scheduling, approval, undo,
   offline/reconnect, multi-device conflict handling) in a supported browser.
5. Verify Google OAuth on a dedicated test account and confirm read-only scopes
   and user-approval behavior.
6. Obtain explicit operator approval and plan a reversible, monitored deployment.

### Known limitations
- No Docker executable, disposable PostgreSQL service, or Google OAuth account
  is available in the authoring environment. These tests are **pending**.
- Browser smoke was previously blocked by navigation policy. Full browser
  interaction is **pending**.
- The app detects synchronization conflicts; it does not auto-merge them.
- Do not treat a green CI run or manually set flags as proof of production safety.

**Test runner note:** Four legacy `test_*.py` files are standalone scripts with import-time side effects or opt-in live database behavior. `offline_tests.py` intentionally excludes these from unittest discovery; they are not silently claimed as passing.
