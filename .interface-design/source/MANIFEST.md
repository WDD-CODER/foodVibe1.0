# MANIFEST — what has authority in this snapshot

**The screen of record is the `.dc.html` file, rendered live in a browser — never a PNG.**
Screenshots in `screenshots/` are debug/iteration artifacts from building the snapshot, not the
design itself; a port-spec's Inventory 3 (visual spec) is built by reading the `.dc.html` source
and its supporting CSS/JS, quoting exact values, not by eyeballing an image.

Do not move or rename anything in this directory. `audit-harness.html` loads screens via relative
`src="<Screen>.dc.html"`, and every screen's own asset/CSS/JS references are relative to this flat
layout — moving a file breaks those references silently.

---

## SCREENS OF RECORD (13)

The only files a port-spec may treat as the design. One Angular page each.

- `Dashboard.dc.html`
- `Inventory.dc.html`
- `RecipeBook.dc.html`
- `RecipeBuilder.dc.html`
- `CookView.dc.html`
- `MenuIntelligence.dc.html`
- `MenuLibrary.dc.html`
- `MetadataManager.dc.html`
- `Suppliers.dc.html`
- `Equipment.dc.html`
- `Trash.dc.html`
- `Venues.dc.html`
- `VenueDetail.dc.html`

---

## SUPPORTING (authoritative, not screens)

Shared runtime/tokens/assets the screens above depend on and that a port-spec should read
alongside its screen — but none of these stands in for a screen on its own.

- `colors_and_type.css` — token layer (fonts, colors, glass surfaces, radii, shadows)
- `mobile-pass.css` — shared mobile ergonomics rules
- `shell.js` — the one shared shell: nav, chip rows, bottom tab bar, FAB, wash, focus rings,
  reduced motion, Lucide loader, Kitchen dark theme
- `support.js` — template runtime (`DCLogic`, `setState`, `renderVals()`, `<sc-if>`/`<sc-for>`)
- `carousel-helpers.js` — mobile card-mode swipe/carousel behavior
- `image-slot.js` — image upload/preview slot behavior
- `assets/` — brand marks, favicon, approve-stamp raster images (`fc-mark.svg`,
  `fc-mark-kitchen.svg`, `fc-seal.svg`, `fc-seal-ink.svg`, `fc-favicon.svg`,
  `food-compos-logo.png`, `stamp-approved.png`, `stamp-not-approved.png`)
- `audit-harness.html` — 390px iframe gallery of all 13 screens + overflow/tap-target/font-floor
  auditor (`window.audit()`); audits the design's own screens against its own rules, does not
  compare against the live Angular app

**REFERENCE ONLY** — the 8 non-screen `.dc.html` docs. Background/process reading, never a source
of visual truth for a port-spec:

- `Brand Assets.dc.html`
- `Canvas.dc.html`
- `Design Consistency Audit.dc.html`
- `Design Consistency Checklist.dc.html`
- `Food Composer Logo.dc.html`
- `Hero FAB options.dc.html`
- `Refactor Master Plan.dc.html`
- `Refactor Progress.dc.html`

---

## ARCHIVE — DO NOT READ

Superseded or non-canonical. A port-spec must never cite these as the design.

- `v1/` — 24 files, superseded per-screen `v1` / `v2-pre-mobile` version history preceding the
  current screens above
- `screenshots/` — iteration/debug shots taken while building the snapshot; not screen-of-record
- `uploads/` — hand-drawn reference images, input material rather than design output
