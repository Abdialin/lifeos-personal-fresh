package com.lifeos.companion

import android.Manifest
import android.app.AlertDialog
import android.app.Activity
import android.app.AlarmManager
import android.provider.Settings
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
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
        web.settings.javaScriptEnabled = true
        web.settings.domStorageEnabled = true
        web.settings.allowFileAccess = false
        web.settings.allowContentAccess = false
        web.settings.javaScriptCanOpenWindowsAutomatically = false
        web.settings.setSupportMultipleWindows(false)
        web.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                reconcileNativeSnooze()
                view.postDelayed({ reconcileNativeSnooze() }, 1400L)
                view.postDelayed({ deliverNativeTimerAction() }, 600L)
                view.postDelayed({ deliverNativeTimerAction() }, 1800L)
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
        web.loadUrl("$lifeOsOrigin/?v=228#tracking")
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
            if (raw.length > 1500) return
            val p = JSONObject(raw)
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
        }
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
