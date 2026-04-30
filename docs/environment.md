# Environment Configuration

This document is the consolidated environment variable reference for all
`celestial-circuit-race-*` repositories.

## Variable Matrix

| Variable | Repository | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `race-controller`, `race-signups/team-signup` | Yes | Browser-safe Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `race-controller`, `race-signups/team-signup` | Yes | Browser-safe anon key for RLS protected queries |
| `NEXT_PUBLIC_ADMIN_EMAILS` | `race-controller` | No | Development-only fallback admin allowlist (disabled in production unless explicitly enabled) |
| `NEXT_PUBLIC_DEV_EMAILS` | `race-controller` | No | Development-only fallback developer allowlist (disabled in production unless explicitly enabled) |
| `NEXT_PUBLIC_MARSHAL_EMAILS` | `race-controller` | No | Development-only fallback marshal allowlist (disabled in production unless explicitly enabled) |
| `NEXT_PUBLIC_ALLOW_ENV_ROLE_FALLBACK` | `race-controller` | No | Set to `true` to allow public env role fallbacks in production (default is fail-closed) |
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

## Managing Developer Access

Internal docs access now supports a dedicated developer role.

### Primary method (database)

Use `public.dev_users` in Supabase as the source of truth:

- Add an active row for each developer email.
- Use lowercase email values.
- Set `is_active = true` to grant access.

Example:

```sql
insert into public.dev_users (email, display_name, is_active)
values ('dev@example.com', 'Dev User', true)
on conflict (email)
do update
set display_name = excluded.display_name,
    is_active = excluded.is_active;
```

To revoke access:

```sql
update public.dev_users
set is_active = false
where email = 'dev@example.com';
```

### Fallback method (environment)

If `dev_users` has no active match, the app can check `NEXT_PUBLIC_DEV_EMAILS` only when env fallback is enabled.

- Comma-separated list of developer emails.
- Keep this for emergency/fallback access only.
- In production, this is disabled unless `NEXT_PUBLIC_ALLOW_ENV_ROLE_FALLBACK=true`.
- Prefer `dev_users` for normal operations.

## Managing Marshal Access

Marshal controls require authentication and marshal/admin allowlist membership.

### Primary method (database)

Use `public.marshal_users` in Supabase as the source of truth:

- Add an active row for each marshal email.
- Use lowercase email values.
- Set `is_active = true` to grant access.

Example:

```sql
insert into public.marshal_users (email, display_name, is_active)
values ('marshal@example.com', 'Field Marshal', true)
on conflict (email)
do update
set display_name = excluded.display_name,
    is_active = excluded.is_active;
```

To revoke access:

```sql
update public.marshal_users
set is_active = false
where email = 'marshal@example.com';
```

### Fallback method (environment)

If `marshal_users` has no active match, the app can check `NEXT_PUBLIC_MARSHAL_EMAILS` only when env fallback is enabled.

- Comma-separated list of marshal emails.
- Keep this for emergency/fallback access only.
- In production, this is disabled unless `NEXT_PUBLIC_ALLOW_ENV_ROLE_FALLBACK=true`.
- Prefer `marshal_users` for normal operations.
