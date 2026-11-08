# Plan 517 — Let the orchestrator gate run FoodVibe's server tests and the log check, and give e2e specs a signed-in session

Status: done
Snapshot: 589524365af5ec711e860748e7f8cfbc22dfbbca
Depends-on: none

## Problem Statement
Run `run-412-497` (2026-10-27) parked all three plans on the environment, not on the code. Four blockers were found
(decisions D6, D11, D20, D27, D30, D36 in `docs/orchestrator/runs/run-412-497/report.md`). Re-checked on 2026-11-07
against plans 503 and 508 and kit v2.1.0 (`scripts/run-plans.mjs`), two are still open and one is half open:

- **Karma never exits — solved.** Plan 503 added `"test:ci": "ng test --watch=false --browsers=ChromeHeadless"`
  (`package.json:15`) and `kit.config.json` `commands.test` = `test:ci` (`kit.config.json:32`); verified on main
  3cfb996a (1598 of 1598, exit 0). No wrapper is needed.
- **Server tests unreachable from the gate — open.** There is no root `test:server` script, and the gate's allowlist
  (`scripts/run-plans.mjs:79-93` `checkProblem`) takes only `npm|pnpm run <script>`, `node scripts/…|tools/…` and
  `node --test`; `pnpm --dir server run test` is not allowed. Plans 518–520 need it. The suite itself is green
  (`pnpm --dir server run test` → 67 files, 819 tests, exit 0, 2026-11-07).
- **`log-query --since=plan-start` dies in a builder folder — open.** `scripts/log-query.mjs:56-59` calls `die()` when
  `.claude/.slot-plan-start` is missing; `scripts/run-plans.mjs` and `scripts/orch-state.mjs` never write that marker
  (only `scripts/take-plan.mjs:347` does). `scripts/log-query.mjs:112` dies again when no Mongo URI is configured. Every
  plan that touches app or server code carries this check (`docs/agent/plan-checks.md` "Success criteria"), so every
  such plan fails its gate. Plan 508 fixed only how the driver loads.
- **One Playwright spec as a check — no longer needed as a script.** In v2.1.0 the gate does not rerun `[ui]` card tests
  (no `uiCards` handling in `scripts/run-plans.mjs` or `scripts/lib/plan-gate.mjs`); the builder writes and runs them
  itself with a guarded bare Bash (`scripts/lib/claude-run.mjs:55-66`). What is still missing is a signed-in session
  helper, so each logistics card spec (522, 523) does not reinvent the QA login.

## Goals & Success Criteria
**Primary:** `pnpm run test:server` and `node scripts/log-query.mjs --since=plan-start --level=error` exit on their own
with a meaningful code from a fresh builder folder, and e2e specs sign in through one helper.
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `node --test scripts/test/log-query-fallback.test.mjs` → `# fail 0`.
- [auto] `pnpm run test:server` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` exits 0 (in a folder without `.claude/.slot-plan-start` its first line starts with `plan-start: no marker`).
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/517-orchestrator-gate-test-runners.plan.md` → nothing missing; `node scripts/scope-check.mjs --reuse --plan=plans/517-orchestrator-gate-test-runners.plan.md` exits 0.
- [ui] Signed in as the QA user through `signInQa`, the page `/menu-library` shows the header's user chip with the QA user's name (e2e/qa-session.spec.ts, screenshot `screens/517-1.png`).

