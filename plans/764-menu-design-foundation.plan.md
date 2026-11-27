# Plan 764 — Menu design foundation: module, design records, menu fields and the one shared template

Status: draft
Depends-on: none
Snapshot: d34a01068fe2f1b28efd33b753b8a3f69aa8762b

Program map: `docs/menu-design/menu-design-map.md` (decisions M1–M9, contracts frozen 2026-11-27). Brief:
`docs/menu-design/menu-design-program-brief.md`.

## Problem Statement

A food business wants to send a customer a designed menu in seconds. Nothing in FoodVibe stores a menu "look"
today: the menu editor has one fixed paper skin, there is no design record, no font list, no subtitle or bottom note on a
menu, and no server-side drawing of a menu. Every later plan of the program (designer 765, AI 766, PDF 767/768, editor
769, menu from text 770) needs the same stored shapes and the same template, so they are built once, here, with no
screen yet.

## Goals & Success Criteria

**Primary:** the `menu_design` module, the `menuDesigns` collection, the per-business menu settings, the new menu fields
and the pure shared template (`renderMenuDocument`, `designCssVars`, `menuDocFromEvent`) exist and are tested; a
business without the module sees no change.

- [auto] `npm run build` exits 0.
- [auto] `pnpm run test:server` exits 0, including the new `server/test/menu-design-template.test.js`,
  `server/test/menu-design-schema.test.js` and `server/test/business-menu-design.test.js`.
- [auto] `server/test/menu-design-template.test.js` proves: every menu text is HTML-escaped (`<b>` in a dish name comes
  out as `&lt;b&gt;`); every text node carries `dir="auto"`; the output has no `<script`; an image URL that is not
  `https://res.cloudinary.com/` is left out; `poweredBy: false` removes the "Powered by FoodVibe" line and `true` prints it;
  `@page` is A4 portrait; a section carries `break-inside: avoid`.
- [auto] The same test file proves `designCssVars(baseDesign('classic'))` returns every `--md-*` key listed in C-TEMPLATE,
  and `menuDocFromEvent` gives a linked dish its catalog name, an unlinked dish its `unlinkedName` exactly as written, and
  a section with `unlinkedName` that name as its title.
- [auto] `server/test/menu-design-schema.test.js` proves the schema rejects a color `#12345` and `red`, an unknown font id,
  an image `kind` without `imageUrl`, a `texture` kind without `textureId`, and an `imageUrl` outside
  `https://res.cloudinary.com/`; and accepts all four `baseDesign(...)` results.
- [auto] `server/test/business-menu-design.test.js` proves `PUT /api/v1/business/menu-design-default` stores the id for the
  owner, answers 403 for staff, 404 for a design of another business or a deleted one; and that a client `PUT` of a
  `menuEvents` doc cannot set `latestExport`.
- [auto] `server/test/modules-schema.test.js` proves `modulesOf({})` still returns the four defaults (no `menu_design`), and
  `MODULE_OF_TYPE.menuDesigns` is `['menu_design']`.
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Open the four files `node server/scripts/menu-sample-html.js` writes (it prints their paths) in a browser: each
  base template shows the Hebrew/English sample menu readably, right-to-left for Hebrew lines, with its own fonts, colors,
  background and frame.

