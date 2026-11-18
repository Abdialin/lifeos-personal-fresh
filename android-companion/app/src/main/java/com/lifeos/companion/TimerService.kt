package com.lifeos.companion

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Color
import android.os.Build
import android.os.IBinder
import android.os.SystemClock

/** Native visible chronometer; never writes LifeOS activity state. */
class TimerService : Service() {
    companion object {
        const val ACTION_UPDATE = "com.lifeos.companion.UPDATE_TIMER"
        const val EXTRA_NAME = "name"
        const val EXTRA_STATUS = "status"
        const val EXTRA_ELAPSED = "elapsed"
        const val EXTRA_ACTIVE_COUNT = "active_count"
        private const val CHANNEL = "lifeos_native_timer_v1"
        private const val NOTIFICATION = 2210
    }

    override fun onCreate() {
        super.onCreate()
        val manager = getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(CHANNEL, "Active LifeOS timer", NotificationManager.IMPORTANCE_LOW).apply {
            description = "Ongoing timer chronometer. Silent to avoid repetitive alerts."
            enableVibration(false)
            setSound(null, null)
        }
        manager.createNotificationChannel(channel)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action != ACTION_UPDATE) {
            stopSelf()
            return START_NOT_STICKY
        }
        val name = intent.getStringExtra(EXTRA_NAME)?.take(80) ?: "Activity"
        val paused = intent.getStringExtra(EXTRA_STATUS) == "paused"
        val elapsed = intent.getLongExtra(EXTRA_ELAPSED, 0L).coerceIn(0L, 604800000L)
        val otherCount = (intent.getIntExtra(EXTRA_ACTIVE_COUNT, 1).coerceIn(1, 100) - 1)
        val open = PendingIntent.getActivity(this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val notification = Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle("LifeOS · $name")
            .setContentText((if (paused) "Paused" else "Tracking") +
                (if (otherCount > 0) " · $otherCount other open timer(s)" else "") +
                " · Tap to manage in LifeOS")
            .setContentIntent(open)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(Notification.CATEGORY_SERVICE)
            .setShowWhen(!paused)
            .setWhen(System.currentTimeMillis() - elapsed)
            .setUsesChronometer(!paused)
            .apply { if (paused) setSubText("Elapsed: " + formatElapsed(elapsed)) }
            .build()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else startForeground(NOTIFICATION, notification)
        return START_NOT_STICKY
    }

    private fun formatElapsed(ms: Long): String {
        val total = ms / 1000L
        return "%02d:%02d:%02d".format(total / 3600L, (total / 60L) % 60L, total % 60L)
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
