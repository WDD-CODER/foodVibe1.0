# Reuse standard — check the registry before you build

Load this before creating any new component, util, pipe, service or `.c-*` class. Source of truth for what exists:
`docs/brain/component-families.md` (the family registry). Why: `docs/brain/decisions/0024-reuse-layer.md`.

## The decision ladder

Find the family for the job in the registry first, then take the lowest rung that works:

1. **Use as is.** The shared piece already does the job.
2. **Use with existing inputs.** Same piece, configured through inputs / variants it already has.
3. **Extend the family.** Add an input, a variant or a hook to the shared base in `src/app/shared/` or
   `src/app/core/` — never a page-local copy. Update the family's entry in the registry.
4. **New family — only with a justification.** Nothing in the registry fits. Build it in `src/app/shared/` (UI) or
   `src/app/core/` (logic), never page-local, and add a `### <family-id> — <title>` entry to the registry in the
   same branch. The plan's `## Reuse Check` row says why in one line.

**Sibling rule.** When a shared piece would need more than ~3 variant flags (`@if` branches on inputs) to cover the
new case, make a sibling component in the same family folder that shares the logic, not another `@if`.

## Plans — the `## Reuse Check` section

Every plan lists each new piece it creates, the family it searched, and the rung:

```markdown
## Reuse Check
- Supplier picker in the order form — family: search-combobox — rung: 2 — why: typeToFilter + allowTypedAdd cover it
- Cards layout for list-shell — family: list-page — rung: 3 — why: menu-library needs a grid
- Event timeline strip — family: none — rung: 4 — why: no shared piece shows a dated sequence
- none — this plan only changes server code
```

- Rungs 1–3 name a registry family (`### <family-id>` heading). Rung 4 needs `why:`.
- Gate: `node scripts/scope-check.mjs --reuse --plan=<path>` exits 1 when the section is missing, empty, or a row is
  incomplete. Plans numbered below the registry's `Reuse enforced from plan:` line are grandfathered when they have
  no section.

## Diffs — `reuse-lint`

`node scripts/reuse-lint.mjs --diff=<base>` (or `npm run lint:reuse -- --diff=<base>`) prints
`REUSE: warn <rule> <family> <file>:<line> — <hint>` for added lines that look like a new copy:

- `<app-scrollable-dropdown>` / `<app-add-option-row>` inside `src/app/pages/**` (search combobox — use `app-search-combobox`, or `app-custom-select` for a fixed list);
- a `.c-*` selector defined outside `src/styles.scss`;
- `core/utils|pipes|services` imported through `../` (use `@utils/*`, `@pipes/*`, `@services/*`);
- `onClearSearch` / `onSearchEscape` / `clearAllFilters` added to a page (list logic).

It never blocks (exit 0). A warning is either fixed or explained in the plan's run notes. Rules are data in
`scripts/lib/registry-families.mjs`: a plan that converges a family adds its rule there.

`node scripts/reuse-lint.mjs --check-registry` exits 1 when a path listed in the registry no longer exists — a plan
that renames, moves or removes a shared piece updates the registry in the same branch.

## Imports

New code imports shared code through the path aliases in `tsconfig.json` (`@utils/*`, `@pipes/*`, `@services/*`,
`@models/*`, `@directives/*`), not `../../core/...`.
