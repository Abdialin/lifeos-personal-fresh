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
    const val ACTION_SNOOZE = "com.lifeos.companion.SNOOZE"
    const val ACTION_TEST = "com.lifeos.companion.TEST_ALARM"
    private const val PREFS = "lifeos_alarm_recovery"
    fun pendingSnooze(context: Context): Long =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong("snoozeUntil", 0L)
    fun acknowledgeSnooze(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove("snoozeUntil").apply()
    }
    private fun clearSaved(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()

    fun restoreAfterBoot(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val time = prefs.getLong("trigger", 0L)
        val label = prefs.getString("label", "LifeOS alarm") ?: "LifeOS alarm"
        val now = System.currentTimeMillis()
        if (time > now && time <= now + 7L * 86400000L) schedule(context, label, time)
        else clearSaved(context)
    }

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
        clearSaved(context)
    }

    /** Returns true only if an exact request was permitted. */
    fun schedule(context: Context, label: String, triggerMs: Long): Boolean {
        val now = System.currentTimeMillis()
        require(triggerMs > now && triggerMs <= now + 7L * 86400000L) {
            "Alarm must be in the next seven days"
        }
        val manager = context.getSystemService(AlarmManager::class.java)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putLong("trigger", triggerMs).putString("label", label.take(80)).apply()
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
        if (intent.action == NativeAlarm.ACTION_SNOOZE) {
            val label = intent.getStringExtra(NativeAlarm.EXTRA_LABEL)?.take(80) ?: "LifeOS reminder"
            val until = System.currentTimeMillis() + 5L * 60_000L
            NativeAlarm.schedule(context, label, until)
            context.getSharedPreferences("lifeos_alarm_recovery", Context.MODE_PRIVATE).edit()
                .putLong("snoozeUntil", until).apply()
            context.getSystemService(NotificationManager::class.java)
                .cancel(NativeAlarm.NOTIFICATION_ID)
            return
        }
        val isTest = intent.action == NativeAlarm.ACTION_TEST
        if (!isTest && intent.action != NativeAlarm.ACTION_RING) return
        if (!isTest) NativeAlarm.cancel(context)
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
        val title = if (isTest) "Test alarm" else
            (intent.getStringExtra(NativeAlarm.EXTRA_LABEL)?.take(80) ?: "LifeOS reminder")
        val snooze = PendingIntent.getBroadcast(context, 2221,
            Intent(context, AlarmReceiver::class.java).apply {
                action = NativeAlarm.ACTION_SNOOZE
                putExtra(NativeAlarm.EXTRA_LABEL, title)
            }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        val notification = Notification.Builder(context, NativeAlarm.CHANNEL)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("LifeOS alarm · $title")
            .setContentText(if (isTest) "Native notification test. Check sound and vibration settings." else
                "Alarm reached. Tap to open LifeOS, dismiss or snooze.")
            .setContentIntent(open)
            .apply { if (!isTest) addAction(android.R.drawable.ic_lock_idle_alarm, "Snooze 5 min", snooze) }
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_ALARM)
            .setVisibility(Notification.VISIBILITY_PRIVATE)
            .build()
        manager.notify(if (isTest) NativeAlarm.NOTIFICATION_ID + 1 else NativeAlarm.NOTIFICATION_ID, notification)
    }
}

/** Restores only pending alarms. Never creates or edits LifeOS tracking records. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED ||
            intent.action == Intent.ACTION_MY_PACKAGE_REPLACED) {
            NativeAlarm.restoreAfterBoot(context)
        }
    }
}
