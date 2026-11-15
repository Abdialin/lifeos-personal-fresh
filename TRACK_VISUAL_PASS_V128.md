# Track Visual Quality Pass V128 — 2026-11-15
Source: user mobile screenshots on Samsung Browser after V127.
Standard: approved Today hierarchy and graphics.

## Visual diagnosis
1. **Active sessions**: same live timer was shown in large control card, expanded session row, and persistent floating bar. Also a stale "Timer finished and verified" notice appeared while the selected timer was running.
2. **Quick Start**: all SVG icon artwork appeared in nearly identical teal, despite categories with different meanings. Tiles were too uniform, with weak visual hierarchy and redundant instructions.
3. **Distraction**: one-tap control was mixed with long 28-day intelligence reports and repetitive stat cards; screen length too high.
4. **History**: seven-day coverage chart consumed a full screen before users could access activity archive. Month/week/day structure should remain the main navigation.
5. **Today's totals**: four large, text-only metrics lacked explanatory graphics. Sum of durations, unique clock coverage and overlapping minutes must remain differentiated.

## V128 implementation
- Preserve a single primary V77 active timer control. Fold original #sessions details under **All active sessions & detailed controls**; all DOM nodes, edit/finish/pause/switch handlers still exist. Review timer explicitly expands the wrapper before old V77 navigation, and a stale "finished" message is cleared while a timer is running.
- Give Quick Start SVGs independent category colors (work amber, learning blue, spiritual lavender, fitness mint, food peach, distraction rose), subtle icon backgrounds, shorter tiles, less redundant explanatory copy. Do not replace their original click handlers.
- Keep distraction's one-tap Start/Stop immediately visible; move supporting reports and classification into **See distraction patterns & classification**.
- Keep history search and period selection prominent, collapse the seven-day graph by default, use shorter color-coded bar visualization; month/week/day records still accessible.
- Add unique-versus-concurrent time **donut** chart to expanded Tracking Summary, calculated directly from the original visible metrics. Include original four totals and original overlap disclaimer.

## Preserved
- No data migrations, no automatic fixes to long or overlapping sessions, no session edits or deletions in V128, no changes to plans.
- Recorded/planned/development/unlogged separation stays intact.
- All core timer controls and history filters remain usable; functionality must be checked on mobile.

## Verification
- test_track_polish_v128.test.cjs tests parsing, chart ratio semantics, activity categorization, accordion controls, session continuity and static routes.
- GitHub CI includes new test. Actual browser UI checks may continue beyond isolated regression completion.
- Render deploy and user Samsung visual review required for final approval.

## Next feedback checkpoints
- Tap **Review timer** from the persistent timer bar, and test Finish/Pause/Resume.
- Expand All active sessions; verify no invisible/blocked controls.
- Start/stop distraction, then expand Distraction patterns.
- Show All Quick Start activities and start a custom activity.
- Search/edit a historical entry and view donut without changing records.
