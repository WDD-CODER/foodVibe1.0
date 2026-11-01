# Active Tasks

> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-2026-07-21.md`](reports/todo-ledger-relevance-audit-2026-07-21.md).
> Checkboxes are **unchanged** — decide per group: execute / mark done / prune / keep.
> **2026-09-16 (overnight):** `/auto-solve` running unattended in worktree `../foodVibe1.0-wt-auto-solve` on branch `feat/auto-solve-overnight`, self-approving each plan (no Human present). See that branch's `OVERNIGHT-REPORT.md` for what landed — nothing pushed/merged without Human review.

---

## Tech Debt (from `/nightly-maintenance` 2026-09-27)

> Full plan: `plans/300-400/318-nightly-maintenance-followups-2026-09-27.plan.md`. Full audit: `.claude/techdebt-reports/techdebt-2026-09-27.md`.

- [ ] `auth.interceptor.ts` — `BehaviorSubject` used for refresh-token gate; hard rule says signals only
- [ ] `nutrition-badge.component.ts:46` — legacy `@Input()` decorator, unresolved since `techdebt-2026-04-20.md`
- [ ] 2 stray trailing semicolons (`quick-add-product-modal.component.ts:121`, `menu-library-list.component.ts:197`)
- [ ] 24-file refactor-candidate backlog (>300 lines each) — triage, top 3 are 1200+ lines
  - [x] `cook-view.page.ts` — triaged + split 2026-09-28: timer/stopwatch + export/preview extracted to component-scoped services (`src/app/pages/cook-view/services/`), 1201 → 979 lines; `ng build` clean; branch `chore/cook-view-service-split`; Human-validated. Full detail: `plans/300-400/318-nightly-maintenance-followups-2026-09-27.plan.md`.
  - [ ] `menu-intelligence.page.ts` (1413) / `recipe-builder.page.ts` (1394) / remaining ~21-file backlog — not yet triaged
- [ ] 2 unnecessary `?? []` NG8102 warnings (`venue-detail`/`venue-list` templates)

---

## 1. EXECUTE — real unfinished work

> Audit says: do these.

## 6. KEEP DEFERRED — intentional park

> Do not execute against current policy / product decisions.

### Angular 22 Migration (deferred)
- Remaining `npm audit --omit=dev --audit-level=high` findings are all `@angular/*` (XSS in template/attribute namespace + two-way binding sanitization, DoS via OOM in formatDate/digitsInfo, HttpTransferCache cache-key/info-leak) — blocked on the Angular 22 major upgrade.
- Do **not** run `npm audit fix --force`.
- Server `npm audit --omit=dev` is clean (0 vulnerabilities).
- CI (`.github/workflows/security.yml`) runs `npm audit --omit=dev --audit-level=critical`. `--omit=dev` is permanent (devDependency build-tooling churn — Angular CLI, vite, webpack-dev-server — is noise for a never-shipped tree, not app risk); restore `--audit-level=high` on top of `--omit=dev` after the migration clears the `@angular/*` findings above. See `docs/brain/decisions/0005-scope-npm-audit-to-production-deps.md`.

---

### Plan 248 — Transloco Migration (`plans/248-transloco-migration.plan.md`)
> Never started. AGENTS.md still mandates `translatePipe` + `dictionary.json` — park until policy change.

- [ ] Install `@jsverse/transloco` and configure `provideTransloco` in `src/app/app.config.ts` (standalone — do NOT run `ng add`)
- [ ] Split `public/assets/data/dictionary.json` into 8 scoped files under `public/assets/i18n/he/`
- [ ] Verify Transloco loader path — check network tab for `/assets/i18n/he/units.json` returning 200
- [ ] Replace `| translatePipe` in all templates with `| transloco` (scope-prefixed); add `TranslocoModule`/`TranslocoDirective` to each component's `imports`
- [ ] Replace `this.translation.translate(...)` calls in `.ts` files with `this.transloco.translate('scope.key')`
- [ ] Create `src/app/core/services/vocabulary.service.ts` (~40 lines: `resolve()`, `addEntry()`, localStorage)
- [ ] Update `src/app/core/services/key-resolution.service.ts` to inject `VocabularyService`
- [ ] Update all remaining `TranslationService` injection sites to `VocabularyService`
- [ ] Delete `translation-pipe.pipe.ts` and `translation.service.ts`
- [ ] Verify `ng build` passes and `{{ 'cup' | transloco }}` renders `כוס` in the app

### Plan 372 — Venues B: multiple contacts and an interactive days/hours picker (`plans/design/372-venues-b-multiple-contacts-hours-picker.plan.md`)
- [ ] A1: Let a venue store several contacts and structured opening hours — Schema and model additions; `build:schemas`; server validation test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [ ] A2: Show opening hours in plain Hebrew and still read old free-text hours — `venue-hours.util` `toDisplay` / `parseLegacy` plus spec (Hebrew range forms, midnight crossing, unparseable).
- [ ] A3: Add an interactive days-and-hours picker to the venue form — `HoursEditorComponent` plus spec; wire into the venue form; hydrate and save both shapes (`shared/hours-editor/**`, `venue-form/**`).
- [ ] A4: Let the venue form add and list several contacts — Contacts FormArray, legacy hydrate, save mirror, detail list (`venue-form/**`, `venue-detail/**`).
- [ ] A5: Build, test and check existing venues still open and save — Build, specs. Open 2 existing venues (one with free-text hours), edit and save, check no 400s.

### Plan 373 — Venues C: tour videos (links with a visit date) and "save my current location" (`plans/design/373-venues-c-tour-videos-current-location.plan.md`)
- [ ] A1: Let a venue store tour video links and a saved location — Schema and model; `build:schemas`; server test (`venue.schema.ts`, `venue.model.ts`, `server/test/**`).
- [ ] A2: Add tour videos with a visit date to the venue form and detail page — Videos FormArray, plus the detail list (`venue-form/**`, `venue-detail/**`).
- [ ] A3: Add a "save my current location" button and navigation links — Geolocation button and state, plus the detail navigate links.
- [ ] A4: Build, test and try it on a phone over HTTPS — Build, specs. Phone test over HTTPS (geolocation needs a secure context; localhost is fine).

### Plan 374 — Venues D: separate infrastructure from regular equipment in the venue form (`plans/design/374-venues-d-infrastructure-vs-equipment-groups.plan.md`)
- [ ] A1: Sort venue equipment into infrastructure and regular groups behind the scenes — Computeds and the transient `group` control; hydrate grouping; payload strip (`venue-form/**`).
- [ ] A2: Show infrastructure and regular equipment as two groups on the venue pages — Two-group template with correct index mapping; detail split (`venue-form/**`, `venue-detail/**`).
- [ ] A3: Hint in the equipment form which items count as infrastructure — Equipment-form infrastructure hint (`equipment-form/**`).
- [ ] A4: Build, test and check an existing venue still saves — Build, specs (hydrate grouping, payload has no `group`). Edit an existing venue and save, no 400.

### Plan 422 — Nightly QA morning report and shorter runs once pages are clean
- [ ] H1: Review only pages whose code changed so nights get shorter as the app gets cleaner — citedFiles at ingest, due/skipped rule with a 14-day full review, Nothing-to-review queue, tests — scripts/qa/code-qa/rotation.mjs, scripts/test/code-qa-rotation.test.mjs, scripts/test/fixtures/code-qa/**
- [ ] H2: Tell the Code QA agent to skip unchanged pages and stop when nothing is due — work only numbered pages, ignore Skipped, Nothing-to-review rule — docs/qa/code-qa-agent.md
- [ ] H3: Write one morning report that says whether the night needs anything from you — status, Do now, steps, new/fixed/open, history line, tests on fixture folders — scripts/qa/morning-report.mjs, scripts/test/qa-morning-report.test.mjs, scripts/test/fixtures/qa-morning/**
- [ ] H4: Produce the report every morning after QA stops — call morning-report.mjs from the 07:30 down step and log it — scripts/qa/qa-nightly-down.ps1
- [ ] H5: Show the morning report's status line when Claude Code opens in the main folder — morning-brief.mjs SessionStart hook, silent in slots and when stale, drift note — scripts/qa/morning-brief.mjs, .claude/settings.json, docs/workflow-kit/drift-classification.md
- [ ] H6: Explain the morning report and the shorter nights in the QA docs — Every morning section, due/skipped rule, file table — docs/qa/README.md, docs/qa/code-qa.md
- [ ] H7: Test, run the report on the real QA folder and hand you the two morning checks — npm run test:scripts, morning-report --out=- on C:/dev/foodVibe-qa, ng build; Human checks the first and second mornings — this plan file

### Plan 490 — Pasted ingredient lines match existing products first and Not Ready never saves (`plans/490-pasted-ingredient-lines-match-existing-products-first-and-not-ready-never-saves.plan.md`)

- [x] S1: Let the AI matching answer carry a short list of options when it is unsure — `productNameMatchResponseSchema` entries get optional `options: z.array(z.number().int()).optional()` with **no `.max()` / `.min(0)` on the array or its items** (the same schema parses the model's raw answer, so one over-long or out-of-range options list must not make `safeParse` reject the whole answer; `cleanProductMatches` does the capping and range check); export `PRODUCT_MATCH_MAX_OPTIONS = 5`; run `npm run build:schemas` — shared/schemas/ai-product-match.schema.ts
- [x] S2: Teach the server step to read names in any language and to return options instead of guessing — prompt: names come from a chef in any language (Hebrew, English, …) and may carry an amount, a pack word or a remark («קצת», «לפי הטעם») to ignore; set `product` only when exactly one product is clearly the same food (unchanged rule, still `חלב` ≠ `חלבה`); when two to five products could be that food and you cannot tell which, set `product` null and list them in `options`; otherwise null with no options; `cleanProductMatches` keeps `product` entries as today, keeps `product: null` entries only with cleaned options (in range, unique, max 5; dropped when `product` is set), and the done log line gains an `options` count; server tests as in Done-when — server/routes/ai.js, server/test/ai-match-product-names.test.js
- [x] S3: Give the shared matcher an options result next to the links, without changing the import page — new `matchNamesWithOptions(items, options)` returning `{ linked: Map<key, NameMatchResult>, options: Map<key, Product[]> }`; `NameMatchItem` gets optional `linkable?: boolean` (default true); tier-2 `ambiguous` candidates are kept and become options when the AI does not link that name (also after an AI failure); a non-linkable item never enters `linked` (an AI `product` for it becomes a one-item option, a local exact/variant hit too); options capped at 5, in the model's order then local; `matchNames` delegates and returns `linked`; spec — product-name-matcher.service.ts, product-name-matcher.service.spec.ts
- [x] S4: Send pasted text lines to the matcher for options only and keep each row's options — in `onPasteIngredients` queue text lines as `{ name: line.text, linkable: false }` next to the unlinked parsed lines; `linkPastedByAi_` calls `matchNamesWithOptions`, links as today, and stores options per row in a signal `rowOptions_` (a `Map<FormGroup, readonly Product[]>`, replaced not mutated) only while the row is still in the table, unlinked and its name unchanged; drop a row's options when it gets linked or cleared — recipe-ingredients-table.component.ts
- [x] S5: Make «לא מוכן» open the search with the inventory's options instead of saving a stub product — `onUnlinkedBadgeClick` keeps the plan-485 exact-name branch; otherwise it only sets `editingNameAtRow_` to that row (no `addProduct`, no `saveProduct`); `suggestionsFor(group)` = the row's stored options, then the local `matchProductName` result for its name over `KitchenStateService.products_()` (exact/variant product, or ambiguous candidates), no duplicates, max 5; the template passes `[suggestions]` to the row's `app-ingredient-search` only for the row being edited; remove the stub code and the imports it alone used — recipe-ingredients-table.component.ts, recipe-ingredients-table.component.html
- [x] S6: Keep the pasted amount and unit when the chef picks a product for an unlinked row — in `onItemSelected`, when the row being edited had no `referenceId` and has an amount above 0, keep its `amount_net` and `unit` (the unit dropdown already lists the row's current unit); other rows keep today's behaviour (checks 41-42) — recipe-ingredients-table.component.ts
- [x] S7: List the inventory's options first in the ingredient search, marked as suggestions — new input `suggestions = input<readonly Product[]>([])`; the combobox `options` become suggestions (as `item_type_: 'product'`, filtered by `excludeNames`) followed by `filteredResults_()` without the same `_id`, while the trimmed query equals the trimmed `initialQuery()`; once the user types something else, only the normal search; `knownOptions` includes the suggestions so an exact name still hides the add row (rule X); each suggestion row shows a `c-chip c-chip--tag c-chip--sm` «הצעה מהמלאי» chip; the add option and quick-add flow stay as they are (saves only on the window's «שמור») — ingredient-search.component.ts, ingredient-search.component.html, ingredient-search.component.scss (only if the chip needs spacing; logical properties, cssLayer skill first)
- [x] S8: Add the suggestion label and make the hint say what the badge now does — append `"ingredient_suggestion": "הצעה מהמלאי"` next to `ingredient_not_ready`; keep `unlinked_ingredient_hint` (it already says «לחץ לחיפוש וקישור») — public/assets/data/dictionary.json
- [x] S9: Specs for the table, search and matcher as listed in Done-when; update the plan-463 spec "never sends a text-only line to the AI step" to "sends a text-only line for options only and never links it" — recipe-ingredients-table.component.spec.ts, ingredient-search.component.spec.ts, product-name-matcher.service.spec.ts
- [ ] V1: Build, run every listed test, replay the cards in the browser and write the run file — `npx ng build`, the `ng test` includes, the server tests, the grep, log-query; record evidence, decisions and the five cards — docs/mvp/runs/490.md

### Plan 502 — Consistency sweep: one date field, one number format, growing textareas and one save-busy state (`plans/502-consistency-sweep-one-date-field-one-number-format-growing-textareas-and-one-save-busy-state.plan.md`)

- [x] C1: Check the four lists in the Problem Statement against today's code and record the real ones — native dates, `| number` and `toFixed` uses, textareas, save buttons without a busy flag — this plan file
- [x] C2: Replace the native date inputs with the shared date field and add a from / to variant only if the list filters need it — recipe-book-list, menu-library-list, menu-intelligence page — src/app/shared/date-field/**, the page folders in scope
- [x] C3: Show numbers through one rule: pick the pipe for quantity, money and percent, move the other uses onto it and remove `toFixed` in templates — record the rule and any value that changes — src/app/shared/ai-menu-modal/**, src/app/shared/ai-product-modal/**, src/app/pages/recipe-builder/components/recipe-ingredients-table/**
- [x] C4: Make every multi-line free-text box grow as the user types, and list the ones that stay fixed — extend the directive's selector so it cannot be forgotten — src/app/core/directives/textarea-auto-grow.directive.ts, the templates in scope
- [x] C5: Give every save button one saving state: disabled with a busy label while it runs, enabled again on error — one signal name and one button state; fix the ten screens without a flag — src/styles.scss, the dialogs and tabs in scope
- [x] C6: Warn when a native date input, a template `toFixed` or a bare textarea is added, and register the families — `reuse-lint` rules with fixtures; update the `form-field` and `engine-classes` families — scripts/lib/registry-families.mjs, scripts/test/reuse-lint.test.mjs, docs/brain/component-families.md
- [x] C7: Add specs for the double-click save guard and run the full checks — `ng build`, headless `ng test`, the two greps, reuse-lint, scope-check, log-query; paste the output in Execution Notes — the spec files in scope

- [ ] A1: Delete the 140 old per-branch state files from git and the local pointer file so no agent reads stale status again — git rm the 140 tracked state files under docs/; delete the untracked pointer file under .claude/ — docs/ (the old per-branch state files)
- [ ] A2: Rebuild the two kit-override files from kit v1.9.0 and put only the reuse layer back, so they stop allowing a state file and gain the kit's newer checks — render placeholders by hand; keep import + --reuse dispatch; keep ## Reuse Check block; update override reasons — scripts/scope-check.mjs, .claude/references/prd-template.md, kit.config.json
- [ ] A3: Rewrite the rules and brain docs so they say where work status lives now instead of naming the old file — AGENTS.md compaction rule with the kit's wording; brain points to plans, todo, git and PR; gitignore lines 62 and 73–78 removed; workflow map rows for dead scripts removed — AGENTS.md, .gitignore, docs/brain/index.md, docs/brain/glossary.md, docs/brain/projectbrief.md, docs/brain/how-it-works.md, docs/brain/gotchas.md, docs/brain/gotchas/agent-workflow.md, docs/brain/gotchas/git-workflow.md, docs/agent/workflow-map.md, docs/workflow-kit/parameters.md
- [ ] A4: Make the CI scope-check test prove the branch naming without relying on a state file being allowed — header comment reworded; test at line 145 commits an in-scope fixture file — scripts/ci-scope-check.mjs, scripts/test/ci-scope-check.test.mjs
- [ ] A5: Clean the two plans from the live run only if they are still open after the run merges — Always-allowed line only; closed plans in plans/<range>/ stay untouched — plans/419-*.plan.md, plans/497-*.plan.md
- [ ] A6: Prove nothing FoodVibe owns still names the old file and the build and script tests pass — run the Done-when grep, pnpm run build, pnpm run test:scripts, the --deps/--reuse checks and the two kit diffs; paste outputs — this plan file (Execution Notes)

- [ ] A1: Add the missing manifest entry for the native-dialog test fixture so the rules check stops failing — insert one object after the `mixed.diff` entry (alphabetical, before `registry-broken.md`) with `"path": "scripts/test/fixtures/reuse/native-dialog.diff"`, `"tier": "project"`, `"action": "stay"`, `"params": []`, `"refs": []`, `"notes": "Test fixture for the reuse-check and reuse-lint script tests; data, not workflow."` (copy the `clean.diff` entry's shape and wording exactly) — docs/workflow-kit/manifest.json
- [ ] A2: Prove the manifest check is green and nothing else moved — run the Done-when commands and paste the `KIT_MANIFEST: ok` line in Execution Notes; `git diff --stat` must show only `docs/workflow-kit/manifest.json` (+8 lines)

### Plan 510 — Let the chef pick a product's supplier and see when another is cheaper
- [ ] P1: Let a product remember which supplier the owner buys it from, owner-only — optional preferredSupplierId in the product schema and model; add it to MONEY_FIELDS.products; server permissions test that staff cannot change it — shared/schemas/entities/product.schema.ts, shared/schemas/money-fields.ts, src/app/core/models/product.model.ts, server/test/permissions.test.js
- [ ] P2: Make the price rule use the chosen supplier and fall back to the cheapest — chooseSupplier honours preferredSupplierId when that source is priced; specs for chosen, chosen-unpriced and chosen-removed — src/app/core/engine/supplier-choice.ts, src/app/core/engine/supplier-choice.spec.ts
- [ ] P3: Add a supplier icon to recipe lines so the owner can pick whose price to use — new supplier-picker child (inputs: product, can edit; output: picked supplier or automatic), with spec; saves the product through the product data service; read-only for staff — src/app/pages/recipe-builder/components/recipe-ingredients-table/**
- [ ] P4: Show in the event supplier orders when an item is cheaper at another supplier — pure helper beside buildSupplierOrders returning cheaper supplier, price and saving per line and per card, with spec; render the line hint and card total — src/app/core/utils/supplier-orders.util.ts, its spec, src/app/pages/menu-intelligence/components/supplier-orders/**
- [ ] P5: Mark the chosen supplier in the product form's price rows — src/app/pages/inventory/components/product-form/supplier-prices/**
- [ ] P6: Run the full checks and paste the output — ng build, headless ng test, server tests, log-query — Execution Notes

### Plan 512 — Add the client record, owner-only writes and staff-limited reads on the server
- [ ] S1: Define the client record and add a client link to events so the server can validate both — `shared/schemas/entities/client.schema.ts` per the Contract, modelled on `venue.schema.ts`; register import, export, `SCHEMA_BY_COLLECTION.clients` and `export type Client = z.infer<typeof clientSchema>` in `shared/schemas/entities/index.ts`; add `clientId: z.string().optional()` to `menuEventSchema` in `menu-event.schema.ts` next to `clientName`; run `npm run build:schemas` — files: the three schema files.
- [ ] S2: Define the short list of client fields staff are allowed to read — create `shared/schemas/staff-fields.ts` exporting `STAFF_READ_FIELDS` per the Contract and export it from `shared/schemas/index.ts` — files: `shared/schemas/staff-fields.ts`, `shared/schemas/index.ts`.
- [ ] S3: Make clients owner-only to change and give staff a trimmed view when reading — in `server/utils/permissions.js` add `OWNER_ONLY_TYPES`; in `can()` before the existing staff branch return `{ ok:false, reason:'OWNER_ONLY_TYPE' }` when the user is staff, `ctx.type` is in the set and `action` is `create`, `edit` or `delete`; add and export `staffProjection(type)` that reads `SCHEMA_BY_COLLECTION[type].shape` keys from `server/generated/schemas/entities` and excludes base fields (`_id, schemaVersion, userId, businessId, createdBy, createdAt, updatedAt, deletedAt, deletedBy`) — files: `server/utils/permissions.js`.
- [ ] S4: Register the clients collection and make the server trim staff reads and derive the phone — add the `clients` entry to `COLLECTIONS` in `server/constants/collections.js`; in `server/routes/generic.js` apply `staffProjection(entityType)` on GET `/` and GET `/:id` for staff (pass as the find projection; keep existing projections for other types untouched); on POST `/:type` and PUT `/:type/:id` when `entityType === 'clients'` derive `phoneNormalized` after validation and before the write — files: `server/constants/collections.js`, `server/routes/generic.js`.
- [ ] S5: Prove with server tests that staff are blocked, trimmed and the phone is derived — `server/test/clients.test.js` covering every assertion in Success Criteria using the same auth helpers as `server/test/invariants.test.js`; add a `clients` entry to the local `COLLECTIONS` array in `invariants.test.js` with `body()` returning a valid client and `edit` `{ notes: 'x' }`, mark it owner-only so the staff-create assertion expects 403, and make `seed()` skip `_masterId` for `clients` like it does for `taxonomyTerms` — files: `server/test/clients.test.js`, `server/test/invariants.test.js`.
- [ ] D1: Record the client decision in an ADR and update the glossary and backend standards — `docs/brain/decisions/0027-client-entity-above-events.md` (client = who, event = what; stage on the event; clients owner-only to write; staff read name+phone via server projection; `clientName`/`clientPhone` kept as snapshot; no rename cascade yet; migration 0009 grouping rule); add `לקוח / client` to `docs/brain/glossary.md`; rewrite §3 of `docs/agent/standards-backend.md` to describe `collections.js` flags and `SCHEMA_BY_COLLECTION` registration — files: the three docs.
- [ ] V1: Run every check for this plan and write the evidence in the Execution Notes — Build, run `npm run build:schemas`, `npm test -- server/test/clients.test.js`, `npm test -- server/test/invariants.test.js`, both scope-checks and the log check; write evidence under `## Execution Notes`.

### Plan 513 — Create clients from existing menu events and link each event to its client
- [ ] S1: Work out which clients each business needs and which events link to them, without writing — `server/migrations/0009-clients-from-events.js` with the 0008 skeleton (`parseArgs`, `connect`, `checkBackup`, `MIGRATION_ID`), pure helpers `normalizePhone(s)`, `groupKey(event)`, and `async plan(db, now)` returning `{ clientsToInsert, eventPatches, skipped, perBusiness }` per the P0 grouping rules; dry run prints the summary — files: the migration.
- [ ] S2: Write the clients and event links safely and add a check that no event is left unlinked — `async write(db, args, result)` (`checkBackup` unless `--db`; reuse-or-insert clients validated with `parseV2('clients', doc)` from `server/utils/schema-check.js`; idempotent event `updateOne`; `migrations` upsert) and `async verify(db)`; `main()` with `parseArgs(process.argv, { write:1, verify:1, 'backup-dir':1, db:1, target:1, 'confirm-host':1 })`; `module.exports` and `if (require.main === module) main()` — files: the migration.
- [ ] S3: Prove with a test that the migration groups correctly and can be re-run safely — `server/test/migration-0009.test.js` using the in-memory/local test DB helper the other server tests use: seed two businesses, events with shared phone in two formats (`052-1234567`, `0521234567`), one event with name only, one with neither, run `plan` + `write` twice; assert counts, `createdBy`, idempotence, and `verify` ok — files: the test.
- [ ] V1: Rehearse on the scratch database, record the output and list the Atlas commands unrun — Atlas` with the exact commands (not executed).

### Plan 514 — Give the app a client model, data service and display helpers
- [ ] C1: Give the app a client type and let events carry a client link — `src/app/core/models/client.model.ts` and the re-export in `models/v2/index.ts`; add `clientId?: string` to `MenuEvent` in `menu-event.model.ts` next to `clientName` — files: the three model files.
- [ ] C2: Add the client data service so the app can list, add and update clients — `src/app/core/services/client-data.service.ts` per P0, copying the structure and error handling of `menu-event-data.service.ts` — files: the service.
- [ ] C3: Load clients when the menu screens open and reload them when the user changes — `src/app/core/resolvers/clients-ensure-loaded.resolver.ts` (copy of `menu-events-ensure-loaded.resolver.ts`); append `clientsLoaded: clientsEnsureLoadedResolver` to the three route `resolve` maps in `src/app/app.routes.ts` (`menu-library`, `menu-intelligence`, `menu-intelligence/:id`); add the reload entry in `user.service.ts` `_reloadDataServices()` — files: resolver, `app.routes.ts`, `user.service.ts`.
- [ ] C4: Add small helpers to search clients by name or phone and show them as a label — `src/app/core/utils/client-display.util.ts` per P0 — files: the util.
- [ ] T1: Cover the data service and the helpers with specs — `client-data.service.spec.ts` mirroring `menu-event-data.service.spec.ts` for add/update/401/log; `client-display.util.spec.ts` with cases: name hit, phone prefix hit, formatted-phone (`052-123`) hit against `phoneNormalized`, miss, label with and without count — files: the two specs.
- [ ] V1: Run the build, the specs and the gates, then write the evidence in the Execution Notes — Run `npm run build`, the two specs, the reuse gate and the log check; write evidence under `## Execution Notes`.

### Plan 515 — Let the new-inquiry dialog pick or create a client instead of retyping name and phone
- [ ] U1: Add the Hebrew texts for the client picker and new-client form — all 18 keys from the Contract under `general` in `public/assets/data/dictionary.json`, append only; skip any key already present — files: dictionary.
- [ ] U2: Move the new-inquiry dialog onto the shared modal so it behaves like other dialogs — wrap `new-inquiry-dialog.component.html` in `app-modal-shell`, drop the overlay markup and scss, keep the `(document:keydown.escape)` host binding routed to `cancelled.emit()` — files: the component html/scss/ts.
- [ ] U3: Replace the free-text name and phone with a client search so returning clients are found — inject `ClientDataService`, `MenuEventDataService`, `PermissionService`; add `selectedClient_`, `canCreateClient_`, `isNewClientBranch_`, `countFor`; replace the two inputs with `app-search-combobox` per P0; wire `(picked)` and `(addChosen)` — files: the component html/ts.
- [ ] U4: Let the owner add a new client inside the dialog, saving the client before the event — name/phone inputs with existing validators, collapsed `client_more_details` section with `app-custom-select` for `clientType` and the four optional fields; `valid_` per P0; `onSave()` creates the client first and adds `clientId`/`clientName`/`clientPhone` to the event body — files: the component html/ts.
- [ ] T1: Update and extend the dialog tests for pick, owner-create and staff cases — fix the 6 existing tests to the new flow; add the 4 tests named in Success Criteria using a stubbed `ClientDataService` and `PermissionService` — files: `new-inquiry-dialog.component.spec.ts`.
- [ ] V1: Run the checks, capture the three UI cards and write the evidence in the Execution Notes — Run `npm run build`, `npm run lint`, the spec, the reuse gate and the log check; produce the three `[ui]` cards (e2e + screenshot each); write evidence under `## Execution Notes`.

### Plan 516 — Show the event client as a read-only row with owner change and link on the stage bar
- [ ] U1: Add the same Hebrew client texts so the stage bar and the dialog share one list — the 18 Contract keys under `general` in `public/assets/data/dictionary.json`, append only; skip keys already present — files: dictionary.
- [ ] U2: Remove the editable client name and phone from the stage bar and keep the deposit fields — delete `onClientNameChange`, `onClientPhoneChange`, `isPhoneInvalid_` and the two inputs from `event-stage-bar.component.ts/html`; keep deposit inputs; relabel the toggle `deposit_details`; `detailsSummary_` → deposit summary — files: the component ts/html/scss.
- [ ] U3: Show the event client as a read-only row with name, phone and event count — inject `ClientDataService`; add `client_`, `clientEventCount_`, `canChangeClient_`; render the chips per P0 as the first item in `.stage-links` — files: the component ts/html/scss.
- [ ] U4: Let the owner change or link the event client from the stage bar — `isPickerOpen_` signal, owner-only button, inline `app-search-combobox` pick-only, `(picked)` → `saveFields` with the three fields, close on pick and on Escape — files: the component ts/html.
- [ ] T1: Update the stage bar tests for the removed inputs and the new client row — remove tests for the deleted handlers; add the 3 tests named in Success Criteria with stubbed `ClientDataService`, `MenuEventDataService`, `PermissionService` — files: `event-stage-bar.component.spec.ts`.
- [ ] V1: Run the checks, capture the three UI cards and write the evidence in the Execution Notes — Run `npm run build`, `npm run lint`, the spec, the reuse gate and the log check; produce the three `[ui]` cards; write evidence under `## Execution Notes`.
