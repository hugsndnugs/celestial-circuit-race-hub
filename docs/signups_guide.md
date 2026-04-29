# Signups Guide

## Purpose

`celestial-circuit-race-signups` provides public team intake while preserving moderation controls.

## Components

- `team-signup/`: public Next.js signup interface
- `supabase/migrations`: schema/policy changes for intake and moderation
- `docs/team_signup_admin_bridge.md`: moderation and promotion workflow

## Intake Model

1. Public user submits signup form.
2. App inserts pending request into `team_signup_requests`.
3. Duplicate screening uses `team_signup_has_recent_duplicate` RPC (`SECURITY INVOKER`).
4. Browser-side access stays within RLS constraints, including a bounded recent-read policy used for duplicate screening.

## Moderation and Promotion

- Admin reviews `team_signup_pending_review` or raw pending rows.
- Approved requests are manually promoted into race `teams`.
- Intake status is updated to one of:
  - `approved`
  - `rejected`
  - `spam`

## Required Environment

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Optional Hosting Environment

- `NEXT_PUBLIC_BASE_PATH`
- `NEXT_PUBLIC_ASSET_PREFIX`
- `STATIC_EXPORT=true` for static builds

## Operational Boundary

Signup acceptance does not auto-create race teams by design. Promotion into `teams`
remains a deliberate admin operation to reduce spam and preserve event control.
