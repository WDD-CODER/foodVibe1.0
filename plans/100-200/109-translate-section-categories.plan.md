# Translate menu section categories

## Current state

- **Source of labels**: Default categories are hardcoded in [src/app/core/services/menu-section-categories.service.ts](src/app/core/services/menu-section-categories.service.ts) as `DEFAULT_SECTION_CATEGORIES` (lines 6–9). Stored and displayed values are these raw strings (e.g. `"Appetizers"`).
- **Translation system**: The app uses [TranslationService](src/app/core/services/translation.service.ts) and [TranslatePipe](src/app/core/pipes/translation-pipe.pipe.ts). The service loads [public/assets/data/dictionary.json](public/assets/data/dictionary.json), flattens sections into one map, and looks up by **lowercase** key. Missing key → original string is returned.
- **Where categories appear**: Menu Intelligence (dropdown already uses pipe; section title not translated); Section category manager (list shows raw name); Export (optional).

No code change is required to **what is stored**: section names remain the same (English keys). Only **display** uses the dictionary.

---

## Implementation

### 1. Add `section_categories` to the dictionary

- **File**: [public/assets/data/dictionary.json](public/assets/data/dictionary.json)
- Add top-level `"section_categories"` with keys: `amuse-bouche`, `appetizers`, `soups`, `salads`, `main course`, `sides`, `desserts`, `beverages` (lowercase, spaces kept). Values: Hebrew (or same-as-key for later).

### 2. Load `section_categories` in TranslationService

- **File**: [src/app/core/services/translation.service.ts](src/app/core/services/translation.service.ts)
- In `loadGlobalDictionary()`, add `...(baseData.section_categories ?? {})` to `baseFlattened`.

### 3. Use translation in the UI

- **Menu Intelligence – section title** ([menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html)): Pass section name through `translatePipe` with placeholder fallback.
- **Section category manager – list label** ([section-category-manager.component.html](src/app/pages/metadata-manager/components/section-category-manager/section-category-manager.component.html)): `{{ name | translatePipe }}`.

### 4. (Optional) Translate section names in export

- [export.service.ts](src/app/core/services/export.service.ts): Use `TranslationService.translate(section.name_)` for section titles/sheet names in exports.

---

## Summary

| Item | Action |
|------|--------|
| dictionary.json | Add `section_categories` with 8 keys and labels. |
| translation.service.ts | Merge `baseData.section_categories` into `baseFlattened`. |
| menu-intelligence.page.html | Section title: translate with placeholder fallback. |
| section-category-manager.component.html | List label: `{{ name \| translatePipe }}`. |

User-added section categories continue to show as stored until their keys are added to the dictionary; the pipe returns the key when no translation exists.
