-- Runs the send-notifications Edge Function every 15 minutes. The function
-- checks the x-push-secret header against public.push_cron_secret, which is
-- generated in the database and never leaves it except in this request.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Counts failed sends; a device that keeps failing is switched off.
create or replace function public.increment_push_failures(p_install_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_devices
  set consecutive_failures = consecutive_failures + 1,
      enabled = case when consecutive_failures + 1 >= 10 then false else enabled end,
      updated_at = now()
  where install_id = p_install_id;
$$;
revoke all on function public.increment_push_failures(uuid) from public, anon, authenticated;
grant execute on function public.increment_push_failures(uuid) to service_role;

select cron.unschedule('send-notifications')
where exists (select 1 from cron.job where jobname = 'send-notifications');

select cron.schedule(
  'send-notifications',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := 'https://zqrdwqvkofhxfxkondmx.supabase.co/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'x-push-secret', (select secret from public.push_cron_secret limit 1)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
