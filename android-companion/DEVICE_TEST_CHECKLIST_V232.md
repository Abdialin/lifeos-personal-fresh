# LifeOS Personal Android companion V232 — device acceptance checklist

**Build gate:** Only install an APK produced by the GitHub Actions workflow **LifeOS Android companion APK verification (V232)** where all steps (including "Verify APK archive and package metadata") have succeeded. The APK artifact name is **lifeos-android-v232-debug-test-only**. The separate **lifeos-android-v232-build-diagnostics** artifact contains build metadata and failures. Do not assume the APK exists merely because the Render web staging deploy is live.

## Install / trust boundary

1. Open the repository Actions tab using the owner account. Find a successful V232 workflow run, download and extract its **APK** artifact. Do not use an APK from an unknown source or an earlier version.
2. Install on a test phone, confirm the app displays **LifeOS Personal**. This is a **debug-signed private testing build**, not a production release. If the old debug build has a different signing key, remove it only after preserving any relevant browser-local data and confirming backups/sync.
3. Sign in to the expected HTTPS staging origin and review permissions. Android settings determine what appears on the lock screen and whether sounds play.

## Reconnection and persistence

4. Start an actual activity (e.g., Work), check time on the native ongoing notification, lock the phone for 5–10 minutes, unlock, and compare total with the LifeOS activity history. Confirm duration includes actual running segments but excludes paused time.
5. Tap **Pause** in the notification and confirm the specific activity is paused in Track and survives refresh; use **Resume** and check it survived another refresh. An old action from a previous notification must not alter a different activity.
6. Start two activities concurrently. Notification should display one activity and count the other open timer(s), while both histories remain distinct. Confirm notification stops when no activities remain.
7. Reopen after 20–30 minutes background time. Note whether Android killed the notification and whether a fresh authoritative projection restores it after reopening. Do not classify service termination as successful persistent background operation.
8. Use Track → Focus Mode → **Check Android notification health**. Record notification permission, alarm channel importance/sound/vibration, exact alarms, timer channel and battery optimization settings.

## Native alarm / Focus

9. Tap **Test Android alarm sound & vibration**. Listen for sound and feel for vibration (phone silent/DND/volume/channel settings affect both).
10. Set a real 2–3-minute alarm. Lock the screen. Record actual delivery time, sound and vibration. Test **Snooze 5 minutes**, reopen the app, and check there is one consistent next-alarm timestamp.
11. Schedule a future alarm and reboot. Verify boot restoration only for still-pending alarms. If not delivered, inspect system exact alarm permission and notification channel. Do not assume an inexact alarm is punctual.
12. Start a Focus session. Pause for 30 seconds, take a 30-second break, resume. Confirm Focus shows separate Focused, Paused and Break durations. Normal activity records must remain unchanged.

## Acceptance / evidence

Report **PASS / FAIL / NOT TESTED** for each numbered check, device model, Android version, V232 APK version (0.5-v232), whether battery optimization is enabled, and a screenshot of any failing notification/diagnostic panel. Tests involving Android lock, process termination, real audio/haptics, boot and exact alarm delivery cannot be proved with a browser or GitHub source inspection alone.

**Data safety:** Do not reset user accounts, delete local/browser data or overwrite the active staging PostgreSQL database as part of Android testing.
