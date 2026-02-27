---
name: menu-builder-ux-styling
overview: Restyle the Menu Library list and the Menu Intelligence editor page with a classic "paper menu" WYSIWYG look, searchable section headers backed by metadata categories, inline dish search, quantity inputs, an "Extract for Customer" export feature, and proper unsaved-changes guard -- all matching the app's existing centered layout and interaction patterns.
todos:
  - id: model-updates
    content: Add cuisine_tags_ and created_at_ to MenuEvent model
    status: pending
  - id: menu-library-restyle
    content: Restyle menu library list with centered layout, search bar, filter chips (event type, cuisine, serving style, date range, sort)
    status: pending
  - id: menu-library-metadata
    content: Add MENU_EVENT_TYPES and MENU_CUISINE_TAGS metadata lists for filterable tags
    status: pending
  - id: paper-menu-layout
    content: Create paper-menu WYSIWYG layout with parchment background, decorative borders, serif fonts, centered max-width container
    status: pending
  - id: menu-title-inline
    content: Implement borderless inline-editable menu title at top of paper
    status: pending
  - id: event-metadata-on-paper
    content: Display event metadata (type, date, guests, serving style) as elegant inline-editable text on the paper surface
    status: pending
  - id: section-header-search
    content: Implement section headers with dropdown search from MENU_SECTION_CATEGORIES metadata, with add-new-category flow via AddItemModal
    status: pending
  - id: dish-row-search
    content: Implement borderless dish search rows with dropdown filtering from KitchenStateService.recipes_(), quantity display, and hover-delete
    status: pending
  - id: unsaved-changes-guard
    content: Wire pendingChangesGuard by implementing hasUnsavedEdits() or exposing form dirty state on MenuIntelligencePage
    status: pending
  - id: customer-export
    content: Create menu-export component with print-ready customer-facing view (CSS @media print approach)
    status: pending
  - id: dictionary-keys
    content: Add Hebrew translation keys for all new labels, section categories, filter names, and export button
    status: pending
isProject: false
---

# Menu Builder UX and Styling Plan

## A. Menu Library List Page -- Styled Container with Filters

Restyle `[src/app/pages/menu-library/components/menu-library-list/](src/app/pages/menu-library/components/menu-library-list/)` to match the centered layout pattern in `[src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss)` (e.g. `padding: 20px`, `border-radius: 8px`, `border: 1px solid #e2e8f0`, Heebo font).

### Search and Filter Bar

- Search input with the `.input-wrapper` styling pattern (icon + text, rounded, focus glow).
- Filter controls below/beside search:
  - **Event type tag filter** (dropdown or chip-toggle): Wedding, Corporate, Tasting, Prix Fixe, etc. Values come from a new `MENU_EVENT_TYPES` metadata list stored via `MetadataRegistryService` pattern. Users can add custom types.
  - **Cuisine tag filter** (multi-select chips): Greek, Italian, French, Asian, etc. Same metadata pattern, stored as `MENU_CUISINE_TAGS`.
  - **Serving style filter** (dropdown): Buffet/Family, Plated/Course, Cocktail/Passed -- mapped from `ServingType` enum already in `[src/app/core/models/menu-event.model.ts](src/app/core/models/menu-event.model.ts)`.
  - **Date range filter**: Two date inputs (from / to). If only one date is set, filter to that single date. If both are set, filter between them.
  - **Guest count range** (optional enhancement): min/max slider or two inputs to find menus for similar-scale events.
  - **Sort options**: By name (A-Z), by date (newest first), by food cost %, by guest count.

### Model Changes

Add fields to `MenuEvent` in `[src/app/core/models/menu-event.model.ts](src/app/core/models/menu-event.model.ts)`:

- `cuisine_tags_?: string[]` -- for multi-tag cuisine filtering.
- `created_at_?: number` -- timestamp for date-based sorting.

### Cards in the List

Keep the card layout but style them with the app's design tokens: `#f8fafc` background, `#e2e8f0` border, subtle shadow on hover, performance tags as colored pills.

---

## B. Menu Intelligence Page -- "Paper Menu" WYSIWYG Editor

Full restyle of `[src/app/pages/menu-intelligence/](src/app/pages/menu-intelligence/)` to look like a classic restaurant menu on paper.

### Paper Container

- Centered `max-width: 680px` container with:
  - Warm parchment/cream background (`#faf6ef` or similar).
  - Subtle inner shadow or vignette to simulate paper depth.
  - Decorative thin border or ornamental corner accents (CSS `border-image` or pseudo-elements with SVG flourishes, kept subtle).
  - Serif or semi-serif font override inside the paper (e.g. `'Playfair Display'` or `'Cormorant Garamond'` from Google Fonts for headings, body stays Heebo).

