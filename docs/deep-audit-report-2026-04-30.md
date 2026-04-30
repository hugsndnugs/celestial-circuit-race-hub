# Deep Audit Report (2026-04-30)

## Scope
- Security: authn/authz, RLS, Edge Functions, CORS, abuse controls, data exposure.
- Scalability: read/write hot paths, realtime fan-out, query/index fitness, client compute cost.
- Tests: suite inventory, CI enforcement, feature-to-test coverage.
- Frontend usability/a11y: core flows and interaction quality.

## Runtime Validation Performed
- `npm test` passed: 5 tests.
- `npm run lint` passed.
- `npm run typecheck` passed.

## Severity-Ranked Findings

### Critical
1. Legacy permissive RLS appears in migration history and can be dangerous with environment drift.
   - Evidence: `using (true)` and `with check (true)` patterns in early policies.
   - Files:
     - `supabase/migrations/002_static_browser_rls.sql`
     - `supabase/migrations/006_authenticated_browser_rls.sql`
   - Risk: accidental broad read/write if migration order/state diverges between environments.

### High
2. Public env allowlist fallback for privileged roles can grant access by deployment misconfiguration.
   - Files: `lib/controller/admin-auth.ts`, `docs/environment.md`.
   - Risk: privilege assignments are partly controlled by public env variables.

3. Edge Functions handling admin operations use wildcard CORS.
   - Files:
     - `supabase/functions/admin-race-ops/index.ts`
     - `supabase/functions/admin-corrections/index.ts`
   - Evidence: `Access-Control-Allow-Origin: "*"`
   - Risk: broader cross-origin attack surface than needed.

4. Admin correction function uses service role client without explicit caller JWT validation.
   - File: `supabase/functions/admin-corrections/index.ts`
   - Risk: this endpoint performs privileged writes and accepts actor fields from request payload.

5. Realtime refresh fan-out creates multiplicative load under race activity.
   - Files:
     - `app/controller/admin/page.tsx`
     - `app/controller/leaderboard/page.tsx`
     - `lib/controller/race-service.ts`
   - Risk: event storms trigger full refetch/recompute per connected client.

6. Test coverage is very narrow and CI does not run tests.
   - Files:
     - `tests/ranking.test.ts`
     - `tests/validation.test.ts`
     - `.github/workflows/deploy-pages.yml`
   - Risk: regressions in auth, RLS assumptions, edge workflows, and UI flows are not gated.

### Medium
7. Signup abuse throttling is client-side only (`sessionStorage`) and bypassable.
   - Files: `lib/signups/throttle.ts`, `components/signups/SignupForm.tsx`.

8. Timeline query patterns likely need explicit composite indexes for growth.
   - Files:
     - `lib/controller/race-service.ts`
     - `supabase/migrations/001_race_control_schema.sql`
   - Risk: slower reads on `relay_events`, `correction_requests`, `race_incident_notes` as volume grows.

9. Correction application path is multi-step and non-transactional in function code.
   - File: `supabase/functions/admin-corrections/index.ts`
   - Risk: partial state if a mid-sequence step fails.

10. Bulk moderation is strictly sequential.
    - File: `lib/controller/race-service.ts` (`bulkModerateSignupRequests`)
    - Risk: operator latency increases linearly with selected item count.

11. Frontend status/error announcements are mostly plain text without live regions.
    - Files:
      - `components/signups/SignupForm.tsx`
      - `app/signin/page.tsx`
      - `app/controller/admin/page.tsx`
      - `app/controller/marshal/page.tsx`
    - Risk: weaker feedback for screen-reader users and keyboard-first workflows.

12. Several heavy workflows rely on `prompt`/`confirm`.
    - File: `app/controller/admin/page.tsx`
    - Risk: weak UX consistency and limited validation/error affordance.

13. No explicit app-level security headers configured.
    - File: `next.config.ts`
    - Risk: missing baseline hardening (CSP/frame/referrer/permissions policy).

