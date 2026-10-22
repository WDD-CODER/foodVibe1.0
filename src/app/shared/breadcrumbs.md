# shared — Breadcrumbs

## Purpose

Reusable standalone components, modals, and list/table primitives used across pages. Modal behavior is coordinated by matching services in `core/services/` (or colocated `*.service.ts` in this folder).

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| `add-item-modal/` | Generic add-item flow | AddItemModalComponent |
| `add-equipment-modal/` | Add equipment dialog | AddEquipmentModalComponent |
| `ai-menu-modal/` | AI-drafted menu modal + service | AiMenuModalComponent, AiMenuModalService |
| `ai-product-modal/` | AI-drafted product modal + service | AiProductModalComponent, AiProductModalService |
| `ai-recipe-modal/` | AI-drafted recipe modal + service | AiRecipeModalComponent, AiRecipeModalService |
| `approve-stamp/` | Approval stamp UI | ApproveStampComponent |
| `column-carousel/` | Mobile column carousel for list tables (header + cells, shared index) | ColumnCarouselGroupDirective, ColumnCarouselHeaderComponent, ColumnCarouselCellComponent, ColumnSlideDirective |
| `chip-search-dropdown/` | Searchable chip-select dropdown | ChipSearchDropdownComponent |
| `confirm-modal/` | Confirm/cancel | ConfirmModalComponent |
| `counter/` | Numeric counter control | CounterComponent |
| `custom-multi-select/` | Multi-select CVA | CustomMultiSelectComponent |
| `custom-select/` | Select CVA | CustomSelectComponent |
| `edit-gate/` | Shows its content only when the user may save the opened document, else a view-only note | EditGateComponent |
| `form-field/` | Label + projected control + error/hint slot for entity forms (`layout`, `labelStyle`) | FormFieldComponent |
| `date-field/` | Day/month/year text field with a calendar button; `value` is an ISO date, `invalid` flags an impossible one (plan 467) | DateFieldComponent |
| `empty-state/` | Empty list placeholder | EmptyStateComponent |
| `export-preview/` | Export preview panel | ExportPreviewComponent |
| `export-toolbar-overlay/` | Export toolbar overlay | ExportToolbarOverlayComponent |
| `input-clear/` | Clear (×) button shown inside a text input | InputClearComponent |
| `global-specific-modal/` | Global vs specific choice | GlobalSpecificModalComponent |
| `label-creation-modal/` | Label editor + `LabelCreationModalService` | LabelCreationModalComponent |
| `list-selection/` | Row selection + `ListSelectionState` | ListRowCheckboxComponent, ListSelectionState |
| `list-shell/` | Reusable list shell: `layout="table"` (default, pinned header grid) or `layout="cards"` (projects `[shell-cards]`, `cardMin`); list search/sort/clear handlers live in `core/utils/list-controls.util.ts` | ListShellComponent |
| `loader/` | Loading indicator | LoaderComponent |
| `modal-shell/` | The one popup shell: engines + dialog role, Escape (top-most only), focus trap | ModalShellComponent |
| `nutrition-badge/` | Per-100g nutrition badge/tooltip | NutritionBadgeComponent |
| `partial-cost-badge/` | "חלקי" badge + missing-prices popover (owner can price in place) | PartialCostBadgeComponent |
| `page-header/` | Standard page title bar: title, subtitle, result-count pill, back link | PageHeaderComponent |
| `search-combobox/` | Search box with a results list, keyboard (rule K) and one add option (family search-combobox) | SearchComboboxComponent, SearchPick, SearchAddPick |
| `add-option-row/` | Icon + label of a dropdown's single add option | AddOptionRowComponent |
| `quick-add-product-modal/` | Quick add product | QuickAddProductModalComponent |
| `quick-edit-product-modal/` | Quick edit product modal | QuickEditProductModalComponent |
| `quick-edit-product-panel/` | Quick edit product inline panel | QuickEditProductPanelComponent |
| `rating-stars/` | Star rating control | RatingStarsComponent, StarState |
| `restore-choice-modal/` | Restore from trash | RestoreChoiceModalComponent |
| `row-actions-menu/` | Per-row actions menu | RowActionsMenuComponent |
| `scaling-chip/` | Recipe scaling chip | ScalingChipComponent |
| `scrollable-dropdown/` | Scrollable dropdown | ScrollableDropdownComponent |
| `scroll-rail/` | Horizontal scroll strip with edge fades and arrow buttons; `centerChild(el)` glides a tapped chip to the middle | ScrollRailComponent |
| `inline-rename-field/` | Inline rename input with Save and Cancel buttons (Enter saves, Escape cancels, blur does nothing) | InlineRenameFieldComponent |
| `selection-bar/` | Bulk selection bar | SelectionBarComponent |
| `translation-key-modal/` | Hebrew → English key | TranslationKeyModalComponent |
| `unit-creator/` | Unit registry editor | UnitCreatorModal |
| `venue-link-chip/` | Venue link chip | VenueLinkChipComponent |
| `version-history-panel/` | Version history UI | VersionHistoryPanelComponent |

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


---
*Last updated: 2026-09-27*
*Updated by: breadcrumbs*
