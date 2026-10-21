---
status: accepted
date: 2026-10-21
review-by: 2027-04-21
---

# 0024. One family registry and a decision ladder decide reuse; plans are blocked, diffs are warned

## Context

The 2026-10-20 reuse audit (`docs/mvp/reuse-audit-2026-10-20.md`) found the same job built many times: 7 page-local
search-combobox shells, 13 hand-written modal controllers, `onClearSearch` / `onSearchEscape` copied into 8 pages,
dozens of local chip classes. Nothing told an agent which shared piece existed, and no plan or script asked "does
this already exist?". Plans 451–458 converge the families; without a guard the copies grow back.

Alternatives considered: a blocking lint in CI from day one (rejected: it would block the refactors that are
removing copies, and the rules are still young); a wiki-style list with no check (rejected: it goes stale on the
first rename); a per-folder breadcrumbs note only (rejected: does not say which piece is the base).

## Decision

- **`docs/brain/component-families.md` is the single source** of which shared piece to use for each job (family),
  where it lives, and its known page-local copies. `node scripts/reuse-lint.mjs --check-registry` fails when a
  listed path disappears, so a plan that renames or removes a piece updates the registry in the same branch.
- **The decision ladder** (`docs/agent/standards-reuse.md`): 1 use as is → 2 use with existing inputs → 3 extend the
  family → 4 new family only with a justification, built in `shared/` / `core/`, never page-local. Sibling rule:
  more than ~3 variant flags → a sibling component, not another `@if`.
- **Plans are blocked, diffs are warned.** Every plan fills `## Reuse Check`; `node scripts/scope-check.mjs --reuse
  --plan=<p>` exits 1 when it is missing or incomplete (plans below `Reuse enforced from plan: 459` are
  grandfathered). `scripts/reuse-lint.mjs --diff=<base>` only warns (exit 0); its rules are data in
  `scripts/lib/registry-families.mjs` so each converging plan adds one entry. Plan 458 decides whether any rule
  becomes blocking.
- `scope-check.mjs` and `prd-template.md` are kit-owned: FoodVibe carries a one-import / one-line edit and a
  template block as `overrides` until the kit absorbs them (ADR 0021 loop).

## Consequences

- Easier: an agent finds the shared piece in one file; reviewers see "rung 4" and ask why.
- Harder: every plan carries one more section; a rename in `shared/` needs a registry edit or `--check-registry`
  fails.
- Accepted: warn-only diffs can be ignored; the checker agent and plan 458 own that risk.

## Review

Check the warn rate of `reuse-lint` on merged branches and whether any page-local copy was added after 2026-10-21.
If copies still appear, make the matching rule blocking (plan 458).
