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

---

## Audit-report session — 2026-04-23 (IN PROGRESS, NOT YET COMMITTED)

### Infrastructure fixes applied (uncommitted)
1. Deleted `.claude/reports/audit/2026-04-10-nightly-audit.md` (stale duplicate)
2. Created `.claude/reports/audit/2026-04-19-nightly-audit.md` (recovered from commit `6031e42`)
3. Patched `.claude/commands/audit-report.md`: Phase 1 RESOLVED skip + Phase 8 archive step + resilience rules

### /audit-report interactive session state
- Report: 2026-04-19 (253 found, 235 flagged)
- Trust mode: `auto`
- User picked: **all** (8 categories)
- Session log: `.claude/reports/audit-sessions/2026-04-23-audit-session.md`
- Phase 7: mid Category 1 (C1 — Hardcoded Colors, color-token v4)

### /test-template color-token — COMPLETED (6/6) ✅
- Re-ran 2026-04-23 after fixing test-template.md subagent prompt (added single-value constraint)
- Score: 6/6 — all cases pass
- history.jsonl updated (two entries now), color-token.md frontmatter: last-score "6/6"

### /test-template manual-subscription — IN PROGRESS (RESUME HERE)
- Template v1, last-score 5/5 — "Re-running v1"
- 5 cases: http-fire-forget, nested-pipe, real-leak, take-one, takeuntildestroyed
- Subagents run so far:
  - **http-fire-forget**: got SAFE ✅
  - **nested-pipe**: got SAFE ✅
  - **real-leak**: NOT YET RUN — `this.temperatureCtrl.valueChanges.subscribe(val => { this.currentTemp = val })` in ngOnInit, no takeUntil/take(1)/HTTP → expected REAL VIOLATION
  - **take-one**: NOT YET RUN — `this.unitRegistry.unitAdded$.pipe(take(1)).subscribe(...)` → expected SAFE
  - **takeuntildestroyed**: NOT YET RUN — `this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(...)` → expected SAFE
- Next: run remaining 3 subagents, then read all 5 expected files, compare, score, write history.jsonl, update frontmatter

### After manual-subscription test — remaining audit-report work
- Process categories 3–8 (no templates — ad-hoc per user choice):
   - C4 — Engine Class Misuse (19 items)
   - F4 — Oversized Files (19 items)
   - A  — Hebrew Strings (54 items)
   - C3 — Font Overrides (31 items)
   - E2 — Commented-out Code (2 items)
   - C2 — Inline Styles (1 item)
- Phase 8 session end — single commit for all changes

### Commit when done (all in one)
```
fix(audit-report): stop repeating resolved reports + resilience rules

- Delete stale 2026-04-10 report (already in archive as RESOLVED)
- Restore 2026-04-19 report from orphaned commit 6031e42
- Patch Phase 1: skip reports with Status: RESOLVED
- Patch Phase 8: atomic archive with pre-flight + verify steps
- Add resilience rules: one Bash call per action, python3 over rm
- Tighten test-template subagent prompt: path field = single value only
```
