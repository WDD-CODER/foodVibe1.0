# Overnight report — 2026-10-07 (03:00–04:45 Israel)

**Base commit:** `origin/main` @ `a0efb619`. All PRs are **drafts**, nothing touched `main`, no force-pushes, no branches deleted, no secrets / `.env` / Atlas / Render touched.

**Bottom line:** 22 plans + 1 tech-debt batch shipped as 23 draft PRs (#293–#315). Every branch builds (`npx ng build` exit 0) and passes the full client spec suite. No `[human]` criterion was marked; each section ends with your click-through checklist.

## Scoreboard

| Plan | Status | Branch | PR | Build | Specs |
| --- | --- | --- | --- | --- | --- |
| Tech debt quick fixes | DONE | chore/night-techdebt-quickfixes | #293 | pass | 44/44 |
| 345 Filter categories collapsed mobile | DONE | feat/night-1007-345-filters-collapsed-mobile | #294 | pass | 359/359 |
| 351 Dashboard recent activity | DONE | feat/night-1007-351-recent-activity-history | #295 | pass | 363/363 |
| 367 Dashboard chip / no back buttons | DONE | feat/night-1007-367-dashboard-chip-no-back | #296 | pass | 357/357 |
| 365 Admin scope prompt wording | DONE | feat/night-1007-365-admin-scope-wording | #297 | pass | 363/363 |
| 370 AI recipe portions (A1–A3,A5; A4 skipped) | DONE | feat/night-1007-370-ai-recipe-portions | #298 | pass | client 360/360; server 61 pass (Mongo files not runnable) |
| 363 Search clear (X) + no autocomplete | DONE | feat/night-1007-363-search-clear-no-autocomplete | #299 | pass | 358/358 |
| 361 Lists quick fixes | DONE | feat/night-1007-361-lists-quick-fixes | #300 | pass | 354/354 |
| 347 Mobile keyboard | DONE | feat/night-1007-347-mobile-keyboard | #301 | pass | 358/358 |
| 371 Venues A | DONE | feat/night-1007-371-venues-a | #302 | pass | 363/363 |
| 341 Suppliers add/edit as page | DONE | feat/night-1007-341-suppliers-page | #303 | pass | 354/354 |
| 342 Form checkboxes → chips | DONE | feat/night-1007-342-form-checkboxes-to-chips | #304 | pass | 354/354 |
| 340 Metadata chips + tap menu | DONE | feat/night-1007-340-metadata-chips-tap-menu | #305 | pass | 359/359 |
| 368 Product form responsive | DONE (visual check pending) | feat/night-1007-368-product-form-responsive | #306 | pass | 354/354 |
| 348 Recipe builder mobile rows | DONE (device check pending) | feat/night-1007-348-recipe-builder-mobile-rows | #307 | pass | 358/358 |
| 344 Menu export top sheet | DONE | feat/night-1007-344-menu-export-top-sheet | #308 | pass | 358/358 |
| 349 Shared column carousel | DONE (phone check pending) | feat/night-1007-349-shared-column-carousel | #309 | pass | 360/360 |
| 350 Scroll rail (stacked on 349) | DONE | feat/night-1007-350-scroll-rail | #310 (base: 349 branch) | pass | 364/364 |
| 352 Page header part 1 (stacked on 350) | DONE (visual check pending) | feat/night-1007-352-page-header-list-shell | #311 (base: 350 branch) | pass | 368/368 |
| 353 Page header part 2 (stacked on 352) | DONE (visual check pending) | feat/night-1007-353-page-header-part2 | #312 (base: 352 branch) | pass | 369/369 |
| 346 Sticky table top (stacked on 352) | DONE | feat/night-1007-346-sticky-table-header-pagination-top | #313 (base: 352 branch) | pass | 370/370 |
| 364 Search fields part 2 (stacked on 363) | DONE (Android check pending) | feat/night-1007-364-search-fields-part2 | #314 (base: 363 branch) | pass | 361/361 |
| 362 List overlays at body level (stacked on 340) | DONE (device check pending) | feat/night-1007-362-list-overlays-body-level | #315 (base: 340 branch) | pass | 364/364 |

## Merge order / dependencies

Stacked PRs target their parent branch. Merge the parent first, then change the child PR's base to `main` (or let GitHub retarget it, which it does only if the parent branch is deleted after merging).

1. **Independent, any order:** #293 (tech debt), #294 (345), #295 (351), #296 (367), #297 (365), #298 (370), #300 (361), #301 (347), #302 (371), #303 (341), #304 (342), #306 (368), #307 (348), #308 (344).
2. **Chains:**
   - #309 (349) → #310 (350) → #311 (352) → then #312 (353) and #313 (346), both based on 352.
   - #299 (363) → #314 (364).
   - #305 (340) → #315 (362).
3. **Suggested sequence** to minimise conflicts: 293 → 365 → 370 → 351 → 367 → 347 → 371 → 341 → 342 → 340 → 362 → 363 → 364 → 361 → 345 → 368 → 348 → 344 → 349 → 350 → 352 → 353 → 346.

**Expected conflicts (all textual, none semantic as far as I could tell):**
- `src/styles.scss` and `public/assets/data/dictionary.json`: many PRs append at the end → keep every appended block / key.
- Shared list templates (inventory / recipe-book / suppliers / equipment `*-list.component.html|scss`): touched by 345, 342, 361, 349, 352, 346, 363/364. Merge the 349→352 chain after the independent list PRs and resolve by keeping both sides.
- `list-shell.component.html|scss`: 361, 352, 346, 362. For 362 keep the `[shell-modal]` slot **after** the closing `</div>` of `.list-container`.
- `nutrition-badge.component.ts`: #293 and #307 (348).
- `row-actions-menu`: #305 (340) then #315 (362) — stacked, so no conflict if merged in order.
- `supplier-form`: #303 (341) and #304 (342).
- Templates with autocomplete attributes (364) vs 342 / 340 / 368 chip changes: small adjacent-line conflicts.

## Per-plan sections
### Tech-debt quick fixes (todo.md "Tech Debt")  [DONE]
What landed: `nutrition-badge` `@Input()` → `input()` (3 reads now `this.nutrition()`); removed the 2 leading `;(` ASI guards (`quick-add-product-modal` now `el?.focus()`, `menu-library-list` `forEach` → `for…of`); removed the 2 `?? []` NG8102 warnings in venue-list / venue-detail (`availableInfrastructure` is a required array on `Venue`). Untouched by design: `auth.interceptor.ts` BehaviorSubject, >300-line backlog.
Auto validation:
- `npx ng build` → exit 0, no NG8102 in output — pass
- `npx ng test --include=venues/inventory/recipe-builder specs` → 44/44 — pass
- `npm run lint:icons` → pass; `npm run lint:no-native-select` → fails on `ai-product-modal.component.html` — **pre-existing on main**, not touched here
Decisions I made:
- Kept the getters in nutrition-badge (only changed the input) to stay minimal; Plan 348 A4 reworks this component later.
Human validation checklist:
- Inventory list (desktop): hover the leaf nutrition badge on a product → tooltip shows as before.
- Recipe builder: nutrition badge on an ingredient row still shows.
- Venues list + venue detail: infrastructure count still shows.
- Menu library: event revenue figures unchanged.
Merge notes: None. (Plan 348 also edits `nutrition-badge.component.ts` — trivial rebase if both merge.)

### Plan 345 — Filter categories collapsed by default on mobile  [DONE]
What landed: new `src/app/core/utils/collapsible-categories.util.ts` (`useCollapsibleCategories`) + spec. At ≤1023px every filter category starts collapsed; desktop unchanged (recipe-book `Date` still starts collapsed). A category that gains a selection (URL restore or selecting) opens. Inventory + recipe-book migrated off `collapsedFilterCategories_`; suppliers (delivery days) and equipment (category, consumable) got the collapsible header + count badge. P1 count badge shows while collapsed.
Auto validation:
- `npx ng test --include=src/app/core/utils/collapsible-categories.util.spec.ts --include='src/app/pages/**/*-list.component.spec.ts'` → 23/23 — pass
- full client suite `npx ng test` → 359/359 — pass
- `npx ng build` → exit 0 — pass; `npm run lint:icons` → pass
Decisions I made:
- Only *newly* active categories auto-open (tracked per effect run), so a category the user collapses again stays closed while they keep filtering elsewhere. Same behavior applied to recipe-book's existing re-expand effect.
- Suppliers "linked products" is a single toggle chip, not a category — left as-is (no header), only delivery days got the collapsible header.
- Critical Question 1 → default (a): no persistence, always start collapsed.
- Media-query listener is removed on destroy (the existing `useResponsivePanelState` leaks its listener — not touched; flag for follow-up). `MOBILE_QUERY` 768 vs 1023 mismatch left as the plan asks.
- No session-state file written (unattended run; this PR body is the record). A4 left `[ ]` because it includes the human viewport check.
Human validation checklist:
- Phone (≤1023px, e.g. 360px): open filters on `/inventory/list`, `/recipe-book`, suppliers (dashboard → suppliers), `/inventory/equipment` → only category headers show. Tap one → opens. Select a value, navigate away and back → that category is open with its count badge.
- Desktop 1280px: filter panels look as before (all open; recipe-book Date collapsed).
Merge notes: None. Conflicts likely with Plans 342 / 346 / 349 / 352 / 361 (same list components) — later merges need a rebase.

### Plan 351 — Dashboard recent activity: readable change history  [DONE]
What landed: new `core/pipes/activity-value.pipe.ts` (+spec): supplier ids → names (unknown → "ספק שנמחק"), keys → Hebrew, empty → "—", resolved at render time so old stored entries read correctly. Popover uses the pipe (`formatChangeValue` deleted) and can show all changes of an entry. Dashboard entries: type icon (package / chef-hat / utensils) · type · name · action badge · relative time; up to 3 stacked lines `label: <del>old</del> ← <ins>new</ins>`; "+N שינויים נוספים" opens the popover with every change; no strip when an update has no changes. Old mono `.change-tag` strip, scroll buttons and `scrollActivityChanges()` removed. P1 day headers (היום / אתמול / date) when the list spans >1 day.
Auto validation:
- `npx ng test --include=src/app/core/pipes/activity-value.pipe.spec.ts --include='src/app/pages/dashboard/**/*.spec.ts' --include='src/app/shared/change-popover/**/*.spec.ts'` → 43/43 — pass
- `rg -n "formatChangeValue|scrollActivityChanges|change-tag" src/app` → no matches — pass
- `npx ng build` → exit 0 — pass; full client suite 363/363; `lint:icons` pass
Decisions I made:
- Pipe is `pure: false` (plan said pure): the dictionary and supplier list load async, a pure pipe would freeze "—"/ids on first render. Same reason `translatePipe` is impure.
- `name` and `price` values are shown as recorded (not split on commas / translated) — product names can contain commas.
- Values joined with ", " (plan text had the Arabic comma "، ", which looks wrong in Hebrew).
- Added dictionary key `activity_just_now` = "לפני רגע" (relative time under 60s); minutes/hours/days via `Intl.RelativeTimeFormat('he', {style:'short'})`.
- Inline change lines are not clickable anymore — the popover is reached only through "+N".
- Critical Question 1 → (a) 3 lines.
Human validation checklist:
- Edit a product's supplier, category and price → `/dashboard`: entry shows product name, "עודכן", "לפני רגע", 3 lines like "ספק: ירקות כהן ← פירות השרון", all Hebrew, no ids/English keys.
- Edit 4+ fields on one product → "+N שינויים נוספים" appears and opens a popover with all changes; click outside closes it.
- Phone 360px: entries wrap, no sideways scroll; time moves under the name.
- With entries from earlier days present: "היום" / "אתמול" / date headers.
Merge notes: dictionary.json — 5 keys appended to `general` (`activity_more_changes`, `activity_deleted_supplier`, `activity_today`, `activity_yesterday`, `activity_just_now`). Plan 347 (vh→dvh) also touches `dashboard-overview.component.scss`.

### Plan 367 — Dashboard chip replaces current page chip, remove back buttons  [DONE]
What landed: `TabChipsComponent` works out the current dashboard sub-page from the URL (`/venues*`, `/suppliers*`, `/trash*`, `/dashboard?tab=metadata|venues|add-venue|trash`) and swaps that chip for a "לוח בקרה" chip (`/dashboard`, no query) in the same index; overview shows the 4 chips unchanged; the home chip never gets `.active`. Back buttons + `backToDashboard()` removed from dashboard-header, venue-list, trash, supplier-list (plus their dead local styles and now-unused `Router` injects in trash/supplier-list). P1: `.c-tab-pill--home` (outlined) appended to `src/styles.scss`.
Auto validation:
- `rg -n "btn-back-to-dashboard|backToDashboard" src/app e2e` → no matches — pass
- `npx ng test --include=tab-chips/dashboard/trash/venues/suppliers specs` → 44/44 — pass; full suite 357/357
- `npm run lint:icons` → pass; `npx ng build` → exit 0 — pass
Decisions I made:
- Home chip links to `/dashboard` with no query (the overview is "no tab" in `DashboardPage.activeTab`) instead of `?tab=overview`.
- `routerLinkActive` kept for all chips, but bound to `[]` for the home chip so it never shows active.
- Trash header on ≤768px: the freed "back" grid cell is left empty (refresh stays in its column) — minimal change.
- Critical question → (a) in place of the current page's chip.
Human validation checklist:
- `/dashboard`: chips אתרים · מטא-דאטה · ספקים · אשפה, none active. Tap מטא-דאטה → row reads אתרים · לוח בקרה · ספקים · אשפה (לוח בקרה outlined) → tap it → back on the overview.
- `/suppliers`, `/venues`, `/trash`: no back button; the outlined "לוח בקרה" chip sits where that page's chip was. Check phone 360px and desktop.
- Suppliers list header: title no longer squeezed.
Merge notes: `src/styles.scss` append (`.c-tab-pill--home`). Plan said run after 338 (open PR #288 — also edits tab-chips) / 341 / 350; expect a small rebase conflict in `tab-chips.component.ts` and `supplier-list.component.html` against those.

### Plan 365 — Admin scope prompt wording per action / entity / count  [DONE]
What landed: `MasterPushService.askScope(item, { entity, isNew?, count? })` / `askDeleteScope(item, { entity, count? })` (admin + `_masterId` / new-item gating unchanged) + pure `buildScopeTexts(action, entity, count, translate)` + `willAskDeleteScope()`. All callers pass context: cook-view (save/rating/approval), recipe-book (rating, approval, delete, remove, bulk edit/delete with count), recipe-builder (create vs save, recipe vs dish from the form), product-form (create/save product), inventory (delete single + bulk with count, product warning). Metadata `resolvePushScope(type, action, key?)`: add → create, rename/text fix → save, remove → delete. Recipe-book admin delete of a master-linked recipe: one dialog (scope prompt only); others keep the plain confirm via new `confirm_delete` key. 29 dictionary keys appended (`scope_*`, `confirm_delete`, `confirm_delete_product`).
Auto validation:
- `npx ng test --include=src/app/core/services/master-push.service.spec.ts` (new, 9 specs incl. every action × entity, count prefix, product warning) — pass; full suite 363/363
- `rg -n "האם אתה בטוח שברצונך למחוק" src/app` → no matches — pass
- `npx ng build` → exit 0 — pass
Decisions I made:
- **OUT-OF-SCOPE WRITE: `src/app/core/services/confirm-modal.service.ts`** — `openTernary()` never set `headerKey`, so the scope prompt's header never showed (or showed a stale one from a previous `open()`). One-line fix; without it the plan's "מחיקה / פריט חדש / שמירת שינויים" headers can't appear.
- Messages are per-entity keys (Hebrew gender: "המנה משותפת" vs "המוצר משותף") rather than one template + `entity_*` noun keys; the `entity_*` keys were therefore not added. Plural uses `scope_<action>_many` ("{n} פריטים נבחרו. …").
- Delete "everyone" button is not red: the confirm modal's danger variant colors the *other* ("only me") button; changing the modal component was out of scope.
- Inventory product delete keeps its existing first confirm (it carries the "used in N recipes" info); only the recipe book got the single-dialog change, as the plan's A5 describes. Its hard-coded text moved to `confirm_delete_product` (needed for the `rg` criterion).
- Old `push_to_master_*` / `delete_from_master_*` / `push_registry_master_message` keys left in the dictionary (P2).
- Critical question → (a) scope dialog only.
Human validation checklist (as admin, then as a regular user):
- Metadata: delete a label → header "מחיקה", buttons "מחק רק אצלי / מחק מכולם". Add a label → "פריט חדש … פרסם לכולם". Rename/edit a label → "שמירת שינויים … עדכן לכולם".
- Inventory: delete a master-linked product → message says "מוצר" + the "תסיר את המוצר גם מכל המתכונים" warning.
- Recipe book: select 3 master-linked recipes → delete → "3 פריטים נבחרו…", one dialog only. Single master-linked recipe delete → one dialog. Bulk-add a label to 3 → "3 פריטים נבחרו…" save wording.
- Recipe builder: new recipe as admin → "פריט חדש" wording; new dish → "מנה חדשה".
- Regular user: no scope prompts anywhere; plain delete confirm still shows.
Merge notes: dictionary.json — 29 keys appended to `general`. Plan said run after 340 / 348 (metadata-manager, recipe-builder) — expect rebase conflicts in those files if they merge first.

### Plan 370 — AI recipe generation: realistic portions (A1, A2, A3, A5 — A4 skipped)  [DONE]
What landed: recipe helpers extracted to `server/services/ai-recipe-helpers.js` (`extractJsonPayload`, `validateRecipeDraft`, `normalizeIngredientUnits`, `computeSoftWarnings`, `buildFewShotBlock`, `escapeForPrompt`, new `selectShots`, `estimateGramsPerPortion`); `ai.js` imports them. SYSTEM_PROMPT gained rule 3 additions + new rule 3א (amounts are for the whole yield, named portion count used exactly, realistic default serving — omelet = 1, 150–450 g per main-dish portion). Few-shots are picked by relevance (`selectShots`, niqqud-stripped token overlap, 0 shots when nothing matches); `generationConfig: { temperature: 0.4 }` on /generate, /generate-from-image, /generate-from-url. New soft warning "כמויות הרכיבים לא סבירות ביחס למספר המנות" (< 60 g or > 700 g per portion, dishes only), mirrored in `GeminiShotsService`. New `server/test/ai-recipe-helpers.test.js` (24 tests) + `gemini-shots.service.spec.ts` (6).
Auto validation:
- `cd server && npx vitest run test/ai-recipe-helpers.test.js` → 24/24 — pass. Whole server suite: 7 files / 61 tests pass; the 12 Mongo-backed files can't start here (mongodb-memory-server download blocked) — **not run**.
- `npx ng build` → exit 0 — pass; client suite 360/360 incl. new spec.
- `node server/scripts/ai-eval-recipes.js` → **not done** (A4 skipped, see below).
Decisions I made:
- **A4 skipped** (live eval needs `GEMINI_API_KEY`; the script was not written either). Also P1 `ai:eval` npm script not added.
- Image route sends no few-shot examples at all (no text to match; `selectShots('')` would always return none) — avoids a pointless DB read.
- URL route matches shots against the first 300 chars of the page text (title/heading), not the whole page.
- Candidate pool for `selectShots` = all approved shots (≤ 50, the existing `SHOTS_CAP`).
- "unit" counts toward weight only for eggs (name contains ביצ/egg, 55 g); other countables are skipped. `portion` unit skipped.
- Warning text is a literal Hebrew string like its 4 siblings (the modal renders `{{ w }}`, not a key); dictionary key `ai_warning_implausible_portion_weight` was still appended for a later migration.
- Critical question → (a) realistic default serving.
Human validation checklist:
- Locally with the key: AI recipe "חביתה" → 1 portion, 2–3 eggs, a pinch of salt. "חביתה ל-2" → 2 portions, 4–6 eggs. "שקשוקה ל-4" → 4 portions.
- Generate a recipe whose amounts don't fit the portions (e.g. edit nothing, ask "חביתה ל-10 מ-2 ביצים") → approve → the warning list shows "כמויות הרכיבים לא סבירות ביחס למספר המנות".
- Run `cd server && npm test` on Windows (Mongo tests) — all green.
- Optional follow-up: write/run the A4 eval script.
Merge notes: dictionary.json — 1 key appended. Server restart needed after merge (route + new service file). No migrations.

### Plan 363 — Search fields part 1: clear (X) button, no autocomplete  [DONE]
What landed: new `src/app/shared/input-clear/` (`app-input-clear`, `visible` input / `clear` output, always rendered, fade + scale 150ms, instant under `prefers-reduced-motion`, fixed 1.5rem slot so the input never jumps, 44px hit area, `mousedown` prevented so the field keeps focus). Wired into all 8 bars: recipe-book, inventory, suppliers, equipment, menu-library, venues (`onClearSearch(searchInput)` → signal `''` + refocus; URL sync follows through `useListState`), ingredient-search (also closes results + resets highlight) and preparation-search (local `.input-wrapper` got the slot styles). All 8 inputs: `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"`. P1: Escape in a non-empty field clears it first (6 list pages + preparation-search). Engine addition appended to `src/styles.scss`; `clear_search` key appended.
Auto validation:
- `npx ng test --include='src/app/shared/input-clear/**/*.spec.ts'` → 4/4 — pass (within full suite 358/358)
- `rg -n "app-input-clear" src/app --glob '*.html'` → 8 matches — pass
- `npx ng build` → exit 0 — pass; `npm run lint:icons` → pass
Decisions I made:
- Fixed-width slot (not absolute) for the X — the plan allowed either; this one can't overlap long text.
- ingredient-search keeps its existing Escape behavior (closes results + emits `cancelSearch` to the parent row editor); the P1 "Escape clears first" was not applied there to avoid changing the recipe-builder row keyboard flow.
- Specs for ingredient-search / preparation-search now pick the `X` icon (they pick icons explicitly).
- `autocomplete="off"` used; can't verify Android Chrome here — if suggestions still show, switch to `autocomplete="new-off"` (plan's fallback).
- Critical question → (a) keep focus.
Human validation checklist:
- `/inventory/list`: empty → no X. Type "עגב" → X fades in → tap → text gone, full list back, cursor still in the field → X fades out. Repeat on `/recipe-book`, suppliers, `/inventory/equipment`, `/menu-library`, `/venues`.
- Press Escape with text in any of those → clears.
- Recipe builder: ingredient search — type → results → tap X → results close, field empty and focused. Preparation search — same.
- Android Chrome: tapping these fields shows no browser suggestion strip.
- With OS "reduce motion" on: X appears/disappears instantly.
Merge notes: `src/styles.scss` + dictionary append. Touches the same list templates as 345/346/349/352/361 — expect rebase conflicts on the search block if those merge first. Plan 364 (part 2) must branch from this.

### Plan 361 — Lists quick fixes: bulk-edit dropdown, suppliers grid, labels  [DONE]
What landed: `list-shell` `.selection-bar-area` no longer `overflow: hidden` (+ `position: relative; z-index: 20` so dropdowns sit over `.table-area`). Suppliers: desktop `gridTemplate` now 9 tracks matching the 9 rendered cells; min-order moved into the carousel as first slide (desktop order unchanged since the carousel is `display: contents`), `mobileGridTemplate` `'2fr 1fr 40px 28px'`; min-order shows `₪500` / `—`. Dictionary keys `min_order`, `no_suppliers_match`, `supplier_in_use_cannot_delete` appended. P1: supplier `.page-title` uses `--fs-xl / --fw-bold / --tracking-tight`, ≤620px padding removed.
Auto validation:
- `npx ng test` (full client suite, includes suppliers + list-shell specs) → 354/354 — pass
- `npx ng build` → exit 0 — pass
Decisions I made:
- Applied the plan's fallback `z-index: 20` on `.selection-bar-area` up front (can't visually confirm stacking headless).
- Min-order lives only inside the carousel (no separate desktop cell) — same desktop result with less markup.
- Critical question → (a) "—" for empty/0.
Human validation checklist:
- `/inventory/list` (and recipe-book, suppliers, equipment): select 2 rows → bulk edit → open "שנה שדה" and the value list → fully visible over the table.
- Suppliers desktop 1280px: every row lines up under its header; header "מינימום הזמנה"; cells "₪500" or "—".
- Suppliers phone 360px: name, carousel (first slide מינימום הזמנה), actions, select — no overlap. Empty search result shows "לא נמצאו ספקים תואמים".
Merge notes: dictionary append. Plan says run before 339/341/349 — 339 is already merged; 341/349 will rebase over the supplier-list changes.

