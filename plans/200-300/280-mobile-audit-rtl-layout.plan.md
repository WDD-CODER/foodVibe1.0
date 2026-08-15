# Plan 280 — Mobile audit fix: rtl-layout

## Problem
Several components use physical `left`/`right` CSS instead of logical `inset-inline-*`, causing icons and controls to appear on the wrong side in RTL Hebrew layout:
- Recipe-book-list filter panel close button is at physical left (far from trigger at physical right)
- Recipe-book-list search icon is at inline-start (right) instead of inline-end (left)
- Suppliers-add page title has zero right-side margin — rightmost character clips at viewport edge
- Venues-add "הוסף שורה" button: plus icon is to the left of Hebrew label (should trail text in RTL)
- Trash-restore `.trash-item-actions` has asymmetric margin (physical `margin-right: auto` wrong in RTL)

**Note:** `auth-modal.component.scss` `.password-toggle` already uses `inset-inline-end: 0.5rem` — this is CORRECT and must NOT be changed.

## Scope
**Files to modify:**
- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` — filter close button position + search icon position
- `src/app/pages/suppliers/` SCSS — page title safe margin
- `src/app/pages/venues/` SCSS — "הוסף שורה" icon order
- `src/app/pages/trash/trash.page.scss` — `.trash-item-actions` margin

**Out of Scope:**
- No changes to `auth-modal.component.scss`
- No changes to FAB (covered in plan 276)
- No behavior changes — visual RTL fixes only

## Defects covered
| Flow | Selector | Fix approach |
|---|---|---|
| recipe-book-list | filter panel × close button | Confirm selector in SCSS; change `left: X` → `inset-inline-end: X` |
| recipe-book-list | search icon in search field | Confirm selector; change `right: X` → `inset-inline-end: X` (icon at inline-end = left in RTL) |
| suppliers-add | page title | Add `padding-inline-end: 0.75rem` to title/h1 at mobile |
| venues-add | `.הוסף שורה` button icon | Add `flex-direction: row-reverse` or use `order` to trail icon after text in RTL |
| trash-restore | `.trash-item-actions` | Change `margin-right: auto` → `margin-inline-end: auto` |

## Requirements
1. Filter close button at physical right (inline-start) — same edge as its trigger button
2. Search icon at physical left edge of field (inline-end) in RTL
3. Suppliers page title has ≥ 12px right-side inset — no character touching viewport edge
4. "הוסף שורה" plus icon trails Hebrew label text in RTL
5. `ng build` passes with 0 errors

## Atomic Sub-tasks
- [ ] Read `.claude/skills/cssLayer/SKILL.md` before editing any `.scss`
- [ ] Read `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` (full file) — locate filter close button selector and search icon selector; apply `inset-inline-end` / `inset-inline-start` fixes
- [ ] Read `src/app/pages/suppliers/` SCSS files — locate page title or h1 selector; add `@media (max-width: 620px) { padding-inline-end: 0.75rem; }` (or ensure `padding-inline: 1rem` on wrapper)
- [ ] Read `src/app/pages/venues/` SCSS files — locate "הוסף שורה" button selector; fix icon order for RTL
- [ ] `src/app/pages/trash/trash.page.scss` line 164 — change `.trash-item-actions { margin-right: auto; }` → `margin-inline-end: auto;`
- [ ] Run `ng build` — must be 0 errors
- [ ] Re-run `/mobile-flow-audit --only recipe-book-list --only suppliers-add --only venues-add --only trash-restore`
- [ ] Update TRIAGE.md — mark Cluster 6 (rtl-layout) defects as ✓ resolved (plan 280)

## Validation (mobile)
- Viewport 375×812 RTL
- Recipe-book-list: open filter panel → close button (×) is at physical right, near the toggle
- Recipe-book-list: search field → magnifier icon at left edge of field, text flows right to left
- Suppliers-add: page title "הוסף ספק" — rightmost character has visible gap from viewport edge
- Venues-add: "הוסף שורה" → plus icon is to the RIGHT of Hebrew label (trailing in RTL)
- Trash: `.trash-item-actions` visually balanced margins

## Notes
- If `.scss` file is touched → `.claude/skills/cssLayer/SKILL.md` first
- Logical properties required throughout: `inset-inline-start`, `inset-inline-end`, `margin-inline-*`, `padding-inline-*`
- Do NOT touch `auth-modal.component.scss` — password toggle is already correct
