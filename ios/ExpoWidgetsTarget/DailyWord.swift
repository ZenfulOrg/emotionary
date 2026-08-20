import WidgetKit
import SwiftUI
internal import ExpoWidgets

struct DailyWord: Widget {
  let name: String = "DailyWord"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: name, provider: WidgetsTimelineProvider(name: name)) { entry in
      WidgetsEntryView(entry: entry)
    }
    .configurationDisplayName("Emotionary Daily Word")
    .description("Keep today's emotion word close on your Home or Lock Screen.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}