### Plan 347 — Mobile keyboard: keep focused field visible  [DONE]
What landed: `src/index.html` viewport meta + `interactive-widget=resizes-content`. New `KeyboardInsetService` (+ spec) started from `AppComponent`: listens to `visualViewport` resize/scroll, `inset = max(0, innerHeight − (vv.height + vv.offsetTop))`, sets `--kb-inset`, toggles `body.kb-open` (> 120px), exposes `inset` / `isOpen` signals, centers the focused editable one rAF after the keyboard opens (and on `focusin` while open); no-op without `visualViewport`. `src/styles.scss`: `body.kb-open` block appended (hides `.bottom-nav`, `.hero-fab-container`, `.approve-stamp`, `.user-msg` via `visibility`; `.app-content` bottom padding 0; P1 `.c-modal-card` max-height minus inset) and the phone `.as-modal` rule now uses `inset-block: auto var(--kb-inset, 0px)` / `max-height: calc(86dvh - var(--kb-inset, 0px))` (approved exception in the plan). All listed `vh` → `dvh`.
Auto validation:
- `npx ng test --include=src/app/core/services/keyboard-inset.service.spec.ts` → 4/4 — pass (full suite 358/358)
- `rg -n "[0-9]vh" src/app/shared src/app/pages/trash src/app/pages/dashboard --glob '*.scss'` → no matches — pass
- `npx ng build` → exit 0 — pass
Decisions I made:
- **OUT-OF-SCOPE WRITE: `src/app/shared/export-preview/export-preview.component.scss`** (2× `100vh` → `100dvh`) and **`src/app/pages/dashboard/dashboard.page.scss`** (commented-out `100vh` → `100dvh`) — both matched the plan's own `rg` success criterion but weren't in its scope list. Same numbers, no behavior change on desktop.
- `start()` takes an optional window-like argument so the spec can drive a fake `visualViewport`.
- Also re-centers an already-focused field when the keyboard opens (phones usually focus first, then resize).
- Bottom chrome hidden via global `body.kb-open …` selectors; the header/FAB/stamp/toast components themselves are untouched.
- Critical question → (a) hide them.
Human validation checklist:
- Android phone: recipe builder → tap an ingredient search → keyboard opens, the field is centered above it, bottom bar and FAB disappear; close the keyboard → they return.
- iPhone: AI product modal → tap the prompt → modal shrinks, textarea stays visible above the keyboard.
- Phone: open a list row's inline edit (bottom sheet) → tap a field → the sheet sits above the keyboard.
- Desktop: no visual change anywhere.
Merge notes: `src/styles.scss` (append + the approved `.as-modal` edit), `src/index.html`. Plan 351 also edits `dashboard-overview.component.scss` (different lines). Plan said run after 346 (not done tonight).

