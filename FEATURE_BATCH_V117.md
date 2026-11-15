# LifeOS Personal V117 — opt-in account API integration
Date: 2026-11-15
Branch: main

## Delivered
1. `personal_account_api_v117.py` — narrow account request dispatcher providing registration, login, logout, user-scoped workspace read/commit with revision conflict checks, friendship invitations/responses, per-friend per-metric consent, remove friend, self-reported aggregate share and leaderboard. Backend uses isolated V114 social and V115 account modules; never reads the legacy singleton LifeOS state.
2. `personal_account_http_v117.py` — strict HTTPS origin, Sec-Fetch-Site and JSON content-type checks for browser API calls. Account bearer tokens are not attached as cookies and are intended to remain in page memory. No cross-origin authorization response headers.
3. `server.py` — feature-flagged routing under `/api/account/v117/*` after legacy private-access gate, default disabled. Enabled explicitly only with:
   - `LIFEOS_ACCOUNT_API_ENABLED=1`
   - `LIFEOS_ACCOUNT_API_ORIGIN=https://your-reviewed-origin.example`
   - `LIFEOS_ACCOUNT_DB_PATH=/absolute/durable/separate/accounts.sqlite`
   When `LIFEOS_DATABASE_URL` is set (legacy PostgreSQL), this feature fails closed at startup: the isolated PostgreSQL adapter is not implemented.
4. Tests: `test_account_api_v117.py` and `test_account_http_v117.py`, plus existing `test_social_isolated_v114.py` / `test_account_workspace_v115.py`, run in GitHub Actions.

## Automated test result
- Isolated-module workflow for V117 commit `1a2a6a115...` **passed**, covering Python account API, boundary, Friends and workspace isolation, along with selected Node regressions.
- Browser/UI, real PostgreSQL and mobile account login have NOT been verified.

## Security boundaries and outstanding blockers
- The new API remains OFF by default. No automatic migration or transfer of historical activities.
- New accounts live in a separate SQLite domain under existing shared Basic Auth perimeter. The shared Basic Auth remains a staging access barrier, NOT a user login system.
- This is a *staging integration*, not a production multi-user service. Before public exposure: review HTTP/TLS reverse-proxy trust and deployment, persistent account database backup, per-user registration/email verification and password-reset flows, abuse mitigation, CSP and origin rules, account deletion/data retention, security auditing, real PostgreSQL adapter, legal/privacy review and full browser integration.
- Session token is returned only to the authenticated client; frontend must use in-memory state and explicitly discard token on logout. There is not yet a live account frontend.
- Current leaderboard is self-reported aggregate-only. The system does not access activity history to compute or verify another user's score.
- The user must approve any migration from the existing shared workspace into a new user account.
