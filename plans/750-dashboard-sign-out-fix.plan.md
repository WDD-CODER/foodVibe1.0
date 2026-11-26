# Plan 750 — Signing out works from the dashboard again

Status: draft
Depends-on: none
Track: code
Snapshot: 7c135d5b

## Problem Statement
Dandan, grading run biz-numbers on 2026-11-26 (BRIEF-3 item 16, translated): "Signed in, the user lands on the
dashboard; on the dashboard the sign-out button does not react (only on the dashboard page)." He asked for the root
cause and whether `main` has it too.

**Root cause (found by reading the code and the router source; not yet seen in a browser):**
- Every sign-out control in the header (the user name button `.auth-username-btn` on desktop, «התנתקות» in the
  drawer, «התנתקות» in the phone profile menu) calls `HeaderComponent.logout()`
  (`src/app/core/components/header/header.component.ts:178-189`). When the current route has `authGuard`, it first
  runs `await this.router.navigate(['/dashboard'])` so a page with unsaved changes can ask (pendingChangesGuard), and
  **returns without signing out when the result is `false`** ("a guard cancelled the navigation").
- Since plan 589 (192b5ee3, 2026-11-12, "signed-out visitors see only the welcome page") the dashboard route itself has
  `canActivate: [authGuard]` (`src/app/app.routes.ts:286-292`), so on the dashboard `_isCurrentRouteProtected()` is
  true and the header navigates to the URL it is already on.
- Angular 19.2.21 ignores a navigation to the same URL (`onSameUrlNavigation` is the default `'ignore'`; this app
  sets no `withRouterConfig`) and resolves it with **`false`**:
  `node_modules/@angular/router/fesm2022/router-Dwfin5Au.mjs:4751-4757` — `NavigationSkipped(...IgnoredSameUrlNavigation)`
  then `t.resolve(false)`. The header reads that `false` as a guard refusal and stops: no sign-out, no message, no
  error in the log. On any other protected page the navigation to `/dashboard` is real, so sign-out works there. On
  `/dashboard?tab=metadata` (or any `?tab=`) the URL differs too, so it works; only the bare `/dashboard` — the page a
  user lands on after signing in — is broken.
- Not an overlay or z-index problem: plan 645's spec (`header.component.spec.ts`, "above the route-loading overlay")
  already proves the click reaches the button.

**`main` has the same bug.** `origin/main` cef191e6 has the identical `logout()` and the same `authGuard` on
`dashboard`; the branch only adds the restaurant-menu link to the header. This plan fixes it on the run branch (cut
from `orch/biz-numbers`); it reaches `main` with that branch.

## Goals & Success Criteria
**Primary:** on the dashboard, pressing sign-out signs the user out and the app shows the welcome page, as it does
from every other page; a page with unsaved changes still asks first.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `pnpm run test:ci` exits 0, including `src/app/core/components/header/header.component.spec.ts`.
- [auto] `src/app/core/components/header/header.component.spec.ts` replays the bug with a router whose `dashboard`
  and `inventory` routes carry the real `authGuard`: at `/dashboard`, clicking `.auth-username-btn` calls
  `UserService.logout` once (this case fails before the fix); at `/inventory` the router goes to `/dashboard` and then
  `logout` is called; at `/dashboard?tab=metadata` with a `canDeactivate` that answers `false`, `logout` is not called.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/750-dashboard-sign-out-fix.plan.md` → `ARCH: ok`;
  `node scripts/scope-check.mjs --reuse --plan=plans/750-dashboard-sign-out-fix.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [human] Sign in as `demo_host`: the app opens «לוח בקרה». Without opening another page, press your name at the top
  (its hint says «התנתקות»): you are signed out and the welcome page shows, with «התחברות» at the top.
- [human] On a phone (or a narrow window), sign in, stay on «לוח בקרה», open «פרופיל» in the bottom bar and press
  «התנתקות»: you are signed out and see the welcome page.
- [human] Sign in, open «מלאי», press your name: you are signed out as before (the other pages still work).
- [human] On «לוח בקרה» open the metadata tab, change a coefficient without saving, press your name: the app asks
  before leaving; staying keeps you signed in with the change; leaving signs you out.

## Execution Mode
- Parallel: yes — 750 ∥ 748 ∥ 749: 750 writes only `src/app/core/components/header/header.component.ts` and its spec;
  748 writes `src/app/pages/restaurant-menu/**`, 749 `src/app/pages/monthly-plan/**` and `src/app/shared/month-figures/**`.
- Concurrent plans: 748, 749.
- Isolated DB: no — nothing is stored.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/components/header/header.component.ts
src/app/core/components/header/header.component.spec.ts
src/app/core/components/breadcrumbs.md
src/app/appRoot/app.component.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no route, guard or permission changes; `authGuard`, `pendingChangesGuard` and the server's
  sign-out are untouched; only the header's order of steps before calling `UserService.logout()` changes.
- INV-none: preserves — no stored data, no money field, no module gate, no AI call, no CSP change.

## Reuse Check
- none — a fix inside the existing `HeaderComponent.logout()`; no new component, util, service or class.

## Defaults

