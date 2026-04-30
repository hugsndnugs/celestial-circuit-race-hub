create or replace function public.apply_correction_request_atomic(
  p_request_id uuid,
  p_reviewed_by text,
  p_review_notes text default null
)
returns public.correction_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.correction_requests;
  v_source public.relay_events;
  v_correction_event_id uuid;
begin
  select * into v_request
  from public.correction_requests
  where id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Correction request not found.';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'Request is already %.', v_request.status;
  end if;

  select * into v_source
  from public.relay_events
  where id = v_request.supersedes_event_id
  for update;

  if v_source.id is null then
    raise exception 'Superseded event not found.';
  end if;
  if v_source.invalidated_by_event_id is not null then
    raise exception 'Superseded event is already invalidated.';
  end if;

  insert into public.relay_events (
    race_id,
    team_id,
    relay_point_id,
    recorded_by,
    source,
    supersedes_event_id,
    correction_reason,
    invalidated_by_event_id,
    effective_recorded_at
  )
  values (
    v_source.race_id,
    v_source.team_id,
    v_source.relay_point_id,
    lower(trim(p_reviewed_by)),
    'admin_correction',
    v_source.id,
    v_request.reason,
    null,
    v_request.effective_recorded_at
  )
  returning id into v_correction_event_id;

  update public.relay_events
  set invalidated_by_event_id = v_correction_event_id
  where id = v_source.id
    and invalidated_by_event_id is null;

  if not found then
    raise exception 'Failed to invalidate superseded event.';
  end if;

  update public.correction_requests
  set
    status = 'applied',
    reviewed_by = lower(trim(p_reviewed_by)),
    reviewed_at = now(),
    review_notes = nullif(trim(coalesce(p_review_notes, '')), ''),
    applied_event_id = v_correction_event_id
  where id = v_request.id
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.apply_correction_request_atomic(uuid, text, text) from public;
grant execute on function public.apply_correction_request_atomic(uuid, text, text) to authenticated;
