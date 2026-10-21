# FoodVibe plan checks

FoodVibe's own planning checklist (`paths.planChecks` in `kit.config.json`). `/plan`'s Architect + PM review
adds these checks to every plan the Planner saves; the PRD template's "Project checks" line points here. They
were the FoodVibe-only lines of `.claude/references/prd-template.md` and `hld-template.md`, which the kit now
manages.

## Success criteria
- Every plan that touches app or server code has this `[auto]` Done-when item:
  `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Reuse Check
- Every plan has a `## Reuse Check` section: one line per new component, util, pipe, service or `.c-*` class —
  `- <piece> — family: <id|none> — rung: <1-4> — why: <…>` — or `- none — <why>`. Families and the decision ladder:
  `docs/brain/component-families.md`, `docs/agent/standards-reuse.md`. Gate:
  `node scripts/scope-check.mjs --reuse --plan=<path>` exits 0. A plan that renames or removes a registered piece
  updates the registry (`node scripts/reuse-lint.mjs --check-registry` exits 0).

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

## Data and API
- New persisted data uses the generic entity contract (`/api/v1/data/:type`, `docs/agent/standards-backend.md`
  §3 "New Collection Checklist"); a dedicated endpoint is named and justified.
- Entity shapes are Zod schemas in `shared/schemas/`.

## HLD
- Data Flow: describe the Signal flow — source → `computed()` → template binding.
- File Changes: name the real `.ts` / `.html` / `.scss` files.
- Translation / i18n: list the new `dictionary.json` entries.
