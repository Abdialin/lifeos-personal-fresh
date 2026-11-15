# LifeOS Personal Design System — V122
Date: 2026-11-15
Purpose: reusable design rules for the user's screenshot-by-screenshot redesign program.

## Non-negotiable principles
1. **Track → Understand → Predict → Improve.** Primary screens should have one prominent action/evidence summary, not walls of statistics or repeated cards.
2. **Progressive disclosure.** Two most relevant items first, further content behind clearly labelled View more / Details, without inventing a new nested scroll area.
3. **Semantic color** from the V121 tokens. Color is supportive; always pair it with readable text or icons. Use red for conflicts, amber for review, blue for plans and mint for confirmed unique coverage/progress. Classification by activity name is a visual hint only.
4. **Separate evidence:** actual tracked time, overlapping durations, planned activities, imported estimates, and unknown unlogged time must never be combined or falsely equated.
5. **Interactive charts** must have meaningful, accessible selectable elements. Tap reveals details; focus keyboard and mobile touch supported. Avoid charts that duplicate the same metric without explanatory value.
6. **Mobile-first + reduced clutter:** meaningful first viewport, no nested vertical scroll, 44px touch targets, compact/detailed display density.
7. **Privacy and data safety:** UI/layout only; never write activity or planning records to create a visualization. Preference persistence is separate and non-sensitive.

## Implementation scope
- Today V120: duplicate overview removed, collapsible activity history, timestamp-overlap warning.
- Today V121: semantically colored cards, compact next-up and unique-vs-overlap composition.
- Today V122: Morning/Afternoon/Evening/Night time-block agenda, Compact/Detailed preference, selectable timeline intervals with exact times and context. Plan-only data remains plan-only; activities remain actual evidence.
- V122 is confined to Today through data-lifeos-view and component selectors; no changes to Track, Plan, Goals, Insights or My Life before their screenshot review.

## For every future section
Audit all screenshots → propose hierarchy → implement reusable cards + charts/timelines only where informative → run tests → check Render deployment → mobile review and approval → next section.
For Track: running clock should dominate with controls; history collapses.
For Plan: calendar and time-block agenda dominate; to-dos and commitments separate.
For Goals: progress tied to defensible measures, trends and next actions.
For Insights: chart-first exploration and data completeness; do not promote inferred time to fact.
For My Life: domain-specific fitness/nutrition/habits panels with day/week comparisons and privacy-aware social sharing.

## Verification limitations
These checks assert source syntax and automated module behavior, not Samsung Browser rendering. Confirm real rendered layout on mobile after Render deploy. Previous approval was for V121; V122 needs mobile acceptance before proceeding to Track.
