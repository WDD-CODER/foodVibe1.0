# Plan 417 — Limit name length on every saved item

Status: draft
Track: code — here (not design)
Snapshot: d6bc95000a39553fd55fef34aef362f18e0f93dd

## Problem Statement
Plan 414's nightly API checks (first run 2026-10-20, `CODE-API-001`…`007`) found that the server saves an item
whose name is 200,000 characters long (201) on every entity: suppliers, equipment, products, recipes, dishes,
venues, menu events. The Zod schemas in `shared/schemas` have no length limit on the name. One bad paste or a
misused API call stores a name that makes every list showing that item slow or broken, and fills the free-tier
Atlas quota.

Decision (Human, 2026-10-20): it is a real bug — fix it, do not allow-list it.

## Goals & Success Criteria
**Primary:** the server refuses (400, `Validation failed`) any write whose item name is longer than 200 characters,
on every entity; normal names keep saving exactly as today.

- [auto] `npm --prefix server test` passes, including the new `server/test/name-length.test.js`: for each of the 7
  types, POST with a 201-character name → 400 with an issue on the name path; POST with a 200-character name →
  201; PUT that sets a 201-character name on an existing record → 400 and the record is unchanged.
- [auto] `ng build` passes.
- [auto] `node server/scripts/check-name-lengths.js --target=local` exits 0 and prints one
  `<collection>: <n> items, longest <m>, over limit <k>` line per entity and trash collection.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] The Human runs `node server/scripts/check-name-lengths.js --target=atlas` (agents may not read
  production) and every line shows `over limit 0`. A non-zero line → STOP: those items could no longer be edited;
  the Human decides (shorten them, or raise the limit) before merge.
- [human] In the app, edit and save one existing product and one existing recipe: both save normally.
- [human] After the merge, the next nightly `pre-qa.md` `## api` section has no `validation.huge-string` finding.

## Execution Mode
- Parallel: yes — touches only `shared/schemas/**`, one server test, one read-only server script.
- Concurrent plans: none touching `shared/schemas/**`.
- Isolated DB: no — the server tests use their own in-memory DB; the check script only reads.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/base.schema.ts
shared/schemas/entities/equipment.schema.ts
shared/schemas/entities/menu-event.schema.ts
shared/schemas/entities/product.schema.ts
shared/schemas/entities/recipe.schema.ts
shared/schemas/entities/supplier.schema.ts
shared/schemas/entities/venue.schema.ts
server/test/name-length.test.js
server/test/helpers/v2-docs.js
server/scripts/check-name-lengths.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside
the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and why it can't be done in-scope;
offer `approved: <path>`; then append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — the limit is added inside the one schema package and enforced by the existing server-side
  validation (`server/middleware/validate.js` → `server/utils/schema-check.js`); no second validation path.
- INV-none for the rest: one read-only script and one test.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `baseDocShape` in
`shared/schemas/base.schema.ts`, the `nameHebrew` / `name` / `nameEnglish` fields of the 7 entity schemas, and
`SCHEMA_BY_COLLECTION` in `shared/schemas/entities/index.ts`. Print one line per commit: `ok` or
`conflict: <what>`.

## Design

- `shared/schemas/base.schema.ts`: export `NAME_MAX_LENGTH = 200` and `nameField = z.string().max(NAME_MAX_LENGTH)`.
- Use `nameField` for the item's own name only:
  - `equipment.schema.ts`, `product.schema.ts`, `recipe.schema.ts` (also used for dishes), `supplier.schema.ts`,
    `venue.schema.ts`: `nameHebrew`.
  - `product.schema.ts`: `nameEnglish` → `nameField.optional()`.
  - `menu-event.schema.ts`: top-level `name` (not the nested section `name`).
- Snapshot / reference names (`nameSnapshot`, `itemName`, `categoryName`, …) stay unlimited: they copy a name that
  was already checked when it was saved.
- 200 characters: the longest real kitchen item name is far below it, and it is the same in Hebrew and English
  (Zod counts UTF-16 units; Hebrew letters are one unit each).
- `server/scripts/check-name-lengths.js` (read-only, CommonJS like the other `server/scripts/*.js`): loads
  `server/.env` the way `server/db.js` does, `--target=local` uses `MONGO_LOCAL_URI`, `--target=atlas` uses
  `MONGO_URI`; never prints a URI. For each of the 7 entity collections and their `TRASH_*` collections it
  aggregates `$strLenCP` of `nameHebrew` / `nameEnglish` / `name` and prints the line from Done-when. Exit 1 when
  any collection is over the limit, so the Human sees it at a glance.

## Functional Requirements

### Must Have (P0)
- [ ] Name limit of 200 characters on every entity's own name, enforced on POST and PUT through the shared schemas.
- [ ] Server test covering all 7 types (POST over / at the limit, PUT over the limit).
- [ ] Read-only check script for existing data, local and Atlas.

### Won't Have (this plan)
- A `maxlength` on the app's input fields (the server is the gate; the app's normal screens never send 200+
  characters).
- Limits on other text fields (notes, descriptions, steps).

## Atomic Sub-tasks
- [ ] C1: Add one shared 200-character name limit to the schemas so every entity uses the same rule — NAME_MAX_LENGTH + nameField in base.schema.ts; apply to the 7 entity name fields — shared/schemas/base.schema.ts, shared/schemas/entities/*.schema.ts
- [ ] C2: Prove the server refuses a too-long name and still saves a normal one on every entity — POST over/at limit and PUT over limit for all 7 types; extra minimal bodies in v2-docs.js — server/test/name-length.test.js, server/test/helpers/v2-docs.js
- [ ] C3: Add a read-only check that shows whether any saved item already has a name over the limit — local and Atlas targets, one line per collection, exit 1 when over — server/scripts/check-name-lengths.js
- [ ] C4: Build, test, check local data and hand you the Atlas check and the save check — npm --prefix server test, ng build, check script on local, log-query; Human runs the Atlas check and saves one product and one recipe — this plan file

## Technical Considerations
- Dependencies: `zod`, `npm run build:schemas` (the server loads `server/generated/schemas`; the server's
  `pretest` already builds it).
- Backend / API: no route changes; a too-long name now returns the existing 400 `Validation failed` with Zod issues.
- Auth and validation: validation tightened on the 7 entity types only.
- Security surface: the check script reads `server/.env` through dotenv and never prints secrets; read-only.
- Data / migration: none. An existing item over the limit could no longer be edited — the Atlas check (Done-when)
  must show 0 before merge.
- Project checks: log-query Done-when item added (touches server code).

## Out of Scope
- Shortening any existing data.
- Client-side length checks or new error messages in the UI.
- Changing the QA api cases (`scripts/qa/code-qa/**`): the `huge-string` case stays as it is and will pass.

## Execution Notes
