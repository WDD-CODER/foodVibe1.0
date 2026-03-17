---
name: Dropdown scroll arrows fix
overview: Fix the scrollable dropdown so the up arrow sits inside the container (like the down arrow) and show each arrow only when the user hovers the corresponding upper or lower part of the dropdown.
todos: []
---

# Dropdown scroll arrows: position and zone-based hover

## Problem

- **Up arrow outside container**: `.c-dropdown__scroll-top` has no explicit `top`/`bottom`, so it is absolutely positioned at its "static" position—i.e. after the list in flow—which places it below the list and outside the visible dropdown box. The down arrow is correct because it has `bottom: 0`.
- **Hover behavior**: Arrows should show only when hovering the relevant part of the dropdown: up arrow when hovering the upper part (and when more to scroll up), down arrow when hovering the lower part (and when more to scroll down).

## Current implementation

- **Component**: [src/app/shared/scrollable-dropdown/scrollable-dropdown.component.html](src/app/shared/scrollable-dropdown/scrollable-dropdown.component.html) — structure is `.c-dropdown` > `.c-dropdown__list` (with `scrollIndicators`) > siblings `.c-dropdown__scroll-top` and `.c-dropdown__scroll-bottom`.
- **Directive**: [src/app/core/directives/scroll-indicators.directive.ts](src/app/core/directives/scroll-indicators.directive.ts) — toggles `can-scroll-up` / `can-scroll-down` on the list based on `scrollTop`, `clientHeight`, `scrollHeight`. No changes needed.
- **Styles**: [src/styles.scss](src/styles.scss) (lines 470–539) — Engine for `.c-dropdown`; scroll indicators are absolutely positioned; visibility is currently "any hover on dropdown" + class on list.

## Approach

1. **Pin up arrow inside container** — In `src/styles.scss`, for `.c-dropdown__scroll-top`, add `top: 0` and `bottom: auto` so it is anchored to the top of `.c-dropdown`. No HTML change.
2. **Zone-based hover** — Add two non-visible "hover zones" (top strip and bottom strip). Show the up arrow only when the **top zone** is hovered and the list has `can-scroll-up`; show the down arrow only when the **bottom zone** is hovered and the list has `can-scroll-down`. Use CSS `:has()` so we can keep the directive only on the list.

## Implementation details

### 1. Position the up arrow (styles only)

In **src/styles.scss**, in the "Scrollable dropdown" Engine block, add for `.c-dropdown__scroll-top`: `top: 0;` and `bottom: auto;`.

### 2. Zone-based hover (HTML + CSS)

**HTML** ([scrollable-dropdown.component.html](src/app/shared/scrollable-dropdown/scrollable-dropdown.component.html)): After `.c-dropdown__list`, add two zone divs (`c-dropdown__scroll-zone--top`, `c-dropdown__scroll-zone--bottom`) with `aria-hidden="true"`. Keep `.c-dropdown__scroll-top` and `.c-dropdown__scroll-bottom` after these zones so the `~` sibling selector works.

**CSS** (same Engine in **src/styles.scss**): Style the zones (absolute, top/bottom, height 2.5rem, z-index 2, pointer-events auto). Replace the current "show on any dropdown hover" rules with zone + `:has()` rules for showing each arrow only when the corresponding zone is hovered and the list has the matching can-scroll class.

## Files to touch

| File | Change |
|------|--------|
| [src/styles.scss](src/styles.scss) | Add `top: 0; bottom: auto` for `.c-dropdown__scroll-top`; add zone selectors and styles; replace dropdown hover rules with zone + `:has()` visibility rules. |
| [src/app/shared/scrollable-dropdown/scrollable-dropdown.component.html](src/app/shared/scrollable-dropdown/scrollable-dropdown.component.html) | Insert two zone divs (top, bottom) between `.c-dropdown__list` and the two scroll indicator divs. |
