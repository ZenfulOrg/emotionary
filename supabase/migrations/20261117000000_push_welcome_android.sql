-- Server push, ready to go live:
--  * welcome_date: the local date the device finished onboarding, so the
--    server sends the same curated welcome word Today shows for the first two
--    weeks. Null for people who joined before welcome words (they get the
--    shared daily word, like the app shows them).
--  * Android: the server can't send to Android yet (FCM comes later), so it
--    always answers "not live" to Android devices and they keep scheduling
--    their own notifications.

alter table public.push_devices add column if not exists welcome_date date;

-- Replaced, not overloaded: a second signature would make calls that omit
-- p_welcome_date (older builds) ambiguous.
drop function if exists public.register_push_device(
  uuid, text, text, text, text, integer, integer, boolean, text, text[], integer, date, text
);

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
  p_app_version text,
  p_welcome_date date default null
) returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'unknown timezone';
  end if;

  insert into public.push_devices as d (
    install_id, platform, token, apns_environment, timezone, notify_hour, notify_minute,
    enabled, plan, kept_slugs, streak, last_open_date, app_version, welcome_date
  ) values (
    p_install_id, p_platform, p_token, p_apns_environment, p_timezone, p_notify_hour,
    p_notify_minute, p_enabled, p_plan, coalesce(p_kept_slugs, '{}'), greatest(p_streak, 0),
    p_last_open_date, p_app_version, p_welcome_date
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
    welcome_date         = coalesce(excluded.welcome_date, d.welcome_date),
    consecutive_failures = case when d.token = excluded.token then d.consecutive_failures else 0 end,
    updated_at           = now();

  -- Only iOS is sent from the server for now.
  return p_platform = 'ios' and (select push_live from public.push_settings where id);
end;
$function$;

revoke all on function public.register_push_device(
  uuid, text, text, text, text, integer, integer, boolean, text, text[], integer, date, text, date
) from public;
grant execute on function public.register_push_device(
  uuid, text, text, text, text, integer, integer, boolean, text, text[], integer, date, text, date
) to anon, authenticated;
