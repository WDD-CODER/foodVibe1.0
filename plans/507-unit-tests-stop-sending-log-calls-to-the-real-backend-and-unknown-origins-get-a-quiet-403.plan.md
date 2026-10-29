# Plan 507 — Unit tests stop sending log calls to the real backend, and unknown origins get a quiet 403

Status: draft
Track: code — here (not design)
Snapshot: 2cf94ac571b6ead55d9794f5a5c458a30971cf91

## Problem Statement

On 2026-10-27, between 15:00 and 17:00 UTC, the main backend (port 3000) logged 1514 `server.unhandled` errors
"CORS origin not allowed" on `POST /api/v1/log` (`node scripts/log-query.mjs --since=30d --event=server.unhandled`).
That window is exactly when orchestrator run-412-497 ran `ng test` in the slots. Nothing has been logged since.

Cause, traced 2026-10-29:

1. **Unit tests send real log calls.** `LoggingService.sendToServer` (`src/app/core/services/logging.service.ts:36-72`)
   does a plain `fetch` to `${environment.apiUrl}/api/v1/log` for every `info`/`warn`/`error` when
   `!environment.production`. The Karma `test` target in `angular.json` has no `fileReplacements`, so specs use
   `src/environments/environment.ts` (`apiUrl: 'http://localhost:3000'`). Karma serves from `http://localhost:9876`,
   which is not in the backend's allow-list. Only ~10 specs mock `LoggingService`; TestBed makes a fresh instance per
   test, so its 60 s back-off and 30-per-minute cap never build up.
2. **A refused origin becomes a 500.** `server/app.js:157` calls `callback(new Error('CORS origin not allowed'))`. The
   error reaches the global handler (`app.js:214-220`), which logs `server.unhandled` and answers 500. A wrong origin
   is a client problem, not a server crash, and it fills `app_logs` with stack traces.

Slot frontends are not the source: `ng serve -c slot` talks to the slot's own backend (300N), and `slot-serve.mjs:129`
gives that backend `ALLOWED_ORIGIN=http://localhost:<fePort>`.

## Goals & Success Criteria

- Primary: a unit-test run sends no request to any backend, and a request from an origin outside the allow-list gets a
  plain 403 that is logged once per origin — never a 500 or a stack trace.
- Success:
  - [auto] `pnpm run build` → exit 0.
  - [auto] `pnpm run test:ci` → exit 0, and with the main backend running on 3000 during the run,
    `node scripts/log-query.mjs --since=15m --event=server.unhandled` afterwards prints `No entries`.
  - [auto] `cd server` then `pnpm test` → exit 0, including the new cases: a request with a disallowed `Origin` gets
    403 and no `Access-Control-Allow-Origin` header; the same origin twice logs one `cors.origin_rejected` warn; an
    allowed origin and a request with no `Origin` still pass as today.
  - [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode

- Parallel: yes — touches the logger, environment files, the Karma target and the server's CORS block only.
- Concurrent plans: none known
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`, and the
append-only hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` — add to them,
never rewrite or remove an existing entry without escalating).

```scope
angular.json
src/environments/**
src/app/core/services/logging.service.ts
src/app/core/services/logging.service.spec.ts
server/app.js
server/test/cors-origin.test.js
```

## Read Scope

Entire repo.

## Escalation Protocol

If a file outside the scope is needed (for example a spec that asserts a log `fetch`): STOP, tell the Human the file,
the change and why; offer `approved: <path>`; append it to the scope block; retry.

## Architecture Impact

- INV-none: preserves — test configuration, client log shipping switch and the server's CORS refusal path only; no
  write route, schema, tenancy rule, taxonomy term or AI call changes.

## Reuse Check

