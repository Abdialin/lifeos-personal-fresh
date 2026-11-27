# Testing and evidence

All browser fixtures in `tests/today-v250*.cjs`, `tests/plan-overview.cjs` and `scripts/capture-design-baselines.cjs` intercept requests: local repository assets are served to an isolated Preview-origin browser context, and other requests are blocked/fulfilled offline. They never need a real account or user history.

`tests/authenticated-isolated-v1.cjs` is different: it starts a temporary local Python server with a new random login and sync token and a new temporary SQLite file, blocks nonlocal browser requests, and uses real login, recovery and sync HTTP endpoints with synthetic records. It verifies the recovery downloads before explicitly restoring the fixture, then exercises a partial gap, History, a task change, server readback and reload. It also simulates an empty server response for a populated device, first with pending changes and then after the queue has been acknowledged; it checks that loading and stale uploads do not replace the local workspace or write to the simulated empty server. The real temporary server remains intact during that simulation. It captures all current primary tabs in dark/light when `AUTH_V1_CAPTURE_DIR` is set. The temporary database and files are removed in `finally`. This is not the Render database, a production account, a native-device test or a complete cross-device sync certification. Some behavior guarded by the Preview hostname is not exercised on localhost.

With Node and Playwright/Chromium installed, from the repository root:

```sh
node tests/today-a-plus-browser.cjs
node tests/today-a-plus-integration.cjs
node tests/today-v250.cjs
node tests/today-v250-colors.cjs
node tests/today-v250-precision.cjs
node tests/today-v250-volume.cjs
TODAY_V1_CAPTURE=1 node tests/today-release-v1.cjs
TODAY_THEME_CAPTURE=1 node tests/today-theme-sync.cjs
node tests/today-review-categories.cjs
TODAY_REVIEW_HISTORY_CAPTURE=1 node tests/today-review-history.cjs
TODAY_AGENDA_CAPTURE=1 node tests/today-agenda-habits.cjs
TODAY_ROUTINES_CAPTURE=1 node tests/today-agenda-routines.cjs
node tests/today-history-date.cjs
TRACK_PERIOD_CAPTURE=1 node tests/track-calendar-periods.cjs
node tests/track-live-controls.cjs
TRACK_INLINE_CAPTURE=1 node tests/track-inline-timer.cjs
TRACK_FOCUS_CAPTURE=1 node tests/track-focus-mode.cjs
TRACK_DETAIL_CAPTURE=1 node tests/track-record-details.cjs
TRACK_TIMER_CAPTURE=1 node tests/track-timer-settings.cjs
TRACK_DISTRACTION_CAPTURE=1 node tests/track-distraction-review.cjs
node test_stage74_accountability.cjs
node test_stage70_persistence.cjs
node test_stage78_duration.cjs
node test_stage80_duration_profiles.cjs
node --test test_track_design_v126.test.cjs test_track_focus_v127.test.cjs test_track_polish_v128.test.cjs test_track_visual_v129.test.cjs
node test_plan_evidence_v250.cjs
node tests/plan-overview-model.cjs
PLAN_OVERVIEW_CAPTURE=1 node tests/plan-overview.cjs
node tests/plan-concept-a-model.cjs
PLAN_CAPTURE=1 node tests/plan-concept-a.cjs
PLAN_CALENDAR_CAPTURE=1 node tests/plan-calendar-sticky.cjs
PLAN_DST_CAPTURE=1 node tests/plan-calendar-dst.cjs
PLAN_TASK_CAPTURE=1 node tests/plan-task-editor.cjs
node tests/plan-task-checkpoint.cjs
PLAN_COMPARE_CAPTURE=1 node tests/plan-compare-chart.cjs
node tests/plan-duration-evidence.cjs
PLAN_IMPROVE_CAPTURE=1 node tests/plan-improve-evidence.cjs
PLAN_SKIP_CAPTURE=1 node tests/plan-skip-consent.cjs
SERIES_CAPTURE=1 node tests/plan-series-consent.cjs
REMINDER_CAPTURE=1 node tests/plan-reminder-skip.cjs
node scripts/capture-design-baselines.cjs
node test_goal_fitness_cross_section_v204.cjs
node test_personal_goals_integration.cjs
node test_cross_section_integrity_v206.cjs
GOALS_READING_CAPTURE=1 node tests/goals-reading-evidence.cjs
MY_LIFE_CAPTURE=1 node tests/my-life-subsections.cjs
AUTH_V1_CAPTURE_DIR=authenticated-verification node tests/authenticated-isolated-v1.cjs
node test_unified_analytics.cjs
node test_tracking_recovery.cjs
node test_android_bridge_v231.cjs
node test_static_asset_routes.cjs
python3 test_frontend_static_assets_v236.py
```

