# Known issues and evidence gaps

## Android bottom navigation

The user's 25 November 2026 Android screenshots show the six-section bar floating above the Android navigation area and content visible beneath it. The exact installed build, navigation mode, insets and WebView viewport measurements have not been captured. `MainActivity.kt` uses `SOFT_INPUT_ADJUST_RESIZE`, disables decor fitting on API 30+, and applies system-bar/IME margins; Preview web code independently positions the bar from `visualViewport` and hides it for certain keyboard/modal states. Double accounting, stale viewport values, or another device-specific interaction are hypotheses, not established causes.

Next native investigation: collect device/API level, gesture versus three-button mode, keyboard state, WebView bounds, system-bar and IME insets, `innerHeight`, `visualViewport` height/offset, navigation bounds and final scroll clearance. Test both navigation modes, keyboard open/closed, all six sections and dialogs. Keep native changes for the later consolidated signed Preview release. Reduced-height browser tests are useful but cannot close this issue.

## V1 design comparisons

The user supplied a V1 release package with individual Today Overview and Timeline targets, Track references, all five Plan targets, remaining-section references and supporting boards. They are indexed in `docs/design/release-v1/` and `docs/design/today/reference/`. Agenda and Review are represented on supporting boards rather than individual Today reference files. The original historical approval provenance remains unconfirmed. Reference availability does not establish visual or device acceptance; see `docs/design/today/COMPARISON.md` and the remaining sections’ comparisons.

## Storage

Preview startup reports SQLite and no persistent disk is visible in service metadata; server-side durability is unverified. The separate disposable staging PostgreSQL metadata lists expiry on 8 December 2026 at 06:15 UTC. See `docs/DEPLOYMENT.md`; no assumption has been made about which application uses that database.

## Remaining evidence

Authenticated deployed-app behavior, real Samsung keyboard/gesture navigation, notification delivery, long-term background tracking, cross-device sync and user acceptance are not established by the offline browser suite. Some goal rules intentionally match a specific name/keyword; full taxonomy consistency across every historical analytics path remains to be audited.

All five supplied Plan reference images are now in `docs/design/plan/reference/`. Calendar, Tasks, Compare and Improve have new browser implementations and synthetic visual evidence; physical-device acceptance is pending. The narrow week calendar scrolls horizontally, and the full day requires vertical scrolling. During a daylight-saving week the shared axis follows the first day; item details show exact local times. Recurring occurrences can be edited individually through existing controls, but bulk series editing is not implemented. Live Preview sample seeding and authenticated behavior require access to the isolated Preview workspace; browser fixtures do not prove either.

## Track V1 comparison

The History “This Week” filter and Review's “This Week” and “This Month” filters now use the local calendar week or month through today. The Review chart states when it displays only the latest portion of a month. These behaviors have synthetic browser regression coverage, including overnight portions and daylight-saving boundaries; they have not been verified on a device.

Track Live has a compact summary, controls for concurrent sessions, visible finish confirmation and quick starts connected to the existing timer. It does not show the reference's daily target percentage because an authoritative daily target has not been established. History now has day/week/month/year/all-time and custom date ranges, activity and category filters, sorting and a labeled stacked category chart. The reference's plan-coverage metric and tag filter still need supported data sources. Live and History have received limited light-theme browser checks; Review and sheets still need complete light-theme and V1 visual verification. Focus Mode's native permissions, alarm and background behavior require device testing. See `docs/design/track/README.md` for visual comparisons.
