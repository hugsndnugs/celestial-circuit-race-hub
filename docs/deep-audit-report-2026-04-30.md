# Deep Audit Report (2026-04-30)

## Scope
- Security: authn/authz, RLS, Edge Functions, CORS, abuse controls, data exposure.
- Scalability: read/write hot paths, realtime fan-out, query/index fitness, client compute cost.
- Tests: suite inventory, CI enforcement, feature-to-test coverage.
- Frontend usability/a11y: core flows and interaction quality.

## Runtime Validation Performed
- `npm test` passed: 7 tests.
- `npm run lint` passed.
- `npm run typecheck` passed.

## Severity-Ranked Findings

### Resolved
1. Public env allowlist fallback for privileged roles now fails closed in production unless explicitly enabled.
   - Files: `lib/controller/admin-auth.ts`, `docs/environment.md`
2. Edge Functions for admin operations no longer use wildcard CORS and now enforce explicit origin allowlisting.
   - Files:
     - `supabase/functions/admin-race-ops/index.ts`
     - `supabase/functions/admin-corrections/index.ts`
3. Admin correction function now validates caller JWT and derives reviewer identity server-side.
   - File: `supabase/functions/admin-corrections/index.ts`
4. Correction apply path is now atomic via database RPC.
   - Files:
     - `supabase/migrations/024_atomic_correction_apply.sql`
     - `supabase/functions/admin-corrections/index.ts`
5. Realtime fan-out has been reduced through race-scoped subscriptions and debounced refreshes.
   - Files:
     - `app/controller/admin/page.tsx`
     - `app/controller/leaderboard/page.tsx`
6. CI now runs tests before build/deploy.
   - File: `.github/workflows/deploy-pages.yml`
7. Race timeline/correction/incident read paths now have explicit composite indexes.
   - File: `supabase/migrations/023_security_and_perf_hardening.sql`
8. Bulk moderation is no longer strictly sequential.
   - File: `lib/controller/race-service.ts` (`bulkModerateSignupRequests`)
9. Frontend async status/error handling now includes live announcements and improved UX for failed submit paths.
   - Files:
     - `components/signups/SignupForm.tsx`
     - `app/signin/page.tsx`
     - `app/controller/admin/page.tsx`
     - `app/controller/marshal/page.tsx`
10. `prompt`/`confirm`-style heavy workflows were replaced with explicit accessible dialog flows.
    - File: `app/controller/admin/page.tsx`
11. Baseline app-level security headers are now configured.
    - File: `next.config.ts`
12. Keyboard skip-link and semantic leaderboard table are in place.
    - Files:
      - `app/layout.tsx`
      - `app/controller/leaderboard/page.tsx`

### Remaining Risks
1. Legacy permissive RLS exists in historical migrations and can still cause risk under environment drift.
   - Files:
     - `supabase/migrations/002_static_browser_rls.sql`
     - `supabase/migrations/006_authenticated_browser_rls.sql`
   - Note: forward cleanup migration introduced (`023`), but deployed environment state still needs verification.
2. Signup abuse throttling remains primarily client-side and bypassable.
   - Files: `lib/signups/throttle.ts`, `components/signups/SignupForm.tsx`
3. High-priority integration/contract/smoke tests remain incomplete.
   - See Test Coverage Assessment below.

## Test Coverage Assessment
- Current tests cover:
  - leaderboard ranking logic
  - signup payload validation
  - admin env-fallback fail-closed behavior
- Remaining high-priority coverage gaps:
  - Authz matrix (`admin`, `dev`, `marshal`, unauthenticated) in `lib/controller/admin-auth.ts`
  - Service-layer state transitions in `lib/controller/race-service.ts`
  - Edge function contracts and failure paths in:
    - `supabase/functions/admin-race-ops/index.ts`
    - `supabase/functions/admin-corrections/index.ts`
  - UI behavior and accessibility checks for critical routes:
    - `/signups`, `/signin`, `/controller/admin`, `/controller/marshal`, `/leaderboard`, `/status`
- CI status:
  - `.github/workflows/deploy-pages.yml` now runs lint/typecheck/test prior to build.

## Scalability Risk Summary
- Mitigated amplification paths:
  - Admin realtime refreshes are debounced and race-scoped.
  - Leaderboard subscriptions are race-scoped.
  - `getLeaderboard` now has short-lived caching to reduce repeated recompute/refetch pressure.
- Remaining hotspots:
  - `markRelayPass` duplicate handling with concurrent retries.
  - Offline marshal queue sync remains sequential.
  - No durable server-side aggregation tier between clients and Supabase for very high-frequency read traffic.

## Frontend Usability/A11y Summary
- Positive:
  - Basic labels and focus-ring styling remain present.
  - Async status messaging now uses live announcements in key routes.
  - Signup validation now includes focused error summary behavior.
  - Leaderboard now uses semantic table markup.
  - Skip-link added for keyboard-first navigation.
- Remaining gap:
  - Potential contrast risk in muted/helper/error colors against dark background should still be explicitly validated against WCAG AA.

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
  - [ ] No permissive unintended RLS policies active in target environments (requires DB/state audit in each deployed env).
  - [x] Edge Functions reject unauthorized users and only accept approved origins.
  - [x] Privileged role fallback behavior is explicit and safe per environment.
  - [x] Security headers are present in app config (`next.config.ts`); verify on deployed response headers.

- Scalability
  - [x] Realtime updates are race-scoped and avoid unrelated refreshes in admin/leaderboard flows.
  - [ ] Query plans for race timeline endpoints use indexes under load (needs EXPLAIN/production-like load validation).
  - [x] Leaderboard/admin refresh paths now reduce unnecessary full reloads in primary flows.

- Tests and CI
  - [x] CI runs tests on every change path (push/PR).
  - [ ] Integration tests cover core race lifecycle and moderation flows.
  - [ ] Security regression tests fully cover role/access boundaries.
  - [ ] Route-level smoke tests exist for major user flows.

- Usability/A11y
  - [x] Async status/errors are announced via live regions in key routes.
  - [x] Keyboard-only operation improved with skip-link and explicit dialog actions.
  - [ ] Color contrast passes WCAG AA for text and controls (needs explicit audit).
  - [ ] Critical routes pass automated accessibility checks (axe/Playwright not yet wired).
