import ExpoModulesCore
import StoreKit

// StoreKit verifies Apple's signed transactions on device. No receipt or payment
// details are sent to Emotionary, and no locally saved flag grants access.
public class EmotionaryPurchasesModule: Module {
  private let productIDs: Set<String> = [
    "com.nowdrops.emotionary.pro.yearly",
    "com.nowdrops.emotionary.pro.lifetime"
  ]
  private var updates: Task<Void, Never>?

  public func definition() -> ModuleDefinition {
    Name("EmotionaryPurchases")
    Events("onEntitlementsChanged")

    OnCreate { [weak self] in
      self?.updates = Task { [weak self] in
        for await result in StoreKit.Transaction.updates {
          guard let self else { return }
          guard case .verified(let transaction) = result,
                self.productIDs.contains(transaction.productID) else { continue }
          self.sendEvent("onEntitlementsChanged", await EmotionaryStore.entitlements())
          await transaction.finish()
        }
      }
    }
    OnDestroy { [weak self] in self?.updates?.cancel() }

    AsyncFunction("getProducts") { () async throws -> [[String: String]] in
      let products = try await Product.products(for: self.productIDs)
      return products.map { ["id": $0.id, "displayPrice": $0.displayPrice] }
    }
    AsyncFunction("getEntitlements") { () async -> [String: Any] in
      await EmotionaryStore.entitlements()
    }
    AsyncFunction("purchase") { (productID: String) async throws -> [String: Any] in
      guard self.productIDs.contains(productID),
            let product = try await Product.products(for: [productID]).first else {
        throw NSError(domain: "EmotionaryPurchases", code: 1,
          userInfo: [NSLocalizedDescriptionKey: "This purchase is unavailable. Please try again later."])
      }
      let result = try await product.purchase()
      switch result {
      case .success(let verification):
        guard case .verified(let transaction) = verification else {
          throw NSError(domain: "EmotionaryPurchases", code: 2,
            userInfo: [NSLocalizedDescriptionKey: "Apple could not verify this purchase. Please restore purchases or contact support."])
        }
        let access = await EmotionaryStore.entitlements()
        self.sendEvent("onEntitlementsChanged", access)
        await transaction.finish()
        return ["status": "purchased", "entitlements": access]
      case .pending:
        return ["status": "pending"]
      case .userCancelled:
        return ["status": "cancelled"]
      @unknown default:
        return ["status": "pending"]
      }
    }
    AsyncFunction("restore") { () async throws -> [String: Any] in
      // Only called after an explicit Restore Purchases tap (may ask for Apple ID).
      try await AppStore.sync()
      return await EmotionaryStore.entitlements()
    }
  }

}
