# Plan 281 — Mobile audit fix: input-overflow

## Problem
Multiple input fields in the recipe-builder clip or collapse their content on mobile:
- Ingredient search inputs (`input[placeholder="חפש מוצר או מתכון"]`) render at ~30px wide — effectively unusable
- Recipe name inputs use `overflow: clip` — only the tail of long Hebrew text is visible
- Yield vessel search (`input[placeholder="חפש כלי..."]`) renders at 30px wide
- Prep-item name inputs in dish mode show truncated names (icon overlapping text area)

Root cause: the `@media (max-width: 640px)` mobile grid assigns `col-name` as `1fr` but the ingredient search input inside it may be collapsing due to `min-width: 0` conflicts or container constraints; recipe name overflow is explicitly set to `clip`.

## Scope
**Files to modify:**
- `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss` — ensure `.grid-input` fills available space in mobile col-name; fix any `width` constraint causing 30px collapse
- `src/app/pages/recipe-builder/recipe-builder.page.scss` (or whichever file contains recipe name input rules) — change recipe name input from `overflow: clip` / `text-overflow: clip` to `overflow: hidden; text-overflow: ellipsis`
- Yield vessel search input file — same fix

**Out of Scope:**
- No changes to mobile grid column structure (that is plan 277)
- No multi-line name expansion — single-line with ellipsis is sufficient
- No changes outside recipe-builder

## Defects covered
| Flow | Selector | Fix approach |
|---|---|---|
| recipe-builder-edit | `input[placeholder="חפש מוצר או מתכון"]` | Ensure `width: 100%` and `min-width: 0` in `.grid-input` within mobile col-name |
| recipe-builder-new-dish | Same ingredient search | Same — shared component |
| recipe-builder-new-prep | `input[placeholder="שם המתכון..."]` | `text-overflow: ellipsis` instead of `clip` |
| recipe-builder-new-dish | `input[placeholder="שם המנה..."]` | Same — template differs but same CSS rule |
| recipe-builder-new-prep | `input[placeholder="חפש כלי..."]` | Find and fix 30px width constraint |
| recipe-builder-new-dish | `input[placeholder="חפש הכנה"]` (prep rows) | Search icon overlaps text — fix `padding-inline-end` or icon position |

## Requirements
1. Ingredient search input fills the full `col-name` column width on mobile (minimum 100px)
2. Recipe name input shows ellipsis on overflow — beginning of long names accessible via scroll
3. Yield vessel search field minimum width matches its column
4. `ng build` passes with 0 errors

## Atomic Sub-tasks
- [ ] Read `.claude/skills/cssLayer/SKILL.md` before editing any `.scss`
- [ ] Read `src/app/pages/recipe-builder/recipe-builder.page.scss` (full file) — locate recipe name input and yield vessel search input styles
- [ ] `recipe-builder.page.scss` — find recipe name `input` rule: change `text-overflow: clip` → `text-overflow: ellipsis`; change `overflow: clip` → `overflow: hidden` (or `overflow: visible` if field uses scroll)
- [ ] `recipe-builder.page.scss` — find yield vessel `input[placeholder="חפש כלי..."]` or `.vessel-search-input`: ensure `width: 100%` and `min-width: 0`
- [ ] `recipe-ingredients-table.component.scss` — inside `@media (max-width: 640px)` block, verify `.col-name .grid-input` has `width: 100%` and `min-width: 0`; add if missing
- [ ] Read prep-item input SCSS (likely `recipe-builder.page.scss` or a prep-grid component SCSS) — fix `padding-inline-end` on prep item search input to account for search icon width
- [ ] Run `ng build` — must be 0 errors
- [ ] Re-run `/mobile-flow-audit --only recipe-builder-new-prep --only recipe-builder-new-dish --only recipe-builder-edit`
- [ ] Update TRIAGE.md — mark Cluster 7 (input-overflow) defects as ✓ resolved (plan 281)

## Validation (mobile)
- Viewport 375×812 RTL
- Type 40-char Hebrew name → field shows ellipsis at start; full text accessible by tapping
- Ingredient search: type "עגב" — field shows 3+ chars, not clipped
- Yield vessel search: field fills full column width

## Notes
- If `.scss` file is touched → `.claude/skills/cssLayer/SKILL.md` first
- Logical properties: `padding-inline-end` not `padding-right`, `min-width` stays as-is (dimensionless)
