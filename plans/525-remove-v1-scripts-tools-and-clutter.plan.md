# Plan 525 — Remove the v1-era scripts and tools, unused dev dependencies and tracked clutter

Status: active
Depends-on: none
Snapshot: f99816b3d37f6e0c555c79e7471f8761cbca0068

## Problem Statement
The dead-code audit of 2026-11-06 found about 8,000 lines of scripts and tools written against the v1 data
model (collections `PRODUCT_LIST`, `RECIPE_LIST`, `DISH_LIST`, `KITCHEN_*`, per-user `userId` tenancy). Migration
`0001` moved every entity to the v2 collections, `0004` dropped the registries, and the Human decided on
2026-11-06 that FoodVibe will never return to v1. These scripts cannot work any more, three of them are still
wired to `package.json` (`repair:*`), and some are blocked on purpose by `server/utils/v1-only-guard.js`. The
audit also found four root dev dependencies that nothing uses, an orphan test that never runs, and 15 tracked
files the `.gitignore` says must not be tracked. Agents and humans keep reading this dead material when they
search the repo.

## Goals & Success Criteria
**Primary:** every v1-bound script, tool and guard is gone, nothing that remains references them, and every
check that passed on the snapshot still passes.

- [auto] `git ls-files scripts/backup-before-repair.mjs scripts/diagnose-broken-refs.mjs scripts/repair-recipe-references.mjs scripts/fix-duplicate-names.mjs scripts/merge-labels.mjs scripts/audit-labels.mjs scripts/migrate-labels-to-courses.mjs scripts/migrate-to-master.mjs scripts/link-users-to-master.mjs scripts/trim-demo-data.mjs scripts/remove-trailing-semicolons.mjs server/scripts/legacy-import server/scripts/migrate-supplier-ids.js server/scripts/fix-supplier-refs.js server/utils/v1-only-guard.js tools/catalog-seeder scripts/lib/remote-proxy.test.mjs reports/dead-code-audit.md reports/dead-code-audit-prompt.md` → no output
- [auto] `git grep -nE "legacy-import|catalog-seeder|v1-only-guard|repair:(backup|diagnose|refs)|backup-before-repair|diagnose-broken-refs|repair-recipe-references|fix-duplicate-names|merge-labels|audit-labels|migrate-labels-to-courses|migrate-to-master|link-users-to-master|trim-demo-data|remove-trailing-semicolons|migrate-supplier-ids|fix-supplier-refs" -- . ':!plans' ':!docs/archive' ':!docs/brain' ':!docs/handoff-*' ':!CHANGELOG.md' ':!.claude/todo-archive*' ':!.claude/reports' ':!.claude/techdebt-reports' ':!.qa-reports' ':!notes' ':!sessions' ':!reports/dead-code-audit-2026-11-06.md' ':!reports/dead-code-audit-method.md' ':!tools/dead-code-audit' ':!shared/schemas'` → no output (the excluded paths are history: plans, ADRs, old reports and session notes)
- [auto] `git ls-files -ci --exclude-standard` → exactly two lines: `.claude/sessions/README.md` and `server/.env.example`
- [auto] `node scripts/kit-manifest-check.mjs` → `KIT_MANIFEST: ok` with `0 unclassified`
- [auto] `node --test scripts/test/remote-proxy.test.mjs` → `# pass 6`, `# fail 0`
- [auto] `pnpm run test:scripts` → `# fail 0`
- [auto] `pnpm run lint` → exit 0
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → `TOTAL: ... SUCCESS` (0 failed)
- [auto] `pnpm --dir server test` → all test files pass
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [auto] `git ls-files reports/dead-code-audit-2026-11-06.md reports/dead-code-audit-method.md tools/dead-code-audit/scripts tools/dead-code-audit/configs` → lists the report, the method doc, 5 `.py` files and 3 `.json` configs

