# V1 subsection acceptance matrix

Last reviewed 28 November 2026. This is a working checklist, not a release certificate. `Partial` means that some behavior or browser evidence exists while one or more acceptance criteria remain open. `Open` means the requested design, behavior or verification is not established. A screenshot is a comparison aid, not user approval. The [release checklist](RELEASE_CHECKLIST.md), [verification record](VERIFICATION_2026-11-27.md), [data integrity rules](../../DATA_INTEGRITY.md) and [known issues](../../KNOWN_ISSUES.md) remain authoritative for detail.

Each row remains unchecked until its reference and delivered screens have been compared, its listed functions and integration have been tested with realistic synthetic data, mobile and accessible light/dark presentation has been reviewed, and applicable Android and user acceptance has been recorded. References contain illustrative data; they are not data to seed into the user's account.

The [requirement-by-requirement audit](REQUIREMENT_AUDIT_2026-11-28.md) maps the supplied primary and supporting references, implemented browser-verified portions, partial work, missing functionality and unverified behavior across all six sections. Today is the active implementation priority; a partially implemented row does not count as a completed subsection.

## Today

| Subsection | Visual accuracy | Functional and integration state | Testing / acceptance still required |
| --- | --- | --- | --- |
| [ ] Overview | Partial — [target](../../design/today/reference/Overview.png), [comparison and current captures](../../design/today/COMPARISON.md); full-page density, header and icons still differ. | Live controls, individual timer/commitment details, elapsed/remaining day, day parts, tasks, plan and evidence-backed distribution are connected; no unsupported scores are invented. | `tests/today-overview-acceptance.cjs` covers selected controls, save failure, reload, day-part clipping, light/dark and mobile widths. Complete action/visual review, keyboard and device acceptance remain open. |
| [ ] Timeline | Partial — [target](../../design/today/reference/Timeline.png), [comparison](../../design/today/COMPARISON.md); label density and actual device treatment need review. | Six-hour views, proportional recorded/planned lanes, overlaps, tiny-item list and category corrections connect to Track. | V250 tests cover samples, overlaps, gaps, DST and navigation in a browser. Full device touch and visual acceptance remain open. |
| [ ] Agenda | Partial — [supporting board](../../design/today/reference/Full_section_board.png), [comparison and new captures](../../design/today/COMPARISON.md); routine checklist and compact layout differ. | Commitments, task and habit actions, unscheduled windows and routine records use existing data; missing tracking is unverified. | Agenda habit/routine/coverage tests use synthetic records, including the first two commitment actions, several viewports and heading contrast. Scheduled routine modeling, full light-mode, visual and device checks remain open. |
| [ ] Review | Partial — [supporting board](../../design/today/reference/Full_section_board.png), [comparison](../../design/today/COMPARISON.md); page remains long. | Day navigation, coverage, category, gaps, overlaps and unverified commitments are connected. | Existing review and historical-date fixtures cover targeted calculations; complete visual, keyboard and device checks remain open. |
| [ ] Activity details and gap entry | Partial — [supporting screens](../../design/today/reference/Supporting_screens.png); current captures need refreshed comparison. | Track's details and manual-entry workflow retain exact unedited boundaries, support partial gaps and revalidate before save. | V250 precision and recovery fixtures pass in browser; Android picker, keyboard and final acceptance remain open. |

## Track

