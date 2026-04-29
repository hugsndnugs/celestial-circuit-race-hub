# System Overview

Celestial Circuit is a multi-repository race operations platform.

## Repositories

- `celestial-circuit-race-controller`
  - Race operations UI for admins/marshals and public leaderboard.
  - Includes Supabase migrations and Edge Functions (`admin-corrections`, `admin-race-ops`, `keep-alive`).
- `celestial-circuit-race-signups`
  - Public team signup app in `team-signup/`.
  - Includes signup-related migrations and moderation bridge docs.
- `celestial-circuit-race-status`
  - Public-facing status and incident publishing surface.
- `celestial-circuit-race-docs`
  - Central documentation and runbook source of truth.

## Architecture Model

- Frontends: static Next.js exports on GitHub Pages.
- Data store: Supabase Postgres with RLS.
- Browser auth/data access: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Privileged operations: Supabase Edge Functions + service-role secrets.

## Operational Flow

1. Teams submit signup requests from public `team-signup`.
2. Admin reviews and promotes approved signups into race `teams`.
3. Race operations run in controller (`/admin`, `/marshal`, `/leaderboard`).
4. Public incidents and service health are published via `race-status`.
5. Docs site tracks standard process and recovery playbooks.
