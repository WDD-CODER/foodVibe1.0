---
name: Sidebar close on breakpoint
overview: When the viewport crosses the first media query (768px), close all list-shell filter sidebars immediately with no animation. Ensure every list that uses the sidebar subscribes to the breakpoint and that the shell disables transitions in that breakpoint.
---

# Sidebar close on first media query (no animation)

## Context

- **First media query**: `$break-mobile: 768px` in [src/styles.scss](src/styles.scss) (line 8). Below this width the app is treated as mobile.
- **Sidebars**: The only shared "sidebar" pattern is the **list-shell filter panel** used by five list components. Each passes `isPanelOpen` into `<app-list-shell>` and reacts to `panelToggle`. The panel is the left filter strip that can collapse; at `max-width: 768px` it becomes an overlay in [list-shell.component.scss](src/app/shared/list-shell/list-shell.component.scss) (lines 286–332).
- **Current behavior**: Venues and inventory already close the panel when the viewport crosses into `(max-width: 768px)` via `matchMedia(...).addEventListener('change', ...)`. Recipe-book, suppliers, and equipment only set the panel closed on init when already narrow; they do **not** listen for resize, so shrinking past 768px leaves the panel open. Panel open/close is animated by default (e.g. `.filter-panel` transition in list-shell SCSS).

## Goal

1. When the user crosses the first media query (screen gets smaller than 768px), **close the sidebar** on all list-shell usages.
2. That close must happen **with no animation** (instant).

## Implementation

### 1. Close on resize for every list-shell consumer

Ensure each of the five list components closes the panel when the viewport enters the breakpoint, using the same pattern as venues/inventory:

- **[recipe-book-list.component.ts](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts)**  
  In `afterNextRender`, add a listener:  
  `window.matchMedia('(max-width: 768px)').addEventListener('change', (e) => { if (e.matches) this.isPanelOpen_.set(false); });`  
  (Currently it only sets closed when `matches` on init.)

- **[supplier-list.component.ts](src/app/pages/suppliers/components/supplier-list/supplier-list.component.ts)**  
  Same: add the `change` listener inside `afterNextRender` so that when `e.matches` the panel closes. Keep the existing init check.

- **[equipment-list.component.ts](src/app/pages/equipment/components/equipment-list/equipment-list.component.ts)**  
  Same: add the `change` listener in `afterNextRender`; on `e.matches` call `this.isPanelOpen_.set(false)`.

Venues and inventory already have this listener; no change needed there.

Use the same query string `'(max-width: 768px)'` everywhere so it matches the first global breakpoint and the list-shell `@media (max-width: 768px)` block. Optional later: extract to a shared constant or small helper to avoid magic numbers.

### 2. No animation when in the breakpoint (list-shell)

In [list-shell.component.scss](src/app/shared/list-shell/list-shell.component.scss), inside the existing `@media (max-width: 768px)` block (starts at line 286), disable transitions for the panel so that when the parent sets `isPanelOpen` to false the panel closes instantly:

- On **`.filter-panel`**: set `transition: none` (override the existing `transition` from the default block so width/min-width/opacity do not animate).
- On **`.panel-content`**: set `transition: none` (override the opacity/transform transition).

This keeps behavior above 768px unchanged (smooth open/close) and makes below 768px close instant. Follow existing [cssLayer SKILL](.assistant/skills/cssLayer/SKILL.md) and keep the file in `@layer components.list-shell`.

### 3. Scope of "all sidebars"

The only toggleable sidebars found are the list-shell filter panels. The inventory page uses a separate "drawer" (`isDrawerOpen_`) for product detail; that is not a list-shell sidebar. This plan covers **all list-shell sidebars**. If you later add other sidebar/drawer UIs that should close at the same breakpoint with no animation, apply the same two ideas: (1) listen to `matchMedia('(max-width: 768px)').addEventListener('change', ...)` and set closed when `e.matches`, and (2) in that component's styles, inside a `@media (max-width: 768px)` block, set `transition: none` on the sidebar element so the close is instant.

## Summary

| Area | Action |
|------|--------|
| recipe-book-list, supplier-list, equipment-list | Add `matchMedia('(max-width: 768px)').addEventListener('change', ...)` in `afterNextRender`; on `e.matches` set `isPanelOpen_` to false. |
| venue-list, inventory-product-list | No change (already have the listener). |
| list-shell.component.scss | Inside `@media (max-width: 768px)`, add `transition: none` for `.filter-panel` and `.panel-content`. |

No new services or shared breakpoint module are required; the change is localized to the three list components that lack the listener and to the list-shell SCSS.
