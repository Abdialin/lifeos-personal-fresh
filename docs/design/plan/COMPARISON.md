# Plan Concept A+ visual comparison

The original images below were supplied by the user on 26 November 2026; their values are illustrations. Delivered captures use realistic synthetic records at 393×780 in an intercepted local browser. They do not show the user's history or establish Samsung/WebView behavior.

| Subsection | Approved reference | Delivered dark browser capture | Delivered light browser capture |
| --- | --- | --- | --- |
| Overview | ![Overview reference](reference/01_Plan_Overview.png) | ![Overview delivered](current/overview.png) | ![Overview light](current/overview-populated-light.png) |
| Calendar | ![Calendar reference](reference/02_Plan_Calendar.png) | ![Calendar delivered](current/calendar.png) | ![Calendar light](current/calendar-light.png) |
| Tasks | ![Tasks reference](reference/03_Plan_Tasks.png) | ![Tasks delivered](current/tasks.png) | ![Tasks light](current/tasks-light.png) |
| Compare | ![Compare reference](reference/04_Plan_Compare.png) | ![Compare delivered](current/compare.png) | ![Compare light](current/compare-light.png) |
| Improve | ![Improve reference](reference/05_Plan_Improve.png) | ![Improve delivered](current/improve.png) | ![Improve light](current/improve-light.png) |

The shared Plan header, five tabs, navy cards and mint selection follow the existing Overview. The Calendar week view uses horizontally scrollable day columns at narrow widths so text and controls remain usable; it displays the full local day, so more vertical scrolling is needed than in the illustrative cropped reference. Very short blocks also appear in an expandable list. On a week containing a daylight-saving transition, each day's geometry uses its actual length; the shared axis follows the first day and an explanatory note directs the user to exact item times.

Tasks retains a separate Anytime group for records without valid dates. The percentage is calculated from non-example tasks due or completed in the selected week. Its integrated Create/Edit task sheet follows the reference's compact task fields and uses the existing workspace checkpoint; the original full controls remain under Advanced task tools. The sheet supports a date, optional deadline or scheduled time, priority, life area, optional estimate and notes. It checks for intervening edits and requires confirmation before deletion. Compare shows real recorded and planned time, evidence-based pattern projections and existing ideal routines, with an accessible daily-values table. It does not present the reference's illustrative statistics as real results; the ideal ratio is withheld for a period that has not ended. Category bars sum durations and may count overlaps. Improve shows only supported findings and links to the existing review and approval flows. No plan changes are applied automatically.

The V1 supporting board shows a full-page task editor and repeat control; the delivered editor is a scrollable sheet and does not implement recurring tasks. The original task list supplies completion controls; the sheet does not duplicate them. The preview below uses synthetic data and does not establish Android keyboard, safe-area or device behavior.

![Create task, dark browser capture](current/v1-task-editor-dark.png)
![Edit task, dark browser capture](current/v1-task-editor-edit.png)
![Create task, light browser capture](current/v1-task-editor-light.png)

The screenshots intentionally differ in content and numbers, may require scrolling, and omit unsupported ratios and suggestions. Calendar bulk editing of an entire recurring series is not implemented; each generated occurrence remains an ordinary plan. Device rendering, native system insets, keyboard behavior and final visual acceptance remain unverified.
