# Dead Code Audit — Method

How the 2026-11-06 audit was run, written so an agent (or a weekly scheduled job) can repeat it and
reach the same decisions. Report-only: the audit never deletes. Deletions go through a plan.

Toolkit (in `tools/dead-code-audit/`): `scripts/*.py` + `configs/knip.*.json` + the TSV baseline of
the first run (`baseline-2026-11-06/`). Run them on Linux/WSL: `classify-exports.py` shells out to GNU `grep`. The Python scripts are the reference implementation; for the repo they
should be ported to `scripts/dead-code/*.mjs` (repo convention is Node).

## Principles

1. **Reachability, not mention.** "Someone references it" is not "it is alive". Two scripts that
   mention each other in comments are a closed island. Liveness is traced from real entry points
   (routes, `app.config.ts`, `main.ts`, `package.json` scripts, `.husky`, CI, `.claude` hooks/commands,
   OS schedulers).
2. **Wired is not alive either.** A script in `package.json` that writes to a collection that no
   longer exists is dead. Check what a candidate *targets*, not only who calls it.
3. **Fixpoint.** Removing dead A can make B dead. Repeat the member scan with dead bodies blanked
   until nothing new appears; report later rounds as orphan chains.
4. **Every finding carries evidence**: the query that proved it, the commit where it lost its last
   caller (`git log -S`), and its tier. No evidence → not a finding.
5. **Known false positives are data, not judgement.** Keep them in the KEEP registry below and
   filter them out before reporting, so each week starts from the same baseline.
6. **Tests do not make code alive.** Code called only by specs is reported separately (Tier B):
   deleting it means deleting its tests too.

## Tiers

| Tier | Rule | Action |
|---|---|---|
| A | Zero production references after all checks, or targets a schema/collection that no longer exists | Delete in a plan, run the verification gate |
| B | Referenced only by tests, or an orphan chain that needs a UI check | Delete code + tests after the check |
| C | Liveness depends on production data or a human decision | Ask / run the data check |
| D | Exported but used only inside its own file | Cosmetic, batch later |
| KEEP | Tool says dead, evidence says alive | Add to the KEEP registry |

## Procedure

Run from a fresh clone of `origin/main` with full history (record the SHA in the report).

```bash
git clone https://github.com/WDD-CODER/foodVibe1.0.git repo && cd repo   # full history: git log -S needs it
git rev-parse HEAD                                                         # -> report "Snapshot"
pnpm install --frozen-lockfile --ignore-scripts
pnpm --dir server install --frozen-lockfile --ignore-scripts
pnpm run build:schemas                                                     # creates server/generated/schemas
```

### Step 1 — Client import graph (knip, two modes)

```bash
npx knip --config configs/knip.client-dev.json --include files,exports,types,duplicates --reporter json > raw/knip-client-dev.json
npx knip --config configs/knip.client.json --production --include files,exports,types,duplicates --reporter json > raw/knip-client-prod.json
```
- `client-dev`: specs are entries → what nothing at all uses.
- `client` with `--production`: specs excluded → also catches test-only code.
- The repo's own `knip.json` is too narrow (only `src/app`, picks up `scripts/test/fixtures`).

### Step 2 — Classify every flagged export

```bash
python3 -I scripts/classify-exports.py . raw/knip-client-prod.json raw/knip-client-dev.json raw/exports-classified.tsv
```
Word-boundary search of the symbol in its own file, in specs, and everywhere else (`src`, `server`,
`shared`, `scripts`, `.html`). Classes: `DEAD`, `TEST-ONLY`, `TEST+INTERNAL`, `EXPORT-ONLY`, `CHECK`.
`CHECK` = hits elsewhere; resolve by hand (usually a barrel re-export, a same-named symbol, or server
use of `shared/schemas`).

### Step 3 — Class members (Angular-aware, fixpoint)

```bash
python3 -I scripts/unused-members.py . raw/members.tsv
```
knip 6 no longer reports class members, and it cannot see templates. This scan collects every member
declared below an `export class` line, counts word hits across all `.ts` and `.html` under `src/`,
and repeats with dead bodies blanked. It skips lifecycle/interface methods and fields whose
initializer is a side effect (`effect(`, `afterNextRender(`, `.onDestroy(`, `.subscribe(`).
Known blind spots, check by hand:
- same-name delegation (`exportMenuInfo()` in a facade calling `exportMenuInfo()` in a service) keeps
  the inner one "alive"; follow the chain manually from round-1 findings;
- a name mentioned in a comment counts as a use (false negative, e.g. `UtilService.makeId`);
- dead branches (`if (type === 'menu-info')` where nothing sets that value) are not detected.

### Step 4 — Server

```bash
cd server
../node_modules/.bin/knip --config ../configs/knip.server.json                        # dead files/exports, deps
../node_modules/.bin/knip --config ../configs/knip.server.json --production --include files,exports
cd ..
python3 -I scripts/server-endpoints.py . raw/endpoints.tsv                           # routes with no caller
```
Entries: `index.js`, `app.js`, `jobs/`, `migrations/`, `scripts/`, `test/**/*.test.js`.
`zod` shows as unused — it is used by `server/generated/schemas` (KEEP).

### Step 5 — Scripts: reachability and target

