# LifeOS Personal — V66 integration verification

## Automated checks completed

- 25 assertions from `test_stage66.cjs` evaluated successfully against the current GitHub sources.
- JavaScript syntax checks passed for 15 entry points, including `index.html` inline JavaScript and `calendar.js`.
- Real historical-import records remain eligible actual evidence; synthetic `assumed-demo` entries are excluded from completed totals, observed time and prediction evidence.
- Parallel actual activities are counted once in unique-duration metrics.
- Proposed plan changes reject stale plans, preserve durations and do not change sessions.
- Canonical recovery checkpoint verification supports standard (format 1) and compact (format 2) entries.
- Same-tab plan changes notify historical, analytical, predictive and weekly planning views.
- Both prediction approval and plan-move routes now check recovery checkpoint verification before reporting success.

## NOT YET VERIFIED (requires deployed browser / authenticated environment)

These are **not passes** and must not be reported as tested:

1. Start/pause/finish a real timer; refresh and reopen the app; verify persistence in canonical recovery checkpoint, including under mobile screen lock.
2. Add a plan, change it through V62, refresh, and ensure the updated plan remains visible in the weekly planner without duplicated entries. Repeat in compact recovery mode.
3. Approve a V58 prediction with sufficient credible history and verify it appears as a *planned* entry, never as a completed session.
4. Import genuine historical activities and verify today's entries are visible, origin-labelled, and included in actual time. Confirm development samples are excluded.
5. Import ICS/CSV/PDF/text documents through calendar review; inspect overlaps and reject/cancel before approval; ensure no premature schedule writes.
6. Run Google Calendar OAuth connection in the deployed environment. Check configured redirect URI, authenticated scopes, and error responses. No external calendar writes without review/approval.
7. Test desktop and mobile UI navigation, tap targets, keyboard accessibility, and dashboard visibility across V53–V64.
8. Confirm Render deployment commit matches GitHub `main`, check service logs, verify API/cloud sync and PostgreSQL durability. A GitHub commit alone is not deployment proof.
9. Check offline→online recovery, storage-quota failures, broken compact checkpoint behavior, and exported recovery backup restoration in a controlled test account.

## Data integrity rules

- **Actual:** finished sessions with evidence. Historical imports may be actual records with provenance.
- **Planned:** intent only; time overlap does not prove completion.
- **Predicted:** review-only proposal until approved.
- **Synthetic:** seeded/demo examples never count toward actual recorded time or prediction confidence.
- **Unlogged:** unknown, never assumed free time or inactivity.
- Failed writes must not be described as successful; canonical checkpoint verification is authoritative for durable local saves.
- External calendar and cloud synchronization statuses must be reported separately from local persistence.

## Running checks

```sh
node test_stage66.cjs
```

The JS syntax and in-memory assertions are distinct from real-browser testing. Do not mark production deployment, authenticated OAuth, or PostgreSQL verification complete without an actual environment run.
