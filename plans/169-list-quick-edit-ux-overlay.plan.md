# Plan 169 — List quick-edit UX: overlay + first-click open

**Chosen approach:** Option A — render CustomSelect dropdown in an overlay attached to `body` (Angular CDK Overlay) so it is never clipped by carousel or list cells. Plus: first click on editable text opens the custom select with dropdown already open.

---

## 1. Confirmation modal only on row blur

- Keep current behavior: one "Save these changes?" when focus **leaves the row** (not on each field change). Already implemented in equipment-list via `onRowFocusOut`.
- When adding quick-edit to other list-shell lists, use the same pattern: single `(focusout)` on row, single confirm modal, batch save or discard.

---

## 2. First click: text becomes custom select with dropdown open

- In [CustomSelectComponent](src/app/shared/custom-select/custom-select.component.ts), add input `openOnShow = input<boolean>(false)`.
- When `openOnShow()` is true, call `openDropdown()` after the view is ready (e.g. `effect` that runs when `openOnShow()` is true, using `queueMicrotask` or `afterNextRender` so the trigger exists).
- In list quick-edit templates (equipment and others), pass `[openOnShow]="true"` on the inline `app-custom-select` instances.

---

## 3. Carousel: dropdown in overlay (Option A)

**Decision:** Use **Angular CDK Overlay** to render the dropdown in an overlay attached to `body`, positioned relative to the trigger. One fix for carousel, modals, and narrow containers.

**Implementation outline:**

- Add `useOverlay = input<boolean>(false)` (or default true for all to simplify; can default true so all dropdowns use overlay).
- Inject `Overlay` from `@angular/cdk/overlay`, `ViewContainerRef`, and keep `ElementRef` for the trigger origin.
- When `open()` becomes true:
  - Create overlay with `FlexibleConnectedPositionStrategy` (or `OverlayPositionBuilder`) anchored to the trigger element (e.g. triggerRef.nativeElement).
  - Position: below the trigger, horizontal origin aligned (e.g. `originX: 'start'`, `originY: 'bottom'`, `overlayX: 'start'`, `overlayY: 'top'`), optional minWidth = trigger width.
  - Create a template portal that renders the same options list (reuse ScrollableDropdownComponent + option buttons); attach to overlay.
  - No backdrop; close on outside click via CDK's outside click handling or existing clickOutside.
- When `open()` becomes false: detach overlay and destroy.
- Handle scroll/resize: update position (CDK overlay can do this with `withScrollStrategy` and reposition on scroll).
- Ensure keyboard (Arrow Up/Down, Enter, Escape) and option click still work inside the overlay panel (same handlers; focus moves to overlay when open).

**Files:**

- [custom-select.component.ts](src/app/shared/custom-select/custom-select.component.ts): Overlay creation, position strategy, portal attach/detach, `openOnShow` effect.
- [custom-select.component.html](src/app/shared/custom-select/custom-select.component.html): When using overlay, keep trigger in place; render dropdown content via portal (ng-template) so it can be attached to overlay. Optionally keep inline dropdown when `useOverlay()` is false for backward compatibility, or always use overlay.
- [custom-select.component.scss](src/app/shared/custom-select/custom-select.component.scss): Styles for overlay panel (same as current dropdown list) so they apply when content is in overlay.
- Add `OverlayModule` (or equivalent) to CustomSelectComponent imports if not already provided at app level.

---

## 4. Apply across all list-shell containers

- Equipment list: add `[openOnShow]="true"` to the two quick-edit CustomSelects; confirm row-blur-only and that dropdown is visible in carousel (overlay).
- When adding quick-edit to inventory, supplier, venue, recipe-book: same pattern, `[openOnShow]="true"`, row focusout, single confirm.

---

## 5. Atomic sub-tasks

1. CustomSelect: add `openOnShow` input; effect to call `openDropdown()` when `openOnShow()` is true after view ready.
2. CustomSelect: implement CDK Overlay for dropdown (position strategy, portal, attach/detach, outside click, keyboard).
3. Equipment list: add `[openOnShow]="true"` to category and is_consumable quick-edit CustomSelects.
4. Verify: first click opens dropdown; carousel (mobile) shows dropdown in overlay; row blur shows one confirm modal.

---

## 6. Verification

- **First click:** Click category (or consumable) text once → custom select appears with dropdown open; Arrow Up/Down and Enter work.
- **Carousel (mobile width):** Resize to &lt; 768px, click category in a row → dropdown opens and is fully visible (rendered in overlay, not clipped).
- **Row blur only:** Edit two fields in one row, Tab or click out → one "Save these changes?" modal.
