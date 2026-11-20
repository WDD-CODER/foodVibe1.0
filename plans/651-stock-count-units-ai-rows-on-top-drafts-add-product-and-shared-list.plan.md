# Plan 651 — Stock count: the product's own units, AI rows on top, an automatic draft with its history, add a product and come back, and the shared list look

Status: draft
Depends-on: 650
Snapshot: 6d151456

## Problem Statement
Dandan checked plans 648–650 on 2026-11-20 (staging `6d151456`). On `/inventory/count`:

1. **Wrong unit.** «שלושה ארגזים עגבניות» found the product but «ארגז» is not one of that product's units, and the row
   took the amount under grams. A wrong unit corrupts the stock. The AI line's unit must map to the closest unit the
   product really has (its base unit, purchase units or unit options); when none fits, the row keeps the amount
   unconfirmed and shows a note that the unit needs a fix.
2. **The unit dropdown has no "add unit".** Default `unit-dropdown-add` (on, 2026-11-20): every unit dropdown offers
   «הוספת יחידה» that opens the add-unit popup (`UnitRegistryService.openUnitCreator`, as the product form does).
3. **The AI's rows are hard to see.** A filled row far down the list looks like nothing happened. After an AI fill the
   filled rows move to the top; and a button at the top of the list moves the selected (counted) rows to the top.
4. **Several similar products and no question.** «עגבניות» filled «עגבניה» although the business has many tomato
   products («עגבניות שרי», «עגבניה תמר»…); Dandan: it is not the same item and it should have asked. Plan 650 counts
   one exact (folded) name as a clear best; it must ask (`choose`) whenever other products also contain the spoken
   word, and only auto-fill when the spoken name fits one product and no other.
5. **"שמירת טיוטה" is unclear.** Dandan asks why it is needed, how it differs from «סיום ספירה», and where a saved
   draft is seen. Today: a draft keeps the numbers for later (`PUT /api/v1/stock/counts/:id`), «סיום ספירה» finalizes
   the count into stock (`POST …/finalize`), and the only trace of a draft is the line «ממשיכים טיוטה שנשמרה בתאריך…»
   on return. Decided here: the draft saves itself (no button), the page says «נשמר אוטומטית · <time>», and a
   «ספירות קודמות» list (from `GET /api/v1/stock/counts`) shows drafts and finished counts with their date and lines.
6. **Adding a missing product loses the count.** Default `leave-and-return` (on, 2026-11-20): from a no-match line,
   «הוספת מוצר חדש» saves the count (no confirm), opens the product form with the spoken name filled in, and save or
   back returns to the count with its numbers and the line kept (the new product then fills that line).
7. **The page does not look like the app's lists.** Default `app-list-container` (on, 2026-11-20): the count page uses
   `app-list-shell` with `app-page-header` like the other list pages; (a) each `c-list-row` stays on one line at every
   breakpoint; (b) `app-counter` is larger on a phone than on a desktop and must not be; (c) the page header differs
   from the other list pages — the date, the draft button and «סיום ספירה» were placed as separate children of the
   header's single action cell (`src/app/shared/page-header/page-header.component.scss:189–191`), and plan 648 only
   wrapped them; the header must take the same shape as the other list pages (title, search, one action area).
8. **Diagnosis menu entry not seen.** Dandan could not find «אבחון» in the main menu (plan 646). The builder checks it
   in the running app for a business with `consultant_diag` on, at desktop and phone width (the nav pills may hide
   the last pill behind their scroll), and fixes what hides it.

## Goals & Success Criteria
**Primary:** a spoken count lands on the right product in a unit the product has (or is flagged), similar products are
always offered as a choice, filled rows come to the top, the draft saves itself and past counts are listed, a missing
product is added without losing the count, and the page looks like the app's other list pages.

- [auto] `pnpm run test:server` passes, including `server/test/stock-extract-util.test.js` and
  `server/test/ai-stock-extract.test.js` new cases: (a) «עגבניות» with «עגבניה», «עגבניות שרי», «עגבניה תמר» →
  `choose` with all three, the closest first; (b) «אבוקדו» with one avocado product → `matched`; (c) spoken unit
  «ארגזים» on a product with units g and «ארגז» → «ארגז»; on a product with only g and kg → `unit: null`,
  `unitNeedsFix: true`, the spoken unit kept as `spokenUnit`; (d) «קילו» on a product with kg → kg.
