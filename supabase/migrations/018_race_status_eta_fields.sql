alter table public.races
  add column if not exists next_status_eta timestamptz,
  add column if not exists next_status_eta_note text;
