# Plan 413 — Code QA Part 1: Nightly Code Gates and Headless Page Sweep

Status: active
Track: code — here (not design)
Snapshot: a426f19aebb86fd103f1edee3df469880fb0b1af

## Problem Statement
The nightly UI QA agent (Cowork, plan 408) spends its night on checks a script can do: horizontal scroll (G1), raw
English keys on screen (G4), tap targets under 44px (G5), console/network errors (G8), and whether the plan's pages
exist at all (P1). All 3 findings of the 17 Oct run were of that kind. It also runs out of budget before it reaches
flows and layout, the things only it can see.

This plan is part 1 of 3 of "Code QA": a deterministic run (no AI) that starts with the servers at 00:00, finds every
mechanical bug first, and hands the UI agent a list of what is already known and already checked. Part 2 (plan 414)
adds API and data checks; part 3 (plan 415) adds the AI code-review agent with a nightly page rotation.

Decisions (Human, 2026-10-19): test data only in the QA checkout's local Mongo, cleaned up at the end; add
`@axe-core/playwright` as a dev dependency; the AI layer runs on Cowork (plan 415).

## Prerequisites
- none. Plan 408's QA stack (`scripts/qa/*`, ports 4205/3005/4206) is on `origin/main`.

## Goals & Success Criteria
**Primary:** before the UI agent starts, every mechanical check has already run and its findings are in one file the
agent reads, so the agent does not test or report them again.

- [auto] `npm run test:scripts` passes, including the new `scripts/test/code-qa-*.test.mjs` (static checks find a
  planted missing key, a planted physical CSS property and a planted dead redirect in fixtures; fingerprints are
  stable; a finding seen before is merged, not duplicated).
- [auto] `npm run build` passes.
- [auto] With the QA stack up (`npm run qa:up`), `npm run qa:code -- --layers=gates,static,sweep` exits 0 and writes
  `bugs/qa-runs/code-qa/<DATE>/pre-qa.md`, `pre-qa.json` and `bugs/qa-runs/code-qa/latest.md`, each with one section
  per layer and a `Coverage:` line.
- [auto] The sweep line in `pre-qa.md` reads `SWEEP: <n> routes × 3 breakpoints` where `<n>` equals the number of
  routes in `docs/qa/code-qa-pages.json` (minus routes marked `NO-DATA`, which are listed by name).
- [auto] Running `qa:code` twice in a row: the second `latest.md` has the same finding count and no duplicate
  fingerprints.
- [human] After one night: `bugs/qa-runs/.nightly.log` shows the `CODE-QA:` lines before 02:40, and the UI agent's
  `report.md` repeats no `CODE-*` finding and marks G1/G4/G5/G8 as pre-checked.
- [human] The Human reads one `pre-qa.md` and confirms the false-alarm rate is acceptable (the Human picks 5
  findings at random; at most 1 is wrong).

