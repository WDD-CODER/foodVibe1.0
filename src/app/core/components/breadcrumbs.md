# core/components — Breadcrumbs

## Purpose

Global layout and UI: app header (nav, branding), footer, and global user message component. Rendered once at app root level.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| header/ | Top nav bar, links to dashboard, inventory, recipe-book, recipe-builder, equipment, venues, menu-library, etc. | HeaderComponent |
| footer/ | App footer | FooterComponent |
| user-msg/ | Global toast/user message display | UserMsgComponent |

## Architecture Context

These components are declared or used in the root app component/layout. Header holds the main navigation; user-msg is driven by `UserMsgService`.

## Dependencies

- **Imports from**: `../../services` (e.g. translation, user-msg), Angular Router.
- **Used by**: App root layout.

---
*Last updated: 2025-02-28*
*Updated by: breadcrumb-navigator*
