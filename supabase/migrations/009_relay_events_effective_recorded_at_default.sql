alter table relay_events
  alter column effective_recorded_at set default now();
