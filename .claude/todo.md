# Active Tasks

> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-2026-07-21.md`](reports/todo-ledger-relevance-audit-2026-07-21.md).
> Checkboxes are **unchanged** — decide per group: execute / mark done / prune / keep.
> **2026-09-16 (overnight):** `/auto-solve` running unattended in worktree `../foodVibe1.0-wt-auto-solve` on branch `feat/auto-solve-overnight`, self-approving each plan (no Human present). See that branch's `OVERNIGHT-REPORT.md` for what landed — nothing pushed/merged without Human review.

---

## Execution order (Planner review 2026-11-11, `node scripts/plan-order.mjs` at d4e904bb)

Orchestrator chain (Human 2026-11-11; each run branch starts from the previous one; the Human validates and merges them in this order):
- batch-1 · run-546: **546, 558, 567, 575, 579** — built, all 5 merged into `orch/run-546` (429e7314); hand checks ①–⑦ done 2026-11-12 (H1 below), ⑧ pilot terms reworked; waits on the Human's merge · base of batch-2
- batch-2 · running since 2026-11-12 (547 retried after `approved:` for its header spec)
- batch-2 · `orch/batch-2`: **580, 581, 547, 568** (dependency markers for 546/567/579 added on the branch) (542 left out: only its Planner-only A8 is open)
- batch-3 · `orch/batch-3`: **553, 554, 551, 552**
- batch-4 · `orch/batch-4`: **556, 555**
- batch-5 · `orch/batch-5`: **557, 559**
- Not in the chain: **542** A8 (Planner, by hand) · **582** recipe AI examples per business (after 580) · parked **373**, **471**

plan-order.mjs waves: 1: 373, 471, 542, 546, 558, 567, 575, 579, 580 · 2: 547, 568, 581, 582 · 3: 551, 552, 553, 554 · 4: 555, 556 · 5: 557, 559
Lanes: 546→547→551 · 567→568 · 579→581 · 580→582 · 553→555→557 · 554→556→559 · 552, 558, 575 alone
Edges changed 2026-11-11: 580 no longer waits for 554 (554 now depends on 580 and uses its `usageOf(req)`) · 555 waits for 558 (privacy erase + retention)
Every batch's plans depend only on plans in earlier batches, so the batches are one valid order of the waves above.

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

### Run run-546 (batch 1) — hand checks, Human 2026-11-12
- [x] H1: Cards ①–⑥ (demo business, inquiry dialog, event client picker, logistics on phone and laptop, optional baseline) — Human 2026-11-12: ok
- [x] H2: Card ⑦ "an event made before plan 579 still shows its full shared checklist" — marked done by the Human 2026-11-12 without checking; **re-check some day**: open an event created before 2026-11-12 → logistics card → nothing missing
- [ ] H3: Card ⑧ — Human reads the reworked `docs/frontdesk/pilot-terms-draft.md` (v2), fills the privacy e-mail, and sends it to a lawyer
- [ ] H4: Render — set `PUBLIC_BASE_URL` on the live service and create the free uptime monitor on `/api/v1/health` every 10 min (`docs/security-go-live.md` §uptime)
- [ ] H5: Fix `e2e/ui/545-1.spec.ts` — old selectors #inquiry-name / #inquiry-phone / .inquiry-client-picked__name → #client-form-name / #client-form-phone / .client-picker-picked__name (run-546 D5)

### Run run-584 — fallout, Planner 2026-11-12
- [ ] R1: Fix e2e/ui/584-1.spec.ts — on a local/slot app the dev guest auto-login moves /welcome to /dashboard before the sign-up click; sign out first or open the auth modal another way
- [ ] R2: Fix e2e/ui/584-2.spec.ts — waits only 5 s for app-header while the QA login shows "רגע, מכינים הכל..."; wait for the loading screen to end
- [ ] R3: After run-546 merges, add the note line to docs/frontdesk/pilot-terms-draft.md (the app shows public/assets/legal/terms.he.json; change both and bump version) — run-584 D1

### Hand checks — Human 2026-11-12 (runs 584 and batch-2)
- [x] V1: run-584 cards ①–⑥ (terms popup, sign-up blocked, phone reading, existing account, no repeat, guest) — Human 2026-11-12: ok; follow-ups → plan 585 (desktop scroll, cancel signs out)
- [x] V2: batch-2 cards ②, ⑥, ⑦ (report print, admin removal choice, card on phone) — Human 2026-11-12: ok
- [x] V4: plan 585 cards ①–③ (desktop scroll to end, close signs out, popup returns) — Human 2026-11-12: ok
- [ ] V5: Human idea 2026-11-12: a signed-out visitor sees only the welcome page (no local auto-guest) — needs a plan; questions asked
- [x] V3: batch-2 cards ①, ③, ④, ⑤ — Human 2026-11-12: works, with changes → plans 586 (clients list on phone), 587 (AI menu portions + guest count), 588 (removed questions leave after the visit)

### Run fd-1a-data — hand checks left open (PR #547)
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
- [ ] F8: Logistics questions get Edit next to Remove, like recipes — Edit loads the question with all its data into the add form, scrolls there, and the user saves it as an update (Human 2026-11-11, card V5)
- [ ] F9: Editing while the add form already holds an unsaved question opens the save / discard modal first (Human 2026-11-11, card V5)
- [ ] F10: A question that is added or promoted to shared later must not appear on events that already exist and were saved — today the event screen reads the live list, so it shows up there unanswered (Human 2026-11-11, card V7; confirmed in event-logistics-panel)

### AI menu — failure is not explained (Human 2026-11-11)
- [ ] B1: "Create menu with AI" shows only "שגיאה ביצירת התפריט. נסה שוב." for every failure — show the cause (no dishes found in the text, guest count missing, AI busy or out of quota, server down, timed out) and what to change. Logs 12:56: 8 tries, all rejected by our check (sections empty; once guestCount missing) — A: (Human, 2026-11-11) any limit reads "limit reached" (upsell), never "AI busy"; the modal shows how many uses are left, no long text
- [ ] B2: When the text lists no dishes, the AI suggests dishes ONLY from the business's own recipe book (never invented ones), and builds the menu from those real dishes with matching section titles so every line links to its recipe — A: (Human, 2026-11-11) suggest from every dish in the business's recipe book, shared dishes included
- [ ] B3: The platform AI-usage table counts a call as successful when Gemini answered, even when our check rejected the result — record the outcome (accepted / rejected) so rejected calls show as failed — A: (Human, 2026-11-11) yes, plus a tooltip that splits the failures by reason
- [ ] B4: Log the raw AI answer on ai.generate_menu.validation_failed (the route logs only the error list today)
- [ ] B5: AI menu examples leak between businesses — getApprovedMenuShots reads every business's saved shots into every prompt (INV-1) — A: (Human, 2026-11-11) fix in plan 580
- [ ] B6: Recipe AI examples (GEMINI_SHOTS) are also read across businesses (INV-1) — → plan 582 (Planner 2026-11-11), not in the batch chain

### Front desk templates — Planner review suggestions (W3, 2026-11-11)
- Folded into plan 556 (T1–T7, Atomic Sub-tasks) and plan 551 (T8) on 2026-11-11.

### Plan 542 — The local MongoDB MCP server starts from an installed package, with its last outside reach closed (`plans/542-mongodb-local-mcp-starts-from-installed-package.plan.md`)

- [x] A1: Install the database tool with the project so it never downloads itself at start — exact 3.2.2 dev dependency; onlyBuiltDependencies only if the start test needs it — package.json, pnpm-lock.yaml
- [x] A2: Start the installed tool directly and say clearly when it is missing — resolve the bin, spawn process.execPath without shell, not-installed message and exit 2 — scripts/mcp-mongo-local.mjs
- [x] A3: Switch off the tools that can reach beyond the local database — connect, disconnect, atlas-local-*, knowledge tools in MDB_MCP_DISABLED_TOOLS — scripts/mcp-mongo-local.mjs
- [x] A4: Tell the Human the right value and that only a new terminal window sees it — refusal message and header comment — scripts/mcp-mongo-local.mjs
- [x] A5: Prove it starts fast, offers only local read tools, and never uses npx — source test plus initialize/tools-list start test — scripts/test/mcp-mongo-local.test.mjs
- [x] A6: Record the two traps so the next setup does not repeat them — one gotcha entry — docs/brain/gotchas/agent-workflow.md
- [x] A7: Run every auto check and paste the outputs, and list the three Human setup steps in the hand-off — this plan file (Execution Notes)
- [ ] A8: After the merge, install the new package in the main folder and remove the timeout workaround — Planner only, not the builder: the two steps under After merge, then the [human] card — main folder, user environment

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

### Plan 547 — Give clients their own section: list, add, search, filters and a navigation group (`plans/547-clients-get-their-own-section.plan.md`)
- [ ] A1: Add the Front Desk group to the navigation — frontdesk tab group with the clients chip, header link on desktop and phone; update both specs — src/app/core/components/tab-chips/**, src/app/core/components/header/**
- [ ] A2: Build the client list on the shared list frame — rows, columns for owner and staff, search, kind/tag/lifecycle filters, sort, empty states; spec — src/app/pages/clients/components/client-list/**
- [ ] A3: Let the owner add a client from the list — button, window with the shared client form, toast; hidden for staff; spec cases — src/app/pages/clients/components/client-list/**
- [ ] A4: Register the route, the icon and the words — /clients route with the clients resolver, UserPlus, dictionary keys, breadcrumbs — src/app/app.routes.ts, src/app/app.config.ts, public/assets/data/dictionary.json, src/app/pages/breadcrumbs.md
- [ ] A5: Write the two screen checks and run every check — e2e/ui/547-1.spec.ts, e2e/ui/547-2.spec.ts (`signInQa`); test:ci, build, lint, lint:icons, reuse-lint, breadcrumbs-check, log-query

### Plan 568 — Business report: where the business stands and how it moved since it started with FoodVibe (`plans/design/568-business-report-measured-start-vs-latest-printable.plan.md`)
- [ ] A1: Pin the report numbers with a fixture before writing the code — 8 events over 3 months, expected series, windows, findings, the 2-event case, no-baseline case, access cases — server/test/business-report.test.js
- [ ] A2: Compute the report on the server from measured events only — metric list and thresholds, monthly series, start and latest windows, baseline mapping, rule findings — server/services/business-report.js, server/constants/report.js
- [ ] A3: Serve the report to the owner and to the platform admin only — GET /stats/report with months, businessId and the 400/403/404 answers — server/routes/stats.js
- [ ] A4: Let the app fetch the report — model type, getReport on the stats service, API path — src/app/core/models/business-report.model.ts, src/app/core/services/business-stats.service.ts, src/app/core/services/http-storage.adapter.ts
- [ ] A5: Build the report page with the since-we-started strip, estimates column, trend and findings — lazy route, period radios, not-enough and too-early states, empty state, dictionary keys — src/app/pages/report/**, src/app/app.routes.ts, public/assets/data/dictionary.json
- [ ] A6: Make the report print on one A4 page — component print layout and one appended global print block — src/app/pages/report/report.page.scss, src/styles.scss
- [ ] A7: Link the report from the dashboard card and from each business on the platform page — business-performance link, platform row link — src/app/pages/dashboard/components/business-performance/**, src/app/pages/platform-dashboard/platform-dashboard.page.html
- [ ] A8: Test the page and the two entry points, update the docs, run every check — report.page.spec.ts, two e2e cards, standards-backend row, breadcrumbs; test:server, test:ci, build, lint, lint:icons, log-query — e2e/ui/568-1.spec.ts, e2e/ui/568-2.spec.ts, docs/agent/standards-backend.md, src/app/pages/breadcrumbs.md

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

### Plan 551 — Client profile with one timeline of requests, bookings and events, and merging duplicates (`plans/551-client-profile-timeline-and-merge.plan.md`)
- [ ] A1: Add a server router for merging duplicates and for do-not-contact — merge in one request with the re-key order, counters and unions, conditional stamp; do-not-contact on/off rules; mount; tests — server/routes/clients.js, server/app.js, server/test/clients-router.test.js
- [ ] A2: Refuse to bring a merged client back from Trash — restore 409 CLIENT_MERGED and restore-all skip; tests; Trash page toast — server/routes/generic.js, server/test/clients-router.test.js, src/app/pages/trash/**
- [ ] A3: Record the new router in the rules and docs — INV-1 Touches, backend §5 rows, server breadcrumbs — docs/brain/invariants.md, docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A4: Let the browser call merge and do-not-contact and refresh what moved — mergeClient, setDoNotContact, reloads; spec — src/app/core/services/client-data.service.ts, src/app/core/services/client-data.service.spec.ts
- [ ] A5: Build the client profile header, owner details and one-tap call and WhatsApp — route, header, details card, edit window through the shared form in edit mode, tags editor; spec — src/app/pages/clients/components/client-profile/**, src/app/shared/client-form/**
- [ ] A6: Show one timeline of the client's requests, bookings, events and notes — newest first, links to events, empty state; spec cases — src/app/pages/clients/components/client-profile/**
- [ ] A7: Add the profile actions: new inquiry, merge a duplicate, do not contact — dialog with the client picked, merge picker + confirm + navigate, reason window; spec cases — src/app/pages/clients/components/client-profile/**, src/app/shared/new-inquiry-dialog/**
- [ ] A8: Link the client list rows and the event screen's client chip to the profile — src/app/pages/clients/components/client-list/**, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.html, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.ts, src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
- [ ] A9: Make the front desk map agree with plan 547 on client lifecycle — in docs/frontdesk/frontdesk-map.md lines 116 and 118, mark `lifecycle` as a stored field nothing reads (lifecycle is computed in the browser by `clientLifecycle`, plan 547; see line 198). ADR 0031 is not edited (decisions are superseded, never edited in place); no schema or server change — docs/frontdesk/frontdesk-map.md (Planner review W3, 2026-11-11)
- [ ] A10: Register icons and words, update the family list, write the screen checks and run every check — app.config.ts, dictionary.json, component-families.md (client-picker family: edit mode, initialClient, allowAdd), e2e/ui/551-1.spec.ts, e2e/ui/551-2.spec.ts; test:server, test:ci, server lint, build, lint, lint:icons, reuse-lint, scope-check --arch, log-query

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

### Plan 556 — Onboarding intake form and a front desk checklist for each business type (`plans/556-onboarding-intake-form-and-front-desk-checklist.plan.md`)
- [ ] A1: Let the server compute what the front desk still needs, per business type — the checklist service, setup-status frontDesk block, admin row — server/services/front-desk-setup.js, server/routes/business.js, server/routes/admin.js, server/test/front-desk-setup.test.js
- [ ] A2: Save the whole intake form in one request — the strict intake schema and the intake route (profile, knowledge drafts, optional baseline) — shared/schemas/front-desk-intake.schema.ts, shared/schemas/index.ts, server/routes/business.js, server/test/front-desk-intake.test.js
- [ ] A3: Make a test request that adds no customer and creates nothing when approved — the test flag on the manual body, the test branches in create, approve, decline and ask — shared/schemas/entities/request.schema.ts, server/routes/requests.js, server/test/front-desk-intake.test.js
- [ ] A4: Build the intake page with a section for each business type — route, form, field map, baseline group, print rules — src/app/pages/frontdesk/frontdesk-onboarding/**, src/app/pages/frontdesk/breadcrumbs.md, src/app/app.routes.ts, src/styles.scss
- [ ] A5: Add the test-request button and the save, print and skipped-answers messages — src/app/pages/frontdesk/frontdesk-onboarding/**
- [ ] A6: Show the checklist to the owner on the dashboard and to the platform admin — checklist card, SetupStatus type, platform column — src/app/pages/dashboard/components/front-desk-checklist-card/**, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts, src/app/core/services/business.service.ts, src/app/core/services/platform-admin.service.ts, src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts
- [ ] A7: Add the words and icons the screens use — dictionary keys, icon registration — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] A8: Reword the restaurant occasion question so it does not read as a joke — `fd_q_occasion` value "אירוע מיוחד? (יום הולדת, יום נישואין…)" — public/assets/data/dictionary.json (Planner review of plan 548 templates, W3 2026-11-11)
- [ ] A9: Add a kashrut question ("דרישות כשרות") to the catering and private chef templates — new `fd_q_kashrut` question and key — shared/schemas/front-desk-templates.ts, public/assets/data/dictionary.json, server/test/front-desk-profile.test.js
- [ ] A10: Add a dietary / allergy question to catering events (today only private chef asks it) — reuse the private chef question key — shared/schemas/front-desk-templates.ts, server/test/front-desk-profile.test.js
- [ ] A11: Ask a start time on private chef and catering events — `timeQ()` in both kinds — shared/schemas/front-desk-templates.ts, server/test/front-desk-profile.test.js
- [ ] A12: Make the catering venue question required (out-of-area declines depend on it) and say "בופה" instead of "מזנון" — shared/schemas/front-desk-templates.ts, public/assets/data/dictionary.json
- [ ] A13: Prove the catering event-type question still works when a business has no event types (its options come from the taxonomy) — one test case — server/test/front-desk-profile.test.js
- [ ] A14: Keep a request from waiting past its own time — a restaurant request stays open 4 h but its lead time is only 2 h, so a short-notice request can still be waiting after the time it asked for; a request expires at the earlier of expireAfterHours and its requested start, with a test for the short-notice case — shared/schemas/front-desk-templates.ts, server/test/front-desk-profile.test.js (ask the Human with approved: if the expiry code lives outside this scope)
- [ ] A15: Write the two screen checks and the backend docs row, then run every check — e2e/ui/556-1.spec.ts, e2e/ui/556-2.spec.ts, docs/agent/standards-backend.md

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

### Plan 557 — The platform admin moves a front desk between draft, pilot, active and suspended; the owner exports clients, requests and bookings (`plans/557-front-desk-status-by-the-platform-admin-and-csv-export.plan.md`)
- [ ] A1: Let the profile and business keep the admin's changes and reasons — adminHistory, frontDeskPlan, the admin body schema, level and history kept on owner writes — shared/schemas/entities/front-desk-profile.schema.ts, shared/schemas/entities/business.schema.ts, shared/schemas/front-desk-admin.schema.ts, shared/schemas/index.ts, server/routes/generic.js
- [ ] A2: Give the platform admin one route to set status, assistant level and plan with a reason — server/routes/admin.js
- [ ] A3: Test the route, the owner-write guard and that a suspended page is closed but its data still readable — server/test/front-desk-status.test.js
- [ ] A4: Let the platform admin change a business's front desk from the platform page — row status and level, the dialog and its service call — src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts, src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts, src/app/pages/platform-dashboard/components/front-desk-admin-dialog/**, src/app/core/services/platform-admin.service.ts
- [ ] A5: Tell members when their front desk is suspended — the shared banner on the dashboard and the settings page — src/app/shared/front-desk-status-banner/**, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts, src/app/pages/frontdesk/frontdesk-settings/**
- [ ] A6: Let the owner download clients, requests and bookings as files Excel opens in Hebrew — CSV helper and the export card — src/app/core/utils/csv.util.ts, src/app/core/utils/csv.util.spec.ts, src/app/pages/frontdesk/frontdesk-settings/**
- [ ] A7: Add the words, icon, registry and docs rows, the download check, and run every check — public/assets/data/dictionary.json, src/app/app.config.ts, docs/brain/component-families.md, docs/agent/standards-backend.md, src/app/pages/frontdesk/breadcrumbs.md, e2e/ui/557-1.spec.ts

### Plan 559 — Front desk numbers for the owner and the platform admin (`plans/559-front-desk-numbers-for-the-owner-and-the-platform-admin.plan.md`)
- [ ] A1: Pin the front desk numbers with seeded requests before writing the code — two businesses, test requests, after-hours cases, decision log, bookings, events from requests, access cases — server/test/frontdesk-stats.test.js
- [ ] A2: Compute the front desk numbers on the server, never counting test requests — the service with its after-hours helper and baseline twins — server/services/frontdesk-stats.js, server/services/business-stats.js
- [ ] A3: Serve the numbers to the owner and to the platform admin, also as a file — owner route with range and businessId; admin route with rows and CSV; admin tests — server/routes/stats.js, server/routes/admin.js, server/test/admin-frontdesk-stats.test.js
- [ ] A4: Show this week's front desk numbers as a card on the dashboard — model, service method, card, mount, dictionary keys, spec — src/app/core/models/frontdesk-stats.model.ts, src/app/core/services/business-stats.service.ts, src/app/pages/dashboard/components/frontdesk-week-card/**, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html, public/assets/data/dictionary.json
- [ ] A5: Add the front desk block to the business report — section, estimates beside measured numbers, spec cases — src/app/pages/report/**
- [ ] A6: Give the platform admin the numbers per business and the download — three columns, CSV button, service method — src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts, src/app/core/services/platform-admin.service.ts
- [ ] A7: Test the dashboard card end to end, update the docs, run every check — one e2e card, standards-backend rows; test:server, test:ci, build, lint, lint:icons, log-query — e2e/ui/559-1.spec.ts, docs/agent/standards-backend.md

### Plan 582 — Recipe AI examples stay inside their business (`plans/582-recipe-ai-examples-stay-inside-their-business.plan.md`)
- [ ] A1: Stamp and prune recipe examples per business — `saveShot(req, …)` with `businessId`, per-business count and pruning, `POST /shots` passes `req` — server/routes/ai.js
- [ ] A2: Read only the caller's own approved examples — `getApprovedShots(req, limit)` with `scopeFilter(req)`; both callers pass `req`; comment block updated — server/routes/ai.js
- [ ] A3: Test the scope, the prune and the stamp — the four `[auto]` cases above — server/test/ai-shots.test.js
- [ ] A4: Run test:server, the server lint and log-query, and paste the output lines under Execution Notes

### Plan 583 — Give every shared product real shelf prices from three or more chains and corrected allergens, checked by a script (`plans/583-catalog-real-chain-prices-and-allergens.plan.md`)
- [ ] A1: Back up, then measure the catalog as it is — run `node server/scripts/db-backup.js --target=local --out=<work>/backup-<yyyymmdd-hhmm>`; write `inventory.js` (read-only): counts of non-deleted master products, products with no positive source price, products with no allergens, exact-name duplicate groups, names ending in a space and a number (twins renamed by plan 379), the resolving product-ingredient-line count of criterion 7, the base units in use, the master allergen and category keys, and per product the number of recipe and dish lines that use it. Output `<work>/inventory.json` and a printed summary. — `server/scripts/catalog-enrichment/inventory.js`, `server/scripts/catalog-enrichment/lib/work-dir.js`
- [ ] A2: Merge exact-name duplicates with the existing tool — dry run `node server/scripts/dedupe-master-names.js --target=local --out=<work>/dedupe-dry.json`; when it lists product groups, run it again with `--write`; then re-run `inventory.js`. Zero groups → skip. No `--force-delete`.
- [ ] A3: Download and read the chain price files — `fetch-price-files.js` downloads the newest full price file of one large store for each of 5 chains (first choice: Shufersal, Rami Levy, Yochananof, Osher Ad, Tiv Taam; any other chain publishing under the same rules may replace one that fails), unzips with `node:zlib`, and writes one normalized JSON per chain: `{ chain, chainNameHebrew, storeId, fileDate, items[] }` with per item `code`, `name`, `manufacturer`, `quantity`, `unit`, `isWeighted`, `price`, `unitPrice`. Element names are read case-insensitively and recorded as found. Fewer than 3 chains readable after trying 8 → write the report, write nothing to the data, stop. — `server/scripts/catalog-enrichment/fetch-price-files.js`, `server/scripts/catalog-enrichment/lib/price-file.js`
- [ ] A4: Pure price and name helpers with tests — `pricePerBaseUnit(item, baseUnit)` (pack size and unit → price per gram / ml / kg / liter / unit; `null` when the pack size cannot be read), `withoutVat(price, vatExempt)`, `normalizeHebrewName` (niqqud, punctuation, size and brand tokens removed), `scoreMatch(productName, itemName)`, `inBand(pricePerKgOrLiterOrUnit)` (per kg or liter: 0.5 to 2000 ILS; per unit: 0.05 to 500 ILS). Tests cover each helper with fixture items, including a weighted item, a 6-pack, a 100 g price and an unreadable size. — `server/scripts/catalog-enrichment/lib/pricing.js`, `server/scripts/catalog-enrichment/lib/matching.js`, `server/test/catalog-enrichment.test.js`, `server/test/fixtures/catalog-enrichment/**`
- [ ] A5: Build candidates — `build-candidates.js` writes, per master product, the 5 best-scoring items of each chain with their computed price per base unit to `<work>/candidates.json`, products ordered by recipe usage (most used first). — `server/scripts/catalog-enrichment/build-candidates.js`
- [ ] A6: Pilot on the 50 most used products, then audit — the Worker reads the candidates and writes `<work>/decisions.json`: per product and chain the accepted item codes (items that are the same thing a caterer would buy for that product) or none, `vatExempt`, the allergen keys with a one-line reason, and a reason when fewer than 3 chains match. The price of a chain is the median of its accepted items. Then a fresh-context subagent that sees only product name, base unit, accepted item names and prices marks each product `agree` or `disagree`; result in `<work>/audit-pilot.json`. Agreement under 90% → fix the helpers or the decision rules and repeat, at most 3 rounds; still under 90% → write the report, write nothing to the data, stop.
- [ ] A7: Decide the rest — the same judgment for every remaining product in batches of 40, appended to `decisions.json`. A product whose chain prices differ by more than 2.5× gets its outlier chain dropped or is re-matched; with fewer than 3 chains left it is `unresolved`. Then the P1 web fallback.
- [ ] A8: Apply — `apply-enrichment.js` builds the supplier documents and the changed product documents from `decisions.json`, checks each with `parseV2`, prints `changes: <n>` and a before/after sample, and with `--write` writes them and `<work>/ledger.json` (`priced` / `unresolved` + reason per product id, old and new sources, old and new allergens). Run dry, read the output, then run `node server/scripts/catalog-enrichment/apply-enrichment.js --target=local --write`, then `node server/scripts/bump-master-version.js`, then `node server/scripts/reset-user-from-master.js --user=dev-guest --target=local --write` so the dev guest gets the corrected catalog on its next sign-in. — `server/scripts/catalog-enrichment/apply-enrichment.js`, `server/scripts/catalog-enrichment/lib/build-docs.js`
- [ ] A9: Final audit and report — a fresh-context subagent audits 100 random `priced` products the same way as A6 (`<work>/audit-final.json`); a `disagree` product is re-matched or moved to `unresolved` and A8 is re-run. `report.js` writes `<work>/REPORT.md`: totals (products, priced, unresolved by reason, share of recipe ingredient lines now priced), chains and file dates used, the 30 biggest price changes, every allergen removed, the `unresolved` list ordered by recipe usage, and likely duplicates (products that matched the same item codes, and number-suffix twins) for the Human to decide. — `server/scripts/catalog-enrichment/report.js`
- [ ] A10: Prove it — write `verify-enrichment.js` with the nine checks of the first success criterion and run every `[auto]` check. A failed check is fixed at its cause and the checks are run again; a check is never weakened. Copy the report's totals and the verify output into `## Execution Notes`; add one row for the folder to `server/breadcrumbs.md`. — `server/scripts/catalog-enrichment/verify-enrichment.js`, `server/breadcrumbs.md`

## 6. KEEP DEFERRED — intentional park

> Do not execute against current policy / product decisions. Plan 471 (exports) is parked too (needs a Human walk-through session).

### Angular 22 Migration (deferred)
- Remaining `npm audit --omit=dev --audit-level=high` findings are all `@angular/*` (XSS in template/attribute namespace + two-way binding sanitization, DoS via OOM in formatDate/digitsInfo, HttpTransferCache cache-key/info-leak) — blocked on the Angular 22 major upgrade.
- Do **not** run `npm audit fix --force`.
- Server `npm audit --omit=dev` is clean (0 vulnerabilities).
- CI (`.github/workflows/security.yml`) runs `npm audit --omit=dev --audit-level=critical`. `--omit=dev` is permanent (devDependency build-tooling churn — Angular CLI, vite, webpack-dev-server — is noise for a never-shipped tree, not app risk); restore `--audit-level=high` on top of `--omit=dev` after the migration clears the `@angular/*` findings above. See `docs/brain/decisions/0005-scope-npm-audit-to-production-deps.md`.

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

### Plan 584 — Sign-up asks the new owner to read and accept the terms, and stores the acceptance (`plans/584-signup-read-and-accept-the-terms.plan.md`)
- [ ] A1: Terms file + server version reader — `public/assets/legal/terms.he.json`, `server/utils/terms-version.js`, note line in `docs/frontdesk/pilot-terms-draft.md`
- [ ] A2: Model fields, `toPublicUser`, sign-up check, accept route — `server/models/user.model.js`, `server/routes/auth.js`
- [ ] A3: Server tests — new `server/test/auth-terms.test.js`; add `termsVersion` to the three existing sign-up test files
- [ ] A4: Client model + service — `src/app/core/models/user.model.ts`, `src/app/core/models/terms.model.ts`, `src/app/core/services/terms.service.ts` (+ spec), `UserService.signup` gets `termsVersion` and the error map (+ spec)
- [ ] A5: Terms popup — `src/app/core/components/terms-modal/**` (+ spec), dictionary keys
- [ ] A6: Sign-up row — `auth-modal.component.{ts,html,scss,spec.ts}`
- [ ] A7: Gate for existing users and every new version — `src/app/core/components/terms-gate/**` (+ spec: shows for null, shows for an older version, hides for the current one, never for a guest), `src/app/appRoot/app.component.{ts,html}`
- [ ] A8: QA login accepts the terms — `scripts/qa/lib/qa-login.mjs`, `e2e/helpers/qa-session.ts` only if its types change
- [ ] A9: Screen checks and every gate check — `e2e/ui/584-1.spec.ts`, `e2e/ui/584-2.spec.ts`; breadcrumbs rows for the new folders; standards-backend row

### Plan 585 — Terms popup: read to the end on every screen, and cancelling an unaccepted popup signs the user out (`plans/585-terms-popup-read-to-end-on-desktop-and-cancel-signs-out.plan.md`)
- [ ] A1: Make the terms text the only scrolling box so desktop also needs a scroll to the end — terms-modal.component.{ts,html,scss}
- [ ] A2: Let the gate popup be closed, and sign the user out to the welcome page when they do — terms-gate.component.{ts,html}
- [ ] A3: Prove both in unit tests and one desktop-size screen check — terms-modal.component.spec.ts, terms-gate.component.spec.ts, e2e/ui/585-1.spec.ts

### Plan 586 — The clients list on a phone works like the other list pages: name fixed, other columns in the column carousel (`plans/586-clients-list-on-a-phone-uses-the-column-carousel.plan.md`)
- [ ] A1: Move the clients list's extra columns into the shared column carousel on phones — client-list.component.{html,scss,ts}
- [ ] A2: Test the carousel header and keep every old case passing — client-list.component.spec.ts
- [ ] A3: Phone-size screen check and the family registry line — e2e/ui/586-1.spec.ts, docs/brain/component-families.md

### Plan 587 — The AI menu picks dishes only (no portions or prices), and asks for the guest count instead of guessing one (`plans/587-ai-menu-picks-dishes-only-and-asks-for-the-guest-count.plan.md`)
- [ ] A1: Stop the AI from setting portions or prices, and stop it guessing a guest count — server/routes/ai.js (both prompts + answer clean-up)
- [ ] A2: Stop the menu popup from copying portions and prices into the dish lines — ai-menu-modal.component.ts, ai-menu-draft.model.ts
- [ ] A3: Prove both on the server and in the popup — server/test/ai-menu.test.js, ai-menu-modal.component.spec.ts

### Plan 588 — A removed logistics question leaves the card after the visit, and sits behind a small "removed (N)" link (`plans/588-removed-logistics-questions-leave-the-card-after-the-visit.plan.md`)
- [ ] A1: Show a removed question only during the visit it was removed in — logistics-item-manager.component.ts
- [ ] A2: Add the small removed-count link that lists removed questions with restore — logistics-item-manager.component.{html,scss}, dictionary key
- [ ] A3: Test it and keep the screen checks in line — logistics-item-manager.component.spec.ts, e2e/ui/581-1.spec.ts, e2e/ui/581-2.spec.ts
