# Local Development

## Prerequisites

- Node.js 22 recommended for docs/controller/status parity with CI.
- Node.js 20+ compatible environment for signups CI parity.
- npm and access to Supabase project API keys.

## Repository Bootstrap

### Controller

1. `cd celestial-circuit-race-controller`
2. `npm install`
3. Copy `.env.example` to `.env.local`
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `npm run dev`
6. Validate `/admin`, `/marshal`, `/leaderboard`

### Signups (`team-signup`)

1. `cd celestial-circuit-race-signups/team-signup`
2. `npm install`
3. Copy `.env.example` to `.env.local`
4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. `npm run dev`
6. Submit a test pending signup request

### Status

1. `cd celestial-circuit-race-status`
2. `npm install`
3. Copy `.env.example` to `.env.local` (optional fields)
4. `npm run dev`

### Docs

1. `cd celestial-circuit-race-docs`
2. `npm install`
3. Copy `.env.example` to `.env.local` (optional fields)
4. `npm run dev`

## Smoke Tests

- Controller:
  - create race, register teams, log marshal pass, verify leaderboard update
- Signups:
  - submit form and verify pending row created
- Status:
  - verify page loads and title overrides when configured
- Docs:
  - verify all section routes load and cross-links work
