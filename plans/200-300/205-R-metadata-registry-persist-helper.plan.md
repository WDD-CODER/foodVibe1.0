---
name: MetadataRegistryService persistRegistry helper
overview: Extract the repeated query → put/post storage pattern into a private generic helper, removing ~80 LOC of boilerplate from MetadataRegistryService.
todos: []
isProject: false
---

# Goal
Extract the repeated query → put/post storage pattern in MetadataRegistryService into a private helper method, reducing ~80 LOC of duplicated boilerplate.

# Atomic Sub-tasks
- [ ] Add `private async persistRegistry<T>()` helper to `metadata-registry.service.ts`
- [ ] Replace initMetadata categories write block with `persistRegistry` call
- [ ] Replace initMetadata allergens write block with `persistRegistry` call
- [ ] Replace initMetadata menuTypes write block with `persistRegistry` call
- [ ] Replace `registerCategory` inline block with `persistRegistry` call
- [ ] Replace `deleteCategory` block — restructure control flow, then `persistRegistry`
- [ ] Replace `registerAllergen` inline block with `persistRegistry` call
- [ ] Replace `deleteAllergen` block — compute `updated` first, then `persistRegistry`
- [ ] Replace `registerLabel` inline block with `persistRegistry` call
- [ ] Replace `deleteLabel` inline block with `persistRegistry` call
- [ ] Replace `updateLabel` inline block with `persistRegistry` call
- [ ] Replace `registerMenuType` inline block with `persistRegistry` call
- [ ] Replace `updateMenuType` inline block with `persistRegistry` call
- [ ] Replace `deleteMenuType` inline block with `persistRegistry` call
- [ ] Replace `renameMenuType` inline block with `persistRegistry` call
- [ ] Verify `ng build` passes; confirm file under 320 LOC

# Constraints
- Do not change any public method signatures — zero consumer impact
- Do not touch initMetadata default-seeding logic — only replace the storage write blocks
- No `any`, single quotes in TS, no semicolons
- Keep all try/catch wrappers exactly as-is around the new calls
- `reloadLabelsFromStorage` has no write block — no change needed there

# Verification
- `ng build` passes with no errors
- `metadata-registry.service.ts` is under 320 LOC
- All metadata operations still work correctly in the app
