# Stage 34 — atomic calendar transaction API

New authenticated `POST /api/calendar/commit` accepts `{ "revision": 0, "data": {"version":1,"sessions":[],"events":[]}, "decision": {"id":"unique-id","at":"ISO time","action":"reschedule","planId":"plan-id","proposalId":"proposal-id"} }`.

Uses the same Basic authentication and `X-LifeOS-Token` as existing private API endpoints. Returns `committed`, `duplicate`, `revision_conflict`, or `decision_conflict`. SQLite and PostgreSQL execute state update and audit insertion in a single transaction. Duplicate IDs with identical audit entries return idempotent success; different entries with the same ID are rejected. Existing `/api/state` and `/api/calendar/audit` endpoints remain for compatibility.

**Important:** The browser still uses the Stage 33 two-step save/audit process. It has NOT been migrated to `/api/calendar/commit`. Consequently end-to-end atomicity and full multi-device recovery are NOT complete. The endpoint is an opt-in foundation only; production migration requires coordinating client outbox, retry semantics, and existing queued records. No live database or Google Calendar was accessed.

Run `python -m unittest test_stage34.py` for isolated SQLite tests. PostgreSQL integration and interactive browser tests remain pending.
