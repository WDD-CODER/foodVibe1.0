# Plan 450 — Add the reuse layer: a component registry, a decision ladder and checks that catch a new copy

Status: draft
Track: code
Depends-on: mvp-merge
Snapshot: 34c560fc8db9272f41a85c57c5eb8d3407b3caed

## Problem Statement
The 2026-10-20 reuse audit (`docs/mvp/reuse-audit-2026-10-20.md`) found the same job built many times: 7 page-local
copies of the search-combobox shell, 13 hand-written modal controllers, `onClearSearch` / `setSort` copied 4–7×,
~80 local chip classes. Nothing tells an agent which shared piece exists, and no plan or script asks "does this
already exist?". Plans 451–458 converge the families; without this plan they re-grow.

This plan adds the layer that stops the drift. It changes no behaviour:
1. A registry of families (`docs/brain/component-families.md`): which shared piece to use, where it lives, and its known page-local copies.
2. The decision ladder (use as is → existing inputs → extend the family → new family only with a justification) in the standards.
3. A `## Reuse Check` section every plan fills, enforced by `node scripts/scope-check.mjs --reuse --plan=<p>`.
4. `scripts/reuse-lint.mjs`: warns when a diff adds a new copy of a registered family or a long relative import.
5. A `@pipes/*` path alias (`@utils/*` already exists in `tsconfig.json`), so new code stops using `../../core/...`.

## Goals & Success Criteria
- Primary: a new plan or diff that re-implements a registered family is flagged before merge; every registered family is findable in one file.
- Success:
  - [ ] [auto] `docs/brain/component-families.md` lists every family from the audit's family map (UI and logic), each with: base path, selector or symbol, when to use it, its known copies; `node scripts/reuse-lint.mjs --check-registry` exits 0 (every listed path exists on disk).
  - [ ] [auto] `node scripts/scope-check.mjs --reuse --plan=<a fixture plan without the section>` exits 1 naming the missing `## Reuse Check`; with a filled section exits 0; a plan numbered below `Enforced from plan:` prints `REUSE: skipped (grandfathered)`.
  - [ ] [auto] `node scripts/reuse-lint.mjs --diff=main` on a fixture diff that adds `<app-scrollable-dropdown>` inside a page folder, or a `.c-*` class in a component `.scss`, prints `REUSE: warn …` and exits 0; on a clean diff prints `REUSE: ok`.
  - [ ] [auto] `npm run test:scripts` passes, including the new `scripts/test/reuse-lint.test.mjs` and `scripts/test/reuse-check.test.mjs`.
  - [ ] [auto] `npx ng build` and `npm test` (`ng test`) pass; `import { TranslatePipe } from '@pipes/translation-pipe.pipe'` compiles in `src/app/shared/export-preview/export-preview.component.ts`.
  - [ ] [auto] `git diff --stat main -- src/` shows only `tsconfig.json`, `export-preview.component.ts`, `change-popover.component.ts` (import lines only; frozen files untouched, net lines <= 0 in each).
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Open the recipe book list and the export preview of any recipe in the app: both pages look and behave exactly as before (the only app change is two import lines).
  - [ ] [human] Read `docs/brain/component-families.md` and confirm each family names the right shared piece (you know the app; the Worker cannot judge this).

## Execution Mode
- Parallel: no — runs first; 451–457 read the registry and add to it, so they start only after 450 is merged.
- Concurrent plans: none (451–458 are blocked on this plan).
- Isolated DB: no

