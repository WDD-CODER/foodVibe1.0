# Plan 414 — Code QA Part 2: API and Data Checks

Status: done
Track: code — here (not design)
Snapshot: a426f19aebb86fd103f1edee3df469880fb0b1af

## Problem Statement
Data bugs reach the UI agent only by luck: a save that silently drops a field, a delete that never reaches the trash,
a bad input that crashes the server with a 500, a normal user reaching an admin route. A browser agent sees at most
one symptom of these. A script calling the API directly finds them in minutes, every night, for every entity.

Part 2 of 3 of Code QA (part 1: plan 413). Adds an `api` layer to `scripts/qa/code-qa/run.mjs` that runs after the
`gates` and `static` layers and before `sweep`, against the QA backend on 3005.

Decision (Human, 2026-10-19): test data only in the QA checkout's local Mongo; every record is prefixed and removed
at the end of the run.

## Prerequisites
- Plan 413 merged (`scripts/qa/code-qa/run.mjs`, `findings.mjs`, `scripts/qa/lib/qa-login.mjs` on `origin/main`).
- One-time [human] setup: a second non-admin account, credentials in `server/.env` as `QA_USER2` / `QA_PASS2`.
  Without it, the cross-user checks report `skipped` and the rest runs.

## Goals & Success Criteria
**Primary:** every user entity's create → read → update → delete → trash → restore path, its validation and its
permissions are checked every night, without a browser.

- [auto] `npm run test:scripts` passes, including `scripts/test/code-qa-api.test.mjs` (case builder and the
  local-only guard tested without a server).
- [auto] With the QA stack up on local Mongo, `npm run qa:code -- --layers=api` exits 0 and `pre-qa.md` has an `api`
  section with `Coverage: <n> entities × <m> cases` and one line per failed case.
- [auto] With `.claude/.qa-env` reading `remote`, `--layers=api` prints `CODE-QA: api skipped (not local Mongo)` and
  writes nothing to the database.
- [auto] After the run, `GET /api/v1/data/<type>` as QA_USER returns no record whose name starts with `QA-CODE-`, for
  every entity and trash type.
- [auto] The api layer makes at most 300 write calls per run (printed as `writes: <n>`), well under
  `DATA_WRITE_LIMIT_MAX` (1000).
- [x] [human] (validated by Human 2026-10-20: all 7 failed cases are real bugs) The Human reads the first night's `api` section and agrees each failed case is a real bug or adds it to
  the allow-list in `docs/qa/code-qa-api-cases.md` with a reason.

