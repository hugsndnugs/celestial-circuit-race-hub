# Environment Configuration

This document is the consolidated environment variable reference for all
`celestial-circuit-race-*` repositories.

## Variable Matrix

| Variable | Repository | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `race-controller`, `race-signups/team-signup` | Yes | Browser-safe Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `race-controller`, `race-signups/team-signup` | Yes | Browser-safe anon key for RLS protected queries |
| `NEXT_PUBLIC_ADMIN_EMAILS` | `race-controller` | No | Fallback admin allowlist when `admin_users` has no active match |
| `NEXT_PUBLIC_DISCORD_PROXY_URL` | `race-controller` | No | Proxy endpoint for optional Discord notifications |
| `NEXT_PUBLIC_BASE_PATH` | `race-signups/team-signup` | No | Base path for GitHub project Pages hosting |
| `NEXT_PUBLIC_ASSET_PREFIX` | `race-signups/team-signup` | No | Asset path override for non-standard hosting |
| `STATIC_EXPORT` | `race-signups/team-signup` | For static builds | Enables `output: "export"` behavior in build workflows |
| `NEXT_PUBLIC_STATUS_PAGE_TITLE` | `race-status` | No | Public status site heading/title copy |
| `NEXT_PUBLIC_STATUS_PUBLIC_URL` | `race-status` | No | Canonical public status URL for downstream links |
| `NEXT_PUBLIC_DOCS_TITLE` | `race-docs` | No | Docs site title override |
| `NEXT_PUBLIC_DOCS_VERSION` | `race-docs` | No | Docs version label shown in UI |

## Controller Secrets and Supporting Values

These values are not frontend `.env.local` variables, but are required for operations:

- GitHub repository secrets:
  - `SUPABASE_KEEPALIVE_URL`
  - `SUPABASE_KEEPALIVE_TOKEN`
- Supabase function secrets:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `KEEPALIVE_TOKEN`
  - `NEXT_PUBLIC_SUPABASE_URL` (for function runtime logic)
  - `NEXT_PUBLIC_DISCORD_PROXY_URL` (optional)

## File Conventions

- `.env.example` stores templates only.
- `.env.local` is local-only and should never be committed.
- `NEXT_PUBLIC_*` values are bundled at build time for static exports, so CI must provide them.

## Source of Truth per Repository

- Controller:
  - `celestial-circuit-race-controller/.env.example`
  - `celestial-circuit-race-controller/docs/environment.md`
- Signups:
  - `celestial-circuit-race-signups/team-signup/.env.example`
  - `celestial-circuit-race-signups/docs/team_signup_environment.md`
- Status:
  - `celestial-circuit-race-status/.env.example`
  - `celestial-circuit-race-status/docs/environment.md`
- Docs:
  - `celestial-circuit-race-docs/.env.example`

## Validation Checklist

1. Local app boots without missing env errors.
2. Pages workflows have all required `NEXT_PUBLIC_*` build values.
3. Supabase functions have required secrets set before deployment.
4. Keep-alive workflow succeeds and returns HTTP 200.
