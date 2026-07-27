# Session State

## Branch
feat/session-20260727 (renaming to fix/gemini-recipe-reliability on push)

## Date
2026-07-27

## Session Summary
- Debugged mobile "Gemini answer came back wrong" + stale 0/1000 usage counter, and a
  separate desktop "approve and go to recipe builder" button doing nothing.
- Root cause (confirmed from Render logs, not guessed): Gemini either invents a
  non-canonical ingredient unit ("clove"/"cloves") or echoes the injected few-shot
  exemplar text verbatim instead of bare JSON on near-duplicate queries — both 502,
  and the usage counter only incremented on full success, so real failed Gemini
  calls never showed up in the 1000/day budget.
- Separately: the recipe-builder navigation was gated inside the success callback of
  an admin-only background write (`POST /api/v1/ai/shots`), which 403'd for non-admin
  accounts and silently swallowed the navigation.
- User then explicitly requested opening shot curation (approve/reject) to every
  logged-in user, not just admins — implemented via the `auth-and-logging` skill.
- Shipped via `/ship` (REGULAR lane — touches `server/routes/ai.js`): build passed,
  `/review` found and fixed one stale comment, 3 brain gotchas appended.

## Files Modified
 docs/brain/gotchas.md                              |  30 +++
 server/routes/ai.js                                | 252 ++++++++++++---------
 .../ai-recipe-modal/ai-recipe-modal.component.ts   |  55 +++--

## Commit
fbb10532b60f72066e4f8d751c0fa1d3c6c08bf5 (pre-amend; session-state fold amends this)

## PR
N/A — not opened yet

## Next Steps
- `docs/brain/gotchas.md` is now ~17→20 entries / well past its own ~150-line /
  ~10-entry split threshold (noted in the file's own header) — propose a domain
  split (e.g. `gotchas/ci.md`, `gotchas/git-workflow.md`, `gotchas/angular.md`,
  `gotchas/ai-gemini.md`) at the next Merge Gate or session.
- Known, not-yet-fixed: Gemini sometimes omits `steps` entirely (seen in a fresh
  Render log during this session) — this is a legitimate validation rejection, not
  a parsing bug. User was asked whether to add an automatic one-time retry for this
  case; no answer yet before `/ship` was invoked.
- Post-push Merge Gate still pending: branch rename, push, and commit-vs-PR judgment
  (no brief this session — will ask ad-hoc feature-complete vs checkpoint).
