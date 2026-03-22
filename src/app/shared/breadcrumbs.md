# shared — Breadcrumbs

## Purpose

Reusable standalone components, modals, and list/table primitives used across pages. Modal behavior is coordinated by matching services in `core/services/` (or colocated `*.service.ts` in this folder).

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| add-item-modal/ | Generic add-item flow | AddItemModalComponent |
| add-equipment-modal/ | Add equipment dialog | AddEquipmentModalComponent |
| approve-stamp/ | Approval stamp UI | ApproveStampComponent |
| carousel-header/ | Table carousel header row | CarouselHeaderComponent, CarouselHeaderColumnDirective |
| cell-carousel/ | Carousel cells / slides | CellCarouselComponent, CellCarouselSlideDirective |
| change-popover/ | Inline change preview popover | ChangePopoverComponent |
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
| quick-add-product-modal/ | Quick add product | QuickAddProductModalComponent |
| restore-choice-modal/ | Restore from trash | RestoreChoiceModalComponent |
| scaling-chip/ | Recipe scaling chip | ScalingChipComponent |
| scrollable-dropdown/ | Scrollable dropdown | ScrollableDropdownComponent |
| selection-bar/ | Bulk selection bar | SelectionBarComponent |
| supplier-modal/ | Supplier picker | SupplierModalComponent |
| translation-key-modal/ | Hebrew → English key | TranslationKeyModalComponent |
| unit-creator/ | Unit registry editor | UnitCreatorModal |
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

- 2026-03-22: Full directory sync (list shell, export, loader, supplier/quick-add modals, selection primitives, etc.).

---
*Last updated: 2026-03-22*
*Updated by: breadcrumb-navigator*
