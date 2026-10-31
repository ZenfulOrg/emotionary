# Emotionary Google Play handoff — October 22, 2026

**Latest pricing revision, October 27:** The earlier code 2 submission was replaced by **1.6.2 (3)** and resubmitted. Yearly is now **$11.99 with a seven-day free trial for eligible new subscribers**; lifetime is **$19.99**, with regional conversions. All assets and declarations remain included. See `android-pricing-2026-10-27.md` for current details.

Historical first submission, October 27: production 1.6.2 (2) and 11 changes were sent for review. Play shows **Changes in review**, with automated quick checks still running before review delivery. Managed publishing is off, so approval triggers publication. The app is not live yet.

## October 27 submission

- Merchant payments profile is now connected; verified in Play Console.
- Owner confirmed $4.99/year, $9.99 lifetime and target audience ages 13+.
- Both exact Play product IDs below are created and active, with regional pricing and available-market coverage.
- Reviewer access is implemented through server-managed `app_metadata.emotionary_full_access`; grants are not persisted and are verified with Auth on launch/foreground. Store purchase access remains separate.
- Owner approved enabling that flag for the dedicated reviewer account. Exactly one account was updated. Password login and server `/user` validation both confirm full access; the verification session was signed out.
- All 97 tests pass; TypeScript and changed-file ESLint checks pass. Android 1.6.2 (2) built successfully; AAB/APK signatures and 16 KB ZIP/ELF alignment verified (50 native 64-bit libraries). Signed artifacts are in `output/android-release/release-2/`.
- Sign-in details, target audience (13–15, 16–17, 18+), and Data safety are now saved for review.
- Replaced production code 1 with code 2, saved the release, and confirmed **Send changes for review**. Play shows **Changes in review** with quick checks pending. All 178 availability entries are included; managed publishing is off.
- Google release validation: no blocking errors; one deobfuscation-file warning. R8 minification is disabled, so no mapping file is generated.
- No fresh end-to-end Play purchase/restore test was performed.
- Submission evidence: `output/android-release/submitted-2026-10-27.png`.

The sections below preserve the October 22 historical handoff; the update above supersedes their completed blockers.

## Prepared and verified

