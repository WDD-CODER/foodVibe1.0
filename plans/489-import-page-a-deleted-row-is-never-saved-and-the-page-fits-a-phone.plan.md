# Plan 489 — Import page: a deleted row is never saved, and the page fits a phone

Status: active
Track: code
Snapshot: ea6af7b02e8012a812933a795eb15c7bf9dcd81c

## Problem Statement
QA report 2026-10-22 (`docs/mvp/qa-report-2026-10-22.md`), Dandan's words:
- Item 11 (check 35): "`/inventory/import` preview. Deleting a row and changing another row's unit before saving:
  the deleted row is still saved. A deleted row must be removed from the payload sent to the save endpoint."
- Item 12 (check 37): "`/inventory/import` layout is broken and not centred; containers overflow horizontally;
  text/inputs cut off. No horizontal overflow, centred main container, inputs and table fit the screen."

As a chef, I want a row I trash in the import preview to never become a product, and the import page to fit my
phone, so that I can import a supplier list from WhatsApp without cleaning up products afterwards or fighting the
layout.

The original cards (`docs/mvp/final-report.md:375-391`): 35 = paste `גזר 3 לק"ג` and `פטרוזיליה 2 ליחידה`, «נתח», trash
«גזר», set «פטרוזיליה» unit to «גרם», «שמור הכל» → «1 נוצרו, 0 עודכנו, 1 דולגו», «גזר» does not exist. 37 = at
≤ 620 px, paste box, supplier picker and preview fit; only the preview may scroll inside its own box.

Verified in code at `ea6af7b0` (plan 478 already changed this component's status logic; built on it, not undone):

**Item 11 — the code drops a deleted row; a real save-in-flight hole and a polluted validation database remain**
- `src/app/pages/inventory/components/product-import/product-import.component.ts:266-269` `removeRow` filters the row
  out of `rows_` and counts it in `deleted_`. `saveAll` (ts:228-264) builds the payload from `view_()` (ts:233), which
  is derived from `rows_` (ts:134-151), so a row deleted **before** «שמור הכל» is not sent. `matchWithAi_`
  (ts:356-362) updates the current rows only and cannot bring a deleted row back. The server writes only the posted
  rows (`server/routes/product-import.js:68-124`). The existing spec `product-import.component.spec.ts:131-149`
  proves delete → save for three rows, but not the check-35 sequence (delete while the AI step is still
  «בודק…», then change another row's unit, then save).
- Real hole: the trash button (html:265-273) and every row input (html:146-237) stay enabled while the save request
  is in flight (`isSaving_`, ts:96). A row trashed after «שמור הכל» is pressed is already in the sent payload, so it
  IS created, yet the preview removes it and the summary counts it as skipped (`deleted_`, ts:246). That is exactly
  "the deleted row is still saved".
- Why check 35 most likely failed for Dandan: the validation database already held «גזר» and «פטרוזיליה» — the plan 465
  UI validation saved a receipt with «גזר 6» and «פטרוזיליה 4» on the same local app (`docs/mvp/runs/465.md:73`,
  `:92`: «2 נוצרו, 4 עודכנו», then «1 נוצרו, 0 עודכנו, 5 דולגו»). Both rows would then show «קיים במלאי», the unit of
  «פטרוזיליה» is read-only (html:162-163), and «גזר» stays in the inventory after the save because it existed before.
  Not provable from here (the local DB needs credentials from `.env`); Step 0 replays it with names checked absent.

**Item 12 — one hidden label widens the whole page on a phone**
- Root cause: html:133-135 puts `<span class="import-sr-only">` in the last header cell; scss:182-190 makes it
  `position: absolute` with no offsets. `.import-table-wrap` (scss:87-90) is the scroll box but not positioned, so the
  span's containing block is the `.c-glass-panel` preview (its `backdrop-filter`, `src/styles.scss:459-466`, makes it
  one). The span therefore escapes the scroll box at its static position — the far end of the 52 rem table
  (scss:92-98) — and widens the document: at 375×812 `scrollWidth` is 1042 vs 375 (`docs/mvp/runs/465.md:101`). The
  page then scrolls sideways and looks off-centre (RTL: the extra width is on the left).
- Inputs cut off: on a phone the sticky name cell is 14 rem wide (scss:118-127, 224 px of a 375 px screen) and covers
  the price / unit inputs as the table scrolls under it; every other input sits off-screen in a 52 rem table.
- The page-local `.import-sr-only` duplicates the global `.visually-hidden` engine (`src/styles.scss:1152-1164`).
- Also on this page (`docs/mvp/runs/465.md:80`, `:97`, still open): on a 1440×900 desktop the round «+» button
  (`.hero-fab-container`, fixed bottom corner, `src/app/core/components/hero-fab/hero-fab.component.scss:1-15`) covers
  «שמור הכל» at the bottom scroll and intercepts a real click — the page has no bottom space for it (scss:8-15).

## Goals & Success Criteria
- Primary: a trashed row never reaches the save request, at any moment; at phone width the import page has no
  sideways page scroll, is centred, and every input of every row is fully visible without scrolling sideways.
- Success:
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/pages/inventory/components/product-import/**/*.spec.ts'` → all SUCCESS, including the new specs: (a) check-35 sequence — two new rows, the AI step held open, trash row 1 while it shows «בודק…», let the AI answer, change row 2's unit to `gram` through the unit select, save → `apply` called once with exactly one row `{ name: <row 2>, baseUnit: 'gram' }`, summary skipped = server skipped + 1; (b) while saving, every `import-delete` button and row input is disabled, and a `removeRow` call during the save changes neither `rows_` nor `deleted_`; (c) the header delete label uses `visually-hidden` and no element has `import-sr-only`.
  - [ ] [auto] `grep -rn "import-sr-only" src/app` → no output.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or only Gemini 5xx, listed as environment).
  - [ ] [human] Check 35 replay (desktop 1440 px, owner): see Done-when card A.
  - [ ] [human] Check 37 replay (phone 375 px, owner): see Done-when card B.
  - [ ] [human] Passed checks 33, 34 still pass on desktop: see Done-when card C.

