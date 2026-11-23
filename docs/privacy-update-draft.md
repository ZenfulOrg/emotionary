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

## Legal review (November 22, 2026)

Not legal advice: a checklist for a privacy lawyer to confirm. It compares
the app's data flows with the laws and store rules that usually apply to a
US consumer app sold worldwide.

### Problems in the app and in this draft (fix before shipping)

1. **"Anonymous" is the wrong word.** A random install id that stays the same
   over time is a unique identifier. That makes it *personal information*
   under the CCPA and *pseudonymous personal data* under the GDPR, not
   anonymous data. The policy should say "not linked to your name or email",
   not "anonymous".
2. **Usage events can be linked to an account today.** `syncCustomerAttributes()`
   puts `install_id` on the RevenueCat customer, and the RevenueCat customer id
   is the Supabase user id. Anyone with both systems can join the `events`
   table to a person. So the draft sentence "not linked to your account, so it
   is not affected by account deletion" would be false.
   **Fix:** stop sending `install_id` to RevenueCat (the habit attributes
   still work without it). Then the sentence becomes true.
   **Done in code** (`src/analytics/customer.ts`): sends an empty `install_id`,
   which removes the value from customers that already have it. Ships with
   the next build.
3. **Account deletion only deletes the sign-in record.** The `delete-account`
   function calls `auth.admin.deleteUser` and nothing else. It does not
   delete the RevenueCat customer or its attributes, and it does not clear
   `push_devices` rows for that person. Deletion rights (CCPA, GDPR, the
   state laws, and Apple guideline 5.1.1(v)) cover data held by service
   providers too. **Fix:** delete the RevenueCat customer (REST API, server
   side) and any account-linked rows in the same function. Purchase records
   that must be kept for tax or accounting can be kept, and the policy should
   say so.
   **Done in code** (`supabase/functions/delete-account`): deletes the
   RevenueCat customer before the account, and stops with "try again" if
   RevenueCat fails. No app table links to the account, so nothing else to
   delete. Needs the function deployed and a `REVENUECAT_SECRET_KEY` secret
   in Supabase; until then it deletes the account only, as before. Deleting
   the customer does not cancel a store subscription; people cancel that in
   the App Store or Google Play, and the policy should say so.