## Execution Mode
- Parallel: no. Plans 414 and 415 build on this plan's files; take them after this one merges.
- Concurrent plans: none.
- Isolated DB: no (reads only; the sweep logs in and opens pages, it creates nothing).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/qa/code-qa/**
scripts/qa/lib/**
scripts/qa/evidence-server.mjs
scripts/qa/qa-nightly-up.ps1
scripts/qa/qa-schedule.ps1
scripts/test/code-qa-*.test.mjs
scripts/test/fixtures/code-qa/**
e2e-qa/**
playwright.qa.config.ts
docs/qa/**
package.json
package-lock.json
.gitignore
.gitleaksignore
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside
the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and why it can't be done in-scope;
offer `approved: <path>`; then append the path to the scope block above and retry. Re-registering the Windows tasks
changes the Human's machine: show the exact `qa-schedule.ps1` command and let the Human run it.

## Architecture Impact

- INV-none: preserves — QA tooling under `scripts/qa/`, `e2e-qa/` and `docs/qa/` only; no app, server, schema or
  auth file is written. The sweep reads the app as a normal non-admin user.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits by symbol and print one
line per commit: `ok` or `conflict: <what>`. Watch for: `scripts/qa/evidence-server.mjs` `login()` and its
sessionStorage keys (`fv_token`, `loggedInUser`), `qa-schedule.ps1` `-Up`/`-Down` params, the G1–G9 list in
`docs/qa/qa-agent.md` §7, and the page list in `docs/qa/qa-plan.md`.

## Design

**Outputs** (all under `bugs/qa-runs/code-qa/`, untracked):
- `<DATE>/pre-qa.json` — `{ run, commit, startedAt, layers: { <layer>: { status: ok|fail|skipped, durationMs, coverage, findings: [...] } } }`.
- `<DATE>/pre-qa.md` — the same, readable: per layer a status line, a `Coverage:` line, and findings in the
  `qa-agent.md` §6.3 shape with IDs `CODE-<LAYER>-<NNN>` and severities S1–S4.
- `<DATE>/shots/<PAGE>-<bp>.png` — one full-page shot per route and breakpoint (D 1366×768, T 768×1024, M 375×812).
- `known.json` — every finding ever seen, by fingerprint: `{ fp, firstSeen, lastSeen, status: open|gone, layer, page, title }`.
  A finding not seen in a run whose layer covered its page becomes `gone`.
- `latest.md` — what the UI agent reads: open findings grouped by page, the `PRE-CHECKED` list (which G-checks the
  code run covered, per page and breakpoint), and links to the newest shots.

**Fingerprint:** `sha1(layer | check | page | bp | locator)`, first 12 hex chars. `locator` is the CSS selector path,
dictionary key, file:line-less symbol (`file#rule`) or URL — never a line number or a timestamp, so it stays stable
across unrelated edits.

**Layers in this plan:**
1. `gates` — `npx ng build -c slot`, `npm run lint`, `npm run lint:icons`, `npm run lint:no-native-select`,
   `npx ng test --watch=false --browsers=ChromeHeadless`, `npm test --prefix server`. A failed build ends the run
   (later layers `skipped`) and writes `bugs/qa-runs/code-qa/<DATE>/BLOCKED.md`; any other failure is a finding (S2)
   with the last 30 lines of output.
2. `static` — no server:
   - G4: every literal `'<key>' | translatePipe` in `src/app/**/*.html` exists in `public/assets/data/dictionary.json`;
     text nodes in templates that contain letters (Hebrew or Latin) outside `{{ }}` and not piped are reported (S3).
   - G3 (partial): physical properties in `src/**/*.scss` and inline `style=` (`margin-left|right`, `padding-left|right`,
     `left:`, `right:`, `text-align: left|right`, `border-left|right`, `float: left|right`) (S3).
   - Routes: every `loadComponent` import path in `src/app/app.routes.ts` and child route files resolves to a file
     exporting the named class; every `redirectTo` target matches a defined path; every route in `docs/qa/qa-plan.md`
     section headers exists in the router (missing → S2, feeds the UI agent's P1).
3. `sweep` — Playwright against `http://localhost:4205`, logged in as `QA_USER` (one login, sessionStorage seeded
   the same way `evidence-server.mjs` does it). For every route in `docs/qa/code-qa-pages.json` × D/T/M:
   - G1 `document.documentElement.scrollWidth > innerWidth` (S2 at M, S3 at T/D).
   - G8 console errors and 4xx/5xx responses, except the expected logged-out 401s listed in `qa-agent.md` G8 (S2).
   - G4 visible text matching the dictionary-key shape (`^[a-z][a-z0-9_]+$`, also found as a key in the dictionary) (S3).
   - G5 at M only: the hit area (larger of the element box and its clickable parent) of every visible
     `button, a, [role=button], input, select, [tabindex]` under 44×44 (S3), deduplicated by selector.
   - Broken images (`naturalWidth === 0` after load) (S3); `<html dir>` not `rtl` (S2).
   - axe-core (`@axe-core/playwright`) with tags `wcag2a, wcag2aa`; `serious`/`critical` → S3, others not reported.
   - `:id` routes get a real id from `GET /api/v1/data/<type>?limit=1` as QA_USER; none → the route is `NO-DATA`.
   - The existing `e2e/*.spec.ts` flows run once against 4205 (reuse via `playwright.qa.config.ts` second project);
     a failing flow is an S2 finding with the Playwright error.

**Page map** `docs/qa/code-qa-pages.json`: one entry per page section of `qa-plan.md` (SHELL, DASH, META, INV, EQ,
RB, ML, COOK, SUP, VEN, VEND, INVF, EQF, SUPF, VENF, RBD, MI, TRASH, REDIR):
`{ id, title, routes: [..], idType?: "<collection>", auth: bool, files: [globs] }`. `files` lists the page's
component, service and server-route globs; this plan fills it, plan 415 uses it. The static layer reports any glob
that matches no file (S4, "page map stale").

