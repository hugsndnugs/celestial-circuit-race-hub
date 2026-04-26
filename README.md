# Celestial Circuit Hub

Central launch page for Celestial Circuit applications, styled to match the race controller and signup surfaces.

## Local development

```bash
npm install
npm run dev
```

## Environment variables

Copy `.env.example` to `.env.local` and set values as needed.

- `NEXT_PUBLIC_PAGES_ORIGIN`: Base GitHub Pages origin used to derive default app links.
- `NEXT_PUBLIC_CONTROLLER_URL`: Optional explicit controller URL.
- `NEXT_PUBLIC_SIGNUPS_URL`: Optional explicit signups URL.
- `NEXT_PUBLIC_DOCS_URL`: Optional docs destination.
- `NEXT_PUBLIC_STATUS_URL`: Optional status destination.
- `NEXT_PUBLIC_BASE_PATH`: Optional base path override for custom domain migration.
- `NEXT_PUBLIC_ASSET_PREFIX`: Optional asset prefix override.

## GitHub Pages deploy (project site first)

1. Push to `main`.
2. In repository Settings > Pages, set **Source** to **GitHub Actions**.
3. The workflow `.github/workflows/deploy-pages.yml` builds with `next build` and deploys the `out` folder.
4. Your site will be served at:
   - `https://<github-user>.github.io/celestial-circuit-race-hub/`

The Next.js config automatically sets `basePath`/`assetPrefix` during GitHub Actions builds for project-site URLs.

## Later migration to custom domain (CNAME)

When switching to a custom domain:

1. Configure the domain in GitHub Pages settings and DNS.
2. Set `NEXT_PUBLIC_BASE_PATH=` (empty string) in workflow/repository environment variables, or leave it unset if your runtime injects empty by default.
3. Optionally set `NEXT_PUBLIC_ASSET_PREFIX` if you serve assets from a CDN.
4. Update `NEXT_PUBLIC_PAGES_ORIGIN` and/or explicit destination URLs so hub links point at custom-domain app endpoints.
