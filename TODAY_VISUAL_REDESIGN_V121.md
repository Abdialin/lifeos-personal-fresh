# LifeOS Personal — Today Visual Refresh (V121)
Date: 2026-11-15
Status: Code committed; deploy only after user explicitly approves this visual revision.

## Design goals
- Today is an operational overview, not a full scroll of every upcoming plan or past session.
- A consistent style language: strong heading hierarchy, purposeful semantic color, compact information cards, rounded-but-not-excessive panels, accessible touch targets, and progressive disclosure.
- Keep meaningful charts where they clarify the data. Never manufacture daily time coverage or inflate activities.
- Reuse the pattern in subsequent Track, Plan, Goals, Insights and My Life review rounds, based on screenshots and the user's feedback. Do not refactor the rest preemptively.

## Implemented in V121
1. Upcoming activities: the first two are primary compact cards in a responsive grid. Remaining items are in an optional "More plans" disclosure. The normal View schedule action remains available. Visual status distinguishes due-now/soon/normal, and to-dos use a different accent.
2. Periodic reminder refresh now uses a content signature so it does not destroy focusable buttons and expanded disclosures every 5 seconds when no content changed.
3. Activity history: three visible entries by default, with a View all control from V120; V121 adds slimmer rows and colored accents based solely on the displayed activity name (presentation hint, not a factual classification).
4. 24-hour timeline: already includes clock ranges from V120; V121 colors bars by displayed names and adds a composition bar showing the share of **recorded durations** that is unique wall-clock coverage versus overlapping duration. It does not represent total-day completion.
5. Main Today summary: cards gain restrained colored top borders and tighter visual rhythm.
6. Shared V121 style tokens can be reused in later reviews; the CSS is scoped to Today to avoid altering other sections.

## Verification
- Both modified UI JavaScript sources parsed successfully in an isolated JavaScript evaluator.
- The stylesheet loads from index.html and is included in the server static allowlist.
- New `test_today_visual_v121.cjs` is added to GitHub Actions with `test_today_structure_v120.cjs`.
- CI, deployed Render, and real Samsung Browser responsiveness still require checking before calling this a live success.

## Safety and next step
- No changes to the stored data or timers; visual grouping is only CSS/DOM and read-only analytics.
- User should review the proposed layout and explicitly approve deployment. The earlier approval covered V120; this V121 redesign is a separate visual revision.
- Render workspace selection still requires confirmation; don't assume or choose the one workspace without user confirmation.