- confirm-destructive-action — exception — why: signing out deletes nothing; the existing unsaved-changes question
  still runs where there is something unsaved.
- empty-state-on-list — exception — why: no list.
- loading-and-error-states — exception — why: no data request is added; the sign-out stays instant.
- unsaved-changes-on-leave — applies — how: a page with unsaved changes still asks through `pendingChangesGuard`
  before sign-out; only the same-URL case (bare `/dashboard`, which holds no unsaved form — the coefficients live on
  `?tab=metadata`) skips the navigation.
- hints-in-tooltips — exception — why: no new hint.
- leave-and-return — exception — why: after sign-out the welcome page is the end; nothing returns.
- app-list-container — exception — why: no list.
- one-breakpoint-set — exception — why: no style change.
- anchored-popup — exception — why: no popup.
- unit-dropdown-add — exception — why: no dropdown.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want sign-out to work on the first screen I see, so I can leave a shared kitchen computer safely.

## Functional Requirements

### Must Have (P0)
- [ ] **Skip the navigation when already there:** in `logout()`, navigate to `/dashboard` first only when the current
  route is protected **and** `this.router.url !== '/dashboard'` (the serialised current URL; `?tab=` or a fragment
  makes it differ, so the dashboard's own unsaved-changes guard still runs from `?tab=metadata`). A `false` from a
  real navigation still aborts the sign-out as today. Then `this.userService.logout().subscribe()`;
  `SignedOutRedirectService` (plan 591) moves the visitor to `/welcome` as it does from other pages.
- [ ] **The comment says why:** replace "Navigate to a public page first" (the dashboard is no longer public, plan
  589) with one line: the navigation lets unsaved-changes guards ask, and a same-URL navigation resolves `false`
  without running any guard, so it is skipped.
- [ ] **Spec replaying the bug:** a new `describe` in `header.component.spec.ts` with `provideRouter` routes
  `dashboard` (`canActivate: [authGuard]`, `canDeactivate: [() => allowLeave]`,
  `runGuardsAndResolvers: 'paramsOrQueryParamsChange'`, a stub component) and `inventory` (`canActivate: [authGuard]`),
  a signed-in `UserService` stub whose `logout` is a spy returning `of(null)`; the three cases of Goals. The
  `/dashboard` case fails on the code before the fix.

### Should Have (P1)
- [ ] none (`src/app/core/components/breadcrumbs.md` needs no change; it is listed so a map check never blocks the run).

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- Page recipe: none — no page or frame changes; the header looks the same.
- No new dictionary keys. On-screen words in the cards: «לוח בקרה», «התנתקות», «פרופיל», «התחברות», «מלאי».

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Write a failing test that signs out on the dashboard and proves nothing happens today — real authGuard routes, three cases — src/app/core/components/header/header.component.spec.ts
- [ ] A2: Let sign-out go ahead when the user is already on the dashboard, keeping the unsaved-changes question elsewhere — skip the same-URL navigation, fix the comment — src/app/core/components/header/header.component.ts
- [ ] A3: Run every automatic check and record the root cause — paste outputs under Execution Notes — src/app/core/components/header/header.component.ts

## What happens when
- The user is on `/dashboard?tab=metadata` with unsaved coefficients: the navigation to `/dashboard` runs the guard;
  choosing to stay keeps the user signed in; leaving signs out.
- The user is on a public page (welcome, a public request page): no navigation, sign-out as today.
- The server's sign-out call fails: unchanged — `UserService.logout()` clears the local session first and ignores the
  server error.

## Technical Considerations
- The run branch is cut from `orch/biz-numbers` (7c135d5b). The same lines exist on `main` (cef191e6), so the fix
  reaches `main` when the branch merges; no separate `main` fix is needed unless the Planner wants it sooner.
- Plan 743 on `main` rewrites `header.component.html` / `.scss` (the nav pills container); this plan touches only the
  `.ts` and the spec, so the later merge has no overlap in code; the spec may need a trivial union if 743 adds cases.
- Alternative considered: navigate with `onSameUrlNavigation: 'reload'`. Rejected — with `runGuardsAndResolvers:
  'paramsOrQueryParamsChange'` the guard would not run either, and a reload of the dashboard is wasted work.
- Dependencies: `authGuard` (`src/app/core/guards/auth.guard.ts`), `SignedOutRedirectService`
  (`src/app/core/services/signed-out-redirect.service.ts`), `UserService.logout`.
- Model changes: none. Backend / API: none. Data / migration: none. Security: sign-out gets more reliable; nothing
  is stored or sent beyond today's logout call.

## Out of Scope
- Changing where a signed-out user lands (stays the welcome page, plan 591).
- Any header layout change.

## Critical Questions
- none — the bug and its cause are stated above; if the builder's first spec case does not fail before the fix, it
  records that as `seen:` under Execution Notes and stops for the Planner instead of guessing another cause.

## Execution Notes
- Planner 2026-11-26: written from Dandan's grading of run biz-numbers.
- behaviour: on the bare dashboard sign-out goes ahead without any leave question, because that tab holds no unsaved form — reverse: always run the page's own hasRealChanges() check before signing out.
