# FoodVibe plan checks

FoodVibe's own planning checklist (`paths.planChecks` in `kit.config.json`). `/plan`'s Architect + PM review
adds these checks to every plan the Planner saves; the PRD template's "Project checks" line points here. They
were the FoodVibe-only lines of `.claude/references/prd-template.md` and `hld-template.md`, which the kit now
manages.

## Success criteria
- Every plan that touches app or server code has this `[auto]` Done-when item:
  `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Checks the orchestrator can run
- `pnpm run test:ci` (client) and `pnpm run test:server` (server, builds the schemas first).
- `node scripts/log-query.mjs --since=plan-start --level=error` works without a marker (it prints
  `plan-start: no marker, using <ISO> (<source>)`) and without a database (`SKIP: no database configured`, exit 0).
- A `[ui]` card is a spec under `e2e/ui/<NNN>-<n>.spec.ts` that signs in with `signInQa`
  (`e2e/helpers/qa-session.ts`), run by the builder with `pnpm exec playwright test <spec>` (not a gate check).

## Reuse Check
- Every plan has a `## Reuse Check` section: one line per new component, util, pipe, service or `.c-*` class —
  `- <piece> — family: <id|none> — rung: <1-4> — why: <…>` — or `- none — <why>`. Families and the decision ladder:
  `docs/brain/component-families.md`, `docs/agent/standards-reuse.md`. Gate:
  `node scripts/scope-check.mjs --reuse --plan=<path>` exits 0. A plan that renames or removes a registered piece
  updates the registry (`node scripts/reuse-lint.mjs --check-registry` exits 0).

## Page recipe
- Every plan that adds a page or a route, or changes the frame of one (header, list, sections, scroll area), has under
  `## UI/UX Notes` one line per page: `Page recipe: <recipe id> — <page>`, where the id is a `### recipe-…` heading of
  `docs/agent/house-style.md`. The plan's steps build the page from that recipe's `built from` pieces and its `states`.
- `Page recipe: none — <why>` is allowed only for a page with no screen of its own (a print sheet, a redirect).
- A page no recipe fits is `Page recipe: new — <why>`: the review raises an `open:` line, the Human decides, and a yes
  adds the recipe to `docs/agent/house-style.md` in the same plan.
- A plan that builds a drag, an inner scroll area or an animation names the behaviour rule it follows
  (`Behaviour: <id>`, an id from the behaviour rules of `docs/agent/house-style.md`).
- Gate today: the Planner's review reads this section. A script gate is a kit need (`docs/agent/house-style.md`, "Kit needs").

## User stories
- Write stories from the chef's side: "As a chef, I want [goal] so that [benefit]".

## Hotspots
- `src/styles.scss`, `public/assets/data/dictionary.json` and `src/app/app.routes.ts` are append-only: add to
  them, never rewrite or remove an existing entry without escalating.

## Hebrew UI and translation
- Layout: Hebrew RTL; logical CSS properties only (`docs/agent/conventions.md`).
- Name every new translation key the feature needs in `public/assets/data/dictionary.json`; UI strings go
  through `translatePipe`.
- Hebrew canonical values: if the feature accepts user-entered units, categories, allergens, or section /
  preparation categories, flag the Hebrew canonical values guidance in `docs/agent/standards-domain.md`; the
  canonical resolution flow and the translation-key modal UX are required.
- Lucide icons used in templates are registered in `src/app/app.config.ts` (`docs/agent/conventions.md`).
- Folder maps: a plan that adds or moves a file under a folder with a `breadcrumbs.md` (`src/app/core/`,
  `core/services`, `core/models`, `core/components`, `src/app/shared/`, `src/app/pages/`, `server/`) lists that
  `breadcrumbs.md` in its Read-Write Scope, so the breadcrumbs check never stops a run for an `approved:` (Dandan,
  2026-11-20: plans 646 and 651 each waited on this ask).

## Data and API
- New persisted data uses the generic entity contract (`/api/v1/data/:type`, `docs/agent/standards-backend.md`
  §3 "New Collection Checklist"); a dedicated endpoint is named and justified.
- Entity shapes are Zod schemas in `shared/schemas/`.
- A plan that adds a new collection lists `server/routes/generic.js` in its Read-Write Scope from the start. A
  non-cloneable type joins `NO_LINEAGE` there, and the run's advisor never approves that file because it is
  sensitive, so leaving it out stops the run on a question (Dandan, 2026-11-27: plan 764 waited 87 min on ask 764-1).

## HLD
- Data Flow: describe the Signal flow — source → `computed()` → template binding.
- File Changes: name the real `.ts` / `.html` / `.scss` files.
- Translation / i18n: list the new `dictionary.json` entries.