4. **EU and UK consent for analytics.** The ePrivacy rules (Article 5(3)) and
   the UK equivalent (PECR) require consent before an app stores or reads an
   identifier on the device for analytics, unless the analytics is strictly
   necessary. Some regulators allow narrow first-party audience measurement
   without consent (France's CNIL, for example), but many do not. This is the
   biggest open legal call. Options, for the lawyer to choose:
   - a "Share usage data" switch in Settings, on by default outside the EU and
     UK, off until turned on in the EU and UK; or
   - the switch for everyone, on by default, and rely on the narrow exemption
     (more risk in the EU).
5. **The policy is missing required parts** (list below).

### Which laws apply

| Law | Applies to Emotionary now? | What it needs |
|---|---|---|
| California CalOPPA | **Yes** (any app with California users) | A clear policy, effective date, how changes are announced, how the app responds to Do Not Track signals |
| California CCPA/CPRA | Probably not yet: applies at $26,625,000+ yearly revenue, 100,000+ California consumers or households, or 50%+ of revenue from selling or sharing data | If it applies: notice at collection, right to know, delete and correct, "we do not sell or share", no discrimination for using rights |
| Other US state privacy laws (about 20 in force in 2026, including Indiana, Kentucky and Rhode Island from January 1, 2026) | Mostly no: most start at 100,000 consumers in the state | Rights to access, delete, correct and export; a way to **appeal** a refused request (Virginia, Colorado, Connecticut and others) |
| Texas TDPSA | Applies to businesses that are not "small" under SBA rules; small businesses are exempt except that they may not sell sensitive data without consent | Same rights as above |
| GDPR and UK GDPR | **Yes**, if the app is offered in the EU or UK | Name and contact of the controller, legal basis for each use, retention per kind of data, rights (access, delete, correct, export, object, complain to a regulator), international transfers, and possibly an EU/UK representative (Article 27) |
| ePrivacy / PECR | **Yes**, EU and UK | Consent for the analytics identifier (problem 4) |
| COPPA (amended rule, compliance date April 22, 2026) | No, if the app is not aimed at children under 13 and does not knowingly collect their data | Say so; delete data if a child's data is found |
| Apple App Store guidelines 5.1.1 and 5.1.2 | **Yes** | In-app account deletion that really deletes; App Privacy answers that match; a policy link in the app and store listing |
| Google Play User Data policy and Data safety | **Yes** | A policy link in the app and store listing; Data safety answers that match; a web page for deletion requests (emotionarybook.com/delete-account exists) |

Tax law does not belong in a privacy policy. Apple and Google are the seller
of record for in-app purchases and collect and remit sales tax and VAT in most
countries. Income tax on the payouts is a question for an accountant, not this
document. The only tie to privacy: purchase records may be kept as long as tax
law requires, and the policy should say that.

### Parts the policy needs to add

- Who is responsible: the company's legal name, postal address and a privacy
  email (needed by CalOPPA, GDPR and the state laws).
- Why each kind of data is used and, for the EU and UK, the legal basis:
  - Account, notifications and purchases: performing the service (contract).
  - Usage information: legitimate interest in improving the app, or consent
    in the EU and UK (problem 4).
  - Marketing emails: consent.
- How long each kind of data is kept (not one sentence for everything):
  - Account data: until the account is deleted.
  - Notification data: until notifications are turned off, or 90 days after
    the last open.
  - Usage information: the period you choose (two years proposed). This needs
    a scheduled cleanup job, because nothing deletes old events today.
  - Purchase records: as long as tax and accounting law requires.
- Your rights and how to use them:
  - Access, deletion, correction, export and objection.
  - How to ask (email), how fast we reply (45 days for US state laws, one
    month for the GDPR), and how to appeal.
  - In the EU and UK, the right to complain to a data protection regulator.
- "We do not sell or share personal information" (CCPA wording) and "we do not
  use it for targeted advertising".
- Do Not Track: the app does not track people across other apps or sites, so
  there is nothing to switch off.
- International transfers: data is processed in the United States (and in the
  Supabase project's region). Transfers out of the EU and UK rely on the
  providers' Standard Contractual Clauses or the EU-US Data Privacy Framework.
  Check each provider's data processing agreement.
- Children: not for children under 13 (under 16 in the EU). Data found to
  come from a child is deleted.
- Changes: say how people are told about big changes (in the app, or by email
  if they have an account).

### Contracts to have on file

Data processing agreements with Supabase, RevenueCat and Google (Firebase).
All three offer standard ones. Accept or download them so they are on record.

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
   is used and improve it, the app sends usage information to our own
   database: for example, that the app was opened, a word was viewed,
   saved, or shared, a notification or widget was tapped, a streak was
   reached, or the paywall was shown. It also sends a short daily status (app
   version, free or paid plan, whether notifications are on, and how many
   widgets are installed). This information uses a random identifier created
   on your device, is not linked to your name, email or account, never
   includes what you type, and is not used for advertising or tracking across
   other apps. You can turn it off in Settings → Share usage data. Emotionary
   does not use advertising or third-party analytics. We do not sell or share
   personal information.

**How information is used** *(first two paragraphs unchanged; third replaced)*

- When you choose to download a word card, the app requests write-only
  photo-library access to save that image. Notifications are delivered after
  you grant permission. You can change either permission in iOS Settings
  [Android Settings].

**Service providers and sharing**

Emotionary uses Supabase to provide authentication, deliver word content,
send notifications, and store the usage information described above. RevenueCat verifies purchases and manages access; it receives your
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

… Usage information is kept for up to two years [owner to confirm] and is
not linked to your account. When you delete your account we also delete your
RevenueCat customer record; purchase records are kept only as long as tax and
accounting law requires.
(Requires the two fixes in the legal review: no install id in RevenueCat, and
a fuller delete-account function.)

**Your rights**, **International transfers**, **Do Not Track**: new; see
"Parts the policy needs to add" above.

**Children and changes**, **Contact**: keep, and add the company's legal
name, postal address and privacy email.

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
