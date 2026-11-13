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

### Plan 582 — Recipe AI examples stay inside their business (`plans/582-recipe-ai-examples-stay-inside-their-business.plan.md`)
- [ ] A1: Stamp and prune recipe examples per business — `saveShot(req, …)` with `businessId`, per-business count and pruning, `POST /shots` passes `req` — server/routes/ai.js
- [ ] A2: Read only the caller's own approved examples — `getApprovedShots(req, limit)` with `scopeFilter(req)`; both callers pass `req`; comment block updated — server/routes/ai.js
- [ ] A3: Test the scope, the prune and the stamp — the four `[auto]` cases above — server/test/ai-shots.test.js
- [ ] A4: Run test:server, the server lint and log-query, and paste the output lines under Execution Notes

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

### Plan 589 — A signed-out visitor sees only the welcome page; no automatic guest sign-in on the PC and in the slots (`plans/589-signed-out-visitors-see-only-the-welcome-page.plan.md`)
- [ ] A1: Stop signing a guest in by itself on the PC and in the slots — src/environments/environment.local.ts, src/environments/environment.ts
- [ ] A2: Send a signed-out visitor to the welcome page from every page but the shared recipe link — src/app/core/guards/auth.guard.ts, src/app/app.routes.ts
- [ ] A3: After signing in on the welcome page, return to the page the visitor wanted — src/app/pages/welcome/welcome.page.ts, src/app/pages/welcome/home-redirect.ts
- [ ] A4: Add a check that every route keeps its guard, and the security note — scripts/route-guard-check.mjs, docs/agent/standards-security.md
- [ ] A5: Prove it in unit tests and two screen checks — src/app/core/guards/auth.guard.spec.ts, src/app/core/guards/welcome.guard.spec.ts, e2e/ui/589-1.spec.ts, e2e/ui/589-2.spec.ts

### Plan 591 — Signing out (or a session ending) always moves the visitor to the welcome page (`plans/591-signing-out-goes-to-the-welcome-page.plan.md`)
- [ ] A1: Move a signed-out visitor to the welcome page from wherever they are — src/app/core/services/signed-out-redirect.service.ts, src/app/appRoot/app.component.ts
- [ ] A2: Let the terms popup rely on it instead of its own jump — src/app/core/components/terms-gate/terms-gate.component.ts, src/app/core/components/terms-gate/terms-gate.component.spec.ts
- [ ] A3: Prove it in a unit test and a sign-out screen check — src/app/core/services/signed-out-redirect.service.spec.ts, e2e/ui/591-1.spec.ts, src/app/core/services/breadcrumbs.md

### Plan 592 — Shared recipe links also need signing in: a signed-out visitor sees only the welcome page, no exceptions (`plans/592-shared-recipe-links-also-need-signing-in.plan.md`)
- [ ] A1: Put shared recipe links behind sign-in like every other page — src/app/app.routes.ts, scripts/route-guard-check.mjs
- [ ] A2: Send a signed-out visitor on a recipe link to the welcome page too — src/app/core/services/signed-out-redirect.service.ts, src/app/core/services/signed-out-redirect.service.spec.ts
- [ ] A3: Update the screen check and the security rule — e2e/ui/589-2.spec.ts, docs/agent/standards-security.md

### Plan 595 — Website imports refuse redirects to internal addresses (`plans/595-website-imports-refuse-redirects-to-internal-addresses.plan.md`)
- [ ] A1: Check every redirect of a website import against the safety rules, at most 5 hops — safeFetch helper used by both URL routes — server/routes/ai.js
- [ ] A2: Refuse the internal addresses the safety check still lets through — 0.0.0.0/8, 100.64/10, IPv4-mapped IPv6, bracketed hosts — server/routes/ai.js
- [ ] A3: Prove a redirect to an internal address is refused and never fetched — server/test/knowledge-import.test.js, server/test/generate-from-url.test.js

### Plan 596 — Platform CSV downloads show Hebrew correctly in Excel (`plans/596-platform-csv-downloads-show-hebrew-correctly-in-excel.plan.md`)
- [ ] A1: Make both platform CSV downloads open in Excel with readable Hebrew — BOM and CRLF in one send helper — server/routes/admin.js
- [ ] A2: Check the downloads start with the marker Excel needs — server/test/admin-frontdesk-stats.test.js, server/test/ai-usage.test.js
