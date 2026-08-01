# Session State

## Branch
fix/generic-routes-fail-safe-hardening (renamed from feat/session-20260728)

## Date
2026-07-28

## Session Summary
- Hardened `server/routes/generic.js` per pasted structured brief (Plan 299): entity-type
  allowlist replaces the old blocklist, `PUT /:type` bulk replace is now atomic
  (transaction + standalone-Mongo pending-flag fallback), `PUT /:type/:id` no longer
  resurrects a tombstoned master-clone.
- Client-caller reconciliation surfaced two real backend keys missing from the allowlist
  (`EQUIPMENT_CUSTOM_CATEGORIES`, `MENU_EVENT_TYPES`) — added to
  `server/constants/all-user-entity-types.js` before the allowlist swap could ship.
- Fixed a stale `BLOCKED_ENTITY_TYPES` reference in `docs/agent/standards-backend.md`
  found during `/review`.
- Captured one pattern + one paired gotcha to `docs/brain/` (Mongo transaction/fallback
  recipe; blocklist→allowlist reconciliation trap).
- Live-DB "Done when" checks (junk-collection 403, mid-request-kill data survival,
  stale-tab tombstone edit) were code-reviewed but not runtime-verified — no `.env` /
  local MongoDB in this session's environment.

## Files Modified
```
.claude/todo-archive/011.md                        |  15 +++
.claude/todo.md                                    |   2 -
docs/agent/standards-backend.md                    |   2 +-
docs/brain/gotchas.md                              |  28 +++++
docs/brain/patterns/atomic-bulk-replace-with-standalone-fallback.md |  34 ++++++
plans/299-generic-routes-fail-safe-hardening.plan.md |  80 ++++++++++++++
server/constants/all-user-entity-types.js          |   2 +
server/routes/generic.js                           | 120 +++++++++++++++------
sessions/2026-07-28-plan-299.md                    |  53 +++++++++
9 files changed, 299 insertions(+), 37 deletions(-)
```

## Commit
59cac51 — fix(server): make generic data routes fail safe

## PR
N/A — not yet opened at fold time (see ship flow: push + PR proposal follow this)

## Next Steps
- Runtime-validate against a live dev environment (Mongo + browser): junk-collection 403,
  mid-request-kill data survival, stale-tab tombstone edit — see HOW TO VALIDATE in
  `sessions/2026-07-28-plan-299.md`.
- `docs/brain/gotchas.md` is now 20+ entries / ~280 lines — past its own stated
  ~150-line/~10-entry split threshold; propose a domain split
  (`gotchas/ci.md`, `gotchas/git-workflow.md`, `gotchas/angular.md`, etc.) at a future
  Merge Gate.
