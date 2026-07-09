# TECH STACK — AUTHORITATIVE SOURCE — FoodVibe 1.0
> Both .cursorrules and CLAUDE.md defer to this file. Edit HERE only.

## Stack
Angular 19 (standalone components, OnPush, signals-only reactivity) · TypeScript ·
Node.js / Express backend · MongoDB Atlas (prod) + local Compass (dev) · Gemini API
(gemini-2.5-flash-lite, server-proxied only, never client-side key) · Render.com
(single service, Express serves Angular static build) · Hebrew RTL UI.

## Hard conventions
- Signals only — signal(), computed(), trailing underscore for private state
  (e.g. isLoading_). No BehaviorSubject anywhere.
- inject() for all DI. No constructor injection.
- input() / output() / model() — never @Input / @Output decorators.
- .c-* engine classes defined in src/styles.scss ONLY — never in a component's own
  SCSS file. Always scan src/app/shared/ and existing .c-* engines before creating
  new UI.
- SCSS: native nesting, logical properties (margin-inline, padding-block, not
  left/right variants).
- No `any` types anywhere in TypeScript.
- Single quotes in .ts files, no semicolons. Double quotes in .html.
- Hebrew strings always through translatePipe + public/assets/data/dictionary.json —
  never hardcoded Hebrew in templates. Enum/canonical values stay English keys.
- Backend persistence: providedIn: 'root' services, signals-based state,
  AsyncStorageService for local persistence.
- Growth-frozen files — do NOT add lines to: recipe-builder.page.ts,
  menu-intelligence.page.ts, cook-view.page.ts, product-form.component.ts,
  menu-export.service.ts. New logic goes in a new service/component instead.
- Lint gate: `ng lint` must pass before milestone sign-off.
- Build gate: `ng build` must pass before any commit.

## Approved dependencies
Anything already in package.json is approved. New dependencies require explicit
Plan Contract approval before Cursor installs them.

Forbidden: any package that duplicates an existing shared component or .c-* engine
— check src/app/shared/ first.
