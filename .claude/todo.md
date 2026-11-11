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

### Plan 523 — Event logistics 6 of 6: let a business add and remove its own checklist questions in the Metadata Manager
- [x] C1: Build the manager that lists shared and own logistics questions and adds or removes own ones — component class per the Angular skill: OnPush, `inject()` (`TaxonomyStore`, `LogisticsItemRegistryService`, `ConfirmModalService`, `UserMsgService`, `TranslationService`, `UserService.isLoggedIn`, `AuthModalService`), signals `phase_`, `draft_` (text, phase, section, answerType, environments, shared), `error_`, computed `sections_` (grouped rows for the selected phase) — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [x] C2: Write the card template — tabs, grouped rows (locked tag vs removable chip), the add form, the empty state per section — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.html
- [x] C3: Style the card like its siblings, mobile first — component-local SCSS, breakpoint mirror, no new `.c-*` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.scss
- [x] C4: Mount the card and give it a rail entry — the tag after `app-station-manager`, the import and `imports` entry, the `_allJumpSections` line — src/app/pages/metadata-manager/metadata-manager.page.component.html, src/app/pages/metadata-manager/metadata-manager.page.component.ts
- [x] C5: Unit-test the card with a stubbed store — `TaxonomyStore.terms('logisticsItem')` returns 1 shared + 1 own item; `isShared`, `isAdmin_` (false), `add` / `remove` spies: the shared row has the lock and no remove control; the own row has the remove control; submitting "חדש" with section `access` calls `add` with `{ phase: 'intake', section: 'access', answerType: 'status' }` and no `environments`; submitting with two environment chips checked passes `environments: ['outdoor_field', 'client_home']`; submitting the shared item's key again sets `error_` and does not call `add`; remove → confirm spy resolves true → `remove` called; `remove` rejecting with the server's in-use error → toast `metadata_logistics_in_use` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts
- [x] C6: Add the Hebrew strings and the icons — the keys above, `Lock` and `ListChecks` — public/assets/data/dictionary.json, src/app/app.config.ts
- [x] C7: Record the new piece in the maps — docs/brain/component-families.md (chip family Users), src/app/pages/breadcrumbs.md
- [x] C8: Write one e2e spec per UI card with the plan-517 helpers — `signInQa`, `page.goto('/metadata-manager')`, the card's action, the assertion, screenshot `screens/523-<n>.png`; 523-3 removes what 523-2 added and both clean up in `finally` by deleting any own `logisticsItem` named "בדיקה E2E" through `DELETE /api/v1/data/taxonomyTerms/:id`; run each with `node scripts/e2e-one.mjs e2e/ui/523-<n>.spec.ts` — e2e/ui/523-1.spec.ts … e2e/ui/523-3.spec.ts
- [x] C9: Run build, lint, lint:icons, lint:no-native-select, test:ci, reuse-lint and paste the outputs under Execution Notes

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

### Plan 570 — Keep the logistics panel's buttons out from under the price bar on wide screens (`plans/570-logistics-panel-not-hidden-under-the-price-bar.plan.md`)
- [x] A1: Leave room for the price bar on every wide screen, not only up to 1030 px — widen the plan 494 media query — src/app/pages/menu-intelligence/menu-intelligence.page.scss
- [x] A2: Point the three logistics-card checks at the page that really shows the card — goto /dashboard?tab=metadata — e2e/ui/523-1.spec.ts, e2e/ui/523-2.spec.ts, e2e/ui/523-3.spec.ts
- [x] A3: Add a laptop-size check that the logistics card opens with the price bar showing — e2e/ui/570-1.spec.ts
- [ ] A4: Run the ten screen checks against the slot's app, then build, lint and log-query

### Run 522 — hand checks left open after merge (PR #545, agreed 2026-11-10)
- [x] V1: The closed logistics card reads as one header line on a phone-size window and opens on one tap — /menu-intelligence/e0df992a-399f-428c-a5c1-b37157ab4f59
- [x] V2: Each logistics question reads as one block on a phone-size window, with no sideways scroll — same event
- [x] V3: A staff member sees the logistics card as read-only — same event, signed in as staff
- [x] V4: The logistics questions card stacks and wraps on a phone-size window — /dashboard?tab=metadata
- [x] V5: The owner adds their own question "בדיקת קידום" — /dashboard?tab=metadata
- [x] V6: The platform admin sees "בדיקת קידום" with the business name — /platform
- [x] V7: Promoting it shows the toast, removes the row, and the owner sees it locked — /platform

