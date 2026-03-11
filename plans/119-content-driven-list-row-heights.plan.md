# Content-driven list row heights

## Overview

Fix list-shell grid and cell styling so every row's height is determined by its content (name, labels, allergens, etc.) in a unified way. Recipe list name cells wrap and grow instead of staying ~57px; inventory-style variation is consistent and intentional.

## Why it behaved the way it did

**Grid structure:** The list uses a single grid for the table body. Rows use `display: contents` (styles.scss `.c-list-row`), so the **cells** are the direct children of `.table-body`. Row height is controlled by `grid-template-rows` / `grid-auto-rows` on `.table-body`.

**Recipe list stuck at ~57px:** The name cell is a flex container (`.c-list-body-cell`: `display: flex`, `align-items: center`). The only child is a text node with `min-width: auto`, so it doesn't shrink and the text stays one line; `.col-name` had `overflow: hidden` so it clipped. The cell never grew in height.

**Inventory 135px etc.:** Some cells (e.g. supplier) have content that wraps, so those cells are tall and the row grows. The fix was to make the name column allow wrapping so it can drive row height everywhere.

## Implemented changes

### 1. Row sizing in list-shell (unified)

**File:** `src/app/shared/list-shell/list-shell.component.scss`

- Replaced `grid-template-rows: repeat(auto-fit, minmax(auto, 200px))` with `grid-template-rows: none` and `grid-auto-rows: auto`.
- Every row is now content-sized; no fixed track pattern or cap.

### 2. Name column: allow text to wrap

**File:** `src/app/shared/list-shell/list-shell.component.scss`

- `.table-body .col-name`: added `display: block`, `overflow-wrap: break-word`, `text-align: start`; kept `overflow: hidden`.
- Name cell behaves as a block so text wraps naturally; cell and row grow with content.

## Result

- **Recipe list:** Name text wraps; name cell and row grow with content instead of staying ~57px.
- **Inventory / others:** Same grid behavior; rows grow when labels, supplier, etc. wrap; no regression.
- **Unified:** One row-sizing rule (content-based) and one name-column rule in list-shell for all lists.
