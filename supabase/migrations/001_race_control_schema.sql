create table if not exists races (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null check (status in ('planned', 'active', 'completed')),
  started_at timestamptz null,
  ended_at timestamptz null
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references races(id) on delete cascade,
  name text not null,
  members jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists uniq_team_name_per_race_ci
  on teams (race_id, lower(name));

create table if not exists relay_points (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references races(id) on delete cascade,
  sequence_index integer not null,
  name text not null,
  unique (race_id, sequence_index)
);

create table if not exists relay_events (
  id uuid primary key default gen_random_uuid(),
  race_id uuid not null references races(id) on delete cascade,
  team_id uuid not null references teams(id) on delete restrict,
  relay_point_id uuid not null references relay_points(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  recorded_by text not null,
  source text not null check (source in ('marshal_tap', 'admin_correction')),
  supersedes_event_id uuid null references relay_events(id) on delete restrict,
  correction_reason text null,
  invalidated_by_event_id uuid null references relay_events(id) on delete restrict
);

create unique index if not exists uniq_valid_relay_pass
  on relay_events (race_id, team_id, relay_point_id)
  where invalidated_by_event_id is null;

create or replace function prevent_relay_event_delete()
returns trigger language plpgsql as $$
begin
  raise exception 'relay_events is append-only';
end;
$$;

drop trigger if exists relay_events_no_delete on relay_events;
create trigger relay_events_no_delete
before delete on relay_events
for each row execute function prevent_relay_event_delete();
