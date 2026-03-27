---
name: Dead Code Audit Cleanup
overview: Remove confirmed dead files and orphaned config discovered by the 2026-03-27 dead code audit; complete unfinished tasks from plan 069.
todos: []
isProject: false
---

# Dead Code Audit Cleanup

## Goal

Remove all confirmed dead code and orphaned config found by the 2026-03-27 full-codebase dead code audit, and close out two unexecuted items from plan 069.

## Atomic Sub-tasks

- [ ] `tsconfig.json` — remove `@components/*` alias (plan 069 §3.1 carryover)
- [ ] `metadata-manager.page.component.ts` — verify and remove commented block ~lines 219–263 (plan 069 §2.1 carryover)
- [ ] Delete `src/app/core/components/footer/footer.component.ts` (unused component — zero consumers)
- [ ] Delete `src/app/core/components/footer/footer.component.html`
- [ ] Delete `src/app/core/components/footer/footer.component.scss`
- [ ] Delete `src/app/core/components/footer/footer.component.spec.ts`
- [ ] `src/app/core/components/breadcrumbs.md` — remove `footer/` row (stale after deletion)
- [ ] Delete `src/app/core/models/filter-category.model.ts` (zero imports)
- [ ] Delete `src/app/core/models/filter-option.model.ts` (zero imports)
- [ ] Delete `src/app/core/models/units.enum.ts` (KitchenUnit — zero imports)
- [ ] `ng build` — verify zero errors

## Rules

- Read-only verified before this plan — do not expand scope
- No false deletions — every file confirmed zero consumers before removal
- Spec files follow their source component

## Done when

- All deleted files produce zero import errors in `ng build`
- `ng build` exits clean
