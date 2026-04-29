# Controller Guide

## Purpose

`celestial-circuit-race-controller` is the race operations control plane.

## Surfaces

- `/admin`: race setup, team registration, correction queue, incident notes
- `/marshal`: relay point pass capture
- `/leaderboard`: race standings

## Environment

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional:

- `NEXT_PUBLIC_ADMIN_EMAILS`
- `NEXT_PUBLIC_DISCORD_PROXY_URL`

## Operational Workflow

1. Pre-race: create race, configure relay points, register teams.
2. Start race from admin and verify marshal + leaderboard readiness.
3. During race: marshal taps, monitor leaderboard, log incidents.
4. Corrections: submit and apply/reject through Edge Function.
5. Admin race setup writes (create race, approve signup) run through `admin-race-ops`.
6. Post-race: complete race, export evidence, archive notes.

## Admin Access

- Primary allowlist: `admin_users` table in Supabase.
- Fallback allowlist: `NEXT_PUBLIC_ADMIN_EMAILS`.
- Keep admin records lowercase and use `is_active` for access control.

## Data Safety Rules

- Do not bypass correction workflow with direct privileged writes from frontend.
- Do not call privileged admin RPCs directly from browser clients.
- RLS violations should trigger incident logging with payload and role context.
