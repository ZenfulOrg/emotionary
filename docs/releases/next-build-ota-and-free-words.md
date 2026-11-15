# Next store build: admin-controlled free words, OTA updates, update prompt

Prepared 2026-11-13. Not yet released.

## What this build adds

1. **Free words from Supabase.** `words.is_free` decides access and
   `words.free_order` (1 = first) decides order. Both are edited in the admin
   panel and reach users on next app open, with no store release.
2. **Kept words.** Free users keep any word they read or saved while it was
   free, plus the 1.7.0 free words (Acedia … Dysphoria) they had read or saved.
   Changing the free list never takes a word away from someone.
3. **Update prompt.** `public.app_config` (one row) can show a dismissible
   "new version" dialog (`*_latest_version`) or, only if ever needed, require
   an update (`*_min_version`). All columns null = nothing shown.
4. **Over-the-air updates (EAS Update).** JS/UI/copy changes ship without App
   Review. Runtime policy is `appVersion`: an update only reaches binaries with
   the same version, so anything native still needs a new store version.
   Updates download in the background and apply on the next launch.

## Release order (each step is invisible to users)

1. Apply `supabase/migrations/20261113200000_words_free_order.sql` and
   `20261113210000_app_config.sql`. Additive only; 1.7.0 is unaffected.
2. Deploy the admin panel (needs the `free_order` column from step 1).
3. Do **not** swap free words until most users are on the new version (1.7.0
   ignores `is_free`, so the two versions would disagree).
4. One-time EAS Update setup (needs an Expo login):
   - `npx expo install expo-updates`
   - `npx eas-cli update:configure` (adds `updates.url` and `extra.eas.projectId`)
   - Sync the native project the usual way, then `pod install`; confirm
     `ios/Emotionary/Supporting/Expo.plist` has `EXUpdatesEnabled = true`,
     `EXUpdatesURL`, `EXUpdatesRuntimeVersion` and the `expo-channel-name`
     request header `production`.
5. Bump `expo.version` (e.g. 1.7.1). This is also the OTA runtime version.
6. `npm run pull-content` (bundled seed must carry current `is_free`/`free_order`),
   `npm run typecheck`, `npm test`.
7. TestFlight / Play internal: test as a free user, a paid user, and a fresh
   install in airplane mode. Publish a no-op `eas update --channel production`
   to the TestFlight build and confirm it applies on the second launch.
8. Submit with Apple **phased release** and a Play **staged rollout**.
9. Once rolled out, set `ios_latest_version` / `android_latest_version` in
   `app_config` to nudge remaining 1.7.0 users.

## After this build

- Change free words: admin panel → word → "Free in the mobile app" + "Free order".
- Ship a JS fix: `eas update --channel production --message "..."`
  (start with `--rollout-percentage 10`; roll back with `eas update:rollback`).
- Needs a store build: new native modules, permissions, icon/splash, Expo SDK
  upgrades, widget native changes.

## Not verified

- No typecheck or tests were run when this was prepared (no Node on that machine).
- EAS project ID and update URL are not set yet (step 4).
