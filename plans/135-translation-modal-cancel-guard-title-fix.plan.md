---
name: Translation modal cancel guard title fix
overview: "Fix three issues: (1) Guard cancel = stay on page (return false, not break+leave); (2) Guard does not re-ask for a key just added (key normalization); (3) Translation modal has a proper visible title for all contexts including generic. Also: remove dead throw in service save() so error display stays in-component."
todos:
  - { id: guard-cancel, content: "Guard: change else branch from `break` to `return false` so cancel keeps user on the page", status: pending }
  - { id: guard-normalize, content: "Guard: add `.toLowerCase()` to getPending filter so a just-added key is not re-asked", status: pending }
  - { id: dict-title, content: "dictionary.json: add `translation_modal_title` key with Hebrew", status: pending }
  - { id: component-title, content: "translation-key-modal.component.ts: return `translation_modal_title` for generic context in title_", status: pending }
  - { id: service-no-throw, content: "translation-key-modal.service.ts: remove throw in save() on validation failure", status: pending }
isProject: false
---

# Translation Modal: Cancel Guard, Title & Double-Open Fix

## What changed / why

### 1. Guard cancel = stay on page (critical)

File: [`pending-changes.guard.ts`](src/app/core/guards/pending-changes.guard.ts)

The `else` branch on line 50 currently `break`s out of the while loop, which hits `return true` and allows navigation — losing all changes.

Change:
```ts
// Before (line 50-52)
} else {
  break;
}

// After
} else {
  return false;  // user closed translation modal without translating → stay on page
}
```

Behavior matrix after fix:
- Cancel modal → stay on page (no data loss)
- "Continue without saving" → strip untranslated values and leave (unchanged)
- Save translation → continue while loop for remaining values (unchanged)

---

### 2. Guard key normalization

File: [`pending-changes.guard.ts`](src/app/core/guards/pending-changes.guard.ts)

Add `.toLowerCase()` to `getPending()` filter to match the same normalization that `hasKey()` and `updateDictionary()` use, so a just-added key is never mistakenly considered missing:

```ts
const getPending = () =>
  (getValues.call(component) as string[]).filter(
    (v) => v != null && String(v).trim() !== '' &&
    !translationService.hasKey(String(v).trim().toLowerCase())
  );
```

---

### 3. Modal title visible in all contexts

Files: [`dictionary.json`](public/assets/data/dictionary.json), [`translation-key-modal.component.ts`](src/app/shared/translation-key-modal/translation-key-modal.component.ts)

`generic` context currently returns raw Hebrew string `'הזן מפתח אנגלי'` — not a dictionary key, so `translatePipe` cannot translate it.

Fix:
- Add key `translation_modal_title` → Hebrew `"הזן מפתח אנגלי"` to `dictionary.json`
- In component `title_`, return `'translation_modal_title'` for `generic` instead of raw Hebrew

---

### 4. Service save() — remove dead throw

File: [`translation-key-modal.service.ts`](src/app/core/services/translation-key-modal.service.ts)

The component validates before calling `modalService.save()`, so the throw inside `save()` is dead code. Removing it makes the intent clear: validation errors are always handled by the component, which shows them inline and keeps the modal open for the user to correct.

---

## Files to touch

| Change | File |
|--------|------|
| Cancel = stay | [`pending-changes.guard.ts`](src/app/core/guards/pending-changes.guard.ts) |
| Key normalization in getPending | [`pending-changes.guard.ts`](src/app/core/guards/pending-changes.guard.ts) |
| Generic title key | [`dictionary.json`](public/assets/data/dictionary.json) |
| Use title key for generic | [`translation-key-modal.component.ts`](src/app/shared/translation-key-modal/translation-key-modal.component.ts) |
| Remove throw in save() | [`translation-key-modal.service.ts`](src/app/core/services/translation-key-modal.service.ts) |
