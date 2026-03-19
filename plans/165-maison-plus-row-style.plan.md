# Execute 2.3 Maison Plus — Row style

## Scope

- **Goal:** Each preparation row in dish mode (prep workflow) has clear separation and hover.
- **Target file:** [src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss)
- **Selectors:** `.prep-flat-grid` and `.prep-grid-row` (desktop block ~76–140, and mobile override ~357–396).

## Current state

- **Desktop** (`.prep-grid-row`): Already has `border-block-end: 1px solid var(--border-default)`, `padding-inline: 1rem`, `padding-block: 0.5rem`, and `&:hover { background: var(--bg-glass); }`.
- **Mobile** (inside `@media (max-width: 768px)`): Override sets `padding-inline: 0.75rem`, `padding-block: 0.75rem` and a different grid; no explicit row border or hover in that block (inherits from base .prep-grid-row except where overridden).
- **Global tokens:** [src/styles.scss](src/styles.scss) has `--border-row`, `--border-default`, `--bg-glass-hover`; no `--space-sm` or `--color-border-subtle` / `--color-bg-hover`. PRD names are suggestions ("or token"); we map to existing tokens or add minimal new ones.

## Token mapping (cssLayer three-tier)

- **Border:** Use existing `var(--border-row)` for row separation (subtle). No new token.
- **Padding:** Add a single global token `--space-sm` in `:root` (e.g. `0.5rem`) and use it for row padding so the PRD "row padding var(--space-sm) (or token)" is satisfied and reusable.
- **Hover:** Use existing `var(--bg-glass-hover)` for row hover (already used elsewhere for hover states). No new token.

## Execution steps

1. **Read and apply cssLayer**  
   Read [.claude/skills/cssLayer/SKILL.md](.claude/skills/cssLayer/SKILL.md). Before editing SCSS: (1) Read `src/styles.scss`; (2) Reuse `:root` variables; (3) Use Five-Group vertical rhythm and blank lines between groups; (4) Use `var(--*)` and rem/em.

2. **Add global space token**  
   In [src/styles.scss](src/styles.scss) inside `:root`, add a spacing scale entry, e.g. `--space-sm: 0.5rem;`.

3. **Update desktop `.prep-grid-row`**  
   In [recipe-workflow.component.scss](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss) (block ~103–140):
   - Set row border to `border-block-end: 1px solid var(--border-row)` (clear separation, subtle).
   - Set padding to `var(--space-sm)` for block and inline.
   - Set hover to `background: var(--bg-glass-hover);`.
   - Keep layout/dimensions/content/structure/effects grouping per cssLayer; ensure one blank line between groups.

4. **Update mobile `.prep-flat-grid .prep-grid-row`**  
   In the same file, inside the `@media (max-width: 768px)` block (~357–396):
   - Set padding to `var(--space-sm)` for block and inline so both viewports are consistent.
   - Add `border-block-end: 1px solid var(--border-row);` and `&:last-child { border-block-end: none; }` if not inherited; add `&:hover { background: var(--bg-glass-hover); }` so mobile rows get hover feedback.

5. **Verify**  
   - Build: `ng build`.  
   - Manually check recipe-builder in both desktop and mobile widths: prep (dish) workflow rows show border between rows, consistent padding, and hover background.

## Files to touch

| File | Action |
|------|--------|
| [src/styles.scss](src/styles.scss) | Add `--space-sm: 0.5rem;` in `:root`. |
| [src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss) | Update `.prep-grid-row` and the mobile override for border, padding, hover per above. |

## Out of scope

- No HTML or TS changes.
- No changes to cook-view `.prep-row` (that is the read-only cook view; this PRD item is recipe-workflow dish/prep rows only).
