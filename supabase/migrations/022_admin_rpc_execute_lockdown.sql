-- Remove direct authenticated execution of privileged admin RPCs.
-- These functions remain SECURITY DEFINER and are invoked via Edge Function service-role path.

revoke execute on function public.create_race_with_points(text, text, text[]) from authenticated;
revoke execute on function public.approve_signup_to_race_atomic(uuid, uuid) from authenticated;
