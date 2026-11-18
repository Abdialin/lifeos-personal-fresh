package com.lifeos.companion

import android.Manifest
import android.app.AlertDialog
import android.app.Activity
import android.app.AlarmManager
import android.app.NotificationManager
import android.os.PowerManager
import android.provider.Settings
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.view.WindowInsets
import android.content.Context
import android.webkit.WebResourceRequest
import android.webkit.HttpAuthHandler
import android.text.InputType
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.Toast
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceError
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject

/** Origin-scoped postMessage bridge; never use addJavascriptInterface. */
class MainActivity : Activity() {
    private val lifeOsOrigin = "https://lifeos-personal-test.onrender.com"
    private lateinit var web: WebView
    private var pendingNativeAction: Pair<String,String>? = null
    private var pendingNativeReceivedAt = 0L
    private val backupSaveRequestCode = 234
    private var pendingBackup: Triple<String, String, ByteArray>? = null

    private fun trustedPage(url: String?): Boolean {
        if (url.isNullOrBlank()) return false
        return try {
            val parsed = Uri.parse(url)
            parsed.scheme == "https" &&
                parsed.host == "lifeos-personal-test.onrender.com" &&
                parsed.port == -1
        } catch (_: Exception) { false }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 220)
        }
        web = WebView(this)
        // Android 15+ may draw WebView content beneath system bars. Reserve
        // only native system-bar insets; do not change persisted web layout.
        if (Build.VERSION.SDK_INT >= 30) {
            web.setOnApplyWindowInsetsListener { view, insets ->
                val bars = insets.getInsets(
                    WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars()
                )
                view.setPadding(0, bars.top, 0, bars.bottom)
                insets
            }
        }
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.allowFileAccess = false
        web.settings.allowContentAccess = false
        web.settings.javaScriptCanOpenWindowsAutomatically = false
        web.settings.setSupportMultipleWindows(false)
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                if (trustedPage(url)) {
                    view.evaluateJavascript("window.LifeOSNativeBackupV234=true", null)
                }
                reconcileNativeSnooze()
                view.postDelayed({ reconcileNativeSnooze() }, 1400L)
                view.postDelayed({ deliverNativeTimerAction() }, 600L)
                view.postDelayed({ deliverNativeTimerAction() }, 1800L)
                view.postDelayed({ refreshNativeProjection() }, 2100L)
            }
            override fun onReceivedHttpAuthRequest(
                view: WebView, handler: HttpAuthHandler, host: String, realm: String
            ) {
                // Display the challenge only for the expected HTTPS staging host.
                if (host != "lifeos-personal-test.onrender.com" || !trustedPage(view.url)) {
                    handler.cancel()
                    return
                }
                val user = EditText(this@MainActivity).apply {
                    hint = "Username"
                    isSingleLine = true
                }
                val pass = EditText(this@MainActivity).apply {
                    hint = "Password"
                    inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
                    isSingleLine = true
                }
                val layout = LinearLayout(this@MainActivity).apply {
                    orientation = LinearLayout.VERTICAL
                    val padding = (16 * resources.displayMetrics.density).toInt()
                    setPadding(padding, padding, padding, 0)
                    addView(user)
                    addView(pass)
                }
                AlertDialog.Builder(this@MainActivity)
                    .setTitle("Sign in to LifeOS staging")
                    .setMessage("Credentials are sent only to the trusted HTTPS LifeOS server. They are not saved by the Android companion.")
                    .setView(layout)
                    .setPositiveButton("Sign in") { _, _ ->
                        handler.proceed(user.text.toString(), pass.text.toString())
                    }
                    .setNegativeButton("Cancel") { _, _ -> handler.cancel() }
                    .setOnCancelListener { handler.cancel() }
                    .show()
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                if (url.scheme == "https" && url.host == "lifeos-personal-test.onrender.com") return false
                try { startActivity(Intent(Intent.ACTION_VIEW, url)) } catch (_: Exception) {}
                return true
            }
        }
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "LifeOSNative",
                setOf(lifeOsOrigin)) { _, message, origin, isMainFrame, _ ->
                    if (!isMainFrame || origin.toString().trimEnd('/') != lifeOsOrigin) return@addWebMessageListener
                    val payload = message.data ?: return@addWebMessageListener
                    handleTimerState(payload)
                }
        }
        setContentView(web)
        receiveNativeTimerAction(intent)
        web.loadUrl("$lifeOsOrigin/?v=233#dashboard")
        if (!getPreferences(Context.MODE_PRIVATE).getBoolean("native_permissions_explained", false)) {
            getPreferences(Context.MODE_PRIVATE).edit()
                .putBoolean("native_permissions_explained", true).apply()
            AlertDialog.Builder(this)
                .setTitle("LifeOS notifications and alarms")
                .setMessage("For a visible timer, allow notifications. For precisely timed alarms, Android may also require Alarms & reminders access. These are optional; you can change them in Android Settings.")
                .setPositiveButton("Alarm settings") { _, _ -> openAlarmSettings() }
                .setNeutralButton("Notification settings") { _, _ -> openNotificationSettings() }
                .setNegativeButton("Later", null)
                .show()
        }
    }

    private fun openAlarmSettings() {
        if (Build.VERSION.SDK_INT >= 31) {
            val manager = getSystemService(AlarmManager::class.java)
            if (!manager.canScheduleExactAlarms()) {
                try {
                    startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
                        data = Uri.parse("package:$packageName")
                    })
                } catch (_: Exception) {
                    openNotificationSettings()
                }
            }
        }
    }

    private fun showNativeDiagnostics() {
        val notificationManager = getSystemService(NotificationManager::class.java)
        val alarmManager = getSystemService(AlarmManager::class.java)
        val powerManager = getSystemService(PowerManager::class.java)
        val permission = Build.VERSION.SDK_INT < 33 ||
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) ==
                PackageManager.PERMISSION_GRANTED
        val notifications = notificationManager.areNotificationsEnabled()
        val exact = Build.VERSION.SDK_INT < 31 || alarmManager.canScheduleExactAlarms()
        val unrestricted = powerManager.isIgnoringBatteryOptimizations(packageName)
        val alarmChannel = notificationManager.getNotificationChannel(NativeAlarm.CHANNEL)
        val timerChannel = notificationManager.getNotificationChannel("lifeos_native_timer_v1")
        val alarmImportance = alarmChannel?.importance ?: -1
        val alarmSound = alarmChannel?.sound != null
        val vibration = alarmChannel?.shouldVibrate() ?: false
        val summary = listOf(
            "Notification permission: " + (if (permission) "allowed" else "denied"),
            "System notifications: " + (if (notifications) "enabled" else "disabled"),
            "Alarm channel: " + (if (alarmChannel == null) "not created; use Test Android alarm" else
                "importance $alarmImportance, sound " + (if (alarmSound) "on" else "off") +
                ", vibration " + (if (vibration) "on" else "off")),
            "Timer channel: " + (if (timerChannel == null) "not created; start an activity" else
                "importance " + timerChannel.importance),
            "Exact alarms: " + (if (exact) "allowed" else "inexact fallback"),
            "Battery optimization: " + (if (unrestricted) "unrestricted" else "system-managed")
        ).joinToString("\n")
        AlertDialog.Builder(this)
            .setTitle("LifeOS Android diagnostics")
            .setMessage(summary + "\n\nThis reports settings only. It cannot prove notification delivery while locked or that sound and vibration played.")
            .setPositiveButton("Notifications") { _, _ -> openNotificationSettings() }
            .setNeutralButton("Battery settings") { _, _ -> openBatterySettings() }
            .setNegativeButton("Close", null)
            .show()
    }

    private fun openBatterySettings() {
        try {
            // Only opens system settings. LifeOS never silently exempts itself.
            startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        } catch (_: Exception) {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
            })
        }
    }

    private fun openNotificationSettings() {
        try {
            startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
            })
        } catch (_: Exception) {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:$packageName")
            })
        }
    }

    private fun handleTimerState(raw: String) {
        try {
            if (raw.length > 10_500_000) return
            val p = JSONObject(raw)
            if (p.optString("kind") == "backup-export") {
                handleBackupExport(p)
                return
            }
            if (raw.length > 1500) return
            if (p.optString("kind") == "alarm-test") {
                sendBroadcast(Intent(this, AlarmReceiver::class.java).apply {
                    action = NativeAlarm.ACTION_TEST
                })
                return
            }
            if (p.optString("kind") == "settings-request") {
                when (p.optString("target")) {
                    "alarms" -> openAlarmSettings()
                    "notifications" -> openNotificationSettings()
                    "battery" -> openBatterySettings()
                    "diagnostics" -> showNativeDiagnostics()
                }
                return
            }
            if (p.optString("kind") == "alarm-status") {
                handleAlarmState(p)
                return
            }
            if (p.optString("kind") != "timer-status") return
            val status = p.optString("status")
            val id = p.optString("id").take(100)
            if (status == "stopped") {
                stopService(Intent(this, TimerService::class.java))
                return
            }
            if (status !in listOf("running", "paused") || id.isBlank()) return
            val name = p.optString("name", "Activity").take(80)
            val elapsed = p.optLong("elapsedMs", -1L)
            if (elapsed !in 0L..604800000L) return
            val intent = Intent(this, TimerService::class.java).apply {
                action = TimerService.ACTION_UPDATE
                putExtra(TimerService.EXTRA_NAME, name)
                putExtra(TimerService.EXTRA_ID, id)
                putExtra(TimerService.EXTRA_STATUS, status)
                putExtra(TimerService.EXTRA_ELAPSED, elapsed)
                putExtra(TimerService.EXTRA_ACTIVE_COUNT, p.optInt("activeCount", 1).coerceIn(1, 100))
            }
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent)
            else startService(intent)
        } catch (_: Exception) {
            // Bad/untrusted messages never alter browser or server records.
        }
    }
    // Saving a user-selected JSON backup is an explicit Android Storage Access
    // Framework action. LifeOS does not gain blanket storage permissions.
    private fun handleBackupExport(p: JSONObject) {
        if (pendingBackup != null || !trustedPage(web.url)) return
        val requestId = p.optString("requestId")
        val filename = p.optString("filename")
        if (!Regex("^b[a-z0-9]{10,40}$").matches(requestId) ||
            !Regex("^LifeOS_v234_(android_local_before_adoption|server_revision_[0-9]+)\\.json$").matches(filename)) return
        val contents = p.optString("contents")
        val bytes = contents.toByteArray(Charsets.UTF_8)
        if (bytes.isEmpty() || bytes.size > 10_000_000) return
        pendingBackup = Triple(requestId, filename, bytes)
        try {
            startActivityForResult(Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "application/json"
                putExtra(Intent.EXTRA_TITLE, filename)
            }, backupSaveRequestCode)
        } catch (_: Exception) {
            pendingBackup = null
            acknowledgeBackup(requestId, false)
        }
    }

    @Deprecated("Uses legacy Activity result callback for minSdk 26 compatibility")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != backupSaveRequestCode) return
        val request = pendingBackup ?: return
        pendingBackup = null
        val uri = if (resultCode == RESULT_OK) data?.data else null
        if (uri == null) {
            acknowledgeBackup(request.first, false)
            return
        }
        var verified = false
        try {
            contentResolver.openOutputStream(uri, "wt")?.use { stream ->
                stream.write(request.third)
                stream.flush()
            } ?: throw IllegalStateException("Cannot write backup")
            // Verify bytes round-trip before declaring that a backup exists.
            val saved = contentResolver.openInputStream(uri)?.use { it.readBytes() }
            verified = saved != null && saved.contentEquals(request.third)
        } catch (_: Exception) {
            verified = false
        }
        acknowledgeBackup(request.first, verified)
    }

    private fun acknowledgeBackup(requestId: String, ok: Boolean) {
        if (!::web.isInitialized || !trustedPage(web.url)) return
        web.evaluateJavascript(
            "window.LifeOSV234BackupBridge?.ack(" + JSONObject.quote(requestId) +
                "," + (if (ok) "true" else "false") + ")",
            null
        )
    }

    /** Schedules only an explicit, bounded alarm timestamp, never arbitrary work. */
    private fun handleAlarmState(p: JSONObject) {
        val status = p.optString("status")
        if (status == "cancelled") {
            NativeAlarm.cancel(this)
            return
        }
        if (status == "ringing") {
            // An Android snooze remains valid until explicitly dismissed,
            // replaced by a new web alarm, or naturally delivered.
            if (NativeAlarm.pendingSnooze(this) <= System.currentTimeMillis())
                NativeAlarm.cancel(this)
            return
        }
        if (status != "scheduled") return
        val end = p.optLong("endMs", 0L)
        val now = System.currentTimeMillis()
        if (end <= now || end > now + 7L * 86400000L) return
        NativeAlarm.schedule(this, p.optString("name", "LifeOS alarm").take(80), end)
    }

    private fun reconcileNativeSnooze() {
        if (!::web.isInitialized) return
        val currentUrl = web.url ?: return
        if (!trustedPage(currentUrl)) return
        val until = NativeAlarm.pendingSnooze(this)
        if (until <= System.currentTimeMillis() || until > System.currentTimeMillis() + 5L * 60_000L + 10000L) {
            if (until > 0L) NativeAlarm.acknowledgeSnooze(this)
            return
        }
        // Only a bounded numeric timestamp reaches the trusted LifeOS page.
        // The page refuses to extend unrelated or non-expired sessions.
        web.evaluateJavascript(
            "Boolean(window.LifeOSNativeFocusSync?.applyNativeSnooze($until))"
        ) { result ->
            if (result == "true") NativeAlarm.acknowledgeSnooze(this)
        }
    }

    private fun refreshNativeProjection() {
        if (!::web.isInitialized || !trustedPage(web.url)) return
        // The canonical browser tracker is the only authority. A lifecycle
        // refresh must never reuse an old native notification's elapsed time.
        web.evaluateJavascript(
            "if(window.LifeOSAndroidBridgeV222){window.LifeOSAndroidBridgeV222.publish(true);window.LifeOSAndroidBridgeV222.publishAlarm(true)}",
            null
        )
    }

    private fun receiveNativeTimerAction(source: Intent?) {
        if (source?.action != TimerService.ACTION_NATIVE_CONTROL) return
        val id = source.getStringExtra(TimerService.EXTRA_ID) ?: return
        val action = source.getStringExtra(TimerService.EXTRA_CONTROL) ?: return
        val token = source.getStringExtra(TimerService.EXTRA_TOKEN) ?: return
        if (id.isBlank() || id.length > 100 || action !in listOf("pause","resume")) return
        val prefs = getSharedPreferences(TimerService.PREFS, Context.MODE_PRIVATE)
        if (prefs.getString(TimerService.KEY_ID, null) != id ||
            prefs.getString(TimerService.KEY_ACTION, null) != action ||
            prefs.getString(TimerService.KEY_TOKEN, null) != token) return
        // Single-use control token; replay and stale notification actions are rejected.
        prefs.edit().remove(TimerService.KEY_TOKEN).apply()
        pendingNativeAction = Pair(id,action)
        pendingNativeReceivedAt = android.os.SystemClock.elapsedRealtime()
    }

    private fun deliverNativeTimerAction() {
        val request = pendingNativeAction ?: return
        if (android.os.SystemClock.elapsedRealtime() - pendingNativeReceivedAt > 90_000L) {
            pendingNativeAction = null
            Toast.makeText(this, "Timer command expired. Review in LifeOS.", Toast.LENGTH_LONG).show()
            return
        }
        if (!::web.isInitialized) return
        val url = web.url ?: return
        if (!(url == lifeOsOrigin || url.startsWith("$lifeOsOrigin/"))) return
        val id = JSONObject.quote(request.first)
        val action = JSONObject.quote(request.second)
        web.evaluateJavascript(
            "window.LifeOSAndroidBridgeV222 ? Boolean(window.LifeOSAndroidBridgeV222.nativeTimerAction($id,$action)) : 'not-ready'"
        ) { result ->
            if (result != "\"not-ready\"" && pendingNativeAction == request) {
                // Never replay after either success or a definitive rejection.
                pendingNativeAction = null
                val message = if (result == "true")
                    "Timer ${request.second} saved locally. Check cloud sync in LifeOS."
                    else "Timer action needs review in LifeOS"
                Toast.makeText(this, message, Toast.LENGTH_LONG).show()
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        receiveNativeTimerAction(intent)
        if (::web.isInitialized) {
            web.postDelayed({ deliverNativeTimerAction() }, 300L)
        }
    }

    override fun onResume() {
        super.onResume()
        if (::web.isInitialized) web.post {
            reconcileNativeSnooze()
            deliverNativeTimerAction()
            refreshNativeProjection()
            web.postDelayed({ refreshNativeProjection() }, 1400L)
        }
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
