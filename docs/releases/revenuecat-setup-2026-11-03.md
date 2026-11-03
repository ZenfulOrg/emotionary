# RevenueCat setup — November 3, 2026

Purchases moved from the custom StoreKit / Play Billing module (`modules/emotionary-purchases`, removed) to `react-native-purchases`. Client: `src/purchases/client.ts`. Keys: `src/config.ts`.

## RevenueCat project "Emotionary" (project `04330c36`, same account as Zenfulnote)

- Entitlement: `pro`. Offering: `default` with `$rc_annual` (yearly) and `$rc_lifetime` (lifetime). Paywall reads the current offering, so A/B tests can change products, prices and trials without a release.
- iOS app `appff7675af8e`, `com.nowdrops.emotionary`, public key `appl_…` (in config). Apple In-App Purchase key `V36GT25TYW` (issuer `8149396e-69d5-4c44-8096-e8a6e12a08a2`). App Store Connect API key not set up (Account Holder only), so products show "Could not check" until a first purchase.
- Android app `appcf285dcb33`, `com.emotionary.app`, public key `goog_…` (in config). Products imported: `com.nowdrops.emotionary.pro.yearly:yearly`, `com.nowdrops.emotionary.pro.lifetime`.

## Google credentials

- Service account `revenuecat@emotionary-play-billing.iam.gserviceaccount.com` in Google Cloud project `emotionary-play-billing` (owned by a personal Gmail, because the Emotionary Workspace org blocks service-account key creation via `iam.managed.disableServiceAccountKeyCreation`).
- Invited in Play Console (Emotionary Developer `7452565767209018961`) with: view app info, view financial data, manage orders and subscriptions.
- Enabled APIs: Play Android Developer, Play Developer Reporting (Workspace project), Cloud Pub/Sub (Gmail project).
- Play purchase validation can lag up to ~a day after the invite; re-run "Check credentials" in RevenueCat → Emotionary (Play Store).

## Not done / to verify

- No build, sandbox purchase or restore test yet; existing buyers' access via store receipt unverified.
- Android real-time developer notifications (Pub/Sub topic) not connected.
- Run `expo prebuild` for the next iOS/Android build (native module removed).
