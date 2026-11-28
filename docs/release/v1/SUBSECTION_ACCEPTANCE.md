# V1 subsection acceptance matrix

Last reviewed 28 November 2026. This is a working checklist, not a release certificate. A screenshot is a comparison aid, not user approval. The [release checklist](RELEASE_CHECKLIST.md), [verification record](VERIFICATION_2026-11-27.md), [data integrity rules](../../DATA_INTEGRITY.md) and [known issues](../../KNOWN_ISSUES.md) remain authoritative for detail. References contain illustrative data; they are not data to seed into the user's account.

## Independent subsection gates

Each of the 25 rows has five independent gates. **Visual** covers implementation and an actual mobile screenshot comparison against the approved reference, including both themes and required states. **Function** covers the subsection's specified actions and data semantics. **Browser** covers integration, persistence, accessibility and regression verification in the browser using realistic synthetic records. **Android** covers the applicable actual-device behavior; **User** records the user's acceptance of that subsection. A visual or browser pass is an engineering verification, not user approval.

Use only **Not started**, **Partial**, **Passed**, **Blocked**, or **Not applicable** for each gate. `Partial` means evidence or implementation exists but not all gate criteria are met; `Blocked` requires a named dependency and must not mean simply unfinished; `Passed` requires recorded evidence for all applicable criteria. `Not applicable` requires a reason. Links in the Evidence column lead to the preserved detailed row below, which identifies references, tests and outstanding work. Device and user gates for this revision are `Not started`: older Android feedback covered selected interactions, not the current complete subsection. Safe delivery of this revision is dependent on resolving Preview storage and recovery; that dependency **does not block browser implementation or verification**.

A subsection is **fully implemented and browser-verified** when its Visual, Function and Browser gates have all passed. Complete those first three gates for all Today subsections before proceeding through Track, Plan, Goals, Insights and My Life; Android and User gates may remain pending during that work. Final release acceptance still requires every applicable gate and the cross-section and release checks below. The unchecked boxes in the detailed rows continue to indicate final acceptance, not a prerequisite for proceeding with browser development.

