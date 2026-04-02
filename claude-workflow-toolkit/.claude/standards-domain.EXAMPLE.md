---
name: standards-domain
description: Domain standards — translation, Hebrew canonical values, and Lucide icon registration. Load on demand — do not pre-load at session start.
---

<!-- ============================================================ -->
<!-- Domain Standards — EXAMPLE FILE                              -->
<!-- This file is FoodVibe-specific. Use it as a reference for    -->
<!-- structure only.                                              -->
<!-- Create your own standards-domain.md with your project's      -->
<!-- domain constants.                                            -->
<!-- Key sections to include: canonical value tables, icon        -->
<!-- registries, i18n keys.                                       -->
<!-- ============================================================ -->

# Domain Standards

> Load this file when: adding or editing translation keys, handling Hebrew canonical values (units, categories, allergens), adding Lucide icons to templates, or working on domain logic involving the ingredient ledger.

---

## Translation (Hebrew UI)

* All user-facing text via `translatePipe` and `dictionary.json` (`public/assets/data/dictionary.json`). Keys: lowercase, underscores. Sections: `units`, `categories`, `allergens`, `general`.
* When adding a key, add Hebrew translation to the right section — never hardcode Hebrew in templates.

---

## Hebrew-Primary Canonical Values (avoid duplicates)

* When the app accepts user input stored as a **canonical identifier** (unit symbol, category, allergen, section category, preparation category), resolve Hebrew input to the existing canonical key from the dictionary so the same concept is not stored twice (e.g. "יחידה" → "unit").
* Use `TranslationService`: `resolveUnit`, `resolveCategory`, `resolveAllergen`, `resolveSectionCategory`, `resolvePreparationCategory`. Each returns the canonical key if the trimmed input equals a known Hebrew value; otherwise returns `null`.
* **If there is no matching key**: Prompt the user for the **English** value (canonical key), then call `translationService.promptForEnglishKeyAndAdd(hebrewLabel)` or `updateDictionary(englishKey, hebrewLabel)` so the dictionary grows and future input resolves correctly.
* **Units only**: When adding a measurement unit to a product (e.g. purchase option), after resolving or creating the unit, check whether **this product** already has that unit symbol; if yes, do not add a duplicate — use existing or show "already on this product".
* New add-item / add-unit / add-category flows must use this resolution flow before persisting.

---

## Translation Modal (Hebrew → English key)

* For flows that need a prompt for the English canonical key, use the existing **translation-key modal** in `src/app/shared/` — not a new dialog. Match its implementation for editable Hebrew, initial focus, and when "Continue without saving" appears.

---

## Lucide Icons

* **Mandatory**: Every icon used in a template (`<lucide-icon name="...">`) MUST be registered in `src/app/app.config.ts`.
* When adding a new icon: (1) import from `lucide-angular` (PascalCase, e.g. `CircleUserRound`), (2) add it to `LucideAngularModule.pick({ ... })`.
* Template uses kebab-case (`circle-user-round`); TypeScript uses PascalCase (`CircleUserRound`).
* Missing registration causes runtime error: *"The '...' icon has not been provided by any available icon providers."*
