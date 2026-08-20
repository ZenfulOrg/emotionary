-- Pin the trigger function's lookup path so future schema objects cannot
-- shadow functions or operators resolved while it runs.
alter function public.set_published_at() set search_path = '';