### Menu Title (c)

- Large, centered text input at the top of the paper.
- No visible border/background -- just text styled as an elegant heading (serif, ~1.8rem, centered).
- Editable inline; placeholder text like "Menu Name..."

### Event Metadata on Paper (e)

Below the title, display event info as elegant inline text (not form fields):

- Event type, date, number of guests, serving type.
- Each rendered as styled text on the paper surface (e.g. "Wedding Reception | June 15, 2026 | 120 Guests | Plated Service").
- These values are still editable: clicking any value opens an inline edit (text input that replaces the text, same borderless style).

### Section Headers (b)

- Each section is a course title (e.g. "Appetizers", "Soups", "Main Course", "Desserts").
- Styled as centered, uppercase or small-caps serif text with a decorative rule/divider above.
- When empty or when the user clicks a blank header: opens a **dropdown search** pulling from a `MENU_SECTION_CATEGORIES` metadata list (stored via `MetadataRegistryService` pattern -- default values: Amuse-Bouche, Appetizers, Soups, Salads, Main Course, Sides, Desserts, Beverages).
- If the user types a name not in the list: show "Add [name] as new category" option at bottom of dropdown; clicking it opens the existing `AddItemModal` to confirm and persist the new category.

### Dish Rows Under Each Section (b)

- Each row is a transparent text input (no border, no background) that looks like text written on the paper.
- As the user types, a **dropdown search** appears below filtering `KitchenStateService.recipes_()` by name match.
- Once a dish/recipe is selected:
  - The row displays the dish name as styled text (left-aligned or centered, matching the paper aesthetic).
  - To the right: a small quantity input (also borderless, just a number on the paper) with the derived portions pre-filled based on take-rate logic.
  - On hover: a subtle delete button (X or trash icon) appears to the left of the row, fading in.
- Users can add as many dishes as they want per section.

### Add Section Button

- Positioned below the last section on the paper.
- Styled as a subtle "+" or "Add Course" link that fits the paper aesthetic (not a standard button).
- Adds a new empty section at the bottom (sections are not inserted between existing items).

---

## C. Unsaved Changes Guard (d)

The page already has `canDeactivate: [pendingChangesGuard]` in `[src/app/app.routes.ts](src/app/app.routes.ts)`. Wire it by:

- Tracking form dirty state on the `MenuIntelligencePage`.
- Exposing either `recipeForm_` (rename to match the guard interface) or implementing `hasUnsavedEdits()` which returns `true` when the form is dirty or the menu has been modified since last save.
- The existing guard in `[src/app/core/guards/pending-changes.guard.ts](src/app/core/guards/pending-changes.guard.ts)` already checks for `hasUnsavedEdits()` or form dirty -- just implement the interface.

---

## D. Extract Menu for Customer (f)

New feature: a button on the menu editor page ("Export for Customer" or "Send to Customer").

### Behavior

- Clicking the button generates a **print-ready / PDF-ready** view of the menu containing only customer-facing information:
  - Menu title.
  - Event metadata: date, event type, number of guests, serving type.
  - Each section header with its dish names underneath (no quantities, no cost data, no take-rates).
- Implementation options (recommend starting with the simplest):
  - **Option 1 (CSS print)**: Open a new browser window/tab with a print-optimized view of the paper menu (stripped of editing controls), then trigger `window.print()`. Uses `@media print` styles to hide everything except the menu paper.
  - **Option 2 (later enhancement)**: Use a library like `html2canvas` + `jsPDF` to generate an actual PDF file download.

### Component

- New component: `src/app/pages/menu-intelligence/components/menu-export/menu-export.component.ts`
- Takes the current `MenuEvent` as input, renders the read-only paper view, and handles print/export.

---

## File Impact Summary

- **Model**: `[src/app/core/models/menu-event.model.ts](src/app/core/models/menu-event.model.ts)` -- add `cuisine_tags_`, `created_at_`.
- **Menu Library list**: Restyle `.component.html`, `.component.scss`, `.component.ts` -- add filters, sort, date range, styled cards.
- **Menu Intelligence page**: Full rewrite of `.page.html`, `.page.scss`, significant `.page.ts` changes -- paper layout, inline editing, section search, dish search with dropdown, quantity display, guard wiring.
- **Dictionary**: Add translation keys for new labels (section categories, filter labels, export button).
- **New component**: `menu-export` for customer-facing print view.
- **Metadata**: Optionally add `MENU_SECTION_CATEGORIES` and `MENU_CUISINE_TAGS` storage keys following `MetadataRegistryService` pattern, or extend that service.

