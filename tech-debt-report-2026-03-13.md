# Tech Debt Report — foodVibe — 2026-03-13

Generated per [.assistant/skills/techdebt/SKILL.md](.assistant/skills/techdebt/SKILL.md).

## Critical (Fix Now)

- None identified in this run.

## High / Medium / Low Priority

- [ ] **[recipe-header.component.scss:152]**: TODO remove ::ng-deep when dropdown is slotted or uses engine class
- [ ] **[recipe-ingredients-table.component.scss:205]**: TODO remove ::ng-deep when custom-select supports trigger styling via input
- [ ] **[ingredient-search.component.scss:6]**: TODO remove ::ng-deep when scrollable-dropdown exposes a slot or engine class
- [ ] **Style**: `app.component.spec.ts` uses `@Input()` / `@Output()` (test stub; lower priority)
- [ ] **Types**: `any` in recipe-header.component.ts (e.g. `(c: any) =>`); product-form `Signal<any>`; unit-registry and metadata-registry `query<any>()`; consider typing where non-trivial. Specs use `(component as any)` and `{} as any` (acceptable for tests; prefer typed stubs where easy.)

## Spec coverage (add/update .spec.ts)

From current working tree (modified):

- [ ] **src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts**: ensure spec is adequate after recent changes
- [ ] **src/app/pages/recipe-builder/recipe-builder.page.ts**: ensure spec is adequate after recent changes

Backlog (from prior report; still relevant):

- [ ] **src/app/core/services/add-supplier-flow.service.ts**: ensure spec exists and is adequate
- [ ] **src/app/core/services/translation-key-modal.service.ts**: ensure spec exists and is adequate
- [ ] **src/app/shared/translation-key-modal/translation-key-modal.component.ts**: ensure spec exists and is adequate
- [ ] **src/app/shared/custom-select/custom-select.component.ts**: ensure spec exists and is adequate (dropdown behavior)
- [ ] **src/app/shared/unit-creator/unit-creator.component.ts**: ensure spec exists and is adequate
- [ ] **src/app/pages/metadata-manager/metadata-manager.page.component.ts**: ensure spec exists and is adequate
- [ ] **src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts**: ensure spec exists and is adequate

## Translation (Phase 6)

Hardcoded Hebrew in HTML (should use translatePipe where user-facing): product-form.component.html, unit-creator.component.html, metadata-manager.page.component.html, label-creation-modal.component.html, version-history-panel.component.html, trash.page.html, translation-key-modal.component.html. Verify dictionary keys and replace with `'key' | translatePipe` where appropriate.

## File size (Phase 4)

Files over 300 lines (project standard: keep under 300):

| Lines | File |
|------:|------|
| 1245 | src/app/core/services/export.service.ts |
| 1144 | src/app/pages/menu-intelligence/menu-intelligence.page.ts |
| 1094 | src/app/pages/recipe-builder/recipe-builder.page.ts |
| 877 | src/app/pages/inventory/components/product-form/product-form.component.ts |
| 797 | src/app/pages/menu-intelligence/menu-intelligence.page.scss |
| 695 | src/app/pages/cook-view/cook-view.page.ts |
| 600 | src/app/pages/inventory/components/product-form/product-form.component.scss |
| 582 | src/app/pages/cook-view/cook-view.page.scss |
| 557 | src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss |
| 484 | src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts |
| 483 | src/app/pages/recipe-builder/recipe-builder.page.scss |
| 412 | src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts |
| 410 | src/app/pages/metadata-manager/metadata-manager.page.component.scss |
| 409 | src/app/pages/metadata-manager/metadata-manager.page.component.ts |
| 389 | src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss |
| 379 | src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss |
| 378 | src/app/core/services/kitchen-state.service.ts |
| 374 | src/app/pages/menu-intelligence/menu-intelligence.page.html |
| 364 | src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts |
| 362 | src/app/core/services/metadata-registry.service.ts |
| 361 | src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts |
| 335 | src/app/pages/inventory/components/product-form/product-form.component.html |
| 332 | src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss |

## Metrics

- Total TODOs (in code): 3 (::ng-deep removal)
- Duplicate blocks: not scanned in this run
- Files >300 lines: 24
- Prohibited patterns: @Input/@Output in 1 spec stub; `any` in 3 source files (recipe-header, product-form, unit-registry, metadata-registry) + multiple specs
- Hardcoded Hebrew: 7+ files (see Translation section)
- Specs to add/update: 2 from current working tree + 7 backlog
