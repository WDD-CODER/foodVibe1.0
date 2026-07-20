# recipe-book-list — Mobile Flow Audit
Run: 2026-07-20 (Plan 283 re-verify — touch-target-size)
Viewport: 375×812 RTL
Route: `/recipe-book`
Severity counts: Critical 0 · Major 3 · Minor 3

## Re-verify — Cluster 10 (Plan 283)

UI note: row actions now open via `app-row-actions-menu` (`.ram-trigger` → `.ram-popover`). Plan 283 targets the favorite / cook / delete `.c-icon-btn` buttons inside the popover.

| Check | Before | After | Result |
|---|---|---|---|
| Favorite / cook / delete size | 24×44px | **44×44px** (`min-inline-size` + `min-block-size: 2.75rem` @ max-width 620px) | PASS |
| Computed `minInlineSize` / `minBlockSize` | — | 44px / 44px | PASS |
| Overlap between three open buttons | packed 80px strip | popover row, each 44×44 | PASS |

**rbl/MAJOR-01** — RESOLVED (plan 283)

Screenshot: `shots/06-row-actions.png` (popover open)

### Out of Plan 283 scope (noted)
`.ram-trigger` ("Actions") measures **28×32px** — below 44px. Not part of Cluster 10 plan 283 defect list (original defect was inline 24px icon buttons).

## Defects (remaining from 2026-04-20 — not re-fixed by Plan 283)

### MAJOR-02 — Content scrolls under sticky header (no safe zone)
**Severity:** Major  
Prior audit; not re-verified this run. Plan 279 may address separately.

### MAJOR-03 — Filter panel close button on wrong side (RTL mismatch)
**Severity:** Major  
Prior audit; unchanged / not in Plan 283 scope.

### MAJOR-04 — Search icon on wrong side of field in RTL
**Severity:** Major  
Prior audit; unchanged / not in Plan 283 scope.

### MINOR-01 — FAB uses hardcoded `left:8px`
**Severity:** Minor — known cross-page.

### MINOR-02 — Search field container height 39px (below 44px minimum)
**Severity:** Minor — listed under Cluster 10 as minor; **not** in Plan 283 scope (plan only covered row action buttons). Still open.

### MINOR-03 — P4: Two filter dropdowns open simultaneously
**Severity:** Minor — prior audit.

## Summary
| Severity | Count |
|---|---|
| Critical | 0 |
| Major | 3 (was 4 — MAJOR-01 resolved by plan 283) |
| Minor | 3 |
| Screenshots | 1 refreshed this run (`06-row-actions.png`) |