## Test Coverage Assessment
- Current tests only cover:
  - leaderboard ranking logic
  - signup payload validation
- Missing high-priority coverage:
  - Authz matrix (`admin`, `dev`, `marshal`, unauthenticated) in `lib/controller/admin-auth.ts`
  - Service-layer state transitions in `lib/controller/race-service.ts`
  - Edge function contracts and failure paths in:
    - `supabase/functions/admin-race-ops/index.ts`
    - `supabase/functions/admin-corrections/index.ts`
  - UI behavior and accessibility checks for critical routes:
    - `/signups`, `/signin`, `/controller/admin`, `/controller/marshal`, `/leaderboard`, `/status`
- CI gap:
  - `.github/workflows/deploy-pages.yml` runs lint/typecheck/build, but not tests.

## Scalability Risk Summary
- Highest amplification paths:
  - Admin page refetches multiple datasets per event.
  - Leaderboard page subscribes to all `relay_events` changes and refreshes full leaderboard.
  - `getLeaderboard` performs full race reads + in-memory recompute.
- Operational hotspots:
  - `markRelayPass` duplicate handling with concurrent retries.
  - Sequential moderation and queue sync loops.
  - No cache/aggregation layer between clients and Supabase for high-frequency read traffic.

## Frontend Usability/A11y Summary
- Positive:
  - Basic labels exist, focus ring styling exists, semantic landmarks are present.
- Main gaps:
  - Missing `aria-live`/`role=alert` for async status and validation feedback.
  - No structured error summary/focus management after failed submit.
  - List-based leaderboard presentation is less scannable than a semantic table.
  - No skip-link for keyboard users.
  - Potential contrast risk in muted/helper/error colors against dark background.

## Prioritized Remediation Plan
1. Security hardening first
   - Remove/guard env-based privileged fallback in production.
   - Restrict Edge Function CORS to approved origins.
   - Add explicit auth verification + role checks in `admin-corrections`.
   - Add Next.js security headers in `next.config.ts`.

2. Scalability stabilization
   - Scope realtime subscriptions by race everywhere.
   - Shift from full refetch to incremental updates where possible.
   - Add/verify indexes for race-scoped ordered queries.
   - Introduce caching or server-side aggregation for leaderboard-heavy reads.

3. Test and CI expansion
   - Add integration tests for `race-service` and authz matrix.
   - Add edge-function contract/failure tests.
   - Add route smoke tests (Playwright) for key flows.
   - Enforce `npm test` in CI prior to build.

4. UX/a11y improvements
   - Add `aria-live` for async status and form errors.
   - Improve validation UX (error summary + focus management).
   - Replace `prompt`/`confirm` with accessible modal flows.
   - Add skip-link and a11y regression checks (axe in CI).

## Verification Checklist
- Security
  - [ ] No permissive unintended RLS policies active in target environments.
  - [ ] Edge Functions reject unauthorized users and only accept approved origins.
  - [ ] Privileged role fallback behavior is explicit and safe per environment.
  - [ ] Security headers are present on deployed pages.

- Scalability
  - [ ] Realtime updates are race-scoped and do not trigger unrelated refreshes.
  - [ ] Query plans for race timeline endpoints use indexes under load.
  - [ ] Leaderboard/admin refresh paths avoid full data reload where unnecessary.

- Tests and CI
  - [ ] CI runs tests on every change path (push/PR).
  - [ ] Integration tests cover core race lifecycle and moderation flows.
  - [ ] Security regression tests cover role/access boundaries.
  - [ ] Route-level smoke tests exist for major user flows.

- Usability/A11y
  - [ ] Async status/errors are announced via live regions.
  - [ ] Keyboard-only operation succeeds across major forms/actions.
  - [ ] Color contrast passes WCAG AA for text and controls.
  - [ ] Critical routes pass automated accessibility checks.