The shared-theme test changes the preference from Today and Plan, navigates all six sections and reloads. The timer-visibility test covers matching and different concurrent timers, scroll, tabs, expanded controls, overnight day portions and reduced browser heights without editing sessions. The My Life test checks subsection visibility, no repeated general panel, routine control ordering, access to the local challenge editor and legacy sharing, preserved records, both themes, three mobile viewport sizes and WCAG contrast for the visible Fitness/Nutrition headings and nutrition metric text. It is a targeted check, not an audit of every My Life component.

The timer test also checks the compact collapsed Today timer's activity name, 44-pixel control, Agenda habit access and 360/393/412-pixel mobile viewports, including a 460-pixel height. `TODAY_COMPACT_TIMER_CAPTURE=1` writes synthetic dark/light Agenda images. This does not establish Android keyboard or system-inset behavior.

`test_postgres_persistence_v217.py` and `test_preview_migration_postgres.py` require explicit opt-in and a disposable PostgreSQL server on localhost. They test competing calendar/workspace saves, offline SQLite and state-only JSON validation, a migration into a newly created empty database, rejection and rollback cases, `pg_dump`/`pg_restore` into a separate disposable database and application restart. The GitHub workflow uses PostgreSQL 16; the local rehearsal used PostgreSQL 17. They never connect to Render and do not verify Render redeploys or managed point-in-time recovery. See the [storage runbook](PREVIEW_STORAGE_RUNBOOK.md).

The V250 tests cover selected map items, short intervals, full/partial/consecutive gap saves, invalid/stale boundaries, exact unedited millisecond endpoints, reload persistence, overlapping/overnight/paused records, explicit and ambiguous categories, representative Goals/Insights category paths, empty and 132-record states, 23/25-hour days, themes, six navigation sections and reduced browser heights. To recreate the synthetic high-volume image, run `LIFEOS_CAPTURE_VOLUME=1 node tests/today-v250-volume.cjs` and copy `today-verification/high-volume.png` to `docs/design/today/current/timeline-high-volume.png`.

The Plan tests cover precise task-deadline ordering, local-week and daylight-saving boundaries, overnight and paused sessions, overlapping intervals and conflicts, explicit completion evidence, empty and high-volume models, search, editing/toggling tasks, adding a plan, Track-to-Plan refresh, reload persistence, dark/light themes, reduced viewports, bottom clearance, settings, and navigation. The browser fixture writes only to intercepted synthetic local storage. With capture enabled it writes `plan-verification/overview-dark.png`, `overview-light.png`, `overview-bottom.png` and `overview-dark-full.png`.

The task-sheet fixture covers the four supported timing types, invalid dates, equal or reversed times and estimates, preservation of original timestamps and unrelated fields, cancellation, stale saves and deletes, in-app deletion confirmation, simulated checkpoint failures, successful retry, reload persistence, focus confinement, reduced viewports, both themes and a task created through the retained original manager. It uses synthetic local records and captures three screenshots under `docs/design/plan/current/`. It does not verify a native Android keyboard or cloud synchronization.

The task-checkpoint fixture intercepts synthetic checkpoint reads to return a task array that differs from the actual saved one. It checks that both task creation and deletion report an unverified result and disable blind retries, then reloads the actual saved synthetic checkpoint to verify what was stored. The V70 model test covers matching and mismatched additional arrays for both checkpoint formats. No real account, backup or server is accessed.

The comparison fixture checks the hour-axis labels and bar proportions against raw daily unique durations, recorded and planned averages and their denominators, unavailable predicted and ideal data, evidence-gated recorded-time insight cards and current-ideal ratios, the daily-values table, 7/14/30-day ranges, empty states, themes, reduced viewports, navigation clearance and read-only behavior. Captures use only synthetic offline records.

The Improve fixtures check the median-based duration rule with pauses, insufficient, old, sample, duplicate, future and inconsistent evidence, local daylight-saving boundaries, a bounded 20-record history, and independently recorded sessions over 24 hours. Browser tests open underlying activities and plans, expand lists of 12 duration checks, 13 unverified plans and nine shortfalls, preserve unverified plans, and show unavailable states when the analysis modules are missing. They compare empty/populated and light/dark states and verify browsing makes no workspace mutation. Shared accountability tests also reject example, duplicate-ID and future-dated timers as recovery evidence. For an explicitly skipped synthetic commitment the browser checks all four recovery choices, no write on preview or cancellation, preview invalidation from both input and change events, a conflict introduced while confirmation is open, failed checkpoint rollback, explicit in-app approval and reload persistence. Captures use intercepted synthetic records; they do not establish native-device behavior.

