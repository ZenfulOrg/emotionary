-- The send-notifications function and the admin panel use the service role;
-- this project does not grant table access to it by default.
grant select, insert, update, delete on
  public.push_devices,
  public.push_settings,
  public.push_messages,
  public.push_message_deliveries,
  public.push_triggers,
  public.push_trigger_sends
to service_role;
grant select on public.push_cron_secret to service_role;
