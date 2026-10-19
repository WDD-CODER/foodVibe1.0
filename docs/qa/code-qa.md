# Code QA — the scripted night run

Code QA runs before the UI agent and needs no AI. It does every check a script can do, so the 03:00 UI agent
(`qa-flow.md`, `qa-agent.md`) spends its budget on flows and layout. Plan 413 adds the first three layers; plan 414
adds API checks; plan 415 adds an AI code review on a nightly page rotation.

## Layers, in order

| Layer | Needs | Checks | Severity |
| --- | --- | --- | --- |
| `gates` | nothing | `npx ng build -c slot`, `npm run lint`, `npm run lint:icons`, `npm run lint:no-native-select`, `npx ng test --watch=false --browsers=ChromeHeadless`, `npm test --prefix server` | build fails → run **BLOCKED** (`<DATE>/BLOCKED.md`, later layers skipped); any other failure S2 with the last 30 output lines |
| `static` | nothing | G4: every `'key' \| translatePipe` exists in `dictionary.json`; template text that is not piped. G3: physical CSS (`margin/padding/border-left/right`, `left:`, `right:`, `text-align`/`float: left/right`) in `src/**/*.scss` and inline styles. Routes: every `loadComponent` resolves to a file exporting the class, every `redirectTo` target exists, every route in the `qa-plan.md` section headers exists in the router. Page map: every glob in `code-qa-pages.json` matches a file | S3 · S3 · S2 · S4 |
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

## Outputs (`bugs/qa-runs/code-qa/`, untracked)

| File | What |
| --- | --- |
| `<DATE>/pre-qa.md` | this run, per layer: `Status:` line, `Coverage:` line, findings in the `qa-agent.md` §6.3 shape (`CODE-<LAYER>-<NNN>`, S1–S4) |
| `<DATE>/pre-qa.json` | the same as data: `{ run, commit, startedAt, layers: { <layer>: { status, durationMs, coverage, findings } } }` |
| `<DATE>/shots/<PAGE>-<bp>.png` | full-page shot per route and breakpoint (`<PAGE>-r2-<bp>.png` for a page's second route) |
| `<DATE>/sweep.jsonl` | raw sweep results while the sweep runs; deleted once they are in `pre-qa.json` (raw page text is never kept unredacted) |
| `<DATE>/BLOCKED.md` | only when the build failed |
| `known.json` | every finding ever seen, by fingerprint: `{ fp, id, firstSeen, lastSeen, status: open\|gone, layer, page, title }` |
| `latest.md` | what the UI agent reads: open findings by page, the `PRE-CHECKED` table, the newest shots |

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
npm run qa:code -- --layers=gates,static,sweep --deadline=02:40
```

Run it from the main folder or the QA checkout (the sweep needs the QA stack on 4205/3005). `QA_USER` / `QA_PASS`
come from `.env` or `server/.env` of the checkout that runs it — the same account the evidence server uses.

Options: `--layers=<list>` · `--date=YYYY-MM-DD` (report folder, default today) · `--deadline=HH:MM` (the running
layer stops there, later layers are skipped, the reports are still written; a time earlier than now means tomorrow) ·
`--nightly` (deadline 02:40 unless given; `CODE-QA:` lines also go to `bugs/qa-runs/.nightly.log`) · `--e2e=all` ·
`--app=` / `--api=` (default `http://localhost:4205` / `http://localhost:3005`).

Exit code: 0 the run finished (with or without findings) · 2 blocked by a failed build · 1 bad usage.

Expected time: gates ≈ 10 min, static < 1 min, sweep ≈ 15–25 min.

## At night

`qa-nightly-up.ps1` (Windows task "FoodVibe QA up", 00:00) runs `qa-up.ps1` and then
`node scripts/qa/code-qa/run.mjs --nightly`. When the servers did not come up it runs only `gates,static`.
`bugs/qa-runs/.nightly.log` then holds one line per layer:

```
2026-10-20 00:41:12 code  CODE-QA: gates ok 1 findings
2026-10-20 00:41:14 code  CODE-QA: static ok 42 findings
2026-10-20 01:02:50 code  CODE-QA: sweep ok 37 findings
```

The UI agent reads `latest.md` in its P0 step (`qa-flow.md` P0.6) and skips what it lists (`qa-agent.md` §7.2).

## Files

- `scripts/qa/code-qa/run.mjs` — orchestrator, layer registry, sweep layer
- `scripts/qa/code-qa/gates.mjs`, `static-checks.mjs` — layers 1 and 2
- `scripts/qa/code-qa/findings.mjs` — fingerprints, `known.json`, report rendering
- `scripts/qa/code-qa/common.mjs` — paths, globs, page map
- `scripts/qa/lib/qa-login.mjs` — the QA login shared with the evidence server
- `e2e-qa/sweep.spec.ts`, `playwright.qa.config.ts` — the Playwright sweep and the e2e project
- `docs/qa/code-qa-pages.json` — page map: `{ id, title, routes, idType?, auth, files }` per `qa-plan.md` section
- Tests: `scripts/test/code-qa-static.test.mjs`, `scripts/test/code-qa-findings.test.mjs` (fixtures in
  `scripts/test/fixtures/code-qa/`)
