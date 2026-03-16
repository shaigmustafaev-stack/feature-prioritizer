# Codebase Scalability Review (2026-03-14)

## Executive Summary
- Current level: **6.5/10** for scaling readiness.
- Product velocity is good: features ship fast, architecture is understandable.
- Main blockers for future scale are not "bad code", but **governance gaps**: unstable quality gates, inconsistent API contracts, and partial security/data-model decisions around analytics sharing.
- Recommendation: 2-step hardening (P0 in 1 sprint, P1 in 2-3 sprints) without rewriting the app.

## What Is Strong Already
- Clear feature-oriented structure (`app/tools`, `app/hooks`, `app/components`, `app/api`).
- Strong TypeScript baseline (`strict: true`) and shared types in `app/lib/types.ts`.
- Useful custom hooks (`useFeatures`, `useAnalytics`) with optimistic updates / auto-save ideas.
- Good UX direction (loading/empty/error states are present in key places).
- Test suite exists and is non-trivial (56 tests, includes integration for main flows).

## Priority Findings

### P0 — Fix now (stability/security/dev velocity)
1. **Lint gate broken**
- `npm run lint` crashes with ESLint config circular error.
- Ref: `eslint.config.mjs:10`.
- Why it matters: no static gate -> regressions slip into main.

2. **Build gate depends on external font network**
- `npm run build` fails when Google Fonts are unreachable.
- Why it matters: CI/local become environment-dependent.

3. **Public share security boundary is weakly enforced/documented as no-op**
- RLS discussion is deferred in no-op migration, but policy still allows public read for all rows with `share_id IS NOT NULL`.
- Ref: `supabase/migrations/20260312234237_create-dashboards-table.sql:21`, `supabase/migrations/20260314120000_fix-share-rls-policy.sql:1`.
- Why it matters: hard to reason about data exposure as usage grows.

4. **README is outdated vs real architecture**
- README still describes MVP as only RICE and old storage key/roadmap state.
- Ref: `README.md:3`, `README.md:11`, `README.md:56`.
- Why it matters: onboarding friction, wrong assumptions by contributors.

### P1 — Next (scalability and maintainability)
1. **Auth state is fragmented (multiple `useAuth()` subscriptions)**
- Used independently in navbar + each tool page.
- Ref: `app/components/Navbar.tsx:11`, `app/tools/rice/page.tsx:21`, `app/tools/analytics/page.tsx:13`, `app/tools/analytics/[id]/page.tsx:20`.
- Why it matters: duplicated listeners/fetch semantics and inconsistent loading UX.

2. **Large UI containers approaching "god components"**
- `rice/page.tsx` (361 LOC), `useAnalytics.ts` (354 LOC), analytics pages are large.
- Ref: `app/tools/rice/page.tsx`, `app/hooks/useAnalytics.ts`, `app/tools/analytics/page.tsx`.
- Why it matters: harder refactors, riskier changes, slower reviews.

3. **API contract/validation inconsistency between tools**
- `features` route has stronger validation; analytics routes accept broader payloads.
- Ref: `app/api/features/route.ts`, `app/api/analytics/dashboards/route.ts`, `app/api/analytics/generate/route.ts`.
- Why it matters: behavior drift and harder inter-tool integration.

4. **Dead/legacy module in data layer**
- `app/lib/supabase.ts` appears unused.
- Ref: `app/lib/supabase.ts:1`.
- Why it matters: confusion on "which client is canonical".

5. **Test architecture is fragile under load**
- Tests pass alone but timeout under heavy concurrent load.
- Ref: long integration timing observed in `app/__tests__/rice-page.test.tsx`, `app/__tests__/analytics-page.test.tsx`.
- Why it matters: flaky CI risk when project grows.

### P2 — Strategic improvements (future-proofing)
1. **Analytics data model is JSONB-heavy (`dashboards.data`)**
- Good for speed now, weak for cross-dashboard analytics/search/joins later.
- Ref: `supabase/migrations/20260312234237_create-dashboards-table.sql:5`.

2. **Design-system tap targets are below mobile UX gate by default**
- Button defaults are 28-32px range.
- Ref: `components/ui/button.tsx:25-35`.

3. **Shared domain package missing**
- Validation/transforms duplicated between hooks/routes/components.
- Opportunity: central `app/lib/domain/*` with zod schemas + mappers.

## Recommended Cleanup Plan

### Phase 1 (1 sprint)
- Fix ESLint config and make `lint` mandatory in pre-merge gate.
- Make font loading resilient for offline/CI environments.
- Decide and implement strict public-share access model (policy + API boundary).
- Update README to current product state (auth + analytics + real commands/keys).
- Remove/mark deprecated `app/lib/supabase.ts`.

### Phase 2 (2-3 sprints)
- Introduce `AuthProvider` + single auth source of truth in layout.
- Split large components/hooks by responsibilities:
  - Rice page: form/kpi/backlog toolbar/list as separate components.
  - Analytics hook: data IO, editor mutations, share/analyze orchestration as modules.
- Standardize API schemas (zod) for all routes.
- Add API-level tests for analytics routes and sharing rules.

### Phase 3 (later)
- Normalize analytics storage for queryable entities (`dashboard_metrics`, `metric_points`) while keeping JSON snapshot if needed.
- Add CI quality profile: lint + unit/integration + optional e2e smoke.
- Add performance budgets for large pages and chart rendering.

## Definition of "Good Scaling Level"
- `lint`, `test`, `build` are stable and deterministic in CI.
- Single auth state model, no duplicated subscription logic.
- API contracts schema-validated uniformly.
- Security model for sharing is explicit and test-covered.
- Large pages decomposed so feature changes touch fewer files.

## Commands and Current Status
- `npm test`: ✅ passes (56/56) when run alone.
- `npm run build`: ❌ fails in this environment due Google Fonts network fetch.
- `npm run lint`: ❌ fails due ESLint config crash.

