-- Upgrade legacy intake (captain name/email/phone/roster) to Discord-first schema.
-- Safe to run after new 012: no-op when `captain_email` column is already absent.

do $body$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'team_signup_requests'
      and column_name = 'captain_email'
  ) then
    -- `SELECT *` binds the view to every column; drop before removing legacy columns.
    drop view if exists public.team_signup_pending_review;

    -- Legacy insert policy WITH CHECK referenced captain_name / captain_email.
    drop policy if exists team_signup_requests_insert_public on public.team_signup_requests;

    alter table public.team_signup_requests add column if not exists captain_discord text;
    alter table public.team_signup_requests add column if not exists teammates_discord text;
    alter table public.team_signup_requests add column if not exists contact_email text;

    update public.team_signup_requests
    set contact_email = lower(trim(captain_email))
    where (contact_email is null or trim(contact_email) = '')
      and captain_email is not null;

    update public.team_signup_requests
    set captain_discord = left(
      trim(coalesce(nullif(trim(captain_name), ''), captain_email, 'legacy')),
      200
    )
    where captain_discord is null or trim(captain_discord) = '';

    -- Old trigger body referenced captain_name / captain_email; replace before DROP COLUMN.
    create or replace function public.team_signup_requests_normalize()
    returns trigger
    language plpgsql
    set search_path to public
    as $normalize$
    begin
      new.team_name := trim(new.team_name);
      new.captain_discord := trim(new.captain_discord);
      if new.teammates_discord is not null then
        new.teammates_discord := trim(new.teammates_discord);
        if new.teammates_discord = '' then
          new.teammates_discord := null;
        end if;
      end if;
      if new.contact_email is not null then
        new.contact_email := lower(trim(new.contact_email));
        if new.contact_email = '' then
          new.contact_email := null;
        end if;
      end if;
      if new.notes is not null then
        new.notes := trim(new.notes);
        if new.notes = '' then
          new.notes := null;
        end if;
      end if;
      return new;
    end;
    $normalize$;

    alter table public.team_signup_requests
      drop constraint if exists team_signup_requests_captain_name_len_chk;

    alter table public.team_signup_requests
      drop constraint if exists team_signup_requests_email_shape_chk;

    alter table public.team_signup_requests
      drop constraint if exists team_signup_requests_phone_len_chk;

    alter table public.team_signup_requests
      drop constraint if exists team_signup_requests_roster_chk;

    alter table public.team_signup_requests drop column if exists captain_phone;
    alter table public.team_signup_requests drop column if exists roster_count;
    alter table public.team_signup_requests drop column if exists captain_name;
    alter table public.team_signup_requests drop column if exists captain_email;

    alter table public.team_signup_requests
      alter column captain_discord set not null;
  end if;
end
$body$;

-- Drop legacy duplicate RPC signature if present.
drop function if exists public.team_signup_has_recent_duplicate(text, text, integer);

create or replace function public.team_signup_has_recent_duplicate(
  p_team_name text,
  p_captain_discord text,
  p_contact_email text,
  p_window_hours integer default 48
)
returns boolean
language sql
stable
security definer
set search_path to public
as $$
  select exists (
    select 1
    from public.team_signup_requests tsr
    where tsr.submitted_at > now() - make_interval(
      hours => greatest(1, least(coalesce(p_window_hours, 48), 168))
    )
      and (
        lower(trim(tsr.team_name)) = lower(trim(p_team_name))
        or lower(trim(tsr.captain_discord)) = lower(trim(p_captain_discord))
        or (
          nullif(trim(p_contact_email), '') is not null
          and tsr.contact_email is not null
          and lower(trim(tsr.contact_email)) = lower(trim(p_contact_email))
        )
      )
  );
$$;

revoke all on function public.team_signup_has_recent_duplicate(text, text, text, integer) from public;
grant execute on function public.team_signup_has_recent_duplicate(text, text, text, integer)
  to anon, authenticated;

create or replace function public.team_signup_requests_normalize()
returns trigger
language plpgsql
set search_path to public
as $$
begin
  new.team_name := trim(new.team_name);
  new.captain_discord := trim(new.captain_discord);
  if new.teammates_discord is not null then
    new.teammates_discord := trim(new.teammates_discord);
    if new.teammates_discord = '' then
      new.teammates_discord := null;
    end if;
  end if;
  if new.contact_email is not null then
    new.contact_email := lower(trim(new.contact_email));
    if new.contact_email = '' then
      new.contact_email := null;
    end if;
  end if;
  if new.notes is not null then
    new.notes := trim(new.notes);
    if new.notes = '' then
      new.notes := null;
    end if;
  end if;
  return new;
end;
$$;

drop policy if exists team_signup_requests_insert_public on public.team_signup_requests;
create policy team_signup_requests_insert_public
  on public.team_signup_requests
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and source = 'public_signup'
    and team_name is not null
    and captain_discord is not null
  );

alter table public.team_signup_requests drop constraint if exists team_signup_requests_captain_discord_len_chk;
alter table public.team_signup_requests
  add constraint team_signup_requests_captain_discord_len_chk
  check (char_length(trim(captain_discord)) between 2 and 200);

alter table public.team_signup_requests drop constraint if exists team_signup_requests_teammates_len_chk;
alter table public.team_signup_requests
  add constraint team_signup_requests_teammates_len_chk
  check (teammates_discord is null or char_length(teammates_discord) <= 4000);

alter table public.team_signup_requests drop constraint if exists team_signup_requests_contact_email_chk;
alter table public.team_signup_requests
  add constraint team_signup_requests_contact_email_chk
  check (
    contact_email is null
    or (
      char_length(contact_email) <= 254
      and contact_email = lower(trim(contact_email))
      and position('@' in contact_email) > 1
      and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    )
  );

drop index if exists team_signup_requests_captain_email_lower_idx;
create index if not exists team_signup_requests_captain_discord_lower_idx
  on public.team_signup_requests (lower(trim(captain_discord)));

create index if not exists team_signup_requests_contact_email_lower_idx
  on public.team_signup_requests (lower(trim(contact_email)))
  where contact_email is not null;

-- Recreate after any column DDL (`SELECT *` views depend on dropped columns).
-- Also restores the view if a previous run failed mid-migration.
drop view if exists public.team_signup_pending_review;

create view public.team_signup_pending_review
with (security_invoker = true)
as
select *
from public.team_signup_requests
where status = 'pending';

revoke all on public.team_signup_pending_review from public;
grant select on public.team_signup_pending_review to authenticated;

comment on view public.team_signup_pending_review is
  'Pending signup requests for admin review (security_invoker; RLS on base table applies).';

comment on function public.team_signup_has_recent_duplicate(text, text, text, integer) is
  'Returns true if a similar signup exists in the recent window (team name, captain Discord, or optional contact email).';
