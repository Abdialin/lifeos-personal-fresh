# LifeOS Personal — V98–V101 follow-on batch
Date: 2026-11-15
Branch: main

## Implemented
- V98: CSV/XLSX schedule preview via existing private POST /api/calendar/document-preview. Header-based explicit date/start/end/title, Swedish header aliases, 2MB/row limits, duplicate skip, invalid-row counts, reject formula cells, single worksheet. Preview only. Approval is still required in existing calendar review and then Plan.
- V99: read-only Debt Chamber decision audit, including original commitment identifiers and recovery-plan/tracked linkage status; no edits to historic decisions.
- V100: optional manual exercise performance details linked to an existing non-demo logged workout, with sets/reps/load and progression helper; local-only, user-confirmed; no session/time writes.
- V101: synthetic Python unit test source for CSV/XLSX parser, including invalid dates, duplicate rows, missing headers and formulas.

## Checked during authoring
- Both V99 and V100 JavaScript source modules parsed.
- Valid exercise progression accepted, invalid zero sets rejected; workload volume calculation checked.
- index.html references both modules and server static allowlist contains both.
- Calendar UI accepts .xlsx, requirements include openpyxl, and backend routes CSV/XLSX through the new preview module.
- Python unit tests were committed but **not executed** by this tool session.
- No live Render, browser/mobile or database acceptance tests performed.

## Important remaining work
- Full account-level access control and live Friends invitations are not implemented; single-workspace credentials are insufficient for secure multi-user data.
- Android foreground chronometer and iOS Live Activities require native code and platform tests.
- Debt Chamber change/cancel decisions still need a safely versioned write path and audit.
- CSV/XLSX import must be tested against actual user files, timezone/dates, remote deployment and complete approval journey.
- Historical exercise data and manual exercise progression are not automatically unified across devices.
- Real-device timers, persistence, notifications, accessibility, security and rollback remain pending. Do not report full feature completeness or production readiness yet.
