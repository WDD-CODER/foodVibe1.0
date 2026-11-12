# Plan 593 — The terms popup shows once per user (and again only after a terms change), not once per new browser

Status: draft
Depends-on: 584
Snapshot: ca7dcb1d813c7dbfd6a07b82e2196b7ec802cf77

## Problem Statement
The Human (2026-11-12): "I keep getting the terms each time it's opening a new browser — it's not meant to! It needs to
be only once for a user, only if there are changes to the terms then it comes again." Verified on origin/main:

- The acceptance is stored: `users.demo_owner` has `termsAcceptedVersion: "2026-11-v2"` (local database, 2026-11-12),
  the same as `public/assets/legal/terms.he.json` `version`.
- A new browser (no `sessionStorage`) restores the session through `UserService.refreshToken()`
  (`src/app/core/services/user.service.ts:240-262`). `POST /api/v1/auth/refresh` answers only `{ token }`
  (`server/routes/auth.js:364`), and the client rebuilds the user from the token's claims
  (`_id, name, businessId, businessRole, isPlatformAdmin`, `user.service.ts:250-257`; `signAccess`,
  `server/routes/auth.js:73-82`). The claims carry no `termsAcceptedVersion`, so the rebuilt user has none and
  `TermsGateComponent` (`terms-gate.component.ts:42`) shows the popup again.

## Goals & Success Criteria
- [auto] `pnpm run test:server` passes, including `server/test/auth-terms.test.js` (new case: after `accept-terms`,
  `POST /auth/refresh` answers `user.termsAcceptedVersion` equal to the current version; for a user who never accepted
  it is `null`).
- [auto] `pnpm run test:ci` passes, including `src/app/core/services/user.service.spec.ts` (new case: a refresh with
  no stored user and a response `user` sets the signed-in user from that `user`, including `termsAcceptedVersion`).
- [auto] `pnpm run build`, `pnpm run lint` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Sign in as an account that already accepted, close the browser, open a new browser window on the app: no
  terms popup.

## Execution Mode
Orchestrator run from `origin/main`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts` — add to them, never rewrite or
remove an existing entry without escalating).

```scope
server/routes/auth.js
server/test/auth-terms.test.js
src/app/core/services/user.service.ts
src/app/core/services/user.service.spec.ts
```

## Read Scope
`src/app/core/components/terms-gate/**`, `server/utils/terms-version.js`.

## Escalation Protocol
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — the refresh route answers the same public user the login route already answers; no new data.

## Reuse Check
- none — reuses `toPublicUser` on the refresh route.

## Step 0 — Reality Check
Confirm `/refresh` answers `{ token }` only and the client builds the user from claims.

## User Stories
- As a user who accepted the terms, I want to be asked again only when the terms change, not every time I open a new
  browser.

## Functional Requirements

### Must Have (P0)
1. `POST /auth/refresh` answers `{ token, user: toPublicUser(user) }` (the user it already loads to sign the token).
2. `UserService.refreshToken()`: when the response has `user`, it sets and stores that user (as login does) instead of
   the claims-only user; the claims path stays only as the fallback when `user` is missing. The "refresh cookie belongs
   to someone else" case keeps its data reload.
3. Every other behaviour of refresh stays (token stored, refresh timer, the guest flow).

### Should Have (P1)
- none.

### Nice to Have (P2)
- none.

## UI/UX Notes
- none.

## Atomic Sub-tasks
- [ ] A1: Send the full signed-in user back when a session is restored — server/routes/auth.js, server/test/auth-terms.test.js
- [ ] A2: Use that user in the app so an accepted terms version is remembered in every new browser — src/app/core/services/user.service.ts, src/app/core/services/user.service.spec.ts

## What happens when
- The terms `version` changes → the stored version differs → the popup shows once, as designed (plan 584).

## Technical Considerations
- none.

## Out of Scope
- The terms text and version.

## Critical Questions
- none.

## Open questions for the Human
- none.

## Execution Notes
- Human 2026-11-12 (quoted in the Problem Statement).
