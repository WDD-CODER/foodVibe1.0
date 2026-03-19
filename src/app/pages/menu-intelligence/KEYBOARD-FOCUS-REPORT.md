# Menu Intelligence Page — Keyboard and Focus Report

This report describes how to make the menu creation page fully keyboard-navigable: a clear Tab order, Enter/Space where appropriate, and skipping irrelevant controls (e.g. plus/minus) so the process matches the product form and recipe builder patterns.

---

## 1. Current State

### What already works

- **Initial focus:** `ngAfterViewInit` focuses the menu name input (`name_`) via `focusField('name_')`.
- **Metadata focus order:** `FOCUS_ORDER = ['name_', 'event_type_', 'serving_type_', 'guest_count_', 'event_date_']`. `onMetaKeydown` moves focus with Enter/Tab/ArrowDown (next) and ArrowUp (previous). Fields use `id="menu-focus-{field}"` for programmatic focus.
- **Event type:** Trigger button opens dropdown on Enter/Tab/ArrowDown. When open, `onEventTypeSearchKeydown` handles ArrowUp/ArrowDown (highlight), Enter (select or add new), Escape (close), Tab (close and focus serving_type_). Search input is focused when dropdown opens.
- **Serving type:** `app-custom-select` with `triggerId="menu-focus-serving_type_"` — already supports Space to open/select (from product form work).
- **Event date:** `meta-date-wrap` has `tabindex="0"`, Enter/Space open date picker and focus date input. `onDateKeydown` handles digit input and Enter/Tab/Arrow to move focus.
- **Section header:** Section title is a `<button class="section-title-plain">` (click opens section category search). When section search is open, `onSectionSearchKeydown` handles ArrowUp/ArrowDown, Enter (select/add), Escape (close). Section search input is focused when opened.
- **Dish search:** When a row has no recipe selected, dish search input is shown. `onDishSearchKeydown` handles ArrowUp/ArrowDown, Enter (select recipe), Escape (clear). `focusDishSearchInput()` used after add item or select.
- **Document keydown:** `@HostListener('document:keydown')` delegates Arrow/Enter from event-type dropdown, section-search wrap, and dish-search wrap to the corresponding handlers.
- **Dish sell price / dish fields:** `onSellPriceKeydown` and `onDishFieldKeydown` handle ArrowUp/ArrowDown for value change.

### Gaps (to implement)

1. **Guest count +/- buttons** — Tab currently lands on minus, then input, then plus. For a linear flow, add `tabindex="-1"` to both counter-pill buttons so Tab goes: … → serving type → **guest count input** → date (user can use ArrowUp/ArrowDown on the input or keyboard nav; +/- are mouse-only).
2. **Event type trigger — Space to open** — `onMetaKeydown('event_type_', e)` handles Enter/Tab/ArrowDown to open; **Space is not handled**. Add `e.key === ' '` with `preventDefault()` and call `openEventTypeDropdown()` so Space opens the dropdown like Enter.
3. **Event type dropdown — Space to select** — In `onEventTypeSearchKeydown`, add handling for `e.key === ' '` (same as Enter: select highlighted option or add new, then close and focus serving_type_).
4. **Section title button — Space to open** — The section title is a `<button>`, so Enter already activates it. Add `(keydown.space)="$event.preventDefault(); openSectionSearch(sectionIndex)"` so Space also opens the section category search.
5. **Section search — Tab to leave** — `onSectionSearchKeydown` does not handle Tab. When user presses Tab from section search input, either: (a) close section search and move focus to the **first dish search** in that section (or **add-dish** button if no items), or (b) move to **next section title** (or add-section). Recommend (a): Tab from section search → first dish search in same section (or add-dish); Shift+Tab → back to section title. Implement: in `onSectionSearchKeydown`, on `e.key === 'Tab'`, preventDefault, closeSectionSearch(), then focus first `#dish-search-{sectionIndex}-0` or the add-dish button for that section.
6. **Dish search — Tab to next** — `onDishSearchKeydown` does not handle Tab. On Tab from dish search: move focus to **sell price** of same row if dish is selected, else to **next row’s dish search** or **add-dish** for the section. On Shift+Tab: previous row’s last focusable or section title. Implement: in `onDishSearchKeydown`, on `e.key === 'Tab'`, preventDefault; if current row has recipe_id_, focus sell price input for that row; else focus next row’s dish search or add-dish button; on Shift+Tab, focus previous row’s dish search or section title.
7. **Sell price — Tab to next** — `onSellPriceKeydown` only handles ArrowUp/ArrowDown. Add Tab: focus next row’s dish name button or dish search, or add-dish; Shift+Tab: focus previous focusable in same row (dish name) or previous row. This keeps a clear “row by row” flow.
8. **Section remove / dish remove / dish meta toggle** — Optional: add `tabindex="-1"` to **section-remove** and **dish-remove** and **dish-meta-toggle** so the primary Tab path is: section title → section search (when open) → dish search 1 → sell price 1 → dish search 2 → … → add-dish → (then add-section). Users can still reach remove/meta via other means (e.g. a separate “actions” pass or leave them in tab order). Recommendation: leave them in tab order for now; add tabindex="-1" only if the flow feels noisy after the above changes.
9. **Add-section and Save** — Ensure “Add section” and toolbar “Save” remain in tab order after the last section. Currently they are focusable; no change needed unless you introduce a “skip to Save” shortcut.
10. **Canonical tab order (document)** — Add a short “Menu intelligence tab order” section (e.g. in `.claude/skills/commit-to-github/SKILL.md` or a dedicated doc) listing the intended steps so future changes preserve the flow (see Section 2 below).

