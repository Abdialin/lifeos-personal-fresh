# Batch D — Smart Schedule foundation

## Established
- Pure `smart_schedule.js` functions: conflict detection, clipped actual activity intervals, three read-only views, and approval-required reschedule proposals.
- Three-view panel in the existing LifeOS UI. It shows tracked activity and existing plans over a seven-day window based on selected schedule date. No automatic edits to the workspace or calendar.
- `test_smart_schedule.cjs` covers interval overlaps, boundaries, overnight clipping, immutable proposals, and invalid windows.

## Explicitly incomplete
- Predicted Week is currently a *projection of existing plans*, not a learned prediction. It is labelled accordingly.
- Ideal Schedule is an empty placeholder until the user defines preferred blocks and goals.
- Shift proposals are pure functions, not yet connected to the approval queue.
- No recurrence engine, timezone/DST regression suite, drag-and-drop editing, or end-to-end browser validation yet.
- Re-rendering the three-view panel after every workspace edit is not yet wired; switching views or the date refreshes it.

## Next: Batch E
Pattern-based predictions with evidence thresholds, completeness/confidence scores, recovery and workload guards. Then integrate approval queue and richer ideal schedules.

Production Render/Supabase are untouched.
