# Today V123 — Chronological Activity Ladder
Date: 2026-11-15
Based on user's Samsung Browser Today screenshot and explicit request.

## Changes
- Replace the vertical stack of Today activity cards with a chronological ladder: clock label on the rail, connected vertical rule, category-colored node and compact activity details.
- Default order: newest recorded interval at top; optional button reverses to oldest-first. The button changes presentation order only.
- Keep period clipping and overnight labels: "continued from yesterday" vs "continues into tomorrow".
- Preserve status, provenance labels, duration and full start–end range. Example imported/development records remain explicitly identified.
- Keep the timestamp-collision warning and the Compact/Detailed history preview count and Show More expansion.
- Use category color only as a presentation hint; no change to underlying stored categories, session sequence, activity durations, or data.
- Accessible focus target for order button; mobile ladder uses narrower time column.
- Reuse this "timeline ladder" pattern when reviewing other screenshots, but do not modify Track/Plan/Insights until their own review.

## Verification
- GitHub Actions module workflow covers chronological sorting, ladder markers, mobile CSS, safety labels and parseable inline scripts.
- Render auto-deploy is expected on each main commit; verify live status before reporting completion.
- Samsung mobile acceptance is still necessary to confirm wrapping, color, tap targets and appearance.
