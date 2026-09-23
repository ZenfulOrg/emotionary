import StoreKit

// Shared by the native bridge and the StoreKit integration tests.
enum EmotionaryStore {
  static let productIDs: Set<String> = [
    "com.nowdrops.emotionary.pro.yearly",
    "com.nowdrops.emotionary.pro.lifetime"
  ]
  static func entitlements() async -> [String: Any] {
    var active: [String] = []
    for await result in StoreKit.Transaction.currentEntitlements {
      guard case .verified(let transaction) = result,
            productIDs.contains(transaction.productID),
            transaction.revocationDate == nil,
            !transaction.isUpgraded else { continue }
      // currentEntitlements includes active subscriptions (including any Apple
      // billing grace period) and owned non-consumables, and excludes refunds.
      active.append(transaction.productID)
    }
    return ["productIDs": active]
  }
}
