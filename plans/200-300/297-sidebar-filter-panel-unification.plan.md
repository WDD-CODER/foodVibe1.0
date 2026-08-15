# Plan 297 — Sidebar Filter Panel Unification

## Goal

Fix the filter-panel ("sidebar") open/close **logic** on all 5 list pages
(Inventory, Recipe Book, Venues, Suppliers, Equipment) so behavior is
identical and correct everywhere — same visual design, same CSS, only the
open/closed state logic changes. Source: `.claude/reports/sidebar-filter-panel-audit.md`.

## Author / role

Architect pass (Claude, from the sidebar audit) — Contractor = Cursor.
Executes **one milestone at a time**, stops for review / Human validation
between milestones per `docs/agent/job-validation.md`.

## Problem statement

The audit found the panel's open/closed state is handled by 5 separate,
copy-pasted constructor blocks (one per list page) with no shared source of
truth. This produced 5 concrete bugs:

1. `getPanelOpen()` defaults to `false` when nothing is saved, contradicting
   its own doc comment ("defaults to true"). First-time desktop users get a
   closed panel.
2. Venues/Suppliers/Equipment only react to `matchMedia` **change** events —
   they never check `q.matches` on initial load. Inventory and Recipe Book
   do. Result: a desktop-saved "open" preference renders the panel open and
   full-viewport-wide on a fresh mobile load for those 3 pages.
3. `venue-list.component.ts` is missing the `typeof window === 'undefined'`
   SSR guard the other 4 pages have before calling `window.matchMedia`.
4. No page restores the panel when the viewport crosses back from mobile to
   desktop after an in-session resize — the forced-mobile-close is never
   reconciled against the desktop preference.
5. `isPanelOpen_` is declared `signal(true)` (or `signal(false)`) as a dead
   literal, then immediately overwritten in the constructor — dead/misleading
   initial state, and it's the copy-paste seam that let bugs #1–#4 diverge
   between pages in the first place.

## Non-goals (explicitly out of scope for this plan)

- **CSS / visual design.** `list-shell.component.scss` is not touched. The
  close button, swipe-to-close, backdrop, drawer widths, and border-radius
  are unchanged — this plan is logic-only.
- **Breakpoint value unification** (audit §3: global `$break-mobile/tablet/desktop`
  vs. `list-shell`'s local `$panel-overlay-break: 1024px` vs. header's
  hardcoded `620px`). Unifying these would shift where the header and panel
  switch chrome modes — a real behavior/visual change, not a bug fix. Needs
  its own plan with an explicit "does this change how anything looks at
  620–1024px" review. Left as a follow-up.
- Menu Library — has no filter panel (uses inline dropdowns); untouched.

## Decisions (locked)

- **Desktop default = open.** `getPanelOpen()`'s doc comment already states
  this intent; the code just didn't match it. This plan makes the code match
  the documented intent rather than the accidental "closed" behavior — this
  is the explicit answer to audit §4/fix #6 ("decide and document the
  desktop default").
- **Mobile always starts closed**, regardless of any saved desktop
  preference — matches the audit's real-world pattern comparison (§4) and is
  the highest-impact fix for the reported "opens by default on mobile"
  symptom.
- **Shared helper, not 5 copies.** Extract one `useResponsivePanelState()` in
  `panel-preference.util.ts` (same style as the existing `useListState()`
  composable already used in all 5 constructors) and have all 5 pages call
  it instead of hand-rolling the `afterNextRender`/`matchMedia` block.
- **Known trade-off — `equipment-list`:** its panel context is
  `this.panelContext` (a getter derived from the current route, `'inventory'`
  vs `'equipment'`). The helper reads this **once**, at construction time.
  If Angular ever reused this component instance across a route change from
  `/equipment` to `/inventory/equipment` without destroying it, the context
  would go stale. Today's code has the same property (it's read fresh on
  every `togglePanel()` call, but the two routes are distinct enough that
  Angular does not reuse the instance) — this plan doesn't change that risk,
  it just centralizes it. Flagging it rather than solving it (out of scope).

## Milestones

