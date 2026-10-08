# Session State

## Branch
feat/340-metadata-compact-chips-tap-menu-menu-type-toggle-chips

## Date
2026-10-07

## Session Summary
- Plan 340: metadata items are compact .c-tap-chip chips; tap opens a .c-icon-btn edit/delete menu (RowActionsMenuComponent anchored mode); menu types use fixed-order toggle chips that save on tap
- RowActionsMenu popover renders in the top layer (popover=manual) with capture-phase click-away: fixes the phone list menu opening off-screen and never closing
- Label/course delete cascade sends logistics {baseline: []} for legacy null logistics (server PUT merges over the stored doc)
- Build pass; specs row-actions 9/9, kitchen-state 8/8, metadata + 4 list pages 43/43; server vitest 159/159; Human verified UI

## Files Modified
 docs/brain/gotchas/angular.md                      |  10 +
 docs/brain/gotchas/backend.md                      |  10 +
 ...t-chips-tap-menu-menu-type-toggle-chips.plan.md |  13 +-
 src/app/core/services/kitchen-state.service.ts     |   8 +-
 .../preparation-category-manager.component.html    |  99 ++++----
 .../preparation-category-manager.component.scss    | 109 +-------
 .../preparation-category-manager.component.ts      |  34 ++-
 .../section-category-manager.component.html        |  99 ++++----
 .../section-category-manager.component.scss        | 109 +-------
 .../section-category-manager.component.ts          |  34 ++-
 .../user-management/user-management.component.scss |  17 +-
 .../metadata-manager.page.component.html           | 216 +++++++---------
 .../metadata-manager.page.component.scss           | 273 ++-------------------
 .../metadata-manager.page.component.spec.ts        |  51 +++-
 .../metadata-manager.page.component.ts             | 106 ++++----
 .../row-actions-menu.component.html                |  31 ++-
 .../row-actions-menu.component.scss                | 110 +++++----
 .../row-actions-menu.component.spec.ts             | 163 ++++++++++++
 .../row-actions-menu/row-actions-menu.component.ts | 103 +++++++-
 src/styles.scss                                    |  75 ++++++
 20 files changed, 881 insertions(+), 789 deletions(-)

## Commit
708f25f9

## PR
N/A

## Next Steps
- One-time server cleanup of recipes stored with logistics: null; label/course delete cascade still loops client-side (INV-3)
