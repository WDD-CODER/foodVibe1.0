# Plan 283 — Mobile audit fix: touch-target-size

## Problem
Several action buttons render below the 44×44px WCAG minimum touch target:
- `trash.page.scss` `.btn-item` (restore / permanent-delete / history): `padding: 0.3rem 0.6rem` with no `min-height` → renders at ~30px tall. "Permanent delete" being only 30px tall is a high-risk usability issue.
- `trash.page.scss` `.btn-action` (section-level restore / dispose): `padding: 0.4rem 0.75rem` with no `min-height` → same ~30px issue.
- `recipe-book-list` row action buttons (favorite / cook / delete): 24×44px — width is 24px, well below 44px minimum.

## Scope
**Files to modify:**
- `src/app/pages/trash/trash.page.scss` — add `min-block-size: 2.75rem` to `.btn-item` and `.btn-action`
- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` — widen row action buttons to ≥ 44px

**Out of Scope:**
- No changes to button labels or icons
- No layout changes beyond button sizing
- No changes to modal confirm button (already 47px — passing)

## Defects covered
| Flow | Selector | Fix approach |
|---|---|---|
| trash-restore | `.btn-item` | Add `min-block-size: 2.75rem` (= 44px) |
| trash-restore | `.btn-action.btn-restore`, `.btn-action.btn-dispose` | Add `min-block-size: 2.75rem` |
| recipe-book-list | row action buttons (favorite/cook/delete) | Add `min-inline-size: 2.75rem` |

## Requirements
1. All trash row action buttons: computed height ≥ 44px
2. All trash section action buttons: computed height ≥ 44px
3. Recipe-book row action buttons: width ≥ 44px
4. `ng build` passes with 0 errors

## Atomic Sub-tasks
- [ ] Read `.claude/skills/cssLayer/SKILL.md` before editing any `.scss`
- [ ] `src/app/pages/trash/trash.page.scss` — in `.btn-item` rule (line ~167): add `min-block-size: 2.75rem;`
- [ ] Same file — in `.btn-action` rule (line ~88): add `min-block-size: 2.75rem;`
- [ ] `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss` — read the full file to locate row action button selectors (`.c-icon-btn`, `.favorite-btn`, or similar); add `min-inline-size: 2.75rem; min-block-size: 2.75rem;`
- [ ] Run `ng build` — must be 0 errors
- [ ] Re-run `/mobile-flow-audit --only trash-restore --only recipe-book-list`
- [ ] Update TRIAGE.md — mark Cluster 10 (touch-target-size) defects tr/MAJOR-1, tr/MAJOR-2, rbl/MAJOR-01 as ✓ resolved (plan 283)

## Validation (mobile)
- Viewport 375×812 RTL
- Trash page: measure `.btn-item` height ≥ 44px; tap "ממחק לצמיתות" reliably without missing
- Trash page: section-level restore/dispose buttons ≥ 44px height
- Recipe-book-list: row action buttons each ≥ 44px wide; no overlap between the three buttons

## Notes
- `2.75rem = 44px` at base font-size 16px
- Logical properties: `min-block-size` not `min-height`, `min-inline-size` not `min-width`
- If `.scss` file is touched → `.claude/skills/cssLayer/SKILL.md` first
