-- Audit hardening (2026): remove anonymous write paths on race-day tables and
-- lock SECURITY DEFINER correction RPC to service_role only (edge functions).

-- ---------------------------------------------------------------------------
-- 1) Drop legacy anon INSERT/UPDATE policies on races, teams, relay_points.
--    Authenticated users keep *_authenticated policies from 006/007.
-- ---------------------------------------------------------------------------
drop policy if exists races_insert on public.races;
drop policy if exists races_update on public.races;
drop policy if exists teams_insert on public.teams;
drop policy if exists relay_points_insert on public.relay_points;

-- ---------------------------------------------------------------------------
-- 2) Drop anon relay_events INSERT (marshal-shaped rows); authenticated insert
--    remains via relay_events_insert_authenticated.
-- ---------------------------------------------------------------------------
drop policy if exists relay_events_insert on public.relay_events;

-- ---------------------------------------------------------------------------
-- 3) apply_correction_request_atomic: authenticated must not call SECURITY
--    DEFINER directly (024 granted it for edge migration). Edge uses service_role.
-- ---------------------------------------------------------------------------
revoke execute on function public.apply_correction_request_atomic(uuid, text, text) from authenticated;
grant execute on function public.apply_correction_request_atomic(uuid, text, text) to service_role;
