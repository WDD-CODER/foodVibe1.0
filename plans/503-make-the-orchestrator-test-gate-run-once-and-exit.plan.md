# Plan 503 — Make the orchestrator test gate run once and exit

Status: draft
Track: code
Depends-on: none
Snapshot: 6510967f38b5660d058315692477dc97e317b2ed

## Problem Statement
The orchestrator gate runs `commands.test` from `kit.config.json`, which is `test` and resolves to `npm run test` = `ng test`. That is the watch-mode Karma runner: it prints its totals and then waits, so the gate never returns. In run-412-497 this cost about 2 hours, and the branches had to be re-checked by hand with headless tests. It blocks `/orchestrate 498-502`.

## Goals & Success Criteria
- Primary: one command runs the whole Angular suite headless, once, and exits with a pass / fail code; the gate uses it.
- Success:
  - [ ] [auto] `npm run test:ci` runs the Karma suite once in headless Chrome and exits 0 on a green tree (exit code and the "Executed N of N" line pasted).
  - [ ] [auto] `npm run test:ci` exits non-zero when a spec is made to fail (try a temporary `fail()`, then revert).
  - [ ] [auto] `node -e "console.log(require('./kit.config.json').commands.test)"` prints `test:ci`; `npm run test` is unchanged (still `ng test`) for local watch use.
  - [ ] [auto] `npx ng build` passes; `npm run test:scripts` exits 0.

## Execution Mode
- Parallel: yes — touches two config files only.
- Concurrent plans: none (498–502 should wait for this one)
- Isolated DB: no

## Execution Notes
- Source: session-state-main 2026-10-27, Next Step 1.
- Add `"test:ci": "ng test --watch=false --browsers=ChromeHeadless"` next to `test` in root `package.json`; set `commands.test` in `kit.config.json` to `test:ci`. Neither file is listed in `docs/workflow-kit/kit-owned.json`, so no kit release is needed; if `kit-sync` later reports a diff on `kit.config.json`, add an `overrides` entry.
- Check first that nothing else reads `commands.test` expecting watch mode (`scripts/kit-extract.mjs` mentions it; `.github/workflows/ci.yml` does not use `npm run test`).
- Risk: a headless Chrome that needs `--no-sandbox` on CI. Only add a custom launcher if the local run or CI fails without it.
- Flaky `ProductFormComponent` specs seen locally in run-412-497 are not in scope; report them if they fail again.

## Reuse Check
- Single-run test command and gate wiring — family: none — rung: 4 — why: two config lines (npm script and kit command name); the registry covers Angular and server code only

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
package.json
kit.config.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no permission or write-route file is touched.
- INV-2: preserves — no tenancy or master-data change.
- INV-3: preserves — no cascades added or moved.
- INV-4: preserves — no schema change.
- INV-5: preserves — no taxonomy change.
- INV-6: preserves — no AI call path is touched.

## Backend Impact
- Collections affected: none
- New collections: no
- Auth / validation: none. Server code untouched.

## Out of Scope
Fixing flaky specs, changing CI workflows, and the other orchestrator lessons (worktree `node_modules` install, drift check) — those go in a kit plan.

## Atomic Sub-tasks

- [ ] A1: Add a one-shot headless test command so the whole suite can run and exit — new test:ci npm script next to test — package.json
- [ ] A2: Point the orchestrator's test gate at that command so it stops hanging in watch mode — commands.test becomes test:ci; confirm no other reader expects watch mode — kit.config.json
- [ ] A3: Prove the gate returns on both a green tree and a deliberately failing spec — run test:ci twice, paste exit codes, revert the failing spec — this plan file

## Done when
- [ ] [auto] Every `[auto]` item under Success Criteria passes (output pasted in the Worker's report).
