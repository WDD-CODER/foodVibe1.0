# Active Tasks

> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-2026-07-21.md`](reports/todo-ledger-relevance-audit-2026-07-21.md).
> Checkboxes are **unchanged** — decide per group: execute / mark done / prune / keep.

---

## 1. EXECUTE — real unfinished work

> Audit says: do these.

---

### Plan 289 — App Load Optimization — remaining verify (`plans/289-app-load-optimization.plan.md`)
> M4–M5 shipped. Audit: **6.1 already in code** (`Promise.all` in `generic.js`) — belongs in §3 below; **6.2** is the real verify leftover.

- [ ] 6.2 Manual: trash empty-all + backup-import still correct; contract (`X-Confirm-Replace`) unchanged

---

### Plan 255 — Dead Code Cleanup — prod confirm before delete (`plans/255-dead-code-cleanup.plan.md`)
> Scripts still on disk. Confirm repair / master migration done in prod, then delete.

- [ ] Task 8: Investigate repair script trio (`backup-before-repair.mjs`, `diagnose-broken-refs.mjs`, `repair-recipe-references.mjs`) — confirm repair is complete, then delete all three
- [ ] Task 9: Investigate migration pair (`migrate-to-master.mjs`, `link-users-to-master.mjs`) — confirm master-layer migration is done in prod, then delete both

---

### Plan 234 — Per-User Collections — ops smoke only (`plans/234-per-user-collections-render-deploy.plan.md`)
> Code shipped via PR #53. Keep only unverified ops. PR-merge bookkeeping rows moved to §5 DISCARD.

- [ ] Run stamp migration against Atlas; verify in Compass
- [ ] Build verification + manual API test (Brief 2)
- [ ] pre-commit security grep + CI review (Brief 2)
- [ ] pre-commit security grep + CI review (Brief 3)
- [ ] Build + serve verification (Brief 4)
- [ ] Manual deploy + smoke test

---

## 3. MARK DONE / ARCHIVE — code already shipped; checkboxes stale

> Reply `done` (or prune after marking) when you accept the audit. Do **not** re-execute.

---

### Plan 297 — Sidebar Filter Panel Unification (`plans/297-sidebar-filter-panel-unification.plan.md`)
> Audit: `useResponsivePanelState` + all 5 list pages already migrated this session. M3 browse optional.

- [ ] M1 `src/app/core/utils/panel-preference.util.ts` — fix `getPanelOpen()` default to `true`, add `useResponsivePanelState()`
- [ ] M2a `venue-list.component.ts` — migrate to shared helper (also fixes missing SSR guard)
- [ ] M2b `supplier-list.component.ts` — migrate to shared helper
- [ ] M2c `equipment-list.component.ts` — migrate to shared helper
- [ ] M2d `inventory-product-list.component.ts` — migrate to shared helper (dedup only)
- [ ] M2e `recipe-book-list.component.ts` — migrate to shared helper (dedup only)
- [ ] M3 Manual verify (browse): desktop open-by-default, mobile closed-by-default, resize restore, no visual regression — all 5 pages

---

### Plan 289 — App Load Optimization — 6.1 already in code (`plans/289-app-load-optimization.plan.md`)
> Phase 2 after Save Latency Fix. M4–M5 shipped (`4e051d3` / PR #158).

- [x] 4.1 Record baseline: `ng build --configuration production` — note initial/main bundle size *(done in session: 920.70 kB)*
- [x] 4.2 `app.component.html` + `.ts` — `@defer` the 3 AI modals (`ai-recipe`, `ai-menu`, `ai-product`) on their open signals; verify open + rebuild size
- [x] 4.3 Defer remaining root modals (pass 2) — leave `app-confirm-modal` / `app-auth-modal` eager if first-open latency is noticeable
- [x] 4.4 Manual verify: all deferred modals open; confirm/auth still snappy; no pendingChangesGuard regression
- [x] 4.5 Record after numbers from production build output (main vs deferred chunks) *(after: 670.83 kB, −249.87 kB)*
- [x] 5.1 Audit: grep candidate usages — defer safe services; Equipment + Preparations deferred in M5 ship (were wrongly kept eager before)
- [x] 5.2 For each safe service: remove constructor `loadInitialData()`; add `ensureLoaded()` with `loaded_` guard
- [x] 5.3 Wire `ensureLoaded()` into route resolvers (equipment, venues, menu-intelligence, metadata-manager as applicable)
- [x] 5.4 Keep Recipe/Dish/Product/Supplier/Unit/Metadata registries eager — do not touch
- [x] 5.5 Manual: `/dashboard` Network tab has no GETs for deferred collections until navigation *(Human verify on PR #158 test plan)*
- [ ] 6.1 `server/routes/generic.js` PUT `/:type` — parallelize `deleteMany` + stillTaken `_id` lookup via `Promise.all` *(audit: already Promise.all in tree)*

---

### Plan 259 — DB-Backed Shared Few-Shot Pool (`plans/259-gemini-shots-db-pool.plan.md`)
> Audit: Mongo `GEMINI_SHOTS`, `POST /api/v1/ai/shots`, `GeminiShotsService`, modal wiring live. Task 8 optional smoke only.

- [ ] Task 1: `server/routes/ai.js` — add `GEMINI_SHOTS` helpers (`saveShot`, `getApprovedShots`, `computeSoftWarnings`), remove `buildFewShotBlock` from body path
- [ ] Task 2: `server/routes/ai.js` — add `POST /api/v1/ai/shots` endpoint
- [ ] Task 3: `server/routes/ai.js` — update `/generate`, `/generate-from-image`, `/generate-from-url` to fetch shots from DB server-side
- [ ] Task 4: Create `src/app/core/services/gemini-shots.service.ts`
- [ ] Task 5: `ai-recipe-modal.component.ts` — call shots service on approve/reject, show inline warnings
- [ ] Task 6: `gemini.service.ts` — remove `getGeminiShots` import and `shots` from request bodies
- [ ] Task 7: Deprecate `gemini-shots.util.ts` — remove `addGeminiShot` call from modal
- [ ] Task 8: `ng build` + smoke test

---

### Plan 249 — Catalog Seeder Data Quality + Supplier Model (`plans/249-seeder-data-quality.plan.md`)
> Audit: Steps 1–12 code present in `tools/catalog-seeder`. Keep Step 0 / 13 only if Atlas re-seed still needed (see §4).

- [ ] Step 1: Add `_safe_float` helper to `enrich.py`
- [ ] Step 2: Expand `_PROMPT_TEMPLATE` in `enrich.py` to return 8 fields
- [ ] Step 3: Update `_validate_response` in `enrich.py` to validate new fields
- [ ] Step 4: Update `_attach_enrichment` in `enrich.py` with name override + `_recalc_pricing`
- [ ] Step 5: Add `_recalc_pricing` and `_pack_to_base_conversion` to `enrich.py`
- [ ] Step 6: Add `SUPPLIERS_COLLECTION` to `config.py`
- [ ] Step 7: Add `_make_id` helper + imports to `db_write.py`
- [ ] Step 8: Add `_upsert_suppliers` to `db_write.py`
- [ ] Step 9: Update `write_approved` to call `_upsert_suppliers`
- [ ] Step 10: Update `_prepare_doc` to link `supplierIds_`
- [ ] Step 11: Update `_INTERNAL_KEYS` in `db_write.py`
- [ ] Step 12: Update `db_write.py` imports for `SUPPLIERS_COLLECTION`

---

### Plan 089 — Menu Intelligence Upgrade (`plans/089-menu-intelligence-upgrade.plan.md`)
> Audit: auto-name + `updated_at_` already in menu-intelligence / MenuEvent.

- [ ] A: Auto-name menu with formatted date when name is empty on save, with duplicate handling (1), (2)
- [ ] Timestamps: Add updated_at_ to MenuEvent model; set created_at_ on create and updated_at_ on every save
- [x] B: Set event_date_ default to today's date for new menus
- [x] C: Redesign guest counter as unified pill-shaped container with paper-blend styling
- [x] D1: Tie food cost calculation to serving_portions * guest_count, update service and component
- [x] D2: Show sell_price inline next to dish name for all menu types
- [x] E1: Make toolbar collapsible with fixed overlay when opened
- [x] E2: Create floating FAB on right side with pop-up buttons for toolbar and back navigation
- [x] Dictionary: Add new Hebrew dictionary keys for new labels

---

### Plan 081 — toFix Detailed Plans (`plans/081-tofix-detailed-plans.plan.md`)
> Some items may already be shipped (auth autofocus, default `gram`). Refresh before executing.

- [ ] Section 1 — Sign-in / Sign-up: auto-focus, dev user dropdown, Enter-to-submit, field-level errors
- [ ] Section 2 — Quick-add default base unit: set signal to 'gram'
- [ ] Section 3 — Recipe view: number formatting pipe, unit-before-scale, ingredient alignment
- [ ] Section 4 — Recipe builder: persist container state, remove arrows, custom qty buttons, clickable headers, CDK drag-drop
- [ ] Section 5 — Maison Plus (dish prep list): row style, qty buttons, category-first add flow, auto-focus
- [ ] Section 6 — App-wide category/unit dropdowns: add 'add new' sentinel option to every dropdown
- [ ] Section 7 — Logistics: chip fit-content width, keyboard navigation with highlighted index
- [ ] Section 8 — Add-equipment modal: single-step category creation quick-save flow
- [ ] Section 9 — Labels: selectable existing labels in delete UI and recipe builder

---

### Plan 133 — List quick-edit inline (`plans/unused-133-list-quick-edit-inline.plan.md`)
> Inventory has bulk edit today, not cell-click inline. Keep only if you still want that UX.

- [ ] Inventory product list: editable cells (supplier, category, unit); value click → inline dropdown; row click → edit page
- [ ] Supplier list: keep panel on row click; add quick-edit for chosen cells (e.g. contact, delivery, min order)
- [ ] Keyboard and a11y: focus model, focus trap in inline control, Esc/Enter, return focus, screen reader labels (partial: aria-label on buttons)
- [ ] Venue list / Recipe-book list: optional quick-edit columns as needed

---

### Plan 010 — Product roadmap leftovers (`plans/010-product-roadmap.plan.md`)
> Narrative stale (dashboard / suppliers / low-stock / print largely exist). Refresh or prune.

#### Phase 1 — Stabilize & Complete
- [ ] When adding new features: add/update `.spec.ts` and mark related sub-tasks here; run the full test suite only at commit time (Phase 0) or when the user explicitly asks — not after every iteration.

#### Phase 2 — Product Enhancement
- [ ] **Plan 011 (KPI expansion, optional)**: Further dashboard enhancements per roadmap if desired.
- [ ] **Plan 013 — Recipe Quick Actions**: Duplicate recipe, approval toggle in recipe book list, batch select/actions.
- [ ] **Plan 014 — Low Stock Alerts**: Visual indicators in inventory list, filter toggle, dashboard card.

#### Phase 3 — Polish & Production Readiness
- [ ] **Plan 015 — Empty States & Onboarding**: Empty-state UX for all list views, first-use guidance, Hebrew copy.
- [ ] **Plan 016 — Print-Friendly Recipe View**: Print stylesheet, hide navigation in print, RTL-aware layout, print button.
- [ ] **Plan 018 — Backend API Preparation**: Formalize `IStorageAdapter`, document REST API contract, audit adapter compliance.
- [ ] **Deployment Pipeline**: Validate and activate GitHub Actions workflow for GitHub Pages.

---

### Plan 072 — Robust login, app-wide logging, security (`plans/072-robust-login-app-logging-security.plan.md`)
> Core auth + LoggingService + interceptor + go-live docs largely shipped. Narrow to real gaps or archive.

- [ ] Wire logging: auth (login/logout/signup/guard/401), HTTP interceptor, global ErrorHandler, critical CRUD in data services
- [ ] Auth hardening: password in UI, credentials types, local hash-only storage, auth abstraction, guard/modal wiring
- [ ] Backend-ready: environment files, API contract, HTTP provider, interceptor, token lifecycle
- [ ] Add “Security & go-live” checklist to docs (HTTPS, headers, rate limiting, no secrets in repo, error exposure)

---

### Plan 060 — Data persistence and backup (`plans/060-data-persistence-and-backup.plan.md`)
> Manual export/restore exists. Optional nicety only.

- [ ] Optional: debounced auto-download per category for physical JSON on every change.

---

### Plan 249 — Seeder ops leftovers (`plans/249-seeder-data-quality.plan.md`)
> Only if Atlas still needs purge + re-seed (code steps are in §3).

- [ ] Step 0: Clear bad seed from PRODUCT_LIST; delete output/pending-review.json and output/enriched.json
- [ ] Step 13: Branch `feat/seeder-data-quality` and re-seed

---

### Plan 255 — Dead Code Cleanup — decide (`plans/255-dead-code-cleanup.plan.md`)

- [ ] Task 10: Investigate `scripts/trim-demo-data.mjs` — recurring or one-time? Add npm entry or delete
- [ ] Task 15: Decide on `.claude/commands/sweep-stale-todos.md` — verify pending update, then add trigger

---

## 6. KEEP DEFERRED — intentional park

> Do not execute against current policy / product decisions.

### Angular 22 Migration (deferred)
- Remaining `npm audit --omit=dev --audit-level=high` findings are all `@angular/*` (XSS in template/attribute namespace + two-way binding sanitization, DoS via OOM in formatDate/digitsInfo, HttpTransferCache cache-key/info-leak) — blocked on the Angular 22 major upgrade.
- Do **not** run `npm audit fix --force`.
- Server `npm audit --omit=dev` is clean (0 vulnerabilities).
- CI (`.github/workflows/security.yml`) runs `npm audit --omit=dev --audit-level=critical`. `--omit=dev` is permanent (devDependency build-tooling churn — Angular CLI, vite, webpack-dev-server — is noise for a never-shipped tree, not app risk); restore `--audit-level=high` on top of `--omit=dev` after the migration clears the `@angular/*` findings above. See `docs/brain/decisions/0005-scope-npm-audit-to-production-deps.md`.

---

### Plan 122 — AI Chatbot Gemini scope (`plans/unused-122-ai-chatbot-gemini-scope.plan.md`)
> Product decisions never made. Path on disk is `unused-122-…`.

- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation → recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set

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

## Where things live

- **Open work** — numbered groups §1–§6 above (this file only).
- **Audit source** — [reports/todo-ledger-relevance-audit-2026-07-21.md](reports/todo-ledger-relevance-audit-2026-07-21.md).
- **Done** — numbered volumes under [todo-archive/](todo-archive/README.md) (+ [INDEX.md](todo-archive/INDEX.md) for old Done catalog rows).
- **All plan files** — [`plans/`](../plans/).

### How to decide (quick)

| You say | Agent does |
| --- | --- |
| `prune discards` / `prune §5` | Remove §5 from this file |
| `mark done` / `done §3` | Mark §3 checkboxes `[x]` (and archive when all-x) |
| `execute 291` | Start Plan 291 (recreate plan file if missing) |
| `verify mobile` | Run mobile re-audits + TRIAGE updates |
| `drop §4 item N` | Remove that Maybe plan after your call |
