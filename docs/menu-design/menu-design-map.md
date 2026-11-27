# Menu design program — plan map and run order (Planner, 2026-11-27)

Source brief: `docs/menu-design/menu-design-program-brief.md` (decisions D1–D28). Reality check against
`origin/main` `d34a01068fe2f1b28efd33b753b8a3f69aa8762b` (2026-11-27). Every plan of the program uses that commit as `Snapshot:`.
Seen: highest plan 762, highest ADR on main 0032 (0033 is taken on `chore/restaurant-staging`, so this program
writes **ADR 0034**), no new invariant.

## What Dandan changed or decided on 2026-11-27 (wins over the brief)

| # | Decision |
|---|---|
| M1 | The designer is its own simple screen. It sets the look only: page, background, borders/frame, fonts, colors, logo, fixed texts. It shows sample dish names to judge the look. No dish data, no prices. |
| M2 | Menu intelligence keeps working exactly as today. The saved design is painted onto the existing paper sheet (fonts, colors, background, frame, logo). The dish row, the pickers and the money tools stay as they are. No rebuild of the dish row. |
| M3 | The customer PDF is a separate clean view: logo, business name, title, subtitle, sections, dish names, bottom note, contact line. Never prices or costs. The designer preview and the PDF draw that one view (`renderMenuDocument`). |
| M4 | D10: the AI maps dishes to the closest existing section category. When none fits it may name a new section, but that name stays **menu-only** (an unlinked section, like an unlinked dish) until the chef confirms it; only a confirm adds it to the category list. |
| M5 | D22: a dish links only when the strongest match is 95% or above (the existing `DISH_SURE`). Below that the text stays exactly as written. No suggestions, no back and forth. |
| M6 | D23: a menu made from text is a plain menu, the same as one created by hand in the menu library today. No client, no lead. |
| M7 | WhatsApp (B4 as a channel) and outside access (B5) are the **last stage**, after plans 763–769 are validated and after plan 683 plus the conversations console are on `main`. Everything before that works inside the app only. |
| M8 | PDF: start with a proof on the real Render service (plan 766) before the export is built. Uploaded backgrounds and logos use the public Cloudinary preset. A4 portrait; a section moves to the next page rather than splitting when it fits there; a reply correction (later, WhatsApp) applies to the sender's last WhatsApp menu. |
| M9 | B3 has no drag-to-reorder in v1. |

## Contracts (frozen 2026-11-27 — copy verbatim into the plans that use them)

A plan that finds a contract cannot be built as written changes it here under "Contract extensions" and carries on.

### C-MODULE
- New module key `menu_design` in `MODULE_KEYS` (`shared/schemas/modules-pure.ts`). **Not** in `DEFAULT_MODULES`:
  a business without it sees menu intelligence exactly as today (D2). Only the platform admin switches it on (existing path).
- `MODULE_OF_TYPE.menuDesigns = ['menu_design']`.
- Menus are `menuEvents`, gated by `events`. Every menu-design screen and button shows only when the business has
  **both** `menu_design` and `events` (`ModuleService.has`). The designer page itself needs only `menu_design`.

### C-DESIGN — the `menuDesigns` collection
`shared/schemas/entities/menu-design.schema.ts`, registered in `SCHEMA_BY_COLLECTION`; `COLLECTIONS` entry
`{ name: 'menuDesigns', userData: true, cloneable: false, backup: true, searchable: false, softDelete: true }`.
Default INV-1 permissions (no new owner-only rule). A design is a business asset; menus reference it.

