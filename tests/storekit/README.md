# StoreKit verification

This simulator-only test host exercises the same `EmotionaryStore.swift` entitlement reader used by the shipping app against Apple's StoreKitTest framework. It does not grant access through a production debug switch.

The four tests cover product prices, an empty purchase history, lifetime purchase/refund, and yearly purchase/expiration. The `.storekit` file mirrors the App Store Connect identifiers and US prices. Tests finish transactions and allow StoreKit's asynchronous entitlement updates to settle.

Run with an available simulator UUID:

```sh
xcodebuild -project tests/storekit/StoreKitTests.xcodeproj \
  -scheme EmotionaryStoreTests -destination 'platform=iOS Simulator,id=SIMULATOR_UUID' \
  test
```

The committed Xcode project needs no regeneration. To regenerate it, run `ruby tests/storekit/generate-project.rb` with the `xcodeproj` gem available. `get-task-allow` belongs only to the test host, so StoreKitTest can configure its session; it is not added to the release app.

These tests do not charge an Apple account. A successful local StoreKit test does not replace Apple's product approval or a final TestFlight sandbox check.
