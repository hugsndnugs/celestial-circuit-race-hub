alter table admin_users
  add column if not exists display_name text;

alter table race_incident_notes
  add column if not exists created_by_name text;

update race_incident_notes
set created_by_name = coalesce(nullif(trim(created_by_name), ''), created_by)
where created_by_name is null or trim(created_by_name) = '';