## Execution Mode
- Parallel: no — it changes the check commands every later plan runs.
- Concurrent plans: none.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/log-query.mjs
scripts/test/log-query-fallback.test.mjs
package.json
e2e/helpers/**
e2e/qa-session.spec.ts
screens/517-*.png
docs/agent/plan-checks.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — the scope reaches no `Touches` glob; a package script, a project-owned check script, e2e helpers and a doc paragraph.

## Reuse Check
- `e2e/helpers/qa-session.ts` — family: none — rung: 4 — why: a thin TypeScript wrapper over the existing `scripts/qa/lib/qa-login.mjs` (`loginQa`, `seedQaContext`, `qaCredential`), which it reuses as is; the registry covers app and server code only.
- `resolvePlanStart` / `databaseUri` in `scripts/log-query.mjs` — family: none — rung: 4 — why: two exported helpers inside the existing script, so the test can call them without Mongo.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef (and the person who runs the builds), I want an unattended run to finish with a verdict so that a feature is either merged or parked for a real reason, never for a missing marker file.

## Functional Requirements

### Must Have (P0)
- [ ] `package.json` script `"test:server": "pnpm run build:schemas && pnpm --dir server run test"`. `test` and `test:ci` stay as they are.
- [ ] `scripts/log-query.mjs`: `--since=plan-start` without `.claude/.slot-plan-start` → the committer time of `git merge-base HEAD origin/main` (fallback: the first commit of the branch not on `origin/main`; fallback: 24h ago), printed as the first line `plan-start: no marker, using <ISO> (<merge-base|first-commit|24h>)`. No Mongo URI after the existing dotenv loads (`MONGO_LOCAL_URI`, then `MONGO_URI`, as today at line 111; with `--remote` the existing pair) → print `SKIP: no database configured` and exit 0. Every other behaviour unchanged (including `--remote`, `--file`, `--prune-logs`).
- [ ] `e2e/helpers/qa-session.ts`: `signInQa(context, { api?, app? })` → imports `scripts/qa/lib/qa-login.mjs`, calls `loginQa({ api: api ?? process.env.E2E_API_URL ?? 'http://localhost:3000', userKey: 'ORCH_QA_USER', passKey: 'ORCH_QA_PASSWORD' })` (falls back to `QA_USER` / `QA_PASS` when the `ORCH_` pair is empty, through `qaCredential`), then `seedQaContext(context, session, app ?? process.env.E2E_APP_URL ?? 'http://localhost:4200')`, returns `session`; `createQaEvent(request, session, overrides?)` → `GET /api/v1/data/taxonomyTerms` with the bearer token, picks the first `eventType` and the first `menuType` term, `POST /api/v1/data/menuEvents` with `{ name: 'E2E ' + Date.now(), eventType, servingType, guestCount: 50, sections: [], ...overrides }`, returns the created `_id`; `deleteQaEvent(request, session, id)` → `DELETE /api/v1/data/menuEvents/:id`. Before writing `createQaEvent`, read `shared/schemas/entities/menu-event.schema.ts` and send the fields it requires (the list above is the minimum the plan expects; match the schema, never weaken it).
- [ ] `e2e/qa-session.spec.ts`: one test — `signInQa`, `page.goto('/menu-library')`, expect the header user chip (`.user-chip`, `src/app/core/components/header/`) to contain `session.user.name`, screenshot to `screens/517-1.png`.

### Should Have (P1)
- [ ] `docs/agent/plan-checks.md` gets a "Checks the orchestrator can run" paragraph: `pnpm run test:ci` (client), `pnpm run test:server` (server), `node scripts/log-query.mjs --since=plan-start --level=error` (works without a marker and without a database), and the `[ui]` card shape — a spec under `e2e/ui/<NNN>-<n>.spec.ts` that signs in with `signInQa`, run by the builder with `pnpm exec playwright test <spec>` (not a gate check).

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI change. No dictionary keys.

## Atomic Sub-tasks
- [x] A1: Make server tests a check the gate may run — add `test:server` (build the schemas first, then the server suite) — package.json
- [x] A2: Make the log check survive a builder folder — export `resolvePlanStart(root)` (marker, else merge-base time, else first branch commit, else 24h, with its source) and `databaseUri({ remote })` (the URI or `''`); use them in place of the two `die()` paths; print the `plan-start: no marker` line and the `SKIP: no database configured` exit 0 — scripts/log-query.mjs
- [x] A3: Unit-test both helpers without Mongo — a temp folder with and without `.claude/.slot-plan-start` (marker wins; without it the source is `merge-base` inside this repo, `24h` in a non-git temp dir); `databaseUri` with both env vars unset → `''`, with `MONGO_LOCAL_URI` set → that value (save and restore `process.env`). Guard the CLI entry with an `import.meta.url` check so importing does not run the query — scripts/test/log-query-fallback.test.mjs, scripts/log-query.mjs
- [x] A4: Give e2e specs a signed-in QA session and a throwaway event — `signInQa`, `createQaEvent`, `deleteQaEvent` over the existing qa-login helpers — e2e/helpers/qa-session.ts
- [x] A5: Prove the session helper against the running app with one screenshot (dropped, Human 2026-11-08: QA users are not used now; the spec stays, never run) — the `[ui]` card test, run with `pnpm exec playwright test e2e/qa-session.spec.ts` — e2e/qa-session.spec.ts, screens/517-1.png
- [x] A6: Tell plan authors which checks the gate can run — one paragraph — docs/agent/plan-checks.md
- [x] A7: Run every automatic check of this plan from the worktree and paste the outputs under Execution Notes

## What happens when
- `test:server` on a tree with a red server test: vitest's non-zero exit is passed through; no retry.
- `log-query` in a folder that is not a git repository and has no marker: `plan-start: no marker, using <ISO> (24h)`.
- `log-query` with a marker and a database: exactly today's behaviour.
- `signInQa` has no credentials at all: throws `QA credentials not set (ORCH_QA_USER / ORCH_QA_PASSWORD or QA_USER / QA_PASS)`; the spec fails with that message. The helper never prints a credential or a token.
- `createQaEvent` gets a 4xx: throws with the status and the server's error message; the spec fails, nothing is left behind.

## Technical Considerations
- Dependencies: `scripts/qa/lib/qa-login.mjs` (`loginQa`, `seedQaContext`, `qaCredential`), `playwright.config.ts` (webServer `npx ng serve` on 4200, `reuseExistingServer`), `scripts/run-plans.mjs` `checkProblem` (the allowlist).
- New files needed: `scripts/test/log-query-fallback.test.mjs`, `e2e/helpers/qa-session.ts`, `e2e/qa-session.spec.ts`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: the e2e helper reads credentials through `qaCredential` and never prints them.
- Security surface: `package.json` changes (one script, no dependency).
- Data / migration: none. `createQaEvent` writes one event to the database the API uses and the spec deletes it.
- Project checks: log-query `[auto]` present (and made runnable); Reuse Check present; no dictionary keys; no app code.
- Ordering: plan B (brief 3(b), the scripts move to `--target`) also edits `scripts/log-query.mjs` and depends on this plan.

## Out of Scope
- A Karma wrapper, `scripts/test-ci.mjs` and the `TEST-CI:` summary line (solved by plan 503). `scripts/e2e-one.mjs` (the v2.1.0 gate does not run card tests). Fixing why Karma hangs in watch mode. Installing `node_modules` in builder folders (kit). Playwright's webServer reusing the main folder's server on 4200 when a builder runs a card spec (kit plan 080, parked until 2026-11-15). The intermittent server test collisions (D5).

## Critical Questions
- Q1: Keep `test` interactive (watch) and use `test:ci` for the gate? A: yes (plan 503 did it).
- Q2: `log-query` without a database: A: SKIP with exit 0 — a builder folder may have no `server/.env`.

## Execution Notes
- Planner review 2026-11-07 (brief 4): re-verified the four blockers against plans 503 and 508 and kit v2.1.0 at 5895243. Cut: `scripts/test-ci.mjs`, its test and fixtures, `scripts/e2e-one.mjs` and its test, `kit.config.json` (already `commands.test: test:ci`). Kept: `test:server`, the log-query fallback, the e2e session helper. Changed: `npm` → `pnpm` (plan 505), Done-when paths spelled out, `createQaEvent` told to follow the menu-event schema. Plans 518–523 updated to match: `npm run test:ci` exits 0 instead of the `TEST-CI:` line; 522 and 523 run card specs with `pnpm exec playwright test <spec>`. Every file in scope is project-owned (none in `.kit/install.json`).
- Builder run: `node --test scripts/test/log-query-fallback.test.mjs` → exit 0, pass 4 fail 0. `pnpm run test:server` → exit 0. `node scripts/log-query.mjs --since=plan-start --level=error` → exit 0 (`no entries`; a Mongo URI exists here). `pnpm run build` + `pnpm run lint` → exit 0. `pnpm run test:ci` → exit 0, 1707 of 1707. scope-check --arch ok, --reuse exit 0.
- A5 not ticked: `pnpm exec playwright test e2e/qa-session.spec.ts` fails with `fetch failed` — no API on localhost:3000 in this environment, so `screens/517-1.png` is not produced. The ESM load problem (Playwright CJS cannot require the .mjs) was fixed with a native `import()` in the helper.
- Closed 2026-11-08 (Human): A5 dropped — the `[ui]` QA-session spec needs QA credentials and nothing uses the QA users yet. Code merged in PR #522.