## Execution Mode
- Parallel: yes with every 486–496 plan except 482. Plan 482's broad `src/app/**/*.html` scope may add
  `appSelectOnFocus` to the two number inputs in `product-import.component.html`; if 482 merged first, keep its
  attribute when you merge `origin/mvp-qa-fixes` in. No other plan writes these four files.
- Isolated DB: no (local MongoDB; the cards use product names checked absent first).

## Execution Notes
- Base branch `origin/mvp-qa-fixes`; run mode `docs/mvp/run-mode-qa-fixes.md` (then `run-mode-review-fixes.md`,
  `run-mode-review.md`). Slots wt-1 / wt-2 only; never wt-3 / 4203 / 3003.
- Planner decision — phone layout: at ≤ 768 px (`$break-mobile`, the breakpoint this file already uses) each preview
  row becomes a stacked card (name full width on top, then unit · price, purchase unit, category, status chips, trash),
  each cell labelled by its column name, and the table no longer needs sideways scroll. Why: Dandan asked that "inputs
  and table fit the screen"; a 52 rem table behind a 14 rem sticky name column cannot do that at 375 px. Desktop
  (> 768 px) keeps today's table exactly (passed checks 33, 34).
- Cell labels come from existing keys (`name`, `unit`, `price`, `import_col_purchase_unit`, `category`): an
  `[attr.data-label]="'<key>' | translatePipe"` on each `<td>` and `td::before { content: attr(data-label) }` in the
  phone media query. No new dictionary key, no new icon.
- CSS trap (`docs/mvp/run-mode-review-fixes.md`): `src/styles.scss` resets `button`/`input`/`select`/`textarea` outside
  any layer, and this file's rules are inside `@layer components.product-import`. Style only classes on wrappers/cells
  (`.import-table td`, `.import-row`), never a raw native element, and check the rendered result in the browser.
  Load the cssLayer skill before the SCSS edit (logical properties, five-group property order).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, `.claude/sessions/**`, `.worktree-*`.

```scope
src/app/pages/inventory/components/product-import/product-import.component.ts
src/app/pages/inventory/components/product-import/product-import.component.html
src/app/pages/inventory/components/product-import/product-import.component.scss
src/app/pages/inventory/components/product-import/product-import.component.spec.ts
docs/mvp/runs/489.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions` in `docs/mvp/runs/489.md`, add it to
the scope block, continue (run mode: you work alone). Never touch `server/routes/product-import.js`: Step 0 must show
a server defect first, and then the fix is one line in that route plus one test in
`server/test/product-import-route.test.js`, both logged under `## Decisions`.

## Architecture Impact
- INV-none: preserves — the scope is one page component (template, styles, class, spec) and its run file; no
  permission, tenancy, cross-document, schema, taxonomy or AI-call path changes. The import still saves through the
  one-request `POST /api/v1/product-import/apply` (INV-3), owner-only by `assertCan('editMoney')` (INV-1), both
  untouched.

## Backend Impact
- None. Same endpoint, same payload shape; the client only sends fewer rows in the save-in-flight case.
- Auth / validation / security surface: none new. Data / migration: none.

