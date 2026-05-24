---
name: standards-FRAMEWORK
description: "[FRAMEWORK] architecture, reactivity, CSS, and folder structure standards. Load on demand — do not pre-load at session start."
---

# [FRAMEWORK] & CSS Standards

> **[PLACEHOLDER]** This file is a template for your project's frontend framework standards.
> After `/init-repo`, rename this file to `standards-[FRAMEWORK].md` (e.g. `standards-angular.md`,
> `standards-react.md`, `standards-vue.md`) and fill in the sections below.
>
> The sections below show the structure used in a mature Angular project — adapt to your framework.
> Delete sections that don't apply, add framework-specific sections as needed.

> Load this file when: creating or refactoring components, writing CSS/SCSS, designing folder structure, or evaluating architecture trade-offs.

---

## [FRAMEWORK] Architecture & Reactivity

> **[PLACEHOLDER]** Fill in your framework's architecture patterns.

* **Architecture**: `[ARCHITECTURE_PATTERN]` — e.g. "Standalone Components + inject()" for Angular, "hooks + context" for React
* **State management**: `[STATE_PATTERN]` — e.g. Signals, Redux, Pinia, Zustand
* **Component API**: `[COMPONENT_API]` — e.g. `input()`/`output()` for Angular, props/emit for Vue
* **Syntax rules**: No `any` types. Single quotes in TS, double quotes in HTML. No semicolons (if applicable).
* **Naming**: Selectors/components kebab-case or PascalCase per framework convention. Classes PascalCase. Boolean flags `is`/`has`.
* **Services/utilities**: Shared helpers in `[UTILS_DIR]` — no one-off helpers in components. Pure functions only (same inputs → same outputs, no I/O or argument mutation).
* **Injection**: `[INJECTION_PATTERN]` — e.g. constructor injection vs `inject()` for Angular

---

## UI, CSS & Folder Structure

* **Hierarchy**: `[SRC_STRUCTURE]` — e.g. `core/` (services, models, guards), `shared/` (reusable UI), `pages/` (routed views)
* **Breadcrumbs**: Keep `breadcrumbs.md` maps at major seams — not in every leaf folder. Add/refresh via the `breadcrumb-navigator` skill when adding a new top-level subtree.
* **Styles**: Scoped CSS/SCSS, native nesting. No inline styles unless dynamic. Before any new or edited stylesheet, run the `cssLayer` skill.
* **Engine placement**: `[CSS_ENGINE_PREFIX]-*` engine classes belong **only** in `[CSS_GLOBAL_STYLES_FILE]`. Never define engine classes in component stylesheets — framework scoping will break cross-component reuse.
* **Property order**: Layout → Dimensions → Content → Structure → Effects.
* **Shared UI**: Before any new UI (control, layout, or pattern), scan `[SHARED_COMPONENTS_DIR]` for something composable. Prefer shared structures — add local markup only when nothing fits.

---

## Test Standards

* **Unit tests**: Add or update test files when a unit is finalized, during commit phase, or when the user asks — avoid churn mid-iteration. Run only **targeted** specs for files you changed.
* **Do NOT write tests during iterative plan execution** — test authoring is for commit phase or explicit user request only.
* **Test framework**: `[TEST_FRAMEWORK]` — e.g. Jest, Jasmine/Karma, Vitest, pytest
* **E2E**: `[E2E_FRAMEWORK]` — e.g. Playwright, Cypress. Use semantic selectors (`getByRole`, `getByTestId`) — no fragile CSS selectors.
