-- Remote app settings the mobile app reads on launch, edited by the team.
--
-- One row (id = 1). Everything is optional: with every column null the app
-- behaves exactly as if this table did not exist.
--
--   *_latest_version  A newer store version exists. Users below it see a
--                     dismissible "update available" prompt, once per version.
--   *_min_version     Hard floor. Users below it must update to continue.
--                     Leave null unless an old version is genuinely broken.

create table if not exists public.app_config (
  id                     smallint primary key default 1 check (id = 1),
  ios_latest_version     text check (ios_latest_version ~ '^\d+(\.\d+){0,2}$'),
  ios_min_version        text check (ios_min_version ~ '^\d+(\.\d+){0,2}$'),
  android_latest_version text check (android_latest_version ~ '^\d+(\.\d+){0,2}$'),
  android_min_version    text check (android_min_version ~ '^\d+(\.\d+){0,2}$'),
  update_message         text check (char_length(update_message) <= 280),
  updated_at             timestamptz not null default now()
);

comment on table public.app_config is
  'Single-row remote settings for the mobile app (update prompts). Public read, admin write.';

insert into public.app_config (id) values (1) on conflict (id) do nothing;

alter table public.app_config enable row level security;

drop policy if exists app_config_public_read on public.app_config;
create policy app_config_public_read on public.app_config
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.app_config from anon, authenticated;
grant select on public.app_config to anon, authenticated;

drop trigger if exists app_config_updated_at on public.app_config;
create trigger app_config_updated_at
  before update on public.app_config
  for each row execute procedure extensions.moddatetime(updated_at);
