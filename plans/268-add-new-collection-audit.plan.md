---
name: Add-New Collection Persistence Audit
overview: Audit all 18 "add new item" flows in the app to verify each one persists and re-surfaces the new item in its picker after a hard reload.
isProject: false
---

# Add-New Collection Persistence Audit

## Goal
Audit every "add new item to an existing collection" flow and confirm each one:
(a) persists the new item to the backend, and
(b) immediately re-surfaces it in the picker/dropdown it was added from — including after hard reload and cross-page navigation.

## Rules
- Audit only — zero code changes. Any fix impulse → write as recommended brief.
- Use `/browse` (gstack persistent Chromium) for live round-trips, not Playwright MCP.
- Test values tagged `AUDIT-<collection>-<timestamp>` for easy cleanup.
- Run against local dev environment with real backend (`npm run dev:local`).
- Confirm MONGO_URI points to local Compass before starting.
- Table + per-finding root cause + recommended brief list are the deliverables.

## Collections in Scope (18 flows)
| # | Collection | Page/Component | Picker | Service |
|---|-----------|---------------|--------|---------|
| 1 | Units | quick-add-product-modal | CustomSelectComponent | UnitRegistryService |
| 2 | Units | product-form (base unit) | CustomSelectComponent | UnitRegistryService |
| 3 | Units | product-form (purchase option unit) | CustomSelectComponent | UnitRegistryService |
| 4 | Units | recipe-workflow (step unit) | CustomSelectComponent | UnitRegistryService |
| 5 | Units | recipe-ingredients-table | CustomSelectComponent | UnitRegistryService |
| 6 | Units | cook-view (yield unit) | CustomSelectComponent | UnitRegistryService |
| 7 | Product categories | quick-add-product-modal | CustomSelectComponent | MetadataRegistryService |
| 8 | Product categories | product-form | ChipSearchDropdown | MetadataRegistryService |
| 9 | Suppliers | product-form | native select | SupplierDataService |
| 10 | Allergens | product-form | ChipSearchDropdown | MetadataRegistryService |
| 11 | Recipe labels | recipe-header | CustomMultiSelect | MetadataRegistryService |
| 12 | Preparation categories | recipe-workflow | CustomSelectComponent | PreparationRegistryService |
| 13 | Equipment categories | equipment-list filter | CustomSelectComponent | LOCAL SIGNAL ONLY |
| 14 | Menu event types | menu-intelligence | custom inline dropdown | form patch only |
| 15 | Menu section categories (typed) | menu-intelligence | custom inline dropdown | MenuSectionCategoriesService |
| 16 | Menu section categories (modal) | menu-intelligence | AddItemModal | MenuSectionCategoriesService |
| 17 | New products/ingredients | recipe-builder ingredient-search | inline search | ProductDataService |
| 18 | Equipment | recipe-builder logistics | custom dropdown | EquipmentDataService |

## Atomic Sub-tasks

- [ ] Task 1: Confirm dev server running and MONGO_URI → local Compass; log in as test account
- [ ] Task 2: Create `.claude/audits/add-to-collection-audit.md` with header + 18-row table skeleton
- [ ] Task 3: `/browse` round-trips #1–6 — unit "add new" (AUDIT-unit-<ts>) across all 6 contexts
- [ ] Task 4: `/browse` round-trips #7–8 — product categories in quick-add and product-form
- [ ] Task 5: `/browse` round-trip #9 — suppliers in product-form
- [ ] Task 6: `/browse` round-trip #10 — allergens in product-form
- [ ] Task 7: `/browse` round-trip #11 — recipe labels in recipe-header
- [ ] Task 8: `/browse` round-trip #12 — preparation categories in recipe-workflow
- [ ] Task 9: `/browse` round-trip #13 — equipment categories in equipment-list filter
- [ ] Task 10: `/browse` round-trip #14 — menu event types (add → save → new event → check picker)
- [ ] Task 11: `/browse` round-trips #15–16 — menu section categories (typed + modal)
- [ ] Task 12: `/browse` round-trip #17 — new products via ingredient-search
- [ ] Task 13: `/browse` round-trip #18 — new equipment via recipe-builder logistics
- [ ] Task 14: Fill verdicts, write root causes for non-✅, append "Recommended fix briefs" section
- [ ] Task 15: Document AUDIT-* test data at bottom of audit file for cleanup

## Done When
- `.claude/audits/add-to-collection-audit.md` has all 18 rows with ✅/⚠️/❌ verdicts from live browser tests
- Every non-✅ row has a root cause pointing at file:line
- "Recommended fix briefs" section lists broken/partial flows ranked by severity
- AUDIT-* test data is documented at bottom for manual cleanup
