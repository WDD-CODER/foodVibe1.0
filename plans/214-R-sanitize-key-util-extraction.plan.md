---
name: 214-R — Extract sanitizeKey utility
overview: Extract the duplicated key sanitization expression into a shared util and replace all three inline sites.
todos: []
isProject: false
---

# Goal
Extract `input.trim().toLowerCase().replace(/\s+/g, '_')` from three files into `core/utils/sanitize-key.util.ts`.

# Atomic Sub-tasks
- [ ] Create `src/app/core/utils/sanitize-key.util.ts` with `sanitizeKey` export
- [ ] `translation-key-modal.service.ts:30` — replace inline expression; add import
- [ ] `label-creation-modal.service.ts:33` — replace inline expression; add import
- [ ] `key-resolution.service.ts:34` — replace `this.sanitizeAsKey(trimmed)` with `sanitizeKey(trimmed)`
- [ ] `key-resolution.service.ts:43` — replace inline expression with `sanitizeKey(result.englishKey)`
- [ ] `key-resolution.service.ts:70-72` — delete `sanitizeAsKey` private method; add import
- [ ] `ng build` verify clean

# Rules
- No changes to function signatures or surrounding logic
- Use semicolons (all three files use standard TS semicolons)
- No `@utils` alias — use relative import paths
- Do not consolidate the two modal services or touch anything else in them

# Done when
- `sanitize-key.util.ts` exists and exports `sanitizeKey`
- The inline `trim().toLowerCase().replace(...)` expression is gone from all three files
- `ng build` clean
