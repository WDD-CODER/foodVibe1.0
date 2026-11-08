# Active Tasks

> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-2026-07-21.md`](reports/todo-ledger-relevance-audit-2026-07-21.md).
> Checkboxes are **unchanged** — decide per group: execute / mark done / prune / keep.
> **2026-09-16 (overnight):** `/auto-solve` running unattended in worktree `../foodVibe1.0-wt-auto-solve` on branch `feat/auto-solve-overnight`, self-approving each plan (no Human present). See that branch's `OVERNIGHT-REPORT.md` for what landed — nothing pushed/merged without Human review.

---

## Execution order (Planner review 2026-11-07, `node scripts/plan-order.mjs` at 9c3578bb)

- Wave 1: **517** gate runners (re-scoped) · **510** preferred supplier · **374** venues infra · **533** date field owns its styles · **535** dev catalog page
- Wave 2: **518** logistics schema · **372** venues contacts + hours · **528** AI limiter key + drop GitHub MCP · **530** Atlas URI → `server/.env.live` (server) · **534** design-port family column
- Wave 3: **519 ∥ 520 ∥ 521** logistics server / seed / client services · **529** read-only local Mongo MCP · **531** DB scripts `--target`
- Wave 4: **522** logistics panel (collapsed card, Q1 = b) → **523** item manager card
- Wave 5: **532** platform admin sees businesses' logistics items + promote
- Lanes: 517→518→519→522 · 520→523→532 · 374→372 · 528→529 · 530→531 (528, 530, 531 also after 517: they need `test:server`) · 533→534 · 510, 521, 535 alone
- Hotspot / shared-file locks: `docs/workflow-kit/manifest.*` (528, 529, 530, 531, 534), `docs/brain/component-families.md` (522, 523, 533, 534, 535), `docs/brain/index.md` (529, 534), `scripts/log-query.mjs` (517 → 531), `.mcp.json` (528 → 529), `public/assets/data/dictionary.json` (522, 523, 532)
- After 530 merges: the Human moves `MONGO_URI` out of `server/.env` (PowerShell lines in plan 530)
- Kept: client creation owner-only (Human 2026-11-07), revisit after the pilot
- Closed: **386** (superseded by ADR 0023) · **385**, **387** done (verified 2026-11-07) · **513** done
- Closed: **490** (Human validated 2026-11-05; fixes #507, #509)
- Parked: **373** venue videos/location (after 372, low value) · **471** exports (needs a Human walk-through session)
- Closed: **524** (done in PR #494, main on kit v2.0.0)

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

### Plan 517 — Let the orchestrator gate run FoodVibe's tests, server tests and one e2e spec without hanging
- [x] A1: Give the project a test runner that always exits, so the gate gets a verdict instead of a hang — spawn ng test headless, parse the Karma TOTAL line, kill the process tree, print the TEST-CI summary line — scripts/test-ci.mjs
- [x] A2: Prove the runner exits on a fake child that prints TOTAL and then hangs — the test spawns `node scripts/test/fixtures/fake-karma.mjs` (prints `TOTAL: 1 FAILED, 3 SUCCESS` then sleeps 60s) through an exported `runWithParser(cmd, args, { timeoutMs })` and asserts exit 1 and the summary line within 5s; a second fixture prints `TOTAL: 4 SUCCESS` → exit 0; a third prints nothing → timeout path exit 1 with `timeoutMs: 500` — scripts/test/test-ci.test.mjs, scripts/test/fixtures/fake-karma.mjs
- [x] A3: Let a card's test command run one Playwright spec through an allowlisted script — validate the argument, spawn `npx playwright test <spec>` with stdio inherited, exit with its code; test the validator (`e2e/x.spec.ts` ok, `../x.spec.ts` and `e2e/x.ts` → exit 2) — scripts/e2e-one.mjs, scripts/test/e2e-one.test.mjs
- [x] A4: Register the two runners as package scripts and point the kit's test command at the one that exits — `test:ci`, `test:server`; `commands.test: "test:ci"` — package.json, kit.config.json
- [ ] A5: Make the log check survive a builder folder — plan-start fallback to the branch base time, SKIP with exit 0 when no database is configured; keep every other path as it is — scripts/log-query.mjs, scripts/test/log-query-fallback.test.mjs (unit-test the exported `resolvePlanStart(root)` and `databaseUri(root)` helpers; no Mongo)
- [x] A6: Give e2e specs a signed-in QA session and a throwaway event — `signInQa`, `createQaEvent`, `deleteQaEvent` over the existing qa-login helpers — e2e/helpers/qa-session.ts
- [x] A7: Prove the session helper against the running app with one screenshot — the `[ui]` card test — e2e/qa-session.spec.ts
- [ ] A8: Tell plan authors which checks the gate can run — one paragraph — docs/agent/plan-checks.md
- [ ] A9: Run every automatic check of this plan from the worktree and paste the outputs under Execution Notes

### Plan 518 — Event logistics 1 of 6: the checklist-item kind and the event's answers in the shared schemas
- [ ] A1: Define the logistics vocabulary once for client and server — phases, sections, answer types, statuses, payers and size limits — shared/schemas/entities/event-logistics.ts, shared/schemas/entities/index.ts
- [ ] A2: Let a taxonomy term be a logistics question — new kind in the enum, the union member, the reference path — shared/schemas/entities/taxonomy-term.schema.ts
- [ ] A3: Let an event store its phone-intake and site-visit answers as a server-owned field — the `siteLogistics` sub-document after `closing` — shared/schemas/entities/menu-event.schema.ts
- [ ] A4: Keep the answers out of every client body on the generic data API — append `'siteLogistics'` to the server-owned field list and its JSDoc — shared/schemas/entities/event-stage.ts
- [ ] A5: Prove the shapes with schema tests — `server/test/taxonomy-term-schema.test.js`: a `logisticsItem` with every field valid; `environments: ['moon']` invalid; `phase: 'later'` invalid; `environments` absent valid. `server/test/event-stage-schema.test.js`: an event with a full `siteLogistics` valid; an answer with `status: 'maybe'` invalid; `text` of 501 chars invalid; 301 answers invalid; `EVENT_SERVER_FIELDS` contains `'siteLogistics'`. Add `logisticsAnswer(overrides)` and `logisticsItemBody(overrides)` builders — server/test/helpers/v2-docs.js
- [ ] A6: Mirror the shapes on the client so the next plans can type against them — `LogisticsAnswer`, `SiteLogistics`, `siteLogistics?` on `MenuEvent`, conformance tuple still green — src/app/core/models/menu-event.model.ts, src/app/core/models/v2/conformance.ts
- [ ] A7: Run build:schemas, build, lint, test:server, test:ci and paste the outputs under Execution Notes

### Plan 519 — Event logistics 2 of 6: the owner-only endpoint that saves an event's logistics answers
- [ ] A1: Add an owner-only permission for logistics answers on the server — `'editLogistics'` in `ACTIONS` and `OWNER_ONLY_ACTIONS`; the existing `can()` flow then allows the owner and a platform admin and denies staff — server/utils/permissions.js
- [ ] A2: Mirror the permission on the client so screens can hide what the server refuses — `'editLogistics'` in the `PermissionAction` union and `OWNER_ONLY_ACTIONS`; spec: staff `can('editLogistics')` false, owner true — src/app/core/services/permission.service.ts, src/app/core/services/permission.service.spec.ts
- [ ] A3: Let the owner save logistics answers through one server door that stamps who and when — the route below — server/routes/events.js
- [ ] A4: Document the new route for the next plans — one row in the §5 table (`PUT /api/v1/events/:id/logistics` · required · owner (`editLogistics`) · `BAD_LOGISTICS`, `EVENT_FINISHED` 409) — docs/agent/standards-backend.md
- [ ] A5: Prove the door with router and permission tests — `server/test/events-logistics.test.js` (pattern `events-closing.test.js`, builders `logisticsAnswer` from `helpers/v2-docs.js`, users OWNER/STAFF/OUTSIDER as in `events-router.test.js`): owner saves 2 answers → 200, both `by: 'own1'`, `at` set; second save with 1 unchanged + 1 changed → only the changed one's `at` moves, the unchanged keeps its first stamp; a save of a third answer keeps the first two; `phaseDone: { intake: 1700 }` then `phaseDone: { intake: null }` → set then unset; staff → 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }`; outsider → 404 (other business is not found); finished event → 409 `EVENT_FINISHED`; `answers: 'x'` → 400 `BAD_LOGISTICS`; an answer with `status: 'maybe'` → 400 `Validation failed`; `environmentType: 'outdoor_field'` on an event without `logistics` → stored `logistics: { environmentType: 'outdoor_field', resolvedItems: [] }`; generic `PUT /api/v1/data/menuEvents/:id` with `siteLogistics` in the body → stored value unchanged. `server/test/permissions.test.js`: owner `can(user, 'editLogistics', { type: 'menuEvents', doc })` ok; staff denied; other business denied; platform admin on a master doc ok — server/test/events-logistics.test.js, server/test/permissions.test.js
- [ ] A6: Run build, lint, test:server, test:ci and paste the outputs under Execution Notes

