# Code QA — the scripted night run

Code QA runs before the UI agent and needs no AI. It does every check a script can do, so the 03:00 UI agent
(`qa-flow.md`, `qa-agent.md`) spends its budget on flows and layout. Plan 413 adds the first three layers; plan 414
adds API checks; plan 415 adds an AI code review on a nightly page rotation.

## Layers, in order

| Layer | Needs | Checks | Severity |
| --- | --- | --- | --- |
| `gates` | nothing | `npx ng build -c slot`, `npm run lint`, `npm run lint:icons`, `npm run lint:no-native-select`, `npx ng test --watch=false --browsers=ChromeHeadless`, `npm test --prefix server` | build fails → run **BLOCKED** (`<DATE>/BLOCKED.md`, later layers skipped); any other failure S2 with the last 30 output lines |
| `static` | nothing | G4: every `'key' \| translatePipe` exists in `dictionary.json`; template text that is not piped. G3: physical CSS (`margin/padding/border-left/right`, `left:`, `right:`, `text-align`/`float: left/right`) in `src/**/*.scss` and inline styles. Routes: every `loadComponent` resolves to a file exporting the class, every `redirectTo` target exists, every route in the `qa-plan.md` section headers exists in the router. Page map: every glob in `code-qa-pages.json` matches a file | S3 · S3 · S2 · S4 |
| `api` | QA stack up on **local** Mongo | per user entity (suppliers, equipment, products, recipes, dishes, venues, menu events): create → read → update → list → search → count; delete → trash → restore by the app's own path; missing field, wrong type, 200 kB string → must be 400; no token → 401; the second account (`QA_USER2`) on QA_USER's record → refused and the record unchanged; QA_USER on admin routes → 403; every token-guarded `server/routes/ai.js` route without a token → 401 (no AI call is ever made) | 500 or a write that should be refused but succeeds S1 · data lost on the round trip S2 · another status with the right effect S3 |
| `sweep` | QA stack up (`npm run qa:up`) | every route in `code-qa-pages.json` × D 1366×768 / T 768×1024 / M 375×812, signed in as `QA_USER`: G1 horizontal scroll (S2 at M, S3 at T/D) · G8 console errors and 4xx/5xx (S2, minus the expected ones in `qa-agent.md` G8) · G4 raw dictionary keys on screen (S3) · G5 at M: hit area under 24×24 (S3), primary action under 44px tall (S4) · broken images (S3) · `<html dir>` not `rtl` (S2) · axe-core `wcag2a`/`wcag2aa` serious/critical (S3) · one full-page shot per route and breakpoint. Then the `e2e/*.spec.ts` flows against 4205 (a failing flow is S2) | see left |

Console/network (G8), raw keys (G4), axe, broken images and `<html dir>` do not depend on the screen size: each is one
finding per page (breakpoint `any`, the breakpoints it was seen at in **Where**). G1 and G5 stay one finding per
breakpoint.

G5 follows the `qa-agent.md` G5 rule (24×24 for every control, 44px only for primary actions), not "everything under
44×44": a secondary control between 24 and 44px is not a finding, so the report stays free of noise.

`:id` routes get the first record of the page's `idType` (`GET /api/v1/data/<type>?limit=1` as `QA_USER`). A page
with no such record is `NO-DATA`: listed by name on the sweep's `Coverage:` line, not swept.

The e2e project runs only the read-only `cook-view` flow by default. `--e2e=all` runs every flow; the other flows
create and delete records in the QA user's kitchen.

## The api layer (plan 414)

**Only local test data.** `qa-up.ps1` writes `.claude/.qa-env` (`local` or `remote`) when it starts the backend.
The layer writes only when that file reads `local` and the API is `http://localhost:3005`; otherwise it prints
`CODE-QA: api skipped (not local Mongo)` and sends nothing.

**Records.** Every record is named `QA-CODE-<DATE>-<entity>-subject` (or `-ref` for the records other fixtures point
at). Before and after the cases the layer deletes every `QA-CODE-` record of QA_USER in every entity and trash
collection; a record it cannot remove is an S2 finding. Fixtures are checked against `shared/schemas` first (built by
`npm run build:schemas`, which the layer runs when the build is missing), so a failing case is never the fixture's fault.

