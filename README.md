# LifeOS Unified V4.0 — Stage 22

**Database reliability and integration verification.** Continues Stage 21 without changing the browser storage format, server API, or live deployment.

## Additions
- `postgres_schema.sql`: the PostgreSQL schema required by the existing server. Apply to a **dedicated** LifeOS database before configuring `LIFEOS_DATABASE_URL`.
- `test_stage22_database.py`: executes SQLite compare-and-swap tests and a **simulated** PostgreSQL adapter to exercise PostgreSQL SQL and JSONB code paths, including conflicts.
- `test_stage22_postgres_live.py`: opt-in real PostgreSQL verification against a **new, empty, dedicated test database** only; refuses to run without `LIFEOS_TEST_DATABASE_URL` and `LIFEOS_ALLOW_DESTRUCTIVE_TEST=YES`, and refuses existing `lifeos.state`. Deletes its test schema after completion. Never use production credentials.
- Existing Stage 12 HTTP integration tests remain included.

## Run
```
node test_stage21.cjs
python test_stage22_database.py
python test_stage12_integration.py
python test_stage22_postgres_live.py  # skips unless explicitly configured
```

## Limits
A simulated PostgreSQL adapter is not a real PostgreSQL integration test. The real PostgreSQL test has **not** been run unless separately reported. Browser tests, cross-device sync and Supabase network access are not validated. No live service or user data was changed.


## Stage 23 — Calendar review (local preview)
- `calendar.html` / `calendar.js`: separate, read-only `.ics` import, deduplication, interval conflict preview against existing LifeOS sessions and schedule, and candidate-only approval/revocation.
- Calendar preview is stored under a **separate** browser localStorage key `lifeos-stage23-calendar-v1`; existing LifeOS data is not migrated or modified.
- Export a Google Calendar `.ics` file manually, then open Calendar Review. The page does **not** connect to Google or sync events back.
- Unknown `TZID` and recurring event rules are intentionally skipped rather than incorrectly interpreted. Floating local timestamps are interpreted in the browser's local timezone. This is a limited preview, **not** a complete ICS implementation.
- `node test_stage23.cjs` verifies parsing, duplicate handling, unsupported recurrence/timezone, and conflict detection.
- **Pending**: Google OAuth, encrypted server-side token vault, authenticated API, incremental sync, recurrence/timezone expansion, explicit approval for real writes, live PostgreSQL/Supabase verification, browser E2E.

## Stage 24 — Google Calendar OAuth (read-only, local development)

Stage 24 introduces `/api/calendar/status`, `/api/calendar/connect`, `/api/calendar/callback`, `/api/calendar/events?start=...&end=...`, and an authenticated `/api/calendar/disconnect` POST requiring `X-LifeOS-Token`. The Google Calendar page can preview events from the primary calendar for the next 30 days. Imported events remain in the separate Stage 23 browser store; they do not modify activity records. No Google Calendar write API is implemented.

Set these environment variables **server-side**, never in browser JavaScript:

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from your Google Cloud OAuth web client
- `GOOGLE_REDIRECT_URI`, exactly matching an authorized redirect URI (e.g. `https://YOUR_HOST/api/calendar/callback`)
- `LIFEOS_CALENDAR_ENCRYPTION_KEY`, generated once using `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` and securely retained. Losing the key requires reconnecting.

Install dependencies with `pip install -r requirements-v3.2.txt`. OAuth uses `calendar.readonly`, `access_type=offline`, PKCE S256 and a single-use 10-minute state token. Refresh tokens are encrypted at rest in a dedicated SQLite/PostgreSQL table. A valid HTTPS reverse proxy is required for production; localhost HTTP is supported for local testing. Do not change the key while tokens are stored. This version is designed for one private LifeOS account, not multi-tenant deployment.

**Limitations:** OAuth was not tested against live Google endpoints. The primary calendar is fetched with a maximum of 250 events per request, and the UI warns if truncated. Google API authorization, database migrations and deployment must be validated in a staging environment before production. Revoking access from Google account security settings is recommended if you stop using the integration. Existing Render/Supabase services are not changed by this package.

## Stage 25 — Read-only calendar pagination and recovery

- Google Calendar event previews now traverse all result pages (up to 20 pages of 250 records each) instead of silently omitting later pages.
- Recurring instances are expanded by Google's `singleEvents=true` and retain the recurring series ID and original start metadata when returned.
- Duplicate event IDs are ignored across pages; repeated pagination tokens and malformed responses fail closed.
- Transient HTTP 429/5xx and connection errors receive bounded retries. Permanent failures are not retried. A failed page never returns a misleading partial preview.
- No event writes or automatic modification of LifeOS activity state. Existing local calendar preview format remains supported.
- Run `python -m unittest -v test_stage24 test_stage25` for focused tests.

**Limits:** Live Google OAuth and PostgreSQL/Supabase are not verified in this environment. This is not a persistent background sync engine; it is an on-demand read-only preview. Google API event recurrence expansion depends on the account's actual event data. Do not deploy without reviewing secrets, access controls, and backup procedures.

## Stage 26 — Calendar Sync Dashboard and Approval Review
- New summary metrics for imported, conflicting, approved and pending calendar events.
- Search and filter by event source, LifeOS overlap, and approval status.
- Review-only JSON export with event details, detected conflicts and approval flags.
- Explicit separation between candidate approval and actual calendar writes; no external event writes added.
- Stage 26 regression test: `node test_stage26.cjs`.
- Existing browser localStorage key and LifeOS state schema remain unchanged. No live database or deployment is modified.
- **Limitations:** review is browser-local, not a server-side approval ledger; OAuth still requires real credentials and live testing. Calendar conflicts depend on local workspace data availability. Google pagination and recurring-event behavior require live API verification.


