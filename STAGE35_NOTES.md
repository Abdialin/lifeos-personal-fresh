# Stage 35 — client atomic calendar commit

The browser now routes queued workspace snapshots containing a calendar decision through `POST /api/calendar/commit` rather than the ordinary state PUT. It uses the immutable queued snapshot and stable decision ID for retries. A duplicate response requires verifying the current server snapshot before acknowledging the local queue. Once the last queued operation is acknowledged, the client removes the delivered decision from its local pending queue and synchronizes the resulting workspace update. The older independent audit-upload path is disabled to avoid inconsistent two-step commits.

## Limits
- Live PostgreSQL and Google OAuth were not exercised.
- Full Chromium UI interaction was not exercised.
- Multi-device concurrent edits are rejected by revision checks, not automatically merged.
- Server still supports the legacy audit API for compatibility; the Stage 35 client does not use it.
- Recovery after a later unrelated server update can require manual conflict resolution.
