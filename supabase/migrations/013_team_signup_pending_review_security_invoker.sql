-- Supabase linter 0010_security_definer_view: pending review must use invoker
-- semantics so base-table RLS applies as the querying user, not the view owner.

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
