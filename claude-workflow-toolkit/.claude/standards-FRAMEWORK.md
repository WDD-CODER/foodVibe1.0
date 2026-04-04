---
name: standards-FRAMEWORK
description: [FRAMEWORK] [FRAMEWORK_VERSION] standards — component structure, reactivity, CSS, and folder structure. Load on demand — do not pre-load at session start.
---

# Framework Standards — [FRAMEWORK] [FRAMEWORK_VERSION]

> Load this file when: creating or refactoring components, pipes, directives, writing SCSS/CSS, designing folder structure, or evaluating architecture trade-offs.

---

## [FRAMEWORK] Reactivity & Architecture

* **Architecture**: [REPLACE with your project's architecture pattern, e.g., Adapter Pattern, Repository Pattern, MVVM]
* **Reactivity**: [REPLACE with your reactivity model, e.g., Signals only / RxJS / Pinia / Vuex / Redux]
* **State management**: [REPLACE with state rules — what's allowed, what's forbidden]
* **API**: [REPLACE with component communication API, e.g., props/emits, input()/output(), @Input/@Output]
* **Logic rules**: [REPLACE with domain-specific logic patterns for this project]
* **Syntax**: [REPLACE with syntax preferences — quotes, semicolons, path aliases, type strictness]
* **Naming**: [REPLACE with naming conventions — selectors, classes, boolean flags, file names]
* **Utils**: [REPLACE with where shared helpers live and purity rules]
* **Services**: [REPLACE with service location, DI style, state exposure pattern]

---

## UI, CSS & Folder Structure

* **Hierarchy**: [REPLACE with your folder structure — e.g., core/ (services, models, guards), shared/ (reusable UI), pages/ (routed views)]
* **Breadcrumbs**: [REPLACE with your seam locations for breadcrumbs.md maintenance]
* **Styles**: [REPLACE with your CSS approach — scoped SCSS, CSS modules, Tailwind, CSS-in-JS]
* **Engine placement**: [REPLACE with your global vs. scoped style rules]
* **Property order**: [REPLACE with your CSS property order convention]
* **Shared UI**: [REPLACE with rules about when to create shared components vs. local markup]
* **Shared modals**: [REPLACE with modal/dialog reuse rules]

---

## Test Standards

* **Unit tests**: [REPLACE with when to write tests — during iteration, at commit, on explicit request]
* **Test runner**: [TEST_FRAMEWORK] — [REPLACE with your test runner specifics]
* **Test approach**: [REPLACE with TDD/BDD preference, co-location rules, assertion style]
* **E2E**: [REPLACE with E2E framework and selector rules if applicable]
