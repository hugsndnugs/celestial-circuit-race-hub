alter table races
  add column if not exists code text;

update races
set code = lower(substr(md5(id::text || clock_timestamp()::text), 1, 5)) || '-' ||
           lower(substr(md5(clock_timestamp()::text || id::text), 1, 5)) || '-' ||
           lpad(((abs(mod(('x' || substr(md5(id::text), 1, 8))::bit(32)::int, 90)) + 10))::text, 2, '0')
where code is null;

alter table races
  alter column code set not null;

create unique index if not exists races_code_key on races (code);

alter table races enable row level security;
alter table teams enable row level security;
alter table relay_points enable row level security;
alter table relay_events enable row level security;

drop policy if exists races_select on races;
create policy races_select on races
for select
to anon
using (true);

drop policy if exists races_insert on races;
create policy races_insert on races
for insert
to anon
with check (true);

drop policy if exists races_update on races;
create policy races_update on races
for update
to anon
using (true)
with check (true);

drop policy if exists teams_select on teams;
create policy teams_select on teams
for select
to anon
using (true);

drop policy if exists teams_insert on teams;
create policy teams_insert on teams
for insert
to anon
with check (true);

drop policy if exists relay_points_select on relay_points;
create policy relay_points_select on relay_points
for select
to anon
using (true);

drop policy if exists relay_points_insert on relay_points;
create policy relay_points_insert on relay_points
for insert
to anon
with check (true);

drop policy if exists relay_events_select on relay_events;
create policy relay_events_select on relay_events
for select
to anon
using (true);

drop policy if exists relay_events_insert on relay_events;
create policy relay_events_insert on relay_events
for insert
to anon
with check (true);

drop policy if exists relay_events_update on relay_events;
create policy relay_events_update on relay_events
for update
to anon
using (true)
with check (true);
