-- Anonymous adoption stats: how many devices have notifications on and a
-- widget placed, split by free/paid and platform.
--
-- One row per install (a random id generated on the device, never linked to
-- an account). Devices write only through report_device_status(); nobody can
-- read rows with the public key. The team reads device_status_summary with
-- the service role (admin panel / SQL editor).

create table if not exists public.device_status (
  install_id               uuid primary key,
  platform                 text not null check (platform in ('ios', 'android')),
  app_version              text check (char_length(app_version) <= 20),
  plan                     text not null check (plan in ('free', 'paid')),
  -- OS permission: granted / denied / undetermined
  notification_permission  text not null check (notification_permission in ('granted', 'denied', 'undetermined')),
  -- The in-app daily reminder switch
  reminders_enabled        boolean not null,
  -- Number of Emotionary widgets placed; null when the OS can't tell us
  widget_count             smallint check (widget_count is null or widget_count between 0 and 100),
  first_seen_at            timestamptz not null default now(),
  last_seen_at             timestamptz not null default now()
);

comment on table public.device_status is
  'Anonymous per-install adoption status (no account link). Written via report_device_status().';

alter table public.device_status enable row level security;
revoke all on public.device_status from anon, authenticated;

create or replace function public.report_device_status(
  p_install_id uuid,
  p_platform text,
  p_app_version text,
  p_plan text,
  p_notification_permission text,
  p_reminders_enabled boolean,
  p_widget_count integer
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.device_status as d (
    install_id, platform, app_version, plan, notification_permission,
    reminders_enabled, widget_count
  ) values (
    p_install_id, p_platform, p_app_version, p_plan, p_notification_permission,
    p_reminders_enabled, case when p_widget_count < 0 then null else p_widget_count end
  )
  on conflict (install_id) do update set
    platform                = excluded.platform,
    app_version             = excluded.app_version,
    plan                    = excluded.plan,
    notification_permission = excluded.notification_permission,
    reminders_enabled       = excluded.reminders_enabled,
    widget_count            = excluded.widget_count,
    last_seen_at            = now();
$$;

revoke all on function public.report_device_status(uuid, text, text, text, text, boolean, integer) from public;
grant execute on function public.report_device_status(uuid, text, text, text, text, boolean, integer)
  to anon, authenticated;

-- Devices seen in the last 30 days. "notifications_on" means the OS allows
-- them AND the in-app reminder is on, i.e. the device actually gets the
-- daily notification.
create or replace view public.device_status_summary
with (security_invoker = on) as
select
  plan,
  platform,
  count(*)                                                                    as active_devices,
  count(*) filter (where notification_permission = 'granted' and reminders_enabled) as notifications_on,
  count(*) filter (where widget_count > 0)                                    as widget_installed,
  count(*) filter (where widget_count is null)                                as widget_unknown
from public.device_status
where last_seen_at > now() - interval '30 days'
group by rollup (plan, platform);

revoke all on public.device_status_summary from anon, authenticated;