GitHub workflows: `.github/workflows/preview-runtime.yml`, `today-a-plus-browser.yml`, `today-aplus-mobile-visual.yml`, and `today-presentation-check.yml`. The mobile workflow captures multiple widths and themes and checks geometry; screenshots are evidence, not automatic visual approval against a supplied reference. The visual library contains synthetic prior/current captures and comparison notes.

Browser tests cannot verify Samsung WebView system insets, native IME, gesture/three-button navigation, notifications, vibration, background execution or signing. Record those as device checks only after observing the actual device. Do not weaken time, persistence or geometry assertions to make CI pass.

The Plan Concept A+ tests cover all four new subsection presentations, calendar views, individual activity details, task edits, recurring-series preview and approval, conflict revalidation, failed-storage rollback, reload persistence, aligned comparison windows and evidence cutoffs, paused time, DST recurrence rejection, empty and 132-record states, themes, navigation and reduced browser heights. Captures in `plan-verification/` are intercepted synthetic fixtures. See `docs/design/plan/COMPARISON.md` for visual differences and open device checks.

The Calendar heading fixture checks that the day headings remain visible during vertical scrolling and follow horizontal scrolling in both directions, with the time axis and day columns aligned. It also checks proportional overlapping blocks, a very short activity through the accessible list, modal scroll locking, empty states, themes, reduced viewports and read-only navigation. It captures synthetic browser images; Samsung WebView behavior is not established.

The Calendar clock-change fixture checks the 23- and 25-hour Stockholm days and a 24.5-hour Lord Howe day, missing and repeated local times, per-day scales, proportional interval geometry, exact offsets in activity details, the accessible list, single-day and three-day views, light-mode contrast, read-only browsing and rejection of an ambiguous recurring series in its preview. Model tests also cover ambiguous start and end times and half-hour transitions. `PLAN_DST_CAPTURE=1` saves synthetic screenshots; native device rendering has not been tested.

The Plan skip fixture verifies cancellation and focus, rejected checkpoint writes, explicit approval and audit, preservation of the original plan without creating a session, a plan moved during confirmation, duplicate identifiers, malformed audit data, recovery visibility, exclusion from Today’s unverified commitments, reload persistence, the original schedule control and light/dark sheets. It blocks network requests and uses synthetic local records; native behavior is not established.

The repeated-plan consent fixture exercises the visible occurrence preview, cancellation and focus, form changes while confirmation is open, a conflicting plan moved into the series, failed checkpoint writes, explicit approval and reload persistence. It also checks light/dark confirmation, a reduced browser height and absence of native browser dialogs. `SERIES_CAPTURE=1` saves synthetic screenshots; it does not verify Android WebView behavior or recurring tasks.

The browser reminder fixture checks skipped, completed, linked and duplicate-ID commitments, a queued plan skipped while another reminder is visible, retraction of a visible reminder, continued reminders for eligible plans, snooze, and actual Start now timer creation. It verifies both on-screen prompts remain operable at 360×460 and captures a synthetic screenshot with `REMINDER_CAPTURE=1`. Browser notification calls are intercepted; this does not test Android system notifications or the lock screen.

The Today V1 fixture checks record-based overview values and navigation into existing editors, partial-period union accounting, category drill-down, proportional overlap lanes, short interval access, cancelled-plan exclusion, task completion and reload persistence, light mode and browser viewport clearance. Review assertions verify category bars against raw duration, full accessible labels, touch target height, intelligence order and selected light-mode text contrast. The Agenda routines fixture checks local-day selection and rollover, empty and explicitly marked example records, safe display of malformed imported values, existing form and history navigation, paging through 32 records without mutation, rejection of a duplicated identifier and a deliberately stale displayed snapshot, cancellation and confirmation of one synthetic deletion, a single save and reload, unchanged time-accounting metrics, targeted light-mode history contrast and several browser viewport sizes. The separate authenticated replica also checks routine history after the guarded server restore. With capture enabled these write synthetic images under `docs/design/today/current/release-*.png` and `docs/design/my-life/current/v1-subsection-routine-history-*.png`. Reference comparison notes and remaining discrepancies are in `docs/design/today/COMPARISON.md`.

The Today Agenda habit fixture checks scheduled and unscheduled habits, completion and undo from Today and My Life, retention of linked evidence, opt-in automatic-check dismissal, stale and duplicate checks, failed checkpoint writes, reload persistence, light-mode controls and reduced browser heights. It uses only synthetic, offline records. `TODAY_AGENDA_CAPTURE=1` saves dark and light browser screenshots; it does not verify Android input or system insets.

