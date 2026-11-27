---
status: accepted
date: 2026-11-27
review-by: 2027-05-27
---

# 0034. One menu template for every surface, and one engine boundary for outside callers

## Context

A business gets a designed menu it can send to a customer (`docs/menu-design/menu-design-program-brief.md`). The same
design has to appear in the designer's preview, on menu intelligence's paper sheet and in the customer PDF the server
prints, and later in an image export. Two more callers come last: a WhatsApp owner assistant and an outside API for a
business that only uses menu design. If each surface drew the menu its own way, they would drift apart, and each new
caller would reach into FoodVibe's routes and collections.

The brief's two guidelines decide it: one shared HTML/CSS template (guideline 1) and one menu engine that outside
callers go through (guideline 2).

## Decision

- **One template.** `shared/schemas/menu-design/` is the only code that draws a menu. It is pure (no network, no
  database, no Angular) and lives under `shared/schemas/` because that is the folder compiled for the server
  (`shared/schemas/tsconfig.cjs.json`). The browser imports `@schemas/menu-design/*`; the server requires
  `server/generated/schemas/menu-design/*`.
- **The AI never writes HTML or CSS.** It fills the closed design schema (`menuDesignDraftSchema`) and picks fonts from
  the curated Hebrew list. An answer that does not parse falls back to a base design.
- **The document is hostile-input safe**, because a headless browser prints it: every text is escaped, there is no
  script, images come only from `https://res.cloudinary.com/`, font CSS only from `fonts.googleapis.com`, and every
  design value is checked again before it reaches the CSS. Tests pin these rules.
- **Preview and editor differ on purpose.** The designer preview and the PDF show the whole document
  (`renderMenuDocument`; the preview in a sandboxed `<iframe srcdoc>` without `allow-scripts`). Menu intelligence does
  not use the iframe: it puts `designCssVars` on its existing `.paper` sheet, so the dish rows, pickers and money tools
  stay as they are and only the look changes.
- **One design rule.** `resolveMenuDesign` says which design a menu wears: its own live design, else the business
  default, else the first live design by `createdAt`, else the `classic` base design. The default is one field on the
  business (`menuDesign.defaultDesignId`), never an `isDefault` flag on designs (INV-3).
- **Engine boundary.** `server/services/menu-engine/` is the only code WhatsApp and the outside API may call. It reaches
  the rest of FoodVibe only through `server/services/menu-engine/host.js` (business and modules, dishes and categories,
  the metered AI call, private files, creating a menu the way a hand-made one is created). Routes are thin callers. The
  folder is built by the PDF export and the menu-from-text plans, not by this one.

## Rejected

- An Angular component for the preview and a separate server template for the PDF: two drawings that drift.
- Letting the AI return HTML or CSS: unbounded output into a headless browser, and nothing a form could edit.
- Rendering the editor inside the iframe: it would rebuild the dish row and everything attached to it.
- WhatsApp and the outside API calling routes or collections directly: every new caller would copy the module, money and
  tenant rules.

## Consequences

- A visual change is made once and shows everywhere; the editor may differ slightly from the print, since it only takes
  the CSS variables.
- The template cannot use a browser-only or Node-only library.
- A new look value needs the schema, the CSS variables and the document changed together.
- With `fonts: 'embedded'` the document links no font; whoever renders it has to supply the faces.

## Review

Check whether a second menu drawing appeared anywhere, whether the editor's variables-only look still matches what
customers receive, and whether outside callers still go only through the engine.
