package expo.modules.emotionarypurchases

import com.android.billingclient.api.*
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import kotlin.coroutines.suspendCoroutine

class EmotionaryPurchasesModule : Module() {
  private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
  private val connection = Mutex()
  private var client: BillingClient? = null
  private var purchasePromise: Promise? = null
  private var displayedYearlyTrial = false
  private val products = mapOf(
    "com.nowdrops.emotionary.pro.yearly" to BillingClient.ProductType.SUBS,
    "com.nowdrops.emotionary.pro.lifetime" to BillingClient.ProductType.INAPP
  )

  override fun definition() = ModuleDefinition {
    Name("EmotionaryPurchases")
    Events("onEntitlementsChanged")
    AsyncFunction("getProducts") { promise: Promise -> run(promise) {
      details().mapNotNull { product ->
        val offer = yearlyOffer(product)
        val trial = hasSevenDayTrial(offer)
        if (product.productType == BillingClient.ProductType.SUBS) displayedYearlyTrial = trial
        val price = if (product.productType == BillingClient.ProductType.SUBS)
          offer?.pricingPhases?.pricingPhaseList?.lastOrNull()?.formattedPrice
        else product.oneTimePurchaseOfferDetails?.formattedPrice
        price?.let { mapOf("id" to product.productId, "displayPrice" to it, "freeTrialDays" to if (trial) 7 else 0) }
      }
    } }
    AsyncFunction("getEntitlements") { promise: Promise -> run(promise) { entitlements() } }
    AsyncFunction("restore") { promise: Promise -> run(promise) { entitlements() } }
    AsyncFunction("purchase") { id: String, promise: Promise ->
      scope.launch {
        if (purchasePromise != null) {
          promise.reject("PURCHASE_IN_PROGRESS", "A purchase is already in progress.", null)
          return@launch
        }
        purchasePromise = promise
        try {
          require(products.containsKey(id)) { "Unknown product." }
          val billing = ready()
          val product = details().firstOrNull { it.productId == id }
            ?: error("This product is not available on Google Play yet.")
          val params = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product)
          if (product.productType == BillingClient.ProductType.SUBS) {
            val offer = yearlyOffer(product) ?: error("No yearly subscription plan is available.")
            check(!displayedYearlyTrial || hasSevenDayTrial(offer)) {
              "The free trial is no longer available for this Google Play account. Reopen this screen to refresh your plan."
            }
            params.setOfferToken(offer.offerToken)
          } else {
            product.oneTimePurchaseOfferDetails?.offerToken?.let { params.setOfferToken(it) }
          }
          val activity = appContext.currentActivity ?: error("Open the app to make a purchase.")
          checkResult(billing.launchBillingFlow(activity, BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(params.build())).build()))
        } catch (error: Exception) {
          purchasePromise = null
          promise.reject("PURCHASE_FAILED", error.message, error)
        }
      }
    }
    OnDestroy {
      purchasePromise?.reject("APP_CLOSED", "The app closed during purchase. Restore purchases after reopening.", null)
      purchasePromise = null
      scope.cancel()
      client?.endConnection()
      client = null
    }
  }

  // Play only returns eligible offers. Prefer the configured seven-day trial,
  // while returning subscribers get the regular yearly base plan.
  private fun yearlyOffer(product: ProductDetails): ProductDetails.SubscriptionOfferDetails? {
    val offers = product.subscriptionOfferDetails.orEmpty().filter { it.basePlanId == "yearly" }
    return offers.firstOrNull { it.offerId == "seven-day-trial" && hasSevenDayTrial(it) }
      ?: offers.firstOrNull { it.offerId == null }
  }

  private fun hasSevenDayTrial(offer: ProductDetails.SubscriptionOfferDetails?): Boolean {
    val phases = offer?.pricingPhases?.pricingPhaseList.orEmpty()
    val first = phases.firstOrNull() ?: return false
    val singleTrial = first.recurrenceMode == ProductDetails.RecurrenceMode.NON_RECURRING ||
      (first.recurrenceMode == ProductDetails.RecurrenceMode.FINITE_RECURRING && first.billingCycleCount == 1)
    return phases.size == 2 && first.priceAmountMicros == 0L && singleTrial &&
      first.billingPeriod in listOf("P7D", "P1W") && phases.last().billingPeriod == "P1Y" &&
      phases.last().recurrenceMode == ProductDetails.RecurrenceMode.INFINITE_RECURRING &&
      phases.last().priceAmountMicros > 0L
  }

  private fun run(promise: Promise, action: suspend () -> Any) {
    scope.launch {
      try { promise.resolve(withTimeout(30000) { action() }) }
      catch (error: Exception) { promise.reject("PLAY_BILLING_ERROR", error.message, error) }
    }
  }

  private fun checkResult(result: BillingResult) {
    check(result.responseCode == BillingClient.BillingResponseCode.OK) {
      "Google Play billing (${result.responseCode}): ${result.debugMessage}"
    }
  }

  private suspend fun ready(): BillingClient = connection.withLock {
    val billing = client ?: BillingClient.newBuilder(requireNotNull(appContext.reactContext))
      .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
      .enableAutoServiceReconnection()
      .setListener { result, purchases ->
        val pending = purchasePromise
        purchasePromise = null
        if (result.responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
          pending?.resolve(mapOf("status" to "cancelled"))
        } else if (result.responseCode != BillingClient.BillingResponseCode.OK) {
          pending?.reject("PURCHASE_FAILED", result.debugMessage, null)
        } else scope.launch {
          try {
            if (purchases.orEmpty().any { it.purchaseState == Purchase.PurchaseState.PENDING }) {
              pending?.resolve(mapOf("status" to "pending"))
            } else {
              val value = entitlements()
              sendEvent("onEntitlementsChanged", value)
              pending?.resolve(mapOf("status" to "purchased", "entitlements" to value))
            }
          } catch (error: Exception) { pending?.reject("PURCHASE_FAILED", error.message, error) }
        }
      }.build().also { client = it }
    if (!billing.isReady) suspendCoroutine<Unit> { continuation ->
      billing.startConnection(object : BillingClientStateListener {
        override fun onBillingSetupFinished(result: BillingResult) {
          if (result.responseCode == BillingClient.BillingResponseCode.OK) continuation.resume(Unit)
          else continuation.resumeWithException(IllegalStateException(result.debugMessage))
        }
        override fun onBillingServiceDisconnected() {}
      })
    }
    billing
  }

  private suspend fun details(): List<ProductDetails> {
    val billing = ready()
    return products.entries.map { (id, type) ->
      val params = QueryProductDetailsParams.newBuilder().setProductList(listOf(
        QueryProductDetailsParams.Product.newBuilder().setProductId(id).setProductType(type).build()
      )).build()
      suspendCoroutine<List<ProductDetails>> { continuation ->
        billing.queryProductDetailsAsync(params) { result, details ->
          try { checkResult(result); continuation.resume(details.productDetailsList) }
          catch (error: Exception) { continuation.resumeWithException(error) }
        }
      }
    }.flatten()
  }

  private suspend fun entitlements(): Map<String, List<String>> {
    val billing = ready()
    val owned = products.values.distinct().map { type ->
      suspendCoroutine<List<Purchase>> { continuation ->
        billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(type).build()) { result, purchases ->
          try { checkResult(result); continuation.resume(purchases) }
          catch (error: Exception) { continuation.resumeWithException(error) }
        }
      }
    }.flatten().filter { it.purchaseState == Purchase.PurchaseState.PURCHASED }
    for (purchase in owned) {
      if (!purchase.isAcknowledged) suspendCoroutine<Unit> { continuation ->
        billing.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.purchaseToken).build()) { result ->
          try { checkResult(result); continuation.resume(Unit) }
          catch (error: Exception) { continuation.resumeWithException(error) }
        }
      }
    }
    return mapOf("productIDs" to owned.flatMap { it.products }.filter { products.containsKey(it) }.distinct())
  }
}
