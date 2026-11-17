# Active Tasks

> Rearranged 2026-07-21 per [`.claude/reports/todo-ledger-relevance-audit-2026-07-21.md`](reports/todo-ledger-relevance-audit-2026-07-21.md).
> Checkboxes are **unchanged** — decide per group: execute / mark done / prune / keep.
> **2026-09-16 (overnight):** `/auto-solve` running unattended in worktree `../foodVibe1.0-wt-auto-solve` on branch `feat/auto-solve-overnight`, self-approving each plan (no Human present). See that branch's `OVERNIGHT-REPORT.md` for what landed — nothing pushed/merged without Human review.

---

## Execution order (Planner review 2026-11-11, `node scripts/plan-order.mjs` at d4e904bb)

Orchestrator chain (Human 2026-11-11; each run branch starts from the previous one; the Human validates and merges them in this order):
- CHAIN DONE 2026-11-13: batches 1–3 + fixes on main (PRs #553 #555 #557 #559 #561 #563 #564); batch-4, batch-5, run-589, run-593 wait on hand checks (section "Chain finished")
- batch-1 · run-546: **546, 558, 567, 575, 579** — built, all 5 merged into `orch/run-546` (429e7314); hand checks ①–⑦ done 2026-11-12 (H1 below), ⑧ pilot terms reworked; waits on the Human's merge · base of batch-2
- batch-2 · running since 2026-11-12 (547 retried after `approved:` for its header spec)
- batch-2 · `orch/batch-2`: **580, 581, 547, 568** (dependency markers for 546/567/579 added on the branch) (542 left out: only its Planner-only A8 is open)
- batch-3 · `orch/batch-3`: **553, 554, 551, 552**
- batch-4 · `orch/batch-4`: **556, 555**
- batch-5 · `orch/batch-5`: **557, 559**
- batch-6 · `orch/batch-6`: **582, 595, 596** — merged #573 2026-11-14 (580 closed first: it was on main via #569 but still open, so the dry run pulled it in)
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

### Chain finished 2026-11-13 — merges and hand checks left (report: Planner scratch chain-report-2026-11-13.md)
- [ ] M1: Merge orch/run-589 (589 + 591 + 592) after card A1 — shared recipe link needs sign-in, then opens the recipe
- [ ] M2: Merge orch/run-593 (593) after card B1 — no terms popup in a new browser after accepting
- [ ] M3: Merge orch/batch-4 (555, 556) after cards C1 (public request page /book/demo-catering) and C2 (onboarding form prints, 3 business types)
- [ ] M4: Merge orch/batch-5 (557, 559; contains batch-4) after cards D1 (/platform status moves + assistant level), D2 (front desk numbers match /requests), D3 (three CSV exports in Excel)
- [ ] M5: Batch-3 card ③ never answered — front desk settings quick and clear in Hebrew (on main)
- [ ] M6: Batch-3 card ④ knowledge import "ok for now" — try more real caterer sites
- [ ] M7: e2e/cook-view.spec.ts relies on the automatic guest — sign in with signInQa (fails once 589 is on main)
- [ ] M8: Dead code: menu-ai-flow.service.ts:37 still copies serving_portions / sell_price (batch-2-fix D2)
- [ ] M9: After 589 and batch-4/5 meet on main, run node scripts/route-guard-check.mjs (new routes need authGuard)

### Hand checks — Human 2026-11-12 (runs 584 and batch-2)
- [x] V1: run-584 cards ①–⑥ (terms popup, sign-up blocked, phone reading, existing account, no repeat, guest) — Human 2026-11-12: ok; follow-ups → plan 585 (desktop scroll, cancel signs out)
- [x] V2: batch-2 cards ②, ⑥, ⑦ (report print, admin removal choice, card on phone) — Human 2026-11-12: ok
- [x] V4: plan 585 cards ①–③ (desktop scroll to end, close signs out, popup returns) — Human 2026-11-12: ok
- [x] V6: batch-2-fix cards ①–④ (clients on phone, AI menu dishes only, missing guests, removed questions) — Human 2026-11-12: all done
- [x] V7: plans 589 + 591 cards ①–④ — Human 2026-11-12: done; ④ shared recipe went to welcome, and the Human wants that → plan 592
- [x] V5: Human idea 2026-11-12: a signed-out visitor sees only the welcome page (no local auto-guest) — needs a plan; questions asked
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
- [x] A1: Record whether we accepted each AI answer, count refused ones as failed and split failures by reason — `_id` and `outcome` in `buildRow`, ids in `usage.ids`, `markAiUsageRejected`, `trackAiOutcome`, `failedCalls` with `outcome: 'rejected'`, `failures` per reason — server/services/ai-usage.js
- [x] A2: Hook every AI route to the outcome tracker — `router.use(trackAiOutcome)`, `usageOf(req)`, every `usage:` line — server/routes/ai.js
- [x] A3: Give every AI failure a stable reason code — `code` in `respondFromGeminiFailure`; `not_configured`, `empty_response`, `unreadable`, `invalid_patch` on `/generate-menu` and `/patch-menu`; `menuRejectCode`; raw answer and code on `ai.generate_menu.validation_failed` — server/routes/ai.js
- [x] A4: Build the menu from the dishes in the business's recipe book when the text names none — `DISH_BOOK_CAP`, `loadDishBook` (same filter as the book list), the RECIPE BOOK block, the new prompt section, `applyDishBook` — server/routes/ai.js
- [x] A5: Keep menu examples inside their business — `getApprovedMenuShots(req)` with `scopeFilter`, `businessId` and no `dishId` on save, per-business pruning — server/routes/ai.js
- [x] A6: Test the menu route end to end — codes, book scope (own, master copy, deleted, other business, raw master), unknown ids dropped, cap of 300 newest, user-named dishes kept, shots per business, the raw log line — server/test/ai-menu.test.js (pattern: server/test/ai-match-product-names.test.js; `captureLogs` from server/test/helpers/log-capture.js)
- [x] A7: Test the outcome on the ledger and the reason totals — accepted, rejected with code, retried, no outcome on `ok: false`, `failedCalls` and `failures` in the admin totals, stored keys — server/test/ai-usage.test.js
- [x] A8: Link AI-picked dishes by id in the window — `dishId` on `AiMenuDishDraft`, `matchMenuDish` and its spec, `buildMatchedMenu_` uses it — src/app/core/models/ai-menu-draft.model.ts, src/app/core/utils/recipe-match.util.ts, src/app/core/utils/recipe-match.util.spec.ts, src/app/shared/ai-menu-modal/ai-menu-modal.component.ts
- [x] A9: Show the real reason and the uses left in the AI menu window — `ERROR_KEYS` and fallbacks (429 → `ai_limit_reached`), `usesLeftLabel_`, the shorter usage line, the modal dictionary keys — src/app/shared/ai-menu-modal/ai-menu-modal.component.ts, src/app/shared/ai-menu-modal/ai-menu-modal.component.html, public/assets/data/dictionary.json
- [x] A10: Show on `/platform` how the failed calls divide by reason — `failures` on `AiUsageRow`, `failureTitle`, `title` on both failed cells, the `ai_fail_*` keys, spec cases — src/app/core/models/ai-usage.model.ts, src/app/pages/platform-dashboard/platform-dashboard.page.ts, src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts, public/assets/data/dictionary.json
- [x] A11: Add the three screen checks — each spec signs in with `signInQa`, stubs one route with `page.route(…, r => r.fulfill({ status, contentType: 'application/json', body }))` (no Gemini call), opens `/menu-library`, clicks the button with aria-label "פעולות מהירות", then "צור עם AI"; 580-1 and 580-2 fill the textarea with "אירוע ל-50 אורחים" and click "צור תפריט"; each asserts its quoted text and saves `screens/580-N.png` — e2e/ui/580-1.spec.ts (`**/ai/generate-menu` → 502 `{ error: 'Gemini returned invalid menu draft', code: 'no_sections' }`), e2e/ui/580-2.spec.ts (`**/ai/generate-menu` → 429 `{ error: 'Too many AI requests, please try again later' }`), e2e/ui/580-3.spec.ts (`**/ai/usage` → 200 `{ budget: 20, used: 13, remaining: 7, count: 13, models: [] }`, routed before `page.goto`)
- [x] A12: Record the new fields in the docs and the maps — docs/agent/standards-backend.md, docs/frontdesk/frontdesk-map.md, server/breadcrumbs.md; run `node scripts/breadcrumbs-check.mjs` and touch the other four maps only if it names them
- [ ] A13: Run the checks and hand over the two hand checks — test:server, test:ci, both lints, lint:icons, build, breadcrumbs-check, log-query, specs 580-1…3 against the slot app; then the [human] cards

### Plan 581 — Metadata card: edit and remove logistics questions, own sections, everybody or only-me (`plans/581-metadata-card-edit-remove-logistics-questions-own-sections.plan.md`)
- [x] A1: Remove and restore questions by owner or admin choice — class per `.claude/skills/angularComponentStructure/SKILL.md`; inject `BusinessService`, `PermissionService`; `onRemove(row)` (the three cases of P0), `onRestore(term)`, rows carry `hidden`, `canEdit`, `canRemove`; the re-add of a removed own term in `onSubmit` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [x] A2: Edit a question in the add form, asking first about an unsaved one — `editing_` signal, `formRef = viewChild.required<ElementRef<HTMLElement>>('addForm')`, `isDirty()`, `onEdit(term)` (F9 then F8), `onSubmit(): Promise<boolean>` (add, re-add or update), `cancelEdit()` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [x] A3: Start with every environment, give the admin the scope radios and let users add a section — draft `scope: 'mine' | 'everyone'` replaces `shared`, `environments` default all four, `metadata_logistics_env_required`; `sectionOptions` computed from the registry; `onAddSection(typed)` with `AddItemModalService` and `notifyItemAdded` — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.ts
- [x] A4: Show the row buttons, the restore state and the new form controls — template: rows with tag + pencil + trash/restore, hidden rows dimmed with `metadata_logistics_hidden`; `#addForm`; section select with the add option; environment chips and the admin scope radios in `.c-chip-group c-chip-group--tight`; submit label `metadata_add` / `save`, cancel while editing; description `metadata_logistics_desc_v2`; scss: row layout, `.is-hidden` (opacity token) — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.html, src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.scss
- [x] A5: Unit-test the card with stubbed store, registry, business, permission, confirm and add-item modal — envs start all checked; all four → no `environments`; none → `metadata_logistics_env_required` and no `add`; admin "לכל העסקים" → `{ shared: true }`; owner sees no scope radios; pencil loads the term and edit save calls `update` with `environments: []`; dirty form + pencil opens `openTernary` — `'cancel'` keeps the draft, `'confirm'` loads the new term, `'save'` submits first; own remove → `update(term, { removedAt: <number> })`, never `remove`; owner on shared → `updateHiddenLogisticsKeys([key])`; admin `'save'` → `update(master, { removedAt })`, `'confirm'` → hide; restore drops the key; re-add of a removed own text → `update(term, { removedAt: 0, … })`; add-section → `add('logisticsSection', 'סעיף שלי', {}, { shared: false })` and selected; the existing plan-523 cases updated (no lock-less remove chip, no in-use toast) — src/app/pages/metadata-manager/components/logistics-item-manager/logistics-item-manager.component.spec.ts
- [x] A6: Add the Hebrew strings — the keys of UI/UX Notes, appended to `general` — public/assets/data/dictionary.json
- [ ] A7: Write the four screen checks and update 523-3 — 581-1…4 per the `[ui]` lines with `signInQa`, API setup and cleanup in `finally` (own terms "בדיקה 581" and section "סעיף 581" deleted through `DELETE /api/v1/data/taxonomyTerms/:id`), screenshots `screens/581-<n>.png`; 523-3: click the row's trash button (aria "מחיקה") instead of `.c-chip__remove`, and its cleanup also deletes a removed (`removedAt`) "בדיקה E2E"; run each with `pnpm exec playwright test <spec>` with `E2E_APP_URL` / `E2E_API_URL` set to the slot's ports — e2e/ui/581-1.spec.ts, e2e/ui/581-2.spec.ts, e2e/ui/581-3.spec.ts, e2e/ui/581-4.spec.ts, e2e/ui/523-3.spec.ts
- [x] A8: Record the changes in the maps and run every `[auto]` check — paste the outputs under Execution Notes — docs/brain/component-families.md, src/app/pages/breadcrumbs.md

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

### Follow-ups — Planner 2026-11-15

- [ ] F600-1: Follow-up plan — AI menu examples (GEMINI_MENU_SHOTS) get the same saved-signal and shared pool (Human 2026-11-14: separate plan)

### Plan 615 — Register the Modules program once: schemas, collections, indexes, permission lists, AI feature keys and empty routers (`plans/615-register-modules-program-schemas-collections-indexes-empty-routers.plan.md`)
- [ ] A1: Name the five modules and the rule for a business that has no list yet — MODULE_KEYS, DEFAULT_MODULES, modulesOf, hasModule, MODULE_OF_TYPE, modulesFieldSchema, platformHistoryRowSchema, platformUpdateSchema; export from the package index; first cases of the schema test
- [ ] A2: Let a business, a supplier and an event carry the new optional fields without breaking stored ones — modules, platformHistory, aiMonthlyTokenCap, aiPrivate, priceRiseAlertPct with default 5, taxId, siteLogistics.loaded; schema cases; update the two settings tests
- [ ] A3: Describe the nine new kinds of record so the server can validate them — the nine schema files with the export names in Must Have, index exports, SCHEMA_BY_COLLECTION keys; one valid and one refused document each, shared key lists
- [ ] A4: Register the nine collections and who may read or change them — the nine collections.js entries; OWNER_ONLY_TYPES, MONEY_FIELDS, STAFF_READ_FIELDS entries; collections test, cross-business BODY; owner, staff, other-business and 405 cases
- [ ] A5: Create the database indexes the new records are found by — the ten indexes of Must Have with their names and partial filters; index-name and duplicate-key cases
- [ ] A6: Add the four new AI feature names so every later model call can be counted — AI_FEATURES 19 to 23; update the length assertion
- [ ] A7: Open five empty doors under the AI route and share its helpers with them — five Router files, five mounts after trackAiOutcome, four extra exports at the end, the lazy-require comment; 404, module-load and export cases
- [ ] A8: Open five empty doors for files, access, stock, diagnosis and platform learning — five Router files, requires and mounts (admin/learning before admin); 404 cases and the logistics-save-keeps-loaded case
- [ ] A9: Point the architecture rules and the backend docs at the new files — INV-6 and INV-1 Touches lines only; nine rows in the collection table and the routes paragraph; eleven rows in the server map
- [ ] A10: Run every check and record the results — test:server, test:ci, build, both lints, scope-check --arch on this plan, log-query; paste the exit lines into Execution Notes

### Plan 616 — Modules on the server: one gate on every covered route, and the platform admin's switch with a reason (`plans/616-modules-on-the-server-gate-covered-routes-platform-write.plan.md`)
- [ ] A1: Add the one check that says whether a business has a part of the product — businessModules with the 30-second cache, clearModuleCache, requireModule, requireHomeModule, requireModuleForType; cache, default and home-business cases
- [ ] A2: Refuse the shared data route for a kind of record the business does not have — one router.use line after the allowlist; menuEvents, venues, clients either-module, front desk types, never-gated types, anonymous and expired-token cases
- [ ] A3: Refuse the event, client and front desk routes without their module — requireModule after verifyToken on events (eight routes plus logistics), requests, bookings, knowledge, clients, front-desk-intake, stats frontdesk with the platform exception; one case per row
- [ ] A4: Refuse the create-with-AI routes before the limiter and before any model call — ai_create on thirteen routes, frontdesk on knowledge-import, three import routes left open; fetch stub never called
- [ ] A5: Make the public page of a business without the front desk look as if it does not exist — loadPublicProfile returns null; profile read and request post answer 404, nothing written
- [ ] A6: Let the platform admin change a business's modules, cap and private flag with a kept reason — PUT businesses/:id/platform with platformUpdateSchema, history capped at 50, cache cleared, log without the reason; every refusal case
- [ ] A7: Show each business's modules in the platform table data and keep the admin's notes from members — three new row fields in GET businesses; platformHistory left out of GET business; update the exact-keys test
- [ ] A7b: Keep the price-rise alert number when the owner saves the three existing settings — PUT settings keeps a stored priceRiseAlertPct when the body has none, replaces it when the body has one; two added cases
- [ ] A8: Write the new route and the gate into the backend docs and the server map — docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A9: Run every check and record the results — test:server, server lint, build, log-query; paste the exit lines into Execution Notes

### Plan 617 — Monthly AI cap per business, read from the usage ledger and enforced before the model call (`plans/617-monthly-ai-cap-per-business-enforced-before-the-model-call.plan.md`)
- [ ] A1: Work out from the ledger how much AI a business used this month and whether it is over its ceiling — monthRangeOf, capState with the 60-second cache, monthTokensByBusiness, clearCapCache; month boundary, other business, no cap, cap zero and cache cases
- [ ] A2: Stop a capped business before any request leaves for the model and record the refusal — the block after the model is picked; business_cap result, one zero-token ledger row, no fetch; platform calls unread, feature check unchanged, failed read lets the call through
- [ ] A3: Answer a refused AI action with one clear code every AI route shares — business_cap case in respondFromGeminiFailure; parse-text and generate route cases
- [ ] A4: Give the platform table this month's tokens and make a new ceiling count at once — aiTokensThisMonth in GET businesses, clearCapCache after the platform write; update both admin tests
- [ ] A5: Write the cap into the backend docs and the server map — docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A6: Run every check and record the results — test:server, server lint, build, log-query; paste the exit lines into Execution Notes

### Plan 618 — Every business teaches the AI by default, and every AI draft keeps its trail (`plans/618-ai-learning-by-default-and-draft-trail.plan.md`)
- [ ] A1: Add the one test that says whether the platform may learn from a business — new file with mayLearnFrom (aiPrivate not true); unit cases for absent, false, true, undefined and the old shareAiExamples field; businessSchema still accepts a stored shareAiExamples
- [ ] A2: Replace the owner's sharing switch on the server with a private mark only the platform admin sets — setAiPrivate replaces setShareAiExamples (deletes promoted copies when turned on, returns matchedCount, aiPrivate, removed; the comment line for plan 627); remove the route and its two imports; remove shareAiExamplesInpu
- [ ] A3: Offer every business that is not private to the platform admin's examples list and promote action — GET ai-shots filters with mayLearnFrom; promote answers 409 not_shared for a private or missing business; the platform route writes aiPrivate through setAiPrivate and logs the removed count; the ai.js comment
- [ ] A4: Update the shared examples tests to the new consent rule — fixture: bizShareA without a flag, bizPrivateC with aiPrivate true, bizNewB; new case promote 200 for a business that never touched a switch; candidates exclude the private business; the old route answers 404 for owner a
- [ ] A5: Add the draft trail that stores what the AI suggested next to what the person saved — the optional model field in the schema; saveAiDraft (stores the model name when given, never throws, five null reasons, schema check, prune to 500 per business and feature) and confirmAiDraft (own business and pending on
- [ ] A6: Remove the browser's call to the retired route and keep the owner's card building — delete updateShareAiExamples, its type import and the two union members; the card reads aiPrivate, shows a disabled chip and has no save; spec rewritten to two cases: ticked and disabled when the business is not private,
- [ ] A7: Bring the browser checks that used the retired route in line — delete 600-1; drop the two share-ai-examples calls from 600-2 and from 612-1; new 618-1 signs in with signInQa, opens /dashboard?tab=metadata, expects the card #mm-sec-ai-share to contain "שיתוף דוגמאות AI" and to hold n
- [ ] A8: Record the new rule in the backend docs and the server map — the GEMINI_SHOTS row, the deleted route row, the admin ai-shots row, the aiDrafts writer; breadcrumbs rows for the two new files and the business route
- [ ] A9: Run every check and write the evidence into the plan — pnpm run test:server, pnpm run test:ci, pnpm run build, pnpm run lint, pnpm --dir server run lint, node scripts/log-query.mjs --since=plan-start --level=error; exact result lines into Execution Notes

### Plan 619 — Keep invoice files and voice recordings privately, and let the AI read audio and PDF (`plans/619-private-file-store-and-audio-pdf-model-input.plan.md`)
- [ ] A1: Put the file limits and allowed file types in one shared place — FILE_BASE64_MAX, FILE_KINDS, FILE_MIME_TYPES, VOICE_FILE_KEEP_DAYS and the optional format field in the stored-file schema; pnpm run build:schemas
- [ ] A2: Build the signed requests to the file store as pure functions checked against the provider's own examples — signParams, resourceTypeOf, uploadRequest, downloadUrl, destroyRequest; tests: the two published signatures, upload URL per kind, type authenticated, expires_at, no secret in any URL or field
- [ ] A3: Add the file store service that keeps a file privately and never breaks a feature when it cannot — isFileStoreConfigured, the real store over fetch and FormData, setFileStoreForTests, createMemoryFileStore, readUploadedFile, putPrivateFile with deleteAfterDays, keepStoredFile, signedFileUrl, deleteStoredFile; tests on
- [ ] A4: Let a member open a stored file through a link that expires and let the platform admin see if storage is on — GET /:id (own business, invoice needs editMoney, 404, 403, 503, lazy sweep) and GET /status; tests for each status code with signTestToken; update plan 615's empty-router test for these two routers; the mediaSrc line in 
- [ ] A5: Delete voice recordings after twenty-four months — RETENTION.voiceFilesDays, the storedFiles sweep (50 per run) through deleteStoredFile, the files count; update the two toEqual assertions of the existing test and add the five file cases
- [ ] A6: Send an audio or PDF request only to a model that can read it — MODEL_MEDIA, modelTakes, needsMedia in callGemini with needsVision kept as image; tests: pdf skips gemini-2.5-flash, audio does not, every DEFAULT_MODELS entry has media, unknown value throws under vitest, the existing v
- [ ] A7: Count audio seconds and attached files in the AI usage ledger — fileCount and audioSeconds in buildRow; three new cases; the stored-field-list test still passes for a text call
- [ ] A8: Leave nothing of a business behind when the platform admin deletes it — deleteBusinessServerData (stored files through deleteStoredFile, then the five collections, the warn for files left, the placeholder comment); called from the whole-business branch of the delete route; the new test on th
- [ ] A9: Document the three keys and the go-live steps without writing any value — render.yaml entries, .env.example names, the new section and retention row in the security doc, the backend standards rows, the server map rows
- [ ] A10: Run every check and write the evidence into the plan — pnpm run test:server, pnpm --dir server run lint, pnpm run build, node scripts/log-query.mjs --since=plan-start --level=error; exact result lines into Execution Notes; the [human] card is handed over for gate G3

### Plan 620 — Show each business only the modules it has, and give the platform admin one dialog for modules, AI cap and private mode (`plans/620-modules-and-ai-rules-in-the-browser.plan.md`)
- [ ] A1: Add the one browser service that knows which modules the business has — loaded_ on BusinessService (spec cases: false then true after the answer, true after an error, true when signed out); ModuleService with modules_, has, hasType, ready (spec cases from the Done-when); a row for the new fi
- [ ] A2: Send a user who opens a screen of a missing module back to the dashboard — moduleGuard factory with its spec (true, UrlTree, waits for ready, true when signed out); the guard added to the eleven routes after authGuard
- [ ] A3: Hide the header links and tab chips of modules the business does not have — navLinks_ and the two bottom-bar links; the modules field on eight chips and the fewer-than-two rule; both specs provide a ModuleService stub { has } (all on by default so the existing link-list cases pass unchanged) and
- [ ] A4: Stop the browser from asking the server for data of a module that is off — the five read methods and the two bulk Trash calls of the adapter with its new spec (HttpTestingController: no request for requests without frontdesk, clients with only events, products always); the Trash section list wi
- [ ] A5: Hide the logistics panel and every create-with-AI entry when the business lacks the module — the panel's template inside one @if (spec case: renders nothing without event_logistics); module on HeroFabAction and the filter in the FAB (spec case); module ai_create on the six actions (same line in the growth-frozen
- [ ] A6: Tell the user in Hebrew when the monthly AI cap is reached — aiCapErrorKey with its spec (the cap body, another 429, a non-object); asked first in the five places (one spec case each); the key ai_monthly_cap_reached, the four AI feature labels and ai_fail_business_cap
- [ ] A7: Give the platform admin one dialog for a business's modules, AI cap and private mode with a required reason — BusinessRow fields, PlatformUpdateBody, updatePlatform; the dialog component, template, service and spec (the five Done-when cases plus cancel closes without a request and a 500 keeps the dialog open with a toast); the m
- [ ] A8: Show each business's modules and its AI use against the cap in the platform table — the two cells and header cells, the two grid tracks, the private tag, the settings action button that opens the dialog, the dialog mounted under @if (isOpen_()); page spec cases (modules text, tokens / cap, no cap, priva
- [ ] A9: Turn the owner's sharing card into a locked chip that shows shared or private — the locked span with the lock icon, title and aria-label, the new description key; spec rewritten to three cases (shared text by default, private text when aiPrivate is true, title equals the tooltip key and there is no 
- [ ] A10: Write the four browser checks and run every gate — 620-1 and 620-2 set the QA business's modules through PUT /api/v1/admin/businesses/<id>/platform (id from GET /api/v1/business, reason "e2e 620"), reload, assert, and restore the four defaults in finally; 620-1 also fail

### Plan 621 — Voice note to transcript on the server, with the recording kept (`plans/621-voice-note-to-transcript-on-the-server-recording-kept.plan.md`)
- [ ] A1: Confirm what wave 0 left for a voice route before any code is written — read the merged `server/routes/ai/voice.js` (empty router with the lazy-require comment), the four exports at the end of `server/routes/ai.js` (`respondFromGeminiFailure`, `usageOf`, `requestedModel`, `aiLimiter`), `serv
- [ ] A2: Define the request and reply of a transcription once for server and browser — `VOICE_MIME_TYPES`, the size, length and transcript limits, `VOICE_PURPOSES`, the two Zod schemas and their types; run `pnpm run build:schemas` and check `server/generated/schemas/ai-voice.schema.js` appears
- [ ] A3: Write the transcription prompt and the model request so the recording is only ever data — `VOICE_TRANSCRIBE_PROMPT` word for word as in this plan, the `user` content with the `inlineData` part, `MODEL_MIME`, `generationConfig`; re-read the provider's audio page and note the accepted types in Execution Notes
- [ ] A4: Add the route that turns one recording into text and keeps the recording when storage exists — the ten handler steps in order, the two 400 codes, the 503, the failure mapping, the size-only log line
- [ ] A5: Prove the route with a fake model and a fake file store — every [auto] case of this plan: success with a stored file, store not configured, silence, the 20,000 cut, 401, staff allowed, the four bad bodies, the size limit, the prompt placement, the ledger row, a model failure, t
- [ ] A6: Run the full checks and write down what was verified — `pnpm run test:server`, `pnpm --dir server run lint`, `pnpm run build`, `node scripts/log-query.mjs --since=plan-start --level=error`; exact result lines into Execution Notes

### Plan 622 — Site-visit notes become a checklist draft on the server (`plans/622-notes-to-checklist-draft-on-the-server.plan.md`)
- [ ] A1: Confirm what wave 0 left for the extract route before any code is written — read the merged `server/routes/ai/logistics.js` (empty router with the lazy-require comment), the four exports at the end of `server/routes/ai.js`, `server/middleware/require-module.js` (`requireModule`, `clearModuleCach
- [ ] A2: Move the rule for which questions an event shows into one function the server can use too — `visibleLogisticsItems` and `VisibleItemTerm` as specified, with the server fixtures; `pnpm run build:schemas` produces `server/generated/schemas/logistics/visible-items.js`
- [ ] A3: Prove the new function gives exactly the list the logistics panel shows today — the parity spec that runs every fixture through the registry service and the shared function and compares keys and order; the service itself is not edited
- [ ] A4: Define the request, the model answer, the draft and the confirm body once for server and browser — the constants, the five schemas and their types
- [ ] A5: Turn the model's numbered answers into a safe draft with code, never with the model — `buildQuestionList`, `cleanLogisticsDraft` (drop, cut, conflicts, ad-hoc, unanswered) and `keptRatio`, each rule with its own fixture
- [ ] A6: Add the route that reads the notes against the event's own questions and writes nothing to the event — the eleven handler steps, `LOGISTICS_EXTRACT_PROMPT` word for word, the draft trail row, the counts-only log line
- [ ] A7: Add the route that records what the owner finally kept so accuracy can be measured — `POST /extract/:draftId/confirm` with the body schema, `confirmAiDraft` and `keptRatio`, 404 for a foreign draft
- [ ] A8: Prove both routes end to end with a fake model — only keys of the sent list, the event unchanged, 403 for staff, `MODULE_OFF`, 404, 409, `TEXT_TOO_LONG`, the note only in the user part, the ledger row, the draft row and its confirmation, nothing sensitive in the logs
- [ ] A9: Run the full checks and write down what was verified — `pnpm run test:server`, `pnpm run test:ci`, both lints, `pnpm run build`, `node scripts/log-query.mjs --since=plan-start --level=error`; exact result lines into Execution Notes

### Plan 623 — Logistics panel: record or paste site-visit notes, review the draft line by line, save (`plans/623-logistics-panel-record-or-paste-notes-review-the-draft-save.plan.md`)
- [ ] A1: Make the browser use the one shared rule for which questions an event shows — `forEvent` becomes a call to `visibleLogisticsItems`; the existing service spec and the parity spec stay green untouched
- [ ] A2: Give the browser's AI client the three calls this screen needs — `transcribeVoice` (base64, the size guard before the request), `extractLogistics`, `confirmLogisticsDraft`; spec cases for the URLs, the bodies, `AUDIO_TOO_LARGE` thrown with no request, the usage counter
- [ ] A3: Build the shared recorder that turns a spoken note into text and falls back to typing — `app-voice-note` with its four states, the 180-second stop, the mime choice, release on destroy, the error mapping; spec with a fake `MediaRecorder` and fake `navigator.mediaDevices` (no microphone, no network), includin
- [ ] A4: Build the draft view where the owner keeps, changes or drops each suggested line — `app-logistics-note-draft`: the input step, the four review groups, conflicts off by default, the save mapping, the confirm call, cancel and failure behaviour; spec for each rule in this plan's Done-when and for the empt
- [ ] A5: Open the note block from the logistics card for a member who may edit — the `notesOpen_` signal, the chip button and the child tag; panel spec cases: the button shows for an owner, not for read-only or a finished event, and `done` closes the block
- [ ] A6: Add every Hebrew text of the note block and the recorder to the dictionary — the 29 keys of UI/UX Notes appended to `general`, each checked as absent first
- [ ] A7: Record the new recorder family and the moved rule where the next plan will look — the `### voice-note` entry, the line in the `taxonomy` entry, the row for the new shared folder
- [ ] A8: Script the three on-screen checks so they can run without a model or a microphone — `623-1` (paste, faked extract answer, the two headings), `623-2` (`addInitScript` removes `MediaRecorder`, the fallback notice), `623-3` (faked draft with one answer for the real question "קירור קיים במקום (מקרר/חדר קירו
- [ ] A9: Run the full checks and hand Dandan the two hand checks — `pnpm run test:ci`, `pnpm run lint`, `pnpm run lint:icons`, `pnpm run lint:reuse`, the registry and breadcrumbs checks, `pnpm run build`, `node scripts/log-query.mjs --since=plan-start --level=error`; exact result lines

### Plan 624 — Loading list for an event: what to put on the truck, printable, ticked as it is loaded (`plans/624-loading-list-pure-builder-printable-sheet-ticks-on-the-event.plan.md`)
- [ ] A1: Build the one function that decides what goes on the truck and how many — `buildLoadingList` and `LoadingRow` as specified; server tests for the 150 and 220 guest fixture, the minimum, the open maximum, no rule, `perGuests: 0`, a deleted record, each status and payer, the quantity fallback, th
- [ ] A2: Keep the ticks on the event so everyone loading sees the same list — `PUT /:id/loading` with the eight handler steps and the atomic update; tests seeded the way the logistics route test of plan 519 seeds its events (`stored(menuEventBody(…))`; owner, staff, outsider, finished, module off 
- [ ] A3: Let the browser read and send a tick — the `loaded` field on the event type and `saveLoading` on the events client, with a spec case for the URL and body
- [ ] A4: Show the list as a sheet that can be ticked and printed — `app-loading-list` in the popup frame: the bar, the event line, the equipment group and the section groups, the tick with its waiting state, the shortage mark, the empty state, the finished-event state, the print class a
- [ ] A5: Open the sheet from the event's logistics card for every member — the `loadingOpen_` signal, the footer button outside the edit test, the deferred sheet tag; panel spec cases: the button shows for staff and opens the sheet
- [ ] A6: Let the owner say how many of an equipment item an event needs — the switch and three numbers in the equipment form, their validation, the save rule including switching off with zero; the model comment; spec cases for save, switch off, a bad maximum and hydrating a stored rule
- [ ] A7: Show each item's rule in the equipment list so a missing one is seen at a glance — the `col-scaling` header and cell, `scalingSummary`, the wider grid template; spec cases for an item with a rule, with an open maximum and with none
- [ ] A8: Add the Hebrew texts of the sheet and the rule to the dictionary — the ten keys of UI/UX Notes appended to `general`, each checked as absent first; the seven existing keys are used as they are
- [ ] A9: Script the two on-screen checks — `624-1` (create an event, save one ad-hoc answer needed and ours through `PUT /api/v1/events/:id/logistics`, open the card, press the button, expect the row, delete the event) and `624-2` (open the add-equipment form, sw
- [ ] A10: Run the full checks and hand Dandan the two hand checks — `pnpm run test:server`, `pnpm run test:ci`, both lints, `pnpm run lint:icons`, `pnpm run lint:reuse`, `pnpm run build`, `node scripts/log-query.mjs --since=plan-start --level=error`; exact result lines into Execution Not

### Plan 625 — Keep every approved invoice and every price change when prices are applied (`plans/625-invoice-records-and-price-history-on-apply.plan.md`)
- [ ] A1: Describe the invoice header an approval may carry so a wrong one is refused before any write — add SUPPLIER_KEY_PATTERN, invoiceApplyInputSchema and its type beside what 615 wrote; run pnpm run build:schemas
- [ ] A2: Add the pure rules that work out a price change in percent and how close a draft was — changePct, buildInvoiceLines, invoiceKeptRatio with unit tests (10 percent fixture, null equals absent, a repeated printed name counts once with its last line, empty draft gives 0, never above 1)
- [ ] A3: Refuse a broken invoice header or one pointing at another business before anything is saved — steps 1 and 2 of the route requirement with the four 400 cases
- [ ] A4: Remember the old price of every product the approval changes, with or without an invoice — per-row outcomes, queued history entries, the history step, the applied log counts; tests for source invoice and source import, none for same price
- [ ] A5: Save the invoice itself as one record whose lines say what happened to each product — the invoice step, keeping its stored file, invoiceId in the answer, the header comment; tests for the stored lines, the kept file and the answer
- [ ] A6: Keep the approved prices and answer normally when the record keeping fails — per-step try and catch, the trail_failed log line, invoiceId null; tests with the throwing insert spies and the log capture
- [ ] A7: Close the AI draft with what was really saved so scan accuracy can be measured later — the draft step with invoiceKeptRatio; test with a seeded pending draft ending confirmed at 0.5
- [ ] A8: Prove who may read an invoice and that nobody can write one around the approval — generic read as owner, staff and another business, the 405 on writes, staff 403 on apply
- [ ] A9: Run the full checks and confirm the old apply tests still pass untouched — pnpm run test:server, server lint, build, log-query

### Plan 626 — Read a supplier invoice with its header, from a photo or a PDF, and keep the file (`plans/626-read-supplier-invoice-header-pdf-and-keep-file.plan.md`)
- [ ] A1: Describe what an invoice read accepts and what shape the model must answer in — size and mime constants, request schema, model-answer schema, response types; run pnpm run build:schemas
- [ ] A2: Give every supplier one key that two kitchens buying from it will both arrive at — supplierKey from tax id, else phone, else name, with unit tests against the key pattern
- [ ] A3: Write the prompt and the cleaning of what the model read, with no number ever calculated — the prompt text, parsePrintedDate, cleanInvoiceHeader, cleanPrintedLines, suggestSupplier and their unit tests
- [ ] A4: Add the invoice read: owner only, its own budget, one model call, header and checked rows back — the route steps 1 to 7 and 10 with the limiter; tests for 401, 403 before the model, mime, size, PDF, the three supplier matches, dates, the 5 percent rule, the rejected answer and the ledger outcome
- [ ] A5: Keep the invoice file privately and save the draft, never failing the read when storage is off — steps 8 and 9; tests with the fake store, the not-configured store, the saved draft and the log content
- [ ] A6: Fill in a supplier's tax id from the first approved invoice that prints it — the supplier step in the apply trail and the two projection changes; three tests
- [ ] A7: Run the full checks and confirm the old photo scan still works untouched — pnpm run test:server, server lint, build, log-query

### Plan 627 — Remember which product each printed invoice name means, for the business and for everyone (`plans/627-remember-invoice-names-own-memory-and-shared-supplier-brain.plan.md`)
- [ ] A1: Prove by test that the shared memory has no place for a price, a quantity or a date — the two exact key lists read from the schemas; add the resolve request schema; run pnpm run build:schemas
- [ ] A2: Make every approved invoice line teach the business which product a printed name means — learnFromApply steps 1 and 2 (own aliases, latest link wins, hit count)
- [ ] A3: Let an approval also teach everyone, for shared-catalog products only, never from a private business — learnFromApply step 3: the live master document test, shared aliases, the supplier profile, the list limits
- [ ] A4: Answer printed names from memory, the business's own first and then the shared one — resolveNames with the live-product checks, most contributors then newest, mapping to the asking business's own copy
- [ ] A5: Wire the memory into the approval and add the read the screen will call before the model — the memory step in the apply trail, the new resolve route, the header comment
- [ ] A6: Take a business out of the shared memory the moment it becomes private — forgetBusiness and the one changed line in setAiPrivate; note which placeholder was found
- [ ] A7: Test the whole memory through the real routes with two businesses — own after one invoice with zero model calls, shared across businesses, imported product, private business, ranking, deleted product, forget, auth and limits, failing memory write
- [ ] A8: Run the full checks and confirm the invoice trail tests of the two earlier plans still pass — pnpm run test:server, server lint, build, log-query

### Plan 628 — Invoice screen: scan a photo or a PDF, confirm the header, match from memory first, see the price change in percent, and an invoices list (`plans/628-invoice-screen-photo-or-pdf-header-memory-price-change-invoices-list.plan.md`)
- [ ] A1: Teach the browser services the three new server calls so the screen has something to call — readInvoice replaces parseReceiptPhoto (types, size and type checks, PDF unshrunk); resolve and the invoice argument of apply with their types; API.files; specs with HttpTestingController
- [ ] A2: Add the two pure helpers that compute the price change and build the invoice lines — priceChangePct (two decimals, null rules) and buildInvoiceLines (printed values by normalised name, row index), each with a spec
- [ ] A3: Build the header strip as its own small component so the import screen does not grow — the signals API, supplier select, date field, number box, printed-name hint, suggested chip, tax id and VAT lines, required message; spec
- [ ] A4: Make the import screen read a photo or a PDF and ask memory before the model — onFileChosen, source, invoice state, supplier preselect, the resolve step before matchWithAi_, PDF in the upload input, the new message keys, the paste path untouched; spec cases a–d and the renamed stubs
- [ ] A5: Show the strip and the percent, and send the invoice header with the save — strip above the table bound to the signals, one supplier control, changePct in view_, the percent beside the old price, the supplier rule in canSave_, the invoice payload, cleanup after save; spec cases e–j
- [ ] A6: Add the invoices list so a saved invoice and its file can be found again — InvoiceDataService with openFile, the list screen on app-list-shell (owner and staff columns, file button, empty state, scan button), specs, breadcrumbs row
- [ ] A7: Put the list in the navigation and add the words and the icon — the lazy invoices route, the invoices chip and its spec, FileText in the icon registry, every dictionary key of the UI notes
- [ ] A8: Prove the two screens in the running app with prepared answers, then run every check — 628-1 stubs the read, resolve and match routes with page.route, creates and removes its supplier through the API, uploads a 1-pixel PNG with setInputFiles; 628-2 stubs the generic invoices read; then test:ci, lint, lint:

### Plan 629 — Price-rise alert: the business's own threshold, what a rise does to recipes and dishes, and a dashboard card of recent rises (`plans/629-price-rise-alert-impact-on-recipes-and-dishes-dashboard-card.plan.md`)
- [ ] A1: Let the owner's browser ask the server which prices rose lately, by the business's own threshold — GET /price-rises (days check, threshold from the filled settings, latest qualifying rise per product and supplier, six keys, 200 cap) and its test file with the fixtures of the first Done-when item
- [ ] A2: Add the threshold to the business settings form so each business sets its own number — the fourth control and fields entry, the two dictionary keys, the spec's stored-number, range and four-numbers cases
- [ ] A3: Add the rule for what counts as a rise and the walk that finds who uses a product — isPriceRiseAlert and recipesUsingProducts with spec cases (6 and 4 against 5, exactly 5, null, direct use, use through preps, a cycle)
- [ ] A4: Mark a risen price in the invoice preview while the owner can still question it — isRiseAlert in view_ from the business threshold, the amber chip with the icon in the flags cell, the dictionary key, spec cases at 5 and at a stored 10
- [ ] A5: Show after the save which recipes and dishes became more expensive and by how much — the before map taken before the apply, the after costs once it resolves, the impact_ signal, the panel child with its 30-row cap and its empty line, dictionary keys, specs
- [ ] A6: Put the recent rises on the dashboard so they are seen without opening an invoice — getPriceRises on the service with a spec case, the card (permission, one load, five rows, link, hidden when empty), mounted after the front desk week card, the overview spec kept green, dictionary keys
- [ ] A7: Prove the panel, the card and the settings field in the running app, then run every check — 629-1 creates its supplier, product and recipe through the API, answers the parse route with page.route, saves for real and removes what it created; 629-2 answers the price-rises route with page.route; 629-3 reads the la

### Plan 630 — Platform screen: how accurate each AI scan flow is per model, how big the shared supplier brain is, and whether files are kept (`plans/630-platform-screen-scan-accuracy-supplier-brain-file-store-status.plan.md`)
- [ ] A1: Group draft rows into flows, models and weeks in one pure function so the rule can be tested with a fixed clock — weekStart and buildLearningStats with the average and rounding rules; the fixtures of the first Done-when item
- [ ] A2: Give the platform admin one read of scan accuracy and brain size that never includes a private business — GET /stats (days check, mayLearnFrom filter, 20,000 cap, three brain counts, counts-only answer), route tests with the fixtures of the second Done-when item, breadcrumbs row
- [ ] A3: Let the browser's admin service fetch the learning numbers and the file-store status — the three types, getLearningStats and getLearningStatus, two spec cases with HttpTestingController
- [ ] A4: Build the learning section so the numbers can be read on the platform screen — the component (table, by-week reveal, brain block, private note, file-store note, empty and error states), its styles and spec, every dictionary key of the UI notes
- [ ] A5: Mount the section on the platform screen without disturbing what is there — one template line after the AI examples section, the import, the page spec's removed-children list
- [ ] A6: Prove the file-store note in the running app, then run every check — 630-1 answers the status and stats routes with page.route and reads the note; then test:server, test:ci, both lints, lint:icons, lint:reuse, build, log-query

### Plan 635 — Stock counts on the server: records, draft and final, on-hand and one unit rule (`plans/635-stock-counts-on-the-server.plan.md`)
- [ ] A1: Move the unit rule to the shared package so the server and the browser convert the same way — new file with the constants, the conversion functions moved verbatim, structural parameter types and the rates builder; no import from the app
- [ ] A2: Point the four browser files at the shared rule so no second copy exists — each becomes a re-export (the yield conversion stays where it is); run the six existing specs and the build, none of them edited
- [ ] A3: Prove the shared rule from the server side — kg and gram both ways, a crate, a jar typed in grams on a kilo product, no mass-to-volume, an unknown unit, system units over stored terms, own term over master
- [ ] A4: Describe what a member may send for a count and let the server read the unit rates of a business — strict input schema without server-owned fields; loadUnitRates over master and own unit terms
- [ ] A5: Let a member save a count as a draft and change it until it is final — POST /counts and PUT /counts/:id with convertLines, the three line errors with the line index, creator-or-owner on edit, 409 on a final count; tests for each
- [ ] A6: Let the creator or the owner finalise a count, and answer the counts list and the stock on hand — POST /counts/:id/finalize (recompute, stamp, conditional write), GET /counts by status with its limit, GET /on-hand (one aggregation); tests: final sets it, a later draft does not, a newer final without the product keeps
- [ ] A7: Check that the generic data API cannot write a count and still reads it per business — 405 USE_ROUTER on POST, PUT and DELETE; the scoped list read for two businesses
- [ ] A8: Run every check of this plan and record the output lines — test:server, test:ci, build, both lints, log-query; evidence into Execution Notes

### Plan 636 — Stock count sheet screen and the below-minimum list (`plans/636-stock-count-sheet-and-below-minimum-list.plan.md`)
- [ ] A1: Add the pure rules of the sheet so they can be tested without a screen — unit options of a product, the below-minimum rows with the uncounted number, the count date; spec cases from the Done-when
- [ ] A2: Give the browser one client for the stock routes — the API map entry; loadOnHand, loadOpenDraft, saveDraft, finalize; spec with the HTTP testing controller (POST then PUT, draft choice for owner and staff)
- [ ] A3: Build the count sheet where a member marks, counts and picks the unit of each product — list shell, rows, counted chip, counter, unit select, base amount, search, date, show filter, empty states; all dictionary keys of this plan
- [ ] A4: Let the member save a draft, continue it later and finalise the count — open with the newest draft, save and finalise flows, the error cases with the marked row, the leave guard and reload warning; component spec
- [ ] A5: Show which products are under their minimum after a closed count — the read-only table with its three empty cases and the uncounted note; the tab with its number; component spec
- [ ] A6: Make the screen reachable from the inventory chips — the lazy child route with both guards; the chip as the last inventory chip; the chip spec's expected list and stub route
- [ ] A7: Write the four screen checks that run in the real app — chip to title; save draft message; finalise message; seeded product under its minimum listed (products and the final count seeded through the API with the session token, products removed at the end)
- [ ] A8: Run every check of this plan and hand Dandan the one hand check — test:ci, build, lint, lint:icons, lint:reuse, log-query; evidence into Execution Notes; then the human card

### Plan 637 — Stock count by voice or text: a draft on the count sheet (`plans/637-stock-count-by-voice-or-text.plan.md`)
- [ ] A1: Wire the stock sub-router to the shared AI limiter and failure answers so it behaves like every AI route — read respondFromGeminiFailure, usageOf, requestedModel and aiLimiter with require('../ai') inside the handler (the limiter through a small wrapper middleware that requires it on the first request), never at module top; n
- [ ] A2: Describe the request, the model's answer and the response as shared schemas — limits 800 products and 20,000 characters, the loose answer schema, the response types
- [ ] A3: Write the pure rules that keep the model inside the list it was sent — the English prompt, the numbered lists, cleanStockLines with every rule of the requirement, stockKeptRatio; unit tests for each rule
- [ ] A4: Add the route that turns a count text into a draft without writing any count — the nine steps of the requirement; tests with a faked model: positions, 413, trash and other business, user part only, draft row with the model name and the file id when one was sent, ledger row, logs without names, 502 
- [ ] A5: Store what the person kept beside the suggestion when a count is finalised — confirmAiDraft after the finalise write, never able to fail the finalise; tests: two pending drafts both confirmed with their own ratio, an already confirmed one skipped, a draft of another business
- [ ] A6: Give the browser the call for a stock extract — extractStockCount like the product-name matcher; spec case for the path and the body
- [ ] A7: Add the voice or text section to the count sheet with its two review lists — the open button, the shared recorder, the waiting state, the not-recognised and already-counted lists, the error messages; all dictionary keys of this plan; component spec
- [ ] A8: Apply a suggestion to the sheet as marked rows the person can correct, and send its source and draft with the count — the apply rules, the mark that clears on edit, replace and keep, source and draftIds on save and finalise; spec cases
- [ ] A9: Write the two screen checks that run in the real app with a stubbed extract answer — seeded product, page.route on the extract call, paste and send; the marked row and the not-recognised list
- [ ] A10: Run every check of this plan and hand Dandan the voice check — test:server, test:ci, build, both lints, lint:icons, lint:reuse, log-query; evidence into Execution Notes; then the human card

### Plan 632 — Business switcher, the acting banner, entering a business from the platform table and the owner's access list (`plans/632-business-switcher-acting-banner-enter-business-owner-access-list.plan.md`)
- [ ] A1: Let the browser know the home business, the acting state and the consultant role — user model fields, the three computed signals, token claims, the consultant branch and the owner-rights signal in the permission mirror; specs
- [ ] A2: Make a switch reload the whole application so nothing of the other business stays on screen — the reload token, switchBusiness (leave the page, call the route, store, reload), the reload when a refresh answers another business, the access-ended flag; specs
- [ ] A3: Never replay a request into a different business after a refresh — the ACCESS_ENDED branch and the business comparison before a replay; specs for both
- [ ] A4: Add the service that lists enterable businesses and manages grants — the access entry in the API map, the two signals, load, remove and create with their error keys; spec; breadcrumbs row
- [ ] A5: Show the switcher in the header only to a user who has somewhere to switch to — the select in the user chip, the phone profile-menu rows, the access-ended toast; the existing header specs stay green and new ones cover both states
- [ ] A6: Show on every screen in which business the user is acting, with one tap back home — the banner component, its place in the app shell, print hidden; specs; breadcrumbs row
- [ ] A7: Let the platform admin enter a business and give a consultant access from the table — the two row buttons, the grant dialog and its service, error texts under the field; specs
- [ ] A8: Give the owner a settings tab that lists who has access and removes it — the tab entry with its permission, the tab component with loader, rows, empty state and the remove question; tabs filtered by permission; specs
- [ ] A9: Keep the owner-only setup cards away from a consultant, who cannot open what they point to — the three dashboard components ask for the settings permission; their spec stubs gain it
- [ ] A10: Add the words, the two screen checks and run everything — the 22 dictionary keys, the pages map rows, both ui specs, then every Done-when command and the human cards

### Plan 633 — Diagnosis on the server: the record, the menu-with-prices read and the price volatility data (`plans/633-diagnosis-on-the-server-records-menu-prices-price-volatility.plan.md`)
- [ ] A1: Check what wave 0 and the earlier lanes left so this plan builds on real names — read the two empty routers, the diagnosis schema, the staff-fields entry, the module gate's test reset and the four helpers the main AI router exports
- [ ] A2: Write the margin report and the price movement as pure functions both sides share — buildMarginReport with its three findings, priceVolatility, round to two decimals; unit tests on the compiled files
- [ ] A3: Define what each diagnosis request and the model's menu answer may contain — the four request schemas, the strict reply schema and the kept-ratio function
- [ ] A4: Add the diagnosis record routes behind the home-business module gate — create, replace menu, replace invoices, set status, with scope, permission, dish and invoice checks, the done lock and id-only logs
- [ ] A5: Return the diagnosis with the price movements of its period — the data route reading the history window through the shared function, with the row cap
- [ ] A6: Test the record routes, above all that the gate reads the home business — gate both ways, stamps, staff, other business, unknown dish and invoice, done lock, the three-row volatility fixture, generic write refused, staff read trimmed
- [ ] A7: Add the one model call that turns a pasted menu into names and prices — the English prompt, text only in the user part, strict reply check, 300-item cap, draft trail, no number computed
- [ ] A8: Test the menu read with a faked model — names and prices only, extra field refused, missing price stays empty, prompt and user part, ledger and draft rows, gates before the call
- [ ] A9: Record the routes in the backend docs, then run every check — the six routes and the collection note, the server map rows; then the Done-when commands in order

### Plan 634 — Diagnosis screens: the invoice queue, the menu with prices and the printable margin report (`plans/634-diagnosis-screens-invoice-queue-menu-prices-printable-margin-report.plan.md`)
- [ ] A1: Add the diagnosis service, the guard and the two lazy routes so the screens have a door — the API map entry, the seven service calls, the guard for home and acting sessions, routes with the kitchen-data resolver and the leave guard; specs
- [ ] A2: Build the list screen where a consultant starts or reopens a diagnosis — header, the name and period form, rows with status, loader, empty state; spec
- [ ] A3: Build the workspace that holds one diagnosis and its three tabs — load, tabs by query parameter, done and reopen, read-only when done, unsaved-changes answers; spec
- [ ] A4: Let the import preview run inside another screen without changing its own page — the embedded switch, the file input and the applied event, only if 628 left them out; three spec cases
- [ ] A5: Build the invoice queue that reads and approves one file at a time — file picker, queue with statuses, one current file in the embedded preview, skip, saving each invoice id, the 100 limit; spec
- [ ] A6: Build the menu tab that turns pasted text into priced rows linked to dishes — paste and read, editable rows, exact-name linking by code, dish search, save with the draft id, every error text; spec
- [ ] A7: Build the report that marks dishes under the target and prints on one page — per-portion costs from the cost service, the shared report function, the two tables, findings, print rules; spec
- [ ] A8: Put the diagnosis entry where a consultant will find it — the link in the acting banner by the home modules, the chip and path prefix in the inventory group, the two new icons; specs updated
- [ ] A9: Add the words, the pages map row and the screen check, then run everything — the 50 dictionary keys, the breadcrumbs row, the ui spec with its fixtures, every Done-when command, the human cards
