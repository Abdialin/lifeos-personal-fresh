# LifeOS Personal — V115–V116 account isolation continuation
Date: 2026-11-15

## Implemented without touching legacy user history
- **V115** isolated account-workspace module: `personal_account_workspace_v115.py`. Uses user-scoped social session authentication, separate `account_workspaces` table, versioned JSON payload validation and atomic compare-and-swap revision checks. It never reads or writes the legacy singleton `lifeos.state`.
- **V115** migration inspection only: counts existing records and reports eligibility. No silent ownership assignment or migration.
- **V115** regression coverage: `test_account_workspace_v115.py` exercises independent Alice/Bob state, revision conflicts, session expiry and no migration side effects.
- **V116** PostgreSQL schema proposal: `social_account_schema_v116.sql`, deliberately not applied to the existing Render database. Uses `lifeos_social` schema for users, sessions, invitations, sharing grants, cards and account workspaces.
- Updated isolated-module GitHub Actions CI to run both the Friends and account-workspace tests.
- Repaired a stale storage-probe test expectation that hard-coded a fixed number of idempotent schema-create statements.

## CI findings
- The isolated module GitHub Actions job for commit `522ff414...` completed with **success**, covering Friends and account-workspace isolation and selected Node regressions.
- Separate UI workflow may still be in progress or fail for unrelated reasons; inspect the latest run before treating the app as visually verified.

## Activation blockers
- **NOT a live account system**: server.py still exposes the legacy shared Basic Auth + sync token model and does not import the isolated social/account modules.
- **No HTTP route for social sign-up/sign-in or account workspaces**. Must establish secure cookies, CSRF prevention, strict CORS/origin handling, request throttling, abuse monitoring, password reset and account deletion.
- PostgreSQL schema is a proposal; no matching PostgreSQL social-domain adapter yet.
- Real user data ownership and migration must be explicitly reviewed and approved. Avoid ever copying the same existing shared workspace to multiple users.
- Friends UI still uses V90 opt-in manual progress cards. Leaderboards in the isolated social domain are self-reported and cannot be called verified.
- No mobile lock-screen/native notification implementation or live-device acceptance confirmation.

## Safe next step
Build a separate account-aware HTTP service behind an opt-in feature flag only after implementing the PostgreSQL adapter and authentication security controls. Migrate real data only with owner review, backup and rollback procedures.
