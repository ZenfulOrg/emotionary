# Emotionary product analytics plan

Draft, November 22, 2026. What to measure, how, and what it answers. Nothing
here is built yet except where marked **(live)**.

## Principles

- **Few questions, well answered.** Every event exists to answer a question
  below. If no one will look at it, it is not tracked.
- **Anonymous by default.** A random install id (already used by
  `device_status`, `push_devices` and `invite_events`). No advertising id, no
  tracking across other apps, so no App Tracking Transparency prompt. When
  someone signs in, link the install to a random account id (never the email)
  so one person on two phones counts once.
- **One naming style.** `object_action` in snake_case, past tense:
  `word_viewed`, `paywall_shown`. Properties in snake_case. A short, fixed list
  (below), reviewed before adding more.
- **Same events on iOS and Android**, sent from shared code.
- **Revenue comes from RevenueCat, not app events.** It already knows trials,
  conversions, renewals, refunds and churn, per store.
- **Update the privacy policy and the App Store / Play data-safety forms**
  before shipping (data type: "Product interaction", not linked to identity,
  not used for tracking).

## The one number: North Star

**Weekly engaged readers**: people who opened the app or a widget and saw the
day's word on at least 3 of the last 7 days. It captures the habit the
product is built on, and it leads revenue and word of mouth.

## What to measure (by stage)

| Stage | Question | Metric |
|---|---|---|
| Acquisition | Where do new people come from? | Installs by store and country (App Store Connect, Play Console); invite and card links opened (`?ref=`) |
| Activation | Do new people get to the good part? | % who finish onboarding; % who allow notifications; % who read a word on day 1; % who add a widget in week 1 |
| Engagement | Is it a daily habit? | DAU, WAU, MAU; stickiness (DAU ÷ MAU, aim for 30%+); streak length spread; words read per day; notification open rate; widget taps |
| Retention | Do they come back? | Day 1 / 7 / 30 retention by install week (cohorts), split by notifications on/off and widget yes/no |
| Revenue | Who pays, and what makes them? | Paywall shown → purchase, by where the paywall opened; trial → paid; lifetime vs subscription mix; churn (RevenueCat) |
| Referral | Do people bring friends? | Invite pop-up shown → shared **(live)**; word cards shared per active user; links opened per share |
| Quality | Is it working? | Crash-free sessions (aim 99.5%+); app start time; failed syncs and purchases |
| Feedback | Do they like it? | App Store rating and reviews; rating-prompt outcomes; one-question survey after 30 days |

## Events (the whole list)

Every event carries: `install_id`, `platform`, `app_version`, `plan`
(free/paid), `days_since_install`, `streak`.

| Event | When | Extra properties |
|---|---|---|
| `app_opened` | Cold start or back from background | `source`: icon / notification / widget / link |
| `onboarding_step_viewed` | Each onboarding page | `step` |
| `onboarding_completed` | Last page done | `reminder_count`, `account`: yes/no |
| `notification_permission_answered` | iOS / Android prompt answered | `granted` |
| `reminder_times_changed` | Times edited (onboarding or Stats) | `count`, `earliest_hour` |
| `word_viewed` | A word's meaning on screen ~2 s | `word_type`, `is_today`, `locked` |
| `word_saved` / `word_unsaved` | Save tapped | `word_type` |
| `word_shared` | Share sheet completed | `theme`, `destination` when the OS tells us |
| `pronunciation_played` | Audio tapped | |
| `origin_opened` | Origin card flipped | |
| `search_performed` | Search submitted | `results_count` (never the text) |
| `notification_opened` | Notification tapped | `kind`: daily / reminder / streak / admin |
| `widget_tapped` | Widget link opened | `size`, `action`: open / like / share |
| `widget_count_changed` | Widgets placed changed | `count` (already in `device_status` **(live)**) |
| `streak_milestone` | Streak hits 3, 7, 14, 30, 100 | `length` |
| `paywall_shown` | Paywall or unlock sheet opened | `placement`, `word_type` |
| `purchase_started` / `purchase_completed` / `purchase_failed` | Store flow | `product`, `placement` (revenue itself from RevenueCat) |
| `invite_shown` / `invite_shared` / `invite_dismissed` | Invite pop-up | `source` **(live in `invite_events`)** |
| `rating_prompt_shown` | Review prompt asked | `trigger` |
| `account_created` / `signed_in` / `signed_out` | Account | `method`: email / apple / google |

About 25 events. At today's scale that is well under 1 million events a month.

## Tools (recommended)

| Need | Tool | Why |
|---|---|---|
| Product events, funnels, cohorts | **PostHog** (free up to 1M events/month) | React Native SDK, funnels, retention charts and feature flags in one place; can keep data in the EU or US; turn off session replay and autocapture |
| Revenue | **RevenueCat** (already set up) | Trials, conversion, churn, lifetime value per store |
| Crashes and slow starts | **Sentry** (free tier) | Crash-free sessions and stack traces with source maps for Expo |
| Store numbers | App Store Connect, Play Console | Installs, page views, ratings by country |
| Our own anonymous tables | Supabase **(live)** | `device_status`, `push_devices`, `invite_events` keep working; no need to move them |

Supabase-only is possible (one `events` table and SQL views), but funnels,
cohort retention and dashboards would have to be built by hand. PostHog gives
them for free.

## Dashboards (weekly review)

1. **Health:** weekly engaged readers, DAU/MAU, crash-free sessions.
2. **New people:** onboarding funnel, notification opt-in, day 1/7/30 retention by install week.
3. **Habit:** streak spread, notification open rate, widget adoption.
4. **Money:** paywall → purchase by placement, trial → paid, monthly revenue (RevenueCat).
5. **Word of mouth:** invite funnel by moment, cards shared, links opened.

## Rollout

1. Pick the tool; update the privacy policy and store data forms.
2. Add a tiny `track()` wrapper (one file), then the events above, iOS and Android together.
3. Add Sentry.
4. Build the five dashboards; review weekly for a month, then prune events no one used.
