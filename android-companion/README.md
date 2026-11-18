# LifeOS Android Companion — V230 experimental companion

**Status:** Native Android source + isolated build checks; **not yet a published or installed Android app**.

This module wraps the existing LifeOS staging site in an Android WebView, uses
an origin-scoped AndroidX WebMessageListener bridge (not `addJavascriptInterface`),
and runs an opt-in foreground service when the already-running LifeOS activity
is projected into Android. The service shows a native notification chronometer;
paused timers display their last elapsed time. Notification tap reopens LifeOS.

## Limitations and critical safety rules

- LifeOS web tracking remains the sole authoritative timer state. The service
  **cannot edit or finish records** and does not synchronize with PostgreSQL itself.
- The service stops if the trusted page reports no running/paused timer. A native
  process kill, battery management, or permission restriction can remove it.
- Android 13+ needs notification permission; Android 14+ requires the declared
  `specialUse` foreground-service type. That type requires Play Console review
  before public distribution. Native alarms can be scheduled from the trusted Focus Mode alarm state.
  **Exact alarm timing requires the user to allow Android's Alarms & reminders
  permission**; if it is denied, the app uses an inexact while-idle alarm.
  Alarm scheduling is not guaranteed delivery. V223 retains a single pending alarm
  and tries to restore it after reboot or package replacement, once Android sends
  the relevant broadcast. Device-level battery restrictions can still interfere.
  The first app launch now offers links to Android alarm and notification settings.
  The notification includes a native five-minute snooze action. V224 attempts
  to reconcile that snooze with the browser Focus state when the trusted page
  returns to the foreground. Reconciliation is restricted to an expired/ringing
  session and must not silently extend an unrelated running session.
- This Android module has **not been installed or tested on a Samsung phone**.
- The browser version remains unchanged except for sending restricted timer
  status when an origin-scoped native bridge is available. No tokens or user
  workspaces are sent across the bridge.
- Staging currently uses a shared authentication flow; native login,
  background restrictions, handling multiple simultaneous timers and
  recovery after process death need device validation before general release.

## Build

From `android-companion/` with Android SDK 35, JDK 17 and Gradle 8.9:
`gradle :app:assembleDebug`.

This is an integration foundation, **not a guarantee** of persistent lock-screen
alerts. Do not treat this as a production app or distribute it without a
security, privacy, battery and Play policy review.

## V223 verification state

- Source changes committed: optional permission explainer, native alarm snooze, and single pending-alarm reboot restoration.
- No physical Android/Samsung installation has been verified; no foreground-service, background, sound, vibration, or locked-screen behavior is claimed as proven.
- Native timer is a projection of the web tracker, not a second tracking database. Only one timer is shown natively even when several web timers exist.
- Verify on a device: notification permission, exact-alarm access, sound/vibration channel configuration, five-minute snooze, reboot restoration, Android battery restrictions, and alarm cancellation from Focus Mode.

## V224 integration and verification

- Focus UI has Android-specific buttons to reopen notification and exact-alarm settings, only when the trusted native bridge is present.
- Native snooze reconciliation is intentionally bounded and best-effort. It does not alter the activity-tracking database.
- Browser regression tests now cover the native snooze transition and ringing-state message; Android compile, real alarm sound, vibration, lock-screen presence, reboot restore, and Samsung battery-management handling are **not yet confirmed**.
- Native notification supports Pause and Resume for the displayed activity only. Actions require a single-use token and the exact currently matching session state; the trusted page routes them to the same V77 timer transaction handler. Finish still requires the web app's review/confirmation. Device testing and successful Android build remain prerequisites for relying on these controls.
- Review Android notification channel settings if sound or vibration is silent: user overrides on an existing channel are not overwritten by app code.

## V225–V226 Personal integration

- The browser timeline now shows pauses between consecutive segments of the same activity when at least five minutes long; paused minutes are not added to active time. Short interruptions remain in the raw record but are hidden from the summary.
- Unlogged-time review now offers more user-selected activity categories and a custom label; it never infers or confirms activities automatically.
- Read-only cross-section checks also flag schedule entries linked to missing sessions and gracefully handle malformed collection types.
- Android foreground notification still displays one selected timer but now indicates how many other timers remain open. This does **not** provide multi-timer background control.
- Test coverage includes synthetic pause-duration accounting, orphan schedule links and browser-to-native active-timer count fields.

## V227 native alert diagnostic

The Focus panel now offers a **Test Android alarm sound & vibration** button only inside the trusted Android companion. It posts a one-time diagnostic notification on the native alarm channel, without cancelling or changing an existing scheduled alarm. The channel's current user-selected sound/vibration policy still applies; Android can silence it because of permission denial, system volume, Do Not Disturb, or OEM restrictions. The test has browser-side regression coverage but still needs a physical-device check.

## V228 notification action safety

- Android notification presents Pause or Resume for the single displayed timer. It does not offer Finish, because finishing requires confirmation and review of the actual record.
- The app checks the explicit action ID, intended status, and a one-use private token before dispatch; the browser independently checks the activity ID and expected status before invoking the existing tracker operation. No direct native database writes are allowed.
- If the app is offline, authentication is blocked, or the existing tracker cannot safely persist, commands may fail. Open LifeOS and verify the actual timer state; never assume the notification action succeeded merely because the button was tapped.
- Multiple concurrent activities are not individually controlled in the notification: it displays one timer and the count of other open timers.
- The V228 safety test uses a mocked canonical tracker. Device-level compilation, lifecycle checks, lock-screen behavior, and real PostgreSQL persistence require separate verification.

## V229 Android lifecycle and Focus accounting

- Incoming notification Pause/Resume actions now expire after 90 seconds if the trusted LifeOS page is not ready. A stale command does not automatically replay later. Android navigation and Basic Auth checks use an exact parsed HTTPS hostname instead of a URL prefix.
- Notification success feedback states that the timer action was **saved in local recovery storage**, not that cloud synchronization has been verified. Users should check cloud sync status separately.
- The Focus panel now shows accumulated pause time, break time, and productive focus time against the planned session duration. These are local Focus metrics and do not overwrite tracked activity sessions.
- The Android-only Focus panel includes a user-initiated link to Android battery optimization settings. The app does not request a blanket exemption or override the user's settings.
- Browser regression assertions cover pause/break/focus duration, but a compiled APK installation on an actual phone is still necessary to establish reliability during device lock, Doze, process death, and Samsung background restrictions.

## V230 on-device notification diagnostics and lock-screen privacy

- **Focus Mode → Check Android notification health** opens a native diagnostic dialog, only within the trusted installed companion. It reads Android notification permission, whether notifications are enabled, alarm channel importance/sound/vibration, foreground timer channel importance, exact-alarm access, and battery optimization status. It does not request permissions automatically or claim to confirm physical alarm delivery.
- The ongoing timer notification now has a privacy-safe lock-screen public version. Its generic title and chronometer stay visible where Android allows lock-screen notifications, without revealing the specific activity name or other private data.
- Native diagnostics and privacy settings are covered by static regression checks and the web-to-native diagnostic request has a browser regression. **A successfully compiled APK and actual Samsung lock-screen, sound, vibration, battery restriction, and snooze testing remain necessary**; Android may override the requested presentation.
- The companion intentionally uses START_NOT_STICKY: if Android kills the service, LifeOS must reconnect and project an authoritative timer again. It never invents a continuously running activity from stale local notification data. This is a safety limitation, not guaranteed background persistence.
