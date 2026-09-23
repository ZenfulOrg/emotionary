import XCTest
import StoreKit
import StoreKitTest

final class EmotionaryStoreTests: XCTestCase {
  private var session: SKTestSession!
  private let lifetime = "com.nowdrops.emotionary.pro.lifetime"
  private let yearly = "com.nowdrops.emotionary.pro.yearly"

  override func setUpWithError() throws {
    session = try SKTestSession(configurationFileNamed: "Emotionary")
    session.resetToDefaultState()
    session.disableDialogs = true
    session.clearTransactions()
  }
  override func tearDownWithError() throws { session.clearTransactions() }

  private func assertRemoved(_ id: String, file: StaticString = #filePath, line: UInt = #line) async {
    // StoreKit publishes refunds/expiration asynchronously after SKTestSession returns.
    for _ in 0..<50 {
      let access = await EmotionaryStore.entitlements()
      if !(access["productIDs"] as? [String] ?? []).contains(id) { return }
      try? await Task.sleep(for: .milliseconds(100))
    }
    XCTFail("StoreKit did not remove the entitlement", file: file, line: line)
  }
  func testNoPurchaseIsFree() async {
    let access = await EmotionaryStore.entitlements()
    XCTAssertEqual(access["productIDs"] as? [String], [])
  }
  func testStorePricesMatchApprovedProducts() async throws {
    let products = try await Product.products(for: EmotionaryStore.productIDs)
    XCTAssertEqual(products.count, 2)
    XCTAssertEqual(products.first(where: { $0.id == yearly })?.price, Decimal(string: "4.99"))
    XCTAssertEqual(products.first(where: { $0.id == lifetime })?.price, Decimal(string: "9.99"))
  }
  func testLifetimePurchaseAndRefund() async throws {
    let transaction = try await session.buyProduct(identifier: lifetime)
    let access = await EmotionaryStore.entitlements()
    XCTAssertTrue((access["productIDs"] as? [String] ?? []).contains(lifetime))
    await transaction.finish()
    try session.refundTransaction(identifier: UInt(transaction.id))
    await assertRemoved(lifetime)
  }
  func testYearlyPurchaseAndExpiration() async throws {
    let transaction = try await session.buyProduct(identifier: yearly)
    let access = await EmotionaryStore.entitlements()
    XCTAssertTrue((access["productIDs"] as? [String] ?? []).contains(yearly))
    await transaction.finish()
    try session.expireSubscription(productIdentifier: yearly)
    await assertRemoved(yearly)
  }
}
