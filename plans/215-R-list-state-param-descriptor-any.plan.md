---
name: Fix list-state ParamDescriptor<any>[] to remove as any casts
overview: Eliminate 10 as-any casts across 5 list components by widening writeSession/useListState parameter types to ParamDescriptor<any>[].
todos: []
isProject: false
---

## Goal

Eliminate all 10 `as any` casts across 5 list components by fixing the `useListState` / `writeSession` parameter types in `list-state.util.ts`.

## Atomic Sub-tasks

- [ ] `list-state.util.ts`: change `writeSession` param from `ParamDescriptor[]` to `ParamDescriptor<any>[]`
- [ ] `list-state.util.ts`: change `useListState` param from `ParamDescriptor[]` to `ParamDescriptor<any>[]`
- [ ] `equipment-list.component.ts`: remove 3 `as any` casts (StringParam ×2, StringSetParam ×1)
- [ ] `inventory-product-list.component.ts`: remove 2 `as any` casts (NullableStringParam, StringParam)
- [ ] `recipe-book-list.component.ts`: remove 2 `as any` casts (NullableStringParam, StringParam)
- [ ] `menu-library-list.component.ts`: remove 2 `as any` casts (StringParam ×2) — brief cited line 93, actual lines 51–52
- [ ] `venues-list.component.ts`: remove 1 `as any` cast (StringSetParam)

## Rules

- Do not change `ParamDescriptor<T = unknown>` itself — interface stays generic
- Only the array parameter types in the two functions change
- Do not touch signal declarations, serializer implementations, or component logic
- Match existing semicolon style in each file

## Done When

- `ng build` (or `tsc --noEmit`) produces zero type errors related to `useListState` call sites
- All 10 `as any` casts are gone from the 5 component files
- Runtime behaviour is identical — no filter/sort/URL-sync regressions
