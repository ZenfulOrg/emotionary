package expo.modules.emotionarywidgets

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class EmotionaryWidgetsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("EmotionaryWidgets")
    Function("updateTimeline") { json: String ->
      val context = requireNotNull(appContext.reactContext)
      context.getSharedPreferences("emotionary_widget", 0).edit().putString("timeline", json).apply()
      val manager = AppWidgetManager.getInstance(context)
      DailyWordProvider().onUpdate(context, manager, manager.getAppWidgetIds(ComponentName(context, DailyWordProvider::class.java)))
    }
  }
}
