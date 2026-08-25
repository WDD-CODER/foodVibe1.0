# Plan 307 — Purge Committed Scrape Artifacts And Legacy SQL

## Goal

Remove ~164 MB of committed scrape artifacts and legacy SQL from the working tree and close the `.gitignore` gap that let them in.

## Files to check first

- `.gitignore` (lines 68–86, the "Catalog seeder — runtime output" block)
- `tools/catalog-seeder/output/` (76 tracked files under `output/`, 35 under `dumps/`)
- `tools/catalog-seeder/main.py`, `fetch.py`, `config.py` — confirm no code reads from `output/scrape_test/`
- `server/scripts/legacy-import/source-data/README.md` — read before touching the `.sql`
- `server/scripts/legacy-import/lib/sql-parser.js` — confirm it takes a path argument rather than hardcoding `fullDATA_utf8.sql`

## Scope decision (2026-08-23, revised)

Initial pass left `server/scripts/legacy-import/source-data/fullDATA_utf8.sql` tracked, per plan 300's "not casually" gate. Human then asked why not — re-checked plan 300: its final atomic sub-task ("full-database sweep") confirms **0 remaining mismatches** across products/recipes/dishes/suppliers, and no commit has touched `server/scripts/legacy-import/` since the closing fix. That meets the README's own bar for removal ("fully validated, stable, no further legacy-data questions expected"). Human confirmed: untrack it now. Scope restored to the original plan — the `.sql` untrack + `.gitignore` entry are back in.

## Atomic Sub-tasks

- [ ] (done, awaiting validation) Grep for hardcoded references: `grep -rn "scrape_test\|fullDATA_utf8" tools/ server/ scripts/ package.json .github/`. If any hit is a hardcoded path (not a CLI arg), stop and report before deleting. — confirmed all 4 `DEFAULT_SQL_PATH` hits take a `--sql-path=` override; `sql-parser.js` takes a `filePath` param; `config.py`'s `OUTPUT_DIR` is computed, not hardcoded to `scrape_test/`.
- [ ] (done, awaiting validation) In `.gitignore`, replace the per-filename list at lines 72–80 with directory-level rules: `tools/catalog-seeder/output/*` and `tools/catalog-seeder/dumps/`. Kept `!tools/catalog-seeder/output/.gitkeep` and the existing `seed-products.json` intentional-commit exception via negation rules.
- [ ] (done, awaiting validation) Added `server/scripts/legacy-import/source-data/*.sql` to `.gitignore` with a comment citing the plan 300 closure.
- [ ] (done, awaiting validation) Include `tools/catalog-seeder/logging.log` in the gitignore rules (also generated).
- [ ] (done, awaiting validation) `git rm -r --cached tools/catalog-seeder/output tools/catalog-seeder/dumps tools/catalog-seeder/logging.log` (111 files) and `git rm --cached .../fullDATA_utf8.sql`. Files stay on disk locally; they stop being tracked.
- [ ] (done, awaiting validation) `server/scripts/legacy-import/source-data/README.md` — rewritten: no longer tracked, why (plan 300 closure), and how to restore it for a re-import/re-audit.
- [ ] (done, awaiting validation) Ran `ng build` (pass, same pre-existing warnings) and `cd server && node -e "require('./index.js')"` (Mongo connects, no missing-path errors) again with the `.sql` removed.
- [ ] (done, awaiting validation) Reported final before/after `git ls-files | wc -l` (1566 → 1454, drop of 112) — see chat.

## Rules

- Do not run `git filter-repo`, `git filter-branch`, or any history rewrite. History shrink is a separate decision — it force-pushes and breaks every existing clone and worktree.
- Do not delete the Python source files in `tools/catalog-seeder/` (`main.py`, `fetch.py`, `normalize.py`, `filter.py`, `config.py`, `db_write.py`, `diff.py`, `enrich.py`, `review.py`, `patch_*.py`, `requirements.txt`) — only generated output.
- Do not touch anything under `src/` or `server/routes/` in this session.
- Follow the repo's existing `.gitignore` commenting style (a `#` header line per group, as at lines 68 and 71).

## Done when

- `git status` is clean and `git ls-files | wc -l` has dropped by ~112.
- `du -sh` on a fresh git clone of the branch reports well under 20 MB (was ~172 MB).
- `ng build` succeeds with no new warnings.
- Re-adding a file under `tools/catalog-seeder/output/` and running `git status` shows it ignored.
- `server/scripts/legacy-import/source-data/README.md` explains how to restore the `.sql` for a re-import.
