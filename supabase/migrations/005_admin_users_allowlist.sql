create table if not exists admin_users (
  email text primary key,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (email = lower(email))
);

create unique index if not exists uniq_admin_users_email_ci
  on admin_users (lower(email));

alter table admin_users enable row level security;

drop policy if exists admin_users_select_own_active on admin_users;
create policy admin_users_select_own_active
  on admin_users
  for select
  using (
    auth.role() = 'authenticated'
    and is_active = true
    and email = lower(coalesce(auth.jwt()->>'email', ''))
  );
