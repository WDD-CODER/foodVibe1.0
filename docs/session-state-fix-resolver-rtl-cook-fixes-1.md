# Session State — 2026-04-21 (fix/resolver-rtl-cook-fixes)

## Branch
`fix/resolver-rtl-cook-fixes`

## Date
2026-04-21

## Session Summary
- Fixed orphaned ingredient `referenceId` handling: `recipe-form.service.ts` now auto-repairs unlinked ingredients on form load
- Fixed data integrity at the server layer: `server/routes/generic.js` blocks orphan-creating DELETE operations (referential integrity guard)
- Fixed recipe resolver routing: resolver now correctly routes by ID prefix
- Session-state, agent docs, reflect logs, and scripts updated via chore commit
- Active bug identified but NOT yet fixed: nutrition badge tooltip renders below the leaf icon instead of above — root cause documented below

## Active Bug — Nutrition Badge Tooltip (RESUME HERE)

**File:** `src/app/shared/nutrition-badge/nutrition-badge.component.ts`

**Symptom:** Tooltip covers the leaf icon instead of appearing above it.

**Root cause:** `findFixedContainingBlock_()` computes wrong coordinate space when `.table-body` has a CSS transform/container-type intercepting `position: fixed`. The flip check fires incorrectly and tooltip renders below.

**Fix to apply next session — replace `onMouseEnter()` with pure viewport coords and remove `findFixedContainingBlock_()`:**

```typescript
onMouseEnter(): void {
  this.showTooltip = true
  const host = this.elRef_.nativeElement as HTMLElement
  const rect = host.getBoundingClientRect()

  const TOOLTIP_W = 164
  const TOOLTIP_EST_HEIGHT = 220
  const halfW = TOOLTIP_W / 2
  const vw = window.innerWidth
  const vh = window.innerHeight

  const centerX = rect.left + rect.width / 2
  const clampedX = Math.max(halfW, Math.min(vw - halfW, centerX))

  // Flip below when badge is too close to viewport top
  const below = rect.top < TOOLTIP_EST_HEIGHT + 8
  this.isBelow_.set(below)

  if (!below) {
    this.tooltipStyle_.set({
      bottom: `${vh - rect.top + 8}px`,
      top:    'auto',
      left:   `${clampedX}px`,
    })
  } else {
    this.tooltipStyle_.set({
      top:    `${rect.bottom + 8}px`,
      bottom: 'auto',
      left:   `${clampedX}px`,
    })
  }
}
```

After applying: run `ng build`, browse inventory page, hover a leaf badge, screenshot.

## Files Modified (this session's commits)
```
01-home-page-snapshot.md                           |  84 ++++
docs/session-state-feat-session-20260421-1.md      | 108 +++++
docs/session-state-fix-resolver-rtl-cook-fixes-1.md|  30 ++
scripts/context-monitor.sh                         |  22 ++
scripts/session-startup.sh                         |   6 ++
server/routes/generic.js                           |  35 ++
server/services/seed-master.js                     |   9 ++
src/app/core/services/scaling.service.ts           |   8 +-
recipe-builder/services/recipe-form.service.ts     |  32 +++-
15 files changed, 385 insertions(+), 59 deletions(-)
```

## Commits (unpushed)
- `a07edc2` fix(server): referential integrity — block orphan-creating operations
- `75b6da6` fix(data-integrity): handle orphaned ingredient referenceIds gracefully
- `cd09878` chore(session): update session artifacts, agent docs, reflect logs, and scripts
- `7b2870e` fix(recipe-builder): auto-repair unlinked ingredients on form load

## PR
N/A — commits not yet pushed

## Next Steps
- [ ] Apply nutrition badge tooltip fix (pure viewport coords, remove `findFixedContainingBlock_()`)
- [ ] `ng build` verification after tooltip fix
- [ ] Browse inventory page — hover leaf badge — screenshot to confirm tooltip above icon
- [ ] Push 4 unpushed commits + open PR for `fix/resolver-rtl-cook-fixes`