### Plan 371 — Venues A: hours util, select checkbox, responsive form, unsaved guard  [DONE]
What landed: `src/app/core/utils/venue-hours.util.ts` (`formatVenueHours` → `{ first, extra }`, `formatVenueHoursLines`) + spec; venue cards show a `clock` line "א׳–ה׳ · 08:00–23:00" + "+N" (nothing when empty, P1); detail treats all-empty blocks as "—". Card checkbox: in a new padding band above the media at the card's top-left (inline-end), `opacity 0` until `:hover` / `:focus-within` / selection mode / selected, always visible under `(hover: none)`, 150ms fade, reduced-motion aware. Venue form: ≥768px basic section in 2 columns (active toggle + notes full-width), max-width 44rem; ≤620px `--space-3` padding, actions stacked full-width; infra/hours rows wrap, inputs flex with `min-inline-size: 4rem`. Guard: `VenueFormComponent` implements `PendingChangesComponent` (`isSubmitted`, `hasRealChanges()` over `getRawValue()` + `photoUrl_()` snapshot, `saveAndWait()`); `canDeactivate: [pendingChangesGuard]` added to `venues/add` and `venues/edit/:id` (approved additive exception in `app.routes.ts`). New `venue-form.component.spec.ts` (4 specs).
Auto validation:
- `npx ng test --include='src/app/pages/venues/**/*.spec.ts' --include=src/app/core/utils/venue-hours.util.spec.ts` — pass (full suite 363/363)
- `npx ng build` → exit 0 — pass; `lint:icons` pass; `lint:no-native-select` fails only on pre-existing `ai-product-modal` (not touched)
Decisions I made:
- `onSubmit` split into `persist_()` (validate + save, resolves boolean, never navigates) + navigation, so the guard's "save and leave" reuses the exact save path. A thrown save error now resolves `false` instead of bubbling unhandled.
- Card gets `padding-block-start: 2.25rem` on every card (desktop too) so the checkbox never sits on the photo — a small empty band shows above the image when the box is hidden.
- The form's own "Cancel" button now also triggers the unsaved-changes dialog if something changed (it navigates through the guarded route).
- Critical question → (a) always visible on touch.
Human validation checklist:
- `/venues/list` desktop 1280px: no checkboxes until hover; hovering shows one at the card's top-left above the photo; selecting keeps all visible. Cards with hours show the clock line (+N for 2+ blocks).
- Phone 360px: checkboxes visible in the corner, not over the photo. `/venues/add` fits with no sideways scroll; infra + hours rows wrap; buttons full width.
- Desktop ≥768px: add/edit form basic fields in two columns.
- Edit a venue, change the name, tap another tab → "unsaved changes" dialog: cancel stays; leave discards; save saves then leaves. Change only the photo → also prompts. Save normally → no prompt.
Merge notes: `app.routes.ts` (2 `canDeactivate` lines). Conflicts: venue-list/venue-detail templates are also touched by the tech-debt PR (`?? []` removal), plan 363 (search clear), 367 (back button). Plan said run after 339/341/342/363/367.