### Plan 520 — Event logistics 3 of 6: seed the 45 shared checklist questions every business starts with
- [ ] A1: Write the shared question list a caterer needs before a final quote — the 45 rows below, in this order — server/services/logistics-seed-items.js
- [ ] A2: Seed the list on boot, once, next to the default stations — `ensureDefaultLogisticsItems` mirroring `ensureDefaultStations`, wired into `seedMasterData` and exported; test block `describe('ensureDefaultLogisticsItems')`: on a DB with master terms but no logistics item → inserts 45, every inserted doc passes `taxonomyTermSchema` (import from `../generated/schemas/entities`), 13 have `phase: 'intake'`, `גנרטור נדרש?` has `environments: ['outdoor_field', 'popup_venue']`; second call → 0 and the count stays 45 — server/services/seed-master.js, server/test/seed-master-taxonomy.test.js
- [ ] A3: Run lint and test:server and paste the outputs under Execution Notes

### Plan 521 — Event logistics 4 of 6: the client services that read the checklist, save answers and write the client summary
- [ ] A1: Give the client one call that saves logistics answers and refreshes the event in the store — `saveLogistics` + `LogisticsPatch` on the pipeline service; spec with `HttpTestingController`: PUT to `/api/v1/events/ev1/logistics` with the patch as body, the returned event applied through the same path the other calls use, a 403 → `{ ok: false }` with the error key the service already maps — src/app/core/services/event-pipeline.service.ts, src/app/core/services/event-pipeline.service.spec.ts
- [ ] A2: Read the checklist items of one phase for one environment from the taxonomy store — the registry facade; spec with a stubbed `TaxonomyStore.terms` returning 4 terms (2 phases, one with `environments: ['outdoor_field']`): `forPhase('site_visit', 'professional_kitchen')` hides that one, `forPhase('site_visit', 'outdoor_field')` shows it, `forPhase('site_visit', undefined)` shows it, `forPhase('intake', …)` returns only the intake ones; the same signal instance is returned for the same arguments — src/app/core/services/logistics-item-registry.service.ts, src/app/core/services/logistics-item-registry.service.spec.ts, src/app/core/services/breadcrumbs.md
- [ ] A3: Turn the ticked answers into the Hebrew text the chef pastes into a quote — `buildClientSummary`, `openItems`; spec: ticked only (an answer without `showToClient` is left out); sections in canonical order with the translated heading; a quantity answer renders `· 2`, a text answer renders `· <text>`; an answer whose item was deleted falls back to `itemKey`; nothing ticked → `''`; `openItems` counts an item with no answer and one with `unchecked` — src/app/core/utils/logistics-summary.util.ts, src/app/core/utils/logistics-summary.util.spec.ts, src/app/core/breadcrumbs.md (the utils line)
- [ ] A4: Register the registry in the taxonomy family's Users line — docs/brain/component-families.md
- [ ] A5: Run build, lint, test:ci, breadcrumbs-check and paste the outputs under Execution Notes

