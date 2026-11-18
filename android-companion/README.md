# LifeOS Android Companion — V231 experimental companion

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

## V231 native reconnection and alarm recovery integrity

- The read-only browser bridge forces a fresh projection of the authoritative active activity and scheduled alarm when LifeOS regains focus, becomes visible or is opened from the Android companion. This corrects the case where an unchanged timer ID/status prevented a stale native chronometer from refreshing after a long background period.
- MainActivity explicitly requests the same refresh on lifecycle resume, with a second attempt after page initialization. Only an exactly trusted HTTPS LifeOS origin can be used.
- Stopping the native timer service invalidates prior Pause/Resume action tokens. Commands still require an exact session ID and verified canonical timer action.
- Pending alarm recovery metadata is now written only after Android accepts the scheduling call, so a scheduling failure cannot create a false saved alarm.
- Malformed activity lists fail closed in the native bridge instead of breaking notification updates or triggering mutations.
- Synthetic and source-level regression tests have been added for reconnection, idempotent polling, stale control invalidation, and alarm recovery ordering.
- **Status limitation:** No current GitHub workflow runs were returned for the checked V229/V230 Android commits. The V231 APK build, sound, vibration, locked-screen behavior, and Samsung process-death recovery are NOT verified on an actual phone. A Render web deployment is not an Android APK release.

### Manual acceptance checks (real Android device)

1. Install a V231 debug APK from a verified successful Android build and sign into staging.
2. Start Work tracking; check ongoing timer notification; lock phone for several minutes and unlock. Compare the displayed elapsed duration with the authoritative web session.
3. Tap Pause from the notification, unlock, and verify the activity is paused and saved. Repeat with Resume. Verify that a stale Pause control cannot pause an already-paused activity.
4. Allow a Focus alarm with permission, turn the screen off, and confirm real sound/vibration; test Snooze, reopening and state reconciliation.
5. Reboot with a future alarm, verify it fires; review Android notification channel, battery policy and exact-alarm settings using LifeOS native diagnostics.
6. With two simultaneous activities, ensure the notification indicates other open timers and does not overwrite the non-displayed activity.
7. After reconnecting or reopening, confirm all tracked segments persist and show correctly in the timeline and cross-section reports.

## V232 APK build verification gate

The GitHub Actions workflow under `.github/workflows/personal-android-build.yml` now compiles V232, checks that the APK is a nonempty valid ZIP, inspects its Android package name and min/target SDK metadata, and retains a separate build-diagnostics artifact even on failure. The debug APK artifact is uploaded **only after** those validations pass. Both artifacts are private test deliverables, not an app-store release. See `DEVICE_TEST_CHECKLIST_V232.md` for physical-phone acceptance tests.

**Important:** A Render `live` deployment validates the **web staging service**, not the Android APK or Android alarm/notification behavior. The GitHub integration currently reports no workflow runs for the checked recent commits; therefore the compiled APK is not yet independently verified. The repository owner should check the Actions tab for the workflow, confirm it is enabled and run it manually if push-triggered runs do not appear. Do not install an unverified older APK or overwrite user tracking data.

## V233 first installed Samsung APK review (18 November 2026)

Device screenshots show Android companion opened and signed in, with an empty Today dashboard and header overlapping the Android status bar. A new WebView has a separate localStorage profile from Samsung Browser. Website HTTP authentication is not the same as connecting LifeOS Cloud sync (see Settings & data → Cloud sync). These observations **do not establish that original records have been deleted**. Do not upload the empty Android workspace to the server, delete Samsung Browser data, reset the database or overwrite the former workspace.

V233 adds Android 11+ native WindowInsets padding to keep the WebView away from system bars, compact header CSS, and a read-only Android-only first-run explanatory banner when the local workspace is empty. The banner directs users to inspect sync/recovery tools, without initiating any sync or storage write. The Android app opens at Today. Test on the same device after building a new V233 APK; web-only changes can be refreshed without reinstalling. The V233 compiled APK and real device rendering still need verification.

## V234 safe adoption of existing cloud history on a freshly installed Android device

Observed November 18, 2026: PostgreSQL revision 92 held 384 sessions, 772 events, 122 scheduled activities, 11 to-dos, 54 workouts, 144 meals, 3 goals, 28 personal logs, 12 body measurements, plus other collections. New Android WebView had zero local records, one queued local operation and no trusted base revision. Existing guarded sync correctly refused to upload the empty workspace.

V234 adds a narrowly limited **Settings & data → Cloud sync → Restore your existing server history** flow. It requires:
- A valid authenticated read of current `/api/state`.
- No local records, including unknown non-empty array collections.
- Exactly one queued local operation whose complete saved snapshot equals the empty local workspace.
- A `null` acknowledged revision with dirty local state.
- A nonempty server workspace with a valid positive integer revision.
- A JSON backup of the complete local recovery checkpoint/journal and a separate JSON backup of the complete server workspace.
- Explicit backup completion checks and typed `RESTORE SERVER` confirmation.
- A second server read and revalidation of the exact revision and local queue before any local change.
- One atomic local-only checkpoint replacing the empty initialization journal with the server workspace and trusted revision.

No API PUT, overwrite, or automatic replay occurs. Existing PostgreSQL records remain untouched. If the queue is not exactly the initialization snapshot, no restoration is offered and manual reconciliation is needed.

