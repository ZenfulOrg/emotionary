-- Several notification times a day (app 1.8.1+): the first brings the day's
-- word, later ones remind of the same word. Old apps never send extra times.
-- The send job also runs every minute now, so a notification lands on time
-- instead of up to 14 minutes late.

alter table public.push_devices
  add column if not exists extra_minutes integer[] not null default '{}',
  add column if not exists extra_sent_on date,
  add column if not exists extra_sent_minutes integer[] not null default '{}';

drop function if exists public.register_push_device(
  uuid, text, text, text, text, integer, integer, boolean, text, text[], integer, date, text, date
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
  p_welcome_date date default null,
  p_extra_minutes integer[] default null
) returns boolean
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_extra integer[];
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'unknown timezone';
  end if;

  -- At most three later times, each a real minute of the day, no repeats.
  select coalesce(array_agg(m order by m), '{}')
    into v_extra
    from (
      select distinct m
      from unnest(coalesce(p_extra_minutes, '{}')) as m
      where m between 0 and 1439 and m <> p_notify_hour * 60 + p_notify_minute
      order by m
      limit 3
    ) as t;

  insert into public.push_devices as d (
    install_id, platform, token, apns_environment, timezone, notify_hour, notify_minute,
    enabled, plan, kept_slugs, streak, last_open_date, app_version, welcome_date, extra_minutes
  ) values (
    p_install_id, p_platform, p_token, p_apns_environment, p_timezone, p_notify_hour,
    p_notify_minute, p_enabled, p_plan, coalesce(p_kept_slugs, '{}'), greatest(p_streak, 0),
    p_last_open_date, p_app_version, p_welcome_date, v_extra
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
    extra_minutes        = case when p_extra_minutes is null then d.extra_minutes else excluded.extra_minutes end,
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
  uuid, text, text, text, text, integer, integer, boolean, text, text[], integer, date, text, date, integer[]
) from public;
grant execute on function public.register_push_device(
  uuid, text, text, text, text, integer, integer, boolean, text, text[], integer, date, text, date, integer[]
) to anon, authenticated;

-- The send job claims each reminder before sending, so overlapping runs never
-- send one twice. True when this call claimed it.
create or replace function public.claim_push_reminder(p_install_id uuid, p_date date, p_minute integer)
returns boolean
language sql
security definer
set search_path to ''
as $function$
  with claimed as (
    update public.push_devices
    set extra_sent_minutes = case when extra_sent_on = p_date then extra_sent_minutes || p_minute else array[p_minute] end,
        extra_sent_on = p_date
    where install_id = p_install_id
      and not (extra_sent_on is not distinct from p_date and p_minute = any(extra_sent_minutes))
    returning 1
  )
  select exists (select 1 from claimed);
$function$;

revoke all on function public.claim_push_reminder(uuid, date, integer) from public, anon, authenticated;
grant execute on function public.claim_push_reminder(uuid, date, integer) to service_role;

select cron.alter_job(
  (select jobid from cron.job where jobname = 'send-notifications'),
  schedule := '* * * * *'
);
