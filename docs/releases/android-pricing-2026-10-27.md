# Android pricing and trial update — October 27, 2026

User requested USD $11.99/year with a seven-day trial and USD $19.99 lifetime, replacing the earlier $4.99/$9.99 setup.

## Store configuration completed

- Yearly product: `com.nowdrops.emotionary.pro.yearly`, base plan `yearly`: $11.99 US; regional prices recalculated for all launch markets. Changes apply to new subscriptions. Existing legacy-price subscribers, if any, were not migrated.
- Offer `seven-day-trial`: active, free for seven days followed by the auto-renewing yearly base plan. Play determines eligibility: users who never had any subscription in this app. Available in all 175 supported base-plan countries/regions.
- Lifetime product: `com.nowdrops.emotionary.pro.lifetime`, purchase option `lifetime`: $19.99 US; all regional prices recalculated.
- Review of version 1.6.2 (2) was withdrawn so a trial-capable build can replace it. Listing, assets, countries and declarations remain saved.

## App changes

- Android selects the configured trial offer when Play returns it as eligible; otherwise selects the regular annual base plan.
- Displays the store-supplied recurring price, seven-day duration, automatic renewal and cancellation terms. Trial CTA is shown only when eligibility is returned by Play.
- Refreshes the product before purchase. If a previously displayed trial is no longer eligible, aborts with a refresh message instead of silently selecting a paid-only offer.
- Native recognition supports non-recurring trial phases and one-cycle finite recurring phases. Both P7D and P1W mean seven days.
- Android version code 3. iOS store pricing has not been changed.

## Validation and status

97 existing Jest tests passed; 3 new paywall tests passed (eligible and ineligible accounts, renewal disclosure and yearly purchase dispatch). TypeScript and changed-file lint passed. Android release build and final incremental build passed; signed APK/AAB verified, package/version code/SDK checked and 16 KB ZIP/ELF alignment passed. Code 3 uploaded and 11 changes resubmitted. Console confirms **Changes in review**, with quick checks running before review delivery. Managed publishing remains off, so the app publishes automatically after approval. Live Play checkout remains untested.

Evidence: `output/android-release/yearly-trial-11-99.png` and `output/android-release/lifetime-price-19-99.png`.

Submission evidence: `output/android-release/submitted-code3-2026-10-27.png`.
