# Conventions — Angular / CSS / TypeScript / Translation

> Tool-agnostic. Load when creating or editing Angular components, templates, SCSS/CSS, or translation keys.

---

## Angular & reactivity

* Standalone components + `ChangeDetectionStrategy.OnPush` always.
* Signals only: `signal()`, `computed()`, `effect()`. Private state: `data_ = signal<T>(...)`. Public read-only via `.asReadonly()`. No `BehaviorSubject` / `Subject` for state.
* `inject()` for all DI — never constructor injection.
* Component API: `input()`, `input.required()`, `output()`, `model()` — never `@Input()` / `@Output()`.
* No `any`. Single quotes in `.ts`, no semicolons. Double quotes in `.html`.
* Selectors kebab-case; `app-` prefix only for native HTML collisions. Filename matches selector. Classes PascalCase. Booleans use `is` / `has` prefix.
* Services: `src/app/core/services/`, suffix `.service.ts`, `@Injectable({ providedIn: 'root' })`, signals + `AsyncStorageService` + `UserMsgService`.
* Folder structure: `core/` (services, models, guards, pipes, directives), `shared/` (reusable UI), `pages/[name]/` (routed views + local `components/`). Path aliases: `@services/*`, `@models/*`, `@directives/*`.
* Shared helpers → `util.service.ts` or `core/utils/` — pure functions only.
* Component class section order: injected services → inputs → outputs → signals/constants → computed → CRDUL methods (Create, Read, Delete, Update, List).
* Before new UI: scan `src/app/shared/` and `src/styles.scss` (`.c-*` engines) for something composable.

---

## CSS / SCSS

* `.c-*` engine classes live in `src/styles.scss` only — never in component SCSS.
* Logical CSS properties only (`margin-inline`, `padding-block` — not left/right).
* Native nesting, `@layer`. No inline styles unless the value is dynamic/runtime.
* Property order (five-group rhythm): Layout → Dimensions → Content → Structure → Effects.
* No hardcoded colors/radii/shadows/blur — use `var(--*)` design tokens.
* Responsive breakpoints via project tokens (`$break-mobile`, `$break-tablet`, `$break-desktop`) — never hardcode pixel breakpoints.
* Before creating or editing any `.scss`/`.css` in `src/`, follow the `cssLayer` skill.

---

## Translation (Hebrew RTL)

* All user-facing text via `translatePipe` and `public/assets/data/dictionary.json`.
* Keys: lowercase, underscores only. Sections: `units`, `categories`, `allergens`, `general`, `preparation_categories`.
* Never hardcode Hebrew strings in templates or TypeScript.
* Canonical identifiers (unit, category, allergen, section category, preparation category): resolve Hebrew input to the existing English key via `TranslationService` (`resolveUnit`, `resolveCategory`, `resolveAllergen`, `resolveSectionCategory`, `resolvePreparationCategory`). Never store the Hebrew string as the ID.
* If no matching key exists: prompt for the English key, then `translationService.updateDictionary(englishKey, hebrewLabel)`.
* Units: after resolving, do not add a duplicate unit symbol on the same product.
* Translation-key modal: reuse the existing shared modal in `src/app/shared/` — editable Hebrew, initial focus, "Continue without saving".
* Lucide icons used in templates must be registered in `app.config.ts` before use.
