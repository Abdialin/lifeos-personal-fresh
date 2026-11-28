# Today follow-up verification — 28 November 2026

Application revision `0399a6838746f8ff1613657d304c783cb885a1a3` is on the isolated `codex/preview-storage-safety-20261127` branch. The [requirement audit](REQUIREMENT_AUDIT_2026-11-28.md) and [acceptance matrix](SUBSECTION_ACCEPTANCE.md) remain open: no complete Today subsection or V1 section has been certified.

## Evidence and remaining acceptance work

- The [Today comparison](../../design/today/COMPARISON.md) includes side-by-side reference, synthetic dark and synthetic light views for Overview, Timeline, Agenda and Review, plus 360/393/412 px and short-height captures. The references contain illustrative data; the browser fixture is isolated from accounts and the network.
- Overview exposes the recorded details and primary timer actions, counts one activity across paused segments within a day part and clips the shown duration to that part. Timeline has earlier date navigation and a compact expandable live-details row. These changes improve selected criteria but do not match the reference's overall density and icon treatment.
- A Today-only sticky timer row and selected actions were checked while scrolling at mobile browser sizes; Track's existing floating fallback and concurrent/overnight selection were checked separately. This does not prove that every browser control, Samsung safe area, gesture bar or native keyboard is unobstructed.
- Agenda still lacks the specified scheduled-routine checklist. Review and supporting sheets remain longer or visually different from their references. The full action, accessibility, device and user-acceptance gates remain open.

## Local results

The following passed locally with intercepted synthetic records unless noted:

- Today foundation, integration, V250 interaction/classification/precision/high-volume, release, Overview acceptance, timer clearance, theme, Review categories/history, Agenda habits/coverage/routines and historical-date browser tests. A subsequent local V250 check also activated a recorded map item with Enter and Space and opened a very short item by keyboard from the alternative list.
- Track live controls, calendar periods, background-clock simulation, inline/floating timers, Focus, record details, timer settings and distraction review.
- Recovery reviewed merge, uncertain synchronization acknowledgement, two-browser stale conflict against disposable SQLite, and the authenticated six-section test against a disposable local server and SQLite database.
- Plan Overview and Concept A models, Plan evidence guards, Goals unique-duration and cross-section calculations, Android bridge mock and static-asset checks; the Python Preview target security checks passed 4/4.

Browser timing, a mocked Android bridge and local SQLite do not establish native background execution, notifications, actual device inputs or hosted Preview persistence. The existing [historical diagnostic triage](HISTORICAL_DIAGNOSTIC_TRIAGE.md) identifies the first old-layout failure for each of the previous 6 failures and 21 errors; underlying scenarios remain partially covered or open as documented there.

## GitHub Actions on the application revision

Seven manually dispatched workflows completed successfully: [isolated module tests](https://github.com/Abdialin/lifeos-personal-fresh/actions/runs/46096786685), [disposable PostgreSQL reliability](https://github.com/Abdialin/lifeos-personal-fresh/actions/runs/46096787264), [current UI checks](https://github.com/Abdialin/lifeos-personal-fresh/actions/runs/46096786862), [Preview runtime](https://github.com/Abdialin/lifeos-personal-fresh/actions/runs/46096787538), [Today browser suite](https://github.com/Abdialin/lifeos-personal-fresh/actions/runs/46096788457), [mobile visual suite](https://github.com/Abdialin/lifeos-personal-fresh/actions/runs/46096787713), and [Today presentation](https://github.com/Abdialin/lifeos-personal-fresh/actions/runs/46096786966). The UI workflow's historical V4 diagnostic is **non-gating**: its log again reports 6 failures and 21 errors among 31 tests. A green workflow therefore does not mean those old tests passed. The later keyboard assertions were run locally after this workflow; application code is unchanged by that test addition.

## Infrastructure boundary

No database provider or paid resource was provisioned, and no personal account, production/staging data, Preview deployment, signing keys or application identity was changed. Neon and Supabase remain unevaluated on a live provider. A separate approved persistent database, safe recovery/cutover and deployed verification are still required before redeploying the current Preview.
