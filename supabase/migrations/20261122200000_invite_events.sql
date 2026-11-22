-- Anonymous share-with-a-friend stats.
--
-- The app reports when the invite pop-up is shown, shared or dismissed (and
-- shares from the Stats row), keyed by the same random install id as
-- device_status, never linked to an account. The website reports when an
-- invite or word-card link is opened (no id at all). Nobody can read rows
-- with the public key; the team reads invite_summary with the service role.

create table if not exists public.invite_events (
  id           bigint generated always as identity primary key,
  install_id   uuid,
  event        text not null check (event in ('shown', 'shared', 'dismissed', 'link_opened')),
  -- App: streak7 / first_share / streak30 / stats / requested. Web: invite / card.
  source       text not null check (source in ('streak7', 'first_share', 'streak30', 'stats', 'requested', 'invite', 'card')),
  platform     text not null check (platform in ('ios', 'android', 'web')),
  app_version  text check (char_length(app_version) <= 20),
  created_at   timestamptz not null default now()
);

create index if not exists invite_events_created_at_idx on public.invite_events (created_at);

comment on table public.invite_events is
  'Anonymous share-with-a-friend events (no account link). Written via report_invite_event().';

alter table public.invite_events enable row level security;
revoke all on public.invite_events from anon, authenticated;

create or replace function public.report_invite_event(
  p_install_id uuid,
  p_event text,
  p_source text,
  p_platform text,
  p_app_version text
) returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.invite_events (install_id, event, source, platform, app_version)
  values (p_install_id, p_event, p_source, p_platform, left(p_app_version, 20));
$$;

revoke all on function public.report_invite_event(uuid, text, text, text, text) from public;
grant execute on function public.report_invite_event(uuid, text, text, text, text) to anon, authenticated;

-- Last 90 days: per source, how often the pop-up showed, was shared or
-- dismissed, and how many links were opened on the website.
create or replace view public.invite_summary
with (security_invoker = on) as
select
  source,
  count(*) filter (where event = 'shown')       as shown,
  count(*) filter (where event = 'shared')      as shared,
  count(*) filter (where event = 'dismissed')   as dismissed,
  count(*) filter (where event = 'link_opened') as links_opened
from public.invite_events
where created_at > now() - interval '90 days'
group by rollup (source);

revoke all on public.invite_summary from anon, authenticated;