**Second account.** The cross-user cases need a second non-admin account: `QA_USER2` / `QA_PASS2` in `server/.env`
(see `README.md`). Without it those cases are `skipped` and the rest runs. Two logins per run, under the login limit.

**Budget.** About 130 write calls per run (printed as `writes: <n>`), far under `DATA_WRITE_LIMIT_MAX` (1000).

**Allow-list.** A case listed in `docs/qa/code-qa-api-cases.md` counts as `accepted`, not as a finding.

## Outputs (`bugs/qa-runs/code-qa/`, untracked)

| File | What |
| --- | --- |
| `<DATE>/pre-qa.md` | this run, per layer: `Status:` line, `Coverage:` line, findings in the `qa-agent.md` §6.3 shape (`CODE-<LAYER>-<NNN>`, S1–S4) |
| `<DATE>/pre-qa.json` | the same as data: `{ run, commit, startedAt, layers: { <layer>: { status, durationMs, coverage, findings } } }` |
| `<DATE>/shots/<PAGE>-<bp>.png` | full-page shot per route and breakpoint (`<PAGE>-r2-<bp>.png` for a page's second route) |
| `<DATE>/sweep.jsonl` | raw sweep results while the sweep runs; deleted once they are in `pre-qa.json` (raw page text is never kept unredacted) |
| `<DATE>/BLOCKED.md` | only when the build failed |
| `known.json` | every finding ever seen, by fingerprint: `{ fp, id, firstSeen, lastSeen, status: open\|gone, layer, page, title }` |
| `latest.md` | what the UI agent reads: open findings by page, the `PRE-CHECKED` table, a `Code review:` block per reviewed page, the newest shots |
| `<DATE>/queue.md` | tonight's code-review order (plan 415), written by `rotation.mjs pick` |
| `<DATE>/review-<PAGE>.md` | one page's code review, written by the Cowork Code QA agent |
| `ledger.json` | per page: last review, commit, `done`/`partial`/`never`, checks done, marks — the rotation's memory |

Layer status: `ok` (finished) · `partial` (the deadline stopped it) · `fail` (it could not run, e.g. no QA login) ·
`skipped` (blocked build or deadline).

## Fingerprints

`sha1(layer | check | page | bp | locator)`, first 12 hex characters. The locator is a CSS selector path, a
dictionary key, `file#rule` (selector + property, no line number), a route or a URL shape — never a line number or a
timestamp, so an unrelated edit does not turn an old finding into a new one. A finding keeps its `CODE-*` ID for
life. When a run's layer covered the finding's page and did not see it again, the finding becomes `gone`; if it comes
back it is `open` again with the same ID.

Reports never hold a token: every free-text field goes through `redact()` (JWTs, `Authorization`, `fv_token`,
`fv_refresh*` values).

## Run it by hand

```powershell
npm run qa:up
npm run qa:code
npm run qa:code -- --layers=static
npm run qa:code -- --layers=api
npm run qa:code -- --layers=gates,static,api,sweep --deadline=02:40
```

Run it from the main folder or the QA checkout (the sweep needs the QA stack on 4205/3005). `QA_USER` / `QA_PASS`
come from `.env` or `server/.env` of the checkout that runs it — the same account the evidence server uses.

Options: `--layers=<list>` · `--date=YYYY-MM-DD` (report folder, default today) · `--deadline=HH:MM` (the running
layer stops there, later layers are skipped, the reports are still written; a time earlier than now means tomorrow) ·
`--nightly` (deadline 02:40 unless given; `CODE-QA:` lines also go to `bugs/qa-runs/.nightly.log`) · `--e2e=all` ·
`--app=` / `--api=` (default `http://localhost:4205` / `http://localhost:3005`).

Exit code: 0 the run finished (with or without findings) · 2 blocked by a failed build · 1 bad usage.

Expected time: gates ≈ 10 min, static < 1 min, api < 1 min, sweep ≈ 15–25 min.

## At night

`qa-nightly-up.ps1` (Windows task "FoodVibe QA up", 00:00) runs `qa-up.ps1` and then
`node scripts/qa/code-qa/run.mjs --nightly`. That first ingests yesterday's code reviews, runs `gates,static,api,sweep`
(only `gates,static` when the servers did not come up), writes the reports, and last writes tonight's review queue.
`bugs/qa-runs/.nightly.log` then holds one line per layer:

```
2026-10-20 00:41:12 code  CODE-QA: gates ok 1 findings
2026-10-20 00:41:14 code  CODE-QA: static ok 42 findings
2026-10-20 00:41:28 code  CODE-QA: api ok 7 findings
2026-10-20 01:02:50 code  CODE-QA: sweep ok 37 findings
```

The UI agent reads `latest.md` in its P0 step (`qa-flow.md` P0.6) and skips what it lists (`qa-agent.md` §7.2).

## Code review rotation (plan 415)

An AI agent reads page code against the page's checks in `qa-plan.md` — the logic bugs a script cannot see (a dead
handler, a swallowed error, a list that does not refresh, a message that differs from the plan). A full pass does
not fit in one night, so it works down a **rotation queue**; scripts own all state, the agent only reads
`queue.md` and writes `review-<PAGE>.md` (protocol: `code-qa-agent.md`).

