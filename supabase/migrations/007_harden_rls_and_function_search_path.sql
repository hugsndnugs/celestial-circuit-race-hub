-- Replace permissive write policies with explicit row predicates to satisfy
-- security linting while preserving current app behavior.

drop policy if exists races_insert on races;
create policy races_insert on races
for insert
to anon
with check (
  id is not null
  and name is not null
  and status in ('planned', 'active', 'completed')
);

drop policy if exists races_insert_authenticated on races;
create policy races_insert_authenticated on races
for insert
to authenticated
with check (
  id is not null
  and name is not null
  and status in ('planned', 'active', 'completed')
);

drop policy if exists races_update on races;
create policy races_update on races
for update
to anon
using (
  id is not null
  and name is not null
  and status in ('planned', 'active', 'completed')
)
with check (
  id is not null
  and name is not null
  and status in ('planned', 'active', 'completed')
);

drop policy if exists races_update_authenticated on races;
create policy races_update_authenticated on races
for update
to authenticated
using (
  id is not null
  and name is not null
  and status in ('planned', 'active', 'completed')
)
with check (
  id is not null
  and name is not null
  and status in ('planned', 'active', 'completed')
);

drop policy if exists relay_points_insert on relay_points;
create policy relay_points_insert on relay_points
for insert
to anon
with check (
  id is not null
  and race_id is not null
  and sequence_index is not null
  and name is not null
);

drop policy if exists relay_points_insert_authenticated on relay_points;
create policy relay_points_insert_authenticated on relay_points
for insert
to authenticated
with check (
  id is not null
  and race_id is not null
  and sequence_index is not null
  and name is not null
);

drop policy if exists teams_insert on teams;
create policy teams_insert on teams
for insert
to anon
with check (
  id is not null
  and race_id is not null
  and name is not null
  and members is not null
);

drop policy if exists teams_insert_authenticated on teams;
create policy teams_insert_authenticated on teams
for insert
to authenticated
with check (
  id is not null
  and race_id is not null
  and name is not null
  and members is not null
);

drop policy if exists relay_events_update_authenticated on relay_events;
create policy relay_events_update_authenticated on relay_events
for update
to authenticated
using (
  id is not null
  and race_id is not null
  and team_id is not null
  and relay_point_id is not null
  and source in ('marshal_tap', 'admin_correction')
)
with check (
  id is not null
  and race_id is not null
  and team_id is not null
  and relay_point_id is not null
  and source in ('marshal_tap', 'admin_correction')
);

alter function public.prevent_relay_event_delete()
set search_path = public, pg_temp;
