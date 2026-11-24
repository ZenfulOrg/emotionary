package expo.modules.emotionarywidgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class EmotionaryWidgetsModule : Module() {
  // The open share sheet, if any: resolved true when an app is picked,
  // false when the person comes back without picking one.
  private var sharePromise: Promise? = null
  private var shareChosen = false
  private var shareReceiver: BroadcastReceiver? = null

  private fun finishShare() {
    val promise = sharePromise ?: return
    sharePromise = null
    shareReceiver?.let { receiver ->
      try {
        appContext.reactContext?.unregisterReceiver(receiver)
      } catch (_: Exception) {
      }
    }
    shareReceiver = null
    promise.resolve(shareChosen)
  }

  override fun definition() = ModuleDefinition {
    Name("EmotionaryWidgets")
    Function("updateTimeline") { json: String ->
      val context = requireNotNull(appContext.reactContext)
      context.getSharedPreferences("emotionary_widget", 0).edit().putString("timeline", json).apply()
      val manager = AppWidgetManager.getInstance(context)
      DailyWordProvider().onUpdate(context, manager, manager.getAppWidgetIds(ComponentName(context, DailyWordProvider::class.java)))
    }

    // How many Emotionary widgets are on the home screen (adoption stats only).
    Function("installedWidgetCount") {
      val context = requireNotNull(appContext.reactContext)
      AppWidgetManager.getInstance(context)
        .getAppWidgetIds(ComponentName(context, DailyWordProvider::class.java)).size
    }

    // Shares an image together with a line of text (Android's share sheet
    // through expo-sharing can only send the file). Resolves true only when
    // an app was picked, so a cancelled share is not counted.
    AsyncFunction("shareImageWithText") { fileUri: String, text: String, title: String, promise: Promise ->
      val context = requireNotNull(appContext.reactContext)
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("E_NO_ACTIVITY", "No screen to share from", null)
        return@AsyncFunction
      }
      finishShare()

      // An empty fileUri shares the text alone.
      val send = Intent(Intent.ACTION_SEND).apply {
        putExtra(Intent.EXTRA_TEXT, text)
        if (fileUri.isEmpty()) {
          type = "text/plain"
        } else {
          val path = Uri.parse(fileUri).path ?: fileUri.removePrefix("file://")
          val contentUri = FileProvider.getUriForFile(context, "${context.packageName}.SharingFileProvider", File(path))
          type = "image/png"
          putExtra(Intent.EXTRA_STREAM, contentUri)
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
      }

      val action = "${context.packageName}.SHARE_CHOSEN"
      val receiver = object : BroadcastReceiver() {
        override fun onReceive(c: Context?, intent: Intent?) {
          shareChosen = true
        }
      }
      ContextCompat.registerReceiver(context, receiver, IntentFilter(action), ContextCompat.RECEIVER_NOT_EXPORTED)
      shareReceiver = receiver
      shareChosen = false
      sharePromise = promise

      val flags = PendingIntent.FLAG_UPDATE_CURRENT or
        (if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) PendingIntent.FLAG_MUTABLE else 0)
      val callback = PendingIntent.getBroadcast(
        context, 0, Intent(action).setPackage(context.packageName), flags
      )
      val chooser = Intent.createChooser(send, title, callback.intentSender).apply {
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      try {
        activity.startActivity(chooser)
      } catch (e: Exception) {
        sharePromise = null
        try {
          context.unregisterReceiver(receiver)
        } catch (_: Exception) {
        }
        shareReceiver = null
        promise.reject("E_SHARE", e.message ?: "Could not open the share sheet", e)
      }
    }

    // Back from the share sheet or the app it opened. The chosen broadcast
    // arrives before this in practice; wait a moment to be safe.
    OnActivityEntersForeground {
      if (sharePromise != null) {
        Handler(Looper.getMainLooper()).postDelayed({ finishShare() }, 600)
      }
    }
  }
}
