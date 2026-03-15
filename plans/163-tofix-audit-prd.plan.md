# toFix.md audit — PRD: what’s done vs what’s left

**Source:** [public/assets/data/toFix.md](public/assets/data/toFix.md)  
**Audit date:** 2026-03-15  
**Purpose:** Run over toFix.md, verify each item against the codebase, and produce a strict PRD for remaining work.

---

## 1. Status overview

| Section | Item | Status | Evidence / notes |
|--------|------|--------|------------------|
| **Sign-in / Sign-up** | Focus to input on load | ✅ Done | `auth-modal.component.ts`: effect + `nameInput()?.nativeElement.focus()` |
| | Dev-only signed-up users dropdown | ✅ Done | Template: `@if (isDevMode() && !isSignUp)` + select with `users_()` |
| | User must have password; crypt library | ✅ Done | `auth-crypto.ts` (SHA-256); `user.service.ts` uses `hashPassword` / `verifyPassword`; login requires password when hash exists |
| | Enter to submit; close on valid user | ✅ Done | Form `(keydown.enter)="onSubmit()"`; success path saves user and modal closes via service |
| | Field-specific error under input (red) | ✅ Done | `errorKey()` blocks under name and password inputs |
| **Recipe builder — Add-new-item** | Default base unit **gram** | ✅ Done | `quick-add-product-modal.component.ts`: `baseUnit_ = signal('gram')` |
| **Recipe view (cook-view)** | Locale-aware quantity format (1,200 / 20,000) | ✅ Done | `FormatQuantityPipe` + `Intl.NumberFormat('he-IL')` in template |
| | Change measurement unit **before** applying multiplication | ✅ Done | `selectedUnit_`, `convertedYieldAmount_`, unit selector in header |
| | Align values in recipe list (top, per column) | ⚠️ Verify | Cook-view grid; confirm `align-items: start` and column alignment in SCSS |
| **Recipe builder** | Persist open/closed state per container | ✅ Done | `rb_col_ingredients`, `rb_col_workflow` in localStorage (recipe-builder.page.ts) |
| | Remove up/down arrows in category title | ⚠️ Verify | recipe-workflow has no sort arrows in category header; confirm no other place |
| | Quantity control: custom +/- buttons | ✅ Done | recipe-workflow + recipe-ingredients-table use counter buttons |
| | Expand/collapse by clicking anywhere on container | ✅ Done | Section headers have `(click)="toggle*()"` on wrapper + section-card-header |
| | Drag-and-drop (ingredient index + workflow; renumber steps) | ✅ Done | CDK drag-drop in both; workflow `onDropStep` renumbers `order_` |
| **Maison Plus (dish prep)** | Row style improvement | 🔲 Left | Plan 081: border, padding, hover |
| | Quantity control match ingredient-index (+/-) | ✅ Done | Same counter pattern in workflow |
| | Category **before** add item; focus new row after add | 🔲 Left | Plan 081: category picker first, then `focusWorkflowRowAt_` |
| **App-wide — Category/unit dropdowns** | Audit + “add new” where applicable | 🔲 Partial | quick-add + recipe-ingredients-table + recipe-workflow have `__add_unit__`; add-equipment has add category. Audit product-form, other screens per 081 |
| **Logistics** | Chips width fit content (no truncation) | ✅ Done | `.logistics-chip-label { width: fit-content; white-space: nowrap }` |
| | Search dropdown: Arrow Up/Down + Enter | ✅ Done | recipe-builder logistics + custom-select have keyboard nav; plan 159 done for type-to-filter |
| **Add-item modal (equipment)** | Add new category → open modal immediately; quick save flow | ✅ Partial | add-equipment opens addItemModal on add-new; sets category and stays open. Optional: remove translationKeyModal step when possible |
| **Labels** | Selectability of existing labels (delete container + recipe builder) | 🔲 Left | Plan 081: delete-label from `allLabels_()`; recipe builder manual selector from registry; “already exists” → offer to select |
| **Menu-builder / menu-library** | Select options available by keyboard | 🔲 Left | toFix: “select options are not available by keyboard”. Menu-library uses `app-custom-select` without `typeToFilter`; ensure Arrow Up/Down + Enter work when open (custom-select has it; verify focus/trigger) |
| **Recipe-builder / edit** | Click item name to change item (ingredient index) | ✅ Done | Plan 147 completed |
| | category-input-box: multi-select + search | ✅ Done | Plan 147: product-form category search |
| **unit-creator-modal** | Keyboard flow: focus name → quantity → unit; Arrow Up/Down in unit dropdown | 🔲 Left | toFix: focus on open → name; Enter → quantity; then unit select with keyboard nav (prevent scroll stealing) |
| **Dashboard** | Header “still not good” | 🔲 Left | Subjective; align with design system and 148 (section headers) |
| **Lists** | Sidebar aligned to list container when small screen (not overgrowing) | 🔲 Left | toFix: “When first media query passes … sidebar aligned to list container. Right now sidebar grows over everything.” list-shell 768px layout |
| **Add new category modal** | Focus: Hebrew first or English first by context; Enter to save | 🔲 Optional | toFix (commented): two cases for focus; low priority |
| **Activity-section / change-tag** | Better representation of what changed | 🔲 Optional | toFix (commented out) |
| **Sidebar corners / close on breakpoint** | Radius when sidebar open; auto-close on shrink | ✅ Done | Plans 118, 105; list-shell transition:none at 768px |

