# LifeOS Personal — Scheduling Evidence Integration

Added a read-only recent-tracking evidence report to the existing weekly proposal review. Evidence is computed from the last 28 elapsed days, excluding future-dated and unfinished sessions. Measured record ratio and at least 14 distinct tracked local dates are required before evidence is labeled reviewable. This is a conservative *eligibility signal*, not a learned forecast, not a measure of available time, and not permission to schedule.

Known limitations: session count is not unique time; DST and timezone travel need integration testing; no predictive timing optimization; confidence is a heuristic, not statistical calibration. Existing plans and data are not modified.