- Test-only environment file — family: none — rung: 4 — why: environment files are build config, not a registry family; it copies `environment.ts` and adds one switch
- Log shipping switch in the logger — family: none — rung: 4 — why: one guard line in the existing `LoggingService`, no new piece
- Origin refusal in the server — family: none — rung: 4 — why: a few lines in the existing CORS block of `server/app.js`; the registry covers Angular and shared server helpers only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`: re-read `logging.service.ts` and the CORS block in
`server/app.js` and confirm the line numbers above.

## User Stories

- As the Human, a night of orchestrator test runs leaves `app_logs` with real problems only, not thousands of CORS
  stack traces.

## Functional Requirements

1. **Switch (A1):** add `sendLogsToServer: true` to every file in `src/environments/` (the type comes from
   `environment.ts`, so every file needs the key). Add `src/environments/environment.test.ts`, a copy of
   `environment.ts` with `sendLogsToServer: false`.
2. **Karma uses it (A2):** the `test` target in `angular.json` gets `fileReplacements` swapping `environment.ts` for
   `environment.test.ts`.
3. **Logger obeys it (A3):** `sendToServer` returns at once when `environment.sendLogsToServer` is false — before the
   `fetch`. Console output stays as today. If a spec tests the shipping itself, it sets the switch on for that test
   and back after (the `environment` object is mutable).
4. **Quiet refusal (A4):** in `server/app.js`, an origin outside `ALLOWED_ORIGINS` gets `403 { error: 'Origin not
   allowed' }` from a small middleware that runs before `cors()`; it never reaches the global error handler. The
   request is not processed (no log written, no handler runs). Log `cors.origin_rejected` at warn with the origin
   once per origin per process (a `Set`), so a flood costs one line. Requests with no `Origin` header and allowed
   origins behave exactly as today, including the 204 preflight.
5. **Tests (A5):** `server/test/cors-origin.test.js` (vitest + supertest, like `log-route.test.js`) covers the four
   cases in Success. Run the full checks and paste the outputs into Execution Notes.

## UI/UX Notes

- None. No screen changes.

## Atomic Sub-tasks

- [x] A1: Add a test-only settings file that turns off sending logs to a server — sendLogsToServer key in every environment file, false in the new environment.test.ts — src/environments/**
- [x] A2: Make the unit tests use that test-only settings file — fileReplacements on the Karma test target — angular.json
- [x] A3: Stop the logger from sending anything when the switch is off — early return before fetch; specs that test shipping turn it on — src/app/core/services/logging.service.ts, src/app/core/services/logging.service.spec.ts
- [x] A4: Answer an unknown origin with a plain 403 logged once, never a 500 with a stack trace — middleware before cors(), Set of seen origins, warn cors.origin_rejected — server/app.js
- [x] A5: Prove both fixes with tests and a clean log after a full test run — new server test, pnpm run build, pnpm run test:ci with the backend up, server tests, log-query; paste outputs — server/test/cors-origin.test.js, this plan file

## Out of Scope

- Adding Karma's port or slot ports to `ALLOWED_ORIGIN` — the tests should not call a backend at all.
- The client logger's rate limits and back-off (they work in the app; they only reset in tests).
- The invalid Gemini key in `wt-1`'s `server/.env` (run-497-419 note D4) — environment, not code.
- Production CORS settings on Render (`ALLOWED_ORIGIN` there is unchanged).

## Execution Notes
- Orchestrator readiness (2026-10-29): Start a backend on 3000, or only check one is up? → Never start or stop anything on 3000. If 3000 is up, run the log-query check after test:ci; if it is down, run log-query anyway, note in Execution Notes that 3000 was down, and rely on the new logging spec.
- Orchestrator readiness (2026-10-29): Create src/app/core/services/logging.service.spec.ts in A3? → Yes, two small cases only: switch off sends no fetch; switch on sends one request to /api/v1/log.
- Orchestrator readiness (2026-10-29): Server tests (`cd server && pnpm test`) are not an allowed run check → Accepted. The builder still writes server/test/cors-origin.test.js; the run PR's GitHub `server-tests` job is the evidence for that Success item, confirmed by the Planner before merge.
- Build evidence (2026-10-29): `pnpm run build` -> exit 0; `pnpm run lint` -> exit 0 (0 errors, 67 warnings, pre-existing); `pnpm run test:ci` -> exit 0, TOTAL 1600 SUCCESS (incl. 2 new logging.service.spec cases).
- Finding: with only the logging switch, test:ci still produced 3 `server.unhandled` CORS entries (path `/api/v1/data/DICTIONARY_OVERRIDES/global`, at 09:03:18-19Z) from specs using the real TranslationService/HttpStorageAdapter via HttpClient. Fix inside scope: `environment.test.ts` also points `apiUrl`/`authApiUrl` at `http://127.0.0.1:1` (closed port). Second `test:ci` -> exit 0, 1600 SUCCESS; `log-query --since=2m --event=server.unhandled` -> no entries. 3000 was up.
- `log-query --since=plan-start --level=error` still lists those 3 entries (+ their http.request.failed), all from the first test:ci run before the apiUrl fix; none after 09:03:19Z.
- Server: `cd server && pnpm exec vitest run test/cors-origin.test.js` -> 4 passed (run locally as an extra; full `server-tests` job is the PR evidence).
- scope-check --drift -> REALITY: clean.
