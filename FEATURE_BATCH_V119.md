# LifeOS Personal V119 — Explicit one-time legacy backup copy to account
Date: 2026-11-15
Branch: main

## Implemented
- A gated, signed-in account review interface accepts a **user-selected** original LifeOS backup JSON from `/backup` (format `lifeos-v3.1-backup`).
- Browser previews counts of sessions, planned activities, workouts, meals and habit checks. It does **not** automatically read the existing workspace, any localStorage key, or any backend backup.
- Before approval the user must initiate a separate safety-copy download, affirm ownership/intent, and enter the exact signed-in account username.
- The new `POST /api/account/v117/workspace/migrate` requires the individual account's Bearer token, strict HTTPS-origin staging boundary, exact username confirmation, `approved=true` and `expectedRevision=0`.
- The server recomputes the original backup's SHA-256 from its canonical `{revision,data}` JSON structure and rejects mismatches.
- The backend copies the validated backup into the authenticated account **only if no workspace is already stored**. The compare-and-swap revision 0 prevents retry/overwrite collisions.
- Existing singleton LifeOS history, local activities, database backups and the previous single-user sync flow remain unmodified.
- Migration does not turn plans into tracked activities, does not merge histories and does not activate automatic account synchronization.
- New Python and Node regression tests cover preview, tamper rejection, ownership, consent, initial copy, duplicate attempt and the isolated HTTP route.

## Important limitations
- **Account features are OFF by default**, and cannot be enabled on the existing PostgreSQL-backed deployment until a separately reviewed account PostgreSQL adapter is implemented.
- This is an explicit **one-time COPY** from a selected original server backup, not a live data merge. The local device may contain more recent activity than the selected server backup. The user must verify the file and preserve existing records.
- Before any real migration, test backed-up records in an isolated staging account, confirm source and destination identity, and have a verified recovery plan.
- In the UI, a safety-copy download is initiated, not confirmed by the OS to have been retained. The user must ensure the file was saved.
- No per-account activity-tracking integration after migration yet; current timer interface remains attached to the existing legacy workspace.
- No real PostgreSQL, Render deployment, real browser, or Android device migration tested in this stage. CI results should be checked before claiming verification.

## Future requirements
- PostgreSQL account adapter, durable backup/restore and account deletion.
- Tested multi-device conflict reconciliation, explicit user-approved data merging and migration provenance.
- Individual workspace binding for all tracking modules after account login.
- Full end-to-end security, mobile and data-retention tests.