## Execution Notes
- Depends on: the MVP merge to main (branch `mvp`). Also depends on no earlier refactor plan; it is the first of 450–458.
- Refactor rule: no behaviour change. Frozen files (`product-form`, `menu-intelligence.page`, `menu-export.service`, `recipe-builder.page`, `cook-view.page`) are not touched at all; hotspots are not touched.
- Kit-owned files (`docs/workflow-kit/kit-owned.json`): `scripts/scope-check.mjs` and `.claude/references/prd-template.md` are kit-owned. This plan keeps the logic in FoodVibe-owned files (`scripts/lib/reuse-check.mjs`, `docs/agent/standards-reuse.md`, `docs/agent/plan-checks.md`) and makes the smallest possible edit to the two kit-owned files: one `import` plus one dispatch line in `scope-check.mjs`, and one `## Reuse Check` block in `prd-template.md`. Both get an `overrides` entry in `kit.config.json` + a line in `docs/workflow-kit/drift-classification.md`, and the same change is queued as a kit PR (see Critical Questions). Do not run `kit-sync` as part of this plan.
- ADR: one ADR, `docs/brain/decisions/0024-reuse-layer.md` (the next free number at save time, 0024 or later; 0023 is the MVP tenancy ADR), recording the ladder, the registry as source of truth, and that `--reuse` is a block for plans and a warn for diffs.
- Checkpoints: S3 (registry reviewed by the Human, since content accuracy cannot be auto-checked) and S8 (final build + tests).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/brain/component-families.md
docs/brain/decisions/0024-reuse-layer.md
docs/brain/index.md
docs/agent/standards-reuse.md
docs/agent/plan-checks.md
docs/workflow-kit/drift-classification.md
kit.config.json
AGENTS.md
.claude/references/prd-template.md
.claude/skills/save-plan/SKILL.md
scripts/scope-check.mjs
scripts/reuse-lint.mjs
scripts/lib/reuse-check.mjs
scripts/lib/registry-families.mjs
scripts/test/reuse-lint.test.mjs
scripts/test/reuse-check.test.mjs
scripts/test/fixtures/reuse/**
package.json
tsconfig.json
src/app/shared/export-preview/export-preview.component.ts
src/app/shared/change-popover/change-popover.component.ts
docs/mvp/runs/450.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no write route, permission or ownership code is touched.
- INV-2: preserves — no tenancy or taxonomy code is touched.
- INV-3: preserves — no client cascade is added; this plan only adds docs and scripts.
- INV-4: preserves — no schema change.

## Backend Impact
- Collections affected: none
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Mandatory: this plan runs after the MVP merge, which changed many files. Before S1, on current `main` print `ok` or
`conflict: <what>` for each of: `tsconfig.json` `paths` has `@utils/*` and no `@pipes/*`; `src/app/core/pipes/translation-pipe.pipe.ts` exists; the two relative `core/pipes` imports still exist in `export-preview.component.ts` and `change-popover.component.ts` (and `change-popover` is not deleted — the audit calls it dead; if deleted, drop it from S7); every base path the registry will list (`shared/custom-select`, `shared/custom-multi-select`, `shared/chip-search-dropdown`, `shared/list-shell`, `shared/page-header`, `shared/selection-bar`, `shared/row-actions-menu`, `shared/empty-state`, `shared/add-option-row`, `shared/scrollable-dropdown`, `shared/loader`, `core/services/base-entity-data.service.ts`, `core/validators/item.validators.ts`, `core/resolvers/*-ensure-loaded.resolver.ts`, `core/services/http-storage.adapter.ts` or its renamed successor); `cmdArchPlan` / `parseArgs` / `readRegistry` in `scripts/scope-check.mjs` and `Enforced from plan:` handling in `scripts/lib/invariants.mjs`; the next free ADR number in `docs/brain/decisions/`; and that MVP-added families (e.g. a tenancy or business-switcher component, new `shared/` folders) are added to the registry list. Also run the audit's page-local-copy greps (`grep -rln "app-scrollable-dropdown" src/app/pages`, `grep -rln "onClearSearch\|onSearchEscape" src/app`) and record the current counts in the registry — the audit numbers are from `8ffda3d2`.

## User Stories
- As a chef, I want new screens to feel the same as the old ones so that I never relearn a dropdown, a popup or a list.
- As the developer, I want an agent to be told "this already exists" before it builds a ninth copy so that the cleanup plans (451–458) stay clean.

## Functional Requirements

### Must Have (P0)
- [ ] Registry file with one row per family: name · use this (path · selector) · variants/inputs · known page-local copies (to be removed by plan 45x) · status (`stable` / `converging`).
- [ ] Decision ladder with the sibling rule ("more than ~3 variant flags → a sibling component, not another `@if`") in `docs/agent/standards-reuse.md`, linked from the `AGENTS.md` Standards index and Skill triggers ("Before creating any new component, util, pipe, service or `.c-*` class").
- [ ] `## Reuse Check` section: per new piece, the registry family searched, ladder rung chosen (1–4), and for rung 4 a one-line justification. Added to `.claude/references/prd-template.md`, `docs/agent/plan-checks.md` and the save-plan checklist.
- [ ] `scope-check --reuse --plan=<p>`: exit 1 when the section is missing, empty, or a rung-4 row has no justification; grandfathered below a `Reuse enforced from plan:` number set to the first plan saved after 450.
- [ ] `reuse-lint.mjs --diff=<base>` warns (never blocks, exit 0) on added lines that: use `<app-scrollable-dropdown>` or `<app-add-option-row>` in `src/app/pages/**` (family: search combobox); define a `.c-*` class outside `src/styles.scss`; import `core/utils|pipes|services` through `../`; add `onClearSearch|onSearchEscape|clearAllFilters` to a page. Rules live as data in `scripts/lib/registry-families.mjs` so 451–458 add one entry each.
- [ ] `@pipes/*` alias in `tsconfig.json`; the two relative imports converted.

## UI/UX Notes
- None (no screen changes). No new dictionary keys.

## Atomic Sub-tasks
- [ ] S1: Reality check — print ok/conflict per symbol listed in Step 0 and record current copy counts — `docs/mvp/runs/450.md`
- [ ] S2: Write the registry from the audit family map plus MVP-added families, with the current copy counts and which plan (451–457) removes each copy — `docs/brain/component-families.md`, `docs/brain/index.md`
- [ ] S3: CHECKPOINT — Human reads the registry and says `approved registry` or lists corrections — `docs/brain/component-families.md`
- [ ] S4: Write the decision ladder and sibling rule, add the Standards-index row and the Skill-trigger row, and the ADR — `docs/agent/standards-reuse.md`, `AGENTS.md`, `docs/brain/decisions/0024-reuse-layer.md`
- [ ] S5: Add the `## Reuse Check` section to the plan template, plan checks and save-plan checklist; add the `overrides` entries — `.claude/references/prd-template.md`, `docs/agent/plan-checks.md`, `.claude/skills/save-plan/SKILL.md`, `kit.config.json`, `docs/workflow-kit/drift-classification.md`
- [ ] S6: Build `--reuse` (parser in `scripts/lib/reuse-check.mjs`, one import + one dispatch line in `scope-check.mjs`) with fixture plans and tests — `scripts/scope-check.mjs`, `scripts/lib/reuse-check.mjs`, `scripts/test/reuse-check.test.mjs`, `scripts/test/fixtures/reuse/**`
- [ ] S7: Build `reuse-lint.mjs` with the rules table, `--diff`, `--check-registry` and `npm run lint:reuse`; tests on fixture diffs — `scripts/reuse-lint.mjs`, `scripts/lib/registry-families.mjs`, `scripts/test/reuse-lint.test.mjs`, `scripts/test/fixtures/reuse/**`, `package.json`
- [ ] S8: Add `@pipes/*` to `tsconfig.json`, convert the two relative pipe imports, run `ng build`, `ng test`, `npm run test:scripts`, log-query; write the run file with the validation cards — `tsconfig.json`, `src/app/shared/export-preview/export-preview.component.ts`, `src/app/shared/change-popover/change-popover.component.ts`, `docs/mvp/runs/450.md`

## Technical Considerations
- Dependencies: `picomatch`, `scripts/lib/plan-scope.mjs`, `scripts/lib/invariants.mjs` (copy its "Enforced from plan" pattern); no new npm packages.
- `@utils/*` already maps to `src/app/core/utils/*` (8 files use it; 13 use `../` imports, listed by the lint, not converted here). Bulk conversion of the 66 files importing `src/app/core/pipes/...` is out of scope: churn with no user value, and it would touch frozen files.
- Registry is the single source: `reuse-lint --check-registry` fails when a listed path disappears, so renames in 451–457 must update it (each of those plans adds an S-task for that).
- Reuse-lint is warn-only so it cannot block the refactors that legitimately remove copies; plan 458 decides whether to make rules blocking.
- Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: log-query [auto]; chef-side stories; no new dictionary keys; frozen files untouched; hotspots untouched.

## Out of Scope
- Converting any family (451–457) or the rule sweep (458).
- Bulk rewriting existing imports to aliases; an `@shared/*` alias.
- Blocking lint in CI; upstreaming to the kit repo (queued as a separate kit PR and plan in `ai-workflow-kit/plans/`).

## Critical Questions
1. Kit-owned edits: `scope-check.mjs` and `prd-template.md` are kit-owned. (a) Recommended: edit them here with `overrides` entries and queue a kit PR so the next kit release absorbs them. (b) Keep this plan to FoodVibe-owned files only: `--reuse` lives in a separate `scripts/reuse-check.mjs`, the section goes only in `plan-checks.md`, and the command name differs from the brief. Which?
2. Grandfather cutoff: the first plan number the `## Reuse Check` becomes mandatory from. Recommended: 459, so plans 451–457 (already drafted) are not blocked.
