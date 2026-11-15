import ExpoModulesCore
import WidgetKit

/// iOS side of the local widget module. The widget itself is built by
/// expo-widgets; this only reports how many Emotionary widgets are placed
/// (Home and Lock Screen), for anonymous adoption stats.
public class EmotionaryWidgetsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("EmotionaryWidgets")

    AsyncFunction("installedWidgetCount") { (promise: Promise) in
      WidgetCenter.shared.getCurrentConfigurations { result in
        switch result {
        case .success(let widgets):
          promise.resolve(widgets.count)
        case .failure:
          promise.resolve(-1)
        }
      }
    }
  }
}
