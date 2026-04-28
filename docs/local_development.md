# Local Development

## Prerequisites

- Node.js 22 recommended for docs/controller/status parity with CI.
- Node.js 20+ compatible environment for signups CI parity.
- npm and access to Supabase project API keys.

## Repository Bootstrap

1. `cd celestial-circuit-race-hub`
2. `npm install`
3. Copy `.env.example` to `.env.local` (or create `.env.local` directly)
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `npm run dev`
6. Validate app surfaces:
   - `/controller/admin`
   - `/controller/marshal`
   - `/controller/leaderboard`
   - `/signups`
   - `/status`
   - `/docs`

## Smoke Tests

- Controller:
  - create race, register teams, log marshal pass, verify leaderboard update
  - verify evidence export buttons create files from selected race
- Signups:
  - submit form and verify pending row created
  - verify spam + bulk moderation actions from admin queue
- Status:
  - verify page loads, title overrides, and leaderboard links
- Docs:
  - verify all section routes load and cross-links work
