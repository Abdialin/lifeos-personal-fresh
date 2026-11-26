# Known issues and evidence gaps

## Android bottom navigation

The user's 25 November 2026 Android screenshots show the six-section bar floating above the Android navigation area and content visible beneath it. The exact installed build, navigation mode, insets and WebView viewport measurements have not been captured. `MainActivity.kt` uses `SOFT_INPUT_ADJUST_RESIZE`, disables decor fitting on API 30+, and applies system-bar/IME margins; Preview web code independently positions the bar from `visualViewport` and hides it for certain keyboard/modal states. Double accounting, stale viewport values, or another device-specific interaction are hypotheses, not established causes.

Next native investigation: collect device/API level, gesture versus three-button mode, keyboard state, WebView bounds, system-bar and IME insets, `innerHeight`, `visualViewport` height/offset, navigation bounds and final scroll clearance. Test both navigation modes, keyboard open/closed, all six sections and dialogs. Keep native changes for the later consolidated signed Preview release. Reduced-height browser tests are useful but cannot close this issue.

## Missing visual references

The original approved Today Concept A+ mockups for Overview, Timeline, Agenda and Review, and Track Concept A mockups for Live, History and Review, are not present in the repository. `docs/design/` contains synthetic implementation captures, not those approved source images. Request the actual references one subsection at a time. Future Plan/Goals/Insights/My Life concepts also require the approvals described in the roadmap.

## Storage

Preview startup reports SQLite and no persistent disk is visible in service metadata; server-side durability is unverified. The separate disposable staging PostgreSQL metadata lists expiry on 8 December 2026 at 06:15 UTC. See `docs/DEPLOYMENT.md`; no assumption has been made about which application uses that database.

## Remaining evidence

Authenticated deployed-app behavior, real Samsung keyboard/gesture navigation, notification delivery, long-term background tracking, cross-device sync and user acceptance are not established by the offline browser suite. Some goal rules intentionally match a specific name/keyword; full taxonomy consistency across every historical analytics path remains to be audited.

All five supplied Plan reference images are now in `docs/design/plan/reference/`. Calendar, Tasks, Compare and Improve have new browser implementations and synthetic visual evidence; physical-device acceptance is pending. The narrow week calendar scrolls horizontally, and the full day requires vertical scrolling. During a daylight-saving week the shared axis follows the first day; item details show exact local times. Recurring occurrences can be edited individually through existing controls, but bulk series editing is not implemented. Live Preview sample seeding and authenticated behavior require access to the isolated Preview workspace; browser fixtures do not prove either.
