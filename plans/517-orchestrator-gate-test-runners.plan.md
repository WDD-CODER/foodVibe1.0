# Plan 517 — Let the orchestrator gate run FoodVibe's tests, server tests and one e2e spec without hanging

Status: draft
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f
Depends-on: none

## Problem Statement
Run `run-412-497` (2026-10-27) parked all three plans on the environment, not on the code: `npm run test` (Karma)
prints its TOTAL line and never exits on this machine (decisions D6, D11, D20, D36 in
`docs/orchestrator/runs/run-412-497/report.md`), so every gate times out; server tests are not reachable from the gate
at all (no root script, and `npm --prefix server test` is not an allowed check); `scripts/log-query.mjs --since=plan-start`
dies without `.claude/.slot-plan-start` or a Mongo URI (D27, D30), which no builder folder has; and a `[ui]` card's test
command must be `npm run <script>` or `node scripts/…`, so there is no allowed way to run one Playwright spec. The
logistics plans (518–523) need all four, so this plan comes first.

## Goals & Success Criteria
- Primary: `npm run test:ci`, `npm run test:server`, `node scripts/log-query.mjs --since=plan-start --level=error` and
  `node scripts/e2e-one.mjs <spec>` each exit on their own with a meaningful exit code, from a fresh worktree.
- Success:
  - `[auto]` `npm run build` exits 0; `npm run lint` exits 0.
  - `[auto]` `node --test scripts/test/test-ci.test.mjs scripts/test/e2e-one.test.mjs scripts/test/log-query-fallback.test.mjs` → `# fail 0`.
  - `[auto]` `npm run test:ci` exits (0 or 1) within 15 minutes and its last line is `TEST-CI: <n> specs, <m> failed, exit <code>`.
  - `[auto]` `npm run test:server` exits 0.
  - `[auto]` `node scripts/log-query.mjs --since=plan-start --level=error` in a folder without `.claude/.slot-plan-start` prints a line starting with `plan-start: no marker` and exits 0 when no database is configured (`SKIP: no database`), or lists entries when one is.
  - `[auto]` `node scripts/scope-check.mjs --arch --plan=<this file>` → nothing missing; `node scripts/scope-check.mjs --reuse --plan=<this file>` exits 0.
  - `[ui]` Signed in as the QA user, the page `/menu-library` shows the header's user chip with the QA user's name.