- **Check ids.** `plan-checks.mjs` numbers every `**PAGE-…**` check and the `Responsive` line of each `qa-plan.md`
  page section: `RB-C01`, `RB-C02`, … in order.
- **Queue order** (`rotation.mjs pick`): pages the agent left `partial` first (it resumes at the next unchecked
  check), then never-reviewed pages in plan order, then the rest by last review, oldest first. Files changed since a
  page's last review only break ties — age always wins, so a busy page cannot starve a quiet one. Every page is
  reviewed at least once every `ceil(19 / pages-per-night)` nights (+1 for a partial page).
- **Ingest** (`rotation.mjs ingest --date=<DATE>`): reads only each review's header (`Page`, `Commit`, `Status`,
  `Checks-done`) and its `### <CHECK> · <mark> · …` lines; a malformed file is skipped with
  `CODE-QA: ingest skipped <file> <reason>`. Ingesting the same file twice changes nothing. A `suspect` check
  becomes a `CODE-AI-<NNN>` finding; the page gets a `Code review:` block in `latest.md` with its marks.
- **Times.** 00:00 `run.mjs --nightly` (ingest yesterday, pick tonight) · 01:00 Cowork Code QA agent until
  `STOP_AT` 02:40 · 02:45 Windows "FoodVibe Code QA merge" (`qa-code-merge.ps1` → ingest tonight) · 03:00 UI agent.

```powershell
node scripts/qa/code-qa/rotation.mjs pick --date=2026-10-20
node scripts/qa/code-qa/rotation.mjs ingest --date=2026-10-20
```

## Files

- `scripts/qa/code-qa/run.mjs` — orchestrator, layer registry, sweep layer
- `scripts/qa/code-qa/gates.mjs`, `static-checks.mjs` — layers 1 and 2
- `scripts/qa/code-qa/api-layer.mjs` (guard, runner, cleanup), `api-cases.mjs` (the case rows), `api-fixtures.mjs` (one valid record per entity) — the api layer
- `docs/qa/code-qa-api-cases.md` — accepted API deviations (allow-list)
- `scripts/qa/code-qa/rotation.mjs` (ledger, pick, ingest), `plan-checks.mjs` (check ids) — the code-review rotation
- `docs/qa/code-qa-agent.md` — the Cowork Code QA agent's protocol and kickoff prompt
- `scripts/qa/qa-code-merge.ps1` — the 02:45 merge task
- `scripts/qa/code-qa/findings.mjs` — fingerprints, `known.json`, report rendering
- `scripts/qa/code-qa/common.mjs` — paths, globs, page map
- `scripts/qa/lib/qa-login.mjs` — the QA login shared with the evidence server
- `e2e-qa/sweep.spec.ts`, `playwright.qa.config.ts` — the Playwright sweep and the e2e project
- `docs/qa/code-qa-pages.json` — page map: `{ id, title, routes, idType?, auth, files }` per `qa-plan.md` section
- Tests: `scripts/test/code-qa-static.test.mjs`, `scripts/test/code-qa-findings.test.mjs`, `scripts/test/code-qa-api.test.mjs`, `scripts/test/code-qa-rotation.test.mjs` (fixtures in
  `scripts/test/fixtures/code-qa/`)
