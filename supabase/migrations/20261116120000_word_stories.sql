-- Word stories: the back of each word's card in the app (Pro only).
--
-- story: { background, roots: [{ part, meaning }], myth?, fun_fact? }
--   background  cultural context and where the word comes from
--   roots       the word's parts and what each means
--   myth        a story, myth or tradition tied to the word (optional)
--   fun_fact    one surprising detail (optional)
-- story_status: 'draft' while being written or reviewed in the admin panel;
--   the app shows a story only once it is 'live'.
--
-- Additive only: existing rows get a null story and status 'draft', and
-- older app builds never select these columns.

alter table public.words
  add column if not exists story jsonb
    check (story is null or jsonb_typeof(story) = 'object'),
  add column if not exists story_status text not null default 'draft'
    check (story_status in ('draft', 'live'));

comment on column public.words.story is
  'Back of the word card: {background, roots[{part,meaning}], myth?, fun_fact?}. Shown to Pro users when story_status = live.';
comment on column public.words.story_status is
  'draft = hidden in the app (being written or reviewed); live = shown on the back of the card.';
