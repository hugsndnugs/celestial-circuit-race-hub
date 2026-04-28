alter table public.races
  add column if not exists status_note text,
  add column if not exists weather_note text,
  add column if not exists is_live_override boolean;
