-- Public team signup intake (Discord-first; optional contact email).

create table if not exists public.team_signup_requests (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  captain_discord text not null,
  teammates_discord text null,
  contact_email text null,
  notes text null,
  status text not null default 'pending',
  source text not null default 'public_signup',
  submitted_at timestamptz not null default now(),
  constraint team_signup_requests_status_chk
    check (status in ('pending', 'approved', 'rejected', 'spam')),
  constraint team_signup_requests_source_chk
    check (source in ('public_signup', 'admin', 'import')),
  constraint team_signup_requests_team_name_len_chk
    check (char_length(trim(team_name)) between 2 and 120),
  constraint team_signup_requests_captain_discord_len_chk
    check (char_length(trim(captain_discord)) between 2 and 200),
  constraint team_signup_requests_teammates_len_chk
    check (teammates_discord is null or char_length(teammates_discord) <= 4000),
  constraint team_signup_requests_contact_email_chk
    check (
      contact_email is null
      or (
        char_length(contact_email) <= 254
        and contact_email = lower(trim(contact_email))
        and position('@' in contact_email) > 1
        and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    ),
  constraint team_signup_requests_notes_len_chk
    check (notes is null or char_length(notes) <= 2000)
);

create index if not exists team_signup_requests_submitted_at_idx
  on public.team_signup_requests (submitted_at desc);

create index if not exists team_signup_requests_team_name_lower_idx
  on public.team_signup_requests (lower(trim(team_name)));

create index if not exists team_signup_requests_captain_discord_lower_idx
  on public.team_signup_requests (lower(trim(captain_discord)));

create index if not exists team_signup_requests_contact_email_lower_idx
  on public.team_signup_requests (lower(trim(contact_email)))
  where contact_email is not null;

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

drop trigger if exists team_signup_requests_normalize on public.team_signup_requests;
create trigger team_signup_requests_normalize
before insert or update on public.team_signup_requests
for each row execute function public.team_signup_requests_normalize();

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

alter table public.team_signup_requests enable row level security;

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

drop policy if exists team_signup_requests_admin_select on public.team_signup_requests;
create policy team_signup_requests_admin_select
  on public.team_signup_requests
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.is_active = true
        and au.email = lower(coalesce(auth.jwt()->>'email', ''))
    )
  );

drop policy if exists team_signup_requests_admin_update on public.team_signup_requests;
create policy team_signup_requests_admin_update
  on public.team_signup_requests
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users au
      where au.is_active = true
        and au.email = lower(coalesce(auth.jwt()->>'email', ''))
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users au
      where au.is_active = true
        and au.email = lower(coalesce(auth.jwt()->>'email', ''))
    )
  );

revoke all on public.team_signup_requests from public;
grant insert on public.team_signup_requests to anon, authenticated;
grant select, update on public.team_signup_requests to authenticated;

create or replace view public.team_signup_pending_review
with (security_invoker = true)
as
select *
from public.team_signup_requests
where status = 'pending';

revoke all on public.team_signup_pending_review from public;
grant select on public.team_signup_pending_review to authenticated;

comment on table public.team_signup_requests is
  'Public intake for team registrations (Discord + optional email); promote to `teams` after admin review.';

comment on function public.team_signup_has_recent_duplicate(text, text, text, integer) is
  'Returns true if a similar signup exists in the recent window (team name, captain Discord, or optional contact email).';
