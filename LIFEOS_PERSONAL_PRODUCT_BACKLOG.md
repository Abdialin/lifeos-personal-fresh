# LifeOS Personal — User-requested improvements (12 November 2026)

This is the active product backlog, not a replacement for existing features. Preserve actual records, generated provenance metadata, and unsynchronized offline changes. Keep LifeOS Work paused.

## P0 — Data safety and review
- Verify current phone's historical repair, Today records and PostgreSQL queue before replacing or pulling cloud state.
- Never treat simulated development imports as verified attendance.
- Offline-first activity data; review-before-write for synchronization and calendar integrations.

## P1 — Core planning and insights
- Proactively ask users for weekly targets on onboarding and when goals are absent. Offer templates: gym 3 sessions/week at 60 min, work 35 h/week, nutrition, study, sleep, Quran etc. Goals must distinguish hours, occurrences, quantities, and duration per session.
- Allow uploads of work schedules; parse and review shifts, contracted hours, overtime thresholds, overnight shifts, and proposed records before saving. Do not assume overtime policy; ask.
- Present daily and weekly activity progress through charts instead of lengthy summaries.
- To-do hierarchy: ISO week → date/day → specific time. Color-code priority, retain one-tap completion, separate completed history and provide weekly completion charts.
- Today dashboard compares tracked with actual expected/confirmed plan (not arbitrary session count), measures distraction, planned/unplanned time, skipped/missed plans, progress against goals and coverage.
- Tapping any day in Smart Schedule opens a dashboard with day timeline, durations, counted sessions, planned vs completed, missed/skipped, distraction and unique occupied time.
- Clean up Recent Sessions with date groups, filters/search and concise drilldowns. Keep Record Time Mix and expand visuals.
- Improve Proposed Week, two-week goal review and sleep/recovery visualizations.

## P2 — Activity depth & automation
- Activity-type details: prayer (which prayer, congregation, mosque optional, optional details), work (role, location, break/overtime), gym (exercises, sets, reps, intensity), nutrition (meal, quantity, nutrition optional) and expandable type-specific fields.
- One-tap start without a long form; on Finish ask for relevant structured details, prepopulate tracked start/end, allow corrections; don't block saving a session if details skipped.
- Offline/local reminders for tasks and planned work, explicit opt-in to notifications; communicate browser limitations for alarms when closed.
- Optional auto-start and auto-finish only for explicitly approved plans and clear rules; preserve evidence distinction: scheduled automatic time is not verified human participation. Never silently convert planned tasks to actual.
- Redesign quick-start icons without generic emojis; accessible monochrome glyphs/icons and responsive cards.

## P3 — Social and privacy
- Friend invitations and private sharing permissions, granular choice of what to share, leaderboard of opted-in weekly progress; never expose individual prayers, private health, food or activity records without explicit consent. Abuse controls, revocation, deletion and privacy architecture required. Server-side identity/authentication and data isolation prerequisites.

## Release acceptance
- No regression in offline queue, PostgreSQL revision integrity, current data or user records.
- Verify phone/mobile browser display, cross-midnight calculations and ISO-week boundaries.
- Mark implemented vs pending honestly; validate with automated tests and live deployment separately.
