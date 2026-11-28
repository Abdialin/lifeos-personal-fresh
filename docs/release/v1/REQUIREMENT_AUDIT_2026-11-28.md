# V1 requirement and reference audit

Reviewed 28 November 2026 against the release specification, original master brief, [reference index](IMAGE_INDEX.md), [prior remaining-section specification](Prior_remaining_sections_spec.md), current source, existing synthetic-browser tests and [visual comparisons](../../design/authenticated-replica/README.md). This is a working assessment, not release acceptance. The original Plan references are in [the Plan library](../../design/plan/reference/); other primary and supporting references are in the [release library](../../design/release-v1/) and [Today library](../../design/today/reference/). Duplicated Goals/Insights originals are byte-identical to the corresponding primary copies. The current-implementation device captures in the supplied package are evidence, not targets.

**Status vocabulary:** **Implemented / browser-verified** means the named portion has targeted synthetic evidence, not that its entire subsection or a device has passed. **Partial** means some required behavior or presentation exists but the row lists a material omission. **Missing** means the named required behavior or presentation has not been established in the current app. **Unverified** means evidence is insufficient to decide, not that a feature is absent. Counts and percentages in reference images are examples and must not be introduced as user data. The [subsection acceptance matrix](SUBSECTION_ACCEPTANCE.md) tracks visual, functional, browser, Android and user gates separately: browser development can advance once the first three gates pass, while all applicable gates remain required for final release.

## Today — active section

Primary visual targets: [Overview](../../design/today/reference/Overview.png), [Timeline](../../design/today/reference/Timeline.png); Agenda and Review use the [full section board](../../design/today/reference/Full_section_board.png) and [supporting screens](../../design/today/reference/Supporting_screens.png). See the [current synthetic comparisons](../../design/today/COMPARISON.md). Every target must be compared in dark and light populated states at mobile widths and reduced heights; screenshots alone do not establish usability on Android.

| Requirement | Status and evidence / remaining work |
| --- | --- |
| Four tabs, current local date/time, elapsed and remaining local day | Implemented / browser-verified in `tests/today-release-v1.cjs` and theme tests; native insets remain unverified. |
| Live activity, pause/resume/finish and route to Track | Partial: each timer opens details and compact controls have synthetic save-failure/reload and mobile-width coverage; full target composition and Android behavior remain open. |
| Day progress, glance, record-based category distribution and plan/task totals | Partial: values use saved records; the target's undefined focus, balance and progress scores must not be fabricated. Visual density and direct drill-down need review. |
| Four day parts, next commitments, priorities and quick actions | Partial: paused segments count as one activity per part, durations are clipped and the first two commitments open details in synthetic tests. Full quick-action audit and target compactness remain open. |
| Overview populated/empty states, all primary controls and both themes | Partial: existing synthetic tests cover selected paths; a complete action, contrast, long-name and reduced-height audit is open. |
| 24-hour map, Now, six-hour periods, proportional actual/planned lanes and overlap | Implemented / browser-verified in V250 and V1 browser tests, including local DST examples; exact visual match and Android touch remain open. |
| Map label/category colors, accessible short-block list and details | Partial: both direct SVG controls and a list exist; complete short-block keyboard/touch, light-theme contrast and visual comparison remain open. |
| Recorded/planned/active/unlogged details, classification, original history and edit access | Implemented with targeted browser verification: details include full-session context when distinct from the selected interval, saved notes, grouped day-specific overlaps and shared categories; original Track/History/Plan actions remain. Supporting-sheet visual and broader browser verification remain open. |
| Gap workflow: full, partial and consecutive saves; fresh-boundary validation; context; remaining gap | Implemented / browser-verified by `tests/today-v250*.cjs`, `tests/today-detail-evidence.cjs` and authenticated local replica. An optional explicit category is included in the same guarded save; default leaves classification automatic/reviewable. Android input and deployed persistence remain unverified. |
| Timeline selected-period accounting and local-day navigation | Implemented / browser-verified for unique/planned totals and selected dates, including DST; full native date-picker and visual checks remain open. |
| Agenda upcoming/earlier commitments, tasks and start/remind actions | Partial: current records and actions exist; complete status combinations, stale inputs and target density require review. |
| Agenda unscheduled windows and avoidance of inferred missed commitments | Implemented / browser-verified for overlapping, adjacent and overnight plans in `tests/today-agenda-coverage.cjs`; unverified plans stay unknown. |
| Agenda habits, routines and their history | Partial: scheduled habits can be checked; saved routine logs are separately viewable. A dedicated scheduled-routine checklist matching the reference is missing. |
| Review elapsed coverage, unlogged gaps, overlaps and category drill-down | Partial: existing tests cover raw accounting, gap logging, individual overlaps and history; full light/dark and supporting-screen comparison remain open. |
| Review suppresses sub-minute warnings without discarding duration | Implemented / browser-verified in V250 tests; the raw overlap remains in totals. |
| Review evidence-based next steps, category averages and daily summary | Partial: factual gaps and overlap are shown; the complete reference's daily-summary/average actions and evidence-backed recommendations require audit. Unsupported scores are not generated. |
| Today all actions, data updates, theme, accessibility and persistence | Partial: targeted fixtures exist, including an isolated authenticated local server. Exhaustive current-interface action coverage and deployed Preview remain open. |
| Bottom navigation, timer, dialogs, keyboard and device behavior | Partial: a dedicated sticky Today timer row and selected-action clearance are browser-tested at 360–412 px, including short heights and both themes. Other layouts, native system bars, keyboard and device behavior remain unverified. |

