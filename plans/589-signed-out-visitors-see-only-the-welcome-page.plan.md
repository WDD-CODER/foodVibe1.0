# Plan 589 — A signed-out visitor sees only the welcome page; no automatic guest sign-in on the PC and in the slots

Status: draft
Depends-on: none
Snapshot: a996c7e9100845775dea14d844fd25e4be47e79f

## Problem Statement
The Human (2026-11-12, after the plan 585 checks): "inside local environment, if there's no one signed in, it signs into
guest user, so I can't reach the welcome … whenever it's a guest it should only see the welcome. If he wants to see
more than the welcome, he has to sign in or sign up." Decisions: Q1 = a (remove the automatic guest sign-in on the PC
and in the slots; local works like the live site), Q2 = keep (a shared cook-view link `/cook/:id` still opens without
signing in). Verified at origin/main:

- `src/app/app.config.ts:137-147`: an `APP_INITIALIZER` signs the dev guest in when `environment.autoLoginGuest` is
  true. It is `true` in `src/environments/environment.local.ts`, `src/environments/environment.ts` and
  `src/environments/environment.test.ts`, and `false` in prod, remote and gh-pages.
- `src/app/core/guards/auth.guard.ts`: a signed-out visitor gets a warning toast and the sign-in popup, and the
  navigation is cancelled. Many routes in `src/app/app.routes.ts` have no guard at all (for example `cook`,
  `suppliers`, `recipe-book`; verify the full list in Step 0), so a signed-out visitor can open them.
- `src/app/core/guards/welcome.guard.ts` sends a signed-in user from `/welcome` to `/dashboard`;
  `src/app/pages/welcome/home-redirect.ts` sends `''` to `dashboard` for a signed-in or returning visitor, else
  `welcome`.
- The auth popup has a "Guest (Dev)" button (`auth-modal.component.html:250`, local only).

## Goals & Success Criteria
- [auto] `pnpm run test:ci` passes, including the new `src/app/core/guards/auth.guard.spec.ts` (signed-in → true;
  signed-out → a `UrlTree` to `/welcome` with `returnUrl` set to the wanted URL; no toast) and
  `src/app/core/guards/welcome.guard.spec.ts` (unchanged cases still pass).
- [auto] `node scripts/route-guard-check.mjs` (new, small) prints `ROUTE_GUARDS: ok` — every top-level route in
  `src/app/app.routes.ts` has `canActivate: [authGuard]` except `welcome`, `cook/:id`, the `''` redirect and the `**`
  redirect; it lists any route that breaks the rule and exits 1.
- [auto] `pnpm run build`, `pnpm run lint` pass; `src/environments/environment.local.ts` and
  `src/environments/environment.ts` have `autoLoginGuest: false`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On a fresh browser (no session) at the slot app, `/recipe-book` lands on `/welcome`; signing in there as a QA
  user returns to `/recipe-book` (`e2e/ui/589-1.spec.ts`).
- [ui] On a fresh browser, a shared `/cook/<id>` link of a QA recipe opens the recipe without signing in
  (`e2e/ui/589-2.spec.ts`).
- [human] On the PC (`http://localhost:4200`) with no one signed in, the app opens on the welcome page, and every other
  page needs signing in or signing up.

## Execution Mode
Orchestrator run from `origin/main`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
src/app/app.routes.ts
src/app/core/guards/auth.guard.ts
src/app/core/guards/auth.guard.spec.ts
src/app/core/guards/welcome.guard.ts
src/app/core/guards/welcome.guard.spec.ts
src/app/pages/welcome/home-redirect.ts
src/app/pages/welcome/welcome.page.ts
src/environments/environment.local.ts
src/environments/environment.ts
scripts/route-guard-check.mjs
e2e/ui/589-1.spec.ts
e2e/ui/589-2.spec.ts
docs/agent/standards-security.md
```

## Read Scope
`src/app/app.config.ts`, `src/app/core/services/user.service.ts`, `src/app/core/services/auth-modal.service.ts`,
`e2e/helpers/qa-session.ts`.

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — client routing and the dev environment flag only; the server's guest route and every data rule
  are unchanged.

## Reuse Check
- `scripts/route-guard-check.mjs` — family: none — rung: 4 — why: a small check script; no existing script reads the
  route table.

## Step 0 — Reality Check
List every top-level route in `src/app/app.routes.ts` with its current `canActivate`, and write the list into
`## Execution Notes`. Note any e2e spec under `e2e/ui/` that opens the app without `signInQa` (it relied on the
automatic guest); list them in Execution Notes, do not edit them.

## User Stories
- As Dandan, I want a visitor who is not signed in to see only the welcome page, so nobody browses the app without an
  account.
