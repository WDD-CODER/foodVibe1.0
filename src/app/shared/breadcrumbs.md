# shared — Breadcrumbs

## Purpose

Reusable standalone components, modals, and list/table primitives used across pages. Modal behavior is coordinated by matching services in `core/services/` (or colocated `*.service.ts` in this folder).

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| add-item-modal/ | Generic add-item flow | AddItemModalComponent |
| add-equipment-modal/ | Add equipment dialog | AddEquipmentModalComponent |
| ai-menu-modal/ | AI-drafted menu modal + service | AiMenuModalComponent, AiMenuModalService |
| ai-product-modal/ | AI-drafted product modal + service | AiProductModalComponent, AiProductModalService |
| ai-recipe-modal/ | AI-drafted recipe modal + service | AiRecipeModalComponent, AiRecipeModalService |
| approve-stamp/ | Approval stamp UI | ApproveStampComponent |
| column-carousel/ | Mobile column carousel for list tables (header + cells, shared index) | ColumnCarouselGroupDirective, ColumnCarouselHeaderComponent, ColumnCarouselCellComponent, ColumnSlideDirective |
| change-popover/ | Inline change preview popover | ChangePopoverComponent |
| chip-search-dropdown/ | Searchable chip-select dropdown | ChipSearchDropdownComponent |
| confirm-modal/ | Confirm/cancel | ConfirmModalComponent |
| counter/ | Numeric counter control | CounterComponent |
| custom-multi-select/ | Multi-select CVA | CustomMultiSelectComponent |
| custom-select/ | Select CVA | CustomSelectComponent |
| empty-state/ | Empty list placeholder | EmptyStateComponent |
| export-preview/ | Export preview panel | ExportPreviewComponent |
| export-toolbar-overlay/ | Export toolbar overlay | ExportToolbarOverlayComponent |
| floating-info-container/ | Floating info host | FloatingInfoContainerComponent |
| global-specific-modal/ | Global vs specific choice | GlobalSpecificModalComponent |
| label-creation-modal/ | Label editor + `LabelCreationModalService` | LabelCreationModalComponent |
| list-selection/ | Row selection + `ListSelectionState` | ListRowCheckboxComponent, ListSelectionState |
| list-shell/ | Reusable list/table shell | ListShellComponent |
| loader/ | Loading indicator | LoaderComponent |
| nutrition-badge/ | Per-100g nutrition badge/tooltip | NutritionBadgeComponent |
| quick-add-product-modal/ | Quick add product | QuickAddProductModalComponent |
| quick-edit-product-modal/ | Quick edit product modal | QuickEditProductModalComponent |
| quick-edit-product-panel/ | Quick edit product inline panel | QuickEditProductPanelComponent |
| rating-stars/ | Star rating control | RatingStarsComponent, StarState |
| restore-choice-modal/ | Restore from trash | RestoreChoiceModalComponent |
| row-actions-menu/ | Per-row actions menu | RowActionsMenuComponent |
| scaling-chip/ | Recipe scaling chip | ScalingChipComponent |
| scrollable-dropdown/ | Scrollable dropdown | ScrollableDropdownComponent |
| selection-bar/ | Bulk selection bar | SelectionBarComponent |
| translation-key-modal/ | Hebrew → English key | TranslationKeyModalComponent |
| unit-creator/ | Unit registry editor | UnitCreatorModal |
| venue-link-chip/ | Venue link chip | VenueLinkChipComponent |
| version-history-panel/ | Version history UI | VersionHistoryPanelComponent |

## Architecture Context

Shared between pages (inventory, recipe-builder, metadata-manager, menu flows, etc.). Prefer extending these before adding one-off dialogs.

## Patterns & Conventions

- Standalone components; `inject()` for services.
- SCSS: project tokens and `@layer` per cssLayer skill.

## Dependencies

- **Imports from**: `../core/services`, `../core/models`, `@angular/core`, `@angular/forms` (CVA components).
- **Used by**: Page components under `pages/*`.

## Development Notes

- New cross-page modal: implement here + service in `core/services/` (or colocated service file), register usage from pages.
- Translation-key flows: reuse `translation-key-modal/` per copilot-instructions §7.2.

## Recent Changes

- 2026-09-27 (nightly-maintenance): Synced 10 dirs that existed on disk but were undocumented — `ai-menu-modal/`, `ai-product-modal/`, `ai-recipe-modal/`, `chip-search-dropdown/`, `nutrition-badge/`, `quick-edit-product-modal/`, `quick-edit-product-panel/`, `rating-stars/`, `row-actions-menu/`, `venue-link-chip/`.
- 2026-03-22: Full directory sync (list shell, export, loader, supplier/quick-add modals, selection primitives, etc.).

---
*Last updated: 2026-09-27*
*Updated by: breadcrumb-navigator*
