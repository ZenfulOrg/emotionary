package expo.modules.emotionarywidgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class DailyWordProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    val entries = try { JSONArray(context.getSharedPreferences("emotionary_widget", 0).getString("timeline", "[]")) } catch (_: Exception) { JSONArray() }
    val entry = (0 until entries.length()).map { entries.getJSONObject(it) }.firstOrNull { it.optString("date") == today }
    for (id in ids) {
      val views = RemoteViews(context.packageName, R.layout.emotionary_daily_word)
      views.setTextViewText(R.id.word, entry?.optString("word") ?: "Emotionary")
      views.setTextViewText(R.id.definition, entry?.optString("definition") ?: "Open the app to discover today’s word.")
      views.setTextViewText(R.id.category, entry?.optString("category") ?: "A WORD FOR WHAT YOU FEEL")
      val tint = try { Color.parseColor(entry?.optString("tint") ?: "#F5F0E6") } catch (_: Exception) { Color.rgb(245,240,230) }
      views.setInt(R.id.widget_root, "setBackgroundColor", tint)
      val slug = entry?.optString("slug")
      val uri = if (slug.isNullOrBlank()) "emotionary://" else "emotionary://word/${Uri.encode(slug)}"
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      manager.updateAppWidget(id, views)
    }
  }
}
