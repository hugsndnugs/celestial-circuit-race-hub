# Celestial Circuit Hub (Merged Site)

Single Next.js app that combines the Celestial Circuit projects into one website:

- Hub dashboard (`/`)
- Controller (`/controller/*`)
- Signups (`/signups/*`)
- Docs (`/docs/*`)
- Status (`/status`)

## Local development

```bash
npm install
npm run dev
```

After `npm run build`, preview the static export locally with `npm run serve:out` (serves the `out/` folder).

## Environment variables

Copy `.env.example` to `.env.local` and set values as needed.

- `NEXT_PUBLIC_SUPABASE_URL`: Required for controller/signups data access.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Required for controller/signups data access.
- `NEXT_PUBLIC_ADMIN_EMAILS`: Comma-separated fallback admin allowlist.
- `NEXT_PUBLIC_DISCORD_PROXY_URL`: Optional relay notification bridge endpoint.
- `NEXT_PUBLIC_DOCS_TITLE`: Optional docs title override.
- `NEXT_PUBLIC_DOCS_VERSION`: Optional docs version label.
- `NEXT_PUBLIC_STATUS_PAGE_TITLE`: Optional status page title override.
- `NEXT_PUBLIC_BASE_PATH`: Optional base path override for custom domain migration.
- `NEXT_PUBLIC_ASSET_PREFIX`: Optional asset prefix override.

## GitHub Pages deploy (project site first)

1. Push to `main`.
2. In repository Settings > Pages, set **Source** to **GitHub Actions**.
3. Configure GitHub Actions build env for this repository:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Add them as repository/environment Variables (preferred) or Secrets with the same names.
   - Ensure both values come from the same Supabase project (`https://<project-ref>.supabase.co` must match anon key JWT `ref`).
4. The workflow `.github/workflows/deploy-pages.yml` builds with `next build` and deploys the `out` folder.
5. Your site will be served at:
   - `https://<github-user>.github.io/celestial-circuit-race-hub/`

The Next.js config automatically sets `basePath`/`assetPrefix` during GitHub Actions builds for project-site URLs and serves all merged routes from one deployment.

## Later migration to custom domain (CNAME)

When switching to a custom domain:

1. Configure the domain in GitHub Pages settings and DNS.
2. Set `NEXT_PUBLIC_BASE_PATH=` (empty string) in workflow/repository environment variables, or leave it unset if your runtime injects empty by default.
3. Optionally set `NEXT_PUBLIC_ASSET_PREFIX` if you serve assets from a CDN.
4. Keep internal merged routes unchanged (`/controller`, `/signups`, `/docs`, `/status`) and only adjust base path settings as needed.