| Subsection | Visual | Function | Browser | Android | User | Evidence and outstanding requirements |
| --- | --- | --- | --- | --- | --- | --- |
| Today · Overview | Partial | Partial | Partial | Not started | Not started | [Details and reference](#today) |
| Today · Timeline | Partial | Partial | Partial | Not started | Not started | [Details and reference](#today) |
| Today · Agenda | Partial | Partial | Partial | Not started | Not started | [Details and reference](#today) |
| Today · Review | Partial | Partial | Partial | Not started | Not started | [Details and reference](#today) |
| Today · Activity details and gap entry | Partial | Passed | Passed | Not started | Not started | [Details and reference](#today) |
| Track · Live and concurrent activities | Partial | Partial | Partial | Not started | Not started | [Details and reference](#track) |
| Track · Focus | Partial | Partial | Partial | Not started | Not started | [Details and reference](#track) |
| Track · History, review and activity details | Partial | Partial | Partial | Not started | Not started | [Details and reference](#track) |
| Track · Manual entry and distractions | Partial | Partial | Partial | Not started | Not started | [Details and reference](#track) |
| Plan · Overview | Partial | Partial | Partial | Not started | Not started | [Details and reference](#plan) |
| Plan · Calendar | Partial | Partial | Partial | Not started | Not started | [Details and reference](#plan) |
| Plan · Tasks | Partial | Partial | Partial | Not started | Not started | [Details and reference](#plan) |
| Plan · Compare | Partial | Partial | Partial | Not started | Not started | [Details and reference](#plan) |
| Plan · Improve | Partial | Partial | Partial | Not started | Not started | [Details and reference](#plan) |
| Goals · Overview | Partial | Partial | Partial | Not started | Not started | [Details and reference](#goals) |
| Goals · Create, edit and details | Partial | Partial | Partial | Not started | Not started | [Details and reference](#goals) |
| Goals · Improve and History | Partial | Partial | Partial | Not started | Not started | [Details and reference](#goals) |
| Insights · Live and activity details | Partial | Partial | Partial | Not started | Not started | [Details and reference](#insights) |
| Insights · History and day details | Partial | Partial | Partial | Not started | Not started | [Details and reference](#insights) |
| Insights · Review, distractions and reliability | Partial | Partial | Partial | Not started | Not started | [Details and reference](#insights) |
| My Life · Hub and overview | Partial | Partial | Partial | Not started | Not started | [Details and reference](#my-life) |
| My Life · Fitness and body measurements | Partial | Partial | Partial | Not started | Not started | [Details and reference](#my-life) |
| My Life · Nutrition, water and meals | Partial | Partial | Partial | Not started | Not started | [Details and reference](#my-life) |
| My Life · Habits and routines | Partial | Partial | Partial | Not started | Not started | [Details and reference](#my-life) |
| My Life · Life areas, friends and settings | Partial | Partial | Partial | Not started | Not started | [Details and reference](#my-life) |

The [requirement-by-requirement audit](REQUIREMENT_AUDIT_2026-11-28.md) maps the supplied primary and supporting references, implemented browser-verified portions, partial work, missing functionality and unverified behavior across all six sections. Today is the active implementation priority; a partially implemented row does not count as a completed subsection.

## Today

| Subsection | Visual accuracy | Functional and integration state | Testing / acceptance still required |
| --- | --- | --- | --- |
| [ ] Overview | Partial — [target](../../design/today/reference/Overview.png), [comparison and current captures](../../design/today/COMPARISON.md); full-page density, header and icons still differ. | Live controls, individual timer/commitment details, elapsed/remaining day, day parts, tasks, plan and evidence-backed distribution are connected; no unsupported scores are invented. | `tests/today-overview-acceptance.cjs` covers selected controls, save failure, reload, day-part clipping, light/dark and mobile widths. Complete action/visual review, keyboard and device acceptance remain open. |
| [ ] Timeline | Partial — [target](../../design/today/reference/Timeline.png), [latest side-by-side comparison](../../design/today/current/v1-comparison-timeline-compact.png); label density and viewport composition still differ. | Six-hour views, proportional recorded/planned lanes, overlaps, tiny-item list and category corrections connect to Track. The duplicate timer is suppressed when the matching Timeline clock is visible; its controls remain available. | V250 and `tests/track-inline-timer.cjs` cover keyboard selection, concurrent and overnight timers, gaps, DST, navigation and scrolled timer visibility in a browser. Complete reference fidelity and the full browser acceptance matrix remain open. |
| [ ] Agenda | Partial — [supporting board](../../design/today/reference/Full_section_board.png), [comparison and new captures](../../design/today/COMPARISON.md); routine checklist and compact layout differ. | Commitments, task and habit actions, unscheduled windows and routine records use existing data; missing tracking is unverified. | Agenda habit/routine/coverage tests use synthetic records, including the first two commitment actions, several viewports and heading contrast. Scheduled routine modeling, full light-mode, visual and device checks remain open. |
| [ ] Review | Partial — [supporting board](../../design/today/reference/Full_section_board.png), [comparison](../../design/today/COMPARISON.md); page remains long. | Day navigation, coverage, category, gaps, overlaps and unverified commitments are connected. Explore further opens the relevant Track Review, timer settings, Plan Compare and classification drill-down. Per-activity averages remain incomplete: Track currently shows an overall finished-session average. | `tests/today-review-shortcuts.cjs` checks these links, correction access, focus, hit targets and unchanged records in both themes and reduced height; other review and historical-date fixtures cover selected calculations. Complete visual, keyboard and device checks remain open. |
| [ ] Activity details and gap entry | Partial — [supporting board](../../design/today/reference/Full_section_board.png), [activity details comparison](../../design/today/current/v1-comparison-activity-details.png), [gap-entry comparison](../../design/today/current/v1-comparison-gap-entry.png). The shared sheet differs from the reference's full-screen and tabbed presentation. | **Function passed** — details expose the selected interval and full-session context when different, status, category, saved notes, grouped concurrency and existing History/Track/Plan actions. Gap entry reuses the guarded manual workflow, exact untouched boundaries, context, optional category, partial/full and consecutive saves, and fresh-boundary validation. | **Browser passed** — [detail fixture](../../../tests/today-detail-evidence.cjs), [V250](../../../tests/today-v250.cjs), [precision](../../../tests/today-v250-precision.cjs), [historical dates](../../../tests/today-history-date.cjs) and [isolated authenticated server](../../../tests/authenticated-isolated-v1.cjs) cover the stated paths, rollback, reload, Track History, categories, keyboard, contrast and mobile widths. This pass covers the tested browser implementation, not native Android or user acceptance. |

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
