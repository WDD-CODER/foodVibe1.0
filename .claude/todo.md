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
- Merged 2026-11-08: **374**, **535** (PR #525). **510** superseded by **536** (failed hand checks, reverted)
- New 2026-11-08: **536** recipe-line supplier + per-event move (not parallel with 518/519) · **537** venue hours pickers (after 374; 372 now after 537) · **538** save-or-leave in front · **539** toast at narrow width
- Lanes: 374→537→372 · 536 after 518→519 or before both (shares menu-event schema/model, permissions.js)
- Merged 2026-11-09: **540** show why the server refused a save (run-540, PR #530; Human passed 6/6 cards)

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

### Plan 542 — The local MongoDB MCP server starts from an installed package, with its last outside reach closed (`plans/542-mongodb-local-mcp-starts-from-installed-package.plan.md`)

- [x] A1: Install the database tool with the project so it never downloads itself at start — exact 3.2.2 dev dependency; onlyBuiltDependencies only if the start test needs it — package.json, pnpm-lock.yaml
- [x] A2: Start the installed tool directly and say clearly when it is missing — resolve the bin, spawn process.execPath without shell, not-installed message and exit 2 — scripts/mcp-mongo-local.mjs
- [x] A3: Switch off the tools that can reach beyond the local database — connect, disconnect, atlas-local-*, knowledge tools in MDB_MCP_DISABLED_TOOLS — scripts/mcp-mongo-local.mjs
- [x] A4: Tell the Human the right value and that only a new terminal window sees it — refusal message and header comment — scripts/mcp-mongo-local.mjs
- [x] A5: Prove it starts fast, offers only local read tools, and never uses npx — source test plus initialize/tools-list start test — scripts/test/mcp-mongo-local.test.mjs
- [x] A6: Record the two traps so the next setup does not repeat them — one gotcha entry — docs/brain/gotchas/agent-workflow.md
- [x] A7: Run every auto check and paste the outputs, and list the three Human setup steps in the hand-off — this plan file (Execution Notes)
- [ ] A8: After the merge, install the new package in the main folder and remove the timeout workaround — Planner only, not the builder: the two steps under After merge, then the [human] card — main folder, user environment

### Plan 543 — Open one safe door for people who are not members of a business (`plans/543-open-one-safe-door-for-non-members.plan.md`)
- [ ] A1: Give every server stamp one source for who did it — actorOf and guestActor in a shared file; events.js imports it instead of its own copy — server/utils/actor.js, server/routes/events.js
- [ ] A2: Add the public rate limiter, the honeypot and the read-back token helper — ipAndSlugKey + publicLimiter, honeypot middleware, newPublicToken + isPublicTokenShape — server/middleware/rate-limit.js, server/middleware/honeypot.js, server/utils/public-token.js
- [ ] A3: Test the limiter, honeypot and token on a small test app — 20 then 429, other slug free, GET not counted, no IPv6 key error; honeypot 201 with no next; 32 chars, 10,000 unique — server/test/public-guard.test.js
- [ ] A4: Mount an empty public router that never reads a member token — GET /health probe, no-store, JSON 404 for the rest, mounted after the JSON parser — server/routes/public.js, server/app.js, server/test/public-router.test.js
- [ ] A5: Write the guest-door rule down where the gate reads it — ADR 0030, the INV-1 sentence, Source and Touches, and the two INV-1 guest door tests — docs/brain/decisions/0030-guest-writes-have-one-door.md, docs/brain/invariants.md, server/test/invariants.test.js
- [ ] A6: Record the new route in the backend docs and the server map — the §5 row and limiter sentence, the breadcrumbs row — docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A7: Run the full checks and hand Dandan the ADR to read — test:server, server lint, build, scope-check --arch, log-query; then the [human] card for ADR 0030

### Plan 566 — Meter every AI call so pricing can be set from real numbers (`plans/566-meter-every-ai-call.plan.md`)
- [ ] A1: Name every AI feature and price every model in two fixed lists — the 19 feature keys and the price table with its date and source — server/constants/ai-features.js, server/constants/ai-prices.js
- [ ] A2: Add the ledger that writes one row per real model call without ever slowing or breaking it — recordAiUsage, estimateCostUsd, aggregateAiUsage; collection entry and two indexes — server/services/ai-usage.js, server/constants/collections.js, server/db.js
- [ ] A3: Make the Gemini caller require a feature and write a ledger row on success and every failure — usage parameter, throw under vitest, no row when no call was made; update the test helper — server/services/gemini-client.js, server/test/gemini-client.test.js
- [ ] A4: Tag each of the thirteen AI routes with its feature so every call is counted — the table in the Problem Statement; fix the route tests that call these routes if they now need usage — server/routes/ai.js, server/test/ai-match-product-names.test.js, server/test/ai-receipt-photo.test.js, server/test/price-list-prompt.test.js, server/test/product-import-route.test.js
- [ ] A5: Test the ledger end to end — tokens and cost, each failure kind, no-call cases, retry gives two rows, failed insert is silent, stored fields, every route tagged — server/test/ai-usage.test.js
- [ ] A6: Let the platform admin read totals by business, feature, model or day, also as a file — GET /ai-usage with ranges, drill-down and CSV; tests for totals, 403 and CSV — server/routes/admin.js, server/test/ai-usage.test.js
- [ ] A7: Show this month's AI usage per business on the platform dashboard with a per-feature breakdown — model, service method, table, drill-down, CSV button, dictionary keys, spec cases — src/app/pages/platform-dashboard/platform-dashboard.page.ts, .html, .scss, .spec.ts, src/app/core/services/platform-admin.service.ts, src/app/core/models/ai-usage.model.ts, public/assets/data/dictionary.json
- [ ] A8: Record the new collection and route in the backend docs and the server map — docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A9: Run the full checks and hand Dandan the two hand checks — test:server, test:ci, both lints, lint:icons, build, log-query; then the [human] cards

### Plan 548 — Give every business one front desk profile, with a template per business type and the fit rules (`plans/548-front-desk-profile-per-business-with-templates-and-qualification.plan.md`)
- [ ] A1: Define the front desk profile shape once and share the opening-hours row with venues — schema, constants, hours row extracted, registry entry, types — shared/schemas/entities/front-desk-profile.schema.ts, shared/schemas/entities/common.schema.ts, shared/schemas/entities/venue.schema.ts, shared/schemas/entities/index.ts
- [ ] A2: Write the pure fit rules and the local-time helper, with a table test of twenty or more cases — qualify, parseReason, hoursCheck, jerusalemEpoch, weekdayOf — shared/schemas/front-desk/qualify.ts, shared/schemas/front-desk/local-time.ts, server/test/qualify.test.js
- [ ] A3: Add the starting templates for restaurant, private chef, catering and other, with their Hebrew labels — templateFor, WANTED_QUESTION_KEYS, dictionary keys; paste the rendered Hebrew question list into Execution Notes for Dandan — shared/schemas/front-desk-templates.ts, shared/schemas/index.ts, public/assets/data/dictionary.json
- [ ] A4: Store profiles: one per business, owner-only, status and WhatsApp id kept by the server — collection entry, editFrontDesk, OWNER_ONLY_TYPES, generic strip and keep, 409 codes, read projection, indexes — server/constants/collections.js, server/utils/permissions.js, server/routes/generic.js, server/db.js
- [ ] A5: Test the stored profile end to end and keep tenant isolation covered — server/test/front-desk-profile.test.js, server/test/cross-business.test.js, server/test/permissions.test.js
- [ ] A6: Give the app a profile data service and the new permission in its mirror — model, data service + spec, permission service + spec — src/app/core/models/front-desk-profile.model.ts, src/app/core/services/front-desk-profile-data.service.ts, src/app/core/services/front-desk-profile-data.service.spec.ts, src/app/core/services/permission.service.ts, src/app/core/services/permission.service.spec.ts
- [ ] A7: Record the new collection and run every check — standards-backend §1 row; test:server, test:ci, server lint, build, scope-check --arch, log-query — docs/agent/standards-backend.md

### Plan 549 — Store customer requests and bookings on the server: manual request, status moves, lazy expiry (`plans/549-requests-and-bookings-on-the-server-part-1.plan.md`)
- [ ] A1: Define the request and booking shapes once, shared by server and app — enums, schemas, server-field lists, manual input schema, registry, types — shared/schemas/entities/request.schema.ts, shared/schemas/entities/booking.schema.ts, shared/schemas/entities/index.ts
- [ ] A2: Register both collections as read-through-generic, write-through-router, with their indexes and the new member action — collections flag, generic 405 and expiry hook, manageRequests, indexes — server/constants/collections.js, server/routes/generic.js, server/utils/permissions.js, server/db.js
- [ ] A3: Let a member record a phone request that finds or creates the client and checks it against the rules — POST / with upsert, qualify, counters, token, history — server/routes/requests.js, server/app.js
- [ ] A4: Let members move a request's status and edit what the customer wants, only along allowed paths — PUT /:id/status table, PUT /:id/wanted re-qualify, conditional writes — server/routes/requests.js
- [ ] A5: Let members move a booking through confirmed, seated, finished, no-show and cancelled — PUT /:id/status, no-show counter — server/routes/bookings.js, server/app.js
- [ ] A6: Expire stale requests when the list is read, not on a timer — expireDue and the generic GET hook — server/utils/request-expiry.js, server/routes/generic.js
- [ ] A7: Test every move, the manual create, expiry and tenant isolation — server/test/requests-router.test.js, server/test/bookings-router.test.js, server/test/request-expiry.test.js, server/test/cross-business.test.js, server/test/permissions.test.js, server/test/collections.test.js
- [ ] A8: Give the app request and booking data services that call the routers — models, API paths, two services + specs, permission mirror — src/app/core/models/request.model.ts, src/app/core/models/booking.model.ts, src/app/core/services/request-data.service.ts, src/app/core/services/booking-data.service.ts, src/app/core/services/http-storage.adapter.ts, src/app/core/services/permission.service.ts
- [ ] A9: Record the new collections and routes and run every check — standards-backend §1/§5, invariants Touches, breadcrumbs; test:server, test:ci, server lint, build, scope-check --arch, log-query — docs/agent/standards-backend.md, docs/brain/invariants.md, server/breadcrumbs.md

### Plan 550 — Approve or decline a request in one tap: the event or booking is created, the day's load is shown, every decision is logged (`plans/550-approve-or-decline-a-request-with-day-load-and-decision-log.plan.md`)
- [ ] A1: Pin how a new event is created today, before touching that code — owner and staff cases, exact stored fields — server/test/menu-event-create.test.js
- [ ] A2: Move the new-event defaults into one shared builder that the generic create uses — buildNewEventDoc, generic POST calls it, pin test unchanged — server/utils/event-create.js, server/routes/generic.js
- [ ] A3: Add the decision log collection that keeps decisions without customer names — schema, registry, collection entry, index — shared/schemas/entities/decision-log.schema.ts, shared/schemas/entities/index.ts, server/constants/collections.js, server/db.js
- [ ] A4: Approve a request in one call: claim it, create the event or booking, update the client, log the decision — POST /:id/approve with compensation — server/routes/requests.js
- [ ] A5: Decline a request with a reason, and log an ask when a member asks for more details — POST /:id/decline, decline field, ask row on PUT /:id/status — server/routes/requests.js
- [ ] A6: Show a day's bookings and covers per hour for the approve screen — GET /day — server/routes/bookings.js
- [ ] A7: Test approve, decline, ask, idempotency, the day view and that the log holds no personal data — server/test/requests-approve.test.js, server/test/bookings-day.test.js, server/test/requests-router.test.js
- [ ] A8: Let the app approve, decline and read a day's load — RequestDataService approve/decline, BookingDataService day, specs — src/app/core/services/request-data.service.ts, src/app/core/services/booking-data.service.ts
- [ ] A9: Record the routes and run every check — standards-backend §1/§5; test:server, test:ci, server lint, build, scope-check --arch, log-query — docs/agent/standards-backend.md

### Plan 547 — Give clients their own section: list, add, search, filters and a navigation group (`plans/547-clients-get-their-own-section.plan.md`)
- [ ] A1: Add the Front Desk group to the navigation — frontdesk tab group with the clients chip, header link on desktop and phone; update both specs — src/app/core/components/tab-chips/**, src/app/core/components/header/**
- [ ] A2: Build the client list on the shared list frame — rows, columns for owner and staff, search, kind/tag/lifecycle filters, sort, empty states; spec — src/app/pages/clients/components/client-list/**
- [ ] A3: Let the owner add a client from the list — button, window with the shared client form, toast; hidden for staff; spec cases — src/app/pages/clients/components/client-list/**
- [ ] A4: Register the route, the icon and the words — /clients route with the clients resolver, UserPlus, dictionary keys, breadcrumbs — src/app/app.routes.ts, src/app/app.config.ts, public/assets/data/dictionary.json, src/app/pages/breadcrumbs.md
- [ ] A5: Write the two screen checks and run every check — e2e/ui/547-1.spec.ts, e2e/ui/547-2.spec.ts (`signInQa`); test:ci, build, lint, lint:icons, reuse-lint, breadcrumbs-check, log-query

### Plan 552 — Requests queue and bookings agenda: where the business approves what customers ask for (`plans/design/552-requests-queue-and-bookings-agenda.plan.md`)
- [ ] A1: Make sure the page can call every decision route and build a WhatsApp link — add any approve, decline, ask or day method plan 550 left out, waLink with its vectors, specs — src/app/core/services/request-data.service.ts, src/app/core/services/booking-data.service.ts, src/app/core/utils/wa-link.util.ts, src/app/core/utils/wa-link.util.spec.ts
- [ ] A2: Add the requests and bookings pages to the app's navigation — two lazy routes, two tab chips, three new icons, breadcrumbs — src/app/app.routes.ts, src/app/core/components/tab-chips/tab-chips.component.ts, src/app/app.config.ts, src/app/pages/breadcrumbs.md
- [ ] A3: Show the waiting queue with one card per request and its fit verdict — tabs, card, verdict and reasons, answers, empty states — src/app/pages/requests/**
- [ ] A4: Show how full the day already is beside time-bound requests — day load strip with its own loading and error state — src/app/pages/requests/components/day-load-strip/**
- [ ] A5: Let a member approve, ask or decline, with edits before approving — edit mode, approve sequence, ask and decline dialogs, outcome links, conflict and failure handling — src/app/pages/requests/**
- [ ] A6: Let a host type a phone request into the same queue — new request dialog with client picker for owners and name and phone for staff, kind questions, no-profile state — src/app/pages/requests/components/new-request-dialog/**
- [ ] A7: Show approved bookings as a day and week agenda with arrival actions — date navigation, view switch, rows, status buttons, cancel confirm — src/app/pages/bookings/**
- [ ] A8: Show how many requests are waiting on the navigation — badge service, focus refresh, count on the requests chip and the header entry — src/app/core/services/front-desk-badge.service.ts, src/app/core/services/front-desk-badge.service.spec.ts, src/app/core/components/tab-chips/**, src/app/core/components/header/**
- [ ] A9: Add every Hebrew string and register the new pieces — dictionary keys listed above, component families note — public/assets/data/dictionary.json, docs/brain/component-families.md
- [ ] A10: Write the unit specs and the five screen checks, then run the full checks — specs, e2e/ui/552-1..5, test:ci, build, lint, lint:icons, lint:no-native-select, reuse-lint --check-registry, log-query — e2e/ui/552-1.spec.ts, e2e/ui/552-2.spec.ts, e2e/ui/552-3.spec.ts, e2e/ui/552-4.spec.ts, e2e/ui/552-5.spec.ts

### Plan 553 — Front desk settings: one screen where the owner sets up how customers reach the business (`plans/553-front-desk-settings-screen.plan.md`)
- [ ] A1: Add the front desk settings page, its route and its tab chip — lazy route with both guards, the settings chip, the Settings icon, page skeleton with load / error / staff states — src/app/pages/frontdesk/frontdesk-settings/**, src/app/app.routes.ts, src/app/core/components/tab-chips/tab-chips.component.ts, src/app/app.config.ts
- [ ] A2: Let the owner choose the business type once and create the profile from its template — type picker, name, slug check, create, slug-taken error — src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.*
- [ ] A3: Build the business-and-link and opening-hours cards — details fields, copy-link button and toast, hours editor, closed dates — src/app/pages/frontdesk/frontdesk-settings/**
- [ ] A4: Build one card per request kind with its questions and rules — enable toggle, question rows with move and remove, 12-question limit, rules fields and range check — src/app/pages/frontdesk/frontdesk-settings/components/request-kind-card/**
- [ ] A5: Build the assistant and status cards — read-only level and status, tone, greeting, handoff text, active hours — src/app/pages/frontdesk/frontdesk-settings/**
- [ ] A6: Save, discard and leave safely — one save without server-owned fields, field errors from the server, discard with confirm, leave guard — src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.*
- [ ] A7: Add every Hebrew string and the folder maps — dictionary keys listed above, breadcrumbs files — public/assets/data/dictionary.json, src/app/pages/frontdesk/breadcrumbs.md, src/app/pages/breadcrumbs.md
- [ ] A8: Write the unit specs and the three screen checks, then run the full checks — page and kind-card specs, e2e/ui/553-1..3, test:ci, build, lint, lint:icons, reuse-lint --check-registry, log-query — e2e/ui/553-1.spec.ts, e2e/ui/553-2.spec.ts, e2e/ui/553-3.spec.ts

### Plan 554 — Knowledge base: what the business knows about itself, with a fast import (`plans/554-knowledge-base-what-the-business-knows-about-itself.plan.md`)
- [ ] A1: Add the knowledge item as a new business-owned record only the owner may change — schema, registry, collection entry, owner-only type, cross-business body — shared/schemas/entities/knowledge-item.schema.ts, shared/schemas/entities/index.ts, server/constants/collections.js, server/utils/permissions.js, server/test/cross-business.test.js
- [ ] A2: Build the one fact source the assistant will read, in a fixed order and size — profile facts first, approved public items by topic, 6,000-character cap at a whole line — server/services/knowledge.js, server/test/knowledge.test.js
- [ ] A3: Let the owner approve many drafts in one request — the approve route, mounted; tests for scope, staff and limits — server/routes/knowledge.js, server/app.js, server/test/knowledge.test.js
- [ ] A4: Turn a pasted text or a web page into draft facts with one metered AI call — English prompt, text-or-link checks, 60-item cap, schema check per item — server/services/knowledge-import-prompt.js, server/routes/ai.js, server/test/knowledge-import.test.js
- [ ] A5: Give the screen a data service that loads, imports and approves — model and service with spec — src/app/core/models/knowledge-item.model.ts, src/app/core/services/knowledge-item-data.service.ts, src/app/core/services/knowledge-item-data.service.spec.ts
- [ ] A6: Build the knowledge screen grouped by topic with add, edit, import and bulk approve — page, dialogs, route, chip, dictionary keys, spec — src/app/pages/frontdesk/knowledge/**, src/app/app.routes.ts, src/app/core/components/tab-chips/tab-chips.component.ts, src/app/core/components/tab-chips/tab-chips.component.spec.ts, public/assets/data/dictionary.json
- [ ] A7: Prove an owner can add a fact on the real screen — one e2e test that saves a screenshot — e2e/ui/554-1.spec.ts
- [ ] A8: Record the new collection, routes and screen in the docs and maps — docs/agent/standards-backend.md, server/breadcrumbs.md, src/app/pages/frontdesk/breadcrumbs.md, docs/brain/component-families.md
- [ ] A9: Run the full checks and hand Dandan the import check — test:server, test:ci, lints, reuse registry, build, log-query; then the [human] card

### Plan 567 — Optional "before" numbers: kitchen and front desk estimates the owner may skip (`plans/567-optional-before-numbers-kitchen-and-front-desk-estimates.plan.md`)
- [ ] A1: Let the baseline hold eleven more optional estimates, and name the field groups once — schema fields with ranges, the three field-list constants — shared/schemas/entities/business.schema.ts
- [ ] A2: Keep the dashboard cards comparing only their four numbers — import the card list into business-stats instead of the literal — server/services/business-stats.js
- [ ] A3: Prove the server stores the new fields, refuses bad ones and leaves the cards alone — round trip, 400 on 120%, kitchen-only keeps hasBaseline false — server/test/business-baseline.test.js
- [ ] A4: Show the new estimates in two closed groups on the baseline tab — group buttons, hints, fields, filledAt and canSave over all fields, dictionary keys — src/app/pages/settings/components/baseline-tab/**, public/assets/data/dictionary.json
- [ ] A5: Test the tab and the save flow — component spec cases, one e2e card — src/app/pages/settings/components/baseline-tab/baseline-tab.component.spec.ts, e2e/ui/567-1.spec.ts
- [ ] A6: Note the new fields in the backend docs and run every check — standards-backend line; test:server, test:ci, build, lint, lint:icons, log-query — docs/agent/standards-backend.md

### Plan 557 — The platform admin moves a front desk between draft, pilot, active and suspended; the owner exports clients, requests and bookings (`plans/557-front-desk-status-by-the-platform-admin-and-csv-export.plan.md`)
- [ ] A1: Let the profile and business keep the admin's changes and reasons — adminHistory, frontDeskPlan, the admin body schema, level and history kept on owner writes — shared/schemas/entities/front-desk-profile.schema.ts, shared/schemas/entities/business.schema.ts, shared/schemas/front-desk-admin.schema.ts, shared/schemas/index.ts, server/routes/generic.js
- [ ] A2: Give the platform admin one route to set status, assistant level and plan with a reason — server/routes/admin.js
- [ ] A3: Test the route, the owner-write guard and that a suspended page is closed but its data still readable — server/test/front-desk-status.test.js
- [ ] A4: Let the platform admin change a business's front desk from the platform page — row status and level, the dialog and its service call — src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts, src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts, src/app/pages/platform-dashboard/components/front-desk-admin-dialog/**, src/app/core/services/platform-admin.service.ts
- [ ] A5: Tell members when their front desk is suspended — the shared banner on the dashboard and the settings page — src/app/shared/front-desk-status-banner/**, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts, src/app/pages/frontdesk/frontdesk-settings/**
- [ ] A6: Let the owner download clients, requests and bookings as files Excel opens in Hebrew — CSV helper and the export card — src/app/core/utils/csv.util.ts, src/app/core/utils/csv.util.spec.ts, src/app/pages/frontdesk/frontdesk-settings/**
- [ ] A7: Add the words, icon, registry and docs rows, the download check, and run every check — public/assets/data/dictionary.json, src/app/app.config.ts, docs/brain/component-families.md, docs/agent/standards-backend.md, src/app/pages/frontdesk/breadcrumbs.md, e2e/ui/557-1.spec.ts

### Plan 558 — Privacy and go-live: erase a customer by phone, keep data only as long as needed, and the go-live docs (`plans/558-privacy-erase-by-phone-retention-and-go-live-docs.plan.md`)
- [ ] A1: Work out everything to erase for one person in one business, without touching anything yet — planErase and parseArgs with unit tests — server/scripts/erase-client.js, server/test/erase-client.test.js
- [ ] A2: Run the erase as a dry run by default and apply it only with the write flag — runErase, connect, counts-only output, integration test on the in-memory database — server/scripts/erase-client.js, server/test/erase-client.test.js
- [ ] A3: Clear old requests, bookings and messages on their own when the lists are read — the retention job, its throttle and the generic read hook — server/jobs/retention.js, server/routes/generic.js, server/test/retention.test.js
- [ ] A4: Write the go-live section on the public door, limits, retention, erase and keeping the server awake — docs/security-go-live.md
- [ ] A5: Document the new environment settings without any value — render.yaml, server/.env.example
- [ ] A6: Draft the one-page Hebrew pilot terms for the lawyer — docs/frontdesk/pilot-terms-draft.md
- [ ] A7: Record the new job and script in the backend docs and the server map, then run every check — docs/agent/standards-backend.md, server/breadcrumbs.md

### Plan 568 — Business report: where the business stands and how it moved since it started with FoodVibe (`plans/design/568-business-report-measured-start-vs-latest-printable.plan.md`)
- [ ] A1: Pin the report numbers with a fixture before writing the code — 8 events over 3 months, expected series, windows, findings, the 2-event case, no-baseline case, access cases — server/test/business-report.test.js
- [ ] A2: Compute the report on the server from measured events only — metric list and thresholds, monthly series, start and latest windows, baseline mapping, rule findings — server/services/business-report.js, server/constants/report.js
- [ ] A3: Serve the report to the owner and to the platform admin only — GET /stats/report with months, businessId and the 400/403/404 answers — server/routes/stats.js
- [ ] A4: Let the app fetch the report — model type, getReport on the stats service, API path — src/app/core/models/business-report.model.ts, src/app/core/services/business-stats.service.ts, src/app/core/services/http-storage.adapter.ts
- [ ] A5: Build the report page with the since-we-started strip, estimates column, trend and findings — lazy route, period radios, not-enough and too-early states, empty state, dictionary keys — src/app/pages/report/**, src/app/app.routes.ts, public/assets/data/dictionary.json
- [ ] A6: Make the report print on one A4 page — component print layout and one appended global print block — src/app/pages/report/report.page.scss, src/styles.scss
- [ ] A7: Link the report from the dashboard card and from each business on the platform page — business-performance link, platform row link — src/app/pages/dashboard/components/business-performance/**, src/app/pages/platform-dashboard/platform-dashboard.page.html
- [ ] A8: Test the page and the two entry points, update the docs, run every check — report.page.spec.ts, two e2e cards, standards-backend row, breadcrumbs; test:server, test:ci, build, lint, lint:icons, log-query — e2e/ui/568-1.spec.ts, e2e/ui/568-2.spec.ts, docs/agent/standards-backend.md, src/app/pages/breadcrumbs.md

### Plan 559 — Front desk numbers for the owner and the platform admin (`plans/559-front-desk-numbers-for-the-owner-and-the-platform-admin.plan.md`)
- [ ] A1: Pin the front desk numbers with seeded requests before writing the code — two businesses, test requests, after-hours cases, decision log, bookings, events from requests, access cases — server/test/frontdesk-stats.test.js
- [ ] A2: Compute the front desk numbers on the server, never counting test requests — the service with its after-hours helper and baseline twins — server/services/frontdesk-stats.js, server/services/business-stats.js
- [ ] A3: Serve the numbers to the owner and to the platform admin, also as a file — owner route with range and businessId; admin route with rows and CSV; admin tests — server/routes/stats.js, server/routes/admin.js, server/test/admin-frontdesk-stats.test.js
- [ ] A4: Show this week's front desk numbers as a card on the dashboard — model, service method, card, mount, dictionary keys, spec — src/app/core/models/frontdesk-stats.model.ts, src/app/core/services/business-stats.service.ts, src/app/pages/dashboard/components/frontdesk-week-card/**, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html, public/assets/data/dictionary.json
- [ ] A5: Add the front desk block to the business report — section, estimates beside measured numbers, spec cases — src/app/pages/report/**
- [ ] A6: Give the platform admin the numbers per business and the download — three columns, CSV button, service method — src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts, src/app/core/services/platform-admin.service.ts
- [ ] A7: Test the dashboard card end to end, update the docs, run every check — one e2e card, standards-backend rows; test:server, test:ci, build, lint, lint:icons, log-query — e2e/ui/559-1.spec.ts, docs/agent/standards-backend.md

### Plan 545 — One find-or-create of a client by phone, so one person is one client on every channel (`plans/545-one-find-or-create-of-a-client-by-phone.plan.md`)
- [ ] A1: Write down the phone examples both sides must agree on — the vectors file with the seven rows — shared/schemas/testing/phone-vectors.ts
- [ ] A2: Put the one find-or-create in a server file and let the database guarantee one live client per phone — client-upsert.js helpers, liveKey in the schema and the server-field list, the unique partial index — server/utils/client-upsert.js, shared/schemas/entities/client.schema.ts, server/db.js
- [ ] A3: Test it alone — vectors, five parallel calls, a trashed match not revived, other business never matched, bad phone refused — server/test/client-upsert.test.js
- [ ] A4: Make the owner's add, phone change, delete and restore of a client use the same rule — POST 200/201, PUT 409, liveKey unset on delete, restore and restore-all checks — server/routes/generic.js, server/test/clients.test.js
- [ ] A5: Keep each client's event count and event-client kind right whenever an event moves, is deleted or comes back — refreshClientEvents calls in the event write paths and their tests — server/routes/generic.js, server/test/clients.test.js
- [ ] A6: Use the same phone rule in the browser and tell the owner when a phone already exists or a restore is refused — util re-export, addClient replace and toast, Trash refusal toast, dictionary keys, specs — src/app/core/utils/client-display.util.ts, src/app/core/utils/client-display.util.spec.ts, src/app/core/services/client-data.service.ts, src/app/core/services/client-data.service.spec.ts, src/app/core/services/trash.service.ts, src/app/core/services/trash.service.spec.ts, public/assets/data/dictionary.json
- [ ] A7: Note the new behaviour in the backend contract and add the ui test — the §5 sentence, the inquiry-dialog spec — docs/agent/standards-backend.md, e2e/ui/545-1.spec.ts
- [ ] A8: Run every check — test:server, test:ci, server lint, build, scope-check --arch, log-query, the ui spec

### Plan 546 — One shared client picker instead of two copies inside the menu screens (`plans/546-one-shared-client-picker.plan.md`)
- [ ] A1: Pin today's client behaviour in both hosts before moving anything — run the dialog and stage-bar specs green and note which cases cover picking, adding, clearing and Escape — src/app/pages/menu-library/components/new-inquiry-dialog/new-inquiry-dialog.component.spec.ts, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
- [ ] A2: Build the shared add-client form with today's fields and checks — inputs initialName/initialPhone, outputs saved/cancelled, addClient, error toasts; spec — src/app/shared/client-form/**
- [ ] A3: Build the shared client picker on the search box, with the selected name inside the field — selected/picked/cleared/addingChange/back(), owner add row, staff ask-owner line; spec covers pick, clear, add with typed name or phone, staff without add, Escape one step back — src/app/shared/client-picker/**
- [ ] A4: Move the new-inquiry dialog to the shared folder and let it use the picker — delete its own client code, title swap and one-step Escape through the picker; fix the menu library import; move and update the spec — src/app/shared/new-inquiry-dialog/**, src/app/pages/menu-library/components/new-inquiry-dialog/**, src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts
- [ ] A5: Let the event stage bar use the same picker and simplify its client row — picker in the existing block, delete its own search code, client row per Q1; update the spec — src/app/pages/menu-intelligence/components/event-stage-bar/**
- [ ] A6: Register the new family and refresh the folder maps — client-picker family, search-combobox users, breadcrumbs — docs/brain/component-families.md, src/app/shared/breadcrumbs.md, src/app/pages/breadcrumbs.md
- [ ] A7: Write the two screen checks and run every check — e2e/ui/546-1.spec.ts, e2e/ui/546-2.spec.ts (`signInQa` from e2e/helpers/qa-session.ts, `createQaEvent` for 546-2); test:ci, build, lint, reuse-lint, breadcrumbs-check, line counts, log-query

### Plan 551 — Client profile with one timeline of requests, bookings and events, and merging duplicates (`plans/551-client-profile-timeline-and-merge.plan.md`)
- [ ] A1: Add a server router for merging duplicates and for do-not-contact — merge in one request with the re-key order, counters and unions, conditional stamp; do-not-contact on/off rules; mount; tests — server/routes/clients.js, server/app.js, server/test/clients-router.test.js
- [ ] A2: Refuse to bring a merged client back from Trash — restore 409 CLIENT_MERGED and restore-all skip; tests; Trash page toast — server/routes/generic.js, server/test/clients-router.test.js, src/app/pages/trash/**
- [ ] A3: Record the new router in the rules and docs — INV-1 Touches, backend §5 rows, server breadcrumbs — docs/brain/invariants.md, docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A4: Let the browser call merge and do-not-contact and refresh what moved — mergeClient, setDoNotContact, reloads; spec — src/app/core/services/client-data.service.ts, src/app/core/services/client-data.service.spec.ts
- [ ] A5: Build the client profile header, owner details and one-tap call and WhatsApp — route, header, details card, edit window through the shared form in edit mode, tags editor; spec — src/app/pages/clients/components/client-profile/**, src/app/shared/client-form/**
- [ ] A6: Show one timeline of the client's requests, bookings, events and notes — newest first, links to events, empty state; spec cases — src/app/pages/clients/components/client-profile/**
- [ ] A7: Add the profile actions: new inquiry, merge a duplicate, do not contact — dialog with the client picked, merge picker + confirm + navigate, reason window; spec cases — src/app/pages/clients/components/client-profile/**, src/app/shared/new-inquiry-dialog/**
- [ ] A8: Link the client list rows and the event screen's client chip to the profile — src/app/pages/clients/components/client-list/**, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.html, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.ts, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
- [ ] A9: Register icons and words, update the family list, write the screen checks and run every check — app.config.ts, dictionary.json, component-families.md (client-picker family: edit mode, initialClient, allowAdd), e2e/ui/551-1.spec.ts, e2e/ui/551-2.spec.ts; test:server, test:ci, server lint, build, lint, lint:icons, reuse-lint, scope-check --arch, log-query

### Plan 555 — Public request page: customers send a request from one link, without an account (`plans/design/555-public-request-page.plan.md`)
- [ ] A1: Define what a stranger may send and which profile fields they may see — public input schema, guest scope, public profile view — shared/schemas/public/**, shared/schemas/index.ts, server/utils/business-scope.js, server/utils/public-profile.js, server/test/business-scope-util.test.js
- [ ] A2: Give manual and public requests one creation path — reuse or move plan 549's create logic with stamps passed in, manual route tests unchanged — server/utils/request-create.js, server/routes/requests.js
- [ ] A3: Add the four public routes behind the limiter and honeypot — profile view, answer check, send, read by token, cancel by token, error codes — server/routes/public.js, server/test/public-requests.test.js
- [ ] A4: Keep phone numbers and tokens out of every log — URL masking on the server and in the browser log, log capture tests — server/utils/redact-url.js, server/app.js, server/test/redact-url.test.js, src/app/core/services/logging.service.ts, src/app/core/services/logging.service.spec.ts
- [ ] A5: Let the pilot profile go live before the admin switch exists — status script with a local default target — server/scripts/set-front-desk-status.js
- [ ] A6: Show public pages without the app's header, tabs and quick-add button — layout signal from route data, shell wrap, specs — src/app/core/services/layout-mode.service.ts, src/app/core/services/layout-mode.service.spec.ts, src/app/appRoot/app.component.html, src/app/appRoot/app.component.ts, src/app/appRoot/app.component.spec.ts
- [ ] A7: Build the request form in three steps with a done page — kind, details with the rule note, contact and consent, send, errors, reference, status link, WhatsApp link, footer — src/app/pages/public-request/**, src/app/core/services/http-storage.adapter.ts, src/app/core/utils/wa-link.util.ts, src/app/app.routes.ts
- [ ] A8: Build the guest's own status page with cancel — status wording, booking details, cancel with confirm, not found — src/app/pages/public-request/public-request-status/**
- [ ] A9: Add every Hebrew string and record the new routes and pieces — dictionary keys, backend standards rows, breadcrumbs, families — public/assets/data/dictionary.json, docs/agent/standards-backend.md, server/breadcrumbs.md, src/app/pages/breadcrumbs.md, docs/brain/component-families.md
- [ ] A10: Write the screen checks and run the full checks — e2e/ui/555-1..3, test:server, test:ci, build, lint, server lint, lint:icons, lint:no-native-select, scope-check --arch, log-query — e2e/ui/555-1.spec.ts, e2e/ui/555-2.spec.ts, e2e/ui/555-3.spec.ts

### Plan 556 — Onboarding intake form and a front desk checklist for each business type (`plans/556-onboarding-intake-form-and-front-desk-checklist.plan.md`)
- [ ] A1: Let the server compute what the front desk still needs, per business type — the checklist service, setup-status frontDesk block, admin row — server/services/front-desk-setup.js, server/routes/business.js, server/routes/admin.js, server/test/front-desk-setup.test.js
- [ ] A2: Save the whole intake form in one request — the strict intake schema and the intake route (profile, knowledge drafts, optional baseline) — shared/schemas/front-desk-intake.schema.ts, shared/schemas/index.ts, server/routes/business.js, server/test/front-desk-intake.test.js
- [ ] A3: Make a test request that adds no customer and creates nothing when approved — the test flag on the manual body, the test branches in create, approve, decline and ask — shared/schemas/entities/request.schema.ts, server/routes/requests.js, server/test/front-desk-intake.test.js
- [ ] A4: Build the intake page with a section for each business type — route, form, field map, baseline group, print rules — src/app/pages/frontdesk/frontdesk-onboarding/**, src/app/pages/frontdesk/breadcrumbs.md, src/app/app.routes.ts, src/styles.scss
- [ ] A5: Add the test-request button and the save, print and skipped-answers messages — src/app/pages/frontdesk/frontdesk-onboarding/**
- [ ] A6: Show the checklist to the owner on the dashboard and to the platform admin — checklist card, SetupStatus type, platform column — src/app/pages/dashboard/components/front-desk-checklist-card/**, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts, src/app/core/services/business.service.ts, src/app/core/services/platform-admin.service.ts, src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts
- [ ] A7: Add the words and icons the screens use — dictionary keys, icon registration — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] A8: Write the two screen checks and the backend docs row, then run every check — e2e/ui/556-1.spec.ts, e2e/ui/556-2.spec.ts, docs/agent/standards-backend.md