- App: **Emotionary: words for feelings**, package `com.emotionary.app`, developer account `7452565767209018961`, app `4972535086793729308`.
- Internal testing remains Active with signed **1.6.2 (1)**. [Tester opt-in](https://play.google.com/apps/internaltest/4700857608593095537).
- A production draft named **1.6.2 (1) - First Android release** contains the existing signed AAB, native debug symbols, and English release notes. [Production](https://play.google.com/console/u/0/developers/7452565767209018961/app/4972535086793729308/tracks/4698106853215932939?tab=releases).
- All **178 availability entries (177 countries/regions plus Rest of World)** are saved as requested, awaiting review in Publishing overview; this does not publish the app.
- Default English store listing is **Ready to send for review**: current 512×512 icon, 1024×500 feature graphic, six supplied 1080×1920 Android marketing screenshots in order 01–06, title and descriptions. AI asset disclosure applied to the supplied feature graphic and marketing screenshots. [Listing](https://play.google.com/console/u/0/developers/7452565767209018961/app/4972535086793729308/store-listings/default/edit).
- [Source assets](https://drive.google.com/drive/folders/12zV5kMf62XgJmr2jjzRVlnpX7KxywW-Z) are also saved under `output/android-release/store-assets/`.
- Review account `daniel+test@zenfulnote.app` successfully authenticated with the supplied password, without an email code. The temporary verification session was signed out. Password deliberately omitted from this document.
- AAB/APK/native-symbol hashes verified. APK installation on Android API 36 succeeded again. This is not a runtime or billing acceptance test.

## Owner action first: merchant payments profile

[Payments profile](https://play.google.com/console/u/0/developers/7452565767209018961/paymentssettings) still says **Create a payments profile to get started** under Emotionary Developer. The profile Abe may have completed elsewhere is not reflected in this developer account. The account owner must complete/link the correct business profile. Browser automation policy requires a human to perform financial-account setup.

After the profile exists, create and activate these exact products:

| Product | Play product ID | Configuration | Reference US price |
| --- | --- | --- | --- |
| Yearly | `com.nowdrops.emotionary.pro.yearly` | Auto-renewing yearly base plan, no introductory offer | $4.99/year |
| Lifetime | `com.nowdrops.emotionary.pro.lifetime` | One-time non-consumable | $9.99 |

Prices above come from the existing Apple handoff; confirm desired Android pricing and configure prices/availability for every launch market. No Play products have been created yet.

## Reviewer paid access is a separate blocker

[Sign in details](https://play.google.com/console/u/0/developers/7452565767209018961/app/4972535086793729308/app-content/testing-credentials?source=dashboard) refuses to save unless the developer certifies that the credentials provide full access, including paid content. The form is filled in the retained browser tab, but **not saved**. Do not check the full-access certification until it is true.

The current Android build derives paid access from Google Play purchases on the device. App login does not grant a server-side paid entitlement, and an Apple purchase does not transfer to Android. Code: `src/purchases/client.ts`, `src/entitlements/index.ts`. No reviewer bypass was added.

Provide a working review-access method that unlocks the entire dictionary without requiring Google reviewers to purchase or start a free trial. This may require an app change and a new signed build; completing the merchant profile alone does not establish it. Verify on a clean Android install, then update instructions, certify full access, Add, and Save.

Prepared navigation instructions: Complete onboarding → Account → Sign in with the dedicated review account. No email code is required. Select Not now for notifications and Continue free. Today opens the daily word; Browse opens the dictionary; Stats → Settings contains Restore Purchases and account deletion. Add the verified paid-access instructions before submission.

## Dependent Console forms

1. Complete Sign in details after paid reviewer access works.
2. [Target audience](https://play.google.com/console/u/0/developers/7452565767209018961/app/4972535086793729308/app-content/target-audience-content) currently requires Sign in details first. Confirm intended ages; privacy policy says not directed to children under 13. No age groups have been guessed or submitted.
3. [Data safety](https://play.google.com/console/u/0/developers/7452565767209018961/app/4972535086793729308/app-content/data-privacy-security?source=dashboard) is saved as a draft, with the technical-provider review completed. Final completion is blocked by target audience.

Data safety draft: name/email/user IDs collected optionally for accounts; approximate location, app interactions, diagnostics, and device/other IDs collected for backend request/auth/security processing. These are marked not shared under the service-provider exemption, encrypted in transit, with account deletion at https://emotionarybook.com/delete-account. Required technical data is not marked ephemeral. Read-only Supabase checks confirmed IP/user-agent retention and gateway fields for IP-derived location, request paths and latency. Favorites, reading progress, reminders and preferences stay on-device. No ad/analytics SDK is configured. Recheck if reviewer access changes the backend or build.

Previously completed: privacy-policy link; ads/Advertising ID declarations; content rating (Everyone/PEGI 3); government, financial and health declarations; Books & Reference category; support details.

## Final acceptance and submission

Use the Play-installed internal build to test navigation, email sign-in, Google OAuth return, home-screen widget, yearly/lifetime purchase, restore, cancellation, pending payment and expiry. The available emulator has no Play Store and UI testing was not completed. Existing build/test/signing results do not establish working billing.

After those checks and all declarations are complete, open the production draft, resolve remaining validation, Save, and inspect Publishing overview. Abe can then send the changes for review and complete rollout. The initial production validation error was missing country targeting; no blocking binary error appeared. No production submission has been made.

Publishing overview confirms the country additions and complete default listing are pending review. **Send app for review** is disabled until required dashboard steps are finished. Managed publishing is currently off.

## Local evidence

- `output/android-release/publishing-overview-2026-10-22.png`
- `output/android-release/listing-ready-2026-10-22.png`
- `output/android-release/data-safety-draft-2026-10-22.png`
- Signed artifacts: `output/android-release/handoff/`
- Original build/testing details: `output/android-release/README.md`
