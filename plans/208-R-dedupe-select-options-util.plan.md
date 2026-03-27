---
name: dedupeAndFilterOptions util extraction
overview: Extract the script-aware filter + dedup block from CustomSelectComponent.filteredOptions_ into a standalone testable util.
todos: []
isProject: false
---

# Goal
Extract `filteredOptions_` deduplication and script-aware filtering logic from `CustomSelectComponent` into a reusable util, reducing the component by ~20 LOC and making the filter logic testable in isolation.

# Atomic Sub-tasks
- [ ] Create `src/app/core/utils/dedupe-select-options.util.ts` — export `dedupeAndFilterOptions`, delegate filter step to `filterOptionsByStartsWith`
- [ ] Replace filter+dedup block in `custom-select.component.ts` with call to `dedupeAndFilterOptions`; fix `translateLabels` conditional in lambda
- [ ] Add import for `dedupeAndFilterOptions` to `custom-select.component.ts`
- [ ] Verify `ng build` passes; confirm `dedupe-select-options.util.ts` exists

# Constraints
- Do not touch `addNewOpt` pinning logic — stays in the computed around the call
- Do not touch keyboard handlers, open/close methods, or ControlValueAccessor methods
- No `any`, single quotes in TS, no semicolons
- translateFn lambda must preserve `translateLabels` conditional: `(k) => this.translateLabels() ? this.translationService.translate(k) : k`

# Verification
- `ng build` passes with no errors
- `src/app/core/utils/dedupe-select-options.util.ts` exists with exported `dedupeAndFilterOptions` function
- `custom-select.component.ts` no longer contains the filter+dedup block inline

# Plan-implementation Amendments
- **Blocker fixed**: brief's proposed call `(k) => this.translationService.translate(k)` drops the `translateLabels` conditional. Fixed by using `(k) => this.translateLabels() ? ... : k`.
- **LOC note**: actual savings are ~20 LOC (component ~322), not the ~40 LOC / under-305 stated in brief. No blocker.
- **Neighborhood improvement**: new util delegates to existing `filterOptionsByStartsWith` (filter-starts-with.util.ts) to avoid duplicating the Hebrew/Latin regex logic.