**Night timeline** (QA checkout `C:\dev\foodVibe-qa`):
- 00:00 Windows "FoodVibe QA up": fast-forward, `npm ci` if needed, `qa-up.ps1`, then `node scripts/qa/code-qa/run.mjs --nightly`.
- ~01:00 (plan 415) Cowork Code-QA agent. 03:00 Cowork UI agent. 07:30 Windows "FoodVibe QA down".

## Functional Requirements

### Must Have (P0)
- [x] `npm run qa:code` runs the layers in order and writes the outputs above.
- [ ] Nightly up runs Code QA after the servers are up and logs `CODE-QA: <layer> <status> <n> findings` per layer.
- [ ] The UI agent reads `latest.md` in P0 and skips pre-checked G-checks and known findings.

### Won't Have (this plan)
- API/data checks (plan 414), AI code review and rotation (plan 415), auto-fixing anything.

## Atomic Sub-tasks
- [x] A1: Share the QA login so the sweep and the evidence server sign in the same way — move qaCredential, login and the sessionStorage seeding out of evidence-server.mjs into a shared module; evidence server behaviour unchanged — scripts/qa/lib/qa-login.mjs, scripts/qa/evidence-server.mjs
- [x] A2: Write the page map that ties every QA plan page to its routes and source files — one entry per qa-plan.md section, shape in Design — docs/qa/code-qa-pages.json
- [x] A3: Add the findings store so each bug gets a stable ID and is never reported twice — fingerprint, merge into known.json, mark gone, render pre-qa.md / pre-qa.json / latest.md — scripts/qa/code-qa/findings.mjs
- [x] A4: Run the existing build, lint and test commands as the first layer and stop the night on a broken build — gates layer with BLOCKED.md — scripts/qa/code-qa/gates.mjs
- [x] A5: Catch missing translations, physical CSS and broken routes straight from the source — static layer per Design — scripts/qa/code-qa/static-checks.mjs
- [x] A6: Visit every page at three screen sizes and record scroll, console, tap-size, image and accessibility problems — Playwright sweep + axe + shots, plus a second project that runs e2e/*.spec.ts against 4205 — e2e-qa/sweep.spec.ts, playwright.qa.config.ts
- [x] A7: Add the one command that runs all layers and writes the night's report — orchestrator with --layers, --nightly, --date, --deadline; npm script qa:code; add @axe-core/playwright devDependency — scripts/qa/code-qa/run.mjs, package.json, package-lock.json
- [x] A8: Start Code QA automatically after the servers come up at midnight — call run.mjs from the nightly up script; change default Up to 00:00 and Down to 07:30 — scripts/qa/qa-nightly-up.ps1, scripts/qa/qa-schedule.ps1
- [x] A9: Test the static checks and the findings store with planted fixtures so CI catches regressions — scripts/test/code-qa-static.test.mjs, scripts/test/code-qa-findings.test.mjs, scripts/test/fixtures/code-qa/**
- [x] A10: Teach the UI agent to read the Code QA report first and skip what it already covers — qa-flow.md P0 step reads latest.md; qa-agent.md §7 marks G1/G4/G5/G8 pre-checked when latest.md lists them for the page and bp, never re-report a CODE fingerprint, fall back to the full protocol when latest.md is missing or older than 24h — docs/qa/qa-flow.md, docs/qa/qa-agent.md
- [x] A11: Document Code QA and the new night timeline — new code-qa.md (layers, outputs, fingerprint, how to run by hand); README Nightly mode timeline and the Windows task re-register command; ignore bugs/qa-runs/code-qa/ — docs/qa/code-qa.md, docs/qa/README.md, .gitignore
- [x] A12: Prove it end to end on the QA stack and record the numbers — run qa:code with the stack up, paste the per-layer status lines and durations into Execution Notes — this plan file

## Technical Considerations
- Dependencies: `scripts/qa/evidence-server.mjs` (login logic moves out), `scripts/qa/qa-up.ps1` (unchanged),
  `e2e/*.spec.ts` (run as-is with baseURL 4205; tests that hard-code 4200 are fixed via config, not edited).
- New files: see Atomic Sub-tasks.
- Model changes: none.
- Backend / API: none (read-only GETs as QA_USER).
- Auth and validation: one login per run (login limiter is 10 per 15 min); credentials only from `.env` /
  `server/.env` via the shared module, never on a command line or in a report.
- Security surface: none new; reports must not contain the token (the findings store strips `Authorization`
  headers and `fv_token` values from any captured network line).
- Data / migration: none.
- Project checks: Hebrew UI — none added; hotspots untouched.
- Runtime budget: gates ≈ 10 min, static < 1 min, sweep ≈ 19 pages × 3 bp ≈ 15–25 min. The run needs no AI and does not
  block the 01:00 Code QA agent (that one reads code only), but it must finish before the UI agent: `run.mjs
  --nightly --deadline=02:40` stops the current layer at the deadline, marks it `partial` and still writes the reports.

## Out of Scope
- Fixing any finding (fixes go through `/fix` plans).
- Overlap/clipping (G2), RTL look (G3 visual), FAB/chips/header (G6, G7, G9), flows and messages — they stay with the UI agent.
- Running Code QA as a PR check (later, if wanted).
- Committing QA reports.

## Execution Notes

**2026-10-19/20 — wt-1 (Worker).** All A1–A12 done. Two P0 lines stay open until the first night proves them
(nightly CODE-QA lines; UI agent skipping pre-checked G-checks) — they are the plan's `[human]` Done-when items.

A12 — live runs from wt-1 against the QA stack (4205/3005/4206 up from `C:\dev\foodVibe-qa`), commit 38eb8be6:

| Run | gates | static | sweep | total | open findings |
| --- | --- | --- | --- | --- | --- |
| 1 | ok · 2 findings · 8.9 min | ok · 42 · 4 s | ok · 82 · 7.2 min | 16 m 13 s, exit 0 | 126 |
| 2 | ok · 1 finding | ok · 42 | ok · 83 | 13 m 23 s, exit 0 | 126, 126 unique fingerprints |

- Coverage lines (run 1): gates `6/6 commands — build ok 115s · lint ok 62s · lint-icons ok 2s · lint-no-native-select
  fail 2s · unit-tests ok 243s · server-tests fail 108s`; static `84 templates · 754 translatePipe keys · 84 style
  files · 35 router paths · 26 plan routes · 110 page-map globs`; sweep `SWEEP: 29 routes × 3 breakpoints · 87/87
  loads done · NO-DATA: none · e2e: 5 passed · 0 failed · 0 skipped`. 29 = every route in `code-qa-pages.json`.
- Run 1 → run 2: same open count, no duplicate fingerprint. Two flaky items swapped: `server-tests` failed in run 1
  only (vitest teardown `dropDatabase` in `test/v2-enforcement.test.js`), and the cook-view phone e2e flow failed in
  run 2 only. Real gate finding on main: `lint:no-native-select` fails on `ai-product-modal.component.html`.

Decisions taken while building (Architect review):
- **G5 follows `qa-agent.md` G5**, not "under 44×44": under 24×24 on any control = S3, a primary action under 44px
  tall = S4, secondary controls 24–44px are not findings. The plan's rule would flag nearly every chip and arrow and
  break the `[human]` false-alarm check (≤1 of 5 wrong).
- **Screen-size-free checks are one finding per page** (axe, G8, G4, broken images, `dir`; breakpoint `any`, the
  breakpoints seen listed in Where). G1 and G5 stay per breakpoint. Without this, run 1 had 190 sweep findings that
  were mostly the same axe rule three times; now 82.
- **e2e project runs only the read-only `cook-view` flow by default** (`--e2e=all` for the rest): the other three
  create records in the QA user's kitchen every night and still look for old English labels. It signs in with a
  refresh-cookie storageState from the same single login.
- The up task's time limit went from 30 min to 3 h (Code QA runs after `qa-up` inside it). When `qa-up` fails, the
  nightly run still does `gates,static`.
- `.gitignore` also gets `.claude/.qa-env` now, for plan 414's guard file (414's scope has no `.gitignore`).
- `sweep.jsonl` (raw page text) is deleted once its findings are in the redacted `pre-qa.json`.
- `.gitleaksignore` added to scope (Human: `approved: .gitleaksignore`, 2026-10-20): the PR's gitleaks check flagged
  the fake JWT in `code-qa-findings.test.mjs`; the test now builds it at runtime and the old commit's fingerprint is listed.
