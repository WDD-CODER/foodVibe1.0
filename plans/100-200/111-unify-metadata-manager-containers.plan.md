---
name: Unify metadata manager containers
overview: Unify all sections on the metadata-manager page so they use the same container structure and shared class names (card-desc, card-actions), and consolidate SCSS so one set of rules drives the shared look.
todos: []
isProject: false
---

# Unify Metadata Manager Card Containers

## Current state

- Every section already uses the same **wrapper**: `manager-card` (same box style).
- **Inconsistencies:** Demo and backup use their own description/action class names (`demo-desc`, `backup-desc`, `backup-actions`) and section modifiers (`demo-section`, `backup-section`), so the same visual roles are styled in multiple places.
- Template-driven cards (units, categories, allergens, labels) and the menu-types card use or can use `card-desc`; child components already use `card-desc`, `input-group`, `list-container`.

## Complete token map — what uses what

All tokens are read-only globals from `src/styles.scss`. Nothing new will be added.

**Shared container (`.manager-card`) — already unified, no change:**
- `--bg-glass-strong`, `--border-glass`, `--radius-lg`, `--shadow-glass`, `--blur-glass`

**`.card-title` — already consistent across page + child components:**
- `--border-default` (bottom divider), `--color-text-main` (h2)
- Minor gap: page has `margin-block-end: 1.5rem`, child components use `1rem`. Not changing in this plan.

**`.card-desc` — identical declaration in all 3 child components:**
- `margin: 0 0 1rem; font-size: 0.875rem; color: var(--color-text-muted);`
- On the page it lives under `.menu-types-card` (same values). Moving it up to `.manager-card` level is safe.

**`.input-group` — already on the page and identical in child components:**
- input: `--bg-glass`, `--color-text-main`, `--border-default`, `--radius-md`, `--blur-glass`, `--color-text-muted-light`, `--border-focus`, `--shadow-focus`
- `.btn-add`: `--color-primary`, `--color-text-on-primary`, `--shadow-glow`, `--color-primary-hover`

**`.btn-demo` (demo section) — tokens to preserve exactly:**
- `--bg-glass`, `--text-warning`, `--border-warning`, `--radius-md`, `--blur-glass`, `--bg-warning`
- Note: this is the only place in this file using the `--text-warning` / `--border-warning` / `--bg-warning` family; preserve verbatim.

**`.btn-backup` base — tokens to preserve exactly:**
- `--radius-md`, `--border-default`, `--bg-glass`, `--color-text-main`, `--blur-glass`, `--bg-glass-hover`, `--border-focus`

**`.btn-export` modifier — tokens to preserve exactly:**
- `--color-primary`, `--color-primary-soft`

**`.btn-restore` / `.btn-import` hover — tokens to preserve exactly:**
- `--color-text-muted`

**`.backup-file-input` — hidden input trick, must keep exactly:**
- `position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none;`
- The parent `card-actions` wrapper must have `position: relative` so this hidden absolute element stays contained.

## Target structure (same for every card)

- **card-title** — icon + h2 (already shared)
- **card-desc** — one class, one rule, every card
- **card-actions** — `display: flex; flex-wrap: wrap; gap: 0.75rem; position: relative;` (the `position: relative` is critical for the hidden `backup-file-input`)
- **input-group** — unchanged, used by add-input cards
- **content** — `list-container` or custom content

## 1. HTML changes

**Demo section:** Remove `demo-section` from `<section>`; `demo-desc` → `card-desc`; wrap `<button class="btn-demo">` in `<div class="card-actions">`.

**Backup section:** Remove `backup-section`; `backup-desc` → `card-desc`; `backup-actions` → `card-actions`. Inner button and file-input classes unchanged.

**Menu types:** No template changes. Keep `.menu-types-card`; only remove redundant `.card-desc` block from SCSS.

## 2. SCSS consolidation

- Add `.manager-card .card-desc` and `.manager-card .card-actions` (with `position: relative`).
- Remove `.menu-types-card .card-desc` block.
- Replace `.demo-section` block with `.manager-card .btn-demo` (same token values).
- Replace `.backup-section` block with `.manager-card .btn-backup`, `.btn-export`, `.btn-restore`/`.btn-import`, `.backup-file-input`.

## 3. Child components

No changes. preparation-category-manager, section-category-manager, logistics-baseline-manager already use the same pattern.

## Files touched

- `src/app/pages/metadata-manager/metadata-manager.page.component.html`
- `src/app/pages/metadata-manager/metadata-manager.page.component.scss`

## Verification checklist

- Demo section looks identical (same warning-color button, same desc text style).
- Backup section looks identical (same glass buttons, export blue, hidden file input still works).
- Menu types card looks identical.
- No orphaned class names in HTML.
