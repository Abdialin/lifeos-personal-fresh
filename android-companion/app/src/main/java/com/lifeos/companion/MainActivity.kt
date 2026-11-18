package com.lifeos.companion

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject

/** Origin-scoped postMessage bridge; never use addJavascriptInterface. */
class MainActivity : Activity() {
    private val lifeOsOrigin = "https://lifeos-personal-test.onrender.com"
    private lateinit var web: WebView

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
        web.loadUrl("$lifeOsOrigin/?v=222#tracking")
    }

    private fun handleTimerState(raw: String) {
        try {
            if (raw.length > 1500) return
            val p = JSONObject(raw)
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
                putExtra(TimerService.EXTRA_STATUS, status)
                putExtra(TimerService.EXTRA_ELAPSED, elapsed)
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
        if (status != "scheduled") return
        val end = p.optLong("endMs", 0L)
        val now = System.currentTimeMillis()
        if (end <= now || end > now + 7L * 86400000L) return
        NativeAlarm.schedule(this, p.optString("name", "LifeOS alarm").take(80), end)
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
