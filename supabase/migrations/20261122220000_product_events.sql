-- Anonymous product events and the team's metric views (docs/analytics-plan.md).
--
-- The app sends batches through report_events(), keyed by the random install
-- id it already uses for device_status and push (never an account or email).
-- Nobody can read events with the public key; the metrics_* views are read
-- with the service role (SQL editor / admin).

create table if not exists public.events (
  id           bigint generated always as identity primary key,
  install_id   uuid not null,
  event        text not null check (event ~ '^[a-z_]{3,40}$'),
  props        jsonb not null default '{}'::jsonb check (pg_column_size(props) <= 2048),
  platform     text not null check (platform in ('ios', 'android')),
  app_version  text check (char_length(app_version) <= 20),
  occurred_at  timestamptz not null,
  received_at  timestamptz not null default now()
);

create index if not exists events_occurred_at_idx on public.events (occurred_at);
create index if not exists events_install_event_idx on public.events (install_id, event, occurred_at);

comment on table public.events is
  'Anonymous product events (no account link). Written via report_events().';

alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;

-- One batch per call (at most 50 events). A device clock more than a week
-- off is replaced by the server time.
create or replace function public.report_events(
  p_install_id uuid,
  p_platform text,
  p_app_version text,
  p_events jsonb
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.events (install_id, event, props, platform, app_version, occurred_at)
  select
    p_install_id,
    e ->> 'event',
    coalesce(e -> 'props', '{}'::jsonb),
    p_platform,
    left(p_app_version, 20),
    case
      when coalesce(e ->> 'at', '') ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}' then
        case
          when (e ->> 'at')::timestamptz between now() - interval '7 days' and now() + interval '1 day'
          then (e ->> 'at')::timestamptz
          else now()
        end
      else now()
    end
  from jsonb_array_elements(case when jsonb_typeof(p_events) = 'array' then p_events else '[]'::jsonb end)
       with ordinality as t(e, n)
  where n <= 50 and jsonb_typeof(e) = 'object';
$$;

revoke all on function public.report_events(uuid, text, text, jsonb) from public;
grant execute on function public.report_events(uuid, text, text, jsonb) to anon, authenticated;

-- 1. Health, per week: active installs, weekly engaged readers (opened on 3+
--    days of the week), average daily actives and stickiness.
create or replace view public.metrics_health
with (security_invoker = on) as
with days as (
  select distinct install_id, date_trunc('week', occurred_at)::date as week, occurred_at::date as day
  from public.events
  where event = 'app_opened' and occurred_at > now() - interval '26 weeks'
),
per_install as (
  select week, install_id, count(*) as days_open from days group by week, install_id
),
per_day as (
  select week, day, count(*) as dau from days group by week, day
)
select
  p.week,
  count(*)                                   as weekly_active,
  count(*) filter (where p.days_open >= 3)   as engaged_readers,
  (select round(avg(d.dau), 1) from per_day d where d.week = p.week) as avg_daily_active,
  round((select avg(d.dau) from per_day d where d.week = p.week) / nullif(count(*), 0), 2) as stickiness
from per_install p
group by p.week
order by p.week desc;

-- 2. Retention by install week: share of installs that opened the app again
--    on day 1, day 7 and day 30 after their first open.
create or replace view public.metrics_retention
with (security_invoker = on) as
with first_open as (
  select install_id, min(occurred_at)::date as first_day
  from public.events where event = 'app_opened' group by install_id
),
opens as (
  select distinct install_id, occurred_at::date as day from public.events where event = 'app_opened'
)
select
  date_trunc('week', f.first_day)::date as install_week,
  count(*) as installs,
  round(100.0 * count(*) filter (where exists (select 1 from opens o where o.install_id = f.install_id and o.day = f.first_day + 1)) / count(*), 1) as day1_pct,
  round(100.0 * count(*) filter (where exists (select 1 from opens o where o.install_id = f.install_id and o.day = f.first_day + 7)) / count(*), 1) as day7_pct,
  round(100.0 * count(*) filter (where exists (select 1 from opens o where o.install_id = f.install_id and o.day = f.first_day + 30)) / count(*), 1) as day30_pct
from first_open f
group by 1
order by 1 desc;

-- 3. Onboarding funnel, last 90 days: installs reaching each page, finishing,
--    and allowing notifications.
create or replace view public.metrics_onboarding
with (security_invoker = on) as
select
  coalesce(props ->> 'step', event) as step,
  min(coalesce((props ->> 'index')::int, 99)) as step_order,
  count(distinct install_id) as installs
from public.events
where occurred_at > now() - interval '90 days'
  and (event in ('onboarding_step_viewed', 'onboarding_completed')
       or (event = 'notification_permission_answered' and props ->> 'granted' = 'true'
           and props ->> 'where' = 'onboarding'))
group by 1
order by 2, 3 desc;

-- 4. Habit, per week: notification and widget opens, saves and shares per
--    active install.
create or replace view public.metrics_habit
with (security_invoker = on) as
select
  date_trunc('week', occurred_at)::date as week,
  count(distinct install_id) filter (where event = 'app_opened')         as weekly_active,
  count(*) filter (where event = 'notification_opened')                  as notification_opens,
  count(*) filter (where event = 'widget_tapped')                        as widget_taps,
  count(*) filter (where event = 'word_viewed')                          as words_viewed,
  count(*) filter (where event = 'word_saved')                           as words_saved,
  count(*) filter (where event = 'word_shared')                          as words_shared,
  count(*) filter (where event = 'streak_milestone' and props ->> 'length' = '7')  as reached_7_day_streak,
  count(*) filter (where event = 'streak_milestone' and props ->> 'length' = '30') as reached_30_day_streak
from public.events
where occurred_at > now() - interval '26 weeks'
group by 1
order by 1 desc;

-- 5. Paywall, last 90 days, by where it opened: installs that saw it, started
--    a purchase and completed one. Revenue itself is in RevenueCat.
create or replace view public.metrics_paywall
with (security_invoker = on) as
select
  coalesce(props ->> 'placement', 'unknown') as placement,
  count(distinct install_id) filter (where event = 'paywall_shown')      as saw_paywall,
  count(distinct install_id) filter (where event = 'purchase_started')   as started_purchase,
  count(distinct install_id) filter (where event = 'purchase_completed') as purchased,
  round(100.0 * count(distinct install_id) filter (where event = 'purchase_completed')
        / nullif(count(distinct install_id) filter (where event = 'paywall_shown'), 0), 1) as conversion_pct
from public.events
where occurred_at > now() - interval '90 days'
  and event in ('paywall_shown', 'purchase_started', 'purchase_completed')
group by rollup (coalesce(props ->> 'placement', 'unknown'))
order by 2 desc;

revoke all on public.metrics_health, public.metrics_retention, public.metrics_onboarding,
  public.metrics_habit, public.metrics_paywall from anon, authenticated;
