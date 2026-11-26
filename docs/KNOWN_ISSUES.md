# Known issues and evidence gaps

## Android bottom navigation

The user's 25 November 2026 Android screenshots show the six-section bar floating above the Android navigation area and content visible beneath it. The exact installed build, navigation mode, insets and WebView viewport measurements have not been captured. `MainActivity.kt` uses `SOFT_INPUT_ADJUST_RESIZE`, disables decor fitting on API 30+, and applies system-bar/IME margins; Preview web code independently positions the bar from `visualViewport` and hides it for certain keyboard/modal states. Double accounting, stale viewport values, or another device-specific interaction are hypotheses, not established causes.

Next native investigation: collect device/API level, gesture versus three-button mode, keyboard state, WebView bounds, system-bar and IME insets, `innerHeight`, `visualViewport` height/offset, navigation bounds and final scroll clearance. Test both navigation modes, keyboard open/closed, all six sections and dialogs. Keep native changes for the later consolidated signed Preview release. Reduced-height browser tests are useful but cannot close this issue.

## V1 design comparisons

The user supplied a V1 release package with individual Today Overview and Timeline targets, Track references, all five Plan targets, remaining-section references and supporting boards. They are indexed in `docs/design/release-v1/` and `docs/design/today/reference/`. Agenda and Review are represented on supporting boards rather than individual Today reference files. The original historical approval provenance remains unconfirmed. Reference availability does not establish visual or device acceptance; see `docs/design/today/COMPARISON.md` and the remaining sections’ comparisons.

Today Agenda's scheduled habit checklist can now be operated inline, but separate routine logs still open My Life. Agenda and Review remain longer than the supplied section-board designs. Their compact layout, full light-theme contrast and physical-device presentation need further work and review.

## Storage

Preview startup reports SQLite and no persistent disk is visible in service metadata; server-side durability is unverified. The separate disposable staging PostgreSQL metadata lists expiry on 8 December 2026 at 06:15 UTC. See `docs/DEPLOYMENT.md`; no assumption has been made about which application uses that database.

## Remaining evidence

Authenticated deployed-app behavior, real Samsung keyboard/gesture navigation, notification delivery, long-term background tracking, cross-device sync and user acceptance are not established by the offline browser suite. Some goal rules intentionally match a specific name/keyword; full taxonomy consistency across every historical analytics path remains to be audited.

The fixed 90-minute threshold has been removed from the Goals reading chart; it now shows recorded time rather than implying an unsupported daily target. Configurable daily-target rules and the broader Goals redesign still require implementation and verification. The existing Goals interface also retains dark cards in light mode and differs substantially from the supplied V1 reference.

All five supplied Plan reference images are now in `docs/design/plan/reference/`. Calendar, Tasks, Compare and Improve have new browser implementations and synthetic visual evidence; physical-device acceptance is pending. The narrow week calendar scrolls horizontally, and the full day requires vertical scrolling; its day headings remain visible and synchronized in browser tests. During a daylight-saving week the shared axis follows the first day; item details show exact local times. Recurring occurrences can be edited individually through existing controls, but bulk series editing is not implemented. Live Preview sample seeding and authenticated behavior require access to the isolated Preview workspace; browser fixtures do not prove either.

Plan's task editor is now an integrated sheet with browser coverage. Its full-page reference includes repeating tasks, which the existing task data model does not support; no repeat control is presented until it can be implemented safely. Completion remains available in the task list. Compare has labeled chart axes, data-based averages, factual insight cards and separate available ratios. Its ideal values use currently configured routines for past periods; historical ideal targets are not versioned. Native keyboard and insets have not been tested.

Improve's duration checks disclose the history and thresholds used, rather than treating a named activity's duration as inherently abnormal. Recovery choices open the existing reviewed-commitment sheet after a commitment is selected, and require a preview and explicit in-app consent. This differs from the reference's single-screen arrangement. Visual and device acceptance remain open. A duration check is not evidence that a timer is wrong.

An explicit skipped-plan decision is available with in-app confirmation and audit. There is not yet a verified workflow for recording partial or manual completion of an unverified plan without a linked activity; absence of tracked time remains unverified rather than automatically missed.

If a plan in the review period has a missing or unsupported identifier, or shares its identifier with another plan, recovery review is deliberately unavailable and explains that a recovery backup and review of the affected records are needed. No records are removed or changed automatically; a safe in-app repair workflow for those plan identifiers has not been verified.

## Track V1 comparison

The History “This Week” filter and Review's “This Week” and “This Month” filters now use the local calendar week or month through today. The Review chart states when it displays only the latest portion of a month. These behaviors have synthetic browser regression coverage, including overnight portions and daylight-saving boundaries; they have not been verified on a device.

Track Live has a compact summary, controls for concurrent sessions, visible finish confirmation and quick starts connected to the existing timer. It does not show the reference's daily target percentage because an authoritative daily target has not been established. History now has day/week/month/year/all-time and custom date ranges, activity and category filters, sorting and a labeled stacked category chart. The reference's plan-coverage metric and tag filter still need supported data sources. Review now supports category and activity breakdowns and History drill-down, but its date navigation and layout still differ from the reference. Live, History, Review and Focus have received limited light-theme browser checks; other sheets still need complete light-theme and V1 visual verification. Focus setup and running controls use the existing timer and alert preferences, but the reference's distinct focus modes, cycles and automatic breaks are not implemented. Native permissions, alarm delivery and background behavior require device testing. See `docs/design/track/README.md` for visual comparisons.

Distraction Review now exposes individual classified activities, subtype correction and individually controlled active timers. The package provides a Track supporting board but no exact Distraction Review target; its visual and native-device acceptance remain open.

Timer settings now configure the existing reminder or explicitly approved automatic-finish guard. Guard checks depend on the app running and may be delayed while the browser or WebView is suspended; the existing engine records an inferred automatic end as estimated. Notification delivery, background behavior and the practical cutoff on Android have not been verified, so users should review their records rather than rely on a precise unattended cutoff.
