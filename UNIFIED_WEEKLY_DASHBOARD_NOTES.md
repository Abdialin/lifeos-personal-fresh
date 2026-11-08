# LifeOS Personal — Unified Weekly Dashboard

Added a read-only seven-local-calendar-day overview within the existing LifeOS Personal interface. Shows recorded, unique and overlapping activity hours; measured share; unlogged gaps as unknown; and daily unique hours. No user records are modified, no recommendations are auto-approved, and LifeOS Work remains out of scope.

The report uses existing personal_analytics_quality.js computations and new personal_weekly_dashboard.js. It uses the browser's local timezone. Precision is calculated by recorded duration, not unique time; gaps may include sleep or untracked activity and should never be interpreted as confirmed availability. Historical days are calculated through the current timestamp and should not infer future tracked time.

Run: `node test_weekly_dashboard.cjs`. End-to-end browser, DST transition cases, and real database tests are outstanding. This is a dashboard integration increment, not production validation.