```ts
menuDesignSchema = z.strictObject({
  ...baseDocShape,
  name: z.string().trim().min(1).max(60),
  baseTemplate: z.enum(MENU_BASE_TEMPLATES),              // 'classic' | 'modern' | 'rustic' | 'minimal'
  fonts: z.strictObject({ title: fontId, section: fontId, dish: fontId }),   // fontId = z.enum(MENU_FONT_IDS)
  colors: z.strictObject({ page: hex, text: hex, title: hex, section: hex, accent: hex, border: hex }), // hex = /^#[0-9a-f]{6}$/i
  background: z.strictObject({
    kind: z.enum(['color', 'texture', 'image']),
    textureId: z.enum(MENU_TEXTURE_IDS).optional(),       // required when kind = 'texture'
    imageUrl: cloudinaryHttpsUrl.optional(),              // required when kind = 'image'; https://res.cloudinary.com/ only
    imageFit: z.enum(['cover', 'tile']).default('cover'),
    veil: z.number().min(0).max(0.8).default(0)           // a page-colored layer over the image for readability
  }),
  frame: z.strictObject({ style: z.enum(['none', 'line', 'double', 'rounded', 'ornament']), width: z.number().int().min(0).max(6), inset: z.enum(['narrow', 'normal', 'wide']) }),
  divider: z.enum(['none', 'line', 'dots', 'ornament']),
  logo: z.strictObject({ url: cloudinaryHttpsUrl.optional(), size: z.enum(['s', 'm', 'l']), placement: z.enum(['top', 'none']) }),
  layout: z.strictObject({ align: z.enum(['center', 'start']), density: z.enum(['compact', 'normal', 'airy']),
    titleSize: size, sectionSize: size, dishSize: size }),  // size = z.enum(['s', 'm', 'l'])
  fixedTexts: z.strictObject({ businessName: z.string().max(60).optional(), contactLine: z.string().max(120).optional() }),
  origin: z.enum(['manual', 'ai']).default('manual')       // the reference itself is never stored
})
menuDesignDraftSchema = menuDesignSchema without baseDocShape and name   // what the AI must return (D8)
```

### C-SETTINGS — per-business menu settings
`businesses.menuDesign = { defaultDesignId?: string, hidePoweredBy: boolean }` (business schema, optional object).
- `defaultDesignId`: the owner sets it with one write, `PUT /api/v1/business/menu-design-default` (owner-only, the
  id must be a live design of the same business). No `isDefault` flag on designs, so setting a default never
  writes two documents (INV-3).
- A missing or deleted default → the first live design by `createdAt`; none → the `classic` base template.
- `hidePoweredBy` (D15): only the platform admin changes it (`server/routes/admin.js`, next to `modules`). Default
  `false` = the "Powered by FoodVibe" line is printed.

### C-MENU-FIELDS — additions to `menuEvents` (`shared/schemas/entities/menu-event.schema.ts`)
- `designId?: string` — the design this menu wears; missing = the business default.
- `subtitle?: string` (max 120), `bottomNote?: string` (max 300) — printed on the menu (D11). Not `notes`, which stays the internal log.
- `latestExport?: { fileId: string, at: number, designId: string }` — **server-owned** (stripped from client writes
  like `stage`); the previous file is deleted when a new export replaces it (D16).
- `MenuSection.unlinkedName?: string` (max 60) — a menu-only section title (M4). When set, `name` is `''`.
  Confirming turns it into a category through the existing "add new category" path and clears `unlinkedName`.

### C-TEMPLATE — one template, pure, shared (`shared/menu-design/`)
- `menu-fonts.ts`: `MENU_FONTS` = `{ id, family, googleName, kind: 'serif'|'sans'|'display'|'hand', weights }[]`,
  every one Hebrew-capable. Start list: Heebo, Rubik, Assistant, Alef, Varela Round, Frank Ruhl Libre, David Libre,
  Noto Serif Hebrew, Bellefair, Secular One, Suez One, Karantina, Amatic SC, Miriam Libre. `MENU_FONT_IDS` derives from it.
- `menu-textures.ts`: `MENU_TEXTURES` — built-in textures drawn in code (CSS gradients / inline SVG noise), no image
  files, no licence question: `paper`, `linen`, `kraft`, `slate`, `marble`, `dots`. `MENU_TEXTURE_IDS` derives from it.
- `menu-base-templates.ts`: `MENU_BASE_TEMPLATES` and `baseDesign(id): MenuDesignDraft` (four complete designs).
- `menu-doc.ts`: `MenuDoc = { title?, subtitle?, bottomNote?, sections: { title: string, dishes: { name: string }[] }[] }`;
  `SAMPLE_MENU_DOC` (Hebrew, English and mixed names, four sections); `menuDocFromEvent(event, { dishName(id), sectionLabel(key) })`
  — the browser and the server pass their own lookups, so both build the same doc (unlinked dish/section names as written).
- `menu-template.ts`:
  - `designCssVars(design): Record<string, string>` — `--md-page`, `--md-text`, `--md-title`, `--md-section`,
    `--md-accent`, `--md-border`, `--md-font-title`, `--md-font-section`, `--md-font-dish`, `--md-title-size`,
    `--md-section-size`, `--md-dish-size`, `--md-gap`, `--md-frame-width`, `--md-bg` (color, texture or image layer).
  - `renderMenuDocument(design, doc, { poweredBy: boolean, fonts: 'link' | 'embedded' }): string` — a complete HTML
    document: A4 portrait `@page`, every text node `dir="auto"` (D17), every text HTML-escaped, images only from
    `https://res.cloudinary.com/`, `break-inside: avoid` on a section that fits a page (M8), the powered-by line last.
    No `<script>`. Output-format free (D14): the PDF prints it; a later image export screenshots the same string.
