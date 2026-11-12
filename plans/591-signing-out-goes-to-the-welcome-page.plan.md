# Plan 591 — Signing out (or a session ending) always moves the visitor to the welcome page

Status: draft
Depends-on: 589
Snapshot: 0f40a867dd90e11fa68c1588e3e13651e33f9e11

## Problem Statement
The Human checked plan 589 (2026-11-12, card ⑤): "when you sign out, it doesn't pass you to welcome. It shows the last
page you were signing out of … once someone is signed out, it moves to welcome." Verified on `orch/run-589` at 12ad72f7:
`UserService.logout()` (`src/app/core/services/user.service.ts`) clears the session but navigates nowhere. Callers:
`src/app/core/components/header/header.component.ts:85` (the sign-out button — stays on the page),
`src/app/core/interceptors/auth.interceptor.ts:29` (a session that ended — stays on the page), and
`src/app/core/components/terms-gate/terms-gate.component.ts:60` (already navigates to `/welcome`).

## Goals & Success Criteria
- [auto] `pnpm run test:ci` passes, including the new
  `src/app/core/services/signed-out-redirect.service.spec.ts`: when the signed-in user becomes `null` while the URL is
  `/recipe-book`, the router goes to `/welcome`; on `/welcome` or `/cook/<id>` it stays; a user who was never signed in
  on `/cook/<id>` stays.
- [auto] `pnpm run build`, `pnpm run lint`, `node scripts/route-guard-check.mjs` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] Signed in as a QA user on `/recipe-book`, clicking the header's sign-out button lands on `/welcome`
  (`e2e/ui/591-1.spec.ts`).
- [human] Sign out from any page → the welcome page appears at once.

## Execution Mode
Orchestrator run on a branch made from `orch/run-589`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
src/app/core/services/signed-out-redirect.service.ts
src/app/core/services/signed-out-redirect.service.spec.ts
src/app/appRoot/app.component.ts
src/app/core/components/terms-gate/terms-gate.component.ts
src/app/core/components/terms-gate/terms-gate.component.spec.ts
src/app/core/services/breadcrumbs.md
e2e/ui/591-1.spec.ts
```

## Read Scope
`src/app/core/services/user.service.ts`, `src/app/core/components/header/header.component.ts`,
`src/app/core/interceptors/auth.interceptor.ts`, `src/app/app.routes.ts`.

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — client navigation only; no data, server or schema path.

## Reuse Check
- `SignedOutRedirectService` (`src/app/core/services/signed-out-redirect.service.ts`) — family: none — rung: 4 — why: one place that reacts to the user signal going from signed-in to signed-out; no service does this today.

## Step 0 — Reality Check
Confirm the three `logout()` callers above and that `UserService` exposes the signed-in user as a signal.

## User Stories
- As Dandan, I want anyone who signs out, or whose session ends, to land on the welcome page and not keep looking at
  the last page.

## Functional Requirements

### Must Have (P0)
1. `SignedOutRedirectService` (providedIn root) holds an `effect()` on `UserService`'s user signal. When it changes from
   a user to `null`, and the current URL is not `/welcome` and does not start with `/cook/`, it calls
   `router.navigate(['/welcome'])`. It does nothing on the first read (page load with no user is the guards' job).
2. `AppComponent` injects the service once so it runs for the whole app.
3. `terms-gate.component.ts` drops its own `navigate(['/welcome'])` after `logout()` (the service does it now); its spec
   is updated to expect only the `logout()` call.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- none.

## Atomic Sub-tasks
- [x] A1: Move a signed-out visitor to the welcome page from wherever they are — src/app/core/services/signed-out-redirect.service.ts, src/app/appRoot/app.component.ts
- [x] A2: Let the terms popup rely on it instead of its own jump — src/app/core/components/terms-gate/terms-gate.component.ts, src/app/core/components/terms-gate/terms-gate.component.spec.ts
- [x] A3: Prove it in a unit test and a sign-out screen check — src/app/core/services/signed-out-redirect.service.spec.ts, e2e/ui/591-1.spec.ts, src/app/core/services/breadcrumbs.md

## What happens when
- A session expires on `/menu-library` → the interceptor signs out → `/welcome`.
- A visitor reading a shared `/cook/<id>` without an account → nothing changes.

## Technical Considerations
- none.

## Out of Scope
- The welcome page itself.

## Critical Questions
- none.

## Open questions for the Human
- none.

## Execution Notes
- Human 2026-11-12, plan 589 card ⑤ (quoted in the Problem Statement).
- pnpm run lint -> exit 0 (0 errors); pnpm run build -> exit 0; pnpm run test:ci -> exit 0, 1986 of 1986 SUCCESS
- e2e/ui/591-1.spec.ts written (clicks button.auth-username-btn); not run here (needs QA login from .env, gate reruns it).
