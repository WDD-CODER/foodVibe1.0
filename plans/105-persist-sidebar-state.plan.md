# Persist sidebar open/close state across list pages

## Current state

- **ListShellComponent** exposes `isPanelOpen` (input) and `panelToggle` (output). It does not own state.
- **Five list components** each hold a local `isPanelOpen_ = signal(true)` and pass it to the shell; they react to `panelToggle` by toggling the signal. State is **not** persisted, so returning to a page always shows the panel open (except on mobile, where some components force-close via `matchMedia`).

| Page / component     | File                                                                 | Uses list-shell |
| -------------------- | -------------------------------------------------------------------- | --------------- |
| Inventory (products) | inventory-product-list.component.ts | Yes             |
| Suppliers            | supplier-list.component.ts           | Yes             |
| Recipe Book          | recipe-book-list.component.ts        | Yes             |
| Equipment            | equipment-list.component.ts          | Yes             |
| Venues               | venue-list.component.ts              | Yes             |

- **list-state.util.ts** already syncs list state (search, filters, sort) to URL + sessionStorage. Panel open/closed is UI-only state; we use a small separate persistence layer (localStorage).

## Approach

1. **Panel preference helper** keyed by context (e.g. `list-panel:inventory`, `list-panel:venues`). Use **localStorage** so state survives tab close.
2. **Per-page state**: each list has its own key so closing the panel on Inventory does not affect Suppliers.
3. **Respect mobile**: existing `afterNextRender` + `matchMedia` logic that forces the panel closed on narrow viewports stays; we only restore from storage when not in that mobile path.
4. **Wire each of the five list components** to init `isPanelOpen_` from the helper (after optional mobile override) and write on each `togglePanel()`.

## Files to add/change

| Action | File |
| ------ | ---- |
| Add    | `src/app/core/utils/panel-preference.util.ts` |
| Edit   | inventory-product-list.component.ts — context `'inventory'` |
| Edit   | supplier-list.component.ts — context `'suppliers'` |
| Edit   | recipe-book-list.component.ts — context `'recipe-book'` |
| Edit   | equipment-list.component.ts — context `'equipment'` |
| Edit   | venue-list.component.ts — context `'venues'` |

## Out of scope

- Persisting export bars or FABs (can reuse the same util with different keys later).
- Putting panel state in the URL or in `useListState`.
