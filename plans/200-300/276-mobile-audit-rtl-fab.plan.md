# Plan 276 — Mobile audit fix: rtl-fab

## Problem
The shared `HeroFabComponent` positions itself with `left: 0.75rem` (physical CSS property). In RTL Hebrew layout, physical `left` is the trailing/end side — the FAB appears on the wrong edge on every page. Affects 10 flows at critical/major/minor severity. Root cause is two `left:` rules in `hero-fab.component.scss` marked "intentionally physical" — this comment is incorrect for a RTL-first app.

## Scope
**Files to modify:**
- `src/app/core/components/hero-fab/hero-fab.component.scss` — replace physical `left` with logical `inset-inline-end`

**Out of Scope:**
- No template changes
- No changes to FAB vertical positioning (already uses `inset-block-end` correctly)
- No changes to other components

## Defects covered
| Flow | Selector | Fix approach |
|---|---|---|
| recipe-builder-new-prep | `.hero-fab-container` | Replace `left: 0.75rem` → `inset-inline-end: 0.75rem` |
| recipe-builder-new-dish | `.hero-fab-container` | Same (shared component) |
| dashboard | `.hero-fab-container` | Same |
| signup | `.hero-fab-container` | Same |
| login | `button.fab-action` | Same (shared component) |
| recipe-book-list | `button.fab-main` | Same |
| inventory-add-product | `.hero-fab-container` | Same |
| inventory-edit-product | `.hero-fab-container` | Same |
| venues-add | `.hero-fab-container` | Same |
| menu-intelligence-event | `.hero-fab-container` | Same |

## Requirements
1. FAB appears on the physical RIGHT edge at RTL (inline-end = right in RTL)
2. FAB still appears on physical RIGHT edge at LTR (inline-end = right in LTR) — no LTR regression
3. `ng build` passes with 0 errors

## Atomic Sub-tasks
- [ ] `src/app/core/components/hero-fab/hero-fab.component.scss` line 4 — change `left: 0.75rem;` to `inset-inline-end: 0.75rem;`, remove "intentionally physical" comment
- [ ] Same file line 110 (inside `@media (max-width: 768px)`) — change `left: 0.5rem;` to `inset-inline-end: 0.5rem;`, remove comment
- [ ] Run `ng build` — must be 0 errors
- [ ] Re-run `/mobile-flow-audit --only dashboard --only recipe-builder-new-prep --only signup` (3-flow spot check)
- [ ] Update `.claude/reports/mobile-audit/TRIAGE.md` — mark all Cluster 1 (rtl-fab) defects as ✓ resolved (plan 276)

## Validation (mobile)
- Viewport 375×812 RTL
- Dashboard: FAB appears on right edge, not left
- Recipe-builder: FAB no longer overlaps ingredient rows
- LTR sanity: FAB still on right edge (same physical side as before for LTR)

## Notes
- If `.scss` file is touched → `.claude/skills/cssLayer/SKILL.md` applies; this file uses no `@layer` (component encapsulation), so the rule is: no `.c-*` engine classes here — component-local only ✓
- The `@media (max-width: 620px)` block already uses `inset-block-end` — no change needed there
