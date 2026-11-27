# Plan 764 — The menu designer screen: build, preview, save and manage designs by hand

Status: draft
Depends-on: 763
Track: code
Snapshot: d34a01068fe2f1b28efd33b753b8a3f69aa8762b

## Problem Statement
A food business has no way to set how its menus look. Plan 763 adds the design record (`menuDesigns`), the per-business
default, the curated Hebrew fonts, the built-in textures, four base designs and the one shared template
(`renderMenuDocument`). Nobody can see or change any of it yet. This plan builds the designer: a separate, simple screen
that sets the **look only** (Dandan, 2026-11-27, M1 in `docs/menu-design/menu-design-map.md`): page, background, frame,
divider, fonts, colors, logo, business name and contact line. It shows sample dish names so the chef can judge the
look. It is not where menus are written: no dishes, no prices.

The designer is one self-contained component (`app-menu-designer`) so that menu intelligence (plan 768) and, in the
last stage, a slim outside setup page can host it (brief B1 note). Plan 765 adds the AI on top of this screen.

Verified on `origin/main` d34a0106 (plan 763's pieces are taken as its contracts, copied below):
- Routes: `src/app/app.routes.ts` — `menu-library` (`:211`) and `menu-intelligence` (`:222`) use
  `canActivate: [authGuard, moduleGuard(['events'])]`; `moduleGuard(keys)` (`src/app/core/guards/module.guard.ts:8`)
  sends a missing module to `/dashboard`. `pendingChangesGuard` is the leave-page guard.
- The menu library header (`src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html:2-29`)
  holds `app-page-header` with two `header-actions` buttons (`openInquiry`, `onCreateNew`). That is where the chef works
  on menus, so the designer's entry point goes there (the top header has no per-feature entries for event tools).
- `ModuleService.has(keys)` (`src/app/core/services/module.service.ts:16`).
- Uploads: `CloudinaryService.upload(file): Observable<string>` (`src/app/core/services/cloudinary.service.ts:22`) —
  the unsigned public preset, returns `secure_url` on `https://res.cloudinary.com/` (M8: backgrounds and logos use it).
  `downscaleImage` (`src/app/core/utils/downscale-image.util.ts`).
- Data services: `BaseEntityDataService<T>` (`src/app/core/services/base-entity-data.service.ts`); deferred-load
  example `KnowledgeItemDataService` (`src/app/core/services/knowledge-item-data.service.ts:15-40`).
- Business calls: `API.business(path)` (`src/app/core/services/http-storage.adapter.ts:18`); `BusinessService`
  (`src/app/core/services/business.service.ts`) holds `business_`.
- Shared pieces: `app-list-shell` + `app-page-header`, `app-row-actions-menu`, `app-empty-state`, `app-modal-shell`,
  `ConfirmModalService`, `app-form-field`, `app-counter`, `app-inline-rename-field`, `.c-chip-group`
  (`docs/brain/component-families.md`).
- CSP: `server/app.js:46-72` — `frameSrc: ["'none'"]`, `styleSrc` allows `https://fonts.googleapis.com`, `fontSrc`
  allows `https://fonts.gstatic.com`, `imgSrc` allows `https://res.cloudinary.com`. An `about:srcdoc` frame inherits
  the page's policy; whether `frame-src 'none'` refuses it in the served build is checked in A6.

### Contracts used (verbatim from `docs/menu-design/menu-design-map.md`, frozen 2026-11-27)

**C-MODULE**
- New module key `menu_design` in `MODULE_KEYS` (`shared/schemas/modules-pure.ts`). **Not** in `DEFAULT_MODULES`:
  a business without it sees menu intelligence exactly as today (D2). Only the platform admin switches it on (existing path).
- `MODULE_OF_TYPE.menuDesigns = ['menu_design']`.
- Menus are `menuEvents`, gated by `events`. Every menu-design screen and button shows only when the business has
  **both** `menu_design` and `events` (`ModuleService.has`). The designer page itself needs only `menu_design`.

**C-DESIGN — the `menuDesigns` collection**
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

**C-SETTINGS — per-business menu settings**
`businesses.menuDesign = { defaultDesignId?: string, hidePoweredBy: boolean }` (business schema, optional object).
- `defaultDesignId`: the owner sets it with one write, `PUT /api/v1/business/menu-design-default` (owner-only, the
  id must be a live design of the same business). No `isDefault` flag on designs, so setting a default never
  writes two documents (INV-3).
- A missing or deleted default → the first live design by `createdAt`; none → the `classic` base template.
- `hidePoweredBy` (D15): only the platform admin changes it (`server/routes/admin.js`, next to `modules`). Default
  `false` = the "Powered by FoodVibe" line is printed.

**C-TEMPLATE — one template, pure, shared (`shared/schemas/menu-design/`, browser `@schemas/menu-design/*` — map extension E1)** — the parts this plan uses:
- `menu-fonts.ts`: `MENU_FONTS` = `{ id, family, googleName, kind: 'serif'|'sans'|'display'|'hand', weights }[]`,
  every one Hebrew-capable. `MENU_FONT_IDS` derives from it.
- `menu-textures.ts`: `MENU_TEXTURES` — built-in textures drawn in code (CSS gradients / inline SVG noise), no image
  files: `paper`, `linen`, `kraft`, `slate`, `marble`, `dots`. `MENU_TEXTURE_IDS` derives from it.
- `menu-base-templates.ts`: `MENU_BASE_TEMPLATES` and `baseDesign(id): MenuDesignDraft` (four complete designs).
- `menu-doc.ts`: `SAMPLE_MENU_DOC` (Hebrew, English and mixed names, four sections).
- `menu-template.ts`: `designCssVars(design)`; `renderMenuDocument(design, doc, { poweredBy: boolean, fonts: 'link' | 'embedded' }): string`
  — a complete HTML document, every text escaped, no `<script>`.
- The designer preview shows `renderMenuDocument(design, SAMPLE_MENU_DOC)` in a sandboxed `<iframe srcdoc>`
  (no `allow-scripts`).

## Goals & Success Criteria
**Primary:** with the `menu_design` module on, the chef opens «עיצובי תפריט», starts a design from a base template,
changes its fonts, colors, background, frame, logo and texts while the sample menu beside the controls updates at
once, saves it under a name, and then renames, duplicates, deletes it or makes it the default from the list.

- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0.
- [auto] `pnpm run test:ci` exits 0, including `src/app/core/services/menu-design-data.service.spec.ts`,
  `src/app/core/utils/menu-design-form.util.spec.ts`, `src/app/core/utils/menu-fonts-link.util.spec.ts`,
  `src/app/shared/menu-preview/menu-preview.component.spec.ts`, `src/app/shared/menu-designer/menu-designer.component.spec.ts`,
  `src/app/pages/menu-design/menu-design-list.page.spec.ts`, `src/app/pages/menu-design/menu-design-edit.page.spec.ts`
  and the updated `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.spec.ts`.
- [auto] `src/app/core/utils/menu-design-form.util.spec.ts`: `designFromForm(baseDesign('classic'))` round-trips to the
  same object; choosing background `texture` without a texture picks the first texture; choosing `image` without a URL
  keeps the old kind; every result passes `menuDesignDraftSchema`.
- [auto] `src/app/shared/menu-preview/menu-preview.component.spec.ts`: the iframe has `sandbox=""` (no
  `allow-scripts`) and its `srcdoc` equals `renderMenuDocument(design, SAMPLE_MENU_DOC, { poweredBy: true, fonts: 'link' })`;
  changing the `design` input changes `srcdoc` without recreating the iframe element.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/764-menu-designer-screen.plan.md` → `ARCH: ok`;
  `node scripts/scope-check.mjs --reuse --plan=plans/764-menu-designer-screen.plan.md` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `SKIP: no database configured`).
- [ui] `e2e/ui/764-1.spec.ts`: with modules `['events', 'menu_design']` set through the platform route, `/menu-library`
  shows the header button «עיצובי תפריט»; with the defaults (no `menu_design`) the button is absent and `/menu-design`
  sends the browser to `/dashboard`. Restores the defaults in `finally`. Screenshot `screens/764-1.png`.
- [ui] `e2e/ui/764-2.spec.ts`: on `/menu-design` with no designs, the empty state says «עוד אין עיצובים לתפריט» with
  «עיצוב חדש»; pressing it and picking «קלאסי» opens the editor whose preview frame contains «תפריט לדוגמה». Screenshot `screens/764-2.png`.
- [ui] `e2e/ui/764-3.spec.ts`: in the editor, typing «מסעדת הים» in «שם העסק» makes the preview frame show «מסעדת הים»
  without saving; «שמירה» with the name «ערב חתונה» returns to the list, which shows «ערב חתונה». Screenshot `screens/764-3.png`.
- [ui] `e2e/ui/764-4.spec.ts`: with two saved designs, the row menu «קביעה כברירת מחדל» on the second moves the
  «ברירת מחדל» chip to it; «שכפול» adds «<name> (עותק)». Screenshot `screens/764-4.png`.
- [human] The look: on a desktop the controls and the sample menu sit side by side and the sample changes as you type
  or pick; each font in the font picker is shown in its own letters; Hebrew, English and mixed sample dishes read
  correctly; an uploaded background picture and an uploaded logo show in the sample.
- [human] the form's page · change one field, then follow a link out of the page · a question asks whether to leave or stay — here: in the designer change a color, then press the menu library link in the header: «לצאת בלי לשמור?» appears and «הישאר» keeps the change.
- [human] the page with the delete button · press delete, then cancel · a confirmation appears and nothing is removed — here: a design's row menu «מחיקה», then «ביטול»: the design stays; with «אישור» it leaves the list (and Trash lists it).
- [human] the list's page with no items · open the page · a message says the list is empty — here: «עיצובי תפריט» of a business with no designs says «עוד אין עיצובים לתפריט» with «עיצוב חדש».
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page — here: with the server stopped, «עיצובי תפריט» shows «לא הצלחנו לטעון את העיצובים» and «נסו שוב».
- [human] any list page on a phone and on a desktop · look at the rows · the page header matches the other list pages and every row stays on one line — here: «עיצובי תפריט» next to «ספריית תפריטים».
- [human] any list page with row actions · look at a row's edit and remove actions · they are the pencil and trash icon buttons used on the products list, with no text buttons — here: a design row's edit and delete.
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal — here: the base-template popup's four choices.
- [human] On a phone the editor shows the sample menu above the controls and every control is reachable by scrolling the page.

## Execution Mode
- Parallel: yes — with 766 (wave 1 of the program, run `md-pdf`); no shared files.
- Concurrent plans: 766.
- Isolated DB: no — writes only `menuDesigns` documents through the generic API and the default through plan 763's route.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/test/helpers/app.js
src/app/core/services/logistics-item-registry.service.spec.ts
src/app/core/services/logistics-visible-items.parity.spec.ts
src/app/core/services/module.service.spec.ts
src/app/core/services/plan-snapshot.service.spec.ts
docs/workflow-kit/manifest.json
src/app/pages/menu-design/**
src/app/shared/menu-designer/**
src/app/shared/menu-preview/**
src/app/core/models/menu-design.model.ts
src/app/core/services/menu-design-data.service.ts
src/app/core/services/menu-design-data.service.spec.ts
src/app/core/services/business.service.ts
src/app/core/services/business.service.spec.ts
src/app/core/utils/menu-design-form.util.ts
src/app/core/utils/menu-design-form.util.spec.ts
src/app/core/utils/menu-fonts-link.util.ts
src/app/core/utils/menu-fonts-link.util.spec.ts
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.spec.ts
src/app/app.config.ts
server/app.js
e2e/ui/764-1.spec.ts
e2e/ui/764-2.spec.ts
e2e/ui/764-3.spec.ts
e2e/ui/764-4.spec.ts
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/utils/breadcrumbs.md
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
- INV-1: preserves — every design write goes through the generic API (`MenuDesignDataService` →
  `/api/v1/data/menuDesigns`, scoped and checked by `assertCan` with the default rules plan 763 set); the default is set
  only through plan 763's owner-only `PUT /api/v1/business/menu-design-default`. The browser only hides (module and
  owner checks); the server stays the gate. `server/app.js` is touched only for the CSP frame line (A6), no permission code.
- INV-3: preserves — setting a default is one request on the business record; no client loop over designs
  (there is no `isDefault` flag). Duplicate is one create.
- INV-4: preserves — the browser builds designs only through `menuDesignDraftSchema` (shared, plan 763); the server
  validates every write against `menuDesignSchema`. No schema change here.
- INV-6: preserves — no AI call in this plan (plan 765 adds it, through `server/routes/ai/`).

## Reuse Check
- `MenuDesignListPage` (`src/app/pages/menu-design/menu-design-list.page.*`) — family: list-page — rung: 2 — why: `app-list-shell` (`layout: 'cards'`) with `app-page-header`, `app-row-actions-menu`, `app-empty-state`; no new list base
- `MenuDesignEditPage` (`src/app/pages/menu-design/menu-design-edit.page.*`) — family: entity-form — rung: 2 — why: hosts `app-menu-designer`; `useUnsavedChanges` + `pendingChangesGuard`, `.c-form-actions` save / cancel as the form recipe says
- base-template popup (`src/app/pages/menu-design/components/base-template-picker/`) — family: modal-shell — rung: 2 — why: `app-modal-shell`, four choice cards, centred, no sheet
- `MenuDesignerComponent` (`src/app/shared/menu-designer/`) — family: none — rung: 4 — why: no piece edits a menu's look; it must be one self-contained component that the designer page, menu intelligence (plan 768) and the later outside setup page all host, so it lives in `shared/` and owns only the form and the preview, never saving
- `MenuPreviewComponent` (`src/app/shared/menu-preview/`) — family: none — rung: 4 — why: no piece shows a whole HTML document safely; a sandboxed `srcdoc` iframe of `renderMenuDocument` is the one way the preview equals the PDF (C-TEMPLATE); plan 765's three variants reuse it
- font, background-kind, texture, frame, divider, size and align pickers — family: chip — rung: 2 — why: `.c-chip-group` with `role="radiogroup"`; a font chip sets `font-family` inline so each font shows in its own letters
- frame width — family: stepper — rung: 1 — why: `app-counter` (0–6)
- text fields (name, business name, contact line) — family: form-field — rung: 1 — why: `app-form-field` + `.c-input`
- rename in the list — family: form-field — rung: 1 — why: `app-inline-rename-field`
- `MenuDesignDataService` (created by plan 763) — family: entity-data-service — rung: 3 — why: adds a resolver, duplicate and `defaultDesign_` to the service 763 builds on `BaseEntityDataService<MenuDesign>`
- `BusinessService.setMenuDesignDefault` — family: http — rung: 3 — why: one PUT through `API.business('menu-design-default')` beside the other business setting calls
- `designFromForm` / `formFromDesign` (`src/app/core/utils/menu-design-form.util.ts`) — family: helpers — rung: 3 — why: pure form ↔ design mapping, one file with its spec
- `menuFontsHref(ids)` (`src/app/core/utils/menu-fonts-link.util.ts`) — family: helpers — rung: 3 — why: one Google Fonts CSS link for the curated fonts, so the font chips can show each font; pure, with a spec

## Adopt Check
- self-contained menu look editor — candidate: none (build) — considered: polotno, grapesjs — verdict: build — license: n/a — why: Polotno is commercial and GrapesJS is a page builder; the design is a fixed schema of a few fields (D8), so a form plus the shared template preview is smaller than either (brief section 6)
- sandboxed HTML preview — verdict: skip — why: a native `<iframe sandbox srcdoc>`; no library

## Defaults

- unsaved-changes-on-leave — applies — how: the edit route has `canDeactivate: [pendingChangesGuard]`; `MenuDesignEditPage.hasRealChanges()` delegates to `useUnsavedChanges` over the designer's draft against the loaded design.
- confirm-destructive-action — applies — how: «מחיקה» opens `ConfirmModalService.open` («למחוק את העיצוב "<שם>"? תפריטים שמשתמשים בו יעברו לעיצוב ברירת המחדל.»); cancel changes nothing; delete is the soft delete (Trash).
- empty-state-on-list — applies — how: `app-empty-state` «עוד אין עיצובים לתפריט» with «עיצוב חדש».
- loading-and-error-states — applies — how: the route resolver loads the designs; a failed load shows «לא הצלחנו לטעון את העיצובים» with «נסו שוב»; an upload or save failure is a toast and the editor keeps its draft.
- hints-in-tooltips — applies — how: each base-template choice in the popup and each background kind carries its explanation as `[attr.title]` + `aria-describedby`; the popup holds no hint text.
- app-list-container — applies — how: `app-list-shell` + `app-page-header`, each design one card row on one line (name, a strip of its six colors, the title font name, the «ברירת מחדל» chip).
- row-action-icons — applies — how: the card's `app-row-actions-menu` uses `.c-icon-btn` pencil (edit) and trash-2 (delete); rename, duplicate and set default are menu items.
- one-breakpoint-set — applies — how: the editor changes from stacked to side by side only at the shared desktop breakpoint (`src/app/core/styles/_breakpoints.scss`).
- leave-and-return — exception — why: the designer sends the user nowhere to act; the menu library button only opens it.
- anchored-popup — exception — why: the base-template choice is a centred `app-modal-shell`, not a small floating box.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want to set once how my menus look — fonts, colors, background, frame and logo — so that every menu I
  send looks like my business without designing it each time.
- As a chef, I want to see sample dishes in the design while I change it, so that I can judge the fonts and spacing.
- As a chef, I want several named designs (everyday, wedding) and one default, so that a new menu starts in the right look.

## Functional Requirements

### Must Have (P0)
- [ ] **Routes** (append to `app.routes.ts`): `menu-design` → `MenuDesignListPage`; `menu-design/new?base=<id>` and
  `menu-design/:id` → `MenuDesignEditPage` with `canDeactivate: [pendingChangesGuard]`. All three:
  `canActivate: [authGuard, moduleGuard(['menu_design'])]`, `resolve: { designsLoaded: menuDesignsEnsureLoadedResolver }`
  (a resolver exported from `menu-design-data.service.ts`, family `page-entry-loading`).
- [ ] **Entry point**: the menu library header gets a ghost button «עיצובי תפריט» (icon `palette`) before «תפריט חדש»,
  shown when `modules.has('menu_design') && modules.has('events')` (C-MODULE), linking to `/menu-design`.
- [ ] **Model and data**: plan 763 creates `src/app/core/models/menu-design.model.ts` and
  `MenuDesignDataService extends BaseEntityDataService<MenuDesign>` (`'menuDesigns'`). This plan adds what the screens
  need, keeping 763's method names: `allDesigns_`, add / update / delete if 763 left any out, `duplicateDesign(id)` = one create with
  ` (עותק)` added to the name, cut to 60 characters).
- [ ] **Default**: `BusinessService.setMenuDesignDefault(id)` → `PUT API.business('menu-design-default')` `{ designId }`,
  then refreshes `business_`. `MenuDesignDataService.defaultDesign_` = computed per C-SETTINGS: `business_().menuDesign.defaultDesignId`
  if live, else the first live design by `createdAt`, else `null` (the caller then uses `baseDesign('classic')`).
- [ ] **List page** (`recipe-list`): title «עיצובי תפריט», a line under it «כאן קובעים איך התפריט נראה: רקע, מסגרת, גופנים,
  צבעים ולוגו. את המנות כותבים בתפריט עצמו.» (M1), search by name, «עיצוב חדש» (primary). Each card: name, six color
  dots, the title font's name, chip «ברירת מחדל» on the default. Row menu: edit (pencil), «שינוי שם» (inline rename),
  «שכפול», «קביעה כברירת מחדל» (owner only, hidden on the default), delete (trash, confirm). Staff see the list and can
  edit designs they created (INV-1 default rules); «קביעה כברירת מחדל» shows only for `isOwner_()`.
- [ ] **New design**: «עיצוב חדש» opens the base-template popup with four cards («קלאסי», «מודרני», «כפרי», «מינימלי»),
  each a small `app-menu-preview` of `baseDesign(id)`; a pick goes to `menu-design/new?base=<id>`, whose draft is
  `baseDesign(id)` with name «עיצוב חדש» and `fixedTexts.businessName` = the business name.
- [ ] **Designer component** `app-menu-designer` (`src/app/shared/menu-designer/`): `design = model.required<MenuDesignDraft>()`,
  `sampleDoc = input(SAMPLE_MENU_DOC)`, `uploading = output<boolean>()`. It never saves. Groups, each a titled section:
  - «גופנים» — three pickers (כותרת, קטגוריה, מנה), each a chip group of `MENU_FONTS`, every chip written in its own font.
  - «צבעים» — six color fields (רקע הדף, טקסט, כותרת, קטגוריה, הדגשה, מסגרת): a native `input type="color"` plus a hex
    text field; an invalid hex shows the field error and is not applied.
  - «רקע» — kind chips (צבע / טקסטורה / תמונה); textures as a grid of swatches drawn by `designCssVars`; image: «העלאת
    תמונה» (`CloudinaryService.upload` after `downscaleImage` to 2400 px), fit chips (מלא / חוזר), «שכבת צבע» slider 0–80%.
  - «מסגרת וקווים» — frame style chips, width `app-counter` 0–6, inset chips; divider chips.
  - «לוגו» — upload (same path, 800 px), remove, size chips, placement chips (למעלה / בלי).
  - «פריסה» — align chips, density chips, three size chip groups (כותרת, קטגוריה, מנה).
  - «טקסטים קבועים» — business name (max 60), contact line (max 120).
  - The preview `app-menu-preview` beside the controls (desktop, sticky) or above them (phone, `max-block-size: 60vh`,
    scaled to the width).
- [ ] **Preview component** `app-menu-preview`: inputs `design`, `doc`, `poweredBy = input(true)`; one `<iframe sandbox=""
  [srcdoc]>` whose value is `renderMenuDocument(...)` through `DomSanitizer.bypassSecurityTrustHtml` (the string is
  built only by the shared escaped renderer); scaled with `transform: scale()` from the A4 width to the host width
  (`ResizeObserver`); `title` attribute «תצוגה מקדימה של התפריט».
- [ ] **Edit page** (`recipe-form`): `app-page-header` («עיצוב חדש» or «עריכה: <name>», back to `/menu-design`), the name
  field, `app-menu-designer`, `.c-form-actions` with «ביטול» and «שמירה» (`isSaving_`, disabled while an upload runs).
  Save: create or update through the data service, success toast «העיצוב נשמר», back to the list.

### Should Have (P1)
- [ ] The font chips load all curated fonts with one `<link rel="stylesheet" href={{ menuFontsHref(MENU_FONT_IDS) }}>`
  added to `document.head` once, when the designer first opens.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Page recipe: recipe-list — `/menu-design` (the designs list; cards layout of `app-list-shell`).
- Page recipe: recipe-form — `/menu-design/new` and `/menu-design/:id` (one record edited; the designer's groups are the
  form sections, the preview sits beside them; save / cancel in `.c-form-actions`). Not `recipe-settings`: a design is a
  named record of a list, not an option of the business.
- RTL: the page is Hebrew RTL with logical properties; the preview frame sets nothing itself — `renderMenuDocument` puts
  `dir="auto"` on every text (D17).
- Dictionary keys (`public/assets/data/dictionary.json`, append): `menu_designs`, `menu_designs_intro`,
  `menu_design_new`, `menu_design_edit_title`, `menu_design_saved`, `menu_design_load_failed`, `menu_designs_empty`,
  `menu_design_default_chip`, `menu_design_set_default`, `menu_design_duplicate`, `menu_design_copy_suffix`,
  `menu_design_rename`, `menu_design_delete_confirm`, `menu_design_base_classic`, `menu_design_base_modern`,
  `menu_design_base_rustic`, `menu_design_base_minimal`, `menu_design_base_hint_*` (four), `menu_design_group_fonts`,
  `menu_design_group_colors`, `menu_design_group_background`, `menu_design_group_frame`, `menu_design_group_logo`,
  `menu_design_group_layout`, `menu_design_group_texts`, the field labels of each group (`menu_design_font_title`, …),
  `menu_design_upload_image`, `menu_design_upload_logo`, `menu_design_remove_logo`, `menu_design_veil`,
  `menu_design_preview_title`, `menu_design_invalid_hex`, and one key per texture, frame style, divider, size, align
  and density value.
- Icons (register in `src/app/app.config.ts`): `palette`, `copy`, `star`, `image-up` (check which are already registered).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let the designs data service duplicate designs, load before a page and name the default design — extends what plan 763 created (model + MenuDesignDataService): resolver, duplicateDesign, defaultDesign_ per C-SETTINGS; setMenuDesignDefault on the business service — src/app/core/models/menu-design.model.ts, src/app/core/services/menu-design-data.service.ts (+ spec), src/app/core/services/business.service.ts (+ spec)
- [ ] A2: Map the designer form to a design and back, and build one font link for the curated fonts — designFromForm, formFromDesign, menuFontsHref; specs as in Done-when — src/app/core/utils/menu-design-form.util.ts, src/app/core/utils/menu-fonts-link.util.ts (+ specs)
- [ ] A3: Show any design on the sample menu in a safe frame that scales to its box — sandboxed srcdoc iframe of renderMenuDocument, ResizeObserver scale, no element recreate on change — src/app/shared/menu-preview/**
- [ ] A4: Build the self-contained designer with every look control and the live preview — the seven groups, uploads through CloudinaryService with downscaleImage, chip groups, counter, color fields with hex check; never saves — src/app/shared/menu-designer/**
- [ ] A5: Add the designs list, the base-template popup and the edit page, reached from the menu library — routes (append), list page (cards, row menu, empty and error states), popup, edit page with save, cancel and leave guard, the header button with the module check, dictionary keys, icons — src/app/pages/menu-design/**, src/app/pages/menu-library/components/menu-library-list/*, src/app/app.routes.ts, public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] A6: Make sure the preview frame is allowed in the served build — build, serve through the slot's server (port 300N), open the editor; if the console shows a frame-src refusal, change only `frameSrc: ["'none'"]` to `frameSrc: ["'self'"]` in server/app.js and record the line in Execution Notes; else record "no change" — server/app.js
- [ ] A7: Prove the designer in the running app with four short UI tests — the four specs as in Done-when, each restoring the business's modules — e2e/ui/764-1.spec.ts, e2e/ui/764-2.spec.ts, e2e/ui/764-3.spec.ts, e2e/ui/764-4.spec.ts
- [ ] A8: Record the new pieces in the folder maps and the family registry — breadcrumbs for pages, shared, services, models and utils; menu-designer and menu-preview as new families; inventory lines — src/app/pages/breadcrumbs.md, src/app/shared/breadcrumbs.md, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md, src/app/core/utils/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md

## Technical Considerations
- Dependencies: plan 763's schema, settings route and `shared/schemas/menu-design/` template (`@schemas/menu-design/*`); `CloudinaryService`; `ModuleService`.
- New files needed: listed in the Reuse Check and the scope.
- Model changes: none in the shared schema (763 owns it); the browser model only re-exports it.
- Backend / API: none new. Uses `/api/v1/data/menuDesigns` (generic) and `PUT /api/v1/business/menu-design-default` (763).
- Auth and validation: the generic API validates against `menuDesignSchema` and checks `assertCan`; the default route is owner-only (763). The browser checks `menuDesignDraftSchema` before saving so a bad hex never reaches the server.
- Security surface: the preview iframe runs no script (`sandbox=""`) and its HTML comes only from the shared renderer, which escapes every text and accepts images only from `https://res.cloudinary.com/` (C-TEMPLATE). Uploads use the existing unsigned preset (public images, M8) — no new secret. A6 may widen `frame-src` to `'self'` only.
- Data / migration: none.
- Project checks: log-query item (Done-when); Reuse Check present; page recipe lines in UI/UX Notes; breadcrumbs listed in scope; Hebrew strings through `translatePipe` and `dictionary.json`; icons registered; hotspots append-only.

## Out of Scope
- AI variants and refining in words (plan 765).
- Showing a menu in its design inside menu intelligence, the design switcher on a menu (plan 768).
- PDF export (plans 766, 767).
- The platform admin's «Powered by» switch (plan 763) — the preview always shows the line here.
- A slim outside setup page hosting the designer (last stage).

## Critical Questions
- Q: Where does the chef reach the designer? A: a button «עיצובי תפריט» in the menu library header plus a second entry inside menu intelligence (plan 768) — confirmed by Dandan 2026-11-27.

## Execution Notes
- behaviour: staff may create and edit designs (the default INV-1 rules plan 763 keeps); only the owner sets the default.
- behaviour: deleting the default design leaves no default; C-SETTINGS then uses the first live design by `createdAt`.
- behaviour: on a phone the sample menu sits above the controls, capped at 60% of the screen height.
- behaviour: a design's copy is named «<name> (עותק)».