## Execution Mode
- Parallel: no — it changes the check commands every later plan runs.
- Concurrent plans: none.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/test-ci.mjs
scripts/e2e-one.mjs
scripts/log-query.mjs
scripts/test/test-ci.test.mjs
scripts/test/e2e-one.test.mjs
scripts/test/log-query-fallback.test.mjs
scripts/test/fixtures/**
package.json
kit.config.json
e2e/helpers/**
e2e/qa-session.spec.ts
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

- INV-none: preserves — the scope reaches no `Touches` glob; scripts, package scripts, kit commands and e2e helpers only.

## Reuse Check
- `scripts/test-ci.mjs`, `scripts/e2e-one.mjs` — family: none — rung: 4 — why: project check scripts, the kind `scripts/` already holds (`check-lucide-icons.mjs`, `log-query.mjs`); no UI or app code.
- `e2e/helpers/qa-session.ts` — family: none — rung: 4 — why: a thin TypeScript wrapper over the existing `scripts/qa/lib/qa-login.mjs` (`loginQa`, `seedQaContext`), which it reuses as is.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef (and the person who runs the builds), I want an unattended run to finish with a verdict so that a feature is either merged or parked for a real reason, never for a hung test runner.

## Functional Requirements

### Must Have (P0)
- [ ] `scripts/test-ci.mjs` runs `npx ng test --watch=false --browsers=ChromeHeadless`, reads its stdout line by line, and when a Karma summary line (`TOTAL: <n> FAILED, <m> SUCCESS` or `TOTAL: <m> SUCCESS` or `Executed <a> of <b> … (<n> FAILED)`) appears, stops the child and its tree (`taskkill /PID <pid> /T /F` on Windows, `kill -TERM` of the process group elsewhere), prints `TEST-CI: <specs> specs, <failed> failed, exit <code>` and exits 1 when `failed > 0`, else 0. No summary within `TEST_CI_TIMEOUT_MS` (default 900000) → kill, print `TEST-CI: timeout`, exit 1. A child exit before any summary → exit with the child's code.
- [ ] `scripts/e2e-one.mjs <spec path>` runs `npx playwright test <spec>` (argument validated: relative path under `e2e/`, `.spec.ts`, no `..`) and exits with its exit code; any other argument → prints usage, exit 2.
- [ ] `package.json` scripts: `"test:ci": "node scripts/test-ci.mjs"`, `"test:server": "npm --prefix server test"`; `kit.config.json` → `commands.test` = `"test:ci"`. `"test"` stays as it is (the Human's interactive run).
- [ ] `scripts/log-query.mjs`: `--since=plan-start` without `.claude/.slot-plan-start` → the time of `git merge-base HEAD origin/main` (fallback: the first commit of the branch; fallback: 24h), printed as `plan-start: no marker, using <ISO> (<source>)`; no Mongo URI in `MONGODB_URI` / `MONGO_LOCAL_URI` / `.env` / `server/.env` → print `SKIP: no database configured` and exit 0. Every other behaviour unchanged.
- [ ] `e2e/helpers/qa-session.ts`: `signInQa(context, { api?, app? })` → imports `scripts/qa/lib/qa-login.mjs`, calls `loginQa({ api: api ?? process.env.ORCH_UI_API_URL ?? 'http://localhost:3000', userKey: 'ORCH_QA_USER', passKey: 'ORCH_QA_PASSWORD' })` (falls back to `QA_USER` / `QA_PASS` when the `ORCH_` pair is empty), then `seedQaContext(context, session, app ?? 'http://localhost:4200')`, returns `session`; `createQaEvent(request, session, overrides?)` → `GET /api/v1/data/taxonomyTerms` with the bearer token, picks the first `eventType` and the first `menuType` term, `POST /api/v1/data/menuEvents` with `{ name: 'E2E ' + Date.now(), eventType, servingType, guestCount: 50, sections: [], ...overrides }`, returns the created `_id`; `deleteQaEvent(request, session, id)` → `DELETE /api/v1/data/menuEvents/:id`.
- [ ] `e2e/qa-session.spec.ts`: one test — `signInQa`, `page.goto('/menu-library')`, expect the header user chip (`.user-chip`, `src/app/core/components/header/`) to contain the signed-in user's name (`session.user.name`), screenshot to `screens/517-1.png`.

### Should Have (P1)
- [ ] `docs/agent/plan-checks.md` gets a "Checks the orchestrator can run" paragraph naming the four commands and the `[ui]` card test shape `node scripts/e2e-one.mjs e2e/ui/<NNN>-<n>.spec.ts`.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No UI change. No dictionary keys.

## Atomic Sub-tasks
- [ ] A1: Give the project a test runner that always exits, so the gate gets a verdict instead of a hang — spawn ng test headless, parse the Karma TOTAL line, kill the process tree, print the TEST-CI summary line — scripts/test-ci.mjs
- [ ] A2: Prove the runner exits on a fake child that prints TOTAL and then hangs — the test spawns `node scripts/test/fixtures/fake-karma.mjs` (prints `TOTAL: 1 FAILED, 3 SUCCESS` then sleeps 60s) through an exported `runWithParser(cmd, args, { timeoutMs })` and asserts exit 1 and the summary line within 5s; a second fixture prints `TOTAL: 4 SUCCESS` → exit 0; a third prints nothing → timeout path exit 1 with `timeoutMs: 500` — scripts/test/test-ci.test.mjs, scripts/test/fixtures/fake-karma.mjs
- [ ] A3: Let a card's test command run one Playwright spec through an allowlisted script — validate the argument, spawn `npx playwright test <spec>` with stdio inherited, exit with its code; test the validator (`e2e/x.spec.ts` ok, `../x.spec.ts` and `e2e/x.ts` → exit 2) — scripts/e2e-one.mjs, scripts/test/e2e-one.test.mjs
- [ ] A4: Register the two runners as package scripts and point the kit's test command at the one that exits — `test:ci`, `test:server`; `commands.test: "test:ci"` — package.json, kit.config.json
- [ ] A5: Make the log check survive a builder folder — plan-start fallback to the branch base time, SKIP with exit 0 when no database is configured; keep every other path as it is — scripts/log-query.mjs, scripts/test/log-query-fallback.test.mjs (unit-test the exported `resolvePlanStart(root)` and `databaseUri(root)` helpers; no Mongo)
- [ ] A6: Give e2e specs a signed-in QA session and a throwaway event — `signInQa`, `createQaEvent`, `deleteQaEvent` over the existing qa-login helpers — e2e/helpers/qa-session.ts
- [ ] A7: Prove the session helper against the running app with one screenshot — the `[ui]` card test — e2e/qa-session.spec.ts
- [ ] A8: Tell plan authors which checks the gate can run — one paragraph — docs/agent/plan-checks.md
- [ ] A9: Run every automatic check of this plan from the worktree and paste the outputs under Execution Notes

## What happens when
- `test:ci` finds no Chrome: ng test fails before any summary → the child's non-zero exit is passed through (no retry).
- `e2e-one` is given a spec that does not exist: Playwright's own "no tests found" exit code is passed through.
- `signInQa` has no credentials at all: throws `QA credentials not set (ORCH_QA_USER / ORCH_QA_PASSWORD or QA_USER / QA_PASS)`; the spec fails with that message.

## Technical Considerations
- Dependencies: `scripts/qa/lib/qa-login.mjs` (`loginQa`, `seedQaContext`, `qaCredential`), `playwright.config.ts` (webServer on 4200, `reuseExistingServer`), `.github/workflows/ci.yml` line 114 (the same ng test flags).
- New files needed: `scripts/test-ci.mjs`, `scripts/e2e-one.mjs`, `scripts/test/test-ci.test.mjs`, `scripts/test/e2e-one.test.mjs`, `scripts/test/log-query-fallback.test.mjs`, `scripts/test/fixtures/fake-karma.mjs`, `e2e/helpers/qa-session.ts`, `e2e/qa-session.spec.ts`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: the e2e helper reads credentials through `qaCredential` and never prints them; `e2e-one.mjs` validates its one argument.
- Security surface: `package.json` and `kit.config.json` change (sensitive paths → `orch-security` runs); no new dependency, no secret.
- Data / migration: none.
- Project checks: log-query `[auto]` present (and made runnable); Reuse Check present; no dictionary keys; no app code.

## Out of Scope
- Fixing why Karma hangs (D6) — it is worked around, not fixed. Installing `node_modules` in builder worktrees (kit-owned `orch-state.mjs`, D4). The drift-forever check after Step 0 (kit-owned `scope-check.mjs`, D31). The intermittent server test collisions (D5).

## Critical Questions
- Q1: Keep `npm run test` interactive (watch) and add `test:ci`? (a) yes — **chosen**, nothing the Human types changes (b) replace `test` itself.
- Q2: `log-query` without a database: (a) SKIP with exit 0 — **chosen**, a builder folder has no `.env` (b) fail — would park every builder.

## Execution Notes
