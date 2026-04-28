-- Signed-in users run as role "authenticated", not "anon".
-- Mirror browser-facing policies so admin/marshal flows keep working after auth.

drop policy if exists races_select_authenticated on races;
create policy races_select_authenticated on races
for select
to authenticated
using (true);

drop policy if exists races_insert_authenticated on races;
create policy races_insert_authenticated on races
for insert
to authenticated
with check (true);

drop policy if exists races_update_authenticated on races;
create policy races_update_authenticated on races
for update
to authenticated
using (true)
with check (true);

drop policy if exists teams_select_authenticated on teams;
create policy teams_select_authenticated on teams
for select
to authenticated
using (true);

drop policy if exists teams_insert_authenticated on teams;
create policy teams_insert_authenticated on teams
for insert
to authenticated
with check (true);

drop policy if exists relay_points_select_authenticated on relay_points;
create policy relay_points_select_authenticated on relay_points
for select
to authenticated
using (true);

drop policy if exists relay_points_insert_authenticated on relay_points;
create policy relay_points_insert_authenticated on relay_points
for insert
to authenticated
with check (true);

drop policy if exists relay_events_select_authenticated on relay_events;
create policy relay_events_select_authenticated on relay_events
for select
to authenticated
using (true);

drop policy if exists relay_events_insert_authenticated on relay_events;
create policy relay_events_insert_authenticated on relay_events
for insert
to authenticated
with check (
  source = 'marshal_tap'
  and recorded_by like 'marshal:%'
  and supersedes_event_id is null
  and correction_reason is null
  and invalidated_by_event_id is null
  and effective_recorded_at = recorded_at
);

drop policy if exists relay_events_update_authenticated on relay_events;
create policy relay_events_update_authenticated on relay_events
for update
to authenticated
using (true)
with check (true);

drop policy if exists correction_requests_select_authenticated on correction_requests;
create policy correction_requests_select_authenticated on correction_requests
for select
to authenticated
using (true);

drop policy if exists notification_outbox_select_authenticated on notification_outbox;
create policy notification_outbox_select_authenticated on notification_outbox
for select
to authenticated
using (true);

drop policy if exists audit_entries_select_authenticated on audit_entries;
create policy audit_entries_select_authenticated on audit_entries
for select
to authenticated
using (true);
