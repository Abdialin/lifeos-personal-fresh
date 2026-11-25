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
import android.os.Build

/** Independent from focus alarms and timers; one nearest upcoming planned reminder. */
object PlannedReminder {
    private const val PREFS = "lifeos_planned_native_v1"
    const val ACTION = "com.lifeos.companion.PLANNED_REMINDER"
    private const val CHANNEL = "lifeos_planned_reminders_v1"
    private const val REQUEST = 2288
    fun cancel(context: Context) {
        context.getSystemService(AlarmManager::class.java).cancel(pending(context))
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
    }
    private fun pending(context: Context): PendingIntent =
        PendingIntent.getBroadcast(context, REQUEST,
            Intent(context, PlannedReminderReceiver::class.java).setAction(ACTION),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    fun schedule(context: Context, id: String, label: String, at: Long) {
        val now = System.currentTimeMillis()
        if (id.isBlank() || at <= now || at > now + 7L * 86400000L) { cancel(context); return }
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (prefs.getString("id", "") == id && prefs.getLong("at", 0) == at) return
        cancel(context)
        prefs.edit().putString("id", id.take(100)).putString("label", label.take(80))
            .putLong("at", at).apply()
        val alarms = context.getSystemService(AlarmManager::class.java)
        if (Build.VERSION.SDK_INT < 31 || alarms.canScheduleExactAlarms()) {
            try { alarms.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending(context)); return }
            catch (_: SecurityException) {}
        }
        alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending(context))
    }
    fun restore(context: Context) {
        val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val id = p.getString("id", "") ?: ""
        val at = p.getLong("at", 0)
        val label = p.getString("label", "Planned activity") ?: "Planned activity"
        if (at > System.currentTimeMillis()) {
            p.edit().clear().apply()
            schedule(context, id, label, at)
        } else cancel(context)
    }
    @Synchronized
    private fun record(context: Context, label: String, status: String) {
        val prefs = context.getSharedPreferences("lifeos_preview_notification_history", Context.MODE_PRIVATE)
        val old = try { org.json.JSONArray(prefs.getString("events", "[]")) } catch (_: Exception) { org.json.JSONArray() }
        val events = org.json.JSONArray()
        events.put(org.json.JSONObject().put("name", label.take(80)).put("status", status).put("at", System.currentTimeMillis()))
        for (i in 0 until minOf(old.length(), 99)) events.put(old.getJSONObject(i))
        prefs.edit().putString("events", events.toString()).apply()
    }
    fun history(context: Context): String =
        context.getSharedPreferences("lifeos_preview_notification_history", Context.MODE_PRIVATE).getString("events", "[]") ?: "[]"
    fun deliver(context: Context) {
        val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val label = p.getString("label", "Planned activity") ?: "Planned activity"
        cancel(context)
        if (Build.VERSION.SDK_INT >= 33 &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) { record(context, label, "Permission denied"); return }
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(CHANNEL, "Planned LifeOS activities",
            NotificationManager.IMPORTANCE_HIGH).apply { enableVibration(true) })
        if (!manager.areNotificationsEnabled() || manager.getNotificationChannel(CHANNEL)?.importance == NotificationManager.IMPORTANCE_NONE) {
            record(context, label, "Notifications blocked"); return
        }
        val open = PendingIntent.getActivity(context, REQUEST,
            Intent(context, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        try { manager.notify(2288, Notification.Builder(context, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("LifeOS · Starting soon")
            .setContentText(label.take(80))
            .setContentIntent(open)
            .setAutoCancel(true)
            .setCategory(Notification.CATEGORY_REMINDER)
            .setVisibility(Notification.VISIBILITY_PRIVATE).build())
            record(context, label, "Posted to Android")
        } catch (_: Exception) { record(context, label, "Posting failed") }
    }
}
class PlannedReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == PlannedReminder.ACTION) PlannedReminder.deliver(context)
    }
}
