# Tech Debt Report — foodVibe — 2026-03-10

Generated per [.assistant/skills/techdebt/SKILL.md](.assistant/skills/techdebt/SKILL.md).

---

## Critical (Fix Now)

- None identified this run.

---

## High

- [x] **[menu-intelligence.page.ts]** (fixed): Replaced `any` with `MenuSectionFormRaw` for raw form section in `buildEventFromForm()`.
- [x] **[recipe-ingredients-table.component.ts]** (fixed): Replaced `onItemSelected(item: any, ...)` with `SearchableItem`; unit now uses `base_unit_` / `yield_unit_` by type.

---

## Medium

- [ ] **Files >300 lines (20 files)**: recipe-builder.page.ts (1020), menu-intelligence.page.ts (1053), export.service.ts (1073), menu-intelligence.page.scss (773), cook-view.page.ts (618), product-form (TS/SCSS/HTML), recipe-book-list (TS/SCSS), recipe-header (TS/SCSS), metadata-manager (TS/SCSS), cook-view.page.scss (582), inventory-product-list (366), kitchen-state.service (378), dashboard-overview.scss (379), recipe-workflow.scss (389), product-form.component.html (305), menu-library-list.scss (335), metadata-registry.service (339), menu-intelligence.page.html (356). — Consider splitting by feature or extracting shared modules; see project standard ~300 lines.
- [ ] **Hardcoded Hebrew in templates**: metadata-manager.page.component.html, translation-key-modal.component.html, label-creation-modal.component.html, unit-creator.component.html — Prefer `translatePipe` and dictionary keys for i18n consistency and future LTR/RTL.

---

## Low

- [ ] **[ingredient-search.component.scss:6]** / **[recipe-ingredients-table.component.scss:205]** / **[recipe-header.component.scss:148]**: TODO to remove `::ng-deep` when scrollable-dropdown/custom-select expose slots or engine class. — Track when upstream components support styling; then remove ::ng-deep.
- [ ] **[app.component.spec.ts:22–24]**: Stub component uses `@Input()`/`@Output()` instead of `input()`/`output()`. — Low impact (test-only); update when touching this spec.
- [ ] **[recipe-header.component.ts:183]** / **spec files**: `any` in callback params (e.g. `(c: any) => c.unit`). — Prefer minimal interface or type for callback args.

---

## Metrics

| Metric | Count |
|--------|--------|
| Total TODOs (in code) | 3 |
| Duplicate blocks (5+ line) | Not scanned (use Explore agent for full pass) |
| Files >300 lines | 20 |
| Prohibited patterns (@Input/@Output, BehaviorSubject, style=, any) | 1 spec stub + 4+ `any` usages; 0 BehaviorSubject; 0 style= |
| Hardcoded Hebrew (HTML) | 4+ files |

---

## Integration

- No new patterns suggested for `.assistant/copilot-instructions.md` this run.
- For cleanup: consider Phase 1 (duplicate code) via Explore agent; then update-docs after fixes.