## Reuse Check
- Hidden «מחיקה» header label — family: engine-classes — rung: 1 — why: the global `.visually-hidden` engine in `src/styles.scss` replaces the page-local `.import-sr-only` copy
- Stacked phone rows of the preview table — family: none — rung: 4 — why: no new piece; page-local SCSS on the existing table (no shared responsive editable-table exists; list-shell's cards layout is for entity lists, not an editable preview)

## Step 0 — Reality Check
1. Find on `origin/mvp-qa-fixes`: `removeRow`, `saveAll`, `view_`, `canSave_`, `isSaving_`, `matchWithAi_`,
   `pendingIds_`, the `import-sr-only` span, `.import-table-wrap`, `.visually-hidden` in `src/styles.scss`. Print
   `ok` / `conflict: <what>` per name in `docs/mvp/runs/489.md`.
2. Phone measure (slot app, owner, 375×812, gstack `browse`): paste `עגבנייה 5.9 לק"ג` and `שמנת 32% 1 ליטר 12`,
   «נתח», wait for «בודק מול המלאי…» to go. Record `document.documentElement.scrollWidth` and every element whose
   `getBoundingClientRect()` left < 0 or right > 375. Expected: 1042-ish and the `import-sr-only` spans. Any other
   offender goes on the fix list of sub-task L2.
3. Check-35 replay (slot app, owner, 1440×900): first search `/inventory/list` for `גזר` and `פטרוזיליה` and record
   whether each exists (if both exist, the "pre-existing products" cause below is confirmed without the database).
   Then search the names of the **name pool** (Done-when, in order) and keep the first two with no result. Paste `<first> 3 לק"ג` and `<second> 2 ליחידה`, «נתח»; trash row 1
   while «בודק…» still shows (or right after if the AI is fast); set row 2's unit to «גרם»; «שמור הכל». Record the
   request body of `POST /api/v1/product-import/apply` (browse network log) and the summary. Expected: one row, the
   second name, `baseUnit: 'gram'`. If the body holds the trashed row, that is a new root cause: find it, fix it in
   the four component files, add a spec that fails before the fix, and log it under `## Decisions`.

## Atomic Sub-tasks
- [ ] S0: Measure the phone overflow and replay check 35 with fresh names before changing code — see Step 0 — docs/mvp/runs/489.md
- [ ] D1: Lock trash and row boxes during a save, so a row trashed mid-save is never quietly created — `[disabled]="isSaving_()"` on `import-delete`, `import-name`, `import-price`, `import-purchase-unit`, `import-purchase-qty`, and `[disabled]` on the unit / category `app-custom-select` (CVA `setDisabledState`); `removeRow` and `updateRow` return early when `isSaving_()` — product-import.component.html, product-import.component.ts
- [ ] D2: Prove in tests that a trashed row never reaches the save request, in the check-35 order — new `it(...)` blocks (a) and (b) from Success; names not in the fixture's `PRODUCTS` (fixture already has «פטרוזיליה» as an existing product, so use e.g. «גזר» and «כרפס»); AI step held open with a deferred `aiAnswer` like the plan 478 spec (spec:272) — product-import.component.spec.ts
- [ ] L1: Stop the hidden delete label from making the phone page wider than the screen — replace `class="import-sr-only"` with `class="visually-hidden"` (html:134), delete `.import-sr-only` (scss:182-190), add `position: relative` to `.import-table-wrap` (load-bearing: the global `.visually-hidden`, `src/styles.scss:1152`, is also `position: absolute` with no offsets, so without a positioned scroll box it escapes exactly like the old class); spec (c) — product-import.component.html, product-import.component.scss, product-import.component.spec.ts
- [ ] L2: Show each preview row as a labelled card on phones so every box fits the screen — inside `@media (max-width: $break-mobile)`: table, tbody, tr, td to block/grid, `thead` visually hidden, `min-inline-size: 0` instead of 52 rem, name cell full width and not sticky, `.import-num` / `.import-purchase__unit` fill their cell, flags wrap, trash at the row end; `.import-table-wrap` gets `overflow: visible` in the phone query (nothing scrolls sideways any more, and the unit / category list — `.c-dropdown`, `position: absolute` inside the select — would otherwise be clipped inside the box on the last card); `[attr.data-label]` on each `<td>` with existing keys and `td::before` label; fix any other offender Step 0 found; desktop rules unchanged — product-import.component.html, product-import.component.scss
- [ ] L3: Give the page bottom room so the round add button never covers the save button — `padding-block-end` on `.product-import` of at least the FAB's 3.5 rem + 0.75 rem offset + one spacing step, all widths. In scope for item 12: on a phone «שמור הכל» is full width (scss:203-205) and its end corner sits under the fixed FAB at the bottom scroll ("inputs cut off"); one rule at all widths is smaller than a phone-only copy and also clears the desktop overlap from `docs/mvp/runs/465.md:97` — product-import.component.scss
- [ ] V1: Run build, tests and checks, then write the validation cards and decisions in the run file — cards A, A2, B, C under Human checks — docs/mvp/runs/489.md

## Done-when (Human cards, for the UI validator)
Owner = the local owner in `C:\coding projects\Cursor\mvp-review-evidence\accounts.json`. Each «נתח» uses one real
Gemini call; a 5xx from Gemini is environment, retry twice, then `unsure`.

**Name pool** (every card, Step 0 and every validation round take from it): `כרפס`, `שמיר`, `נענע`, `טרגון`, `חזרת`,
`מרווה`, `אורגנו`, `רוזמרין`, `קולרבי`, `שומר`, `צנונית`, `במיה`, `מנגולד`, `ארטישוק`, `לוף`, `ריבס`. "A fresh name" =
search the pool in this order in `/inventory/list` and take the next one with no result that this card has not used
yet. Each full round creates about 5 of them (A: 1, A2: 3, C: 1), so the pool lasts three rounds; the worker logs the
names it used in `docs/mvp/runs/489.md`. Cards only add products; nothing in the shared accounts is deleted.

- [ ] [human] **A — A trashed row is never saved (check 35 replay)** · page `/inventory/import` · desktop 1440×900 ·
  owner · WHY: the report's names «גזר» and «פטרוזיליה» already exist in this test inventory (saved by the plan 465
  receipt test), so a trashed «גזר» row still leaves the old «גזר» in the list; the card replays the same steps with
  names that are not there. SETUP: take two fresh names from the pool as NAME1 and NAME2. DO: paste two lines `NAME1 3 לק"ג` and `NAME2 2 ליחידה`, press «נתח», trash the NAME1 row
  as soon as it appears (while «בודק…» shows if possible), wait until «בודק מול המלאי…» is gone, change NAME2's unit
  («יחידה») to «גרם», press «שמור הכל». SEE ✓ the message «1 נוצרו, 0 עודכנו, 1 דולגו»; in `/inventory/list` NAME2
  exists with unit גרם and a search for NAME1 finds nothing. FAIL ✗ NAME1 is in the list, the message says 2 created
  or 0 skipped, or NAME2's unit is not גרם.
