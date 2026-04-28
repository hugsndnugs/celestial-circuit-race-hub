create table if not exists race_incident_notes (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references races(id) on delete cascade,
  note text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

alter table race_incident_notes enable row level security;

drop policy if exists race_incident_notes_select on race_incident_notes;
create policy race_incident_notes_select on race_incident_notes
for select
to anon
using (true);

drop policy if exists race_incident_notes_insert on race_incident_notes;
create policy race_incident_notes_insert on race_incident_notes
for insert
to anon
with check (
  race_id is not null
  and length(trim(note)) >= 3
  and created_by is not null
);

drop policy if exists race_incident_notes_select_authenticated on race_incident_notes;
create policy race_incident_notes_select_authenticated on race_incident_notes
for select
to authenticated
using (true);

drop policy if exists race_incident_notes_insert_authenticated on race_incident_notes;
create policy race_incident_notes_insert_authenticated on race_incident_notes
for insert
to authenticated
with check (
  race_id is not null
  and length(trim(note)) >= 3
  and created_by is not null
);
