# Design handoffs

One entry per ingested Claude Design handoff (newest last). Written by
`scripts/design-handoff-ingest.mjs`; `/design-port` reads it to know which design has authority for
each screen (latest handoff for a screen wins — see `source/MANIFEST.md`).

## 2026-08-22 · source (entry 0 — whole-app snapshot)
- Bundle: `UI refactor and design.zip`, hand-vendored into `.interface-design/source/` (commit `2d3258d7`)
- Screens: all 13 `.dc.html` screens of record (see `source/MANIFEST.md`)
- Shell: `colors_and_type.css`, `mobile-pass.css`, `shell.js`, `support.js`
- Files: the snapshot itself; not replaced by later handoffs, only overridden per screen

## 2026-10-10 · cook-view (entry 1 — owned by plan 404)
- Bundle: — (local export, placed by hand before the ingest script existed)
- Screens: Cook View (`src/app/pages/cook-view`)
- Shell: `core/components/header/header.component.scss`, `core/components/tab-chips`, `core/components/hero-fab`, `shared/approve-stamp`, `shared/export-preview`, `src/styles.scss`
- Files: `README.md`, `PROMPT.md`, `CURRENT-STATE.md`, `colors_and_type.css`, `designs/` (4), `assets/` (2), `screenshots/` (7); lands in `.interface-design/handoffs/cook-view/` with plan 404's branch (`feat/404-cook-view-redesign`)