### Run fd-1a-data — hand checks left open (PR #547)
- [ ] W1: ADR 0030 and the new INV-1 sentence say what was approved on 2026-11-10 — docs/brain/decisions/0030-guest-writes-have-one-door.md
- [ ] W2: Atlas migration 0011 run by the Human: backup, dry run, write, verify prints "verify: ok" — after PR #547 merges
- [ ] W3: The three front desk templates' Hebrew questions and limits fit catering, private chef and restaurant — plan 548 Execution Notes
- [ ] W4: The platform AI-usage table shows this month's calls, tokens and cost per business — /platform
- [ ] W5: One real AI call's tokens match Google AI Studio for that minute — /platform and AI Studio
- [ ] W6: The map's Contract extensions don't contradict any decision — docs/frontdesk/frontdesk-map.md
- [ ] W7: On a laptop screen the event screen's last card is fully above the price bar — event screen
- [ ] W8: The 12 screen specs of runs 522 and fd-1a-data pass against the merged app — Planner runs them in wt-2

### Plan 571 — One product name, foodCo, and its own app icon instead of the Angular logo (`plans/571-one-product-name-foodco-and-its-own-app-icon.plan.md`)
- [ ] A1: Show the name foodCo in the browser tab and in the installed app — title, apple title, theme colour, apple icon link; manifest name, short name and two colours — src/index.html, public/manifest.webmanifest
- [ ] A2: Say foodCo in the two sentences and the logo label that still use an old name — two dictionary values, the mark's label and title — public/assets/data/dictionary.json, public/assets/style/img/fc-mark.svg
- [ ] A3: Add a script that draws every app icon from the design's own pot mark — Playwright Chromium renders Art A and Art B, the script writes the ICO container — tools/brand-icons/make-icons.mjs
- [ ] A4: Replace the ten Angular icon files with the pot mark — run the script once and commit its output — public/icons/**, public/favicon.ico
- [ ] A5: Add two checks that fail if an old name or an Angular icon comes back — sizes, ICO header, old md5 values; the name search — tools/brand-icons/check-icons.mjs, tools/brand-icons/check-names.mjs
- [ ] A6: Run the two checks, build, lint, the unit tests and the log query, and paste the output lines under Execution Notes

### Plan 572 — The Pass theme tokens: brand teal, lamp amber, paper colours and a guest typeface (`plans/572-the-pass-theme-tokens-brand-teal-lamp-amber-paper-colours-and-a-guest-typeface.plan.md`)
- [ ] A1: Make buttons, links and active states the logo's teal so white text on them is readable — two token values and the comment in the light root block — src/styles.scss
- [ ] A2: Add the lamp colour, the guest typeface and the paper palette as tokens — thirteen new tokens in the light block, the lamp in the kitchen block — src/styles.scss
- [ ] A3: Add one shared class for exact-looking numbers and one for the amber ready line — two engine classes at the end of the file, registered in the family list — src/styles.scss, docs/brain/component-families.md
- [ ] A4: Make the menu paper read its colours from the tokens instead of typed values — the eleven value swaps, nothing else — src/app/pages/menu-intelligence/_paper-ui.scss, src/app/pages/menu-intelligence/_toolbar.scss
- [ ] A5: Set the menu title and section titles in a real Hebrew serif — two font-family lines and the font link — src/app/pages/menu-intelligence/_paper-ui.scss, src/index.html
- [ ] A6: Add a check that fails if a theme token is lost or a typed colour returns to the paper files — tools/theme/check-tokens.mjs
- [ ] A7: Write the theme into the design notes so the next design port follows it — system.md tokens and The Pass rules, divergence 7 — .interface-design/system.md, .interface-design/divergences.md
- [ ] A8: Run the token check, build, lint, the unit tests, the registry check and the log query, and paste the output lines under Execution Notes

### Plan 573 — Light the lamp on the price bar when an event meets its profit target, and line up its numbers (`plans/573-light-the-lamp-on-the-price-bar-when-an-event-meets-its-profit-target.plan.md`)
- [ ] A1: Keep every number of the price bar at a fixed width while digits change — the shared digits class on seven number elements — src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.html
- [ ] A2: Show the amber ready line under the profit percent only when the price meets the target — one class binding on the bar value and one on the phone sheet summary — src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.html
- [ ] A3: Test that the line appears on target, disappears below it, and the digits class is on every number — three cases — src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.spec.ts
- [ ] A4: Run build, lint, the unit tests and the log query, and paste the output lines under Execution Notes

### Plan 574 — A welcome screen: a first-time visitor sees the promise and a way in, not an empty dashboard (`plans/574-a-welcome-screen-for-first-time-visitors.plan.md`)
- [ ] A1: Remember on the device that someone has signed in here, and forget it on sign-out — the util with its spec; two lines in the user service with three spec cases — src/app/core/utils/returning-visitor.util.ts, src/app/core/utils/returning-visitor.util.spec.ts, src/app/core/services/user.service.ts, src/app/core/services/user.service.spec.ts
- [ ] A2: Decide where the site's bare address leads: welcome for a first-time visitor, dashboard for everyone else — the redirect function and the guard, each with its spec — src/app/pages/welcome/home-redirect.ts, src/app/pages/welcome/home-redirect.spec.ts, src/app/core/guards/welcome.guard.ts, src/app/core/guards/welcome.guard.spec.ts
- [ ] A3: Build the welcome screen with the mark, the promise, two buttons and the three rooms — the page's four files — src/app/pages/welcome/welcome.page.ts, src/app/pages/welcome/welcome.page.html, src/app/pages/welcome/welcome.page.scss, src/app/pages/welcome/welcome.page.spec.ts
- [ ] A4: Add the ten Hebrew texts of the welcome screen — public/assets/data/dictionary.json
- [ ] A5: Connect the screen to the address bar — the welcome route and the one rewritten home entry — src/app/app.routes.ts
- [ ] A6: Hide the floating add button on the welcome screen — one signal, one wrapper, one spec case — src/app/core/components/hero-fab/hero-fab.component.ts, src/app/core/components/hero-fab/hero-fab.component.html, src/app/core/components/hero-fab/hero-fab.component.spec.ts
- [ ] A7: Record the new page, guard and util in the folder maps — src/app/pages/breadcrumbs.md, src/app/core/breadcrumbs.md
- [ ] A8: Run build, lint, the icon lint, the unit tests, the breadcrumbs check and the log query, and paste the output lines under Execution Notes

### Plan 575 — Seed one demo catering business into a local database so every demo starts with full screens (`plans/575-seed-one-demo-catering-business-into-a-local-database.plan.md`)
- [ ] A1: Write the demo business's data as one pure builder so it can be tested without a database — suppliers, products, recipes, dishes, venues, clients, events with their money, usage days, baseline — server/scripts/lib/demo-data.js
- [ ] A2: Add the command that writes that data into a local database, safely and only once — arguments, local-only refusal, password from the environment, validate then insert what is missing — server/scripts/seed-demo-business.js
- [ ] A3: Test the data's shape and links, the money formula, the dashboard numbers, the second run and the local-only rule — server/test/seed-demo-business.test.js
- [ ] A4: List the new command in the server map — server/breadcrumbs.md
- [ ] A5: Run the server tests, the server lint, the build and the log query, and paste the output lines under Execution Notes

### Plan 576 — Polish The Pass theme (`plans/576-polish-the-pass-theme-welcome-underline-on-phones-cook-view-logo-and-the-sign-in-window.plan.md`)
- [ ] A1: Put one amber line under the whole welcome promise on a phone — block the highlighted span and balance its lines — src/app/pages/welcome/welcome.page.scss, src/app/pages/welcome/welcome.page.spec.ts
- [ ] A2: Show the logo in light colour while Cook View is open — one kitchen rule next to the existing kitchen rules, and the check that guards it — src/styles.scss, tools/theme/check-tokens.mjs
- [ ] A3: Open the sign-in and sign-up windows with the mark, the name and a heading — one block, its styles and two spec cases — src/app/core/components/auth-modal/auth-modal.component.html, src/app/core/components/auth-modal/auth-modal.component.scss, src/app/core/components/auth-modal/auth-modal.component.spec.ts
- [ ] A4: Run the theme check, build, lint, the icon lint, the unit tests and the log query, and paste the output lines under Execution Notes
### Logistics feedback — Human 2026-11-11, to plan next (plan 571; Critical Questions for the unclear points)
- [x] W1: ADR 0030 and the new INV-1 sentence say what was approved on 2026-11-10 — docs/brain/decisions/0030-guest-writes-have-one-door.md — checked by the Planner at the Human's request 2026-11-11: pass
- [x] W2: Atlas migration 0011 run by the Human: backup, dry run, write, verify prints "verify: ok" — after PR #547 merges — Human 2026-11-11: backup atlas-2026-11-11T14-40-06, 0 clients patched, "verify: ok"
- [x] W3: The three front desk templates' Hebrew questions and limits fit catering, private chef and restaurant — plan 548 Execution Notes — checked by the Planner at the Human's request 2026-11-11: pass
- [x] W4: The platform AI-usage table shows this month's calls, tokens and cost per business — /platform
- [x] W5: One real AI call's tokens match Google AI Studio for that minute — /platform and AI Studio
- [x] W6: The map's Contract extensions don't contradict any decision — docs/frontdesk/frontdesk-map.md — checked by the Planner at the Human's request 2026-11-11: pass
- [x] W7: On a laptop screen the event screen's last card is fully above the price bar — event screen
- [ ] W8: The 12 screen specs of runs 522 and fd-1a-data pass against the merged app — Planner runs them in wt-2 — Planner 2026-11-11: 11 of 12 pass; 544-1 fails because the spec never clicks the "לשחזר פריט זה?" confirm (the app restores fine, API 200) — fix the spec (A5), then re-run
- [ ] A5: Fix e2e/ui/544-1.spec.ts — after the row's "שחזר מהאשפה" click, confirm in the modal before expecting the row to leave

### Logistics feedback — Human 2026-11-11 → plans 579 (F2, F5-F7, F10, A5), 581 (F1-F4, F8, F9), 580 (B1-B5)
- [ ] F1: Owners and the platform admin can remove logistics questions, like recipes — admin adds or removes for everybody or only himself; an owner only for his business
- [ ] F2: A remove icon beside each question in the metadata card and on each event screen — event screen removes for that event only; metadata removes from the business's default list for new events — A: (Human, 2026-11-11) on one event: hide it, keep the answer; admin "remove for everybody": only future events
- [ ] F3: Adding a question in metadata asks which environments it is for — all environment chips start selected; no separate "relevant to everybody" button — A: (Human, 2026-11-11) yes; admin picks "רק לעסק שלי" (default) or "לכל העסקים"
- [ ] F4: Owners and the admin can add logistics sections (metadata_logistics_section), same everybody / only-me rule — A: (Human, 2026-11-11) businesses only add their own sections; shared ones stay locked
- [ ] F5: Status chips — drop the default "unchecked" chip; status becomes one "needed" toggle that opens the payer options — A: (Human, 2026-11-11)
- [ ] F6: Payer chips — rename "ללקוח" to "customer provides", add "provided by us", default "provided by us", exactly one always selected — A: (Human, 2026-11-11) one "needed" toggle; when on, two options: "עלינו" (default) / "באחריות הלקוח"; the client summary lists the "באחריות הלקוח" items; no separate ללקוח checkbox
- [ ] F7: Make the logistics chips smaller and tighter so they take as little space as they can and still look right

### Plan 577 — Depth theme: solid white surfaces, layered shadows, filled inputs and status dots across the app (`plans/577-depth-theme-solid-white-surfaces-layered-shadows-filled-inputs-and-status-dots.plan.md`)
- [ ] A1: Put the app's content on white surfaces over a flat tinted page — surface, border, text, radius and shadow token values; the page wash removed — src/styles.scss
- [ ] A2: Add the colours of the dark bar that the price bar and the dashboard will use — five new tokens — src/styles.scss
- [ ] A3: Give buttons and inputs the new shape and fill — primary button solid with 14 px corners; inputs, selects and input wrappers filled, white with a teal border on focus; invalid still red — src/styles.scss
- [ ] A4: Draw status tags as a white tag with a coloured dot, leaving pressable chips alone — one rule group after the allergen chip — src/styles.scss
- [ ] A5: Guard the new theme and write it down — the token check, the design notes, the chip family line — tools/theme/check-tokens.mjs, .interface-design/system.md, docs/brain/component-families.md
- [ ] A6: Run the token check, build, lint, the unit tests, the registry check and the log query, and paste the output lines under Execution Notes

### Plan 578 — Depth theme: the dark price bar and one hero tile on the dashboard (`plans/578-depth-theme-the-dark-price-bar-and-one-hero-tile-on-the-dashboard.plan.md`)
- [ ] A1: Make the price bar a dark teal bar with light text that stays readable — bar surface and the colours of everything on it, scoped so the phone sheet stays light — src/app/pages/menu-intelligence/components/pricing-meter/pricing-meter.component.scss
- [ ] A2: Make the month's revenue the one large dark tile that leads the dashboard — one class binding, the six-column grid and the hero rules — src/app/pages/dashboard/components/business-performance/business-performance.component.html, src/app/pages/dashboard/components/business-performance/business-performance.component.scss
- [ ] A3: Test that only the revenue card is the hero — two cases — src/app/pages/dashboard/components/business-performance/business-performance.component.spec.ts
- [ ] A4: Run build, lint, the unit tests and the log query, and paste the output lines under Execution Notes
- [ ] F8: Logistics questions get Edit next to Remove, like recipes — Edit loads the question with all its data into the add form, scrolls there, and the user saves it as an update (Human 2026-11-11, card V5)
- [ ] F9: Editing while the add form already holds an unsaved question opens the save / discard modal first (Human 2026-11-11, card V5)
- [ ] F10: A question that is added or promoted to shared later must not appear on events that already exist and were saved — today the event screen reads the live list, so it shows up there unanswered (Human 2026-11-11, card V7; confirmed in event-logistics-panel)

### AI menu — failure is not explained (Human 2026-11-11)
- [ ] B1: "Create menu with AI" shows only "שגיאה ביצירת התפריט. נסה שוב." for every failure — show the cause (no dishes found in the text, guest count missing, AI busy or out of quota, server down, timed out) and what to change. Logs 12:56: 8 tries, all rejected by our check (sections empty; once guestCount missing) — A: (Human, 2026-11-11) any limit reads "limit reached" (upsell), never "AI busy"; the modal shows how many uses are left, no long text
- [ ] B2: When the text lists no dishes, the AI suggests dishes ONLY from the business's own recipe book (never invented ones), and builds the menu from those real dishes with matching section titles so every line links to its recipe — A: (Human, 2026-11-11) suggest from every dish in the business's recipe book, shared dishes included
- [ ] B3: The platform AI-usage table counts a call as successful when Gemini answered, even when our check rejected the result — record the outcome (accepted / rejected) so rejected calls show as failed — A: (Human, 2026-11-11) yes, plus a tooltip that splits the failures by reason
- [ ] B4: Log the raw AI answer on ai.generate_menu.validation_failed (the route logs only the error list today)
- [ ] B5: AI menu examples leak between businesses — getApprovedMenuShots reads every business's saved shots into every prompt (INV-1) — A: (Human, 2026-11-11) fix in plan 580
- [ ] B6: Recipe AI examples (GEMINI_SHOTS) are also read across businesses (INV-1) — needs its own small plan, same fix as B5

### Front desk templates — Planner review suggestions (W3, 2026-11-11; the Human picks)
- [ ] T1: Restaurant "יש סיבה למסיבה?" reads as a joke — suggest "אירוע מיוחד? (יום הולדת, יום נישואין…)"
- [ ] T2: Add a kashrut question ("דרישות כשרות") for catering and private chef
- [ ] T3: Add a dietary / allergy question to catering events (only private chef asks it)
- [ ] T4: Ask a start time on private chef and catering events
- [ ] T5: Make the catering venue required (out-of-area declines depend on it), and say "בופה" instead of "מזנון"
- [ ] T6: Check the catering event-type question still works when a business has no event types (options come from the taxonomy)
- [ ] T7: A restaurant request stays open 4 h but the lead time is only 2 h — a short-notice request can still be waiting after its own time
- [ ] T8: ADR 0031 and the map (line 118) still list a stored lifecycle field the server writes, but plan 547 computes lifecycle in the browser — drop the field or the doc line

### Plan 579 — Logistics questions: per-event list, hide on one event, one needed toggle and tighter chips (`plans/579-logistics-per-event-list-hide-needed-toggle-tight-chips.plan.md`)
- [ ] A1: Add the schema fields for hide lists, removal dates, own sections and the "ours" provider — `event-logistics.ts`: append `'ours'` to `LOGISTICS_PAYERS`, add `logisticsSectionKeySchema` and `type LogisticsSectionKey = string`; `taxonomy-term.schema.ts`: append `'logisticsSection'` to `TAXONOMY_KINDS` and `plainKinds`, `logisticsItem.section` → `logisticsSectionKeySchema`, `removedAt: z.number().int().min(0).optional()`, `foldedAt: z.number().optional()`, `TERM_REFERENCES.logisticsItem.menuEvents` += `'siteLogistics.hiddenKeys[]'`, `logisticsSection: {}`; `menu-event.schema.ts`: `answers[].section` → `logisticsSectionKeySchema`, `siteLogistics.hiddenKeys` optional; `business.schema.ts`: `hiddenLogisticsKeys` optional + `logisticsHiddenInputSchema = z.strictObject({ keys: z.array(z.string().min(1).max(LOGISTICS_LABEL_MAX)).max(300) })`; tests: a `logisticsSection` term validates; a `logisticsItem` with section "סעיף שלי", `removedAt: 0` and `foldedAt` validates; a 121-char section fails; `TAXONOMY_KINDS` contains `logisticsSection` — shared/schemas/entities/event-logistics.ts, shared/schemas/entities/taxonomy-term.schema.ts, shared/schemas/entities/menu-event.schema.ts, shared/schemas/entities/business.schema.ts, server/test/taxonomy-term-schema.test.js, server/test/helpers/v2-docs.js
- [ ] A2: Store the event's hidden keys and the business's dated hide list — `PUT /:id/logistics` accepts `hiddenKeys` (validate, dedupe, replace); `setHiddenLogisticsKeys(id, keys)` in the business service (keeps existing `at`, stamps new ones, `$set`), `PUT /api/v1/business/logistics-hidden` with `editSettings` + `safeParse`, logs `business.logistics_hidden.saved` / `.failed`; tests: `hiddenKeys` replaces and survives a later answer save; `hiddenKeys: 'x'` → 400 `BAD_LOGISTICS`; staff → 403; owner saves `['a']` then `['a', 'b']` → `a` keeps its first `at`, `b` gets a later one; staff 403; no token 401; 301 keys → 400; another business's doc unchanged — server/routes/events.js, server/test/events-logistics.test.js, server/services/business.js, server/routes/business.js, server/test/business-logistics-hidden.test.js
- [ ] A3: Keep a business's own copy, marked folded, when its question is promoted — both fold spots in `generic.js` mark `foldedAt` for `logisticsItem`, `deleteMany` for other kinds; `admin.js` filter adds `foldedAt: { $exists: false }`; tests: the existing fold test still passes for a non-logistics kind (rows deleted); a shared `logisticsItem` POST leaves the own term with `foldedAt` and its `createdAt`; the admin read no longer lists it (`admin-taxonomy.test.js` fold case) — server/routes/generic.js, server/routes/admin.js, server/test/taxonomy-terms-api.test.js, server/test/admin-taxonomy.test.js
- [ ] A4: Type the new fields on the client — `LogisticsAnswer.section: string`, `payer` union + `'ours'`, `SiteLogistics.hiddenKeys?`; `LogisticsPatch.hiddenKeys?: string[]`; `BusinessService.updateHiddenLogisticsKeys(keys)` via `_put('logistics-hidden', { keys })` (widen the `_put` unions); spec: URL, body, and `business_()` takes the reply — src/app/core/models/menu-event.model.ts, src/app/core/services/event-pipeline.service.ts, src/app/core/services/business.service.ts, src/app/core/services/business.service.spec.ts
- [ ] A5: Decide in the registry which questions an event shows — `allItems_` (every `logisticsItem` term), `items_` (live: no `removedAt > 0`, no `foldedAt`), `hiddenAt_` (Map key → `at` from `BusinessService.business_()?.hiddenLogisticsKeys`), `defaultItems_` (`items_` minus hidden), `sections_`, `sectionLabel()`, `forEvent(createdAt: number | undefined, phase, environment): LogisticsItemTerm[]` (the P0 date rule; one row per key); `forPhase` keeps working on `defaultItems_`; spec: seed term (`createdBy: '__master__'`) shows on an event older than it; an own term created after the event does not; a promoted key (master new + folded own old) shows on the business's old event; removed (`removedAt` T) shows on an event created before T, not after; business-hidden at T likewise; `removedAt: 0` counts as live; section order and labels — src/app/core/services/logistics-item-registry.service.ts, src/app/core/services/logistics-item-registry.service.spec.ts
- [ ] A6: Make the client summary list what the customer brings — new signature and rule of P0; spec: needed + `client` listed; needed + `ours` / `chef` / none not listed; old `client_provides` status listed; `not_needed` not listed; a custom section heading prints its key; quantity and text appended — src/app/core/utils/logistics-summary.util.ts, src/app/core/utils/logistics-summary.util.spec.ts
- [ ] A7: Add the tight chip-group variant — the three rules of P0, appended after the chip block, five-group property order, tokens only — src/styles.scss
- [ ] A8: Make the panel use the date rule, hide/restore and the one toggle — `buildRows` takes items from `registry.forEvent(event.createdAt, phase, env)` and `known` from `registry.allItems_()`; rows carry `hidden` (key in `siteLogistics.hiddenKeys`); counts, `sections_`, `phaseDone` skip hidden rows; `sections_` from `registry.sections_()` + extra keys, labels via `registry.sectionLabel`; `hideRow` / `showRow` → `saveNow({ hiddenKeys })`; `setNeeded(row, on)`, `providerOf(row)` (read rule), `setProvider(row, 'ours' | 'client')`; delete `statuses`, `payers`, `setShowToClient`; `copySummary` passes the sections and leaves out hidden rows — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.ts
- [ ] A9: Show the toggle, the two providers and the hide controls, and test the panel — template: `eye-off` button `.logistics-hide` in the row head; the status radiogroup → one "נדרש" checkbox; with it on, a radiogroup of "עלינו" / "באחריות הלקוח" in `.c-chip-group c-chip-group--tight`; no "ללקוח" checkbox; hidden rows under `showHidden_` with `.is-hidden` and the `undo-2` button; footer chip `logistics_hidden_count`; scss `.is-hidden` (opacity token), row head flex; spec: an own item created after the event is not a row; hide sends `hiddenKeys` and drops the row and its open count; restore removes the key; "נדרש" on sends `{ status: 'needed', payer: 'ours' }`; payer `chef` shows "עלינו" checked, `client` shows "באחריות הלקוח"; old `client_provides` status shows the toggle on + "באחריות הלקוח"; no showToClient control — src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.html, src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.scss, src/app/pages/menu-intelligence/components/event-logistics-panel/event-logistics-panel.component.spec.ts
- [ ] A10: Add the Hebrew strings — the keys of UI/UX Notes, appended to `general` — public/assets/data/dictionary.json
- [ ] A11: Write the three screen checks and update 522-5 — 579-1…3 per the `[ui]` lines with `signInQa`, `createQaEvent` / `deleteQaEvent`, API setup, cleanup in `finally` (delete the own term "שאלה חדשה 579" through `DELETE /api/v1/data/taxonomyTerms/:id`, delete both events), screenshots `screens/579-<n>.png`; 579-3 creates event 1, then the term, then event 2; 522-5: click "נדרש", then "באחריות הלקוח" (instead of "ללקוח"), then copy; run each with `pnpm exec playwright test <spec>` with `E2E_APP_URL` / `E2E_API_URL` set to the slot's ports — e2e/ui/579-1.spec.ts, e2e/ui/579-2.spec.ts, e2e/ui/579-3.spec.ts, e2e/ui/522-5.spec.ts
- [ ] A13: Fix the trash-restore screen check so it confirms the restore window — after the row's "שחזר מהאשפה" click, click the confirm button in the "לשחזר פריט זה?" modal before expecting the row to leave (found 2026-11-11: the app restores fine, the spec never confirmed) — e2e/ui/544-1.spec.ts
- [ ] A12: Record the changes in the maps and run every `[auto]` check — paste the outputs under Execution Notes — docs/brain/component-families.md, src/app/core/services/breadcrumbs.md, src/app/pages/breadcrumbs.md, src/app/core/models/breadcrumbs.md, src/app/shared/breadcrumbs.md, server/breadcrumbs.md

### Plan 580 — AI menu: say why it failed, build it from the recipe book, count rejected calls as failed (`plans/580-ai-menu-say-why-it-failed-build-from-recipe-book-count-rejected-calls.plan.md`)
- [ ] A1: Record whether we accepted each AI answer, count refused ones as failed and split failures by reason — `_id` and `outcome` in `buildRow`, ids in `usage.ids`, `markAiUsageRejected`, `trackAiOutcome`, `failedCalls` with `outcome: 'rejected'`, `failures` per reason — server/services/ai-usage.js
- [ ] A2: Hook every AI route to the outcome tracker — `router.use(trackAiOutcome)`, `usageOf(req)`, every `usage:` line — server/routes/ai.js
- [ ] A3: Give every AI failure a stable reason code — `code` in `respondFromGeminiFailure`; `not_configured`, `empty_response`, `unreadable`, `invalid_patch` on `/generate-menu` and `/patch-menu`; `menuRejectCode`; raw answer and code on `ai.generate_menu.validation_failed` — server/routes/ai.js
- [ ] A4: Build the menu from the dishes in the business's recipe book when the text names none — `DISH_BOOK_CAP`, `loadDishBook` (same filter as the book list), the RECIPE BOOK block, the new prompt section, `applyDishBook` — server/routes/ai.js
- [ ] A5: Keep menu examples inside their business — `getApprovedMenuShots(req)` with `scopeFilter`, `businessId` and no `dishId` on save, per-business pruning — server/routes/ai.js
- [ ] A6: Test the menu route end to end — codes, book scope (own, master copy, deleted, other business, raw master), unknown ids dropped, cap of 300 newest, user-named dishes kept, shots per business, the raw log line — server/test/ai-menu.test.js (pattern: server/test/ai-match-product-names.test.js; `captureLogs` from server/test/helpers/log-capture.js)
- [ ] A7: Test the outcome on the ledger and the reason totals — accepted, rejected with code, retried, no outcome on `ok: false`, `failedCalls` and `failures` in the admin totals, stored keys — server/test/ai-usage.test.js
- [ ] A8: Link AI-picked dishes by id in the window — `dishId` on `AiMenuDishDraft`, `matchMenuDish` and its spec, `buildMatchedMenu_` uses it — src/app/core/models/ai-menu-draft.model.ts, src/app/core/utils/recipe-match.util.ts, src/app/core/utils/recipe-match.util.spec.ts, src/app/shared/ai-menu-modal/ai-menu-modal.component.ts
- [ ] A9: Show the real reason and the uses left in the AI menu window — `ERROR_KEYS` and fallbacks (429 → `ai_limit_reached`), `usesLeftLabel_`, the shorter usage line, the modal dictionary keys — src/app/shared/ai-menu-modal/ai-menu-modal.component.ts, src/app/shared/ai-menu-modal/ai-menu-modal.component.html, public/assets/data/dictionary.json
- [ ] A10: Show on `/platform` how the failed calls divide by reason — `failures` on `AiUsageRow`, `failureTitle`, `title` on both failed cells, the `ai_fail_*` keys, spec cases — src/app/core/models/ai-usage.model.ts, src/app/pages/platform-dashboard/platform-dashboard.page.ts, src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts, public/assets/data/dictionary.json
- [ ] A11: Add the three screen checks — each spec signs in with `signInQa`, stubs one route with `page.route(…, r => r.fulfill({ status, contentType: 'application/json', body }))` (no Gemini call), opens `/menu-library`, clicks the button with aria-label "פעולות מהירות", then "צור עם AI"; 580-1 and 580-2 fill the textarea with "אירוע ל-50 אורחים" and click "צור תפריט"; each asserts its quoted text and saves `screens/580-N.png` — e2e/ui/580-1.spec.ts (`**/ai/generate-menu` → 502 `{ error: 'Gemini returned invalid menu draft', code: 'no_sections' }`), e2e/ui/580-2.spec.ts (`**/ai/generate-menu` → 429 `{ error: 'Too many AI requests, please try again later' }`), e2e/ui/580-3.spec.ts (`**/ai/usage` → 200 `{ budget: 20, used: 13, remaining: 7, count: 13, models: [] }`, routed before `page.goto`)
- [ ] A12: Record the new fields in the docs and the maps — docs/agent/standards-backend.md, docs/frontdesk/frontdesk-map.md, server/breadcrumbs.md; run `node scripts/breadcrumbs-check.mjs` and touch the other four maps only if it names them
- [ ] A13: Run the checks and hand over the two hand checks — test:server, test:ci, both lints, lint:icons, build, breadcrumbs-check, log-query, specs 580-1…3 against the slot app; then the [human] cards

### Plan 581 — Metadata card: edit and remove logistics questions, own sections, everybody or only-me (`plans/581-metadata-card-edit-remove-logistics-questions-own-sections.plan.md`)
- [ ] A1: Remove and restore questions by owner or admin choice — class per `.claude/skills/angularComponentStructure/SKILL.md`; inject `BusinessService`, `PermissionService`; `onRemove(row)` (the three cases of P0), `onRestore(term)`, rows carry `hidden`, `canEdit`, `canRemove`; the re-add of a removed own term in `onSubmit` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [ ] A2: Edit a question in the add form, asking first about an unsaved one — `editing_` signal, `formRef = viewChild.required<ElementRef<HTMLElement>>('addForm')`, `isDirty()`, `onEdit(term)` (F9 then F8), `onSubmit(): Promise<boolean>` (add, re-add or update), `cancelEdit()` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [ ] A3: Start with every environment, give the admin the scope radios and let users add a section — draft `scope: 'mine' | 'everyone'` replaces `shared`, `environments` default all four, `metadata_logistics_env_required`; `sectionOptions` computed from the registry; `onAddSection(typed)` with `AddItemModalService` and `notifyItemAdded` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [ ] A4: Show the row buttons, the restore state and the new form controls — template: rows with tag + pencil + trash/restore, hidden rows dimmed with `metadata_logistics_hidden`; `#addForm`; section select with the add option; environment chips and the admin scope radios in `.c-chip-group c-chip-group--tight`; submit label `metadata_add` / `save`, cancel while editing; description `metadata_logistics_desc_v2`; scss: row layout, `.is-hidden` (opacity token) — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.html, src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.scss
- [ ] A5: Unit-test the card with stubbed store, registry, business, permission, confirm and add-item modal — envs start all checked; all four → no `environments`; none → `metadata_logistics_env_required` and no `add`; admin "לכל העסקים" → `{ shared: true }`; owner sees no scope radios; pencil loads the term and edit save calls `update` with `environments: []`; dirty form + pencil opens `openTernary` — `'cancel'` keeps the draft, `'confirm'` loads the new term, `'save'` submits first; own remove → `update(term, { removedAt: <number> })`, never `remove`; owner on shared → `updateHiddenLogisticsKeys([key])`; admin `'save'` → `update(master, { removedAt })`, `'confirm'` → hide; restore drops the key; re-add of a removed own text → `update(term, { removedAt: 0, … })`; add-section → `add('logisticsSection', 'סעיף שלי', {}, { shared: false })` and selected; the existing plan-523 cases updated (no lock-less remove chip, no in-use toast) — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts
- [ ] A6: Add the Hebrew strings — the keys of UI/UX Notes, appended to `general` — public/assets/data/dictionary.json
- [ ] A7: Write the four screen checks and update 523-3 — 581-1…4 per the `[ui]` lines with `signInQa`, API setup and cleanup in `finally` (own terms "בדיקה 581" and section "סעיף 581" deleted through `DELETE /api/v1/data/taxonomyTerms/:id`), screenshots `screens/581-<n>.png`; 523-3: click the row's trash button (aria "מחיקה") instead of `.c-chip__remove`, and its cleanup also deletes a removed (`removedAt`) "בדיקה E2E"; run each with `pnpm exec playwright test <spec>` with `E2E_APP_URL` / `E2E_API_URL` set to the slot's ports — e2e/ui/581-1.spec.ts, e2e/ui/581-2.spec.ts, e2e/ui/581-3.spec.ts, e2e/ui/581-4.spec.ts, e2e/ui/523-3.spec.ts
- [ ] A8: Record the changes in the maps and run every `[auto]` check — paste the outputs under Execution Notes — docs/brain/component-families.md, src/app/pages/breadcrumbs.md
