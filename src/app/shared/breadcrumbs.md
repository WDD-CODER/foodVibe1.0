# shared — Breadcrumbs

## Purpose

Reusable UI components and modals used by multiple pages. Modals are driven by corresponding services in `core/services/`.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| add-item-modal/ | Modal for adding items (supplier, etc.); AddItemModalService | AddItemModalComponent |
| confirm-modal/ | Confirm/cancel dialog; ConfirmModalService | ConfirmModalComponent |
| global-specific-modal/ | "Change global" vs "Add as specific" (e.g. preparation category) | GlobalSpecificModalComponent |
| restore-choice-modal/ | Restore from trash choice | RestoreChoiceModalComponent |
| translation-key-modal/ | Enter translation key (metadata manager); TranslationKeyModalService | TranslationKeyModalComponent |
| unit-creator/ | Create/edit unit in registry | UnitCreatorComponent |
| version-history-panel/ | Version history UI; VersionHistoryService | VersionHistoryPanelComponent |

## Architecture Context

Shared by pages and sometimes core components. Each modal has a matching service in `core/services/` that controls open/close and data.

## Patterns & Conventions

- Standalone components; `inject()` for service and optional inputs.
- Styling: tokens and five-group rhythm per cssLayer skill.

## Dependencies

- **Imports from**: `../core/services`, `../core/models`, `@angular/core`.
- **Used by**: Inventory, recipe-builder, metadata-manager, recipe-book, and other pages.

## Development Notes

- New modal: add component here + service in `core/services/`, register in app root or page.

---
*Last updated: 2025-02-28*
*Updated by: breadcrumb-navigator*
