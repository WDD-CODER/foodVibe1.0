# core — Breadcrumbs

## Purpose

App-wide building blocks: layout components (header, footer, FAB, auth modal, user messages), HTTP interceptors, guards, resolvers, pipes, directives, validators, and small pure utilities. Shared across pages.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| components/ | Header, footer, hero FAB, auth modal, user-msg | → see components/breadcrumbs.md |
| services/ | Data, state, modals, logging, export, backup | → see services/breadcrumbs.md |
| models/ | Domain types and interfaces | → see models/breadcrumbs.md |
| interceptors/ | HTTP auth header injection | authInterceptor |
| guards/ | Route activation and pending changes | authGuard, pendingChangesGuard |
| resolvers/ | Entity fetch for edit routes | productResolver, recipeResolver, equipmentResolver, venueResolver, supplierResolver |
| pipes/ | Translation and quantity formatting | TranslatePipe, FormatQuantityPipe |
| directives/ | Focus, scroll, click-outside, textarea grow | SelectOnFocusDirective, FocusByRowDirective, ClickOutSideDirective, ScrollIndicatorsDirective, TextareaAutoGrowDirective |
| validators/item.validators.ts | Duplicate-name checks for forms | duplicateNameValidator, duplicateEntityNameValidator |
| utils/ | Pure helpers: auth, export, lists, quantities | require-auth.util, auth-crypto, export.util, list-state.util, panel-preference.util, quantity-step.util, filter-starts-with.util, saving-state.util |

## Architecture Context

`core/` sits beside `pages/` and `shared/`. Routes in `app.routes.ts` use guards, resolvers, and interceptors from here; pages inject services and use pipes/directives.

## Patterns & Conventions

- Guards: functional (`authGuard`, `pendingChangesGuard`).
- Resolvers: `ResolveFn` returning entity or null for edit routes.
- Interceptor: functional `HttpInterceptorFn` for bearer tokens.
- Components under `components/`: standalone; header holds primary nav.

## Dependencies

- **Imports from**: `./services`, `./models`, `@angular/common/http`, `@angular/router`, `@angular/core`.
- **Used by**: `app.routes.ts`, `app.config.ts`, `appRoot`, all pages.

## Development Notes

- New entity with edit route: add resolver in `resolvers/`, wire in `app.routes.ts` on `edit/:id`.
- Pending changes: `pendingChangesGuard` on recipe-builder and inventory product form flows.
- Unit tests: many `*.spec.ts` alongside services, resolvers, pipes, directives.

## Recent Changes

- 2026-03-22: Added interceptors, auth guard, supplier resolver, utils listing, pipes/directives accuracy; removed obsolete system-health reference.

---
*Last updated: 2026-03-22*
*Updated by: breadcrumb-navigator*
