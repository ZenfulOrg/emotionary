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
      val uri = if (slug.isNullOrBlank()) "emotionary://" else "emotionary://widget/open/${Uri.encode(slug)}"
      val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(context.packageName).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      views.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, id * 3, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))

      // Save and share, the same app links the iOS widget uses.
      val hasWord = !slug.isNullOrBlank()
      val liked = entry?.optBoolean("liked") == true
      views.setImageViewResource(R.id.like, if (liked) R.drawable.emotionary_ic_heart_filled else R.drawable.emotionary_ic_heart)
      views.setContentDescription(R.id.like, if (liked) "Remove saved word" else "Save word")
      val visibility = if (hasWord) android.view.View.VISIBLE else android.view.View.GONE
      views.setViewVisibility(R.id.like, visibility)
      views.setViewVisibility(R.id.share, visibility)
      if (hasWord) {
        val encoded = Uri.encode(slug)
        views.setOnClickPendingIntent(R.id.like, link(context, id * 3 + 1, "emotionary://widget/${if (liked) "unlike" else "like"}/$encoded"))
        views.setOnClickPendingIntent(R.id.share, link(context, id * 3 + 2, "emotionary://widget/share/$encoded"))
      }
      manager.updateAppWidget(id, views)
    }
  }

  private fun link(context: Context, requestCode: Int, uri: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    return PendingIntent.getActivity(context, requestCode, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
}