## Execution Mode
- Parallel: no — wave 0 of the program, runs alone (`md-0`).
- Concurrent plans: none
- Isolated DB: no — new optional fields and a new collection only, no migration.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/generic.js
server/test/admin-business-delete.test.js
server/test/admin-platform.test.js
server/test/ai-usage.test.js
server/test/collections.test.js
server/test/invoice-memory.test.js
docs/workflow-kit/manifest.json
shared/schemas/menu-design/**
shared/schemas/modules-pure.ts
shared/schemas/modules.ts
shared/schemas/entities/menu-design.schema.ts
shared/schemas/entities/menu-event.schema.ts
shared/schemas/entities/event-stage.ts
shared/schemas/entities/business.schema.ts
shared/schemas/entities/index.ts
server/constants/collections.js
server/constants/ai-features.js
server/routes/business.js
server/routes/admin.js
server/services/business.js
server/utils/event-create.js
server/scripts/menu-sample-html.js
server/breadcrumbs.md
server/test/menu-design-template.test.js
server/test/menu-design-schema.test.js
server/test/business-menu-design.test.js
server/test/cross-business.test.js
server/test/modules-schema.test.js
server/test/modules-registry.test.js
server/test/modules-gate.test.js
server/test/admin-business.test.js
src/app/core/models/menu-design.model.ts
src/app/core/models/menu-event.model.ts
src/app/core/models/breadcrumbs.md
src/app/core/services/menu-design-data.service.ts
src/app/core/services/menu-design-data.service.spec.ts
src/app/core/services/module.service.spec.ts
src/app/core/services/breadcrumbs.md
public/assets/data/dictionary.json
docs/brain/decisions/0034-one-menu-template-and-engine-boundary.md
docs/brain/component-families.md
docs/brain/inventory.md
docs/menu-design/menu-design-map.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `menuDesigns` uses the default generic permissions (`assertCan`, scoped by `businessId`); the new
  `PUT /api/v1/business/menu-design-default` uses `assertCan(req, res, 'editSettings', { type: 'businesses' })` on the
  caller's own business and checks the design id belongs to that business; `hidePoweredBy` is written only by the platform
  admin route (`requirePlatformAdmin`); `latestExport` joins the server-owned event fields a client PUT cannot change.
- INV-2: preserves — `menuDesigns` is not cloneable (`cloneable: false`, no `_masterId`); every query goes through the
  generic route's `scopeFilter`.
- INV-3: preserves — a default design is one field on the business (`menuDesign.defaultDesignId`), so setting it is one
  write; no `isDefault` flag that would need two document writes.
- INV-4: preserves — `menuDesignSchema` lives in `shared/schemas/entities/` and is registered in `SCHEMA_BY_COLLECTION`,
  so the server validates every write; the new menu and business fields are added to their existing schemas.
- INV-6: preserves — this plan only adds the three feature keys to the closed list; no AI call is made.

## Reuse Check

- `menuDesignSchema` (`shared/schemas/entities/menu-design.schema.ts`) — family: entity-schemas — rung: 1 — why: one more strictObject entity registered in SCHEMA_BY_COLLECTION, exactly as the family says.
- `MenuDesignDataService` — family: entity-data-service — rung: 1 — why: extends BaseEntityDataService<MenuDesign> like every entity service.
- `menu_design` module key and `MODULE_OF_TYPE.menuDesigns` — family: modules-registry — rung: 3 — why: extends the one module list; no second gate.
- `shared/schemas/menu-design/` (fonts, textures, base templates, menu doc, `renderMenuDocument`, `designCssVars`) — family: none — rung: 4 — why: no piece in FoodVibe draws a menu as a standalone HTML document for both the browser and the server; the PDF, the designer preview and the editor's CSS variables all need one pure source (map guideline 1). Registered as a new `menu-template` family in `docs/brain/component-families.md`.

## Adopt Check
- menu HTML template — verdict: skip — why: domain logic (FoodVibe's design schema → one HTML string); a pure function of a few hundred lines with no dependency, and the PDF engine is chosen separately in plan 767.

## Defaults

- loading-and-error-states — exception — why: no screen in this plan; the designer (765) and editor (769) apply it.
- app-list-container — exception — why: no list screen in this plan; the design list is plan 765.
- one-breakpoint-set — exception — why: no app style in this plan; the template is a print document sized by `@page`.
- row-action-icons — exception — why: no rows in this plan; the design list rows are plan 765.
- unsaved-changes-on-leave — exception — why: no form in this plan; the designer form is plan 765.
- empty-state-on-list — exception — why: no list screen in this plan; the design list is plan 765.
- unit-dropdown-add — exception — why: no unit field or dropdown in this plan; "custom" refers to design values only.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## Contracts (verbatim from `docs/menu-design/menu-design-map.md`, frozen 2026-11-27)

One extension, found while drafting (recorded in the map under "Contract extensions" as the first sub-task):
`shared/` holds only `shared/schemas/`, and only `shared/schemas/**` is compiled for the server
(`shared/schemas/tsconfig.cjs.json` → `server/generated/schemas`). So the template folder is
**`shared/schemas/menu-design/`** (browser: `@schemas/menu-design/*`; server:
`require('../generated/schemas/menu-design/...')`), not `shared/menu-design/`.

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

### C-TEMPLATE — one template, pure, shared (`shared/menu-design/` → built at `shared/schemas/menu-design/`, see extension above)
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

### C-AI — feature keys (this plan's part)
- New keys in `server/constants/ai-features.js` (added in 764): `menu_design_variants`, `menu_design_refine`, `menu_from_text`.

## User Stories
- As a chef, I want my menus to carry my own look so that the offer I send a customer looks like my business.
- As a chef without the menu design module, I want menu intelligence to stay exactly as it is.
- As the platform admin, I want to switch the module on per business and remove the "Powered by FoodVibe" line for a business.

## Functional Requirements

### Must Have (P0)
- [ ] `menu_design` in `MODULE_KEYS`, not in `DEFAULT_MODULES`; `MODULE_OF_TYPE.menuDesigns = ['menu_design']`; Hebrew label `module_menu_design` so the platform dialog lists it.
- [ ] `menuDesigns` collection: schema, `SCHEMA_BY_COLLECTION`, `COLLECTIONS` entry, cross-business test body, client model and data service.
- [ ] `businesses.menuDesign` with the owner's default route and the admin's `hidePoweredBy` (C-SETTINGS), with a platform history change row.
- [ ] Menu fields `designId`, `subtitle`, `bottomNote`, server-owned `latestExport`, section `unlinkedName` (C-MENU-FIELDS).
- [ ] The pure template folder with fonts, textures, four base designs, menu doc, `menuDocFromEvent`, `designCssVars`, `renderMenuDocument`.
- [ ] The three AI feature keys.
- [ ] ADR 0034.

### Should Have (P1)
- [ ] `server/scripts/menu-sample-html.js` writes one sample HTML file per base template for a person to look at.

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen in this plan. The only visible change is the new module checkbox in the platform admin's business dialog,
  which lists `MODULE_KEYS` already (`platform-business-dialog.component.ts`).
- Page recipe: none — this plan adds no page or route.
- Dictionary key (append): `module_menu_design` → "עיצוב תפריטים".
- The template's sample menu (`SAMPLE_MENU_DOC`) is data, not UI: Hebrew dish names, English names
  ("Beef Bourguignon") and mixed ("פוקאצ'ה with spreads"), so RTL/LTR mixing is tested from day one.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Decide in one shared place which design a menu wears, so the editor and the PDF never disagree — pure resolveMenuDesign(menu, designs, business): the menu's own live design, else the business default, else the first live design by createdAt, else baseDesign('classic'); unit test covers all four (the map's E1 path note is already recorded by the Planner) — shared/schemas/menu-design/menu-resolve.ts, shared/schemas/menu-design/index.ts, server/test/menu-design-template.test.js
- [ ] A2: Add the menu design module so the platform admin can switch it on per business, off by default — MODULE_KEYS + MODULE_OF_TYPE.menuDesigns, dictionary label module_menu_design, update the module tests that list the keys — shared/schemas/modules-pure.ts, public/assets/data/dictionary.json, server/test/modules-schema.test.js, server/test/modules-registry.test.js, server/test/modules-gate.test.js, src/app/core/services/module.service.spec.ts
- [ ] A3: Add the curated Hebrew font list, the built-in textures and the four base designs every design starts from — MENU_FONTS/MENU_FONT_IDS, MENU_TEXTURES/MENU_TEXTURE_IDS (CSS gradients or inline SVG only), MENU_BASE_TEMPLATES + baseDesign(id) — shared/schemas/menu-design/menu-fonts.ts, shared/schemas/menu-design/menu-textures.ts, shared/schemas/menu-design/menu-base-templates.ts
- [ ] A4: Store menu designs as their own checked records, one business each — menuDesignSchema + menuDesignDraftSchema per C-DESIGN (refine: texture needs textureId, image needs imageUrl), SCHEMA_BY_COLLECTION, COLLECTIONS entry, cross-business body, schema test — shared/schemas/entities/menu-design.schema.ts, shared/schemas/entities/index.ts, server/constants/collections.js, server/test/cross-business.test.js, server/test/menu-design-schema.test.js
- [ ] A5: Give menus a design, a subtitle, a bottom note, a menu-only section name and a server-kept latest export — C-MENU-FIELDS on menuEventSchema; latestExport added to EVENT_SERVER_FIELDS so a client PUT keeps the stored value; client model fields — shared/schemas/entities/menu-event.schema.ts, shared/schemas/entities/event-stage.ts, server/utils/event-create.js, src/app/core/models/menu-event.model.ts
- [ ] A6: Let the owner pick the default design in one write and let the platform admin hide the powered-by line — businessSchema.menuDesign; PUT /api/v1/business/menu-design-default (editSettings, live design of the same business, else 404) with setter in services/business.js; platformUpdateSchema.hidePoweredBy + admin PUT …/platform + platformChangesOf row; business route test — shared/schemas/entities/business.schema.ts, shared/schemas/modules.ts, server/routes/business.js, server/services/business.js, server/routes/admin.js, server/test/business-menu-design.test.js, server/test/admin-business.test.js
- [ ] A7: Build the one menu template that the designer, the editor and the PDF will all draw from — menu-doc.ts (MenuDoc, SAMPLE_MENU_DOC, menuDocFromEvent with lookups), menu-template.ts (designCssVars, renderMenuDocument: escape every text, dir=auto, A4 @page, break-inside avoid, cloudinary-only images, no script, powered-by last, fonts link|embedded), template test — shared/schemas/menu-design/menu-doc.ts, shared/schemas/menu-design/menu-template.ts, shared/schemas/menu-design/index.ts, server/test/menu-design-template.test.js
- [ ] A8: Give the browser a data service for menu designs so the designer screen can load and save them — MenuDesign model type from the schema, MenuDesignDataService extends BaseEntityDataService<MenuDesign> with spec — src/app/core/models/menu-design.model.ts, src/app/core/services/menu-design-data.service.ts, src/app/core/services/menu-design-data.service.spec.ts
- [ ] A9: Register the three AI feature keys the designer and the text menu will be metered under — menu_design_variants, menu_design_refine, menu_from_text — server/constants/ai-features.js
- [ ] A10: Write sample menus to files so a person can judge the four base looks before any screen exists — node script printing the four written paths (OS temp folder) — server/scripts/menu-sample-html.js
- [ ] A11: Record the one-template and engine-boundary decision and list the new pieces in the maps — ADR 0034 (guideline 1 and 2 of the brief, C-ENGINE, the iframe-preview vs editor-CSS-variables split); new `menu-template` family; breadcrumbs and inventory lines — docs/brain/decisions/0034-one-menu-template-and-engine-boundary.md, docs/brain/component-families.md, docs/brain/inventory.md, server/breadcrumbs.md, src/app/core/models/breadcrumbs.md, src/app/core/services/breadcrumbs.md

## Technical Considerations
- Dependencies: `modules-pure.ts` (browser and server), the generic data route (`server/routes/generic.js`, untouched —
  the new collection needs no route code), `EVENT_SERVER_FIELDS` / `withoutServerEventFields` (`server/utils/event-create.js`),
  the business settings routes (`server/routes/business.js` `assertCan(..., 'editSettings', ...)` pattern),
  the admin platform route (`server/routes/admin.js` `PUT /businesses/:id/platform`).
- New files needed: `shared/schemas/menu-design/{menu-fonts,menu-textures,menu-base-templates,menu-doc,menu-template,index}.ts`,
  `shared/schemas/entities/menu-design.schema.ts`, `src/app/core/models/menu-design.model.ts`,
  `src/app/core/services/menu-design-data.service.ts` (+ spec), `server/scripts/menu-sample-html.js`, three server tests, ADR 0034.
- Model changes: `MenuEvent` (+ `designId`, `subtitle`, `bottomNote`, `latestExport`), `MenuSection` (+ `unlinkedName`),
  `Business` (+ `menuDesign`), new `MenuDesign`.
- Backend / API: `PUT /api/v1/business/menu-design-default` `{ designId }` → `{ menuDesign }`; `PUT /api/v1/admin/businesses/:id/platform`
  accepts `hidePoweredBy`. `menuDesigns` uses the generic `/api/v1/data/menuDesigns` CRUD, gated by `requireModuleForType`.
- Auth and validation: owner route by `assertCan('editSettings')`; admin route by `requirePlatformAdmin`; the design id is
  checked against `menuDesigns` with `businessId` = the caller's and no `deletedAt`.
- Security surface: `renderMenuDocument` is the input to a headless browser later (767/768) — so every text is escaped,
  no `<script>`, image URLs only from `https://res.cloudinary.com/`, font CSS only from `fonts.googleapis.com`. Tests pin it.
- Data / migration: none — all new fields are optional; a menu without `designId` wears the business default.
- Project checks: log-query `[auto]` item (above); `[ui]` — none (no screen); Reuse Check filled; Page recipe: none;
  hotspot `dictionary.json` append-only; breadcrumbs for `server/`, `core/models`, `core/services` in scope;
  entity shape in `shared/schemas/`; new collection via the generic entity contract.
- Plan 770 note: C-MATCH's `shared/menu-match/` has the same compile issue — it belongs at `shared/schemas/menu-match/`.

## Out of Scope
- Any screen: the designer (765), the editor wearing the design (769).
- AI calls (766, 770), the PDF render and export (767, 768).
- The platform admin's checkbox for `hidePoweredBy` in the business dialog — plan 768, where the line is first printed
  (the server field exists from this plan).
- WhatsApp and outside access (last stage).

## Critical Questions
- none

## Execution Notes
- behaviour: `latestExport` is made server-owned by adding it to `EVENT_SERVER_FIELDS`, the list the events code already strips, instead of a second strip list.
- behaviour: the `hidePoweredBy` change is stored in the platform history like `modules` (one change row), because it is a platform admin setting.
- behaviour: the sample script writes to the OS temp folder, never into the repo.
