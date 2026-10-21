# MVP review handoff — validation cards 1–90 (2026-10-21)

Input for the Planner. The Human walked validation cards 1–90 of `docs/mvp/final-report.md` §6 on the `mvp` branch
(`cbcea5de`) and reported bugs, wanted changes and questions. This file groups every point by page or feature and
merges overlapping points into one fix each.

**How to use it**
- Base every plan on `mvp`, and merge back into `mvp` only. `mvp` is **not** merged into `main` yet; no plan from this file
  touches `main`.
- Suggested split: one plan per section (A–J). Section A (shared components) goes first, because B, D and F use
  those components.
- Each fix has an id (`A1`, `B2`, …). Its "Source" names the validation card (`#n`) it came from.
- Tags: **BUG** (broken), **CHANGE** (Human wants it), **DECIDE** (the Human must answer before planning),
  **INV** (touches an architecture invariant: ask in INV form, ADR if approved), **INFO** (no work).
- "Cause" lines come from reading code, not from running the app, unless they say "verified". Nothing in this file
  was reproduced in a browser.
- No code was changed in the review session.

## Decisions the Human still owes (answer before the matching plan)

| Id | Question | Blocks |
| --- | --- | --- |
| D1 | Sign-up: keep the business name required, or fill a default «העסק של [username]» that can be renamed later? | H4 |
| D2 | Purchase unit: once a unit is chosen, is its quantity required? (Without it the unit can't be priced.) | B2 |
| D3 | Wording of the new-unit question (proposal in B3). | B3 |
| D4 | Inventory badges: should price/unit gaps look different from supplier/allergen/category gaps? | C1 |
| D5 | Per-supplier price: which price does a recipe cost use (cheapest, preferred supplier, last bought)? | B5 |
| D6 | Portions rounding: always whole numbers rounded up? What did "minimum 10 after the point" mean? | F4 |
| D7 | Keep the separate «הדבק מתכון» entry or only the tab inside the AI recipe window? | E1 |
| D8 | Unit rename: rename everywhere (update every product/recipe using it) or only the display label? | G5 |
| D9 | Setup step 1: count all products, or only products with a price? | H3 |
| D10 | Cooks see recipes only in Cook View (INV / C-PERM change). | I1 |
| D11 | Staff see events by stage, set by the owner (INV / C-PERM change). | I2 |

## A. Shared UI components (app-wide)

**A1. Dropdown items often ignore a mouse click — BUG**
- Symptom: keyboard and scrolling work; clicking an option with the mouse often does nothing. All dropdowns.
- Cause (suspected): `src/app/shared/custom-select/custom-select.component.ts` closes the list 120 ms after the trigger
  loses focus (`onTriggerBlur`, ~line 287), while options select on `(click)`. A press longer than 120 ms closes the
  list before the click lands. Fix direction: select on `pointerdown`/`mousedown` with `preventDefault`. Reproduce first.
- Follow the add-option rule in `docs/agent/standards-domain.md` (keyboard included).

**A2. Dropdown lists open behind the next container — BUG**
- Symptom: on the import page the supplier list is hidden behind the preview panel below it. Wanted: every dropdown
  list layers above all containers.
- Likely stacking context / `overflow` clipping of `custom-select` / `app-scrollable-dropdown` inside glass panels.

**A3. Space selects the first suggestion — BUG**
- Symptom: in the menu editor's dish-name search, pressing Space picks the first option instead of typing a space.
  Space must type; only Enter or a click selects.
- Probably the `custom-select` keydown handler, so check every type-to-filter dropdown.

**A4. Popovers and modals open partly off-screen — BUG** (Source #46)
- Symptom: the «חלקי» popover (`src/app/shared/partial-cost-badge/`) opened half outside the left edge.
- Wanted: the same viewport-aware placement the nutrition popover uses, for every floating panel. Consider one shared
  positioning helper.

**A5. Quantity inputs select their whole value on focus — CHANGE**
- Tapping a number box (coefficients «מקדמים», unit quantity, prices, …) selects the whole value, so typing replaces
  it. Today the caret lands where tapped and the new digits are added beside the old ones; worst on phones.
- Related: number boxes should start empty, not `0` (the new-unit modal starts at `0`).

**A6. Text areas grow with their content — CHANGE** (Source #37)
- Paste boxes grow to fit their text on every screen size, with no inner scroll. Starts with the import paste box;
  apply to the other paste boxes (recipe paste, ingredient paste).

**A7. Dirty-form guard — CHANGE**
- A page with unsaved typed input asks for confirmation (confirm modal) before the user leaves. First users: the
  import page (D4) and the opening-details form if it stays a form the user is sent to (see H2).

**A8. Modal backdrop — BUG** (Source #56)
- Symptom (desktop, «פנייה חדשה» in the menu library): the backdrop covers only a grey rectangle and the page
  behind shifts. Wanted: page unchanged, fully blurred, modal on top. Check whether the shared modal shell or this
  form causes it.

## B. Product form — `/inventory/add`, `/inventory/edit/:id`

Code: `src/app/pages/inventory/components/product-form/` (growth-frozen file: plan needs to allow it or extract).

**B1. Purchase-unit row layout — BUG**
- Desktop: the middle «כמות נטו» box is too narrow; its placeholder is cut off.
- Phone: the three fields (unit, quantity, compare-to unit) have different widths and indents and too little gap;
  `=` and `:` squeezed at the edge. Wanted: aligned fields, proper gaps.
- Template: `product-form.component.html:101-205`.

**B2. Show quantity and compare-to unit only after a unit is chosen — CHANGE** (D2)
- An empty row shows only «בחר יחידה». After a unit is picked, or a new one is created and saved in the modal, the
  quantity and compare-to-unit fields appear.

**B3. New-unit modal — BUG + CHANGE** (Source #7, #42 area, D3)
- Tab acts like confirming the unit (verified by the Human); Tab must only move focus. Save only by the button or Enter.
- The question «כמה שוקלת {{unit}} אחת של {{name}}?» (key `unit_amount_for_product`) assumes weight; the base unit
  can be grams, liters or units. Proposal: «כמה {{base}} יש ב{{unit}} אחת של {{name}}?».
- The quantity starts at `0` (see A5).
- Code: `src/app/shared/unit-creator/unit-creator.component.ts`.

**B4. Existing product names — BUG + CHANGE**
- Symptom: a new product with the name of an existing one fails on save with a generic "fill the missing details"
  message, no field marked, nothing about the duplicate.
- Wanted: (1) the name box suggests existing products while typing (to open the existing one, or keep typing to make
  a variant); (2) a specific error on the name field: this name already exists as a product; (3) the generic
  message names the field(s). Check whether the server also refuses duplicates.

**B5. Price per supplier — CHANGE** (Source #50, D5)
- The data already holds one price per supplier (`Product.sources: { supplierId, price }[]`), but the form has one
  price box and copies it to every selected supplier on save (`product-form.component.ts:926-942`).
- Wanted: a price per selected supplier (cucumber 4 ₪ at one, 5 ₪ at another), shown in the list/tooltip too.
- Affects cost and the «לא סגור סופית» rule; needs D5.

## C. Inventory list — `/inventory/list`

**C1. One compact status instead of a pile of badges — CHANGE** (Source #9, D4)
- Keep the amber «לא סגור סופית» mark (Human: very good) and the filters.
- Today a row can show the unpriced chip, the ⚠ triangle (missing supplier/allergen/category), the red circle and
  low stock at once (`inventory-product-list.component.html:178-206`, independent `@if`s).
- Wanted: when the unpriced mark shows, no triangle. On desktop, one tooltip listing everything that is missing,
  price included. Short and precise, no icon pile.

## D. Product import — `/inventory/import` (plan 432)

**D1. Match lines to existing products, show what changes — BUG + CHANGE** (Source #34)
- On «קיים – עדכן מחיר» rows show the old price next to the new one.
- A misspelled name (e.g. «פטרוזיליה» with a typo) came in as «חדש». After the user corrected the name in the
  preview, the row froze (no longer editable) and still never said the product exists. Wanted: re-match the row
  whenever its name changes, switch it to «קיים – עדכן מחיר» with the old price, keep it editable.
- Use the same matcher as E2 (exact normalised name first, the AI step only for names without a match).

**D2. Messy price lists — BUG** (prompt quality)
- The parser must find product, price and unit whatever the order (price before or after the unit, unit on either
  side) and give a second purchase unit when the line has one. Example that failed: `עגבניה ניסיון 1 קילו 1 עוהל 50 שח`
  lost «1 עוהל». The first attempt with a deliberately messy text failed outright. Add messy lines as test
  fixtures for `PRICE_LIST_SYSTEM_PROMPT` (`server/routes/ai.js`, ~line 452).

**D3. Import from a receipt photo — CHANGE** (new feature)
- A photo/upload button (phone camera too) next to the paste box; the AI reads name, quantity and price per line and
  fills the same preview. Handle line total vs unit price. Same quota and ≤200 rows; AI only via
  `server/routes/ai.js` (INV-6). `POST /api/v1/ai/generate-product-from-image` shows how an image is sent but makes
  one product, not a list.

**D4. Page behaviour — CHANGE** (Source #37)
- The paste box grows with its text (A6). Leaving with text in the box or an unsaved preview asks first (A7).

**INFO:** «ייבוא מוצרים» is only in the flame («+») menu of `/inventory/list`, owner only (Source #32).

## E. Recipe book and recipe builder — `/recipe-book`, `/recipe-builder`

**E1. «הדבק מתכון» vs «צור מתכון עם AI» — DECIDE** (Source #38, D7)
- Human asked what «הדבק מתכון» adds. Both open the same AI recipe window: «הדבק מתכון» opens it on the paste tab,
  which copies the chef's own recipe text as-is (no AI invention, no few-shot); the AI entry writes a new recipe from
  a description. The overlap is the entry point only. Options: drop the separate menu entry and keep the tab, or
  keep both with clearer labels.

**E2. «הדבק מצרכים» must reuse existing products — BUG** (Source #43, plan 439)
- Salt linked correctly; «עגבניות» and «פטרוזיליה» were treated as new products although they exist.
- Wanted: for every pasted line, find the existing inventory product (typos, spelling variants, singular/plural)
  and use it, with its unit and the amount; never create a duplicate. Exact normalised match first, an AI step only
  for the rest; send the model names and units only; AI via `server/routes/ai.js` (INV-6). Share the matcher with D1.

**E3. «חלקי» popover rows that are not unpriced products — BUG + CHANGE** (Source #46)
- Rows have kinds `unpriced` | `unlinked` | `deleted` (`src/app/core/engine/event-plan.types.ts:61`). Only `unpriced`
  gets a price box; the others show «פתח מתכון», which goes to the first recipe using the item
  (`partial-cost-badge.component.ts:153-157`). The label reads as if the item were a recipe, and when the user is
  already in that recipe the popover just closes.
- Wanted: act by what the item is. `unlinked` → open the quick-create product modal in place (create or link the
  product without leaving the page); `deleted` → a clear "deleted" message. Placement: A4.

## F. Menu library and menu editor — `/menu-library`, `/menu-intelligence/:id`

**F1. New inquiry form — BUG + CHANGE** (Source #56, #57)
- Desktop backdrop: A8.
- The flame menu shows two "add" actions with the same file-plus icon (add menu, new inquiry); give them different
  icons.
- Phone date field: no typing into the mm / dd / yyyy parts; only the calendar icon opens a picker. The field shows
  `mm/dd/yyyy` (US order) in a Hebrew app; check whether dd/mm/yyyy is wanted.

**F2. Stage «מקדמה שולמה» asks for the payment — CHANGE** (Source #62)
- Moving an event to «מקדמה שולמה» asks only for a date. Wanted: the date the deposit was paid and the amount paid.

**F3. Stage bar on a phone in a carousel — CHANGE** (Source #63)
- The stage bar on a phone should be a carousel like the metadata section chips (see G3, same behaviour).

**F4. Portions show `110.00000000000001` — BUG** (D6)
- «מנות לאירוע» shows the raw float of 1.1 × 100. Wanted: 110. The Human wants rounding up; clean the float first
  (round to a few decimals), then round up, otherwise 110.00000000000001 becomes 111.

**F5. Dish info icon unreachable on a phone — BUG** (Source #70)
- On a phone the ₪0 badge overlaps the dish name and the ⓘ icon can't be reached.

**F6. «חלקי» stays on other totals after the price is fixed — BUG?** (Source #88)
- After pricing the missing product from the chip, «חלקי» left the total cost but stayed on revenue, profit per
  guest, profit % and minimum price per guest. Check first: those may be partial because the customer price is not
  set (₪0.00). If so, the behaviour is right but the wording must say why; otherwise all totals must refresh.

## G. Metadata manager — `/dashboard?tab=metadata`

**G1. Small phones — BUG**
- Fine down to 430 px. Below (375 px) there is no side padding and items look uneven.

**G2. Rename needs Save and Cancel buttons — CHANGE**
- Renaming a menu/event type saves only on Enter or click-outside; on a phone this is wrong. Add explicit Save and
  Cancel buttons. Apply to every inline rename in the metadata screen (`coefficient-manager/`, stations, …).

**G3. Section chips: jump, centre, animate — CHANGE**
- Tapping a section chip scrolls that section to the top and slides the chip to the centre of the carousel, animated.

**G4. Manage-users card — BUG**
- The trash icon floats over the email line. Put it at the bottom of the card with room for its hover animation
  inside the card. `metadata-manager/components/user-management/`.

**G5. Edit a unit's name — CHANGE** (D8)
- Units can only be removed today; the Human wants to fix typos. Check first how units are referenced (purchase
  options keep `unitSymbol`): a rename must update every reference or only change a display label.

## H. Settings, onboarding, dashboard — `/settings`, `/dashboard`

**H1. Settings layout — BUG** (Source #23)
- Desktop: tabs and form card sit in the right half, the left half is empty; centre them on every tab.
- Phone (Team list): the chips should be centred.

**H2. Opening details: banner instead of a redirect — CHANGE** (Source #28–31; replaces the redirect of plan 431)
- Today an owner without opening details is sent from the dashboard to `/settings?tab=baseline&first=1` on every
  visit to the dashboard overview, until they save or press «דלג» (`setup-checklist-card.component.ts:98-103`; the
  guard is per component instance). Owners trying to reach metadata get bounced. «דלג» shows only with `first=1`.
- Wanted (Human's preferred option): no redirect. While the opening details are missing, the dashboard's business
  performance area (plan 447, which compares against them) is replaced by a clear banner asking to fill in the
  business details; tapping it opens Settings → «פרטי פתיחה». The skip stays available.
- Fallback option the Human also named: keep the form but make it a dirty form (A7) that asks to save or skip.

**H3. Setup card counter — BUG + CHANGE** (Source #30, D9)
- After adding a product the card still says the same number is missing. The counter must drop for every product,
  wherever it was created (product form, or a product created from the recipe builder).
- Lower the goal from 10 to 5: `PRICED_PRODUCTS_GOAL` (`setup-checklist-card.component.ts:20`), the text
  `setup_step_products`, the server setup-status, plan 431 fixtures.
- Suspected cause: the status loads once per card (`statusRequested_`) and is not refreshed; products created
  inline may also have no price, so they don't count.

**H4. Sign-up business name — DECIDE** (D1)
- `server/routes/auth.js:171-172` refuses sign-up without a business name. Every account owns one business (the
  tenant), so "optional" means a default name that can be renamed in Settings.

**INFO (Source #31):** staff never see Settings and get no redirect — by design (plans 427/428). Keep.

## I. Permissions — both need the INV question first

**I1. Cooks open recipes in Cook View only — INV + CHANGE** (Source #51, D10)
- A cook tapping a recipe lands in Cook View and cannot open the recipe builder. Today staff may create anything
  and edit what they created (plan 427, C-PERM, `src/app/core/services/permission.service.ts`), so this changes the
  contract.

**I2. Owner chooses which event stages staff see — INV + CHANGE** (D11)
- Today cooks don't see an event at the first stage (inquiry) and see it only once it moves on. Wanted: an owner
  setting (Settings or metadata): staff see all stages / only active / only closed.

## J. Exports and print — EPIC (dedicated session with the Human)

- Previews and print options look good, except «print the whole recipe», which still looks bad.
- Excel export: categories come out in English instead of Hebrew; the Excel output is weak across the board.
- The Human asked to mark this area as a long, dedicated process to do together, not a quick fix. Plan it as an
  epic with its own review session.

## Card wording fixed in the final report

- Card 45 (plan 436) read as "give the dish a second station". A dish has one station; the step means "open a
  second dish and set its station to «חם»". Reworded in `final-report.md`. Stations themselves work (Human).
