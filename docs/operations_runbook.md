# Operations Runbook

## Scope

This runbook defines race-day operations across:

- `celestial-circuit-race-controller` (admin, marshal, leaderboard, corrections)
- `celestial-circuit-race-signups` (`team-signup` intake + moderation bridge)
- `celestial-circuit-race-status` (public incident/status messaging)

## Pre-Race Checklist

1. Verify latest GitHub Pages deployments are healthy for controller, signups, status, and docs.
2. Confirm Supabase project is reachable and expected migrations are applied.
3. Validate admin access:
   - Supabase `admin_users` has active operator records.
   - Optional fallback `NEXT_PUBLIC_ADMIN_EMAILS` is set when required.
4. Verify marshal devices can access `/marshal` and log test pass entries.
5. Confirm status publishing process and public URL before race start.
6. Confirm keep-alive workflow and secrets (`SUPABASE_KEEPALIVE_*`, `KEEPALIVE_TOKEN`).

## Race Start Procedure

1. Create/select race and relay points in `/admin`.
2. Confirm teams are registered and race status is ready.
3. Start race and verify `started_at` timestamp.
4. Validate `/leaderboard` updates after first marshal pass.

## Live Operations

- Marshal operators use `Mark Passed` at each relay point.
- Race directors monitor leaderboard refresh and data quality.
- Incidents and unusual conditions are logged in admin incident notes.
- Signup moderation remains separate from active race operations; only approved teams should be in race rosters.

## Incident Severity Model

- **SEV-1 (Critical):** race data integrity or full service outage.
  - Action: publish immediate status update, assign incident lead, invoke correction/fallback.
- **SEV-2 (Major):** degraded race operations with workaround available.
  - Action: publish degraded notice, prioritize mitigation, track timeline.
- **SEV-3 (Minor):** isolated issue with low race impact.
  - Action: capture note and schedule post-race fix.

## Correction and Data Integrity

- Correction writes must be done through `admin-corrections` Edge Function.
- Race creation and signup-approval writes must be done through `admin-race-ops` Edge Function.
- Do not issue privileged correction/audit writes directly from browser clients.
- For RLS insert errors:
  - Confirm target table and role (`anon`, `authenticated`, `service-role`).
  - Capture sanitized payload and execution path.
  - Verify source-specific invariants for marshal taps.

## Public Communications

Use `race-status` for participant-facing updates.

Suggested update template:

1. **What happened:** concise incident statement.
2. **Current impact:** what users can/cannot do.
3. **Mitigation status:** active action being taken.
4. **Next update ETA:** commit to next communication point.

## Post-Race Closure

1. Mark race completed and verify `ended_at`.
2. Export leaderboard and relevant relay event snapshots.
3. Archive incident notes and correction decisions.
4. Record follow-up improvements in docs.
5. Publish race wrap-up status if there were public incidents.
