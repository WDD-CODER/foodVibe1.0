# Session State

## Branch
chore/design-port-dashboard-spec

## Date
2026-08-24

## Session Summary
- Fixed a real bug surfaced from the prior session's Dashboard restyle: `app-tab-chips` (mounted
  app-wide above the router-outlet) was already rendering the venues/metadata/suppliers/trash chip
  row, but `dashboard-overview`/`dashboard-header` each carried a second, local copy of the same
  nav — duplicate row on screen, and very likely the cause of a reported broken mobile scroll.
  Deleted both local navs (kept dashboard-header's back-to-dashboard button, which has no chip
  equivalent), ported the scroll-into-view-on-press behavior onto the surviving chip row. Verified
  live at 390px/700px: one nav row, full mobile scroll restored, back button still works.
- Built a mobile/tablet-only 8-tab jump-nav for Metadata Manager (`.mm-jump-nav-row`), pre-built
  ahead of that screen's own future `/design-port` session, scoped addition only (no
  colors/spacing/card styling touched). Built from the app's real 8 sections (units, product
  categories, allergens, recipe labels, menu types, preparation categories, section categories,
  user management) — not the design's own 6-tab list; Demo Data/Backup & Restore excluded.
  - Interaction went through two revisions by explicit Human request before landing: (1) original
    spec was scroll-the-page-to-the-section — rejected, the ask was for the section to come to the
    user; (2) tried bring-to-front-as-a-fixed-overlay-with-backdrop — rejected, the ask was for a
    real order change in the page flow, not a modal; (3) shipped — tapping a tab sets that
    section's CSS `order` to 0, a real reorder, page never scrolls, everything else keeps its
    natural relative order.
  - Added tablet-only (768–1023px) prev/next arrows that scroll the tab row, each hiding once
    there's nothing further that direction (mobile relies on touch swipe; matches this app's other
    carousels).
  - `_registry.md`'s Metadata Manager note rewritten during `/ship`'s review pass — it still
    described the superseded scroll mechanism after the pivot to reorder.
- Edited the standing `/design-port` procedure itself (`.claude/commands/design-port.md` Step 5,
  committed separately as `e0d4d94` before this ship): removed the instruction for Claude Code to
  self-run a live browser visual comparison, replaced with an automatable Inventory-3 cross-check;
  visual comparison at 1280px/390px is now explicitly the Human's job. Per the file's own §0, a
  procedure change requires an explicit Human decision — this session's goal doc was that decision.
- `/review` (REGULAR lane) found and fixed one issue: the registry note above. Everything else
  clean (no innerHTML/any/console.log/hardcoded colors/hardcoded Hebrew; the 768px/1023px
  breakpoints match this codebase's established pattern of hardcoding + a comment citing the
  canonical source, since component-scoped SCSS here can't reference `styles.scss`'s `$break-*`
  vars without an `@use` that isn't set up).
- **Same-directory concurrent session** (purging `tools/catalog-seeder/`, broad dead-CSS cleanup
  across many component `.scss` files including `src/styles.scss`, `.gitignore`, `.claude/todo.md`,
  `plans/307-*`/`plans/308-*`) was still active throughout this entire session. Excluded all of it
  from both commits — re-checked `git status`/branch/HEAD fresh immediately before every stage.

## Files Modified
```
.claude/commands/design-port.md                                    |   9 +-       (e0d4d94, separate commit)
_claude-data/design-migration/screens/_registry.md                 |  10 +
public/assets/data/dictionary.json                                 |   2 +
src/app/core/components/tab-chips/tab-chips.component.html         |   1 +
src/app/core/components/tab-chips/tab-chips.component.ts           |   6 +
src/app/core/components/tab-chips/tab-chips.component.spec.ts      |  78 ++       (new)
src/app/pages/dashboard/components/dashboard-header/*.{html,scss,spec.ts,ts}      |  213 +/-
src/app/pages/dashboard/components/dashboard-overview/*.{html,scss,spec.ts,ts}    |   99 -
src/app/pages/dashboard/dashboard.page.spec.ts                     |   6 +-
src/app/pages/metadata-manager/metadata-manager.page.component.{html,scss,spec.ts,ts} | 335 +
18 files changed across 2 commits (+ 1 prior standalone commit), ~945 insertions(+), 439 deletions(-)
```
(Scoped to this session's own commits — excludes the concurrent session's unrelated
`tools/catalog-seeder/`, `.gitignore`, `src/styles.scss`, `.claude/todo.md`,
`server/scripts/legacy-import/**`, `plans/307-*`, `plans/308-*`, and many other component `.scss`
files, deliberately left untouched.)

## Commit
e0d4d94 (design-port.md Step 5), ecd5ce3 (dashboard nav-dedup), 8364e7c (metadata-manager jump-nav,
this file folded in via amend)

## PR
Proposed this ship, per explicit Human instruction ("I do want you to open a PR for this because I
want to push it and merge it") — overriding the milestone/checkpoint default this branch had used
previously. See PR URL in the ship output.

## Next Steps
1. Next `/design-port` session: screen 2 — Inventory (`src/app/pages/inventory/`, design source
   `Inventory.dc.html`). Per `.claude/commands/design-port.md` §7, templates largely carry to
   Recipe Book/Suppliers/Equipment (screens 3-5), which share `list-shell` + `carousel-header`.
   Step 5 of that session will use the new Inventory-3 cross-check instead of a self-run visual
   diff — Human does the 1280px/390px comparison.
2. Metadata Manager's full `/design-port` pass (colors/spacing/card styling, registry row 8) is
   still `todo` — the jump-nav built this session is explicitly pre-work, not that pass; the
   `_registry.md` note documents this so the future session doesn't redo or conflict with it.
3. Not resolved: the shared app-shell chrome (top nav, chip row, avatar, bottom tab bar, Hero FAB
   in `shell.js`) still has no owner among the 13 screen sessions.
4. Unrelated, still active: the concurrent session's `tools/catalog-seeder/` purge + dead-CSS
   cleanup (`plans/307`, `plans/308`) was still mid-flight in this same working directory as of
   this ship. Worth checking its state before starting the next `/design-port` session.
