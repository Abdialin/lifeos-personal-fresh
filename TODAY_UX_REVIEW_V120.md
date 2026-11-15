# LifeOS Personal — Today view UX review / V120
Date: 2026-11-15
Scope: ONLY Today. Do not advance the feature roadmap.

## Observed from five Samsung Browser screenshots
1. Hero dashboard already displays recorded vs unique tracked time, active timers, open tasks, task focus and progress. A second "Today's overview" card repeats recorded/unique totals lower in Today.
2. "Coming up & reminders" is long, including a prior-day Security shift tagged "Due now", and a large disabled "Notifications enabled" button.
3. The 24-hour timeline contains seven narrow bars, all apparently near midnight; users cannot infer their time boundaries directly from the visual. Seven recorded activities appear to share the same ~24-minute time window.
4. Today activity history uses tall cards for every session and dominates mobile scrolling; the labels "crosses midnight" do not distinguish which day the session started.
5. "2h46m recorded" versus "24m unique" versus "2h22m overlap" is mathematically consistent for concurrent activity durations, but raises an evidence-quality issue when independent activities carry identical timestamp windows.
6. Bottom tab navigation is usable and should stay unchanged until the navigation review across all sections.

## Implemented
- Moved legacy duplicate Today overview panel to Tracking (using stable `data-lifeos-area=tracking`), preserving its existing element IDs and calculations.
- Today history initially shows three activity intervals with explicit expand/collapse button for the entire history. Count remains based on unique sessions, not the visible subset.
- Added a **read-only** warning when three or more activity intervals share exactly the same clipped time window. No timestamps are modified.
- Replaced ambiguous generic "crosses midnight" with "continued from yesterday" / "continues into tomorrow" according to the clipping direction.
- Improved 24-hour timeline with explicit time labels per lane, and an explanation of narrow bars and concurrent activity duration. All bars remain on the genuine full-day scale.
- Removed recently-created historical plans from the upcoming list; statuses older than 10 minutes cannot display as "Due now" when the interval remains open.
- Shortened upcoming list from six to four; removed bulky disabled notification button when notifications are already enabled/blocked and replaced it with an informative note.
- Added static regression checks in `test_today_structure_v120.cjs`.

## Data semantics (do not change without an explicit user review)
- Recorded total sums activity durations; unique time counts clock coverage once; overlap is the excess of summed durations beyond unique coverage.
- Simultaneous activities are allowed (multitasking), but seven distinct records using an identical start/end interval warrant user review. No automatic deduplication or deletion.
- The screenshots alone do not verify whether the imported or historical records reflect actual events. Do not silently promote/erase/reinterpret records.
- Overdue plans are not automatically completed or skipped.
- Account migration and Friends development paused while Today is being reviewed.

## Pending
- User feedback on Today structure, density, labels and desired visibility.
- Live Samsung Browser acceptance check after Render deploy.
- A cross-section review at the end, followed by functional fixes after layout approval.