**Android backup limitation addressed:** Ordinary browser Blob downloads cannot be assumed to work in WebView. V234 uses the Android Storage Access Framework (`ACTION_CREATE_DOCUMENT`) to let the user choose files and verifies saved bytes by reopening each document before the web screen receives success. This requires the updated **V234 APK**; the V233 APK deliberately cannot use the guarded adoption route. A failed or cancelled save leaves the restore button disabled. Both exported JSON files contain private activity history: store them securely and do not share them publicly.

To test after an APK build is confirmed:
1. Install **0.7-v234** by updating the existing debug-signed app. Do not uninstall or clear app data; preserve recovery data first if Android requests an uninstall.
2. Open Settings & data → Cloud sync and supply the existing private sync token. Do not put the token into screenshots or share it in chat.
3. Click **1 · Check eligibility & export both copies**. Choose secure locations for the local and server JSON files. Verify both documents exist under My Files.
4. If and only if eligibility passes, click **2 · Restore existing server history locally**, confirm both backups and type `RESTORE SERVER`.
5. Confirm the server history appears under Today, Track, Plan, Insights and My Life, and verify the current server revision by a read-only check.
6. Reconnect Cloud sync to establish future synchronization only after checking the restored data and any remaining warnings.

**Do not press Upload local data on the empty Android installation**. Never remove its recovery queue manually or reset the server database to work around this guard.

## V237 encrypted Android token persistence and backup handshake

The old Cloud sync **Remember token in this browser tab** uses sessionStorage; it cannot guarantee remembering after closing Android. V237 adds a separate Android-only checkbox **Remember token securely on this Android device**. After a successful authenticated Connect (even when local sync is blocked by an unbased operation), the selected token is encrypted with a non-exportable Android Keystore AES/GCM key before writing ciphertext and IV to private app preferences. On a later app opening, the origin-scoped native bridge can restore the token into the Cloud sync field; the user must still tap Connect. Unchecking the Android box clears the encrypted saved token. Do not share the token, device or recovery screenshots containing credentials.

The backup recovery V234 capability is now requested again via an explicit native message if the original page-load capability flag is missing; the native response confirms feature support. It continues to **block** restoration on older installed APKs that cannot securely save/verify backup files. Installing V237 should preserve app storage when signed with the same debug key; if Android requests uninstall, do not clear data until a backup is confirmed. The Android debug key may vary across separate CI runs, which can make updating impossible without uninstall. This is not solved by the web deployment. The native encryption path and actual restore remain to be tested on device.

The website's browser-tab checkbox remains session-only, never persists a token in localStorage. Neither the native token nor its ciphertext is included in workspace exports or cloud requests other than authenticated API headers already used by LifeOS.

## V238 permanent signing and non-destructive parallel installation

The Android V237 APK was rejected by Samsung with **“App not installed as package conflicts with an existing package.”** The app's old runner-generated signing certificate cannot be replaced in-place with a new unrelated key. The V238 Android project deliberately moves beta development to its own application ID, preserving the existing `com.lifeos.companion` install.

For safety, two outputs are now distinct:
- `com.lifeos.companion.beta.dev`: disposable runner-signed debug test build. This is a **separate** app and can be installed without uninstalling the old package, but future dev APKs may be rejected because their signing certificates change.
- `com.lifeos.companion.beta`: stable *signed release* test beta. Available only when GitHub Actions has all four private signing secrets configured; subsequent releases remain update-compatible if the same key is retained.

See **`SIGNING_AND_SAFE_UPDATES_V238.md`** for the one-time secure key setup and Android data-protection instructions. No signing key, keystore password, or secret was committed to this repository. An APK build and the Samsung side-by-side install must still be confirmed.

## V241–V242 browser-only activity recovery (17–18 November)

Situation: Server revision 116 was adopted locally in Android with ~393 sessions, but activity records created in Samsung Browser on 17–18 November were not in that server snapshot. The Android UI legitimately shows the server's older data, not the browser's isolated local changes. Old running sessions from 16 November must not be inventively closed or converted to different dates.

V241 adds an export of the original Samsung Browser's exact activity `sessions` and `events`, and a backup-first, local-only JSON import in Android Beta. Shared record IDs with differing content are **skipped, never overwritten**; imported timestamps, segments and statuses remain unchanged. Import creates a dirty local recovery state with no trusted upload baseline, so normal full-workspace upload remains blocked.

**Preferred V242 recovery:** open original LifeOS site in Samsung Browser, go to Settings & data → Cloud sync → Synchronize missing activities across devices, tap **A (read-only compare)** and then **B** if eligible. Back up browser and server JSON files, explicitly type `PUBLISH MISSING`; the app fetches the current server revision again and sends a server-based snapshot with **only missing activity IDs added**, protected by server-side revision compare-and-swap. Other server collections and existing IDs are preserved. No automatic retry happens on ambiguous network failures. Skip conflicting shared IDs for separate review.

On Android Beta, open the same section and tap **C** then **D**. It requires the local workspace to be a conflict-free subset of the server, with all other collections/settings identical. It requires verified Android Save As backups and the typed confirmation `UPDATE ANDROID`, refetches the server, and atomically adopts the verified server state locally without any server write. Check Track → History and reload to confirm persistence. If the server changed or any other collection diverged, refuse rather than overwrite it.

Both methods require a functioning private sync token and their own backups and user approval. Neither the source browser localStorage nor existing PostgreSQL state was read or changed remotely during the code deployment. A new Android APK is **not** required because both workflows run in the web layer inside the installed companion. Existing activity records should not be re-created or reseeded.

**Important:** V242 is a guarded manual cross-device recovery path, not proof that every concurrent multi-device edit now automatically merges. The legacy snapshot sync still guards conflicting revisions and may require further redesign for seamless collaboration.
