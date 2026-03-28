# Tech Debt Report — foodVibe — 2026-03-12

Generated per [.claude/skills/techdebt/SKILL.md](.claude/skills/techdebt/SKILL.md).

## Critical (Fix Now)

- [x] **[product-form.component.scss:202]**: `.scaling-box` had `backdrop-filter: var(--blur-glass)` creating a stacking context so custom-select dropdown was hidden behind the next row — Fixed by removing backdrop-filter (comment left in file).

## High / Medium / Low Priority

- [ ] **[recipe-header.component.scss:148]**: TODO remove ::ng-deep when dropdown is slotted or uses engine class
- [ ] **[recipe-ingredients-table.component.scss:205]**: TODO remove ::ng-deep when custom-select supports trigger styling via input
- [ ] **[ingredient-search.component.scss:6]**: TODO remove ::ng-deep when scrollable-dropdown exposes a slot or engine class
- [ ] **Style**: `app.component.spec.ts` uses `@Input()` / `@Output()` (test stub; lower priority)
- [ ] **Types**: A few `any` in specs and one in recipe-header (e.g. `(c: any) =>`); consider typing where non-trivial

## Spec coverage (add/update .spec.ts)

From working tree (modified or new):

- [ ] **src/app/core/services/add-supplier-flow.service.ts**: ensure spec exists and is adequate
- [ ] **src/app/core/services/translation-key-modal.service.ts**: ensure spec exists and is adequate
- [ ] **src/app/core/guards/pending-changes.guard.ts**: already has .spec.ts (modified)
- [ ] **src/app/shared/translation-key-modal/translation-key-modal.component.ts**: ensure spec exists and is adequate
- [ ] **src/app/shared/custom-select/custom-select.component.ts**: ensure spec exists and is adequate (dropdown behavior)
- [ ] **src/app/shared/unit-creator/unit-creator.component.ts**: ensure spec exists and is adequate
- [ ] **src/app/pages/inventory/components/product-form/product-form.component.ts**: already has .spec.ts (modified)
- [ ] **src/app/pages/metadata-manager/metadata-manager.page.component.ts**: ensure spec exists and is adequate
- [ ] **src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts**: ensure spec exists and is adequate

## Translation (Phase 6)

Hardcoded Hebrew in HTML (should use translatePipe where user-facing): multiple files including product-form.component.html, unit-creator.component.html, metadata-manager.page.component.html, label-creation-modal, version-history-panel, trash.page.html, translation-key-modal. Verify dictionary keys and replace with `'key' | translatePipe` where appropriate.

## File size (Phase 4)

Files over 300 lines (project standard: keep under 300):

| Lines | File |
|------:|------|
| 1245 | src/app/core/services/export.service.ts |
| 1087 | src/app/pages/menu-intelligence/menu-intelligence.page.ts |
| 1007 | src/app/pages/recipe-builder/recipe-builder.page.ts |
| 797 | src/app/pages/menu-intelligence/menu-intelligence.page.scss |
| 751 | src/app/pages/inventory/components/product-form/product-form.component.ts |
| 639 | src/app/pages/cook-view/cook-view.page.ts |
| 604 | src/app/pages/inventory/components/product-form/product-form.component.scss |
| 582 | src/app/pages/cook-view/cook-view.page.scss |
| 554 | src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss |
| 484 | src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts |
| 483 | src/app/pages/recipe-builder/recipe-builder.page.scss |
| 410 | src/app/pages/metadata-manager/metadata-manager.page.component.scss |
| 405 | src/app/pages/metadata-manager/metadata-manager.page.component.ts |
| 394 | src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts |
| 389 | src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss |
| 379 | src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss |
| 378 | src/app/core/services/kitchen-state.service.ts |
| 372 | src/app/pages/menu-intelligence/menu-intelligence.page.html |
| 362 | src/app/core/services/metadata-registry.service.ts |
| 359 | src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts |
| 350 | src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts |
| 332 | src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss |
| 311 | src/app/pages/inventory/components/product-form/product-form.component.html |

## Metrics

- Total TODOs (in code): 3 (::ng-deep removal)
- Duplicate blocks: not scanned in this run
- Files >300 lines: 23
- Prohibited patterns: @Input/@Output in 1 spec stub; a few `any` in specs/one component
- Hardcoded Hebrew: multiple files (see Translation section)
- Specs to add/update: 9 (from changed files list)