| ID | Status | Deliverable |
| --- | --- | --- |
| M1 | [ ] | `panel-preference.util.ts` — fix default, add `useResponsivePanelState()` |
| M2 | [ ] | Migrate all 5 list components to the shared helper |
| M3 | [ ] | Manual verification — desktop + mobile, all 5 pages |

---

### M1 — `panel-preference.util.ts`

**File:** `src/app/core/utils/panel-preference.util.ts`

Replace the entire file with:

```ts
import { signal, afterNextRender, WritableSignal } from '@angular/core'

const STORAGE_PREFIX = 'list-panel:'
const MOBILE_QUERY = '(max-width: 768px)'

/**
 * Reads the saved "panel open" state for a given context (e.g. 'inventory', 'venues').
 * Defaults to true if missing or invalid so lists start with the filter panel open.
 */
export function getPanelOpen(context: string): boolean {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_PREFIX + context) : null
    if (raw === null) return true
    const value = JSON.parse(raw)
    return value === true
  } catch {
    return true
  }
}

/**
 * Persists the "panel open" state for a given context so it is restored when the user returns.
 */
export function setPanelOpen(context: string, open: boolean): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_PREFIX + context, JSON.stringify(open))
    }
  } catch {
    /* ignore */
  }
}

export interface ResponsivePanelState {
  isPanelOpen_: WritableSignal<boolean>
  togglePanel: () => void
}

/**
 * Composes the filter-panel "open" signal for a list page: seeds it from the
 * persisted desktop preference, forces it closed on initial mobile load and
 * on every crossing into mobile width, and restores the persisted preference
 * when the viewport crosses back to desktop.
 *
 * Must be called synchronously from a component constructor — it relies on
 * afterNextRender's ambient injection context, same as calling inject()
 * directly in a field initializer.
 */
export function useResponsivePanelState(context: string): ResponsivePanelState {
  const isPanelOpen_ = signal<boolean>(getPanelOpen(context))

  afterNextRender(() => {
    if (typeof window === 'undefined') return
    const q = window.matchMedia(MOBILE_QUERY)
    if (q.matches) isPanelOpen_.set(false)
    q.addEventListener('change', (e) => {
      isPanelOpen_.set(e.matches ? false : getPanelOpen(context))
    })
  })

  const togglePanel = (): void => {
    isPanelOpen_.update((v) => !v)
    setPanelOpen(context, isPanelOpen_())
  }

  return { isPanelOpen_, togglePanel }
}
```

**Atomic sub-tasks:**

- [ ] M1a Fix `getPanelOpen()`'s two `return false` paths → `return true` (default + catch)
- [ ] M1b Add `MOBILE_QUERY` constant, `ResponsivePanelState` interface, `useResponsivePanelState()`
- [ ] M1c `ng build` passes with no other file changed yet (util is additive/backward-compatible — `getPanelOpen`/`setPanelOpen` signatures unchanged)
- [ ] M1d Commit: `fix(sidebar): default panel-open to true, add shared responsive panel-state helper`

---

### M2 — Migrate the 5 list components

Same mechanical edit in each file: drop the dead `signal(true)`/`signal(false)`
literal and the hand-rolled `afterNextRender` block, replace with the shared
helper, keep the existing public toggle method name (so templates are
untouched).

#### M2a `venue-list.component.ts`

**File:** `src/app/pages/venues/components/venue-list/venue-list.component.ts`

Change the import (line 1) — remove `signal` if otherwise unused... it's
still used elsewhere in the file (`searchQuery_`, `deletingId_`, etc.), so
keep it. Change line 25:

```ts
// before
import { getPanelOpen, setPanelOpen } from 'src/app/core/utils/panel-preference.util'
// after
import { useResponsivePanelState } from 'src/app/core/utils/panel-preference.util'
```

Also add `WritableSignal` to the `@angular/core` import on line 1.

Replace field (line 76):

```ts
// before
protected isPanelOpen_ = signal(true)
// after
protected readonly isPanelOpen_: WritableSignal<boolean>
private readonly togglePanelState_: () => void
```

Replace the constructor body (lines 92–105):

