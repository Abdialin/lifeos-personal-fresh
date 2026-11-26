# Track V1 visual evidence

The supplied V1 targets are in [`release-v1/02_Track`](../release-v1/02_Track/). The captures below use intercepted synthetic records; they are not screenshots of personal data, and they do not establish Android or user acceptance.

| Subsection | Supplied target | Current synthetic capture | Open differences |
| --- | --- | --- | --- |
| Live | [Live tracking](../release-v1/02_Track/Live_tracking.png) | [Dark](current/v1-live.png), [light](current/v1-live-light.png), [full page](current/v1-live-full.png) | The layout is more compact and exposes existing timer actions and quick starts. The target's daily-goal progress requires an established user target; none is fabricated. The floating timer and bottom navigation still need native-device checks. |
| History | [Activity history](../release-v1/02_Track/Activity_history.png) | [Viewport](current/v1-history.png), [full page](current/v1-history-full.png) | The existing day-grouped records and search remain available. The target's period navigation, summary, category chart and advanced filters are not yet implemented. |
| Review | [Track supporting references](../release-v1/02_Track/) | [Viewport](current/v1-review.png), [full page](current/v1-review-full.png) | Calendar-period calculations are corrected, but the visual and light-theme review is incomplete. |
| Focus and details | [Focus Mode and activity details](../release-v1/02_Track/) | Existing Track sheets | The native Focus alarm, permissions and background behavior have not been verified on Android; detail and sheet presentation still need comparison. |

The [previous baseline captures](before/) are retained. Changes to Live delegate to the existing tracking engine and retain the native two-step finish confirmation. No new timer data store is introduced. Automated tests and scope are listed in [`docs/TESTING.md`](../../TESTING.md).
