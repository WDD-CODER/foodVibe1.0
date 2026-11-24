# core — Breadcrumbs

## Purpose

App-wide building blocks: layout components (header, footer, FAB, auth modal, user messages), HTTP interceptors, guards, resolvers, pipes, directives, validators, and small pure utilities. Shared across pages.

## Navigation

| File/Directory | Purpose | Key Exports |
|---------------|---------|-------------|
| `components/` | Header, footer, hero FAB, auth modal, user-msg | → see components/breadcrumbs.md |
| `services/` | Data, state, modals, logging, export, backup | → see services/breadcrumbs.md |
| `models/` | Domain types and interfaces | → see models/breadcrumbs.md |
| `interceptors/` | HTTP auth header injection | authInterceptor |
| `guards/` | Route activation and pending changes | authGuard, pendingChangesGuard |
| `guards/welcome.guard.ts` | Sends a signed-in user from `/welcome` to `/dashboard` | welcomeGuard |
| `resolvers/` | Entity fetch for edit routes | productResolver, recipeResolver, equipmentResolver, venueResolver, supplierResolver |
| `pipes/` | Translation and quantity formatting | TranslatePipe, FormatQuantityPipe |
| `directives/` | Focus, scroll, click-outside, textarea grow | SelectOnFocusDirective, FocusByRowDirective, ClickOutSideDirective, ScrollIndicatorsDirective, TextareaAutoGrowDirective |
| `validators/item.validators.ts` | Duplicate-name checks for forms | duplicateNameValidator, duplicateEntityNameValidator |
| `engine/` | Pure quantity and cost engine for event lists (plan 433): raw/prep lines, dish and event cost, rounding helpers; its shared 04.1 test fixture lives in the testing folder | computeEventPlan, EventPlanService, chooseSupplier, roundPortions, formatQty, formatMoney, computePortions |
| `utils/returning-visitor.util.ts` | `fv_returning` device mark: has someone signed in here before (set on sign-in, cleared on logout) | markReturningVisitor, clearReturningVisitor, isReturningVisitor |
| `utils/table-state.util.ts` | One state per table at one moment (plan 671) and the strip's 30-minute times | tableStatesAt, stripTimes, RESERVED_SOON_MINUTES |
| `utils/assistant-failure.util.ts` | Why the assistant stopped (plan 702): the Hebrew key of a failure reason for the suggestion bar or the thread note, and when the note shows (the failure time is not older than the last message) | assistantFailureKey, showAssistantFailure, toAssistantFailureReason |
| `utils/breakpoints.ts` | The one breakpoint set for the browser code (plan 656): phone ≤767, tablet ≤1023, desktop ≥1024 | PHONE_MAX, TABLET_MAX, PHONE_QUERY, TABLET_DOWN_QUERY, DESKTOP_QUERY |
| `styles/` | Sass partials component styles `@use` (plan 656): `styles/_breakpoints.scss`, the same four names as the top of `src/styles.scss` | $break-phone-max, $break-tablet-min, $break-tablet-max, $break-desktop-min |
| `utils/` | Pure helpers: auth, export, lists, quantities | table-engine.spec (plan 663: the browser runs the shared table engine through `@schemas`), require-auth.util, auth-crypto, export.util, list-state.util, panel-preference.util, quantity-step.util, filter-starts-with.util, saving-state.util, unsaved-changes, event-stage-ui.util, logistics-summary.util (plan 521: client summary text, open items), product-name-match.util (plan 463: plural/spelling-forgiving product lookup) |

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


---
*Last updated: 2026-03-22*
*Updated by: breadcrumbs*