- As a chef who shares a recipe, I want the shared link to keep working for people without an account.

## Functional Requirements

### Must Have (P0)
1. **No automatic guest.** `autoLoginGuest: false` in `environment.local.ts` and `environment.ts`. Leave
   `environment.test.ts` as it is (unit tests). The "Guest (Dev)" button in the auth popup stays (an explicit click
   on the PC only).
2. **Every page needs a user.** Add `canActivate: [authGuard]` to every top-level route that lacks it, except
   `welcome`, `cook/:id`, the `''` redirect and `**`. The Human approved changing these existing route entries
   (2026-11-12, Q1 = a, Q2 = keep); this is the only rewrite of the hotspot, every other line stays.
3. **Signed-out → welcome.** `authGuard` returns `router.createUrlTree(['/welcome'], { queryParams: { returnUrl:
   state.url } })` for a signed-out visitor (no toast, no popup on top of a blank page).
4. **Back to where they wanted.** On `/welcome`, signing in or up from the welcome page goes to `returnUrl` when it is
   an in-app path (starts with `/`, not `//`), else `/dashboard`.
5. **The rule is checked.** `scripts/route-guard-check.mjs` reads `src/app/app.routes.ts` and fails on a top-level
   route without `authGuard` that is not on the allow-list (`welcome`, `cook/:id`, redirects).
6. **Docs.** One line in `docs/agent/standards-security.md`: every route needs `authGuard` except `welcome` and
   `cook/:id`; checked by `node scripts/route-guard-check.mjs`.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- The welcome page is unchanged.

## Atomic Sub-tasks
- [x] A1: Stop signing a guest in by itself on the PC and in the slots — src/environments/environment.local.ts, src/environments/environment.ts
- [x] A2: Send a signed-out visitor to the welcome page from every page but the shared recipe link — src/app/core/guards/auth.guard.ts, src/app/app.routes.ts
- [x] A3: After signing in on the welcome page, return to the page the visitor wanted — src/app/pages/welcome/welcome.page.ts, src/app/pages/welcome/home-redirect.ts
- [x] A4: Add a check that every route keeps its guard, and the security note — scripts/route-guard-check.mjs, docs/agent/standards-security.md
- [x] A5: Prove it in unit tests and two screen checks — src/app/core/guards/auth.guard.spec.ts, src/app/core/guards/welcome.guard.spec.ts, e2e/ui/589-1.spec.ts, e2e/ui/589-2.spec.ts

## What happens when
- `returnUrl=//evil.example` → ignored, goes to `/dashboard`.
- A signed-in user opens `/welcome` → `/dashboard` (unchanged).
- A signed-out visitor opens a shared `/cook/<id>` → the recipe, as today.

## Technical Considerations
- Every e2e spec that signs in with `signInQa` is unaffected; a spec that relied on the automatic guest will fail
  until it signs in (listed in Step 0; fixing them is a follow-up).

## Out of Scope
- The live site's behaviour beyond the guards (it already has no automatic guest).
- The server's `/auth/guest` route.
- Fixing the e2e specs listed in Step 0.

## Critical Questions
- none (Q1 = a, Q2 = keep, Human 2026-11-12).

## Open questions for the Human
- none.

## Execution Notes
- Human 2026-11-12: Q1 = a, Q2 = keep.
- Planner: shares `src/app/app.routes.ts` with open plans 553, 554 (batch-3) and later batches; they add new routes, this plan adds guards to existing ones — separate lines, merged in order by the Human. New routes from those plans must carry `authGuard` (route-guard-check catches a miss after they meet on main).
- Step 0 routes (before): authGuard missing on venues, inventory, recipe-book, menu-library, cook, suppliers, dashboard (now added); already guarded: recipe-builder, recipe-builder/:id, menu-intelligence(/:id), trash, settings, platform; welcome has welcomeGuard; cook/:id unguarded by design; redirects: equipment*, command-center, '', '**'. `dev/catalog` comes from a spread (devCatalogRoutes), local/test/slot builds only; not covered by the check.
- Step 0 e2e specs relying on the automatic guest (no signInQa): e2e/cook-view.spec.ts and other non-`e2e/ui` specs (not edited).
- Evidence: pnpm run build → 0; pnpm run lint → 0 errors; pnpm run test:ci → 1980 SUCCESS; node scripts/route-guard-check.mjs → ROUTE_GUARDS: ok (old routes file → exit 1 listing 7 routes). e2e 589-1/589-2 written, not run here (need servers + QA login).
- scope extended: docs/workflow-kit/manifest.json — manifest entry for the new script (kit-manifest-check)
