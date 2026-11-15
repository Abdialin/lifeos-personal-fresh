# LifeOS Personal — Track UX Review V126
Date: 2026-11-15. Source: user's complete Samsung Browser Track screenshots.
Reference standard: approved Today V120–V125 visual language.

## Audit findings
- Track spanned an unusually long page combining active timer management, quick starts, background tracking diagnostics, device tests, recent sessions, unified reality/plans, distraction analysis, predictive-week evidence, routine comparisons, schedule adjustment proposals, and duplicate analytics.
- Quick Start has around 10 large tiles requiring scrolling before custom activity. Active Sessions included lengthy smart-duration configuration, background checkpoint tools and device test instructions even when 0 timers were active.
- History's month→week→day grouping is useful and must be retained; search, period, edit, delete, export CSV remain essential.
- Some day totals in the screenshot exceed 24 hours due to **summed session durations**, historical imported examples or overlapping sessions. Reported examples and actual measured records must not be silently mixed or overwritten.
- A daily summary at bottom repeated today's metrics. Planning suggestions that require approval and unrelated data diagnostics were taking space away from the core Track workflow.
- An actual persistent Android notification/ongoing timer is not proven by the web app's in-app counter; mobile timer continuity remains a separate functional test.

## Implemented V126
1. Track top-level command center with 3 read-only signal cards (active timers, finished today, unique tracked time) and direct jump buttons to Quick Start, Active Timers and History.
2. If no timer is active at initial view load, Quick Start is emphasized first. If an activity is already active, Active Sessions remains above Quick Start.
3. Quick Start uses semantic colors and compact three-column tiles (two columns on very narrow phones). Initially shows six activities, while all original tiles remain accessible under a Show All/Fewer control.
4. All original session and quick-start controls stay connected to the same existing DOM nodes. Nothing is cloned or wired to a replacement tracking function.
5. Live timer display / sessions remain visible. Smart duration settings, background verification and device diagnostics are grouped in an optional expanded panel.
6. Session history is moved directly after tracking controls. Search, time filter, editing, deleting and CSV export remain in the existing component. A truthful seven-day unique-clock coverage bar visualization is added.
7. Historic activity entry form is available under Log a past activity (collapsed by default). The old detailed tracking summary is available under Today's full tracking totals.
8. Other visible top-level tracking panels are grouped under More tracking tools & detailed reviews, leaving their handlers and content intact. This avoids premature rewriting of Plan/Insights while making the Track page usable.
9. Existing Settings navigation and technical tools are preserved. Navigation between main app sections is unchanged.

## Data and security invariants
- No session, plan, task, or backup is created, changed or deleted in the design module.
- The 7-day chart calculates union of *actual verified segment times*, excluding development-starter/seeded examples and treating unlogged time as unknown. Paused time is excluded where segment end times represent a pause.
- Existing app history and import provenance remain visible in original session archive.
- Do not interpret total recorded durations above 24 hours as actual unique occupied time.
- Do not expose insecure cross-user workspace data or link previously separate account state.
- Does not claim local checkpoint verification proves PostgreSQL or phone background tracking.

## Acceptance checklist
- On Samsung Browser, 3 main Track signals visible, primary start/active/history shortcuts work.
- No active timer: Quick Start appears before the empty Active Sessions panel.
- Running timer: original V77 timer controls remain visible; pause/switch/finish functions and confirmation modals are accessible.
- Show all/fewer quick activities works without losing custom activity input or Distraction timer.
- All history including example labels, edit/delete and CSV export remains present; start/end timestamps unchanged.
- Log Past Activity and detailed totals can be expanded.
- Settings and other 5 primary tabs still show their own content.
- Module CI and UI CI pass. Verify Render live commit and user's screenshots before considering Track approved.

## Follow-up after visual approval
- Full Android timer persistence, notification behavior and cross-device sync tests.
- Audit edge cases for unusually long sessions, overlapping records and calendar conflicts with user approval before correcting anything.
- During Plan/Insights review, migrate relevant *views*, not underlying records, to proper destinations and avoid duplicate reports.