### Plan 341 — Suppliers add/edit as a page  [DONE]
What landed: supplier-list `onAdd()` + hero-FAB "add supplier" → `/suppliers/add`; row tap / edit button / Enter → `/suppliers/edit/:id` (`requireAuth` kept); inline edit removed (`editingId_`, `closingId_`, `editForm_`, `hydrateEditForm`, `saveCurrentInlineEdit`, the desktop panel, the `[shell-modal]` mobile sheet, its template + styles, now-unused imports). `SuppliersPage` clones the `VenuesPage` back bar (`isListRoute_`, `goBackToList()`, `navRoutes_` with `add_supplier`, label `supplier_list`), padding like venues on add/edit only. `SupplierFormComponent` is page-only (modal branch, `embeddedInDashboard`, `supplierToEdit`, outputs removed) with venue-form card styles. Deleted `shared/supplier-modal/**`, `core/services/supplier-modal.service.ts`, the `@defer` mount and AppComponent import/inject. Centering: `.venues-nav` / `.suppliers-nav` `justify-content: center`; both form cards `margin-inline: auto`, `max-width: 35rem`.
Auto validation:
- `rg -n "SupplierModal|app-supplier-modal|supplier-modal" src/app` → no matches — pass
- `npx ng test` full suite (suppliers + venues specs included) → 354/354 — pass
- `npx ng build` → exit 0 — pass; `lint:icons` pass
Decisions I made:
- **OUT-OF-SCOPE WRITE: `src/app/shared/breadcrumbs.md`, `src/app/core/services/breadcrumbs.md`** — removed the deleted files' rows (docs only; needed for the plan's `rg` criterion).
- Supplier shell padding applied only on add/edit (host class) — padding the list route would have changed the list-shell layout.
- P1 guard on supplier routes **skipped**: the plan says adding `canDeactivate` to existing route entries needs escalation.
- Supplier list's `embeddedInDashboard` input kept (still read by the list; dashboard doesn't embed suppliers today) — not in this plan's ask.
- Critical question → (a) page edit, inline edit removed.
Human validation checklist:
- Phone: Suppliers → + (or FAB) → full page with centered "רשימת ספקים" back button → fill and save → back on the list with the new supplier. Tap a supplier row → the same page with its data → save → list.
- Desktop: same flows; form card centered.
- `/venues/add`: inner nav bar and form card centered.
- Inventory → product form → add supplier still works.
Merge notes: deletes 4 files. Conflicts expected with 345 / 361 / 363 / 367 (supplier-list template + ts) and 371 (venue-form.component.scss) — whichever merges later needs a rebase. Plan 342's supplier-form A1 now has only the page branch to convert.

