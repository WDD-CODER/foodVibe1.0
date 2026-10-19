---
paths:
  - "src/app/**/*.html"
  - "public/assets/data/dictionary.json"
---

# Domain Standards

> Load this file when: adding or editing translation keys, handling Hebrew canonical values (units, categories, allergens), adding Lucide icons to templates, or working on domain logic involving the ingredient ledger.

---

## Translation (Hebrew UI)

* All user-facing text via `translatePipe` and `dictionary.json` (`public/assets/data/dictionary.json`). Keys: lowercase, underscores. Sections: `units`, `categories`, `allergens`, `general`.
* When adding a key, add Hebrew translation to the right section — never hardcode Hebrew in templates.

---

## Hebrew-Primary Canonical Values (avoid duplicates)

* When the app accepts user input stored as a **canonical identifier** (unit symbol, category, allergen, section category, preparation category), resolve Hebrew input to the existing canonical key from the dictionary so the same concept is not stored twice (e.g. "×™×—×™×“×”" → "unit").
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
* **Execution gate**: After any task that adds a `<lucide-icon>` to a template, grep the template for every icon name added, then verify each one is present in both the `import { ... } from 'lucide-angular'` block AND the `LucideAngularModule.pick({ ... })` call in `app.config.ts`. This check must pass before the task is marked `[x]`.


---

## Add-option rule (dropdowns)

Every dropdown that offers "add" follows this add-option rule (plans 398–401). Shared selects
(`custom-select`, `custom-multi-select`, `chip-search-dropdown`) already do it — pass the right inputs.

1. **One add option**, always last in the list and in keyboard order — never two "הוסף" buttons.
2. **Label:** typed text that isn't an existing option → `הוסף "<typed>"`. Nothing typed, or an exact
   match → the generic `add_new_<thing>` key (`הוסף <thing> חדש/ה`), which opens the add modal. Never
   the bare word `add` / "הוסף". Show the typed form only when the add flow can take the typed name
   (`[allowTypedAdd]="true"` on the shared selects); otherwise the generic label.
3. **Search by the label on screen** (the translated key), not the stored key — keys are often English
   (`KeyResolutionService`). Exact-match checks use the translated label too.
4. **After adding, select the key that was actually stored** (it may differ from the typed text); select
   nothing if the add was cancelled. Never write the raw typed text into the field.

Use `core/utils/add-option.util.ts` (`addOptionLabel`, `findOptionByLabel`, `resolveAddedKey`) and
render the row with `shared/add-option-row` (`<app-add-option-row [label]="…" />`). Shared-select
inputs: `addNewValue` (sentinel), `addNewLabelKey`, `allowTypedAdd`; output `addNewChosen` /
`addNew` carries the typed name (`''` for the generic add). New `add_new_<thing>` keys go in
`dictionary.json` → `general` (append-only).

### Keyboard (every dropdown with a search box — add option or not)

- First option highlighted on open and on every keystroke, so Enter picks the top match.
- ↓/↑ move the highlight and stop at the ends (no wrap-around); the highlighted row scrolls into view.
- Focus stays in the search input (no roving focus into the list); point `aria-activedescendant` at the
  highlighted option.
- Enter picks the highlighted option (on the add option it runs the add). Escape closes the list, focus
  stays on the field. Tab / Shift+Tab close the list and move to the next / previous field.
- `custom-multi-select` without a search box: Space toggles like Enter.

Use `core/utils/keyed-picker-search.util.ts` (`KeyedPickerSearch` + `scrollHighlightIntoView`) — never
hand-roll arrow/Enter handling.