- [ ] [human] **A2 — Trash is locked while saving** · same page, desktop · owner · SETUP: take three fresh names from the pool; paste
  them as three lines `<name> 4 לק"ג`, «נתח», wait for «בודק…» to go. DO: press «שמור הכל» and right away try to click
  a row's trash icon. SEE ✓ while saving the trash icons and the row boxes are greyed out and do nothing (if the save
  ends before you can click, that is fine); the message reads «3 נוצרו, 0 עודכנו, 0 דולגו» and `/inventory/list`
  finds all three names. FAIL ✗ a row disappears during the save, or the message counts a skipped row while all three
  names are in the inventory.
- [ ] [human] **B — The import page fits a phone (check 37 replay)** · page `/inventory/import` · phone 375×812 · owner ·
  DO: paste `עגבנייה 5.9 לק"ג` and `שמנת 32% 1 ליטר 12`, press «נתח», wait until «בודק מול המלאי…» is gone, then try to
  swipe the page sideways. SEE ✓ the page does not move sideways (page width stays 375); the header, paste box, supplier
  picker, the three buttons and «שמור הכל» are centred with equal side margins; each row is a card with every box
  (name, unit, price, purchase unit and amount, category) fully visible and labelled; tapping the price opens the
  number keyboard and the unit box of the last card opens its whole list (not cut off); at the bottom of the page
  «שמור הכל» is fully clear of the round «+» button. FAIL ✗ the page scrolls sideways, a box or text is cut off at an
  edge, a list opens cut off, or a price/unit cannot be edited.
