# LifeOS Personal — Batch I: Advanced Analytics & Data Quality

Adds `personal_analytics_quality.js`, a read-only analytics helper and daily quality panel in `index.html`.

- Reports recorded duration, unique occupied time, overlapping duration, measured/estimated/unknown-precision time, 45+ minute unlogged gaps and count of scheduled entries.
- Clips overnight sessions to the selected local calendar day, including DST-length days via local midnight boundaries.
- Does not classify unlogged gaps as leisure, free time or distraction.
- Keeps planned entries separate from tracked activity, and never mutates the workspace.
- Existing activity, timer, calendar and synchronization modules retained.

## Verification
New analytics tests and all existing `test_*.cjs` scripts passed locally. Full browser E2E and production PostgreSQL remain unverified. Existing Python test discovery has known environment-dependent connection errors; no claim of full suite success.

## Limitations
Precision categories describe recorded segment duration, not distinct occupied time; these categories can overlap. Workload and recovery scores, completeness based on explicit user confirmations, long-term visualizations and automated predictions require later integration. The report is computed in the browser timezone, which should be tested for travel and DST transitions.
