drop policy if exists admin_users_update_own_active on admin_users;
create policy admin_users_update_own_active
  on admin_users
  for update
  to authenticated
  using (
    is_active = true
    and email = lower(coalesce(auth.jwt()->>'email', ''))
  )
  with check (
    is_active = true
    and email = lower(coalesce(auth.jwt()->>'email', ''))
  );