---

## 2. Canonical Tab Order (Target)

After implementation, the intended sequence is:

1. **Menu name** — Text input (initial focus).
2. **Event type** — Trigger button; Enter/Space/ArrowDown open dropdown; ArrowUp/Down move, Enter/Space select; Escape close.
3. **Serving type** — Custom-select (Enter/Space open, Arrow move, Enter/Space select).
4. **Guest count** — Number input (ArrowUp/Down change value; +/- skipped).
5. **Event date** — Date wrap (Enter/Space open picker); date input for value.
6. **Section 1 title** — Button; Enter/Space open section category search.
7. **Section 1 category search** — When open: type to filter, ArrowUp/Down, Enter/Space select; Tab → first dish in section.
8. **Section 1 — Dish 1** — If empty: dish search input (Arrow/Enter to select). If filled: dish name (optional edit), then **sell price** input (Arrow to change). Tab from dish search or sell price → next dish or add-dish.
9. **Section 1 — Dish 2, …** — Same pattern per row.
10. **Section 1 — Add dish** — Button.
11. **Section 2 title**, **Section 2 category search**, **Section 2 dishes**, **Add dish**, …
12. **Add section** — Button.
13. **Toolbar (when open)** — Export/Save etc.; **Save** as final action.

---

## 3. Implementation Checklist

| # | Item | File(s) | Change |
|---|------|--------|--------|
| 1 | Guest count +/- skip | `menu-intelligence.page.html` | Add `tabindex="-1"` to both `.counter-pill-btn` (minus and plus). |
| 2 | Event type — Space to open | `menu-intelligence.page.ts` | In `onMetaKeydown`, when `field === 'event_type_'` and `e.key === ' '`, preventDefault and call `openEventTypeDropdown()`. |
| 3 | Event type dropdown — Space to select | `menu-intelligence.page.ts` | In `onEventTypeSearchKeydown`, add `e.key === ' '` branch (same logic as Enter). |
| 4 | Section title — Space to open | `menu-intelligence.page.html` | On `section-title-plain` button add `(keydown.space)="$event.preventDefault(); openSectionSearch(sectionIndex)"`. |
| 5 | Section search — Tab to first dish / add-dish | `menu-intelligence.page.ts` | In `onSectionSearchKeydown`, handle `e.key === 'Tab'`: closeSectionSearch(); focus first dish search in section or add-dish button. Handle Shift+Tab: focus section title. |
| 6 | Dish search — Tab to sell price / next row / add-dish | `menu-intelligence.page.ts` | In `onDishSearchKeydown`, handle Tab: if row has recipe, focus sell price; else focus next row dish search or add-dish. Shift+Tab: previous row or section title. |
| 7 | Sell price — Tab to next row / add-dish | `menu-intelligence.page.ts` | In `onSellPriceKeydown`, handle Tab: focus next row’s dish name or dish search, or add-dish. Shift+Tab: previous focusable in row or previous row. |
| 8 | Document tab order section | `.claude/skills/commit-to-github/SKILL.md` or `KEYBOARD-FOCUS-REPORT.md` | Add “Menu intelligence tab order” with the canonical steps (Section 2 above) for reference. |

---

## 4. Files to Touch

- **`src/app/pages/menu-intelligence/menu-intelligence.page.html`** — tabindex on guest +/-; Space on section title.
- **`src/app/pages/menu-intelligence/menu-intelligence.page.ts`** — Space on event type open/select; Tab/Shift+Tab in section search, dish search, sell price.
- **`.claude/skills/commit-to-github/SKILL.md`** (optional) — Add “Menu intelligence tab order” subsection with the canonical list.

---

## 5. Testing

- Open menu intelligence (new or edit).
- Use only keyboard: Tab, Shift+Tab, Enter, Space, ArrowUp/ArrowDown, Escape.
- Confirm: initial focus on menu name; metadata in order (name → event type → serving type → guest count → date); no Tab stop on guest +/-; event type opens with Space; section title opens with Space; from section search Tab goes to first dish; from dish search/sell price Tab moves by row; Add dish and Add section and Save remain reachable.
