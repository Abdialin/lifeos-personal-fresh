# Track V1 visual evidence

The supplied V1 targets are in [`release-v1/02_Track`](../release-v1/02_Track/). The captures below use intercepted synthetic records; they are not screenshots of personal data, and they do not establish Android or user acceptance.

| Subsection | Supplied target | Current synthetic capture | Open differences |
| --- | --- | --- | --- |
| Live | [Live tracking](../release-v1/02_Track/Live_tracking.png) | [Dark](current/v1-live.png), [light](current/v1-live-light.png), [full page](current/v1-live-full.png) | The layout is more compact and exposes existing timer actions and quick starts. The target's daily-goal progress requires an established user target; none is fabricated. The floating timer and bottom navigation still need native-device checks. |
| History | [Activity history](../release-v1/02_Track/Activity_history.png) | [393 px](current/v1-history.png), [360 px](current/v1-history-360.png), [412 px](current/v1-history-412.png), [light](current/v1-history-light.png), [empty](current/v1-history-empty.png), [custom range](current/v1-history-custom.png), [full page](current/v1-history-full.png) | Day/week/month/year/all-time and custom-date navigation, recorded-time summaries, a labeled category chart, search, activity/category filters and sorting use saved records. The target's plan-coverage metric and tag filter need supported data sources. The month → week → day hierarchy is retained, so it does not reproduce the reference's always-expanded list. |
| Review | [Track supporting references](../release-v1/02_Track/) | [Viewport](current/v1-review.png), [full page](current/v1-review-full.png) | Calendar-period calculations are corrected, but the visual and light-theme review is incomplete. |
| Focus and details | [Focus Mode and activity details](../release-v1/02_Track/) | Existing Track sheets | The native Focus alarm, permissions and background behavior have not been verified on Android; detail and sheet presentation still need comparison. |

The [previous baseline captures](before/) are retained. Changes to Live delegate to the existing tracking engine and retain the native two-step finish confirmation. No new timer data store is introduced. Automated tests and scope are listed in [`docs/TESTING.md`](../../TESTING.md).
