---
name: Menu-library full keyboard access
overview: Make the menu-library page (and the shared custom-select when used as button trigger) fully keyboard accessible: Tab through all controls, Enter/Space to activate, Arrow Down/Up to open and move in dropdowns, Enter to select.
---

# Menu-library and custom-select full keyboard accessibility

## Current state

- **custom-select (button trigger):** Enter and Space already open the dropdown when closed; Arrow Up/Down and Enter work when open. **Gap:** When closed, Arrow Down (and Arrow Up) do not open the dropdown — only Enter/Space do. The plan 2.7 acceptance criteria require "Arrow Down opens dropdown (if not already open)".
- **custom-select host:** Uses `host: { tabIndex: '-1' }` so the host is not in the tab order; the inner `<button>` is focusable, so Tab correctly lands on the trigger. No change needed for tab order.
- **menu-library-list:** Three `app-custom-select` instances (event type, serving style, sort) use the button trigger; they will get the Arrow Down/Up-to-open behavior once custom-select is fixed. **Gaps:**
  - **Date-from wrap:** The div with `(click)="onDateWrapClick(dateFromRef)"` has `tabindex="-1"`, so it is **not reachable by Tab**. Keyboard users cannot open the date picker.
  - **Event cards:** `<article class="event-card" (click)="onOpen(event)" tabindex="0" role="button">` has no `keydown.enter` or `keydown.space`; so they are not keyboard-activatable (Enter/Space do nothing).

Menu-builder does not use custom-select; no changes there.

## Implementation

### 1. custom-select: Arrow Down / Arrow Up open dropdown when closed (button trigger)

**File:** `src/app/shared/custom-select/custom-select.component.ts`

In `onKeydown()`, the branch `if (!this.open())` currently only handles Enter and Space to toggle. Add handling for Arrow Down and Arrow Up so they also open the dropdown (and set initial highlight), matching the type-to-filter path in `onInputKeydown()`.

- When `!this.open()` and `e.key === 'ArrowDown'` or `e.key === 'ArrowUp'`: `e.preventDefault()`, then call `this.toggle()` (which already opens and sets highlightedIndex). No need to call a separate open method.

### 2. menu-library-list: Date-from wrap keyboard accessible

**File:** `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html`

- Change the date wrap div from `tabindex="-1"` to `tabindex="0"` so it is in the tab order.
- Add `(keydown.enter)="onDateWrapClick(dateFromRef)"` and `(keydown.space)="$event.preventDefault(); onDateWrapClick(dateFromRef)"` so Enter and Space activate the same behavior as click (show date picker).

### 3. menu-library-list: Event cards activatable with Enter/Space

**File:** `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html`

- On the `.event-card` article, add `(keydown.enter)="onOpen(event)"` and `(keydown.space)="$event.preventDefault(); onOpen(event)"` so keyboard users can focus the card with Tab and open it with Enter or Space.

## Files to touch

| File | Change |
|------|--------|
| custom-select.component.ts | In `onKeydown()`, when `!open()`, handle `ArrowDown` and `ArrowUp` with preventDefault + toggle(). |
| menu-library-list.component.html | Date wrap: tabindex="0" + keydown.enter/space. Event card: keydown.enter + keydown.space. |

## Verification

- On menu-library: Tab through action bar and filters (search, New event, event type, serving style, date from, sort, sort order), then through event cards. No tabindex="-1" blocking any control.
- Focus event type (or serving style or sort) select: Arrow Down opens dropdown; Arrow Up/Down move highlight; Enter selects; Escape closes.
- Focus date-from: Enter or Space opens native date picker.
- Focus an event card: Enter or Space navigates to that event (menu-intelligence).