### Plan 522 — Event logistics 5 of 6: the phone-intake and site-visit panel on the event screen
- [ ] B1: Build the panel that lists the checklist for one event and answers in two taps — component class per `.claude/skills/angularComponentStructure/SKILL.md`: OnPush, `input eventId: string | null`, signals `phase_`, `openOnly_`, `pending_`, `event_ = computed(() => eventData.getMenuEventById(id))`, `environment_`, `rows_`, `sections_`, `openCount_` per phase, `canEdit_`; a private timer handle cleared in `DestroyRef.onDestroy`; `inject()` only — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.ts
- [ ] B2: Write the template exactly as the P0 list describes — tabs, profile strip, sections, rows, ad-hoc row, footer, read-only branch; double quotes in HTML; every string via `translatePipe` — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.html
- [ ] B3: Style the panel as a card like the notes log, mobile first — component-local SCSS only, breakpoint mirror with the conventions comment, no new `.c-*` class — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.scss
- [ ] B4: Mount the panel on the event screen with one tag — directly after the `@if (editingId_()) { <app-event-notes-log … /> }` block add `@if (editingId_()) { <app-event-logistics-panel [eventId]="editingId_()" /> }`; in the page class add only the import line and the entry in `imports` (the page is growth-frozen: nothing else) — src/app/pages/menu-intelligence/menu-intelligence.page.html, src/app/pages/menu-intelligence/menu-intelligence.page.ts
- [ ] B5: Add the Hebrew strings and the icons — the keys above appended to `general`; the five icons in `LucideAngularModule.pick` — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] B6: Record the new piece in the maps — the panel under the chip family's Users and in the menu-intelligence line — docs/brain/component-families.md, src/app/pages/breadcrumbs.md
- [ ] B7: Unit-test the panel with stubbed services — `MenuEventDataService.getMenuEventById` returns an event with `logistics.environmentType: 'professional_kitchen'`; `LogisticsItemRegistryService.forPhase` returns 2 intake items and 2 site-visit items (one with `environments: ['outdoor_field']`); `PermissionService.can` true/false per case; `EventPipelineService.saveLogistics` is a spy resolving `{ ok: true, event }`. Cases: renders the 2 intake rows; the outdoor-only item is absent on `professional_kitchen` and present after `environment_` is `outdoor_field`; choosing "נדרש" then `tick(600)` calls `saveLogistics` once with `answers.length === 1` and `status: 'needed'`; two changes within 600 ms → one call with both; a rejected save (`{ ok: false, code: 'server_error' }`) keeps `pending_` and the next change resends both; the open count drops when a row leaves `unchecked`; `can` false → every control disabled and `logistics_read_only` shown; "סיימתי את השלב" with open items opens the confirm (spy on `ConfirmModalService.open`) — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.spec.ts
- [ ] B8: Write one e2e spec per UI card with the plan-517 helpers — each: `signInQa(context)`, `createQaEvent(request, session)`, `page.goto('/menu-intelligence/' + id)`, the card's one action, its assertion, `page.screenshot({ path: 'screens/522-<n>.png' })`, `deleteQaEvent` in `finally`; run each with `node scripts/e2e-one.mjs e2e/ui/522-<n>.spec.ts` and report them as `uiCards` — e2e/ui/522-1.spec.ts … e2e/ui/522-6.spec.ts
- [ ] B9: Run build, lint, lint:icons, lint:no-native-select, test:ci, breadcrumbs-check, reuse-lint and paste the outputs under Execution Notes

