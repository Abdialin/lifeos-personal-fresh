package com.lifeos.companion

import android.Manifest
import android.app.AlarmManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings

/** Native one-shot alarm. Never writes the LifeOS database or tracking sessions. */
object NativeAlarm {
    const val ACTION_RING = "com.lifeos.companion.RING"
    const val EXTRA_LABEL = "alarm_label"
    const val CHANNEL = "lifeos_native_alarm_v1"
    const val NOTIFICATION_ID = 2220

    private fun pending(context: Context, label: String = ""): PendingIntent {
        val intent = Intent(context, AlarmReceiver::class.java).apply {
            action = ACTION_RING
            putExtra(EXTRA_LABEL, label.take(80))
        }
        return PendingIntent.getBroadcast(context, 2220, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    fun cancel(context: Context) {
        val manager = context.getSystemService(AlarmManager::class.java)
        manager.cancel(pending(context))
    }

    /** Returns true only if an exact request was permitted. */
    fun schedule(context: Context, label: String, triggerMs: Long): Boolean {
        val now = System.currentTimeMillis()
        require(triggerMs > now && triggerMs <= now + 7L * 86400000L) {
            "Alarm must be in the next seven days"
        }
        val manager = context.getSystemService(AlarmManager::class.java)
        val alarm = pending(context, label)
        val exact = Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()
        if (exact) {
            try {
                manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, alarm)
                return true
            } catch (_: SecurityException) {
                // Permission can be revoked immediately before scheduling.
            }
        }
        manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerMs, alarm)
        return false
    }
}

class AlarmReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != NativeAlarm.ACTION_RING) return
        val manager = context.getSystemService(NotificationManager::class.java)
        val alarmSound = Settings.System.DEFAULT_ALARM_ALERT_URI
        val attrs = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build()
        val channel = NotificationChannel(NativeAlarm.CHANNEL,
            "LifeOS alarms and reminders", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "Requested LifeOS alarms. Android settings control sound and vibration."
            setSound(alarmSound, attrs)
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 350, 150, 350, 150, 600)
            lockscreenVisibility = Notification.VISIBILITY_PRIVATE
        }
        manager.createNotificationChannel(channel)
        if (Build.VERSION.SDK_INT >= 33 &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return
        }
        val open = PendingIntent.getActivity(context, 0,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val title = intent.getStringExtra(NativeAlarm.EXTRA_LABEL)?.take(80) ?: "LifeOS reminder"
        val notification = Notification.Builder(context, NativeAlarm.CHANNEL)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("LifeOS alarm · $title")
            .setContentText("Alarm reached. Tap to open LifeOS, dismiss or snooze.")
            .setContentIntent(open)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .build()
        manager.notify(NativeAlarm.NOTIFICATION_ID, notification)
    }
}
