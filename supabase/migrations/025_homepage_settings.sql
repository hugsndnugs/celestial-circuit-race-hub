create table if not exists public.homepage_settings (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  updated_by text null,
  updated_at timestamptz not null default now(),
  check (id = 'homepage')
);

alter table public.homepage_settings enable row level security;

drop policy if exists homepage_settings_public_select on public.homepage_settings;
create policy homepage_settings_public_select
  on public.homepage_settings
  for select
  to anon, authenticated
  using (id = 'homepage');

drop policy if exists homepage_settings_admin_insert on public.homepage_settings;
create policy homepage_settings_admin_insert
  on public.homepage_settings
  for insert
  to authenticated
  with check (
    id = 'homepage'
    and exists (
      select 1
      from public.admin_users au
      where au.email = lower(coalesce(auth.jwt()->>'email', ''))
        and au.is_active = true
    )
  );

drop policy if exists homepage_settings_admin_update on public.homepage_settings;
create policy homepage_settings_admin_update
  on public.homepage_settings
  for update
  to authenticated
  using (
    id = 'homepage'
    and exists (
      select 1
      from public.admin_users au
      where au.email = lower(coalesce(auth.jwt()->>'email', ''))
        and au.is_active = true
    )
  )
  with check (
    id = 'homepage'
    and exists (
      select 1
      from public.admin_users au
      where au.email = lower(coalesce(auth.jwt()->>'email', ''))
        and au.is_active = true
    )
  );

grant select on public.homepage_settings to anon, authenticated;
grant insert, update on public.homepage_settings to authenticated;
