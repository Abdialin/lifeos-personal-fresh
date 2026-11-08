# LifeOS Personal — Feature completion programme

## Decision
Complete the agreed **feature architecture and demonstrable minimum implementations** before final staging/production validation. Existing tracking data and production Render/Supabase are not changed. A passing unit test is not evidence that a feature works end-to-end in the browser.

## Inventory (verified from current UI/source; completeness is not implied)

| Feature | Current evidence | Next minimum viable deliverable | Verification required |
|---|---|---|---|
| Live activity tracking | Running/paused/finished sessions, multiple concurrent timers, corrections | Clear Start Alongside vs Switch; parent/subactivities, offline confidence | UI timer lifecycle, overlapping and overnight sessions |
| Distraction | Quick start/stop, independent timer | Distraction trends and explicit tagging | UI + overlap analytics |
| Tasks | Optional due date, priority, completion | Templates, subtasks, optional time window, schedule link | CRUD, restart persistence |
| Schedule | Planned activities, reminders | Conflicts, recurring plans, planned-vs-actual reconciliation | DST, overnight, reminder opt-in |
| Analytics | Time summary, timeline, day/week visualizations | Data completeness, measured/estimated, unlogged gaps, goal/recovery metrics | Cross-midnight, overlap and missing-data tests |
| Fitness | Workout logs and type | Umbrella types: gym/walk/run/boxing; progress targets | Workout type and metrics tests |
| Nutrition | Meal logs/calories | Nutrition details separated from time spent eating | Independent logging tests |
| Goals | Goal entry and review | Review after >=14 verified days, safe suggestions, user approval | Confidence and recovery-guard tests |
| Three-view planning | Not verified as a full UI workflow | My Reality / My Predicted Week / My Ideal Schedule | Compare views, no automatic overwrites |
| Prediction | Some goal review, no verified scheduler | Pattern discovery by day type, confidence, approval queue | Sparse data and conflicting shifts |
| Google Calendar | OAuth/import, proposed changes, audit, atomic sync infrastructure | Reliable read-only import, explicit write permissions only later | Real OAuth staging + multi-device browser |
| Sync and recovery | Revisioned workspace, audit and retry protections | Conflict resolution UI and safe recovery | Multi-device, interrupted request, backup restore |
| LifeOS Work | Conceptual future product | Separate cross-industry architecture; do not mix into Personal database yet | Requirements + prototype tests later |

## Feature batches (continue in this order)

1. **Batch A — Data contracts and metrics.** Formalize sessions, planned items, completeness, overlap, precision, overnight and time-zone semantics; add pure unit tests. Initial `lifeos_planning.py` is included in this package.
2. **Batch B — Tracking UX.** Start Alongside/Switch, pause/finish/edit, distraction, activity hierarchy, offline/retrospective confirmation.
3. **Batch C — Tasks, fitness, nutrition, goals.** Templates, time windows, subtype tracking, separate nutrition/time metrics, goals and reviews.
4. **Batch D — Schedule and three views.** Reality, predicted, ideal; conflict handling; reminders; approval-driven recommendations.
5. **Batch E — Analytics and prediction.** 7/14/30-day coverage, day-type patterns, completeness and confidence, workload/recovery checks.
6. **Batch F — Calendar and sync.** Import/approval, safe recovery, duplicate protection, multi-device conflict resolution.
7. **Batch G — LifeOS Work foundation.** Cross-industry task ownership, milestones, risks, budgets, feedback and leader dashboards as a separate module.
8. **Batch H — Integrated testing and release.** Browser E2E, Docker, isolated PostgreSQL, OAuth, backup/restore, security, accessibility and production approval.

## Definition of established
Each feature has (1) written user workflow, (2) documented data contract, (3) minimally functional implementation or explicitly marked prototype, (4) at least one focused test, (5) an integration-test placeholder, and (6) clear known limitations. **Planned** does not mean **implemented**; **unit-tested** does not mean **production-verified**.

## Initial Batch A deliverable
`lifeos_planning.py` provides read-only functions for overlapping/unique time, unlogged gaps (never auto-labelled distractions), overnight interval clipping, and conservative goal review suggestions after at least 14 verified days. It does **not** change the existing browser UI, database schema, schedule, or calendar. Current limitations: fixed 24-hour day boundaries (DST not handled), simplified recovery signals and target logic; integration into the UI remains planned.

## Release safety
No live Render, Supabase or Google Calendar changes without explicit approval and an isolated staging rehearsal. Production is gated on browser tests, real PostgreSQL tests, restore verification and OAuth integration.