```ts
constructor() {
  const panel = useResponsivePanelState('venues')
  this.isPanelOpen_ = panel.isPanelOpen_
  this.togglePanelState_ = panel.togglePanel

  if (!this.embeddedInDashboard) {
    useListState('venues', [
      { urlParam: 'q',        signal: this.searchQuery_,      serializer: StringParam },
      { urlParam: 'envTypes',  signal: this.selectedEnvTypes_, serializer: StringSetParam },
    ])
  }
}
```

(Deletes the old `afterNextRender(() => { const q = window.matchMedia(...) ... })`
block entirely — that logic now lives in the helper, and gains the missing
SSR guard for free.)

Replace `togglePanel()` (lines 119–122):

```ts
protected togglePanel(): void {
  this.togglePanelState_()
}
```

- [ ] M2a-1 Apply the edits above
- [ ] M2a-2 `ng build` passes

#### M2b `supplier-list.component.ts`

**File:** `src/app/pages/suppliers/components/supplier-list/supplier-list.component.ts`

Same shape. Update the `panel-preference.util` import to `useResponsivePanelState`.

Replace field (line 76):

```ts
protected readonly isPanelOpen_: WritableSignal<boolean>
private readonly togglePanelState_: () => void
```

Replace constructor body (lines 97–113, keep `this.buildEditForm()` and the
`useListState(...)` call, delete the old `afterNextRender` block):

```ts
constructor() {
  const panel = useResponsivePanelState('suppliers')
  this.isPanelOpen_ = panel.isPanelOpen_
  this.togglePanelState_ = panel.togglePanel

  this.buildEditForm()
  if (!this.embeddedInDashboard) {
    useListState('suppliers', [
      { urlParam: 'q',          signal: this.searchQuery_,   serializer: StringParam },
      { urlParam: 'days',       signal: this.selectedDays_,  serializer: NumberSetParam },
      { urlParam: 'linkedOnly', signal: this.hasLinkedOnly_, serializer: BooleanParam },
    ])
  }
}
```

Replace `togglePanel()` (lines 175–178):

```ts
protected togglePanel(): void {
  this.togglePanelState_()
}
```

- [ ] M2b-1 Apply the edits above
- [ ] M2b-2 `ng build` passes

#### M2c `equipment-list.component.ts`

**File:** `src/app/pages/equipment/components/equipment-list/equipment-list.component.ts`

Same shape, context is the `panelContext` getter (lines 74–76, unchanged —
keep it, the helper just consumes its value once at construction per the
locked trade-off above).

Replace field (line 71):

```ts
protected readonly isPanelOpen_: WritableSignal<boolean>
private readonly togglePanelState_: () => void
```

Replace constructor body (lines 78–94):

```ts
constructor() {
  const panel = useResponsivePanelState(this.panelContext)
  this.isPanelOpen_ = panel.isPanelOpen_
  this.togglePanelState_ = panel.togglePanel

  this.buildEditForm()
  useListState('equipment', [
    { urlParam: 'q',           signal: this.searchQuery_,        serializer: StringParam },
    { urlParam: 'categories',  signal: this.selectedCategories_, serializer: StringSetParam },
    { urlParam: 'consumable',  signal: this.consumableFilter_,   serializer: NullableBooleanParam },
  ])
}
```

Replace `togglePanel()` (lines 274–277):

```ts
protected togglePanel(): void {
  this.togglePanelState_()
}
```

- [ ] M2c-1 Apply the edits above
- [ ] M2c-2 `ng build` passes

#### M2d `inventory-product-list.component.ts`

**File:** `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts`

This page already has the correct initial-check + SSR-guard behavior; this
edit is pure dedup (removes the last copy-pasted `afterNextRender` block, no
behavior change).

Replace field (line 89):

```ts
// before
protected isPanelOpen_ = signal<boolean>(getPanelOpen('inventory'))
// after
protected readonly isPanelOpen_: WritableSignal<boolean>
private readonly togglePanelState_: () => void
```

Update the import on line 29:

```ts
// before
import { getPanelOpen, setPanelOpen } from 'src/app/core/utils/panel-preference.util'
// after
import { useResponsivePanelState } from 'src/app/core/utils/panel-preference.util'
```