## Execution Mode
- Parallel: no. Writes the same orchestrator and docs as plan 415; run them one after the other.
- Concurrent plans: none.
- Isolated DB: no — but every write goes to the QA checkout's local Mongo only (guard in A2).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/qa/code-qa/**
scripts/qa/qa-up.ps1
scripts/test/code-qa-api.test.mjs
scripts/test/fixtures/code-qa/**
docs/qa/**
scripts/qa/qa-nightly-up.ps1
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside
the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and why it can't be done in-scope;
offer `approved: <path>`; then append the path to the scope block above and retry. A failing case that looks like a
server bug is reported, never fixed in this plan.

## Architecture Impact

- INV-1: preserves — the plan only tests it from outside (own record editable, another user's record and admin routes
  refused); no write route or `can-write.js` changes.
- INV-4: preserves — fixtures are validated against `shared/schemas` before sending; the plan tests that the server
  rejects invalid writes, it does not change validation.
- INV-none for the rest: QA tooling only.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `server/constants/collections.js`
`COLLECTIONS` (userData types and the `TRASH_*` names), `server/routes/generic.js` routes listed below, and plan 407
(one soft-delete model). **If plan 407 has merged**, the trash cases follow its model (whatever the delete/restore
endpoints are on `origin/main`), not the `TRASH_*` collections described here.

## Design

**Guard (A2):** `qa-up.ps1` writes `.claude/.qa-env` with `local` or `remote` when it starts the backend. The api
layer refuses to write unless that file reads `local` and the backend answers on `http://localhost:3005`.

**Entities:** the `userData: true`, non-`TRASH_*`, non-log types in `server/constants/collections.js`: suppliers,
products, recipes, dishes, equipment, venues, menuEvents. A minimal valid fixture per type in
`scripts/qa/code-qa/api-fixtures.mjs`, built so it parses with the matching schema from `shared/schemas` (run
`npm run build:schemas` first; the layer imports the built CJS output). Names start with `QA-CODE-<DATE>-`.
Fixtures that need references (product → supplier, recipe → product, dish/menuEvent → recipe) are created in that
order and reuse the ids.

**Cases per entity** (each a `{ id, method, path, as, body, expect }` row; built by `api-cases.mjs`):
1. CRUD: POST → 201/200 and the body echoes every fixture field; GET by id equals what was sent (deep compare on the
   fixture fields); PUT a changed name → GET shows it; list `GET /api/v1/data/<type>` contains it; `/search`
   finds it for searchable types; `/count` goes up by 1.
2. Trash: DELETE → the record is gone from the list and present in the matching trash type; restore via the app's
   restore path (read `src/app/pages/trash/**` to find it) → back in the list with the same fields.
3. Validation: missing required field, wrong type on one field, a 200 kB string → 400 (never 500, never 201).
   Unknown type `/api/v1/data/notAType` → 400/404.
4. Auth: POST/PUT/DELETE without a token → 401; with QA_USER2 on QA_USER's record → refused (403/404) and the record
   is unchanged afterwards; QA_USER on `GET /api/v1/admin/users`, `PUT …/push-to-master` → 403.
5. AI routes: unauthenticated POST to each `server/routes/ai.js` route → 401 only (no authenticated AI call, so no
   Gemini quota is spent).

**Severity:** 500 or a write that should be refused but succeeds → S1; data lost on round-trip → S2; wrong status
code with correct effect → S3. Findings go through `findings.mjs` (layer `api`, page = the QA page that owns the
entity, from `docs/qa/code-qa-pages.json` `idType`).

**Cleanup:** before the cases (leftovers from a crashed run) and after, delete every `QA-CODE-` record in each
entity and trash type as QA_USER. A cleanup failure is an S2 finding.

**Allow-list:** `docs/qa/code-qa-api-cases.md` lists known, accepted deviations (`case id — reason — date`); a case on
the list is reported as `accepted`, not as a finding.

## Functional Requirements

### Must Have (P0)
- [x] `api` layer in `run.mjs`, between `static` and `sweep`, with the guard, cases, cleanup and allow-list above.

### Won't Have (this plan)
- Load or performance tests; authenticated AI calls; admin-only success paths (push-to-master as admin).

## Atomic Sub-tasks
- [x] B1: Build a valid sample record for every entity so the API can be tested with real data shapes — fixtures checked against the shared schemas, QA-CODE- name prefix, reference order — scripts/qa/code-qa/api-fixtures.mjs
- [x] B2: Make sure API tests can only ever write to the local QA database — qa-up writes .claude/.qa-env; the layer refuses unless it reads local — scripts/qa/qa-up.ps1, scripts/qa/code-qa/api-layer.mjs
- [x] B3: Check that every entity saves, reads, edits, deletes, goes to trash and comes back intact — CRUD and trash cases — scripts/qa/code-qa/api-cases.mjs
- [x] B4: Check that bad input is refused with a clear error instead of crashing the server — validation cases — scripts/qa/code-qa/api-cases.mjs
- [x] B5: Check that users cannot touch each other's data or admin routes — auth and cross-user cases, skipped when QA_USER2 is missing; unauthenticated AI routes return 401 — scripts/qa/code-qa/api-cases.mjs
- [x] B6: Remove every test record before and after the run so the QA database stays clean — cleanup with its own finding on failure — scripts/qa/code-qa/api-layer.mjs
- [x] B7: Plug the API layer into the nightly run and the findings report — register layer api in run.mjs, write-call counter, allow-list file — scripts/qa/code-qa/run.mjs, docs/qa/code-qa-api-cases.md
- [x] B8: Test the case builder and the local-only guard without a server — scripts/test/code-qa-api.test.mjs, scripts/test/fixtures/code-qa/**
- [x] B9: Document the API layer and the second QA account setup — docs/qa/code-qa.md, docs/qa/README.md
- [x] B10: Prove it on the QA stack and record the numbers — run --layers=api, paste coverage, write count and failed cases into Execution Notes — this plan file

## Technical Considerations
- Dependencies: plan 413 files; `shared/schemas` built output; `server/routes/generic.js` behaviour (read only).
- New files: see Atomic Sub-tasks.
- Model changes: none.
- Backend / API: none changed; the layer calls existing `/api/v1/data/*`, `/api/v1/admin/*`, `/api/v1/ai/*` (401 path only).
- Auth and validation: two logins per run (QA_USER, QA_USER2), under the 10 per 15 min login limit.
- Security surface: QA_USER2/QA_PASS2 read from `server/.env` via `scripts/qa/lib/qa-login.mjs`, never printed.
- Data / migration: writes only `QA-CODE-` records to local Mongo, removed by cleanup.
- Project checks: none apply (no app/server code changes).

## Out of Scope
- Fixing any server bug found (each becomes a `/fix` plan).
- Testing against Atlas or Render.
- Recipe cost / scaling / unit math — already covered by `recipe-cost.service.spec.ts`, `scaling.service.spec.ts`,
  `unit-registry.service.spec.ts` in the gates layer.

## Execution Notes

**2026-10-20 — B1–B10 done** (built in wt-1's session, files in wt-2 per the Human).

B10 — live on the QA stack (started by the Worker from `C:\dev\foodVibe-qa` with `qa-up.ps1 -Env local`; the QA
checkout's `qa-up.ps1` on main does not write `.claude/.qa-env` yet, so wt-2's marker was set by hand to match):

- `.qa-env` = `remote` → `CODE-QA: api skipped (not local Mongo)`, exit 0, no request sent.
- `.qa-env` = `local` → `CODE-QA: api ok 7 findings`, 13 s. Coverage: `7 entities × 25 cases · 179 rows: 179 run ·
  7 failed · 0 accepted · 0 skipped · writes: 132 · cross-user: on`.
- After the run, a separate script listed every entity and trash type as QA_USER: 0 records named `QA-CODE-`.
- The 7 failures are one defect on every entity: `<entity>.validation.huge-string` — a 200 kB `nameHebrew` / `name`
  is stored (201). The schemas have no length limit. Reported as S1 by the plan's rule (a write that should be
  refused succeeds); the Human decides: fix plan, or a line in `docs/qa/code-qa-api-cases.md`.
- Every other case passed: CRUD round trip, list/search/count, trash and restore by the app's path, missing field and
  wrong type → 400, no token → 401, QA_USER2 on QA_USER's record → refused and unchanged, admin routes → 403, all
  token-guarded AI routes without a token → 401.

Decisions:
- Unknown type expects 400/403/404 (the server answers 403 from its type allow-list — the right effect).
- Subjects never carry references: reference records (`…-ref`) are created first, so each subject can go through
  delete/trash/restore; a product used by a recipe cannot be deleted (409) by design.
- `push-to-master` is probed with a fake id: `requireAdmin` answers before the handler, and nothing real can be pushed
  if the guard ever broke.
- Trash restore follows the app (`replaceAll(TRASH_*, rest)` then POST); menu events have no restore in the app and
  suppliers have no trash, so those rows are not built.
- `scripts/qa/qa-nightly-up.ps1` added to scope (Human: `approved: qa-nightly-up.ps1`): the nightly layers are now
  `gates,static,api,sweep`.