## Stage 27 — Approved calendar candidates to LifeOS schedule

1. Open `/calendar.html`, import or preview events and approve candidates.
2. Select **Send approved candidates to LifeOS for review**. This only stages a browser-local handoff.
3. Open `/` in the same browser profile and select **Review and add candidates to my schedule**. Confirm the count and overlap warning.
4. The app creates only `schedule` entries, retaining original tracked sessions, event logs and existing plans. Entries carry `calendarKey` for duplicate protection.
5. LifeOS's existing persistence/recovery journal is used for the confirmed update; Google Calendar remains read-only.

Limitations: same-origin/same-browser handoff; calendar edits do not automatically propagate to created plans; manual review is mandatory. Do not clear browser storage before finishing the transfer. No live Google or Supabase access was used.


## Stage 28 — Calendar change intelligence (local preview)

The calendar review dashboard now compares complete Google previews against existing LifeOS plans linked by calendarKey. It reports changed times/titles and possibly missing events. No automatic schedule modifications or Google writes occur. Missing-event detection is suppressed for incomplete/truncated previews. A missing event is a *possible* cancellation, not proof: a time-window change or a different calendar can also explain it. Recurring occurrence identity remains a limitation; ambiguous matches require manual review. Tests: `node test_stage28.cjs`.


## Stage 29 — Controlled calendar changes

After a complete Google event preview, use **Send changes to LifeOS for individual approval**. In the main LifeOS screen, approve or reject each proposal. Reschedules update only a matching planned entry after stale-state validation and a confirmation dialog; possible cancellations only mark that plan as skipped. No tracked session or Google Calendar event is modified. The existing revision-aware persistence function is used, and failed saves roll back in-memory edits. A plan modified since the proposal was generated cannot be approved. Recurring/ambiguous matches remain manual-review only. Live OAuth and PostgreSQL integration are still unverified.

## Stage 30 — Calendar decision history and guarded undo

Calendar approvals/rejections now produce bounded audit records in the same LifeOS workspace as the plans, so the Stage 21 atomic local commit and offline journal protect both together. Reschedules and skipped plans can be undone only when their current fields exactly match the recorded post-change snapshot. A changed plan blocks undo. Audit export is available from the main app. Calendar proposals are removed only after the workspace commit succeeds; if handoff cleanup fails, a proposal may reappear and must be reviewed again. No external calendar writes or live database changes occur.

**Limits:** History is capped at 200 entries and is not an immutable server-side audit log. The existing whole-workspace sync can still require conflict resolution. Browser testing, live Google OAuth, and live PostgreSQL testing are pending.

## Stage 31 — Replay protection and recovery

- Calendar change proposals receive deterministic decision identities based on plan, calendar key, baseline, action and proposed values.
- A proposal already recorded in the workspace calendar audit is hidden from the pending review queue, even when a browser interruption prevents removal of the separate handoff key.
- On approval/rejection, the committed audit is persisted before the handoff is cleaned. Failed persistence rolls back in-memory plan changes.
- `test_stage31.cjs` verifies proposal identity, replay recognition and critical ordering guards.

**Limitations:** Replay suppression relies on the existing rolling 200-entry local audit. This is not an immutable or server-side transaction log. Full browser interaction, actual multi-device concurrency, Google OAuth, and live Supabase/PostgreSQL remain unverified. Do not deploy without a backup and live integration checks.


## Stage 32 — Persistent server calendar audit (opt-in API)

Added authenticated `GET /api/calendar/audit` and `POST /api/calendar/audit` endpoints.
POST accepts a Stage 30/31 calendar audit entry with `id`, `at`, `action`, `planId`, and `proposalId`.
The server stores entries independently of the rolling 200-entry browser audit, rejects conflicting replays
with HTTP 409, and accepts identical retries idempotently. SQLite creates the audit table lazily;
PostgreSQL requires running the updated `postgres_schema.sql` against the dedicated database first.

**Limitations:** The existing browser workflow does not automatically POST audit entries yet.
This endpoint is a durable journal foundation, not an atomic transaction with `/api/state`,
not multi-user authorization, and not verified on live PostgreSQL. Do not deploy without
backups, authentication review, and a migration plan. Existing data is not migrated or modified.

## Stage 33 — automatic audit delivery (local development)

Calendar decisions and undo events now add immutable, ID-bearing upload records to
`workspace.calendarAuditPending` in the same browser atomic recovery snapshot as
LifeOS state. After connecting the private sync token and synchronizing pending
workspace changes, the client POSTs pending decisions to `/api/calendar/audit` in
order. The server's existing idempotency rule makes retries safe after a timeout.
The client removes each queued entry only after an acknowledged server response,
and persists that removal. HTTP 400/409 blocks delivery for manual investigation;
network failures retain pending entries for retry. Offline and hidden-tab recovery
is best-effort. Export recovery data before clearing browser storage.

**Limitations:** Server audit writes are still not a single database transaction
with workspace changes. This is an at-least-once delivery design, not a guarantee
of cross-device atomic consistency. Browser-level end-to-end testing and real
Supabase/Google OAuth testing are pending. No automatic Google Calendar writes.


## Stage 37
See `STAGE37_NOTES.md` for additional HTTP recovery tests, verification and remaining limitations.

## Stage 38 — Browser validation gate
See `STAGE38_NOTES.md`. Added a Playwright Chromium smoke test with explicit environment-blocked reporting. Browser navigation is not verified in the current environment; live services remain untouched.