| Subsection | Visual accuracy | Functional and integration state | Testing / acceptance still required |
| --- | --- | --- | --- |
| [ ] Live and concurrent activities | Partial — [reference](../../design/release-v1/02_Track/Live_tracking.png), [comparison](../../design/track/README.md). | Quick starts and independent timer controls use existing Track records and shared day accounting. | Browser start/pause/resume/finish and simulated suspension are covered; background/notification/device checks remain open. |
| [ ] Focus | Partial — [reference](../../design/release-v1/02_Track/Focus_mode.png), [comparison](../../design/track/README.md). | Existing focus timer, break, pause and alarm preferences remain available; distinct modes/cycles and automatic breaks are incomplete. | Browser controls and simulated alarm behavior covered; native permissions, alarms, DND and device behavior unverified. |
| [ ] History, review and activity details | Partial — [history](../../design/release-v1/02_Track/Activity_history.png), [details](../../design/release-v1/02_Track/Activity_details.png). | Period filtering, segment-preserving details/edit and category drill-down use shared records; missing plan coverage and tags remain open. | Synthetic overnight, pauses, overlap and edit checks exist; complete reference, keyboard and native review remain open. |
| [ ] Manual entry and distractions | Partial — [supporting screens](../../design/release-v1/02_Track/Supporting_screens.png). | Past entries and distraction edits/deletion use guarded existing persistence; unknown time is separate. | Browser failure/rollback and reload checks exist; device forms, category paths and final visual review remain open. |

## Plan

| Subsection | Visual accuracy | Functional and integration state | Testing / acceptance still required |
| --- | --- | --- | --- |
| [ ] Overview | Partial — [reference](../../design/release-v1/03_Plan/Overview.png), [comparison](../../design/plan/COMPARISON.md). | Commitments, tasks, workload, conflicts and deadlines use workspace data. | Synthetic populated/empty and mobile tests exist; native acceptance and exact reference fidelity remain open. |
| [ ] Calendar | Partial — [reference](../../design/release-v1/03_Plan/Calendar.png), [comparison](../../design/plan/COMPARISON.md). | Day/3-day/week/month, details, recurrence preview and conflicts use current plans and sessions. Bulk series edits are incomplete. | Browser DST, short blocks, scrolling and approval covered; native scrolling/date picker and visual acceptance remain open. |
| [ ] Tasks | Partial — [reference](../../design/release-v1/03_Plan/Tasks.png). | Add/edit/complete/delete use the guarded task sheet; repeating tasks are not yet supported. | Synthetic CRUD, stale/failure and reload tests exist; visual and device acceptance remain open. |
| [ ] Compare | Partial — [reference](../../design/release-v1/03_Plan/Compare.png). | Reality, plans, available predictions and configured ideal are distinct. Historic ideal targets are not versioned. | Browser raw-time, period and evidence tests exist; visual and native acceptance remain open. |
| [ ] Improve | Partial — [reference](../../design/release-v1/03_Plan/Improve.png). | Evidence checks and recovery preview require approval; explicit partial/manual completion remains incomplete. | Consent, stale/conflict and insufficient-evidence tests exist; full reference and device review remain open. |

## Goals

| Subsection | Visual accuracy | Functional and integration state | Testing / acceptance still required |
| --- | --- | --- | --- |
| [ ] Overview | Partial — [reference](../../design/release-v1/04_Goals/Overview.png), [comparison](../../design/goals/README.md). | Target validity and unique elapsed duration use existing evidence; target status/lifecycle and milestones remain incomplete. | Synthetic target/overlap/overnight and both themes tested; complete visual and device review open. |
| [ ] Create, edit and details | Partial — [create](../../design/release-v1/04_Goals/Create_goal.png), [supporting screens](../../design/release-v1/04_Goals/Supporting_screens.png). | Existing editor retained; units, recurrence, milestone and pause/archive/delete lifecycle are not complete. | Full validation, persistence, history and reference checks remain open. |
| [ ] Improve and History | Partial — [Improve](../../design/release-v1/04_Goals/Improve.png), [History](../../design/release-v1/04_Goals/History.png), [comparison](../../design/goals/README.md). | Existing prior-week evidence and drill-down work; recommendations, historical targets, completed/archived history and milestones are incomplete. | Targeted browser theme and navigation tests exist; full visual, integration and device acceptance open. |

## Insights