## Track

Primary and supporting visual references: [Live](../../design/release-v1/02_Track/Live_tracking.png), [Active session](../../design/release-v1/02_Track/Active_session.png), [History](../../design/release-v1/02_Track/Activity_history.png), [Details](../../design/release-v1/02_Track/Activity_details.png), [Edit](../../design/release-v1/02_Track/Edit_activity.png), [Focus](../../design/release-v1/02_Track/Focus_mode.png), [additional flows](../../design/release-v1/02_Track/Additional_flows.png), [supporting screens](../../design/release-v1/02_Track/Supporting_screens.png), and [section board](../../design/release-v1/02_Track/Full_section_board.png). [Current comparison](../../design/track/README.md).

| Requirement | Status and evidence / remaining work |
| --- | --- |
| Live start/custom, concurrent, switch, pause/resume/finish | Partial: existing engine and `tests/track-live-controls.cjs` cover major browser actions; full reference and all state/error cases remain open. |
| Background, locked screen and persistent native notification | Unverified on a real Android device; browser wall-clock simulation is not native proof. |
| Focus study/gym, controls and alarm settings | Partial: existing countdown, pause/break and preferences work in browser; distinct modes/cycles and automatic breaks are missing, native delivery/permissions unverified. |
| Manual past entry, validation, confirmation and History | Implemented / browser-verified in V250/local replica for selected paths; full duplicate-submit and device forms need final audit. |
| Month→week→day History, filters, search and details | Partial: hierarchy and several period filters work; reference plan coverage/tag filtering and complete visual/device acceptance remain open. |
| Overnight/DST, pauses and raw segment preservation | Partial: targeted synthetic History and interval tests exist; all edits and cross-section cases require final acceptance. |
| Edit/delete, categories, synonyms and distractions | Partial: guarded edits/deletion and representative categories have tests; complete taxonomy, all classifications and user-visible error paths need review. |
| Recovery, backup/import and cross-device integrity | Partial: local synthetic review/restore and conflict tests exist; native picker, hosted durability and real-device recovery unverified. |

## Plan

Primary [Overview](../../design/release-v1/03_Plan/Overview.png), [Calendar](../../design/release-v1/03_Plan/Calendar.png), [Tasks](../../design/release-v1/03_Plan/Tasks.png), [Compare](../../design/release-v1/03_Plan/Compare.png), [Improve](../../design/release-v1/03_Plan/Improve.png); [original five designs](../../design/plan/reference/) and [supplementary board](../../design/release-v1/03_Plan/Supplementary_board.png). [Current comparison](../../design/plan/COMPARISON.md).

| Requirement | Status and evidence / remaining work |
| --- | --- |
| Overview commitments, tasks, workload, conflicts, deadlines, summary | Partial: synthetic connected overview exists; exact visual fidelity, full action and device acceptance remain open. |
| Calendar day/3-day/week/month, details, overlap and recurrence | Partial: local browser checks cover views, DST, short blocks and consent; bulk recurring-series edits and native rendering remain open. |
| Tasks grouped by deadline/completion, priority, CRUD and progress | Partial: existing editor/checkpoint tests cover common CRUD and stale writes; repeating tasks are missing and full visual/device acceptance is open. |
| Compare real/planned/predicted/ideal, 7/14/30-day data | Partial: evidence-gated series and synthetic tests exist; historical ideal-target versioning and full reference/device comparison are open. |
| Improve evidence, unverified commitments, recovery and consent | Partial: guarded review/reschedule paths exist; explicit partial/manual completion and reference composition remain incomplete. |
| Advanced tools and existing functions preserved | Partial: legacy tools are retained, including sample-data protection tests; a complete inventory and all flows need final review. |

## Goals

Primary [Overview](../../design/release-v1/04_Goals/Overview.png), [Create](../../design/release-v1/04_Goals/Create_goal.png), [Improve](../../design/release-v1/04_Goals/Improve.png), [History](../../design/release-v1/04_Goals/History.png), [calculation](../../design/release-v1/04_Goals/Review_calculation.png), [supporting screens](../../design/release-v1/04_Goals/Supporting_screens.png), [release](../../design/release-v1/04_Goals/Release_board.png) and [alternative](../../design/release-v1/04_Goals/Alternative_board.png) boards. [Current comparison](../../design/goals/README.md).

