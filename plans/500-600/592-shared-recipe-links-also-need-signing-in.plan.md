# Plan 592 — Shared recipe links also need signing in: a signed-out visitor sees only the welcome page, no exceptions

Status: done
Depends-on: 591
Snapshot: 6bc27e0639dfbd1e24f49c7f1e0c63a025bf88c7

## Problem Statement
The Human checked plans 589 + 591 (2026-11-12, card ④): opening `/cook/demo_rec_marinade` signed out moved to the
welcome page, "and it's OK! I want it so if users are not signed in they don't need to see anything." This replaces the
earlier answer Q2 = keep. Verified on `orch/run-589` at 6bc27e06, the exception for `cook/:id` is still written in:
- `src/app/app.routes.ts:196-200` — the `cook/:id` route has no `authGuard`;
- `scripts/route-guard-check.mjs:3,10` — `ALLOW` holds `'cook/:id'`;
- `src/app/core/services/signed-out-redirect.service.ts:27` — skips URLs starting with `/cook/`; its spec has two
  `/cook/` cases (lines 51-62);
- `e2e/ui/589-2.spec.ts` — expects the shared link to open without signing in;
- `docs/agent/standards-security.md:107` — names `cook/:id` as an exception.

## Goals & Success Criteria
- [auto] `node scripts/route-guard-check.mjs` prints `ROUTE_GUARDS: ok` with `welcome` the only route allowed without
  `authGuard` (plus the redirects).
- [auto] `pnpm run test:ci` passes, including `src/app/core/services/signed-out-redirect.service.spec.ts` (the two
  `/cook/` cases now expect `/welcome` after signing out; a never-signed-in visitor on `/cook/<id>` is left to the
  guard).
- [auto] `pnpm run build`, `pnpm run lint` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On a fresh browser, `/cook/<id>` of a QA recipe lands on `/welcome`; signing in there as a QA user returns to that
  recipe (`e2e/ui/589-2.spec.ts`, rewritten).
- [human] Signed out, a shared recipe link shows the welcome page; after signing in, the recipe opens.

## Execution Mode
Orchestrator run on a branch made from `orch/run-589`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
src/app/app.routes.ts
scripts/route-guard-check.mjs
src/app/core/services/signed-out-redirect.service.ts
src/app/core/services/signed-out-redirect.service.spec.ts
e2e/ui/589-2.spec.ts
docs/agent/standards-security.md
```

## Read Scope
`src/app/core/guards/auth.guard.ts`, `src/app/pages/welcome/welcome.page.ts`.

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — client routing only.

## Reuse Check
- none — edits existing files only.

## Step 0 — Reality Check
Confirm the five places above still read as quoted.

## User Stories
- As Dandan, I want nothing of the app visible to someone who is not signed in, shared recipe links included.

## Functional Requirements

### Must Have (P0)
1. Add `canActivate: [authGuard]` to the `cook/:id` route (the Human approved changing this existing entry,
   2026-11-12). The `returnUrl` from plan 589 brings the visitor back to the recipe after signing in.
2. `route-guard-check.mjs`: `ALLOW` = `welcome` only; update the header comment.
3. `SignedOutRedirectService`: drop the `/cook/` exception; only `/welcome` is skipped. Update its spec.
4. `e2e/ui/589-2.spec.ts`: a signed-out visit to `/cook/<id>` lands on `/welcome`, then signing in returns to the recipe.
5. `docs/agent/standards-security.md`: every route needs `authGuard` except `welcome`.

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- none.

## Atomic Sub-tasks
- [x] A1: Put shared recipe links behind sign-in like every other page — src/app/app.routes.ts, scripts/route-guard-check.mjs
- [x] A2: Send a signed-out visitor on a recipe link to the welcome page too — src/app/core/services/signed-out-redirect.service.ts, src/app/core/services/signed-out-redirect.service.spec.ts
- [x] A3: Update the screen check and the security rule — e2e/ui/589-2.spec.ts, docs/agent/standards-security.md

## What happens when
- A signed-in user opens a shared recipe link → the recipe, as today.

## Technical Considerations
- none.

## Out of Scope
- Public sharing of recipes in any other form.

## Critical Questions
- none.

## Open questions for the Human
- none.

## Execution Notes
- Human 2026-11-12, plan 589/591 card ④ (quoted above): replaces Q2 = keep.
- build, lint, test:ci (1986 SUCCESS) → exit 0; `node scripts/route-guard-check.mjs` → ROUTE_GUARDS: ok. log-query hung in my shell (left to the gate). e2e 589-2 rewritten, not run (needs QA servers).
