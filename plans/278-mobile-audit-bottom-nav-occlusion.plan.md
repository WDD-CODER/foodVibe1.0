# Plan 278 — Mobile audit fix: bottom-nav-occlusion

## Problem
The fixed bottom nav (`height: 3.5rem = 56px`, `z-index: 200`) in `header.component.scss` has no corresponding `padding-bottom` on page scroll containers. Content at the bottom of pages is permanently hidden. The worst case is the `.financial-bar` in menu-intelligence, which is `position: fixed; bottom: 0; z-index: 100` — the bottom nav (z-index 200) sits on top of it, making cost data completely invisible.

## Scope
**Files to modify:**
- `src/app/pages/menu-intelligence/_toolbar.scss` — `.financial-bar`: raise z-index above bottom nav; shift up on mobile
- `src/app/pages/venues/components/venue-add/` SCSS — add `padding-bottom` to scroll container
- `src/app/pages/inventory/components/inventory-product-form/` SCSS (or inventory-add/edit) — add `padding-bottom`
- `src/app/pages/equipment/components/equipment-add/` SCSS — add `padding-bottom`

**Out of Scope:**
- No changes to `header.component.scss` (bottom nav definition stays)
- No changes to FAB or approve-stamp positioning
- No behavior changes — visual/layout fixes only

## Defects covered
| Flow | Selector | Fix approach |
|---|---|---|
| menu-intelligence-event | `.financial-bar` | `z-index: 201`; `@media ≤620px { bottom: 3.5rem }` |
| menu-intelligence-event | scroll container | `padding-bottom: calc(3.5rem + env(safe-area-inset-bottom,0))` |
| venues-add | infra rows scroll container | Same `padding-bottom` |
| inventory-add-product | allergens panel scroll container | Same `padding-bottom` |
| inventory-edit-product | save button area | Same `padding-bottom` |
| equipment-add | scaling fields section | Same `padding-bottom` |
| metadata-manager-all-tabs | page scroll | Same `padding-bottom` (`56px` is 6px short of `62px` nav — fix to `3.5rem`) |

## Requirements
1. `.financial-bar` visible above bottom nav on mobile
2. All listed pages scroll fully — last content element is above the bottom nav
3. `ng build` passes with 0 errors

## Atomic Sub-tasks
- [ ] Read `.claude/skills/cssLayer/SKILL.md` before editing any `.scss`
- [ ] `src/app/pages/menu-intelligence/_toolbar.scss` — inside `.financial-bar`: change `z-index: 100` to `z-index: 201`; add `@media (max-width: 620px) { bottom: 3.5rem; padding-inline: 0.75rem; }` so it sits above the bottom nav
- [ ] Identify menu-intelligence page scroll container selector — read `src/app/pages/menu-intelligence/menu-intelligence.page.scss` and add `@media (max-width: 620px) { padding-bottom: calc(3.5rem + env(safe-area-inset-bottom, 0px)); }` to it
- [ ] Identify venues-add scroll container — read `src/app/pages/venues/` SCSS files; add same `padding-bottom` rule at `≤620px`
- [ ] Identify inventory-add/edit scroll container — read `src/app/pages/inventory/` SCSS files; add same `padding-bottom` rule
- [ ] Identify equipment-add scroll container — read `src/app/pages/equipment/` SCSS files; add same `padding-bottom` rule
- [ ] Run `ng build` — must be 0 errors
- [ ] Re-run `/mobile-flow-audit --only menu-intelligence-event --only venues-add --only inventory-add-product --only inventory-edit-product --only equipment-add`
- [ ] Update TRIAGE.md — mark Cluster 4 (bottom-nav-occlusion) defects as ✓ resolved (plan 278)

## Validation (mobile)
- Viewport 375×812 RTL
- menu-intelligence: financial bar (עלות כוללת / עלות מזון % / עלות לאורח) visible above bottom nav
- venues-add: scroll to bottom — all infra row delete buttons accessible
- inventory-add/edit: scroll to bottom — save buttons above nav, allergens fully visible
- equipment-add: scaling fields scrollable and above nav

## Notes
- If any `.scss` file is touched → read `.claude/skills/cssLayer/SKILL.md` first
- `.c-*` engine classes live in `src/styles.scss` only — never in component SCSS
- Logical properties required: `padding-block-end` preferred over `padding-bottom`; `padding-inline` over `padding-left/right`
- The financial-bar z-index fix (201 > 200 bottom nav) is the critical change; the padding-bottom fixes address the major/minor defects
