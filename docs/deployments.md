# Deployments

## Frontend Sites (GitHub Pages)

All frontend repositories use static export patterns.

- `race-controller`: `.github/workflows/deploy-pages.yml`
- `race-docs`: `.github/workflows/deploy-pages.yml`
- `race-status`: `.github/workflows/deploy-pages.yml`
- `race-signups`: `.github/workflows/deploy-team-signup-pages.yml`

## Build Requirements

- `NEXT_PUBLIC_*` values must be present in GitHub Actions at build time.
- Project Pages deployments need correct `basePath`/`assetPrefix` behavior.
- Enable Pages in each GitHub repository with source set to GitHub Actions.
- Required for this repo's Pages build:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Configure each as either a GitHub Actions Variable (preferred) or Secret with the same name.
  - The workflow resolves values in this order: Variables first, then Secrets fallback.
  - The URL host project ref and anon key `ref` claim must match (for example, `https://<ref>.supabase.co` and JWT payload `ref: "<ref>"`).

## Supabase Deployment

### SQL Migrations

- Apply migrations in sequence from each repository migration directory.
- Signups minimum includes:
  - `012_team_signup_requests.sql`
  - `013` security mode fix migration
  - `014_team_signup_discord_intake.sql`

### Edge Functions

Controller function set:

- `admin-corrections`
- `keep-alive`

Required Supabase function secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `KEEPALIVE_TOKEN` (for keep-alive)
- Optional `NEXT_PUBLIC_DISCORD_PROXY_URL`

## Keep-Alive Workflow

- GitHub workflow: `supabase-keepalive.yml`
- Required repo secrets:
  - `SUPABASE_KEEPALIVE_URL`
  - `SUPABASE_KEEPALIVE_TOKEN`
- Validate by running manual dispatch and checking HTTP 200.