### Plan 523 — Event logistics 6 of 6: let a business add and remove its own checklist questions in the Metadata Manager
- [ ] C1: Build the manager that lists shared and own logistics questions and adds or removes own ones — component class per the Angular skill: OnPush, `inject()` (`TaxonomyStore`, `LogisticsItemRegistryService`, `ConfirmModalService`, `UserMsgService`, `TranslationService`, `UserService.isLoggedIn`, `AuthModalService`), signals `phase_`, `draft_` (text, phase, section, answerType, environments, shared), `error_`, computed `sections_` (grouped rows for the selected phase) — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [ ] C2: Write the card template — tabs, grouped rows (locked tag vs removable chip), the add form, the empty state per section — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.html
- [ ] C3: Style the card like its siblings, mobile first — component-local SCSS, breakpoint mirror, no new `.c-*` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.scss
- [ ] C4: Mount the card and give it a rail entry — the tag after `app-station-manager`, the import and `imports` entry, the `_allJumpSections` line — src/app/pages/metadata-manager/metadata-manager.page.component.html, src/app/pages/metadata-manager/metadata-manager.page.component.ts
- [ ] C5: Unit-test the card with a stubbed store — `TaxonomyStore.terms('logisticsItem')` returns 1 shared + 1 own item; `isShared`, `isAdmin_` (false), `add` / `remove` spies: the shared row has the lock and no remove control; the own row has the remove control; submitting "חדש" with section `access` calls `add` with `{ phase: 'intake', section: 'access', answerType: 'status' }` and no `environments`; submitting with two environment chips checked passes `environments: ['outdoor_field', 'client_home']`; submitting the shared item's key again sets `error_` and does not call `add`; remove → confirm spy resolves true → `remove` called; `remove` rejecting with the server's in-use error → toast `metadata_logistics_in_use` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts
- [ ] C6: Add the Hebrew strings and the icons — the keys above, `Lock` and `ListChecks` — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] C7: Record the new piece in the maps — docs/brain/component-families.md (chip family Users), src/app/pages/breadcrumbs.md
- [ ] C8: Write one e2e spec per UI card with the plan-517 helpers — `signInQa`, `page.goto('/metadata-manager')`, the card's action, the assertion, screenshot `screens/523-<n>.png`; 523-3 removes what 523-2 added and both clean up in `finally` by deleting any own `logisticsItem` named "בדיקה E2E" through `DELETE /api/v1/data/taxonomyTerms/:id`; run each with `node scripts/e2e-one.mjs e2e/ui/523-<n>.spec.ts` — e2e/ui/523-1.spec.ts … e2e/ui/523-3.spec.ts
- [ ] C9: Run build, lint, lint:icons, lint:no-native-select, test:ci, reuse-lint and paste the outputs under Execution Notes

