# trash-restore — Mobile Flow Audit
Run: 2026-07-20 (Plan 283 re-verify — touch-target-size)
Viewport: 375×812 RTL
Auth: Guest (Dev)
Severity counts: Critical 0 · Major 0 · Minor 3

## Re-verify — Cluster 10 (Plan 283)

| Check | Before | After | Result |
|---|---|---|---|
| `.btn-item` height (משחזר / ממחק לצמיתות / היסטוריה) | 30px | **44px** (`min-block-size: 2.75rem`) | PASS |
| `.btn-action` height (משחזר הכל / ממחק את כל התוכן) | 30px | **51px** (`min-block-size: 2.75rem`) | PASS |
| Modal confirm button | 47px | not re-measured (already passing) | n/a |

**tr/MAJOR-1** — RESOLVED (plan 283)  
**tr/MAJOR-2** — RESOLVED (plan 283)

Screenshots: `shots/01-baseline.png`, `shots/02-row-actions.png`

## Defects (remaining from 2026-04-20 — not in Plan 283 scope)

### MINOR-1 — Item action row has asymmetric RTL margin
**Severity:** Minor  
**Element:** `.trash-item-actions`  
Unchanged from prior audit — out of Plan 283 scope.

### MINOR-2 — Success toast overlaps page header on restore confirm
**Severity:** Minor  
Not re-exercised this run — out of Plan 283 scope.

### MINOR-3 — Confirmation modal CTA says "משחזר הכל" for single-item restore
**Severity:** Minor  
Not re-exercised this run — out of Plan 283 scope.

## Checklist

| Check | Result |
|---|---|
| Restore button tap-target ≥44px | PASS — 44px |
| Section action buttons ≥44px | PASS — 51px |
| Row action buttons clip within card | PASS |
| Confirmation modal fits at 375px | not re-checked |
| Restore flow completes | not re-exercised (measure-only re-verify) |

## Summary
| Severity | Count |
|---|---|
| Critical | 0 |
| Major | 0 (was 2 — both resolved by plan 283) |
| Minor | 3 |
| Screenshots | 2 (this run) |
