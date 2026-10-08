# Plan 394 — Night 2026-10-07 PR Validation and Merge Runbook

Status: draft
Snapshot: ef21dfae

## Problem Statement
The overnight run of 2026-10-07 (report: branch `report/night-2026-10-07`, file `OVERNIGHT-REPORT-2026-10-07.md`, PR #316 closed) left 20 open draft PRs (#293–#315 minus #303/#305, closed as duplicates of this morning's #318/#320). Every branch builds and passes specs, but no `[human]` item was validated because the run had no browser. The Human wants to validate each PR **before** anything reaches `main`, one PR at a time, in a worktree slot.

This plan is the runbook: the order, what the agent does per round, what the Human checks per round, and the approve / skip / reject rules. Nothing merges without the Human's word.

## Architecture Impact
None. No invariant touched. Merges only; every PR was already planned under its own plan number.

## Read-Write Scope
- Night branches `feat/night-1007-*` and `chore/night-techdebt-quickfixes` (rebase + conflict fixes only, no new features)
- Slot `wt-1` (`../foodVibe1.0-wt-1`, ports 4201 / 3001)
- GitHub PRs #293–#315 (ready / merge / close / retarget)
- This plan file (checkboxes)

## Rules
- **Validation happens in `wt-1`, never on `main`.** The Human's main checkout on 4200 stays as the "before" to compare.
- **One PR per round, in the order below.** A stacked chain is tested once at its top (the top branch contains its parents).
- **Human words:** `approve` → mark ready + squash-merge + delete branch; `skip` → leave draft, next round; `reject <why>` → close PR with the reason, next round; `fix: <what>` → agent fixes on the branch, re-serves, Human re-checks.
- The todo-sync bot updates `.claude/todo.md` after each merge; nobody edits it by hand here.
- Phone checks: run `/remote` on the wt-1 server (`node scripts/remote-port.mjs on` from `../foodVibe1.0-wt-1`), sign in with a real account, `off` when done.
- Conflicts: `src/styles.scss` and `dictionary.json` are append-only → keep both sides. Templates: keep both sides, then build + specs decide.

## Per-round procedure (agent)
1. `cd ../foodVibe1.0-wt-1`, `git fetch`, `git checkout <branch>`, `git rebase origin/main`, resolve conflicts, `npx ng build` (exit 0), `npx ng test --watch=false` (all pass), `npm run lint:icons`.
2. `git push --force-with-lease` the rebased branch. For a stacked PR, first retarget its PR base to `main` (`gh pr edit <n> --base main`).
3. Start the slot servers from `../foodVibe1.0-wt-1`:
   - backend: `PORT=3001 ALLOWED_ORIGIN=http://localhost:4201 npm run dev:local` in `server/`
   - frontend: `npx ng serve -c slot --port 4201`
   (`node scripts/slot-serve.mjs` once plan 393 lands.)
4. Post in chat: PR number, what landed, decisions made in the night run, the numbered Human checklist below, and `http://localhost:4201`.
5. Wait for the Human's word. On `approve`: `gh pr ready <n>`, `gh pr merge <n> --squash --delete-branch`, tick the round here. Then the next round.

## Rounds (order)

### Round 1 — PR #293 Tech-debt quick fixes (`chore/night-techdebt-quickfixes`) — rebases clean
- [x] Inventory list (desktop): hover the leaf nutrition badge on a product → tooltip as before.
- [x] Recipe builder: nutrition badge on an ingredient row still shows.
- [x] Venues list + venue detail: infrastructure count still shows.
- [x] Menu library: event revenue figures unchanged.
- [x] Merged.

### Round 2 — PR #301 Plan 347 Mobile keyboard (`feat/night-1007-347-mobile-keyboard`) — rebases clean
- [x] Android: recipe builder → tap an ingredient search → field centered above the keyboard, bottom bar + FAB hidden; close keyboard → they return.
- [x] iPhone: AI product modal → tap the prompt → modal shrinks, textarea visible above the keyboard.
- [x] Phone: list row inline edit (bottom sheet) → tap a field → sheet sits above the keyboard.
- [x] Desktop: no visual change anywhere.
- [x] Merged.

### Round 3 — PR #302 Plan 371 Venues A (`feat/night-1007-371-venues-a`) — rebases clean
- [x] `/venues/list` desktop 1280: no checkboxes until hover; hover shows one top-left above the photo; selecting keeps all visible; cards with hours show the clock line (+N for 2+ blocks).
- [x] Phone 360: checkboxes in the corner, not over the photo; `/venues/add` no sideways scroll; infra + hours rows wrap; buttons full width.
- [x] Desktop ≥768: add/edit basic fields in two columns.
- [x] Edit a venue name → tap another tab → unsaved dialog: cancel stays / leave discards / save saves then leaves. Photo-only change also prompts. Normal save → no prompt.
- [x] Merged.

### Round 4 — PR #307 Plan 348 Recipe builder mobile rows (`feat/night-1007-348-recipe-builder-mobile-rows`) — rebases clean
- [x] Phone portrait 360×740: new recipe → 3 ingredients → each card shows full name, amount (− / +), unit, cost, delete; all tappable; no sideways scroll; header fits.
- [x] Phone landscape 740×360: cards; edit badge + nutrition leaf visible; tap leaf → info fully on screen; tap outside closes; delete works; name quick-edit opens the modal, not the inline accordion.
- [x] Desktop: rows as before; trash + edit badge hover-reveal; nutrition tooltip positioned as before.
- [x] Merged.

### Round 5 — PR #297 Plan 365 Admin scope wording (`feat/night-1007-365-admin-scope-wording`) — conflict: dictionary.json
- [x] Metadata: delete a label → header "מחיקה", buttons "מחק רק אצלי / מחק מכולם". Add → "פריט חדש … פרסם לכולם". Rename → "שמירת שינויים … עדכן לכולם".
- [x] Inventory: delete a master-linked product → "מוצר" + the "תסיר את המוצר גם מכל המתכונים" warning.
- [x] Recipe book: select 3 master-linked recipes → delete → "3 פריטים נבחרו…", one dialog. Single → one dialog. Bulk-add label to 3 → "3 פריטים נבחרו…" wording.
- [x] Recipe builder as admin: new recipe → "פריט חדש"; new dish → "מנה חדשה".
- [x] Regular user: no scope prompts; plain delete confirm still shows.
- [x] Merged.

### Round 6 — PR #298 Plan 370 AI recipe portions (`feat/night-1007-370-ai-recipe-portions`) — conflict: dictionary.json
Night run skipped A4 (eval script) and could not run Mongo server tests.
- [x] Agent: `cd server && npm test` on this PC → all green (incl. Mongo files).
- [x] With the local key: "חביתה" → 1 portion, 2–3 eggs, pinch of salt. "חביתה ל-2" → 2 portions, 4–6 eggs. "שקשוקה ל-4" → 4 portions.
- [x] Ask "חביתה ל-10 מ-2 ביצים" → approve → warning "כמויות הרכיבים לא סבירות ביחס למספר המנות".
- [x] Decide: A4 eval script now (`fix:`) or leave `[ ]` in plan 370.
- [x] Merged.

### Round 7 — PR #295 Plan 351 Dashboard recent activity (`feat/night-1007-351-recent-activity-history`) — conflict: dictionary.json
- [x] Edit a product's supplier, category and price → `/dashboard`: product name, "עודכן", "לפני רגע", 3 lines like "ספק: X ← Y", all Hebrew, no ids.
- [x] Edit 4+ fields → "+N שינויים נוספים" opens a popover with all changes; click outside closes.
- [x] Phone 360: entries wrap, no sideways scroll; time under the name.
- [x] Entries from earlier days → "היום" / "אתמול" / date headers.
- [x] Merged.

### Round 8 — PR #296 Plan 367 Dashboard chip, no back buttons (`feat/night-1007-367-dashboard-chip-no-back`) — conflicts: tab-chips spec, supplier-list.ts
- [x] `/dashboard`: chips אתרים · מטא-דאטה · ספקים · אשפה, none active. Tap מטא-דאטה → אתרים · לוח בקרה · ספקים · אשפה (לוח בקרה outlined) → tap it → overview.
- [x] `/suppliers`, `/venues`, `/trash`: no back button; outlined "לוח בקרה" chip in that page's slot. Phone 360 + desktop.
- [x] Suppliers list header: title not squeezed.
- [x] Merged.

### Round 9 — PR #314 Plan 364 Search fields part 2 — chain top, contains #299 Plan 363 (`feat/night-1007-364-search-fields-part2`)
Agent: rebase #299 onto main first, then #314 onto #299; retarget #314 to `main`; serve #314. `approve` merges #299 then #314.
Plan 363 checks:
- [x] `/inventory/list`: empty → no X. Type "עגב" → X fades in → tap → text gone, full list, cursor stays → X fades out. Same on `/recipe-book`, suppliers, `/inventory/equipment`, `/menu-library`, `/venues`.
- [x] Escape with text → clears.
- [x] Recipe builder ingredient search + preparation search: type → results → X → closed, empty, focused.
- [x] Android Chrome: no browser suggestion strip on these fields.
- [x] OS "reduce motion": X appears/disappears instantly.
Plan 364 checks:
- [x] Android Chrome: chip-search-dropdown (recipe labels) → type → no autofill bar. If it still appears → `fix:` apply the `new-off` fallback (plan 364 line 104).
- [x] Each picker: type, tap X → text clears, list stays open with every option, cursor stays.
- [x] Menu-intelligence dish row: while editing a dish, tap X → search clears, dish edit NOT reverted.
- [x] Venue/supplier contact + phone fields still offer browser autofill.
- [x] Merged (#299 then #314).

### Round 10 — PR #315 Plan 362 List overlays at body level (`feat/night-1007-362-list-overlays-body-level`) — was stacked on closed #305; rebase onto main (your 340 is there)
Conflicts expected in `row-actions-menu` and `list-shell` (keep the `[shell-modal]` slot after `.list-container`'s closing `</div>`).
- [x] Tablet ~800 + phone 360: equipment → ⋮ on a row near the bottom → menu fully visible next to the button → tap outside closes.
- [x] Same ⋮ check in inventory, suppliers, recipe-book.
- [x] Edit from ⋮ → menu closes, edit modal centered, page dimmed (equipment + suppliers).
- [x] Metadata manager: tap a chip → menu next to it, Edit/Delete work, closes after.
- [x] Desktop 1280: row action buttons inline; hover unchanged.
- [x] Open a ⋮ menu and scroll → menu follows its button.
- [x] Merged.

### Round 11 — PR #300 Plan 361 Lists quick fixes (`feat/night-1007-361-lists-quick-fixes`) — conflict: supplier-list.html
- [x] `/inventory/list` (+ recipe-book, suppliers, equipment): select 2 rows → bulk edit → "שנה שדה" + value list fully visible over the table.
- [x] Suppliers desktop 1280: rows line up under headers; header "מינימום הזמנה"; cells "₪500" or "—".
- [x] Suppliers phone 360: name, carousel (first slide מינימום הזמנה), actions, select — no overlap. Empty search → "לא נמצאו ספקים תואמים".
- [x] Merged.

### Round 12 — PR #294 Plan 345 Filters collapsed on mobile (`feat/night-1007-345-filters-collapsed-mobile`) — conflict: supplier-list.ts
- [x] Phone ≤1023 (360): filters on `/inventory/list`, `/recipe-book`, suppliers, `/inventory/equipment` → only category headers. Tap → opens. Select a value, leave and come back → that category open with count badge.
- [x] Desktop 1280: panels as before (all open; recipe-book Date collapsed).
- [x] Merged.

### Round 13 — PR #304 Plan 342 Form checkboxes → chips (`feat/night-1007-342-form-checkboxes-to-chips`) — conflicts: equipment-form/list html, supplier-form html+scss (your 341 landed)
- [x] Supplier add/edit page: delivery days are chips; save → reopen → same days.
- [x] Equipment form + list inline edit: "מתכלה" chip toggles and persists.
- [x] Venue form: "פעיל" chip persists.
- [x] Product form: special price chip shows/hides the override input; persists.
- [x] Quick-add product: allergens chips. Quick-edit panel: supplier chips. Metadata add label: auto-trigger chips.
- [x] Phone 360: chip groups wrap, no overflow.
- [x] Merged.

### Round 14 — PR #306 Plan 368 Product form responsive (`feat/night-1007-368-product-form-responsive`) — conflict: product-form.scss
- [x] Phone 360 + 414: `/inventory/add` and edit → one column, buttons wrap (save first), purchase-option rows stacked, special-price + allergens usable, **no sideways scroll**.
- [x] Tablet ~800: 2 columns; allergens / waste-yield span the full row; product with 2 purchase options → each in 2 lines, delete at the end of line 2.
- [x] Desktop 1280: same as before.
- [x] Merged.

### Round 15 — PR #308 Plan 344 Menu export top sheet (`feat/night-1007-344-menu-export-top-sheet`) — conflict: dictionary.json
- [x] Phone `/menu-intelligence`: FAB → "צ׳קליסט והדפסות" → sheet slides down → tap outside → away. Escape closes on desktop.
- [x] צ׳קליסט → לפי מנה → view → preview readable at 360 portrait, no page-level sideways overflow; close / print / Excel visible.
- [x] Shopping list + "הכל" view, export, print → as before.
- [x] Save pill visible + works; Ctrl+P hides pill and sheet.
- [x] (Old FAB label may show until the cached dictionary refreshes — clear localStorage if so.)
- [x] Merged.

### Round 16 — PR #311 Plan 352 Page header part 1 — chain top, contains #309 Plan 349 + #310 Plan 350 (`feat/night-1007-352-page-header-list-shell`)
Agent: rebase #309 onto main (conflicts: equipment/inventory/recipe-book/supplier list html + supplier-list scss/ts), then #310 onto #309, then #311 onto #310; retarget #311 to `main`; serve #311. `approve` merges #309 → #310 → #311.
Plan 349 checks:
- [x] Phone 360 `/recipe-book`: swipe a carousel cell or tap a header arrow → header + all rows move together; dots follow; values not cut off; header title readable with round arrows above it; carousel cells carry the row's color (incl. inventory invalid/incomplete tints).
- [x] Same in `/inventory/list`, suppliers, `/inventory/equipment`.
- [x] Vertical scroll over a carousel cell still scrolls the page.
- [x] 768 + desktop: carousel hidden, columns as before.
Plan 350 checks:
- [x] Phone 360 RTL `/dashboard?tab=metadata` jump-nav → arrow only on the side with more tabs; first and last tab reachable.
- [x] Dashboard / recipes / menus tab-chip rows → scroll + arrows only on overflow; first chip reachable.
- [x] Menu builder dish row data strip swipes and snaps; inline editing still works.
- [x] Desktop 1280: tab chips centered, no arrows; mouse wheel scrolls an overflowing strip sideways.
Plan 352 checks:
- [x] Phone 360: inventory, recipe book, suppliers, equipment → title right with count pill, filter + actions left, search full-width below. Two rows, nothing centered.
- [x] 768: two rows or one if it fits. Desktop 1280: one row — title + count, search middle, filter + add at the end.
- [x] Change a filter → count pill updates.
- [x] Merged (#309 → #310 → #311).

### Round 17 — PR #313 Plan 346 Sticky table top (`feat/night-1007-346-sticky-table-header-pagination-top`) — rebase onto main after round 16, retarget to `main`
- [x] Phone 360 + tablet 800 `/inventory/list`: scroll → pagination bar + column names pinned at top; "next page" from the top jumps to the first row. Same `/recipe-book`.
- [x] Desktop 1280: pagination at the top of the table, header pinned while the body scrolls.
- [x] Suppliers + equipment: header pinned, no empty strip above.
- [x] Phone: carousel header arrows (349) not clipped at the table's top edge.
- [x] Merged.

### Round 18 — PR #312 Plan 353 Page header part 2 (`feat/night-1007-353-page-header-part2`) — rebase onto main after round 17, retarget to `main`
- [ ] Desktop 1280: `/venues`, `/menu-library`, `/dashboard` (title + subtitle), `/dashboard?tab=metadata` (metadata title, not "לוח בקרה"), `/trash` → same title row as inventory.
- [ ] Phone 360: each ≤ 2 rows; dashboard subtitle hidden.
- [ ] No back buttons on venues, trash, dashboard tabs; "לוח בקרה" chip returns (round 8 merged).
- [-] Not merged: PR #312 closed 2026-10-08 without merging; plan 353 stays open in the ledger for a fresh branch.

## Done-when
- [auto] Every one of the 20 PRs is MERGED or CLOSED on GitHub (`gh pr list --state open` shows no `[night 10-07]` PR except none).
- [auto] `main` builds: `npx ng build` exit 0; `npx ng test --watch=false` all pass.
- [human] Every round above has its checks ticked by the Human (or the PR was rejected with a reason).
- [auto] wt-1 servers stopped and `/remote` is off (`node scripts/remote-port.mjs status` → off).

## Open after this plan
- `useResponsivePanelState` leaks its media-query listener (found in 345) — tech-debt line.
- `npm run lint:no-native-select` fails on `main` (`ai-product-modal`) — pre-existing.
- Plan 370 A4 eval script if not done in round 6. Plan 341 P1 route guard (needs escalation). Plan 344 P2.
- Report branch `report/night-2026-10-07` can be deleted once this plan is done.
