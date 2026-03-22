# core/components — Breadcrumbs

## Purpose

Global shell UI: header (primary nav), footer, floating hero FAB, auth modal, and global user-message host. Mounted from the root app layout.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| header/ | Top bar, route links | HeaderComponent |
| footer/ | App footer | FooterComponent |
| hero-fab/ | Contextual primary FAB | HeroFabComponent |
| auth-modal/ | Sign-in / registration UI | AuthModalComponent |
| user-msg/ | Toast / user message strip | UserMsg |

## Architecture Context

Used by `appRoot` (or equivalent shell). `UserMsg` is driven by `UserMsgService`; `HeroFabComponent` by `HeroFabService`; `AuthModalComponent` by `AuthModalService`.

## Patterns & Conventions

- Standalone components; `inject()` for services and router.
- Header owns main IA links; keep new top-level routes in sync with `app.routes.ts`.

## Dependencies

- **Imports from**: `../services`, `@angular/router`, `@angular/core`.
- **Used by**: Root app component / layout only.

## Development Notes

- Adding a primary nav destination: update `header/` and routes together.

## Recent Changes

- 2026-03-22: Documented hero-fab, auth-modal; corrected user-msg export name (`UserMsg`).

---
*Last updated: 2026-03-22*
*Updated by: breadcrumb-navigator*