- The designer preview shows `renderMenuDocument(design, SAMPLE_MENU_DOC)` in a sandboxed `<iframe srcdoc>`
  (no `allow-scripts`). Menu intelligence does **not** use the iframe: it puts `designCssVars` on its existing
  `.paper` sheet (M2), so the editor wears the same fonts, colors, background, frame and logo.

### C-PDF — the render service (`server/services/menu-pdf.js`, decided by plan 766)
- `renderPdf(html): Promise<Buffer>` and `screenshotUrl(url, { width }): Promise<Buffer>` (the second feeds the
  designer's URL reference, plan 765).
- One browser at a time, launched on first use, closed after 60 s idle; a second request waits (queue of 3, then
  `503 PDF_BUSY`). Page navigation is blocked except `data:`, Google Fonts and `res.cloudinary.com` (the menu HTML
  can't reach the network otherwise). `screenshotUrl` accepts only `https:` public hosts (no localhost, no private ranges).

### C-ENGINE — the boundary
`server/services/menu-engine/` is the only code WhatsApp and the outside API will call later:
- `exportMenuPdf({ businessId, eventId, actor }) → { fileId, url }` (plan 767).
- `menuFromText({ businessId, text, actor }) → { eventId, linked: string[], plain: string[] }` (plan 769).
It reaches the rest of FoodVibe only through `server/services/menu-engine/host.js`: resolve business + modules,
read dishes/categories, `callGemini` (which records AI usage, D28), `putPrivateFile` / delete file, create a menu
the way a hand-made one is created. Routes are thin callers.

### C-AI — feature keys and routes
- New keys in `server/constants/ai-features.js` (added in 763): `menu_design_variants`, `menu_design_refine`, `menu_from_text`.
- Routes live under `server/routes/ai/` (INV-6): `menu-design.js` (variants, refine — plan 765),
  `menu-from-text.js` (plan 769). Prompts are written in English. AI output is parsed with `menuDesignDraftSchema`;
  an invalid answer falls back to the base template, never a broken render (guideline 4).

### C-MATCH — dish and section matching for text menus (plan 769)
- The pure matcher (`scoreDishName`, Hebrew normalising) moves from `src/app/core/utils/recipe-match.util.ts` to
  `shared/menu-match/dish-match.ts`; the browser util re-exports it so every caller keeps working.
- Rule: the strongest name score ≥ 0.95 → link to that dish; otherwise `unlinkedName` = the text exactly as written.
  The AI's own match list never lowers the bar.
- Section: an existing category key when the AI names one that exists (exact or the matcher ≥ 0.95 on its label);
  otherwise `unlinkedName` (M4).

## Plan rows

Size: S / M / L (one Worker session each).

| NNN | Brief | Title | Size | Depends on (merged first) |
|---|---|---|---|---|
| 763 | B1+B2 | Menu design foundation: module, design records, menu fields and the one shared template | L | none |
| 764 | B1 | The menu designer screen: build, preview, save and manage designs by hand | L | 763 |
| 765 | B1 | AI in the designer: three variants from a picture, link or description, then refine in words | M | 763, 764, 766 |
| 766 | B2 | PDF proof on the real Render server: headless browser, memory and start-up measured | M | 763 |
| 767 | B2 | Customer menu PDF export: one complete A4 file, powered-by line, latest export kept | M | 763, 766 |
| 768 | B3 | Menu intelligence wears the design: design switcher, subtitle and note, export button | M | 717, 763, 764, 767 |
| 769 | B4a | Menu from text or voice inside the app: sure matches only, menu-only sections until confirmed | L | 763, 767, 768 |

Last stage (not drafted; after 763–769 are validated):
- **WhatsApp owner assistant** — owner and approved staff phones, sender routing on the shared number, voice notes,
  reply corrections (D18–D21, D24–D26). Needs plan 683 and the conversations console (plan 675, on
  `chore/restaurant-staging`) on `main`. Calls `menuFromText` and `exportMenuPdf`.
- **Outside access (B5)** — module-only business, per-business API key, slim setup page hosting the designer.

## Run order (orchestrator)

`node scripts/plan-order.mjs 763 764 765 766 767 768 769` (2026-11-27) gives three lanes —
763 → 764 → 765 · 766 → 767 → 769 · 703 → 713 → 717 → 768 — and a lock group: the plans share
`component-families.md`, `inventory.md`, `server/app.js`, `server/routes/ai.js`, `app.config.ts` and the
breadcrumbs files. So plans that can run side by side go into **one** run (the runner parallelises or
serialises them by its lock groups); two separate orchestrators on them would collide on those files.

```
run md-0  763        alone — everything builds on its schemas and template
run md-1  764, 766   one run, two plans side by side
  ── human gate: 766's Render measurement + its Q1/Q2 answers; the C-PDF decision line goes into this map
run md-2  765, 767   one run, two plans side by side
run md-3  768, 769   one run, in that order; starts only when 717 (house-style lane 703 → 713 → 717) is on main
```

- Start a wave only when every plan it depends on is merged into `main` and its `[human]` cards are answered.
- 766 ends on a human step: deploy its branch to the Frankfurt test Render service and read the measurement.
  Its decision (adopt the proven library, or the documented fallback) is written into C-PDF before 765/767 start.
- 768 waits for plan 717 (paper skin on tokens), which waits for 703 and 713. If 717 is still far off when 767
  merges, Dandan chooses: wait, or let 768 put `designCssVars` on the current classes and 717 rebase onto it.
- Commands, one after the other, each after the previous run is merged and its cards answered:
  `/orchestrate 763 md-0` · `/orchestrate 764,766 md-1` · `/orchestrate 765,767 md-2` · `/orchestrate 768,769 md-3`.
- Open Critical Questions block a run's dry run: 766 Q1/Q2 (before `md-1`), 768 Q1 (before `md-3`).

## Contract extensions

- **E1 (Planner, 2026-11-27, found drafting 763):** only `shared/schemas/` is compiled for the server
  (`shared/schemas/tsconfig.cjs.json`). C-TEMPLATE lives at `shared/schemas/menu-design/` (browser
  `@schemas/menu-design/*`, server `server/generated/schemas/menu-design/*`), and C-MATCH at
  `shared/schemas/menu-match/dish-match.ts`. Every other word of both contracts holds.
- **E2 (Planner, 2026-11-27):** 763 adds `hidePoweredBy` on the server and in the admin route; the admin's checkbox
  in the business dialog belongs to 767, where the line is first printed. `latestExport` joins `EVENT_SERVER_FIELDS`.
- **E3 (found drafting 767):** `exportMenuPdf` also returns the PDF bytes (`buffer`); `fileId`/`url` are `null` when no
  file store is configured. The export route always answers with the PDF itself.
- **E4 (767):** stored files gain the kind `menu_pdf` (`application/pdf`, kept until replaced) in `stored-file.schema.ts`.
- **E5 (766):** C-PDF's implementation is `puppeteer-core` + `@sparticuz/chromium` (wrap; `playwright-core` the
  considered fallback), pending the Render measurement; the decision line lands in 766's Execution Notes and here.
- **E6 (764):** 763 creates `menu-design.model.ts` + `MenuDesignDataService`; 764 extends them (resolver,
  `duplicateDesign`, `defaultDesign_`) and adds `BusinessService.setMenuDesignDefault`. The designer is reached from a
  menu-library header button (both modules) at `/menu-design`, `/menu-design/new?base=<id>`, `/menu-design/:id`.
- **E7 (764):** if the server's CSP `frameSrc 'none'` blocks the preview iframe, 764 A6 changes that one line in
  `server/app.js` to `'self'` — only then.
- **E8 (765):** request shapes in `shared/schemas/ai-menu-design.schema.ts` (image ≤ 1,800,000 base64 chars,
  jpeg/png/webp; reference kind image | url | text); `isSafeUrl` exported from `server/routes/ai.js`. No screenshot
  service from 766 → a URL reference answers `501 URL_REFERENCE_UNAVAILABLE` and the panel hides the link option.
- **E9 (Planner, from drafting 768):** 763 adds the pure `resolveMenuDesign(menu, designs, business)` in
  `shared/schemas/menu-design/menu-resolve.ts` (own design → default → first live → `classic`); 767 and 768 both call it.
- **E10 (769):** `loadDishBook` moves from `server/routes/ai.js` to `server/services/dish-book.js`; `host.js` (767)
  gains dish book, section categories with labels, live menu names, `createMenu`; `uniqueMenuName`/`dateMenuName`
  move to `shared/schemas/menu-design/menu-name.ts`. A text menu gets a hand-made menu's empty-form defaults
  (stage `inquiry`, no client). Quick mode needs `menu_design` + `events`, not `ai_create`.
