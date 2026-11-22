# Privacy update draft (for review)

November 22, 2026. Draft only; nothing here is live. Needs the owner's
approval (and a legal read if wanted) before it replaces the in-app policy
or the store forms are changed.

## Why it needs updating

The in-app policy (`src/app/legal/privacy.tsx` and `privacy.android.tsx`,
effective November 13, 2026) no longer matches the app:

| The policy says | What the app does now |
|---|---|
| Favorites, streak, reminder time and reading activity are stored on your device | For server push, the reminder times, time zone, streak, plan and kept words are also stored with the push token in Supabase (`push_devices`) |
| Notifications are scheduled on your device | The daily word and reminders are sent from our server through Apple Push Notification service / Firebase Cloud Messaging |
| Does not use third-party analytics | Still true, but the app now sends anonymous product events (`events`) and invite events (`invite_events`) to our own Supabase database |
| Purchases: we do not send your transaction history to our servers | Purchases are verified through RevenueCat, which receives store receipts and now also a few usage attributes |
| Supabase is the only service provider | Also RevenueCat, Apple Push Notification service, Firebase Cloud Messaging |

The website policy (emotionarybook.com/privacy, September 21, 2026) is
broad and already covers usage data, analytics, identifiers and service
providers, so it does not need to change.

## Proposed in-app policy (iOS; Android differences in brackets)

**Effective date:** the day it ships.

**Intro** (unchanged)
Emotionary is designed as a quiet, private daily ritual. This policy explains
the limited information the app handles and the choices available to you.

**Information we collect**

1. *(unchanged)* If you create an account, we process your name when supplied
   by your sign-in provider, your email address, and the account identifier
   supplied by Apple, Google, or email sign-in. Our authentication provider may
   also process routine technical information, such as IP address and device
   or browser details, to operate and protect sign-in.
2. *(new)* Your favorite words, progress, and app preferences are stored on
   your device. To send your daily word and reminders, we also store a
   notification token for your device with your reminder times, time zone,
   streak, plan, and the words you keep, so the right notification arrives at
   the right time.
3. *(replaces the "anonymous status" paragraph)* To understand how Emotionary
   is used and improve it, the app sends anonymous usage information to our
   own database: for example, that the app was opened, a word was viewed,
   saved, or shared, a notification or widget was tapped, a streak was
   reached, or the paywall was shown. It also sends a short daily status (app
   version, free or paid plan, whether notifications are on, and how many
   widgets are installed). This information uses a random identifier created
   on your device, is not linked to your name or email, never includes what
   you type, and is not used for advertising or tracking across other apps.
   Emotionary does not use advertising or third-party analytics.

**How information is used** *(first two paragraphs unchanged; third replaced)*

- When you choose to download a word card, the app requests write-only
  photo-library access to save that image. Notifications are delivered after
  you grant permission. You can change either permission in iOS Settings
  [Android Settings].

**Service providers and sharing**

Emotionary uses Supabase to provide authentication, deliver word content,
send notifications, and store the anonymous usage information described
above. RevenueCat verifies purchases and manages access; it receives your
purchase records from the App Store [Google Play] and a few usage details
(such as your streak, whether notifications are on, and how many words you
have saved) so we can understand which features matter to paying members.
Notifications are delivered through Apple Push Notification service [Firebase
Cloud Messaging]. We do not sell personal information. We disclose
information only to service providers needed to operate the app, when you
direct us to, or when required by law.
Links: Supabase privacy policy; RevenueCat privacy policy
(https://www.revenuecat.com/privacy).

**Apple purchases [Google Play purchases]**

Apple [Google Play] processes payments and manages subscriptions under its own
privacy policy. Emotionary uses RevenueCat to verify your purchase and enable
full access. We do not receive your payment card details.

**Retention and deletion** *(add one sentence)*

… Anonymous usage information is kept for up to two years and is not linked
to your account, so it is not affected by account deletion.

**Children and changes**, **Contact**: unchanged.

## App Store privacy ("App Privacy" in App Store Connect)

Check these against what is declared today.

| Data type | Collected | Linked to the user | Used for tracking | Purposes |
|---|---|---|---|---|
| Contact info → Email address | Yes (accounts) | Yes | No | App functionality, developer's advertising or marketing (marketing emails) |
| Contact info → Name | Yes (from Apple/Google sign-in) | Yes | No | App functionality |
| User content → Other (saved words, kept words) | Yes (push) | No | No | App functionality |
| Identifiers → User ID | Yes (account id) | Yes | No | App functionality |
| Identifiers → Device ID (random install id, push token) | Yes | No | No | App functionality, analytics |
| Purchases → Purchase history | Yes (RevenueCat) | Yes | No | App functionality |
| Usage data → Product interaction | Yes | **Yes** (RevenueCat attributes sit on the signed-in customer) | No | Analytics |
| Diagnostics | No (crash reports come from Apple, not the app) | | | |

"Data used to track you": **none**. No App Tracking Transparency prompt.

## Google Play Data safety

| Data type | Collected | Shared | Optional | Purposes |
|---|---|---|---|---|
| Personal info → Email address, Name | Yes | No | Yes (account) | Account management, app functionality, marketing |
| Personal info → User IDs | Yes | No | Yes | Account management, app functionality |
| Financial info → Purchase history | Yes | No | No | App functionality |
| App activity → App interactions | Yes | No | No | Analytics |
| App activity → Other actions (saved words, reminder times) | Yes | No | No | App functionality |
| Device or other IDs | Yes | No | No | App functionality, analytics |

Also: data is encrypted in transit (yes); people can ask for their data to be
deleted (yes: Settings → Delete account, or emotionarybook.com/delete-account);
not collected from children.
Service providers that process data for us (Supabase, RevenueCat, Firebase) do
not count as "shared" under Google's definition.
