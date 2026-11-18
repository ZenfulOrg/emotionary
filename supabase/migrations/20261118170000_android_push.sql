-- Android server push (FCM).
--  * push_settings.android_push_live: a separate switch for Android, off until
--    a test push has reached a real phone. While off, the server sends nothing
--    to Android and register_push_device answers "not live", so Android keeps
--    scheduling its own local notifications (no doubles, no gaps).
--  * When on, Android works like iOS: the server sends every daily word (never
--    running out after 38 days), triggered and one-off messages.

alter table public.push_settings
  add column if not exists android_push_live boolean not null default false;

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

  return (
    select s.push_live and (p_platform = 'ios' or (p_platform = 'android' and s.android_push_live))
    from public.push_settings s
    where s.id
  );
end;
$function$;

revoke all on function public.register_push_device(
  uuid, text, text, text, text, integer, integer, boolean, text, text[], integer, date, text, date
) from public;
grant execute on function public.register_push_device(
  uuid, text, text, text, text, integer, integer, boolean, text, text[], integer, date, text, date
) to anon, authenticated;
