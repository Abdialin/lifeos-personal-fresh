# Testing and evidence

All browser fixtures in `tests/today-v250*.cjs`, `tests/plan-overview.cjs` and `scripts/capture-design-baselines.cjs` intercept requests: local repository assets are served to an isolated Preview-origin browser context, and other requests are blocked/fulfilled offline. They never need a real account or user history.

With Node and Playwright/Chromium installed, from the repository root:

```sh
node tests/today-a-plus-browser.cjs
node tests/today-a-plus-integration.cjs
node tests/today-v250.cjs
node tests/today-v250-colors.cjs
node tests/today-v250-precision.cjs
node tests/today-v250-volume.cjs
TODAY_V1_CAPTURE=1 node tests/today-release-v1.cjs
node tests/today-history-date.cjs
TRACK_PERIOD_CAPTURE=1 node tests/track-calendar-periods.cjs
node tests/track-live-controls.cjs
TRACK_FOCUS_CAPTURE=1 node tests/track-focus-mode.cjs
TRACK_DETAIL_CAPTURE=1 node tests/track-record-details.cjs
TRACK_TIMER_CAPTURE=1 node tests/track-timer-settings.cjs
node test_stage78_duration.cjs
node test_stage80_duration_profiles.cjs
node --test test_track_design_v126.test.cjs test_track_focus_v127.test.cjs test_track_polish_v128.test.cjs test_track_visual_v129.test.cjs
node test_plan_evidence_v250.cjs
node tests/plan-overview-model.cjs
PLAN_OVERVIEW_CAPTURE=1 node tests/plan-overview.cjs
node tests/plan-concept-a-model.cjs
PLAN_CAPTURE=1 node tests/plan-concept-a.cjs
node scripts/capture-design-baselines.cjs
node test_goal_fitness_cross_section_v204.cjs
node test_unified_analytics.cjs
node test_tracking_recovery.cjs
node test_android_bridge_v231.cjs
node test_static_asset_routes.cjs
python3 test_frontend_static_assets_v236.py
```

The V250 tests cover selected map items, short intervals, full/partial/consecutive gap saves, invalid/stale boundaries, exact unedited millisecond endpoints, reload persistence, overlapping/overnight/paused records, explicit and ambiguous categories, representative Goals/Insights category paths, empty and 132-record states, 23/25-hour days, themes, six navigation sections and reduced browser heights. To recreate the synthetic high-volume image, run `LIFEOS_CAPTURE_VOLUME=1 node tests/today-v250-volume.cjs` and copy `today-verification/high-volume.png` to `docs/design/today/current/timeline-high-volume.png`.

The Plan tests cover local-week and daylight-saving boundaries, overnight and paused sessions, overlapping intervals and conflicts, explicit completion evidence, empty and high-volume models, search, editing/toggling tasks via the existing editor, adding a plan, Track-to-Plan refresh, reload persistence, dark/light themes, reduced viewports, bottom clearance, settings, and navigation. The browser fixture writes only to intercepted synthetic local storage. With capture enabled it writes `plan-verification/overview-dark.png`, `overview-light.png`, `overview-bottom.png` and `overview-dark-full.png`.

GitHub workflows: `.github/workflows/preview-runtime.yml`, `today-a-plus-browser.yml`, `today-aplus-mobile-visual.yml`, and `today-presentation-check.yml`. The mobile workflow captures multiple widths and themes and checks geometry; screenshots are evidence, not automatic visual approval against a supplied reference. The visual library contains synthetic prior/current captures and comparison notes.

Browser tests cannot verify Samsung WebView system insets, native IME, gesture/three-button navigation, notifications, vibration, background execution or signing. Record those as device checks only after observing the actual device. Do not weaken time, persistence or geometry assertions to make CI pass.

The Plan Concept A+ tests cover all four new subsection presentations, calendar views, individual activity details, task edits, recurring-series preview and approval, conflict revalidation, failed-storage rollback, reload persistence, aligned comparison windows and evidence cutoffs, paused time, DST recurrence rejection, empty and 132-record states, themes, navigation and reduced browser heights. Captures in `plan-verification/` are intercepted synthetic fixtures. See `docs/design/plan/COMPARISON.md` for visual differences and open device checks.

The Today V1 fixture checks record-based overview values and navigation into existing editors, partial-period union accounting, category drill-down, proportional overlap lanes, short interval access, cancelled-plan exclusion, task completion and reload persistence, light mode and browser viewport clearance. With capture enabled it writes synthetic images under `docs/design/today/current/release-*.png`. Reference comparison notes and remaining discrepancies are in `docs/design/today/COMPARISON.md`.

The historical Today timeline test covers date-picker and previous/next-day navigation, future-date rejection, overnight session identity, full and partial gap logging on earlier days, a second writer invalidating a selected gap, exact local-midnight boundaries, reload persistence, restored Track History record clicks and correct overnight day-portion details, and 23-/25-hour days. Requests are intercepted and storage is synthetic.

Track calendar-period browser fixtures check History's day/week/month/year/all-time and custom-range navigation, invalid and future range rejection, activity/category filters, chronological sorting, raw recorded totals and averages, explicit category precedence, cross-midnight session identity and no mutation while browsing. They also check Review's category/activity groupings, Today color consistency, Other / review drill-down, category correction, failed-save rollback and reload persistence, chart scope and zero-day bars, year and daylight-saving boundaries, selected light-mode text contrast and reduced mobile viewports. The Live control fixture checks pause/resume, the expiring two-step finish confirmation, independent concurrent timers, quick starts and reload persistence. Both intercept requests and use synthetic records. `TRACK_PERIOD_CAPTURE=1` writes synthetic Live, History and Review captures under `docs/design/track/current/v1-*.png`; these are comparisons, not evidence of native-device verification.

The intercepted Focus fixture checks starting, pausing, resuming, breaks, minimizing, reload recovery and ending while preserving a separate tracked activity. It also checks saved sound/vibration preferences, failure feedback and restoration after a rejected storage write, visibility of primary controls at mobile sizes and selected light-mode contrast. `TRACK_FOCUS_CAPTURE=1` writes synthetic Focus setup and running screenshots. This does not verify Android alert sound, vibration, Do Not Disturb, background execution or notification delivery.

The synthetic History detail fixture checks aggregation of multiple segments into one day portion, full-session and selected-day durations, original timestamps, explicit category, notes, significant pauses, individual overlaps and suppression of sub-minute entries. It checks cancellation, a simulated failed recovery-checkpoint write, a successful name/notes edit retaining exact timestamps and all segments, and a finish-time edit that preserves an activity's paused interval. For an explicit segment replacement it tests in-app cancellation, keyboard focus, rejection when the record changes during confirmation, approved replacement and retention of the original timeline in the audit. The original editor is also exercised; results are checked after reload without browser alert or confirm dialogs. It also checks primary action clearance and selected light-mode contrast. `TRACK_DETAIL_CAPTURE=1` writes synthetic detail screenshots.

The synthetic timer-settings fixture verifies reminder configuration, recovery-checkpoint failure and rollback, reload persistence, explicit consent for automatic finish, cancellation, rejection of changes to a timer while the confirmation is open, and the absence of running timers. It checks duration profiles for new activities, failed storage writes, malformed profile data, and preservation of profiles changed since the panel opened and unrecognized fields. It also checks light-mode contrast and control reachability in reduced browser viewports. `TRACK_TIMER_CAPTURE=1` writes timer and consent screenshots. These checks do not establish native notification delivery, background execution or automatic finish timing on Android.