- [auto] `pnpm run test:ci` passes, including
  `src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts` and
  `src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts`: (a) after an AI
  fill the filled rows are first; (b) «העברת המסומנים לראש הרשימה» moves the counted rows first; (c) a row with
  `unitNeedsFix` shows «יש לבדוק את היחידה: נאמר "<spokenUnit>"» and is not counted until a unit is picked; (d) the
  unit dropdown has «הוספת יחידה», which opens the unit creator and selects the new unit; (e) no «שמירת טיוטה» button;
  a change saves the draft after 2 s with «נשמר אוטומטית · HH:mm»; (f) «ספירות קודמות» lists drafts and finished counts
  (date, status, number of lines) and opens a draft; (g) «הוספת מוצר חדש» saves the draft and navigates to
  `/inventory/add?name=<spoken>&returnUrl=/inventory/count` with no confirm; (h) the page uses `app-list-shell` and
  `app-page-header` like `inventory-product-list`; (i) `app-counter` has the same size at 375 px and 1280 px.
- [auto] The same command, `src/app/pages/inventory/components/product-form/product-form.component.spec.ts`: `?name=`
  fills the name; with `returnUrl`, save and back navigate to it (the new product id passed back as `?addedProduct=`).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm --dir server run lint` exits 0;
  `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/inventory/count` at 375 px every `c-list-row` is one line high and the counter matches the desktop size;
  with a business that has `consultant_diag`, the main menu shows «אבחון» at 375 px and 1280 px
  (`e2e/ui/651-1.spec.ts`).
- [human] Dandan says «שלושה ארגזים עגבניות»: he is asked which tomato product; the row gets crates only if the product
  has crates, else it shows the unit note; the filled row is at the top. He adds a missing product from a no-match
  line, saves it, and is back on the count with his numbers. The count page looks like the inventory list on his phone.
- [human] the stock count · from a no-match line press add new product · the product form opens with the name filled in, no confirm popup; save or back returns to the count with its numbers kept
- [human] any screen with a unit dropdown · open the dropdown · an add-unit option is there and opens the add-unit popup; the new unit is selected after saving
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line

## Execution Mode
- Parallel: no — it edits the stock screens, the product form, the header and `public/assets/data/dictionary.json`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/utils/stock-extract.js
server/routes/ai/stock.js
server/routes/stock.js
server/test/stock-extract-util.test.js
server/test/ai-stock-extract.test.js
server/test/stock-counts.test.js
shared/schemas/ai-stock-extract.schema.ts
src/app/pages/inventory/components/stock-count/**
src/app/pages/inventory/components/stock-count/stock-count.component.spec.ts
src/app/pages/inventory/components/stock-count/stock-ai-draft/stock-ai-draft.component.spec.ts
src/app/pages/inventory/components/product-form/**
src/app/pages/inventory/components/product-form/product-form.component.spec.ts
src/app/shared/counter/**
src/app/shared/page-header/**
src/app/shared/list-shell/**
src/app/core/components/header/**
src/app/core/services/unit-registry.service.ts
src/app/core/services/return-to.service.ts
src/app/core/services/return-to.service.spec.ts
public/assets/data/dictionary.json
e2e/ui/651-1.spec.ts
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the past-counts list reads only the caller's business counts through the existing scope filter
  of `server/routes/stock.js`; no new read crosses businesses.
- INV-4: preserves — the extract answer gains optional `unitNeedsFix` and `spokenUnit`; the count draft keeps its
  schema.
- INV-5: preserves — a unit added from the dropdown goes through the existing unit creator into `taxonomyTerms`.
- INV-6: preserves — the model is still called only through the server.

## Reuse Check

- the count page list — family: list-page — rung: 1 — why: `app-list-shell` with `app-page-header`, as
  `inventory-product-list`.
- the unit dropdown's add option — family: search-combobox — rung: 2 — why: `app-custom-select` with its existing
  add-option row calling `UnitRegistryService.openUnitCreator`.
- the past counts list — family: list-page — rung: 1 — why: rows in the same shell's second tab.
- the return-to helper — family: page-entry-loading — rung: 3 — why: one small service beside the auth guard's
  `returnUrl` pattern: a `returnUrl` query param and the page's draft saved before leaving.

## Defaults

- unit-dropdown-add — applies — how: `app-custom-select` add-option row → `UnitRegistryService.openUnitCreator`.
- leave-and-return — applies — how: the return-to helper with `returnUrl` and the auto-saved draft.
- app-list-container — applies — how: `app-list-shell` + `app-page-header`.
- hints-in-tooltips — applies — how: the unit note is row text (a warning on that row), every other explanation a
  `title` tooltip.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want a spoken amount saved in a unit my product really has, so that my stock is right.
- As an owner, I want to be asked when my words fit several products.
- As an owner, I want to see what the AI filled at once, and to see my past counts.
- As an owner, I want to add a missing product and come back to my count as it was.
- As an owner, I want the count page to look and work like the rest of the app on my phone.

## Functional Requirements

### Must Have (P0)
- [ ] Matcher: auto-fill only when the spoken name fits one product and no other contains the word; else `choose`.
- [ ] Units: map the spoken unit to the product's own units (base, purchase units, unit options; aliases such as
  «ארגזים»→«ארגז», «קילו»→kg); none → `unitNeedsFix` with the note; the row is not counted until fixed.
- [ ] Unit dropdown: «הוספת יחידה» → unit creator → the new unit selected.
- [ ] AI-filled rows first after a fill; «העברת המסומנים לראש הרשימה» button at the top of the list.
- [ ] Draft: saved automatically 2 s after a change («נשמר אוטומטית · HH:mm»), no button; «ספירות קודמות» list from
  `GET /api/v1/stock/counts` (drafts and finished, newest first), a draft opens on the sheet.
- [ ] «הוספת מוצר חדש»: draft saved, product form with `?name=` and `returnUrl`; save or back returns; the new product
  fills the line it came from.
- [ ] The page on `app-list-shell` + `app-page-header`; one-line rows at every breakpoint; the counter's size equal on
  phone and desktop; the header like the other list pages.
- [ ] Diagnosis menu entry visible at phone and desktop width for a business with `consultant_diag`.
- [ ] Dictionary (append-only): `stk_unit_needs_fix` — "יש לבדוק את היחידה: נאמר \"{unit}\"", `stk_move_counted_top` —
  "העברת המסומנים לראש הרשימה", `stk_autosaved` — "נשמר אוטומטית · {time}", `stk_past_counts` — "ספירות קודמות",
  `stk_count_status_draft` — "טיוטה", `stk_count_status_final` — "הסתיימה", `unit_add` — "הוספת יחידה" (only if no
  key for it exists).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS; one-handed on a phone; the unit note in the warning tone on its row.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Ask whenever similar products fit and save the amount only in a unit the product has — the matcher rule, the unit mapping, the cases — server/utils/stock-extract.js, server/routes/ai/stock.js, shared/schemas/ai-stock-extract.schema.ts, server/test/stock-extract-util.test.js, server/test/ai-stock-extract.test.js
- [ ] A2: Put the count on the shared list look — list shell, page header, one-line rows, the counter size — src/app/pages/inventory/components/stock-count/**, src/app/shared/counter/**, src/app/shared/page-header/**
- [ ] A3: Show what the AI filled and the unit to fix — rows to the top, the move-counted button, the unit note, add-unit in the dropdown — src/app/pages/inventory/components/stock-count/**, src/app/core/services/unit-registry.service.ts, public/assets/data/dictionary.json
- [ ] A4: Save the draft by itself and list past counts — autosave, the list, its specs — src/app/pages/inventory/components/stock-count/**, server/routes/stock.js, server/test/stock-counts.test.js
- [ ] A5: Add a missing product and come back to the count — the return-to helper, the product form prefill and return, the specs — src/app/core/services/return-to.service.ts, src/app/pages/inventory/components/product-form/**
- [ ] A6: Make the diagnosis menu entry visible and prove it all in the running app — the header check, the screen spec, then the Done-when commands in order — src/app/core/components/header/**, e2e/ui/651-1.spec.ts, docs/brain/inventory.md

## Technical Considerations
- Dependencies: 650 (statuses and the per-line choice).
- The draft endpoints exist (plan 635); autosave reuses `PUT /api/v1/stock/counts/:id`.

## Out of Scope
- Learning a person's own words for a product.

## Critical Questions
- none

## Execution Notes
- decided: the draft saves itself and the button goes — why: Dandan did not see what the button was for, and default
  `leave-and-return` already needs the work saved without asking.
- decided: similar products always ask — why: Dandan, «עגבניות» → «עגבניה» is not the same item.