```bash
python3 -I scripts/script-reachability.py . raw/scripts-reach.tsv scripts server/scripts server/migrations tools
git grep -lE "'(PRODUCT|RECIPE|DISH)_LIST'|collection\('KITCHEN_|v1-only-guard|PRODUCT_LIST" -- scripts server/scripts tools
```
- `REACHABLE` (from a real root), `ISLAND` (only other unreachable scripts mention it), `DOCS-ONLY`
  (only plans/docs mention it), `NO-REFS`.
- Then the target check: anything touching retired collections/fields is Tier A even if `REACHABLE`.
- `DOCS-ONLY` admin tools (`server/scripts/*`, `migrations/tools/*`) are runbook tools, not dead — keep
  unless they target the old schema.
- Skip files listed in `.kit/install.json` (owned by ai-workflow-kit).

### Step 6 — Angular compiler

```bash
npx ng build --configuration development 2>&1 | grep -E "NG8113|unused"
```
`NG8113` = a standalone component imports something its template never uses.

### Step 7 — Dictionary keys

```bash
python3 -I scripts/dictionary-keys.py . raw/dictionary-keys.tsv
```
`USED` / `DYNAMIC-POSSIBLE` (a `'prefix_' + x` or `` `prefix_${x}` `` builder could produce it) /
`BARE-WORD` / `UNUSED`. Data groups (`units`, `categories`, `allergens`, `*_categories`) translate
values stored in the DB — never Tier A from code alone. `dictionary.json` is an append-only hotspot:
cleanup needs its own plan with exclusive scope.

### Step 8 — Public assets and shipped files

```bash
for f in $(git ls-files public); do echo "$(git grep -lF "$(basename $f)" -- src server angular.json ngsw-config.json public/manifest.webmanifest | grep -vx "$f" | wc -l) $f"; done | sort -n
```
Everything under `public/` ships to production (`angular.json` → `glob: **/*`). Zero references + not a
standard web file → Tier A.

### Step 9 — Dependencies

Use knip's dependency output for both packages, then verify each by hand against config files
(`eslint.config.mjs`, `.lintstagedrc.mjs`, `.prettierrc*`, `postcss.config*`, build tool internals).

### Step 10 — Duplication and repo clutter

```bash
npx -y jscpd@4 src/app server --ignore "**/*.spec.ts,**/node_modules/**,**/generated/**,server/test/**,server/scripts/legacy-import/**" --format typescript,javascript --min-tokens 80 --min-lines 12 --reporters json --output raw/jscpd --silent
git ls-files -ci --exclude-standard          # tracked files the .gitignore says should not be tracked
```

### Step 11 — History for every Tier A/B symbol

```bash
git log -1 --format='%cs %h %s' -S"<symbol>" -- src/app ':!*.spec.ts' ':!<own file>'
```
Gives the commit (usually a plan) where the last caller disappeared. No commit = never had a caller
outside its own file. Put it in the finding.

### Step 12 — Write the report

Same sections as `reports/dead-code-audit-2026-11-06.md`: bottom line, what Dandan must decide,
Tiers A–D with evidence, "checked and clean", KEEP, trend. Orphan keys in `dictionary.json` are reported as a
count only and never proposed for removal (Human decision 2026-11-06). Weekly runs: compare the TSVs with the
previous run (first baseline: `tools/dead-code-audit/baseline-2026-11-06/`) and report only **new** findings plus the count of still-open old ones.

## Verification gate (every deletion plan)

```bash
pnpm lint
pnpm exec ng build
pnpm exec ng test --watch=false --browsers=ChromeHeadless
pnpm run test:scripts
pnpm --dir server test
npx knip --config configs/knip.client-dev.json      # count must go down, nothing new
```
Plus one `[human]` check per removed UI-adjacent cluster (open the screen, use the feature next to it).

## KEEP registry (filter these out)

| Item | Why the tool is wrong |
|---|---|
| `@angular/platform-browser-dynamic` | Imported by Karma's virtual test entry; removing it broke `ng test` (plan 311) |
| `zod` (root, server) | Root: `build:schemas` + types. Server: runtime via gitignored `server/generated/schemas` |
| `shared/schemas/**` flagged by client knip | Consumed by the server through the CJS build |
| `src/app/core/models/v2/conformance.ts` | Compile-time schema/model guard, compiled by `v2-types.spec.ts` |
| `src/app/core/engine/testing/**` | Test fixtures |
| Fields initialized with `effect()`, `afterNextRender()`, `.onDestroy()`, `.subscribe()` | Side effects run on construction |
| Files in `.kit/install.json` | Owned by ai-workflow-kit; change upstream |
| `scripts/qa/qa-*.ps1` | Run by Windows Task Scheduler |
| `server/migrations/**`, `server/migrations/tools/**` | History / runbook; `seed-master.js` requires 0003 and 0007 |
| Client "mirror" constants of `shared/schemas` | Importing them at runtime would pull zod into the bundle |
| `server/.env.example` | Tracked on purpose despite `.gitignore` |

## Turning this into the weekly job (later)

- Extend the existing `techdebt` skill / `audit:deadcode` script rather than adding a parallel tool;
  replace `knip.json` with the three configs above.
- Port the five Python scripts to `scripts/dead-code/*.mjs` and add `pnpm run audit:deadcode:full`.
- The weekly run writes `.claude/techdebt-reports/deadcode-<date>.md` and, when Tier A is non-empty,
  appends one `[ ]` per cluster to `.claude/todo.md` so the Planner turns it into a plan. The
  September audit found the same exports that are still here today because nothing consumed it.
