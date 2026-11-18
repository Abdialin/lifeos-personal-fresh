# LifeOS Android Companion — V223 experimental companion

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
  The notification includes a native five-minute snooze action. Snooze is native-only;
  the web Focus countdown is not extended, so reopening the web app can cancel it.
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
