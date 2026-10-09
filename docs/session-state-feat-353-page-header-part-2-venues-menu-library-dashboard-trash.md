# Session State

## Branch
feat/353-page-header-part-2-venues-menu-library-dashboard-trash

## Date
2026-10-09

## Session Summary
- Plan 353: venues, menu library, dashboard overview, dashboard tabs header and trash now use `<app-page-header>`
- `PageHeaderComponent` gained `subtitleKey` (muted line under the title; hidden ≤768px and in the narrow container layout)
- Venues and menu library use `[listLayout]="true"` (added to part 1 by plan 352 v2 after this plan was written) so they match inventory; add buttons wrap their label in `.btn-label` so phone shows a round + button
- Dashboard tabs header titles the active tab (metadata → `metadata_manager`), one `<h1>` per view
- Dead `.page-title` / `.page-subtitle` / `.result-count` / `.action-bar` / `.dashboard-header` / `.trash-header` styles removed
- Reality check: 24 drift commits, all ok (back buttons already removed by plan 367; no named symbol renamed)

## Checks
- `grep 'class="page-title"' src/app` → no matches
- `npm run build` → exit 0
- Scoped specs (venues, menu-library, dashboard, trash, page-header) → 51/51 SUCCESS

## Open
- [human] visual check at 360px and 1280px (A5) — validation cards in chat