Replace constructor body (lines 129–145):

```ts
constructor() {
  const panel = useResponsivePanelState('inventory')
  this.isPanelOpen_ = panel.isPanelOpen_
  this.togglePanelState_ = panel.togglePanel

  useListState('inventory', [
    { urlParam: 'q',        signal: this.searchQuery_,    serializer: StringParam },
    { urlParam: 'sort',     signal: this.sortBy_,         serializer: NullableStringParam },
    { urlParam: 'order',    signal: this.sortOrder_,      serializer: StringParam },
    { urlParam: 'filters',  signal: this.activeFilters_,  serializer: FilterRecordParam },
    { urlParam: 'lowStock',    signal: this.lowStockOnly_,     serializer: BooleanParam },
    { urlParam: 'nutrition',   signal: this.nutritionFilter_,  serializer: StringParam },
  ])
}
```

Replace `onPanelToggled()` (lines 235–238):

```ts
protected onPanelToggled(): void {
  this.togglePanelState_()
}
```

- [ ] M2d-1 Apply the edits above
- [ ] M2d-2 `ng build` passes

#### M2e `recipe-book-list.component.ts`

**File:** `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts`

Same shape as Inventory (already has the correct check) — pure dedup.

Replace field (line 76):

```ts
protected readonly isPanelOpen_: WritableSignal<boolean>
private readonly togglePanelState_: () => void
```

Replace constructor body (lines 93–113, keep every existing `useListState`
row exactly as-is, only swap the panel init + delete the old
`afterNextRender` block):

```ts
constructor() {
  const panel = useResponsivePanelState('recipe-book')
  this.isPanelOpen_ = panel.isPanelOpen_
  this.togglePanelState_ = panel.togglePanel

  if (!this.embeddedInDashboard) {
    useListState('recipe-book', [
      // ...keep every existing row here unchanged (urlParam/signal/serializer for
      // q, dateFrom, dateTo, dateByUpdated, favorites, etc.)
    ])
  }
}
```

Replace `togglePanel()` (lines 220–223):

```ts
protected togglePanel(): void {
  this.togglePanelState_()
}
```

- [ ] M2e-1 Apply the edits above (preserve the full existing `useListState` row list — do not drop any params)
- [ ] M2e-2 `ng build` passes
- [ ] M2f Commit: `refactor(sidebar): migrate all 5 list pages to shared responsive panel-state helper`

---

### M3 — Manual verification

No unit tests exist for this state today; verify via dev server + browser
(gstack `/browse`, not raw Playwright) on each of the 5 pages:
Inventory, Recipe Book, Venues, Suppliers, Equipment.

**Desktop (≥1025px), no saved preference (clear `localStorage` key `list-panel:<context>` first):**
- [ ] M3a Panel renders **open** on first load (all 5 pages)
- [ ] M3b Manually collapsing it, then reloading the page, keeps it collapsed (persistence still works)

**Mobile (≤768px, e.g. resize to 375px or use device emulation), same no-saved-preference state:**
- [ ] M3c Panel renders **closed** on first load (all 5 pages — this is the regression that motivated the audit)
- [ ] M3d Open via hamburger/toggle, then swipe-close / backdrop-click / X still work exactly as before (no CSS touched, just confirming the toggle signal still drives them)

**Resize behavior, per page:**
- [ ] M3e Start desktop with panel open → resize into mobile width → panel auto-closes
- [ ] M3f Resize back out to desktop width → panel restores to the persisted desktop preference (previously: stayed closed — this is bug #4's fix)

**Regression check:**
- [ ] M3g No new console errors on any of the 5 pages (especially SSR-guard related on Venues)
- [ ] M3h Visual appearance (panel width, colors, animation, border-radius, close icon) is byte-for-byte unchanged from before this plan — confirms the "same design" constraint held

## Validation

This plan is done when M1–M3 are all checked and `ng build` is green.
Report back per `docs/agent/job-validation.md` — HOW TO VALIDATE bullets
(the M3 checklist above) before asking for JOB DONE sign-off.
