# LifeOS Personal — V118 account & Friends staging interface
Date: 2026-11-15

## Implemented
- `personal_account_friends_v118.js`: settings login/logout, staging registration, session token in JS memory only; Friends interface with invitations, accepting/declining, consent grant/revoke by recipient and metric, friendship removal, explicitly confirmed self-reported aggregate score publication, consented leaderboard display.
- UI only becomes visible if `/api/account/v117/status` indicates enabled and the page is served over HTTPS. Otherwise V90 manual sharing remains the only Friends option. No legacy sessions, prayers, notes, calendar data or tracked activities are read or transmitted to social accounts.
- `personal_account_http_v117.py`: exact HTTPS origin checks for writes; for browser GET requests without Origin, exact trusted HTTPS Referer plus same-origin fetch metadata is required. GET leaderboard strictly accepts only metric, days and periodEnd query keys; any unexpected or duplicate parameters are rejected.
- `server.py`: feature-discovery status under the legacy private-access perimeter; forwards account GET queries to the strict account boundary; accounts remain disabled by default, with separate staging database required.
- New tests: `test_account_friends_http_v118.py` and `test_account_friends_v118.test.cjs`. Included in isolated-module GitHub Actions workflow.
- Existing V114–V117 account permissions, session expiry, and revision conflict protection remain unchanged.

## Safeguards
- **No automatic account/workspace migration**. The legacy local LifeOS history is untouched.
- **No saved account token** in localStorage, sessionStorage or IndexedDB. Reloading the page signs out of the isolated account.
- **No automatic score publishing**. Scores are self-reported, consented aggregates.
- **No live activation** unless separate account database, secure HTTPS staging origin and feature flag are configured. Legacy PostgreSQL configuration fails closed without a reviewed account Postgres adapter.
- All account routes remain behind the legacy Basic Auth perimeter, which is not a substitute for genuine individual account access or production readiness.
- Email verification, password reset, anti-abuse controls, production-grade sessions and PostgreSQL account storage remain incomplete.

## Verification
- JS module parsed in isolated V8 source evaluator; score bounds, metric allowlisting, registration gating and static route linkage inspected.
- Complete V118 CI job will be checked separately; no browser/device sign-in or live Render activation has been confirmed.
- Source-level verification is NOT live test coverage.
