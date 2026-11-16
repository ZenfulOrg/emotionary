-- One-off and triggered notifications, managed from the admin panel and sent
-- by the send-notifications Edge Function. Nothing here needs an app update.
-- All tables are private (service role only).

-- One-off messages ("campaigns").
create table if not exists public.push_messages (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 120),
  body          text not null check (char_length(body) between 1 and 400),
  -- In-app route opened on tap, e.g. '/', '/paywall', '/word/toska'
  url           text not null default '/' check (url ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  audience      text not null default 'all' check (audience in ('all', 'free', 'paid')),
  platform      text check (platform in ('ios', 'android')),
  -- Not sent before this moment (UTC). Null = as soon as possible.
  send_after    timestamptz,
  status        text not null default 'queued' check (status in ('draft', 'queued', 'sending', 'sent', 'cancelled')),
  sent_count    integer not null default 0,
  failed_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);

-- Which installs already got a one-off (lets a send resume safely).
create table if not exists public.push_message_deliveries (
  message_id  uuid not null references public.push_messages (id) on delete cascade,
  install_id  uuid not null,
  ok          boolean not null,
  sent_at     timestamptz not null default now(),
  primary key (message_id, install_id)
);

-- Triggered messages: rules checked on every run of the sender.
create table if not exists public.push_triggers (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('streak_rescue', 'inactive_days', 'streak_milestone', 'days_since_install')),
  -- inactive_days: days since last open; streak_milestone: streak length;
  -- days_since_install: days since the install registered. Unused for streak_rescue.
  days        integer check (days is null or days between 1 and 3650),
  title       text not null check (char_length(title) between 1 and 120),
  body        text not null check (char_length(body) between 1 and 400),
  url         text not null default '/' check (url ~ '^/[A-Za-z0-9/_?=&.-]*$'),
  audience    text not null default 'all' check (audience in ('all', 'free', 'paid')),
  -- Device-local hour the message goes out (0-23)
  send_hour   smallint not null default 18 check (send_hour between 0 and 23),
  enabled     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- One send per trigger, device and "episode" (e.g. one inactivity stretch).
create table if not exists public.push_trigger_sends (
  trigger_id  uuid not null references public.push_triggers (id) on delete cascade,
  install_id  uuid not null,
  episode     text not null,
  sent_at     timestamptz not null default now(),
  primary key (trigger_id, install_id, episode)
);

-- Shared secret between pg_cron and the sender. Generated inside the
-- database and never shown anywhere.
create table if not exists public.push_cron_secret (
  id      boolean primary key default true check (id),
  secret  text not null
);
insert into public.push_cron_secret (id, secret)
values (true, encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

alter table public.push_messages enable row level security;
alter table public.push_message_deliveries enable row level security;
alter table public.push_triggers enable row level security;
alter table public.push_trigger_sends enable row level security;
alter table public.push_cron_secret enable row level security;
revoke all on public.push_messages, public.push_message_deliveries, public.push_triggers,
  public.push_trigger_sends, public.push_cron_secret from anon, authenticated;

-- Starting triggers. The streak reminder keeps today's wording and is on;
-- the others are examples, off until enabled in the admin panel.
insert into public.push_triggers (kind, days, title, body, url, audience, send_hour, enabled)
select * from (values
  ('streak_rescue', null::integer, 'Last chance!',
   'If you skip today, your learning streak will be gone. Open the app to keep your streak!',
   '/', 'all', 20::smallint, true),
  ('inactive_days', 3, 'We saved you a word',
   'Three new feelings have been named since you last looked. Come see.', '/', 'all', 18::smallint, false),
  ('streak_milestone', 7, 'A whole week!',
   'Seven days, seven feelings named. Keep going.', '/', 'all', 19::smallint, false),
  ('days_since_install', 5, 'Every word, every day',
   'Unlock the meaning of every word in Emotionary.', '/paywall', 'free', 18::smallint, false)
) as seed (kind, days, title, body, url, audience, send_hour, enabled)
where not exists (select 1 from public.push_triggers);