| Requirement | Status and evidence / remaining work |
| --- | --- |
| Overview progress, status, deadline and milestones | Partial: evidence and target validation exist; target status/lifecycle, milestones and reference composition are missing. |
| Create/edit measurable units, recurrence, notes and milestones | Partial: existing editor supports a subset; full units, periods, recurrence, priority/deadlines and milestones need implementation and validation. |
| Pause/resume/archive/delete and preserved historical targets | Missing or unverified as a complete lifecycle; do not infer historical targets from current settings. |
| Details, sessions, manual quantities and no double count | Partial: selected goal evidence tests cover overlaps, quantity and overnight; full detail/editor integration remains open. |
| Improve, two-week review, recommendations, history and milestones | Partial: older review/history exists; goal health, supported recommendations, lifecycle/history and full design remain incomplete. |

## Insights

Primary [original six screens](../../design/release-v1/05_Insights/Original_six_screens.png), [release](../../design/release-v1/05_Insights/Release_board.png) and [alternative](../../design/release-v1/05_Insights/Alternative_board.png) boards. [Current comparison](../../design/insights/README.md).

| Requirement | Status and evidence / remaining work |
| --- | --- |
| Live/History/Review navigation and reference presentation | Missing as the specified architecture; existing analytics are retained and do not establish the target. |
| Live weekly recorded/unique/overlap, count, chart and takeaway | Partial: underlying analytics exist; dedicated target presentation and cross-section consistency need implementation. |
| Activity filters, category cards, named details and individual records | Partial: legacy analytics and Track shortcut exist; specified integrated drill-down and reference screens need verification/implementation. |
| Weekly/monthly/custom history, denominator, weekly/day detail | Missing or unverified as complete current-interface flows; local-day/DST coverage must accompany implementation. |
| Review findings, distractions, next steps, data/reliability | Partial: legacy distraction and evidence views exist; requested structure, transparent thresholds and full editing/navigation remain open. |
| Evidence, privacy, no fabricated scores and unknown time | Partial: selected prediction guards have tests; comprehensive analytics and privacy audit is open. |

## My Life

Primary and supporting [hub](../../design/release-v1/06_My_Life/Release_hub_board.png), [routines/life areas](../../design/release-v1/06_My_Life/Overview_routines_life_areas.png), [fitness/nutrition](../../design/release-v1/06_My_Life/Fitness_nutrition.png), [fitness/nutrition variant](../../design/release-v1/06_My_Life/Fitness_nutrition_variant.png) and [alternative](../../design/release-v1/06_My_Life/Alternative_board.png) boards. [Current comparison](../../design/my-life/README.md). The release specification requires the hub; do not invent missing approved visual details.

| Requirement | Status and evidence / remaining work |
| --- | --- |
| Hub, module navigation and settings | Partial: existing tabs/settings work in part; the required dedicated hub and some destinations are missing. |
| Fitness workouts, plans, library, body measurements and trends | Partial: existing records and some Goals links work; full CRUD, measurements, target design and integration need review. |
| Nutrition meals/photos, targets, water, reminders and trends | Partial: existing workflows and targeted provenance/contrast tests exist; full visual, data and CRUD audit remains open. |
| Habits checklist, frequencies, evidence and Goals linkage | Partial: existing checks and Today bridge have tests; complete frequency, streaks, history and reference presentation remain open. |
| Routines schedules, templates, prayer/Quran and sleep | Partial: logs and history exist; dedicated schedules/checklists and template workflows remain incomplete. |
| Life areas overview, activities, targets and management | Missing or unverified as complete dedicated flows. |
| Friends/challenges, privacy and sharing | Partial: local-only tools exist; authenticated consent-based shared accounts, revocation and privacy controls are not established. |
| Settings, backups, privacy, import/export and offline/reconnect | Partial: existing advanced tools and local recovery tests remain; native and hosted durability/recovery are unverified. |

## Cross-section and supporting references

The four [summary boards](../../design/release-v1/07_Summary/) are supporting orientation, not a source of invented measurements. Across all sections, raw total/unique/overlap, local day length, classification corrections, shared records, offline queues, approved plan changes, backup/recovery and Android navigation must be verified against the [release checklist](RELEASE_CHECKLIST.md). Synthetic local PostgreSQL/TLS migration tests passed on the isolated branch; Neon/Supabase hosted behavior, Preview recovery, redeployment and paid-resource decisions remain unresolved in the [provider evaluation](../../PREVIEW_FREE_POSTGRES_EVALUATION.md). Do not create a provider resource or move personal data without the user's approval. The [historical diagnostic triage](HISTORICAL_DIAGNOSTIC_TRIAGE.md) records all 27 old failures/errors and explicitly identifies genuine current-interface defects already corrected alongside unverified scenarios.
