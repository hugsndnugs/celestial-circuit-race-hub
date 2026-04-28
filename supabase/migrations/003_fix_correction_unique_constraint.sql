drop index if exists uniq_valid_relay_pass;

create unique index if not exists uniq_valid_relay_pass
  on relay_events (race_id, team_id, relay_point_id)
  where invalidated_by_event_id is null and source = 'marshal_tap';