The synthetic Review category fixture checks an empty day and a ten-category day, including disclosure labels, raw-duration bar widths and individual category drill-down. The fixture does not connect to a real Preview account.

The historical Review fixture checks local-day date navigation and future-date rejection, previous-day totals and overlaps, unverified commitment details, partial gap logging and persistence, category drill-down to the same Timeline day, a midnight transition, 23- and 25-hour days and reduced browser viewports. `TODAY_REVIEW_HISTORY_CAPTURE=1` saves a synthetic previous-day screenshot.

The synthetic Goals reading fixture checks that the daily chart uses the same goal evidence rules as weekly totals, does not infer a daily target, excludes assumed and future-dated entries, preserves date-only logs entered today, deduplicates linked sessions, and handles pauses, overnight sessions and a daylight-saving change. It also checks the affected light-mode heading contrast. Capture mode writes browser screenshots; it does not establish completion or approval of the Goals redesign.

The historical Today timeline test covers date-picker and previous/next-day navigation, future-date rejection, overnight session identity, full and partial gap logging on earlier days, a second writer invalidating a selected gap, exact local-midnight boundaries, reload persistence, restored Track History record clicks and correct overnight day-portion details, and 23-/25-hour days. Requests are intercepted and storage is synthetic.

Track calendar-period browser fixtures check History's day/week/month/year/all-time and custom-range navigation, invalid and future range rejection, activity/category filters, chronological sorting, raw recorded totals and averages, explicit category precedence, cross-midnight session identity and no mutation while browsing. They also check Review's category/activity groupings, Today color consistency, Other / review drill-down, category correction, failed-save rollback and reload persistence, chart scope and zero-day bars, year and daylight-saving boundaries, selected light-mode text contrast and reduced mobile viewports. The Live control fixture checks pause/resume, the expiring two-step finish confirmation, independent concurrent timers, quick starts and reload persistence. Both intercept requests and use synthetic records. `TRACK_PERIOD_CAPTURE=1` writes synthetic Live, History and Review captures under `docs/design/track/current/v1-*.png`; these are comparisons, not evidence of native-device verification.

The intercepted Focus fixture checks starting, pausing, resuming, breaks, minimizing, reload recovery and ending while preserving a separate tracked activity. It also checks saved sound/vibration preferences, failure feedback and restoration after a rejected storage write, visibility of primary controls at mobile sizes and selected light-mode contrast. `TRACK_FOCUS_CAPTURE=1` writes synthetic Focus setup and running screenshots. This does not verify Android alert sound, vibration, Do Not Disturb, background execution or notification delivery.

The synthetic History detail fixture checks aggregation of multiple segments into one day portion, full-session and selected-day durations, original timestamps, explicit category, notes, significant pauses, individual overlaps and suppression of sub-minute entries. It checks cancellation, a simulated failed recovery-checkpoint write, a successful name/notes edit retaining exact timestamps and all segments, and a finish-time edit that preserves an activity's paused interval. For an explicit segment replacement it tests in-app cancellation, keyboard focus, rejection when the record changes during confirmation, approved replacement and retention of the original timeline in the audit. The original editor is also exercised; results are checked after reload without browser alert or confirm dialogs. It also checks primary action clearance and selected light-mode contrast. `TRACK_DETAIL_CAPTURE=1` writes synthetic detail screenshots.

The synthetic timer-settings fixture verifies reminder configuration, recovery-checkpoint failure and rollback, reload persistence, explicit consent for automatic finish, cancellation, rejection of changes to a timer while the confirmation is open, and the absence of running timers. It checks duration profiles for new activities, failed storage writes, malformed profile data, and preservation of profiles changed since the panel opened and unrecognized fields. It also checks light-mode contrast and control reachability in reduced browser viewports. `TRACK_TIMER_CAPTURE=1` writes timer and consent screenshots. These checks do not establish native notification delivery, background execution or automatic finish timing on Android.

The synthetic distraction fixture checks shared category precedence, explicit corrections, ambiguous names, period-scoped totals, individual overnight day portions, subtype and trigger edits, stale and failed saves, and reload. It checks that simultaneous timers are reviewed and finished individually, that failed starts preserve existing timers, and that older interruptions remain accessible in History. Deletion tests cover cancellation, a record changing during confirmation, rejected checkpoint writes and an explicitly approved deletion with the original record retained in the audit and a linked workout unlinked. `TRACK_DISTRACTION_CAPTURE=1` writes dark and light browser screenshots; native behavior is not established.