---

## 2. PRD — Remaining work (strict)

Only items marked **Left**, **Partial**, or **Verify** above are specified below. Each has acceptance criteria.

---

### 2.1 Recipe view — Align values in ingredient list (Verify)

- **Goal:** Values (amount, unit, etc.) align under column headers; top-aligned; no spread.
- **Acceptance criteria:**
  - Cook-view ingredients grid uses `align-items: start` (or equivalent) per row.
  - Each cell (col-name, col-qty, col-unit, col-cost) has consistent alignment and min-width where needed.
- **Files:** `cook-view.page.scss`, `cook-view.page.html` (ingredient table structure).

---

### 2.2 Recipe builder — Remove up/down arrows in category title (Verify)

- **Goal:** No sort/order arrows in the category title of the workflow (dish or prep).
- **Acceptance criteria:**
  - No ChevronUp/ChevronDown or ArrowUpDown in the category header row of recipe-workflow (dish and preparation).
  - If any other “category title” row has arrows, remove them.
- **Files:** `recipe-workflow.component.html`, related SCSS.

---

### 2.3 Maison Plus — Row style

- **Goal:** Each preparation row in dish mode has clear separation and hover.
- **Acceptance criteria:**
  - Border between rows (e.g. `border-bottom: 1px solid var(--color-border-subtle)`).
  - Row padding `var(--space-sm)` (or token).
  - Hover: `background: var(--color-bg-hover)` (or token).
- **Files:** `recipe-workflow.component.scss` (`.prep-flat-grid`, `.prep-grid-row` or equivalent).

---

### 2.4 Maison Plus — Category before add; focus new row

- **Goal:** When adding a preparation, user chooses category first; after add, focus moves to the new row’s search.
- **Acceptance criteria:**
  - “Add preparation” opens a category picker (e.g. inline dropdown) first.
  - On category chosen, new row is created with that category; add-item modal opens if needed.
  - After new row is created, `focusWorkflowRowAt_` (or equivalent) is set so preparation-search in the new row receives focus.
- **Files:** `recipe-workflow.component.ts/html`, `recipe-builder.page.ts` (focus signal), preparation-search component.

---

### 2.5 App-wide — Category/unit “add new” audit

- **Goal:** Every category or unit dropdown that should allow “add new” has it; behavior is consistent.
- **Acceptance criteria:**
  - List of all screens with category or unit dropdowns (from 081 or fresh audit).
  - Each has “add new category” or “add new unit” where applicable (e.g. product-form, add-equipment, quick-add, recipe-ingredients-table, recipe-workflow).
  - Selecting “add new” opens the appropriate modal; on save, the new value is selected in the dropdown and flow continues (e.g. equipment quick-save).
- **Files:** All components with category/unit selects; `quick-add-product-modal`, `add-equipment-modal`, `product-form`, `recipe-ingredients-table`, `recipe-workflow`, metadata-manager, etc.

---

### 2.6 Labels — Selectability of existing labels

- **Goal:** Existing project labels are selectable in delete-label and in recipe builder; no “ID already used” without option to select.
- **Acceptance criteria:**
  - **Delete-label:** UI lists existing labels from `metadataRegistry.allLabels_()`; user can select one (or more) to delete; confirm action calls `deleteLabel(key)`.
  - **Recipe builder:** Manual label selector shows chips/options from `allLabels_()` (minus auto-labels); toggle adds/removes from recipe `labels`; no duplicate “already used” without “select it” option.
  - **Create flow:** If user types an existing label key in “create” mode, show inline option “This label already exists — select it?” (or equivalent).
- **Files:** metadata-manager (delete-label block), recipe-builder + recipe-header (labels UI), label-creation-modal (consistency).

---

