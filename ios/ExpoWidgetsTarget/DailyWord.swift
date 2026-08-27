import WidgetKit
import SwiftUI
import AppIntents
internal import ExpoWidgets

// AppIntent
struct DailyWordConfigurationAppIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Emotionary Widget Configuration"
  static var description: LocalizedStringResource = "Choose the atmosphere for your daily word."

  @Parameter(title: "Theme", default: DailyWordThemeEnum.automatic)
  var theme: DailyWordThemeEnum

  func perform() async throws -> some IntentResult {
    return .result()
  }
}

enum DailyWordThemeEnum: String, CaseIterable, AppEnum {
  case automatic
  case moodyNature
  case duskyRose

  static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Theme")

  static var caseDisplayRepresentations: [DailyWordThemeEnum: DisplayRepresentation] = [
    .automatic: DisplayRepresentation(title: "Word Color"),
    .moodyNature: DisplayRepresentation(title: "Moody Nature"),
    .duskyRose: DisplayRepresentation(title: "Dusky Rose")
  ]
}

struct DailyWordTimelineEntry: TimelineEntry {
  let date: Date
  public let name: String
  public let props: [String: Any]?
  public let entryIndex: Int?
  let configuration: DailyWordConfigurationAppIntent
}

struct DailyWordTimelineProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> DailyWordTimelineEntry {
    DailyWordTimelineEntry(date: Date(), name: "DailyWord", props: nil, entryIndex: nil, configuration: DailyWordConfigurationAppIntent())
  }

  func snapshot(for configuration: DailyWordConfigurationAppIntent, in context: Context) async -> DailyWordTimelineEntry {
    let entries = parseTimeline(configuration: configuration)
    return entries.first ?? DailyWordTimelineEntry(date: Date(), name: "DailyWord", props: nil, entryIndex: nil, configuration: configuration)
  }

  func timeline(for configuration: DailyWordConfigurationAppIntent, in context: Context) async -> Timeline<DailyWordTimelineEntry> {
    let entries = self.parseTimeline(configuration: configuration)
    let timeline = Timeline<DailyWordTimelineEntry>(entries: entries, policy: .atEnd)
    return timeline
  }

  func parseTimeline(configuration: DailyWordConfigurationAppIntent) -> [DailyWordTimelineEntry] {
    let timeline = WidgetsStorage.getArray(forKey: "__expo_widgets_DailyWord_timeline") ?? []
    let entries: [DailyWordTimelineEntry?] = timeline.enumerated().map { index, entry in
      guard let entry = entry as? [String: Any], let timestamp = entry["timestamp"] as? Int, let props = entry["props"] as? [String: Any] else {
        return nil
      }
      return DailyWordTimelineEntry(
        date: Date(timeIntervalSince1970: Double(timestamp) / 1000),
        name: "DailyWord",
        props: props,
        entryIndex: index,
        configuration: configuration
      )
    }

    return entries.compactMap(\.self)
  }
}

struct DailyWordEntryView: View {
  @Environment(\.self) var environment
  var entry: DailyWordTimelineProvider.Entry

  init(entry: DailyWordTimelineProvider.Entry) {
    self.entry = entry
  }

  private var widgetEnvironment: [String: Any] {
    var env: [String: Any] = getWidgetEnvironment(environment: environment)
    env["timestamp"] = Int(entry.date.timeIntervalSince1970 * 1000)
    env["configuration"] = [
      "theme": entry.configuration.theme.rawValue
    ]
    return env
  }

  private var widgetEnvironmentString: String? {
    guard let data = try? JSONSerialization.data(withJSONObject: widgetEnvironment),
          let jsonString = String(data: data, encoding: .utf8) else {
        return nil
    }
    return jsonString
  }

  public var body: some View {
    if let layout = WidgetsStorage.getString(forKey: "__expo_widgets_\(entry.name)_layout"),
       !layout.isEmpty {
      let node = evaluateLayout(layout: layout, props: entry.props ?? [:], environment: widgetEnvironment)
      WidgetsDynamicView(name: entry.name, kind: .widget, node: node, entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    } else {
      WidgetsDynamicView(name: entry.name, kind: .widget, node: createRedBox(message: "No layout found for \(WidgetsStorage.appGroupIdentifier ?? "")::\(entry.name)"), entryIndex: entry.entryIndex, environmentString: widgetEnvironmentString)
    }
  }
}


@available(iOS 17.0, *)
struct DailyWord: Widget {
  let name: String = "DailyWord"

  var body: some WidgetConfiguration {
    return AppIntentConfiguration(kind: name, intent: DailyWordConfigurationAppIntent.self, provider: DailyWordTimelineProvider()) { entry in
      DailyWordEntryView(entry: entry)
    }
    .configurationDisplayName("Emotionary Daily Word")
    .description("Keep today's emotion word close on your Home or Lock Screen.")
    .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
  }
}
