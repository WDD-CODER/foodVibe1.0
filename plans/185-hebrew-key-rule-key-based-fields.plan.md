# Hebrew → English key rule for key-based fields only

## Rule (when to apply)

- **Apply** when the value the user enters is used by the app **as a key** for logic, calculations, or lookups: categories, units, allergens, preparation categories, section categories, supplier (name→key for display/translation), labels.
- **Do not apply** when the app uses an **ID** and the text is display-only (e.g. recipe `name_hebrew` + `_id`, venue name, product name where only `_id` is used for logic).

## Protocol (one flow for all key-based "add new")

Whenever the user submits a **new** value in a key-based context:

1. **Trim** the input.
2. **Resolve** to an existing key: call the right `resolve*` for the context (`resolveCategory`, `resolveUnit`, `resolveAllergen`, `resolvePreparationCategory`, `resolveSectionCategory`, etc.).
3. **If we already have a key** (resolve returned non-null) → use that key and continue (persist/update UI).
4. **If no key** (Hebrew or unknown):
   - **If input looks Hebrew** (e.g. script check `/[\u0590-\u05FF]/`) → open **translation modal** (pre-fill Hebrew, user enters English key); on save: `addKeyAndHebrew(englishKey, hebrewLabel)`, then use `englishKey` and continue; on cancel: abort.
   - **If input looks English** (or is acceptable as key) → use sanitized input as key and continue (no modal).
5. **Persist** using the **key** only (never store raw Hebrew as the key in registries).

Result: the app never relies on "Hebrew as key"; it always has an English key + optional Hebrew translation.

## Where this already exists (keep, align)

These already do "resolve → if no key open translation modal → add key + Hebrew → use key":

- `src/app/core/services/metadata-registry.service.ts`: `registerCategory`, `registerAllergen`
- `src/app/core/services/unit-registry.service.ts`: `registerUnit`
- `src/app/core/services/preparation-registry.service.ts`: category registration
- `src/app/core/services/menu-section-categories.service.ts`: section category
- add-equipment-modal, equipment-list: add-item modal then resolve + translation modal then set key

So the **protocol is already in the registries**. Amplification = make every **caller** go through these registries with the **same contract**: pass the user's **raw input** (Hebrew or English); the registry does resolve + translation modal when needed and persists only by **key**.

## Changes to amplify across the app

1. **Audit callers**  
   For each "add new" key-based flow, ensure we call the **registry** with the **value the user typed** and set the **returned key** in the UI (e.g. select value), not the raw Hebrew.

2. **Quick-add category**  
   Ensure `registerCategory` receives the name and returns the key. Quick-add must set the select to the **returned key** (already done if we return key from `registerCategory`).

3. **Single optional helper (reduce duplication)**  
   Add one helper used by all key-based flows:
   - `ensureKeyForContext(value: string, context: 'category'|'allergen'|'unit'|'preparation_category'|'section_category'|'supplier'|'generic'): Promise<string | null>`
   - Logic: trim → resolve using context → if key return key; if no key and value looks Hebrew, open `TranslationKeyModalService.open(value, context)`, on result `addKeyAndHebrew` and return key; else return sanitized value or null.
   - Registries (or their callers) call this **before** adding to the list; registries then only "add key to list" and no longer open the modal themselves.

4. **Explicit exclusion list**  
   Do **not** run this flow for: recipe name (`name_hebrew`); venue / product display names when only `_id` is used for logic; any field that is stored for display only.

## Summary

| Item | Apply rule? | Where |
|------|-------------|-------|
| Category (metadata, equipment, prep, section) | Yes | registerCategory / resolve + translation in registry or helper |
| Unit | Yes | registerUnit / resolve + translation |
| Allergen | Yes | registerAllergen / resolve + translation |
| Supplier (name as key for translation) | Yes | add-supplier-flow already uses translation modal |
| Labels (key-based) | Yes | same protocol when adding new label key |
| Recipe name | No | ID-based |
| Other display-only names | No | ID-based |

One concise implementation path: introduce `ensureKeyForContext(value, context)` that implements the protocol (resolve → if Hebrew and no key, translation modal → return key), then route every key-based "add new" through it and persist only the returned key. Registries become "add this key to the list" and no longer open the translation modal themselves.