| Subsection | Visual accuracy | Functional and integration state | Testing / acceptance still required |
| --- | --- | --- | --- |
| [ ] Live and activity details | Open — [reference board](../../design/release-v1/05_Insights/Release_board.png), [current evidence](../../design/insights/README.md); specified Live/History/Review architecture is incomplete. | Existing analytics use recorded evidence; full activity filters, detail and cross-section definitions need audit. | Prediction-evidence tests cover malformed, example and paused sessions; full visual/data consistency and device checks open. |
| [ ] History and day details | Open — [original screens](../../design/release-v1/05_Insights/Original_six_screens.png). | The existing shortcut reaches Track History; full Insights period navigation and drill-downs remain to be implemented and connected to shared interval accounting. | Synthetic populated/empty shortcut tests cover read-only navigation. Overnight, DST, denominator and cross-section tests must be completed against the delivered screens. |
| [ ] Review, distractions and reliability | Open — [reference board](../../design/release-v1/05_Insights/Release_board.png). | Existing distraction tools must remain available; the specified reliability and next-step presentation is incomplete. | Validate evidence thresholds, edits/deletion, unknown time and privacy; visual/device acceptance open. |

## My Life

| Subsection | Visual accuracy | Functional and integration state | Testing / acceptance still required |
| --- | --- | --- | --- |
| [ ] Hub and overview | Partial — [hub reference](../../design/release-v1/06_My_Life/Release_hub_board.png), [local comparison](../../design/authenticated-replica/README.md). | Existing navigation remains; full requested module hub and life areas are incomplete. | Browser section navigation and focused contrast checks exist; all module states and device acceptance open. |
| [ ] Fitness and body measurements | Partial — [reference](../../design/release-v1/06_My_Life/Fitness_nutrition.png). | Existing workout/body records and Goals links retained; complete history, measurements and target presentation require audit. | Synthetic cross-section fitness tests exist; CRUD, units, historical records and reference verification remain open. |
| [ ] Nutrition, water and meals | Partial — [reference](../../design/release-v1/06_My_Life/Fitness_nutrition.png), [target-panel captures and comparison](../../design/my-life/README.md); the current long nested panel differs from the dedicated reference screen. | Existing meals, water and photo mechanisms retained. New work avoids automatically saving illustrative targets and labels uncertain legacy examples; trends, targets and unknown-intake treatment require full verification. | Synthetic target persistence and selected light-mode contrast tested; full forms, reminders, data and device checks open. |
| [ ] Habits and routines | Partial — [reference](../../design/release-v1/06_My_Life/Overview_routines_life_areas.png). | Existing habit checks and routine logs connect to Today; scheduled routine definitions and richer history are incomplete. | Stale/failed saves, routine history and keyboard focus have targeted browser tests; full schedule, privacy and visual checks open. |
| [ ] Life areas, friends and settings | Open — [hub reference](../../design/release-v1/06_My_Life/Release_hub_board.png). | Local challenge and existing settings/recovery remain; life areas and secure consent-based sharing are incomplete. | Do not present local-only challenges as live social accounts. Privacy, CRUD, backup/recovery and device acceptance remain open. |

## Cross-section and release gates

- [ ] Reconcile raw recorded, unique, overlap, unlogged and remaining durations across all six sections, including pauses, overnight and 23/25-hour local days.
- [ ] Complete classification, edit propagation, sync, offline, backup and restore coverage without modifying personal records. The [historical diagnostic triage](HISTORICAL_DIAGNOSTIC_TRIAGE.md) separates obsolete entry points from scenarios that still need current-interface tests.
- [ ] Establish an approved, separate persistent Preview database and verified recovery/cutover. The [provider evaluation](../../PREVIEW_FREE_POSTGRES_EVALUATION.md) remains research only.
- [ ] Verify actual Samsung system insets, gesture/three-button navigation, keyboard, notifications, alarms and background execution in a later controlled signed Preview build. No browser screenshot proves these behaviors.
- [ ] Record user acceptance subsection by subsection and obtain explicit approval before production promotion.
