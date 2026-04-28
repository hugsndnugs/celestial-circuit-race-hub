create or replace function public.create_race_with_points(
  p_name text,
  p_code text,
  p_relay_points text[]
)
returns public.races
language plpgsql
security definer
set search_path = public
as $$
declare
  v_race public.races;
  v_index integer;
begin
  if not exists (
    select 1
    from public.admin_users au
    where au.is_active = true
      and au.email = lower(coalesce(auth.jwt()->>'email', ''))
  ) then
    raise exception 'Admin access required.';
  end if;

  insert into public.races (name, status, code, started_at, ended_at)
  values (trim(p_name), 'planned', p_code, null, null)
  returning * into v_race;

  for v_index in 1..coalesce(array_length(p_relay_points, 1), 0) loop
    insert into public.relay_points (race_id, sequence_index, name)
    values (v_race.id, v_index, trim(p_relay_points[v_index]));
  end loop;

  return v_race;
end;
$$;

revoke all on function public.create_race_with_points(text, text, text[]) from public;
grant execute on function public.create_race_with_points(text, text, text[]) to authenticated;

create or replace function public.approve_signup_to_race_atomic(
  p_signup_id uuid,
  p_race_id uuid
)
returns public.teams
language plpgsql
security definer
set search_path = public
as $$
declare
  v_signup public.team_signup_requests;
  v_race public.races;
  v_team public.teams;
  v_members text[];
begin
  if not exists (
    select 1
    from public.admin_users au
    where au.is_active = true
      and au.email = lower(coalesce(auth.jwt()->>'email', ''))
  ) then
    raise exception 'Admin access required.';
  end if;

  select * into v_race
  from public.races
  where id = p_race_id
  limit 1;
  if v_race.id is null then
    raise exception 'Race not found.';
  end if;
  if v_race.status <> 'planned' then
    raise exception 'Teams cannot be added after race start.';
  end if;

  select * into v_signup
  from public.team_signup_requests
  where id = p_signup_id
  for update;
  if v_signup.id is null then
    raise exception 'Signup request not found.';
  end if;
  if v_signup.status <> 'pending' then
    raise exception 'Signup request is no longer pending.';
  end if;

  v_members := (
    select array(
      select distinct member
      from unnest(array_remove(regexp_split_to_array(coalesce(v_signup.teammates_discord, ''), '[,\n]'), '')) teammate(member)
      where btrim(member) <> ''
    )
  );
  v_members := array_prepend(btrim(v_signup.captain_discord), coalesce(v_members, array[]::text[]));

  insert into public.teams (race_id, name, members)
  values (v_race.id, trim(v_signup.team_name), v_members)
  returning * into v_team;

  update public.team_signup_requests
  set status = 'approved'
  where id = v_signup.id
    and status = 'pending';

  return v_team;
end;
$$;

revoke all on function public.approve_signup_to_race_atomic(uuid, uuid) from public;
grant execute on function public.approve_signup_to_race_atomic(uuid, uuid) to authenticated;
