# Plan 055 — SCSS cssLayer Full-Project Audit and Fix

## Reference (mandatory before editing any SCSS)

- **Skill**: [.claude/skills/cssLayer/SKILL.md](.claude/skills/cssLayer/SKILL.md)
- **Global tokens**: [src/styles.scss](src/styles.scss) (`:root` and `.c-*` engines)

## Rules summary

- **Five-Group Vertical Rhythm** (Skill §4): Layout → Dimensions → Content/Typo → Structure → Effects; exactly one blank line between groups.
- **Three-tier tokens**: Global (`:root`), component-scoped (`:host { --local: value }`), or no token (1–2 uses).
- **Logical properties**: `margin-inline`, `padding-block`, `border-block-end`, `inset-inline-start`, etc. No `left`/`right`/`margin-left`/`padding-right` in rule bodies.
- **Values**: Use `var(--...)` and `rem`/`em`. Hex/px only in token definitions or one-off (no-token) values.
- **Engine reuse**: Prefer `.c-*` engines from styles.scss over one-off classes.

---

## File groups and fixes

### Group A — Critical (raw hex, px, non-logical, rhythm)

| File | Fixes |
|------|--------|
| `src/app/pages/inventory/components/product-form/product-form.component.scss` | Replace raw hex with tokens; non-logical → logical; px → rem/tokens; Five-Group rhythm; remove !important and dead comments; note ::ng-deep |
| `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss` | Raw hex → tokens; px → rem; non-logical → logical; rhythm |
| `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.scss` | Raw hex → tokens; px → rem; non-logical → logical; rhythm |
| `src/app/pages/menu-intelligence/menu-intelligence.page.scss` | Define or fix --color-ornament, --color-frame-ink, --border-warm; raw hex → tokens; px → rem; non-logical → logical; rhythm |
| `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss` | Raw hex → tokens; px → rem; rhythm; note ::ng-deep |
| `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.scss` | Raw hex → tokens; px → rem; rhythm; note ::ng-deep |

### Group B — Moderate (rhythm, minor tokens/logical)

- `dashboard-overview.component.scss` — rhythm, margin-block-start
- `cook-view.page.scss` — remove !important; fix @media (min-width: var(...)); define --cv-shadow-glow, --cv-border-amber; rhythm
- `trash.page.scss` — raw hex → tokens; logical; rhythm
- `metadata-manager.page.component.scss` — margin-block-start; rhythm
- `recipe-workflow.component.scss` — remove redundant font-family; rhythm
- `recipe-book-list.component.scss` — rhythm; note ::ng-deep
- `inventory-product-list.component.scss` — rhythm

### Group C — Minor (rhythm, logical)

- `header.component.scss`, `footer.component.scss`, `hero-fab.component.scss`, `user-msg.component.scss` — rhythm; logical where needed
- `app.component.scss` — rhythm
- `dashboard.page.scss`, `equipment.page.scss`, `venues.page.scss` — rhythm; border-block-end
- `equipment-form`, `venue-form`, `equipment-list`, `venue-list` — rhythm; border-block-start/end
- `menu-library.page.scss` — replace --bg-warm with --bg-body (token missing in :root)
- `menu-library-list.component.scss`, `recipe-builder.page.scss` — rhythm

### Group D — No changes

- `inventory.page.scss`, `recipe-book.page.scss`, `add-item-modal`, `add-equipment-modal`, `scrollable-dropdown.component.scss`

### Group E — Shared (rhythm, indentation)

- `confirm-modal`, `translation-key-modal`, `restore-choice-modal`, `label-creation-modal`, `global-specific-modal`, `unit-creator`, `version-history-panel`, `custom-select`, `loader` — rhythm; fix root indentation in label-creation and unit-creator

---

## Per-selector checklist (for executor)

1. Reorder properties into five groups; one blank line between groups.
2. Replace raw hex/px with var(--) or rem where a token exists or add :host token.
3. Replace non-logical properties with logical equivalents.
4. Remove !important where possible.
5. Delete commented-out code blocks.
6. Add `// TODO: remove ::ng-deep` where ::ng-deep is kept for now.
