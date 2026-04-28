create table if not exists public.dev_users (
  email text primary key,
  display_name text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dev_users_email_chk
    check (
      char_length(email) <= 254
      and email = lower(trim(email))
      and position('@' in email) > 1
      and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  constraint dev_users_display_name_len_chk
    check (display_name is null or char_length(trim(display_name)) between 2 and 120)
);

create or replace function public.dev_users_normalize()
returns trigger
language plpgsql
set search_path to public
as $$
begin
  new.email := lower(trim(new.email));
  if new.display_name is not null then
    new.display_name := trim(new.display_name);
    if new.display_name = '' then
      new.display_name := null;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists dev_users_normalize on public.dev_users;
create trigger dev_users_normalize
before insert or update on public.dev_users
for each row execute function public.dev_users_normalize();

alter table public.dev_users enable row level security;

drop policy if exists dev_users_select_self_or_admin on public.dev_users;
create policy dev_users_select_self_or_admin
  on public.dev_users
  for select
  to authenticated
  using (
    email = lower(coalesce(auth.jwt()->>'email', ''))
    or exists (
      select 1
      from public.admin_users au
      where au.is_active = true
        and au.email = lower(coalesce(auth.jwt()->>'email', ''))
    )
  );

drop policy if exists dev_users_admin_write on public.dev_users;
create policy dev_users_admin_write
  on public.dev_users
  for all
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

revoke all on public.dev_users from public;
grant select on public.dev_users to authenticated;
grant insert, update, delete on public.dev_users to authenticated;
