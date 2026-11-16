-- Server push for the daily word (and the streak reminder), so devices keep
-- getting notifications however long it has been since the app was opened.
--
-- One row per install (the same random install id as device_status; never
-- linked to an account). Devices write only through register_push_device();
-- nobody can read rows with the public key. The send-notifications Edge
-- Function reads them with the service role.

create table if not exists public.push_devices (
  install_id           uuid primary key,
  platform             text not null check (platform in ('ios', 'android')),
  -- APNs device token (hex) on iOS, FCM registration token on Android
  token                text not null check (char_length(token) between 32 and 512),
  -- APNs environment for iOS builds ('development' = Xcode/sandbox)
  apns_environment     text check (apns_environment in ('development', 'production')),
  timezone             text not null check (char_length(timezone) between 1 and 64),
  notify_hour          smallint not null check (notify_hour between 0 and 23),
  notify_minute        smallint not null check (notify_minute between 0 and 59),
  enabled              boolean not null default true,
  plan                 text not null check (plan in ('free', 'paid')),
  -- Paid words this free user keeps (read or saved while free)
  kept_slugs           text[] not null default '{}' check (cardinality(kept_slugs) <= 5000),
  streak               integer not null default 0 check (streak >= 0),
  last_open_date       date,
  app_version          text check (char_length(app_version) <= 20),
  last_daily_sent_on   date,
  last_rescue_sent_on  date,
  consecutive_failures smallint not null default 0,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

comment on table public.push_devices is
  'Push tokens and delivery settings per install (no account link). Written via register_push_device().';

create index if not exists push_devices_enabled_idx on public.push_devices (enabled) where enabled;

alter table public.push_devices enable row level security;
revoke all on public.push_devices from anon, authenticated;

-- Server push is switched on here once the sender is configured and tested.
-- Until then devices keep scheduling their own notifications.
create table if not exists public.push_settings (
  id        boolean primary key default true check (id),
  push_live boolean not null default false
);
insert into public.push_settings (id, push_live) values (true, false) on conflict (id) do nothing;
alter table public.push_settings enable row level security;
revoke all on public.push_settings from anon, authenticated;

-- Saves this install's token and settings. Returns whether server push is
-- live, so the app knows whether to stop scheduling notifications itself.
create or replace function public.register_push_device(
  p_install_id uuid,
  p_platform text,
  p_token text,
  p_apns_environment text,
  p_timezone text,
  p_notify_hour integer,
  p_notify_minute integer,
  p_enabled boolean,
  p_plan text,
  p_kept_slugs text[],
  p_streak integer,
  p_last_open_date date,
  p_app_version text
) returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'unknown timezone';
  end if;

  insert into public.push_devices as d (
    install_id, platform, token, apns_environment, timezone, notify_hour, notify_minute,
    enabled, plan, kept_slugs, streak, last_open_date, app_version
  ) values (
    p_install_id, p_platform, p_token, p_apns_environment, p_timezone, p_notify_hour,
    p_notify_minute, p_enabled, p_plan, coalesce(p_kept_slugs, '{}'), greatest(p_streak, 0),
    p_last_open_date, p_app_version
  )
  on conflict (install_id) do update set
    platform             = excluded.platform,
    token                = excluded.token,
    apns_environment     = excluded.apns_environment,
    timezone             = excluded.timezone,
    notify_hour          = excluded.notify_hour,
    notify_minute        = excluded.notify_minute,
    enabled              = excluded.enabled,
    plan                 = excluded.plan,
    kept_slugs           = excluded.kept_slugs,
    streak               = excluded.streak,
    last_open_date       = excluded.last_open_date,
    app_version          = excluded.app_version,
    -- a fresh token from the device clears earlier delivery failures
    consecutive_failures = case when d.token = excluded.token then d.consecutive_failures else 0 end,
    updated_at           = now();

  return (select push_live from public.push_settings where id);
end;
$$;

revoke all on function public.register_push_device(
  uuid, text, text, text, text, integer, integer, boolean, text, text[], integer, date, text
) from public;
grant execute on function public.register_push_device(
  uuid, text, text, text, text, integer, integer, boolean, text, text[], integer, date, text
) to anon, authenticated;