- [ ] [human] **C — Desktop import unchanged (passed checks 33, 34)** · page `/inventory/import` · desktop 1440×900 ·
  owner · SETUP: a supplier «ירקן» exists. DO: paste `NAME3 5.9 לק"ג` (NAME3 = a fresh name from the pool), pick «ירקן»,
  «נתח», «שמור הכל»; then paste `NAME3 6.2 לק"ג`, keep «ירקן», «נתח», «שמור הכל». SEE ✓ first the preview is a table
  with columns שם · יחידה · מחיר · יחידת רכש · קטגוריה, the row «חדש», message «1 נוצרו, 0 עודכנו, 0 דולגו»; second
  the row «קיים – עדכן מחיר» with name and unit not editable, «0 נוצרו, 1 עודכנו, 0 דולגו»; «שמור הכל» is clickable
  at the bottom of the page (not under the round «+» button). FAIL ✗ cards instead of a table on desktop, a different
  message, or the click on «שמור הכל» opens the «+» menu.

## Out of Scope
- The AI linking a new name to a similar existing product (e.g. «עגבניה ניסיון» → «עגבנייה», review check 6) and the
  matched-row unit shown from the stored product (`docs/mvp/runs/465.md` observation 3).
- Busy feedback on the photo buttons while matching runs (`docs/mvp/runs/465.md` observation 4).
- Any change to the server import route, the product schema, the inventory list or the «+» button itself.
- Cleaning «גזר» / «פטרוזיליה» out of the local validation database (Dandan's data; the cards use fresh names).

## Architect + PM review (always)

```
ARCHITECT + PM REVIEW
no gaps
```

- Architect: Architecture Impact filled (no invariant `Touches` glob reaches the scope; INV-1/INV-3 paths named as
  untouched). Every named file and symbol exists at `ea6af7b0` (`removeRow`, `saveAll`, `view_`, `canSave_`,
  `isSaving_`, `matchWithAi_`, `pendingIds_`, `.import-sr-only`, `.import-table-wrap`, `.visually-hidden`,
  `$break-mobile`, `.hero-fab-container`); `docs/mvp/runs/489.md` is new. Design follows the existing component (signals,
  `inject()`, OnPush, CVA disabled state on `app-custom-select`), styles stay inside the component's layer with
  logical properties; the one new pattern (stacked table rows on phones) is named and justified in Execution Notes.
  Scope = the four component files + the run file, which is every file the sub-tasks write.
- PM: both report items have a root cause with file:line (item 11: save-in-flight hole + pre-existing products in the
  validation DB, item 12: the absolute hidden label escaping the scroll box). Success criteria are testable, every
  Done-when is tagged, each `[human]` card replays the broken scenario with fresh names, page path, role, width, one
  action chain and exact on-screen text. Out of Scope written. Backend/API, auth, security surface and data/migration
  named as none. Smallest version: no server change, no new component, no new key or icon.
- Plan checks (`docs/agent/plan-checks.md`): log-query `[auto]` present; `## Reuse Check` present; no hotspot write; RTL
  with logical properties; labels through `translatePipe` with existing keys; no new Lucide icon; no new persisted data.
- Passed list kept: 32 (owner-only «+» entry, list page untouched), 33 and 34 (desktop table and messages unchanged,
  card C), 36 (the `allowed_()` no-permission branch, html:4-5, untouched). Plan 478's «בודק…» status logic is built on,
  not changed.

### Independent review (Architect + PM, 2026-10-24)

```
ARCHITECT + PM REVIEW
gaps fixed in place:
- Done-when: the 5-name pool ran out (Step 0 2 + card A 2 + A2 3 + C 1 per round) → 16-name pool, "fresh name" rule, names logged in the run file
- Card A: WHY added — «גזר»/«פטרוזיליה» already exist in the test inventory, so Dandan does not replay with them and fail
- Step 0.3: also searches «גזר»/«פטרוזיליה» to confirm the pre-existing-products cause without the database
- L1: `.visually-hidden` is also absolute with no offsets → `position: relative` on the scroll box is load-bearing (stated)
- L2: `overflow: visible` on the wrap at phone width, else the absolute `.c-dropdown` of the last card is clipped; card B checks it
- L3: tied to item 12 (full-width phone save button under the FAB); card B checks it
```

- Verified at `ea6af7b0`: ts:228-269 (payload from `view_()` read after `resolveCategories_`, so only a mid-request
  trash is sent), html:133-135 / 146-273, scss:87-98 / 118-127 / 182-190, `src/styles.scss:459-466` (backdrop-filter)
  and `:1152-1164`, `server/routes/product-import.js:68-124` (writes only posted rows), `custom-select`
  `setDisabledState` (ts:195), spec fixture `PRODUCTS` has «פטרוזיליה», dictionary keys `name`, `unit`, `price`,
  `import_col_purchase_unit`, `category`, `delete` exist. Scope = four component files + run file, complete and minimal.
- Roles: unchanged; import stays owner-only server-side (`assertCan('editMoney')`), check 36 untouched.
