-- Security hardening and query/index support for race-scoped reads.

-- Explicitly lock down legacy permissive policy names if they still exist.
drop policy if exists "relay_events_select_all" on public.relay_events;
drop policy if exists "relay_events_insert_all" on public.relay_events;
drop policy if exists "correction_requests_select_all" on public.correction_requests;
drop policy if exists "correction_requests_insert_all" on public.correction_requests;
drop policy if exists "race_incident_notes_select_all" on public.race_incident_notes;
drop policy if exists "race_incident_notes_insert_all" on public.race_incident_notes;

-- Growth-oriented indexes for race timeline, correction queue, and incident reads.
create index if not exists idx_relay_events_race_recorded_desc
  on public.relay_events (race_id, recorded_at desc);

create index if not exists idx_relay_events_race_effective_desc
  on public.relay_events (race_id, effective_recorded_at desc);

create index if not exists idx_correction_requests_race_submitted_desc
  on public.correction_requests (race_id, submitted_at desc);

create index if not exists idx_race_incident_notes_race_created_desc
  on public.race_incident_notes (race_id, created_at desc);
