# Plan 610 — Sign-in limits stay on the live site but stop blocking local development

Status: draft
Depends-on: none
Snapshot: 7c16fc4d620acf269f6d85dafccf9ac1d1e18777
## Problem Statement

On 2026-11-14 the Human was locked out of a local test server with "Too many login attempts". `server/routes/auth.js`
sets three limits per IP:
- sign-in: 10 per 15 minutes (`loginLimiter`);
- sign-up: 5 per hour (`signupLimiter`);
- token refresh: 30 per 15 minutes (`refreshLimiter`).

On a developer machine every sign-in comes from 127.0.0.1: the Human's own, Playwright specs, Style QA and the
orchestrator's UI checks. They all share one budget, so automated checks use it up and block the Human. The Human
decided to keep the limits on the live site and switch them off locally.

Where each server's `NODE_ENV` comes from:
- Local dev servers run the `server` scripts `dev:local` / `dev`, which are `cross-env NODE_ENV=development` (see
  `server/package.json`). Every `wt-N` slot starts that script.
- The live Render service runs `NODE_ENV=production` (render.yaml).
- `dev:remote` (a local server on Atlas) runs as production and keeps the limits. That is acceptable.

## Goals & Success Criteria
**Primary:** with `NODE_ENV=development` the login, sign-up and refresh limiters never answer 429. With any other
`NODE_ENV` (production, test or unset) they behave exactly as today. The account lockout after 5 wrong passwords is
unchanged everywhere.

Done when:
- [auto] `pnpm run test:server` → exit 0
- [auto] `pnpm run build` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [auto] `cd server && npx vitest run test/auth-limit-dev.test.js` → exit 0 (15 sign-ins with NODE_ENV=development: none returns 429; 15 sign-ins with NODE_ENV=production: the 11th returns 429)
- [human] On a local test server, sign in and out more than 10 times in a row: it never says "Too many login attempts".

## Execution Mode

- Parallel: yes.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/auth.js
server/test/auth-limit-dev.test.js
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## Architecture Impact

- INV-none: preserves — `server/routes/auth.js` is in no invariant's Touches list. Ownership, tenancy and the account
  lockout are untouched; only the per-IP request budget is skipped, and only in development.

## Reuse Check

- none — the plan uses the existing `skip` option of `createRateLimiter`.

## User Stories

- As the developer testing locally, I want to sign in as often as I need, so that automated checks never lock me out.

## Functional Requirements

### Must Have (P0)
- [ ] `server/routes/auth.js`:
  - Add `const skipInDevelopment = () => process.env.NODE_ENV === 'development'`, read at request time, not at load.
  - Pass `skip: skipInDevelopment` to `loginLimiter`, `signupLimiter` and `refreshLimiter`.
  - Add a comment: development only; the live site runs production and keeps the limits; the account lockout (5 wrong
    passwords → 15 minutes) still applies in development.
- [ ] `server/test/auth-limit-dev.test.js`, built with supertest and `buildTestApp` from `server/test/helpers/app`,
  like `server/test/data-write-limit-off.test.js`:
  - with `process.env.NODE_ENV = 'development'`, 15 POSTs to `/api/v1/auth/login` with an unknown user never return 429;
  - with `'production'`, the 11th returns 429.
  - Restore `NODE_ENV` after each case.

## Atomic Sub-tasks

- [ ] 610-A1: Skip the sign-in, sign-up and refresh limits when the server runs in development — skip option on the three limiters — server/routes/auth.js
- [ ] 610-A2: Prove the limits are off in development and still on in production — server/test/auth-limit-dev.test.js

## Technical Considerations

- Security surface: the per-IP brute-force limit is skipped only when `NODE_ENV === 'development'`. Production must
  never run with that value; render.yaml sets production. The account lockout stays as the per-account guard everywhere.
- Backend / API impact: none beyond the 429 behaviour in development. Data / migration: none.

## Out of Scope

- The data write limiter (`DATA_WRITE_LIMIT_MAX`), the public limiter and the AI limiters.

## Critical Questions

none

## Execution Notes

- decision: Human 2026-11-14 "plan: login limit off locally" — keep the limits on the live site.