## Execution Mode
- Parallel: yes
- Concurrent plans: not alongside plan 517 (both edit `package.json`); safe alongside 471, 510, 518–523
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/backup-before-repair.mjs
scripts/diagnose-broken-refs.mjs
scripts/repair-recipe-references.mjs
scripts/fix-duplicate-names.mjs
scripts/merge-labels.mjs
scripts/audit-labels.mjs
scripts/migrate-labels-to-courses.mjs
scripts/migrate-to-master.mjs
scripts/link-users-to-master.mjs
scripts/trim-demo-data.mjs
scripts/remove-trailing-semicolons.mjs
scripts/promote-guest-to-master.js
scripts/push-master-to-atlas.js
scripts/lib/remote-proxy.test.mjs
scripts/test/remote-proxy.test.mjs
server/scripts/legacy-import/**
server/scripts/migrate-supplier-ids.js
server/scripts/fix-supplier-refs.js
server/scripts/bump-master-version.js
server/utils/v1-only-guard.js
server/utils/id.js
server/services/master-version.js
server/routes/auth.js
tools/**
package.json
pnpm-lock.yaml
.gitignore
docs/agent/workflow-map.md
docs/workflow-kit/manifest.json
docs/workflow-kit/manifest.md
reports/**
.superpowers/**
.playwright-mcp/**
entities.json
.claude/sessions/2026-04-14-audit-session.md
.claude/sessions/2026-04-16-audit-session.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-2: preserves — only comments change in `server/services/master-version.js`; master sync, business scoping and every query are untouched, and no file under `server/migrations/**` is edited.

## Reuse Check

- none — the plan only deletes scripts, dependencies and tracked clutter, and adds docs plus a reference toolkit under `tools/dead-code-audit/` (Python reference scripts, not app code).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the project to carry only tools that work against today's data so that no one runs a repair script that writes to a collection that no longer exists.
- As the developer, I want repo search to return only live code so that agents stop reading and copying v1 patterns.

## Functional Requirements

### Must Have (P0)
- [ ] Every v1-bound script and tool listed in A1–A3 is deleted, with its `package.json` entry and its kit-manifest entry.
- [ ] `server/utils/v1-only-guard.js` is deleted once nothing requires it.
- [ ] Comments and docs that point at deleted files are updated (A4).
- [ ] The orphan test runs as part of `test:scripts` (A5).
- [ ] Four unused dev dependencies are removed (A6).
- [ ] 15 tracked-but-ignored files are untracked (A7).
- [ ] The audit report, method and toolkit are saved; the April audit files are deleted (A8).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No UI change. No `dictionary.json` change.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Delete the root v1 data scripts and their npm entries — `git rm` these 11 files: `scripts/backup-before-repair.mjs`, `scripts/diagnose-broken-refs.mjs`, `scripts/repair-recipe-references.mjs`, `scripts/fix-duplicate-names.mjs`, `scripts/merge-labels.mjs`, `scripts/audit-labels.mjs`, `scripts/migrate-labels-to-courses.mjs`, `scripts/migrate-to-master.mjs`, `scripts/link-users-to-master.mjs`, `scripts/trim-demo-data.mjs`, `scripts/remove-trailing-semicolons.mjs`. If the Critical Question below is answered "delete", also `git rm scripts/promote-guest-to-master.js scripts/push-master-to-atlas.js`. In `package.json` remove the three scripts `repair:backup`, `repair:diagnose`, `repair:refs`. In `docs/workflow-kit/manifest.json` remove the object whose `"path"` is each deleted file, and remove each deleted file from the `"refs"` arrays of the `.gitignore` entry (lists `scripts/audit-labels.mjs`) and the `package.json` entry (lists the three `repair:*` targets). In `docs/workflow-kit/manifest.md` remove each matching table row and the bullet "`scripts/remove-trailing-semicolons.mjs` — Candidate to drop." (line ~99). Check: `node scripts/kit-manifest-check.mjs` → `KIT_MANIFEST: ok` (a deleted file still in the manifest prints `not-in-inventory-or-missing-on-disk: <path>`).
- [ ] A2: Delete the server v1 scripts and the guard — `git rm -r server/scripts/legacy-import` (17 tracked files, including `lib/` and `source-data/README.md`), `git rm server/scripts/migrate-supplier-ids.js server/scripts/fix-supplier-refs.js`. Then `git grep -n "v1-only-guard" -- server scripts` must print nothing, and `git rm server/utils/v1-only-guard.js`.
- [ ] A3: Delete the Python catalog seeder — `git rm -r tools/catalog-seeder` (it writes `COLLECTION = "PRODUCT_LIST"` in `config.py`). In `.gitignore` remove the block `# Catalog seeder — runtime output (never commit)` through `tools/catalog-seeder/*.pyc` (the 8 `tools/catalog-seeder/...` lines and their comments), the block `# Legacy FoodComposer SQL source …` through `server/scripts/legacy-import/source-data/*.sql`, and the 3-line comment above `.claude/reports/label-audit/data.json` that names `scripts/audit-labels.mjs` (keep the 3 ignore lines for `.claude/reports/label-audit/*`; reword the comment to "Label audit — raw production DB dumps; never commit."). Keep `tools/**/.claude/`.
- [ ] A4: Update the comments and docs that name deleted files — `server/routes/auth.js` (comment near line 340), `server/scripts/bump-master-version.js` (header, line 5), `server/services/master-version.js` (header, line 7), `server/utils/id.js` (header, line 9): replace the `legacy-import` mention with "a manually-run fix script" (comments only; no code change). In `docs/agent/workflow-map.md` line 201 ("Data-repair scripts (not workflow): …") drop every deleted file name and keep the rest of the list.
- [ ] A5: Make the orphan test run — `git mv scripts/lib/remote-proxy.test.mjs scripts/test/remote-proxy.test.mjs`; change its import to `'../lib/remote-proxy.mjs'` and its first-line comment to `node --test scripts/test/remote-proxy.test.mjs`. In `docs/workflow-kit/manifest.json` change that entry's `"path"` to `scripts/test/remote-proxy.test.mjs` (and the row in `manifest.md`). Check: `pnpm run test:scripts` now lists the 6 remote-proxy tests.
- [ ] A6: Remove unused dev dependencies — `pnpm remove -D @typescript-eslint/eslint-plugin @typescript-eslint/parser autoprefixer postcss` (updates `package.json` and `pnpm-lock.yaml`). Why: `eslint.config.mjs` imports only `typescript-eslint`, which brings the plugin and parser itself; there is no `postcss.config*`, and `@angular-devkit/build-angular` 19.2 depends on its own `postcss` 8.5.2 and `autoprefixer` 10.4.20. Do NOT remove `@angular/platform-browser-dynamic`, `zod`, `prettier` or `html2canvas` (see Out of Scope). Check: `pnpm run lint`, `pnpm run build`, `pnpm run test:ci` all pass.
- [ ] A7: Untrack files the `.gitignore` already excludes — `git rm -r --cached .superpowers .playwright-mcp entities.json .claude/sessions/2026-04-14-audit-session.md .claude/sessions/2026-04-16-audit-session.md` (15 files; they stay on disk; keep `.claude/sessions/README.md` and `server/.env.example` tracked). Check: `git ls-files -ci --exclude-standard` → only those two lines.
- [ ] A8: Save the audit and retire the April one — copy from the main folder's ignored `tmp\dead-code-audit\` (absolute: `C:\coding projects\Cursor\foodVibe1.0\tmp\dead-code-audit\`): `dead-code-audit-2026-11-06.md` → `reports/dead-code-audit-2026-11-06.md`; `dead-code-method.md` → `reports/dead-code-audit-method.md`; `toolkit\scripts\*.py` → `tools/dead-code-audit/scripts/`; `toolkit\configs\*.json` → `tools/dead-code-audit/configs/`; `toolkit\baseline-2026-11-06\*.tsv` → `tools/dead-code-audit/baseline-2026-11-06/`. Add `tools/dead-code-audit/README.md` (5 lines: what the folder is, "reference implementation, run on Linux/WSL", link to `reports/dead-code-audit-method.md`, "port to `scripts/dead-code/*.mjs` when the weekly job is built"). `git rm reports/dead-code-audit.md reports/dead-code-audit-prompt.md` (the April 2026 audit and its prompt; superseded). If `tmp\dead-code-audit\` is missing: STOP and ask the Human.

## Technical Considerations
- Dependencies: none of the deleted files is imported by app code, server runtime code or tests (verified on the snapshot with `git grep` over `src`, `server/routes`, `server/services`, `server/middleware`, `server/test`, `scripts/test`, `e2e`, `.github`, `.husky`, `.claude/settings.json`).
- New files needed: `scripts/test/remote-proxy.test.mjs` (moved), `reports/dead-code-audit-2026-11-06.md`, `reports/dead-code-audit-method.md`, `tools/dead-code-audit/**`.
- Model changes: none.
- Backend / API: none — only comments change in server runtime files.
- Auth and validation: none.
- Security surface: smaller — removes scripts that connect to production with `MONGO_URI` and write.
- Data / migration: none. Dropping the v1 collections themselves is a separate plan ("Drop the v1 collections from the database").
- Project checks: log-query Done-when included; Reuse Check filled; no hotspot touched.
- Kit: `.gitignore` is a kit `seed` file (project-owned after install), so editing it is allowed. `docs/workflow-kit/manifest.json` must stay in sync with every deleted or moved script or CI's `rules` job fails.

## Out of Scope
- Dropping the v1 collections in MongoDB (separate plan).
- Client dead code (separate plan "Remove dead client code found by the 2026-11-06 audit").
- `@angular/platform-browser-dynamic` and `zod` (false positives, see the report's KEEP table), `prettier`, `html2canvas`.
- `scripts/kit-extract.mjs`, `scripts/kit-lessons-extract.mjs` (open question in the report).
- `shared/schemas/entities/product.schema.ts` legacy-import provenance fields (`@deprecated`, owned by plan 510's scope) and the v1→v2 upgrade code in `shared/schemas/upgrade/**` and `field-map.v1-to-v2.ts` (still required by migrations `0001`–`0003` and `server/utils/schema-check.js`).
- `server/migrations/**` and `server/migrations/tools/**` (history and runbook tools).
- Any `dictionary.json` key.

## Critical Questions
- Q: `scripts/promote-guest-to-master.js` and `scripts/push-master-to-atlas.js` (April, select master by `userId: '__master__'`, while INV-2 now selects by `businessId`) — delete them in A1 or keep? A: open

## Execution Notes