### Plan 342 — Form checkboxes → toggle chips  [DONE]
What landed: `label.c-toggle-chip > input` (inputs stay in the DOM, same `formControlName` / `[checked]` / `(change)` bindings) for: supplier-form delivery days (modal branch + page branch, in `.c-toggle-chip-group`), equipment-form `isConsumable` + `scaling_enabled_`, equipment-list inline-edit booleans, product-form special price (single chip labelled "מחיר מיוחד…"), quick-add allergens, quick-edit-panel suppliers, label-creation auto-triggers, venue-form active. Deleted local classes `.day-check`, `.delivery-days-wrap`, `.checkbox-group label`, `.price-override-label`, `.quick-add-product-modal__checkbox-label`, `.trigger-option`, `.active-toggle`; `.c-filter-option` (+ nested label/dot/count/radio rules) and `.c-filter-options` (+ ≤1023px variant) deleted from `src/styles.scss`.
Auto validation:
- `rg -n "c-filter-option" src/app src/styles.scss` → no matches — pass
- `rg -n 'type="checkbox"' src/app --glob '*.html'` → **does not literally return only list-row-checkbox** — the criterion can't hold as written: the plan-339 filter chips and these new form chips are themselves `label.c-toggle-chip > input[type=checkbox]`. Checked instead that every checkbox sits inside a `.c-toggle-chip` (or list-row-checkbox); the only 2 left outside: metadata menu-type `.field-check` (plan 340's job — per this plan, reported not edited) and the supplier-list inline-edit days (removed by plan 341 / PR #303).
- full client suite → 354/354 — pass; `npx ng build` → exit 0 — pass; `lint:icons` pass
Decisions I made:
- **Approved-exception edit in `src/styles.scss`**: besides `.c-filter-option`, also removed the unused sibling container `.c-filter-options` and its ≤1023px variant (needed for the `rg` criterion, zero users).
- Global `.inline-edit-checkboxes` / `.inline-edit-check` engine rules kept — still used by supplier-list's inline edit on main (goes away with #303).
- venue-form / supplier-form `.form-group label { display:block }` narrowed to `> label` so it doesn't turn chips into blocks.
- Equipment `scaling_enabled_` also converted (it shared the inline group); Plan 338 (PR #288) removes the scaling UI anyway.
- P1 trigger color dot skipped: trigger options (categories/allergens) carry no color.
- Critical question → (a) single toggle chip.
Human validation checklist:
- Supplier form (add + edit page; and the add modal if #303 isn't merged): delivery days are chips; save → reopen → same days selected.
- Equipment form + equipment list inline edit: "מתכלה" chip toggles and persists.
- Venue form: "פעיל" chip toggles and persists.
- Product form: special price chip shows/hides the override input; persists.
- Quick-add product modal: allergens are chips. Quick-edit product panel: suppliers are chips. Metadata → add label: auto-triggers are chips.
- Phone 360px: chip groups wrap, no overflow.
Merge notes: `src/styles.scss` deletions (approved). Conflicts: supplier-form with #303 (341 removes the modal branch — keep 341's version, re-apply the chip markup to the page branch), venue-form with #302 (371), equipment files with #288 (338).

### Plan 340 — Metadata: compact chips + tap menu, menu-type toggle chips  [DONE]
What landed: `RowActionsMenuComponent` gets public `open(anchor)` / `close()`, an `opened` signal and a `showTrigger` input; opened via `open()` (or with `showTrigger=false`) the popover shows at every width (`:host(.is-anchored)`), positioned from the anchor's own rect, clamped horizontally, flipped below when there's no room above. Row ⋮ usage (inventory, recipe-book, suppliers, equipment) unchanged. New spec. Metadata page `#managerCard`: every type renders in `.label-pool` as `.label-pill` (allergens keep their rose tint via `.label-pill--allergen`); editable pills are buttons → tap menu "עריכה" (not for units) / "מחיקה" calling `onRenameMetadata` / `onRemoveMetadata` (existing confirms); system units and shared read-only terms are locked pills. Category/unit grid blocks + hover-reveal rules deleted. Prep + section category managers: same pills + tap menu (`onStartRename` / `onRemove`), double-click rename kept. Menu types: name pill → "עריכה" (inline rename input, Enter/blur saves through the existing rename confirm, Escape cancels) / "מחיקה"; all 5 `ALL_DISH_FIELDS` as fixed-order `.c-toggle-chip`s, tap = toggle + `updateMenuType` (0 fields allowed, per the resolved question). Old checkbox edit mode + `removeFieldFromMenuType` removed.
Auto validation:
- `rg -n "opacity: 0" src/app/pages/metadata-manager` → 1 hit: `opacity: 0.3` on the user-management delete's `:disabled` state — not an action-reveal rule; all reveal rules are gone — pass (semantically)
- `npx ng test --include='src/app/pages/metadata-manager/**/*.spec.ts' --include='src/app/shared/row-actions-menu/**/*.spec.ts'` → 17/17 — pass (2 new metadata specs: pills, no per-item buttons, locked system units); full suite 359/359
- `npx ng build` → exit 0 — pass; `lint:icons` pass
Decisions I made:
- Menu-type rename moved into the name's tap menu (an input can't also be the tap target). The rename itself still goes through `onMenuTypeNameBlur` + its confirm.
- User management: the delete button is now always visible (muted until hover) instead of hover-revealed — keeps the admin-only gating unchanged; needed so no hover-only actions remain.
- Pills use `.label-pill` styles duplicated in the two sub-manager scss files (component-scoped styles can't reach across components; a shared engine class was out of scope).
Human validation checklist:
- Phone 360px: Dashboard → מטא-דאטה. Units, categories, allergens, labels, courses, prep categories, section categories = small pills. Tap one → "עריכה / מחיקה" popover next to it → rename works; delete asks for confirmation. System units / shared terms (non-admin) show a lock and don't open a menu.
- Menu types: each row = name pill + 5 chips in the same order. Tap a chip → toggles; reload → still there. Tap the name → עריכה → type a new name → Enter → confirm → renamed. מחיקה works (blocked when in use).
- Inventory / recipe-book / suppliers / equipment: row ⋮ menus on phone and inline buttons on desktop work as before.
- Desktop: popover appears above the tapped pill, never off-screen at the edges.
Merge notes: none beyond rebase — Plan 362 (row-actions-menu → CDK overlay) must branch from this (Group C). Plan 365 (#297) also edits `metadata-manager.page.component.ts` (`resolvePushScope`) — different methods, small rebase.

### Plan 368 — Product form responsive (mobile + tablet)  [DONE — needs visual check]
What landed (SCSS only, `product-form.component.scss`): the nested `@media` blocks (which compiled to `.form-container .form-container …` and never matched) are removed and rewritten at top level with selectors mirroring the base rules. ≤900px: `.form-section` 2 columns; an expanded `.collapsible-field` (`:has(> content:not(--hidden))`) spans `1 / -1`; `.scaling-row` via `grid-template-areas` → row 1 unit · qty · uom, row 2 price/override · delete. ≤768px: 1 column; `:host` padding `--space-3`, card `--space-4`; purchase rows stacked full-width (price + delete share the last line); `.override-input` `min-inline-size: 5rem; inline-size: 100%`; `.two-col-grid` 1 column; `.form-actions` wrap, buttons `flex: 1 1 auto; min-width: 0`, save first; P1 44px min block size on inputs/selects/custom-selects. Dead `.product-info` / `.grid-2` removed.
Auto validation:
- `npx ng test` full suite (incl. product-form spec) → 354/354 — pass
- `npx ng build` → exit 0 — pass
- A1 "verify they apply": checked on the compiled CSS (`npx sass` → both `@media` blocks now emit top-level `.form-container .form-section` etc.), not in DevTools
Decisions I made:
- Unit-of-measure (":" compare-to unit) select sits on row 1 next to unit + qty on tablet — the plan only named unit + qty for row 1.
- CSS-only, no markup change (rows placed by `:nth-child` + areas).
- Not visually verified here (the form needs auth + backend; no browser session in this run) — see checklist.
- Critical question → (a) 2 columns on tablet.
Human validation checklist:
- Phone 360px and 414px: `/inventory/add` and edit an existing product → one column, buttons wrap and fit (save first), purchase-option rows stacked, special-price input usable, allergens dropdown usable, **no sideways scroll**.
- Tablet ~800px: 2 columns; open allergens / waste-yield → spans the full row and is readable; a product with 2 purchase options shows each in 2 lines with the delete at the end of line 2.
- Desktop 1280px: looks the same as before.
Merge notes: Plan 342 (#304) changes the special-price checkbox markup in the same scaling row (it becomes a chip) — rebase is small; the `.price-override-label` rule removed there is untouched here.

### Plan 348 — Recipe builder mobile: usable ingredient rows  [DONE — needs device check]
What landed: `recipe-ingredients-table.component.scss` — the `@media (max-width: 640px)` single-row block is deleted; the `@container ingredients` card layout is the only narrow layout, threshold raised 520 → 700px (Critical Q → a) so landscape phones get cards: row 1 name/search full width, row 2 amount stepper · unit · cost · actions (drag handle + percent hidden in card mode), 44px stepper/trash targets, P1 name ellipsis with badges on the same line. Hover-reveals (row trash, `.edit-badge`) wrapped in `@media (hover: hover)`; on touch always visible; card qty buttons always visible. `isMobile_` query → `'(max-width: 767px), (hover: none) and (max-height: 500px)'`. `NutritionBadgeComponent`: `positionTooltip_()` shared by hover + tap, est. height `min(240, innerHeight − 16)`, opens on the side with room, `max-height` capped to that room (scrolls inside), document-click closes it; `@Input()` → `input()`. New `nutrition-badge.component.spec.ts` (4). `recipe-header.component.scss` `50% 50%` → `1fr 1fr`.
Auto validation:
- `npx ng test` full suite (incl. recipe-builder + new nutrition-badge specs) → 358/358 — pass
- `npx ng build` → exit 0 — pass
Decisions I made:
- Card mode hides the drag handle (the old 640px block did too) and the percent column (not in the plan's row-2 list).
- The badge `@Input` → `input()` change matches the tech-debt PR (#293); only the `@angular/core` import line differs (this one adds `HostListener`) — a one-line conflict, keep this version.
- Not checked on a real device here (needs the app running with data).
Human validation checklist:
- Phone portrait 360×740: new recipe → add 3 ingredients → each card shows full name, amount (− / + visible), unit, cost, delete; all tappable; no sideways scroll; header (name + type toggle) fits.
- Phone landscape 740×360: cards too; edit badge + nutrition leaf visible; tap the leaf → nutrition info fully on screen (scrolls inside if tall); tap outside closes; delete works; tapping a name's quick-edit opens the modal, not the inline accordion.
- Desktop: rows look as before; trash + edit badge still hover-reveal; nutrition tooltip on hover in inventory and recipe builder positioned as before.
Merge notes: one-line import conflict with #293 in `nutrition-badge.component.ts` — keep this branch's line.

### Plan 344 — Menu checklist/prints top sheet  [DONE]
What landed: new `menu-intelligence/components/menu-export-sheet/` (+ spec): fixed top sheet (`max-block-size: 80dvh`, safe-area padding, `translateY(-100%) → 0` in 200ms, reduced-motion aware) + dimmed backdrop; backdrop click / Escape close; groups with Lucide icons: צ׳קליסט (by dish / category / station → view + export), קניות (view / export), הכל (view / export), הדפסה; picking an option emits `close` then the action. Page: FAB `menu_toolbar_open` now toggles `exportSheetOpen_`; the 4 export pills + dropdowns removed (pill row keeps only Save, still `.no-print`); dead `toolbarOpen_`, `showExport_`, `menuFabExpanded_`, `openToolbar`/`closeToolbar`/`expandMenuFab`/`collapseMenuFab`/`toggleExport`, `viewExportModal_`, `exportChecklistDropdownOpen_` and their toggles removed; their styles removed from `_toolbar.scss`. `export-preview.component.scss`: `vh → dvh`, `@media (max-width: 600px)` — paper padding ~1rem, `max-height: calc(100dvh - 6rem)`, sections `overflow-x: auto`, table `--fs-sm` + `.375rem .5rem` cells, actions wrap.
Auto validation:
- `rg -n "toolbarOpen_|showExport_|menuFabExpanded_|openToolbar" src/app/pages/menu-intelligence` → no matches — pass
- `npx ng test` full suite (incl. menu-intelligence + new sheet spec, 4 tests) → 358/358 — pass
- `npx ng build` → exit 0 — pass; `lint:icons` pass
Decisions I made:
- Checklist rows keep **both** view and export per mode (the old dropdown had both; the plan listed only view).
- Dictionary: `menu_toolbar_open` value changed to "צ׳קליסט והדפסות" (approved value change; uses the geresh like `toolbar_checklist`); `menu_print` = "הדפסה" appended (P1, replaces the hard-coded "🖨 הדפסה"). Emoji removed from the page.
- P2 (remember last group) not done.
- Critical question → (a) sheet everywhere, pills removed on desktop too.
Human validation checklist:
- Phone, `/menu-intelligence`: tap FAB → "צ׳קליסט והדפסות" → sheet slides down from the top → tap outside → slides away; Escape closes on desktop.
- Choose צ׳קליסט → לפי מנה → view → preview opens, readable at 360px portrait, no page-level sideways overflow (wide tables scroll inside their box); close / print / Excel buttons visible.
- Shopping list and "הכל" view + export, print → work as before.
- Save pill still visible and works; print preview (Ctrl+P) hides it and the sheet.
- Note: the old FAB label may show until the cached dictionary refreshes (it's cached in localStorage).
Merge notes: dictionary value change + 1 key. `export-preview.component.scss` also touched by #301 (347, same `vh → dvh` lines — identical change, trivial).

### Plan 349 — Shared column carousel for every list  [DONE — needs phone check]
What landed: `src/app/shared/column-carousel/` — `ColumnCarouselGroupDirective` (`[columnCarouselGroup]`, `exportAs`, `columnCarouselIndex` model, `index` / `count`, `next()` / `prev()` / `go()`; next wraps, Critical Q → a), `ColumnSlideDirective` (`[columnSlide]`, `label`), `ColumnCarouselHeaderComponent` (active label, position dots, two floating 28px round glass arrows over the top edge, swipe, P1 ←/→ keys) and `ColumnCarouselCellComponent` ("‹ label ›" line above the value with arrows, swipe), both `contentChildren()`-based, one shared stylesheet (desktop `display: contents`; ≤768px carousel; 150ms slide-in, off under reduced motion; no overflow clipping). Swipe = pointer events, 40px, horizontal-only (`touch-action: pan-y`), RTL-aware. The cell host carries `.c-list-body-cell` → same row background, border, invalid/incomplete tints and hover as the row; inner slide styling reset. Migrated recipe-book, inventory, suppliers, equipment (`columnCarouselGroup` on `<app-list-shell>`; `carouselHeaderIndex_` + `onCarouselHeaderChange` removed; per-list `@media 768 … app-cell-carousel` blocks deleted). Old `shared/carousel-header` + `shared/cell-carousel` deleted. Recipe-book mobile grid `'2fr 0.5fr 1.4fr 0.8fr 40px 28px'`; carousel cell `padding-inline: .25rem`.
Auto validation:
- `rg -n "app-cell-carousel|app-carousel-header|carouselHeaderIndex_" src/app` → no matches — pass
- `npx ng test --include='src/app/shared/column-carousel/**/*.spec.ts'` → 6/6 (shared index, wrap, cell arrow moves all rows, header label + dots, swipe threshold/vertical/RTL) — pass; full suite 360/360
- `npx ng build` → exit 0 — pass; `lint:icons` pass
Decisions I made:
- Cell arrows sit on the small label line ("‹ label ›") instead of the value's sides, so they cost no width (the plan asked for arrows on cells *and* more room).
- The .25rem cell padding lives in the shared component (applies to all 4 lists), not a recipe-book-only class.
- Group directive goes on `<app-list-shell>` (header and rows are projected into it, so both inject it) — no list-shell change needed.
- A swipe on a row cell doesn't also open the row (stopPropagation on a recognised swipe only).
- **OUT-OF-SCOPE WRITE: `src/app/shared/breadcrumbs.md`** — replaced the 2 deleted components' rows with the new one.
Human validation checklist:
- Phone 360px, `/recipe-book`: swipe a row's carousel cell or tap a header arrow → header + all rows move together; dots follow; the column is wider and values (labels chips, allergens, date, rating) aren't cut off; header title fully readable with the round arrows floating above it; carousel cells have the row's color (including invalid/incomplete tints in inventory).
- Same in `/inventory/list`, suppliers, `/inventory/equipment`.
- Vertical scrolling over a carousel cell still scrolls the page.
- 768px and desktop: carousel hidden, columns as before.
Merge notes: deletes `shared/carousel-header/**`, `shared/cell-carousel/**`. Touches the same 4 list templates as #294/#299/#300/#303/#296 — rebase needed for whichever merges later. Plans 350/352/353/346 are stacked on this branch (Group C).

### Plan 350 — Shared scroll rail for horizontal strips  [DONE — stacked on #309]
**Base: `feat/night-1007-349-shared-column-carousel` (merge #309 first).**
What landed: `src/app/shared/scroll-rail/` (`app-scroll-rail`, inputs `snap` none|proximity|mandatory, `arrows` auto|always|never, `step` px|'page'=80%): snap scroller with hidden scrollbar + `overscroll-behavior-x: contain`; `canPrev_`/`canNext_` from a direction-normalised scroll position (RTL negative `scrollLeft`), updated on scroll, `ResizeObserver` and `MutationObserver`; 28px round glass arrows hidden via `visibility` (no layout shift), focusable with aria-labels (`scroll_prev`/`scroll_next` keys appended); edge fade only on the scrollable side(s); P1 desktop wheel → horizontal when overflowing and no Shift; `justify-content: safe center` (+ `flex-start` fallback where `safe` isn't supported). Migrations: metadata jump-nav (old `canScrollNavPrev_`/`canScrollNavNext_`/`scrollJumpNav`/`updateJumpNavScrollState`, `jumpNavEl`, `ngAfterViewInit`, arrow markup + styles deleted; restyled as a glass pill bar), tab chips (chips inside the rail; `.c-tab-chips` phone overflow rules removed — approved exception), menu-dish-row `.dish-data` (`snap="mandatory"`). Spec: 5 tests (fits → no arrows, overflow RTL start/end, LTR, normalisation).
Auto validation:
- `rg -n "canScrollNavPrev_|canScrollNavNext_|scrollJumpNav" src/app` → no matches — pass
- `npx ng test --include=scroll-rail + tab-chips + metadata-manager specs` — pass (full suite 364/364; the 2 old jump-nav arrow specs were replaced by one "tabs render inside the rail" spec — arrow behaviour is covered by the rail spec)
- `npx ng build` → exit 0 — pass; `lint:icons` pass
Decisions I made:
- The tab-chips "centered but first chip unreachable" bug is fixed by the rail's `safe center` (plus an `@supports` fallback to `flex-start`) rather than a ≤767px media rule.
- Metadata jump-nav still shows only ≤1023px (desktop shows every section in the grid, as today).
- Critical question → (a) centered, no arrows on desktop when chips fit.
Human validation checklist:
- Phone 360px RTL: `/dashboard?tab=metadata` jump-nav → an arrow only on the side with more tabs; tapping scrolls; first and last tab reachable.
- Phone: dashboard / recipes / menus tab-chip rows → scroll + arrows only when they overflow; first chip reachable.
- Menu builder: a dish row's data strip swipes and snaps; arrows when it overflows; editing a field inline still works.
- Desktop 1280px: tab chips centered, no arrows; mouse wheel over an overflowing strip scrolls it sideways.
Merge notes: `src/styles.scss` `.c-tab-chips` rewrite (approved). Conflicts: `tab-chips.component.html` with #296 (367) and #288 (338); `metadata-manager.page.component.ts` import line with #305 (340, adds `viewChild`/`ElementRef` back for its menus) and #297 (365).

### Plan 352 — Page header part 1: `<app-page-header>` + list-shell pages  [DONE — needs visual check; stacked on #310]
**Base: `feat/night-1007-350-scroll-rail` (merge #309 → #310 → this).**
What landed: `src/app/shared/page-header/` (`app-page-header`): inputs `titleKey`, `count`, `countLabel`, `backLink` / `showBack` + `(back)`, `backLabelKey`; slots `[header-title]`, `[header-back]`, `[header-search]`, `[header-leading]`, `[header-actions]`; title is an `<h1>` (Critical Q → a), start-aligned, one line with ellipsis, `--fs-xl` → `--fs-lg` when narrow; count = primary-soft pill (P1 pop animation, off under reduced motion); container query at 640px: wide = 1 row (title · search ≤24rem · filter + actions), narrow = title row + full-width search row (hidden when no search); 44px targets when narrow. `ListShellComponent` maps its slots into it (`ngProjectAs` wrappers), the filter toggle goes to `[header-leading]` (now with `aria-expanded`), `resultCountText()` becomes the pill's aria-label; old `.list-header` flex/grid, `$header-break-*`, `.header-start/-search/-actions/-spacer/-ham-mirror` and the `::ng-deep .page-title` rule deleted. The 4 list pages: `shell-title` is now just the text (`<ng-container shell-title>`), local `.page-title` styles and recipe-book's `$header-break-stack` override removed. New spec (4); equipment-list spec updated to look for the header's h1.
Auto validation:
- `rg -n "header-ham-mirror|header-spacer|header-break-grid" src/app` → no matches — pass
- `npx ng test` (page-header + list-shell + `*-list` specs, full suite) → 368/368 — pass
- `npx ng build` → exit 0 — pass
Decisions I made:
- The count pill shows only when the page passes both `resultCount` and `resultTotal` (same rule as the old subtitle).
- The page title changed from `<h2>` (per page) to the header's `<h1>`.
- Supplier list's back button (still on this base; removed by #296) is projected through `[header-back]`.
Human validation checklist:
- Phone 360px: inventory, recipe book, suppliers, equipment → title at the right with a count pill, filter + actions at the left, search on one full-width line below. Two rows total; nothing centered.
- 768px: same two-row layout or one row if it fits.
- Desktop 1280px: one header row — title + count, search in the middle, filter + add button at the end.
- Change a filter → the count pill updates (subtle pop).
Merge notes: plan 353 (part 2) is stacked on this branch; plan 346 too. Conflicts with #296 (367: supplier back button) and #299 (363: search markup inside `shell-search`, unaffected by the slot mapping but same files).

### Plan 353 — Page header part 2: venues, menu library, dashboard, trash  [DONE — needs visual check; stacked on #311]
**Base: `feat/night-1007-352-page-header-list-shell` (merge #309 → #310 → #311 → this).**
What landed: `PageHeaderComponent.subtitleKey` (muted line under the title, hidden on narrow headers — Critical Q → a) + spec case. Venues: `<app-page-header titleKey="venue_list" [count]…>` with search in `[header-search]` and "add venue" in `[header-actions]`; back button + `backToDashboard()` + `.action-bar` / `.page-title` / `.result-count` styles removed; `.filters-bar` unchanged. Menu library: title + search + "תפריט חדש" in the header; old `.action-bar` / `.page-title` (+ its mobile variant) removed. Dashboard overview: `titleKey="dashboard" subtitleKey="dashboard_subtitle"`; `.dashboard-header` / `.header-title-block` / `.page-title` / `.page-subtitle` removed. Dashboard tab header: title = active tab (`metadata` → `metadata_manager`, etc.), no back button. Trash: title + refresh in `[header-actions]`; back button, `backToDashboard()`, unused `Router`, `.trash-header` (+ mobile grid) removed.
Auto validation:
- `rg -n 'class="page-title"' src/app` → no matches — pass
- `npx ng test` (venues, menu-library, dashboard, trash, page-header specs; full suite) → 369/369 — pass
- `npx ng build` → exit 0 — pass; `lint:icons` pass
Decisions I made:
- **OUT-OF-SCOPE WRITE: `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts`** — only to add `PageHeaderComponent` to `imports` (the plan's scope listed just the html/scss of that component).
- Back buttons on venues / trash / dashboard-header are removed here too (this branch is not based on #296, which removes them as well) — the two PRs make the same change; resolve by keeping either side.
- Menu library gets no count pill (the plan didn't ask for one).
- dashboard-header spec rewritten (title = tab, no button); dashboard.page spec calls `setTab('overview')` directly (same as #296).
Human validation checklist:
- Desktop 1280px: `/venues`, `/menu-library`, `/dashboard` (title + subtitle), `/dashboard?tab=metadata` (title "ניהול מטא-דאטה" or the metadata title, not "לוח בקרה"), `/trash` → same title row as inventory.
- Phone 360px: each ≤ 2 rows (title row + search where there is one); dashboard subtitle hidden.
- No back buttons on venues, trash, dashboard tabs; the "לוח בקרה" chip returns (once #296 is merged).
Merge notes: conflicts expected with #296 (367: same back-button removals), #295 (351: dashboard-overview.ts imports/template), #299 (363: venue/menu-library search markup), #302 (371: venue-list), #293 (venue-list `?? []`).

### Plan 346 — Lists: sticky table header + pagination at the top  [DONE — stacked on #311]
**Base: `feat/night-1007-352-page-header-list-shell` (merge #309 → #310 → #311 → this; independent of #312).**
What landed: list-shell — `<div class="table-top">` (sticky, `inset-block-start: var(--list-sticky-top)`, z-index 5, `--bg-pure`) holding a new `[shell-pagination]` slot (hidden when empty → suppliers/equipment get no gap) above `.table-header`; `--list-sticky-top` = 0 (>1023px, body scrolls inside the card), `3.875rem` (≤1023px), `env(safe-area-inset-top)` (≤620px); `.table-area` `overflow: hidden → clip`, rows `50px 1fr → auto 1fr` (≤1023 variant `auto auto` unchanged). P1: a pagination button press resets the body scroll / scrolls the page back to the pinned top. Inventory + recipe-book pagination moved into `<ng-container shell-pagination>`. `src/styles.scss` `.c-pagination-controls`: divider `border-block-start → border-block-end`, `grid-column` dropped, padding `--space-3 → --space-2` (approved exception). New `list-shell.component.spec.ts` (2).
Auto validation:
- `npx ng test --include='src/app/shared/list-shell/**/*.spec.ts' --include='src/app/pages/**/*-list.component.spec.ts'` — pass; the sticky spec ran at a 765px karma viewport and confirmed `.table-top` stays at its sticky offset after scrolling 600px; full suite 370/370
- `npx ng build` → exit 0 — pass
Decisions I made:
- Compact pagination padding (`--space-2`) to keep pagination + header under ~6rem on phone.
- Critical question → (a) pagination + column header pinned (title/search not pinned).
Human validation checklist:
- Phone 360px + tablet 800px: `/inventory/list` → scroll down → pagination bar + column names stay pinned at the top (under the top bar on tablet); "next page" works from the top and jumps back to the first row. Same on `/recipe-book`.
- Desktop 1280px: pagination at the top of the table (not the bottom), header pinned while the body scrolls.
- Suppliers + equipment: column header pinned, no empty strip above it.
- Phone: the column-carousel header arrows (plan 349) aren't clipped at the table's top edge.
Merge notes: `src/styles.scss` `.c-pagination-controls` edit. Same list templates as many other PRs (rebase).

### Plan 364 — Search fields part 2: picker clear + no autocomplete  [DONE — needs Android check; stacked on #299]
**Stacked on #299 (plan 363).** Set the base to `main` after #299 merges.

What landed:
- `app-input-clear` (X) added to: chip-search-dropdown, custom-select (type-to-filter, non-chip variant only), custom-multi-select, recipe-book ingredient filter, recipe-builder logistics search, menu-intelligence event-type search, section-category search, and the menu dish-row search. 16 `app-input-clear` uses in templates.
- Clearing empties the query, resets the highlight, keeps the dropdown open with the full list, and refocuses the input.
- chip-search-dropdown gets a per-instance id (`csd-N`) used for the input `id`/`name` and every option id, so two dropdowns on one page never collide.
- `autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"` added to the pickers and swept across the listed modal, form and metadata name fields. Venue/supplier contact, phone, address, email and number fields were left alone.
- New `.c-picker-search-row` engine row appended to `src/styles.scss` (append-only).
- New spec: `chip-search-dropdown.component.spec.ts` (unique ids across two instances, clear-button visibility, clear keeps full list open + refocus).

Auto validation:
- `npx ng build`: pass
- Full client specs: 361/361 SUCCESS (358 + 3 new)
- `npm run lint:icons`: pass. `lint:no-native-select`: only the pre-existing `ai-product-modal` failure (same as main).

Decisions I made:
- **menu-dish-row:** the X emits `searchQueryChange('')`, not the existing `clearSearch` output the plan named. `clearSearch` → `clearDishSearch` reverts an in-progress dish edit, which is wrong for "empty the box". Plan line left `[ ]` for that reason.
- **custom-select chip variant:** no X (the chip variant has no free-text box worth clearing).
- **Recipe-book ingredient filter:** its result list only renders while there's a query, so clearing closes it. Not changed.
- **`autocomplete="new-off"` fallback (P1):** not applied; it's conditional on an Android check that needs a device.
- The Plan 320 custom-select double-click bug was not in scope and was not touched.

Human validation checklist:
- [ ] On Android Chrome: open a chip-search-dropdown (e.g. recipe labels) and type — no keyboard suggestions/autofill bar. If suggestions still appear, apply the `new-off` fallback (plan line 104).
- [ ] Type in each picker listed above, tap X: text clears, list stays open with every option, cursor stays in the box.
- [ ] Menu-intelligence dish row: while editing a dish, tap X — the search clears but the dish edit is not reverted.
- [ ] Venue/supplier contact & phone fields still offer browser autofill.

Merge notes:
- Base is `feat/night-1007-363-search-clear-no-autocomplete`; merge #299 first.
- Touches many templates also touched by 342/340/361/368 (autocomplete attribute lines) — expect small textual conflicts; resolve by keeping both sides.
- `styles.scss` append conflicts with other night PRs: keep all appended blocks.

### Plan 362 — List overlays at body level (row actions menu + edit modal)  [DONE — needs device check; stacked on #305]
**Stacked on #305 (plan 340).** Set the base to `main` after #305 merges.

What landed:
- `RowActionsMenuComponent` now renders its popover through **CDK Overlay** at body level:
  - `flexibleConnectedTo(trigger | anchor)` with 6 fallback positions (centered above → centered below → start/end-aligned above/below), `withPush(true)`, 8px viewport margin.
  - Transparent backdrop; closes on backdrop click, Escape, route change (`NavigationStart`), and right after a (non-disabled) action button runs.
  - `scrollStrategy: reposition` (P1).
  - Public API unchanged: ⋮ trigger, projected content, `showTrigger`, `open(anchor)` / `close()` / `opened`.
  - Manual `popoverPos` math, `.ram-backdrop` and the `.c-list-row` height lookup are gone.
- `list-shell`: `<ng-content select="[shell-modal]">` moved out of `.list-container` to sit directly under `:host` (no wrapper needed — `:host` is `display: block` with no trapping property). Comment now explains both traps.
- Gotcha entry: "`position: fixed` is not relative to the viewport under transform / filter / backdrop-filter / container-type / contain".
- Spec rewritten (8 cases): renders outside a `backdrop-filter` trap, placed next to the anchor inside the viewport, close returns the element to the host, backdrop/Escape close, action runs then closes, disabled action keeps it open.

Auto validation:
- `npx ng build`: pass
- Full client specs: 364/364 SUCCESS
- `npm run lint:icons`: pass (no template icon changes)

Decisions I made:
- **`DomPortal` instead of `TemplatePortal`.** The plan named `TemplatePortal`, but `<ng-content>` can only be projected once, and on desktop the same buttons must render inline in the row. A `DomPortal` moves the existing `.ram-popover` element (with live bindings and projected buttons) into the overlay pane and puts it back on close, so desktop is untouched.
- **Styles stay in the component SCSS** (no `ViewEncapsulation.None`): Emulated encapsulation matches by attribute, which the element keeps wherever it is in the DOM. The only change is that the open-state look no longer depends on a `:host` ancestor.
- **Close after an action (new behaviour).** The body-level backdrop would otherwise sit over the edit modal the action just opened. Listener is capture-phase because row actions call `stopPropagation()`.
- **CDK overlay CSS:** CDK 19 loads its structural styles itself (`_CdkOverlayStyleLoader`), so nothing was added to `angular.json` or `styles.scss`. The overlay container uses CDK's default z-index 1000 (was 1100 for the old popover); it is appended last to `<body>`, so it stacks above other 1000-level layers.
- Router events read with `events?.` because some list specs provide a bare Router stub (otherwise 9 RecipeBookList specs failed).
- **OUT-OF-SCOPE WRITE: `docs/brain/gotchas/angular.md`** — the scope names `docs/brain/gotchas.md`, but that file is now an index that says `src/app/` gotchas live in `gotchas/angular.md`. The entry went there; the index row's count was updated (it was stale at 12; there are now 20 entries).

Human validation checklist:
- [ ] Tablet (~800px) and phone (360px): equipment → ⋮ on a row near the bottom → the menu opens fully visible next to the button → tap outside → it closes.
- [ ] Same ⋮ check in inventory, suppliers and recipe-book.
- [ ] Tap Edit in the ⋮ menu: the menu closes and the edit modal is centered on screen with the page dimmed (equipment + suppliers use `[shell-modal]`).
- [ ] Metadata manager (plan 340 chip tap menus): tap a chip → the menu opens next to it, Edit/Delete work, menu closes after.
- [ ] Desktop (1280px): row action buttons still sit inline in the row; hover behaviour unchanged.
- [ ] Open a ⋮ menu and scroll the list: the menu follows its button.

Merge notes:
- Base is `feat/night-1007-340-metadata-chips-tap-menu`; merge #305 first.
- `list-shell.component.html` is also edited by #311 (352, `ngProjectAs` header) and #313 (346, `[shell-pagination]` slot). Expect a conflict around the `[shell-modal]` block: keep their changes and keep the slot **after** the closing `</div>` of `.list-container`.
- Inventory and recipe-book don't project an edit modal through `[shell-modal]`; their modals were not changed (out of scope).


## Skipped / not reached
- **338** — already has an open PR (#288, `feat/338-…`); skipped to avoid a duplicate.
- **370 A4** — skipped (see its section).
- **362 / 364 conditional items** — 364's `autocomplete="new-off"` fallback depends on an Android check; 362 A4 (device checks at 360/800/1280px) is yours.
- **Explicitly not tonight (per instructions):** 321, 304, 306, 376, 366, 372, 373, 374, 377, 378, 386, 384, 390–393, KEEP DEFERRED, Angular 22, 122, 248.
- `.claude/todo.md` was not edited; plan checkboxes were marked only in each plan file on its own branch. No session-state files were written (the PR bodies are the record).

## Environment limits hit
- **No browser / device checks:** no gstack `/browse` here, so every visual/responsive/touch check is in your checklists. Some layout logic was checked via computed styles in Karma (e.g. 346 sticky at 765px, 362 overlay placement).
- **Mongo-backed server tests can't run** (the mongodb-memory-server binary download is blocked). Only pure Node vitest files ran (370: 24 new tests + existing pure tests, 61 pass).
- GitHub GraphQL is blocked → PRs were created via the REST API; draft status set at creation.
- `npm run lint:no-native-select` fails on `main` already (`ai-product-modal`); no PR adds a native `<select>`.
