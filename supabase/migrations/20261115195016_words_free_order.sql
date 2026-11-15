-- Make the free plan editable from the admin panel.
--
-- Before: words_enforce_free_plan forced a hardcoded set of 10 slugs to be
-- free on every write, so admin edits to is_free were silently reverted.
-- After: is_free is whatever the admin sets; free_order (1 = first) controls
-- the order free users see those words in. The trigger now only keeps the
-- two columns consistent (a premium word never carries a free_order).

alter table public.words
  add column if not exists free_order smallint
  check (free_order is null or free_order > 0);

comment on column public.words.free_order is
  'Display position for free users (1 = first). Only meaningful when is_free; cleared otherwise.';

create or replace function public.enforce_free_plan_words()
returns trigger
language plpgsql
set search_path to ''
as $$
begin
  if not new.is_free then
    new.free_order := null;
  end if;
  return new;
end;
$$;

-- Seed the current curated order (keeps today's 10 free words unchanged).
update public.words w
set free_order = o.pos
from (values
  ('koi-no-yokan', 1), ('petrichor', 2), ('kilig', 3), ('iktsuarpok', 4),
  ('saudade', 5), ('apricity', 6), ('limerence', 7), ('cafune', 8),
  ('wabi-sabi', 9), ('hiraeth', 10)
) as o(slug, pos)
where w.slug = o.slug and w.is_free;
