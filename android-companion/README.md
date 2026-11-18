# LifeOS Android Companion — V222 foundation

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
  before public distribution. The exact-alarm capability is **not implemented
  in V222**; it should be developed separately with user-approved permissions.
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