- [ ] M1a: Take the plan, then check the dry-run of the kit sync and show the Human its summary line — run kit-sync with ref v1.13.0 and no apply flag from the kit folder against the slot — kit folder, slot root
- [ ] M1b: Apply the kit sync after the Human's word and commit it alone as "sync kit v1.13.0" — kit-sync with the apply flag, then one commit of its output only — whole sync output incl. .kit/install.json
- [ ] M2a: Run the override check on the real files and report which workflow files fail and why — node scripts/override-check.mjs, full output — no writes
- [ ] M2b: Show for each failing file the exact required step from the kit template and the diff that adds it, keeping FoodVibe jobs unchanged — kit core/.github/workflows/*.yml vs .github/workflows/ci.yml and security.yml — diffs only, nothing committed
- [ ] M2c: Tell the Human what ADR 0021 and the kit change loop say about a kit-side fix instead of a local override — docs/brain/decisions/0021-*.md, kit docs/CHANGE-LOOP.md — report only
- [ ] M3a: Show the proposed merge of the kit version with FoodVibe's Reuse additions in the scope check script — keep the reuse flag and Reuse gate — scripts/scope-check.mjs
- [ ] M3b: Show the proposed merges of the save-plan skill and the PRD template that keep the Reuse Check section — .claude/skills/save-plan/SKILL.md, .claude/references/prd-template.md
- [ ] M3c: Show the override declarations FoodVibe's kit config would need, one path and one reason each — kit.config.json overrides
- [ ] M3d: Stop and wait for the Human's word before any commit beyond the sync commit, and never push — none

### Plan 533 — The unified date field owns its styles: nothing reaches in from outside, nothing is broken (`plans/533-date-field-owns-its-styles-nothing-reaches-in-from-outside.plan.md`)
- [x] A1: Make the hidden picker immune to outside input rules — unlayered picker block, full reset, comment — src/app/shared/date-field/date-field.component.scss
- [ ] A2: Prove the picker box inside an input stack — the new spec case — src/app/shared/date-field/date-field.component.spec.ts
- [x] A3: Delete the dead outside date rules after a usage grep — src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss, src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss, src/app/pages/menu-library/components/new-inquiry-dialog/new-inquiry-dialog.component.scss, src/app/pages/menu-intelligence/_paper-ui.scss
- [x] A4: Warn when a page styles a shared component from outside, and repair the modal-overlay rule — scripts/lib/registry-families.mjs
- [x] A5: Test both rules — scripts/test/reuse-lint.test.mjs
- [x] A6: Document the rules and the date field's "inside only" rule — docs/agent/standards-reuse.md, docs/brain/component-families.md
- [x] A7: Run every `[auto]` check plus `node scripts/reuse-lint.mjs --diff=origin/main` (expect no `family-styled-from-outside` line) and paste the outputs under Execution Notes