### 2.7 Menu-library — Select options available by keyboard

- **Goal:** In menu-library (and if applicable menu-builder), all filter/select dropdowns support keyboard: open with focus/Enter, Arrow Up/Down to move, Enter to select.
- **Acceptance criteria:**
  - Event type and serving style (and any other) `app-custom-select` instances: when trigger has focus, Arrow Down opens dropdown (if not already open); Arrow Up/Down move highlight; Enter selects highlighted option.
  - No need for mouse to choose an option. If custom-select already supports this, ensure menu-library triggers receive focus and key events (e.g. tab order, no `tabindex="-1"` blocking).
- **Files:** `menu-library-list.component.html/ts`, `custom-select.component.ts/html` (confirm keyboard behavior when used as button trigger).

---

### 2.8 unit-creator-modal — Keyboard flow

- **Goal:** Full keyboard flow: focus to name on open → Enter/tab to quantity → then to unit select; unit dropdown supports Arrow Up/Down without scrolling the page.
- **Acceptance criteria:**
  - Modal open: focus in “name” (search) input.
  - After selecting name (Enter or mouse): focus moves to quantity.
  - After quantity (Enter): focus moves to unit select; dropdown opens and Arrow Up/Down move within options (prevent default so page does not scroll).
  - Tab and click into unit select also open dropdown and allow Arrow Up/Down.
- **Files:** `unit-creator.component.ts/html`, `custom-select.component` (if unit is custom-select: ensure focus and key handling when opened by tab/click).

---

### 2.9 Dashboard — Header

- **Goal:** Dashboard header meets design/system expectations (“still not good” resolved).
- **Acceptance criteria:**
  - Header layout and styling aligned with plan 148 (section headers) and global tokens.
  - Title, tabs, and actions (Add Product, Suppliers, etc.) are clearly structured and readable; no overlapping or misalignment.
- **Files:** `dashboard-overview.component.html/scss`, `dashboard.page.*`.

---

### 2.10 Lists — Sidebar alignment at first breakpoint

- **Goal:** When the first media query (e.g. 768px) applies, the filter sidebar does not overgrow the list; it stays aligned with the list container.
- **Acceptance criteria:**
  - At `max-width: 768px`, the sidebar (filter panel) is contained (width/position) so it does not cover the list container incorrectly; alignment with list container is explicit (e.g. same inset or margin as list).
  - No “sidebar growing over everything” at that breakpoint.
- **Files:** `list-shell.component.scss` (and possibly parent layout), `list-shell.component.html`.

---

## 3. Optional / Deferred (from toFix comments)

- **Add new category modal focus:** Two cases (focus Hebrew vs English by context); Enter to save. Left as optional.
- **Activity-section change-tag:** Better representation of “what changed”. Left as optional.
- **Allergen single-item centering:** toFix commented; skip unless reintroduced.

---

## 4. References

- [plans/081-tofix-detailed-plans.plan.md](plans/081-tofix-detailed-plans.plan.md) — Detailed implementation notes for many toFix sections.
- [plans/147-recipe-builder-edit-tofix-items.plan.md](plans/147-recipe-builder-edit-tofix-items.plan.md) — Recipe-builder edit items (done).
- [plans/148-dashboard-tofix-items.plan.md](plans/148-dashboard-tofix-items.plan.md) — Dashboard items (done).
- [plans/159-type-to-filter-all-dropdowns.plan.md](plans/159-type-to-filter-all-dropdowns.plan.md) — Type-to-filter and keyboard (done).
- [plans/118-sidebar-close-on-breakpoint.plan.md](plans/118-sidebar-close-on-breakpoint.plan.md) — Sidebar close at 768px (done).
- [plans/105-persist-sidebar-state.plan.md](plans/105-persist-sidebar-state.plan.md) — Panel state persistence (done).

---

## 5. Summary table — Left to do

| # | Item | Priority |
|---|------|----------|
| 2.1 | Recipe view: align values (verify) | P2 |
| 2.2 | Recipe builder: remove category arrows (verify) | P2 |
| 2.3 | Maison Plus: row style | P1 |
| 2.4 | Maison Plus: category before add + focus new row | P1 |
| 2.5 | App-wide: category/unit “add new” audit | P1 |
| 2.6 | Labels: selectability in delete + recipe builder | P1 |
| 2.7 | Menu-library: keyboard on selects | P1 |
| 2.8 | unit-creator-modal: keyboard flow | P1 |
| 2.9 | Dashboard: header | P2 |
| 2.10 | Lists: sidebar alignment at 768px | P1 |

**P1** = required for PRD closure; **P2** = verify or polish.
