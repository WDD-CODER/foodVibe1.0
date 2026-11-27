# Plan 769 — Menu intelligence wears the design: design switcher, subtitle and note, export button

Status: draft
Depends-on: 717, 764, 765, 768
Track: code
Snapshot: d34a01068fe2f1b28efd33b753b8a3f69aa8762b

## Problem Statement
The chef builds menus in menu intelligence on a fixed "paper" sheet. After plans 764–768 a business can design
the look of its menus and export a designed PDF, but the editor still shows the old paper look, has no subtitle or
bottom note, and has no way to export the PDF. Dandan (2026-11-27, map M2): the editor keeps working exactly as
today — dish rows, pickers and money tools unchanged — and the saved design is painted onto the existing sheet as
its background and styling.

Program map: `docs/menu-design/menu-design-map.md` (decisions M1–M9, contracts frozen 2026-11-27).

Verified on `d34a0106` (2026-11-27):
- `src/app/pages/menu-intelligence/menu-intelligence.page.html:25-243` — the sheet is `.paper-outer > .paper[formGroup] > .paper-inner`
  with `.paper-ornament top/bottom`, the title input `.menu-title-input` (:80), `.info-menu-divider` (:144),
  `.section-divider` (:151), `.section-title-plain` (:174), `app-menu-dish-row` (:192). Toolbar `.pill-row` (:4-14).
- `menu-intelligence.page.ts:189-197` the form (`name, eventType, eventDate, servingType, guestCount, money, sections`);
  `loadEvent` (:844), `buildEventFromForm` (:929), `persist_` (:806); hero-FAB actions (:259-264).
- `_paper-ui.scss` reads `--paper-sheet`, `--paper-edge`, `--paper-gold`, `--paper-gold-line`, `--paper-brown`,
  `--paper-border`, `--font-serif` (tokens in `src/styles.scss:202-222`).
- `components/menu-dish-row/menu-dish-row.component.scss:91,188,196,205` dish names use `var(--font-serif)` and
  `var(--color-ink)` — so the dish font and colour can change by setting those two properties on the dish list,
  **without editing the dish row** (M2).

## Contracts used (verbatim from the map)

### C-MODULE
- New module key `menu_design` in `MODULE_KEYS` (`shared/schemas/modules-pure.ts`). **Not** in `DEFAULT_MODULES`:
  a business without it sees menu intelligence exactly as today (D2). Only the platform admin switches it on (existing path).
- `MODULE_OF_TYPE.menuDesigns = ['menu_design']`.
- Menus are `menuEvents`, gated by `events`. Every menu-design screen and button shows only when the business has
  **both** `menu_design` and `events` (`ModuleService.has`). The designer page itself needs only `menu_design`.

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

### C-TEMPLATE (the part this plan uses)
Location (map extension E1): `shared/schemas/menu-design/`, imported in the browser as `@schemas/menu-design/*`.
- `menu-template.ts`:
  - `designCssVars(design): Record<string, string>` — `--md-page`, `--md-text`, `--md-title`, `--md-section`,
    `--md-accent`, `--md-border`, `--md-font-title`, `--md-font-section`, `--md-font-dish`, `--md-title-size`,
    `--md-section-size`, `--md-dish-size`, `--md-gap`, `--md-frame-width`, `--md-bg` (color, texture or image layer).
- The designer preview shows `renderMenuDocument(design, SAMPLE_MENU_DOC)` in a sandboxed `<iframe srcdoc>`
  (no `allow-scripts`). Menu intelligence does **not** use the iframe: it puts `designCssVars` on its existing
  `.paper` sheet (M2), so the editor wears the same fonts, colors, background, frame and logo.

### C-ENGINE (the part this plan calls)
- `exportMenuPdf({ businessId, eventId, actor }) → { fileId, url }` (plan 768), reached in the browser through
  plan 768's `MenuPdfService`.

## Goals & Success Criteria
**Primary:** a chef with the module opens a menu and sees it in the business's default design, types dishes on it
as today, switches to a second design, adds a subtitle and a bottom note, and exports a PDF; a chef without the
module sees exactly today's editor.

- [auto] `pnpm run test:ci` passes, including the new `src/app/pages/menu-intelligence/menu-design-sheet.util.spec.ts` (a menu with `designId` of a live design → that design; no `designId` → the business default; a deleted `designId` → the default; no designs → `baseDesign('classic')`; `sheetStyle(design)` returns every `--md-*` key of `designCssVars` plus the `--paper-*`/`--font-serif`/`--color-ink` mappings) and new cases in `src/app/pages/menu-intelligence/menu-intelligence.page.spec.ts` (module `menu_design` off → no `.paper--designed` class, no `[data-testid="menu-design-switcher"]`, no `[data-testid="menu-export-pdf"]`, no subtitle input; on → all present; `subtitle` and `bottomNote` load from the event and are in `buildEventFromForm()`; switching the design sets `designId` and marks the form dirty).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `e2e/ui/769-1.spec.ts`: a QA business with `menu_design` and `events` on and two saved designs · open a saved menu at `/menu-intelligence/<id>` · the sheet has the class `paper--designed` and `[data-testid="menu-design-switcher"]` shows the default design's name; pick the second design → the switcher shows its name. Screenshot saved.
- [ui] `e2e/ui/769-2.spec.ts`: same business · type a subtitle and a bottom note, save, reopen the menu · both texts are back on the sheet; press `[data-testid="menu-export-pdf"]` → the toolbar shows `[data-testid="menu-latest-export"]`. Screenshot saved.
- [ui] `e2e/ui/769-3.spec.ts`: the same business with `menu_design` switched off · open the same menu · no `paper--designed`, no switcher, no export button, no subtitle field. Screenshot saved.
- [human] a menu on a laptop with the module on: the sheet wears the design — its background, frame, colours, fonts, logo, business name and contact line — while the dish rows, the dish picker and the ₪ / cost tools look and work as before.
- [human] the same menu with the module off (or a business that never had it): the editor looks exactly as it did before this plan.
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page (here: a menu whose designs cannot load keeps today's paper look and shows the error toast)
- [human] the exported PDF opened from "latest export" shows the same design, the subtitle and the note, and no prices.

## Execution Mode
- Parallel: no — runs alone in wave 3 (`md-editor`), after 717, 764, 765 and 768 are merged.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/business.js
server/test/business-menu-design.test.js
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.scss
src/app/pages/menu-intelligence/menu-intelligence.page.spec.ts
src/app/pages/menu-intelligence/_paper-ui.scss
src/app/pages/menu-intelligence/_toolbar.scss
src/app/pages/menu-intelligence/menu-design-sheet.util.ts
src/app/pages/menu-intelligence/menu-design-sheet.util.spec.ts
src/app/pages/menu-intelligence/components/menu-design-switcher/**
src/app/pages/breadcrumbs.md
public/assets/data/dictionary.json
src/app/app.config.ts
e2e/ui/769-1.spec.ts
e2e/ui/769-2.spec.ts
e2e/ui/769-3.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — browser-only change inside the menu editor; the new menu fields, the design records, the module and the export route are added and checked by plans 764 and 768 (INV-1, INV-4, INV-6 lines live there). The editor saves through the existing generic `menuEvents` write, which the server validates (INV-4) and which keeps `latestExport` server-owned.

## Reuse Check

- Design switcher (`app-menu-design-switcher`) — family: chip — rung: 2 — why: a toolbar `.pill` (the paper skin's own pill, kept on purpose by the chip family) that opens the existing `app-search-combobox` (`variant="plain"`, `listPosition="inline"`) with the business's designs — the same pattern as the event-type chip on the same sheet (`menu-intelligence.page.html:31-62`).
- Design lookup on the sheet (`menu-design-sheet.util.ts`: `sheetDesign`, `sheetStyle`) — family: helpers — rung: 3 — why: a pure helper beside the page that calls 764's `designCssVars`/`baseDesign` and C-SETTINGS' fallback rule; it only maps the `--md-*` values onto the sheet's existing `--paper-*`, `--font-serif` and `--color-ink` properties.
- Designs and default — family: entity-data-service — rung: 1 — why: plan 765's `MenuDesignDataService` (designs list, the business default) as it is.
- Export and latest export — family: http — rung: 1 — why: plan 768's `MenuPdfService` as it is.
- Module check — family: module-gate — rung: 1 — why: `ModuleService.has('menu_design') && has('events')`; the hero-FAB action uses its `module` field.
- Subtitle and bottom note fields — family: form-field — rung: 2 — why: borderless inputs in the paper skin, the same as the existing `.menu-title-input` (not boxed `app-form-field`: the sheet is the printed menu).
- Saving / feedback — family: feedback — rung: 1 — why: `useSavingState`, `UserMsgService`, `app-loader` as the page uses them today.

## Adopt Check
- none — why: no new package; the design values, template helpers and PDF service come from plans 764, 765 and 768.

## Defaults

- unsaved-changes-on-leave — applies — how: the subtitle, bottom note and design choice are controls of the page's existing `form_`, so the existing `useUnsavedChanges` + `pendingChangesGuard` ask before leaving.
- loading-and-error-states — applies — how: the designs load with the page (plan 765's service); a failed design load leaves the sheet in today's paper look and shows a toast; a failed export shows a toast and keeps the button.
- house-keyboard-focus — applies — how: the switcher is a button that opens the shared search box; Escape closes it and focus returns to the switcher.
- one-breakpoint-set — applies — how: any phone rule for the logo / switcher uses the shared `$break-*` names only.
- row-action-icons — exception — why: no list rows are added or changed; the dish rows keep their own controls (M2).
- empty-state-on-list — exception — why: no list page is added; the design list inside the switcher always has at least the base design.
- app-list-container — exception — why: no list page is added; the editor is a paper sheet, not a list screen.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

Also check, by symbol, that the pieces this plan takes from earlier plans exist on `main` with these names:
`designCssVars`, `baseDesign` (764), `MenuDesignDataService` and the designer route (765), `MenuPdfService` (768),
the `MenuEvent` fields `designId`, `subtitle`, `bottomNote`, `latestExport` (764). A different name → use it and note it
in Execution Notes; a missing piece → STOP and escalate.

## User Stories
- As a chef, I want the menu I am building to already look like my business's menu design so that I see what my customer will get while I type the dishes.
- As a chef, I want to switch a menu to another of my designs (a wedding design, a business-lunch design) in one tap so that each offer gets the right look.
- As a chef, I want to add a subtitle and a short note at the bottom of the menu so that the offer reads like a finished menu.
- As a chef, I want one button that makes the PDF so that I can send the menu to my customer straight away.

## Functional Requirements

### Must Have (P0)
- [ ] Gate: everything below shows only when `ModuleService.has('menu_design') && ModuleService.has('events')`. Without it the page renders exactly as today (no class, no element, no request for designs).
- [ ] The sheet's design: `sheetDesign` calls 764's shared `resolveMenuDesign` (map E9, never its own copy of the rule) → the menu's design when it is a live design of the business; otherwise the business default; otherwise the first live design by `createdAt`; otherwise `baseDesign('classic')` (C-SETTINGS rule).
- [ ] The sheet wears it: `.paper` gets the class `paper--designed` and the style object `sheetStyle(design)` = `designCssVars(design)` plus mappings onto the properties the paper skin already reads: `--paper-sheet: var(--md-page)`, `--paper-edge` / `--paper-border`: `var(--md-border)`, `--paper-gold` / `--paper-gold-line`: `var(--md-accent)`, `--paper-brown: var(--md-section)`, and on the dish list `--font-serif: var(--md-font-dish)`, `--color-ink: var(--md-text)`. The title uses `--md-font-title` / `--md-title`, section titles `--md-font-section` / `--md-section`. Background = `--md-bg`; frame width and style from the design (`paper--frame-<style>` class: none, line, double, rounded, ornament); the `✦` dividers follow `design.divider` (none hides them, line / dots / ornament).
- [ ] Logo and fixed texts on the sheet: when `design.logo.placement === 'top'` and a URL is set, the logo sits above the tag line at the design's size (s/m/l); `fixedTexts.businessName` under it; `fixedTexts.contactLine` at the bottom of the sheet above the bottom ornament. Printed with the sheet.
- [ ] Fonts: the design's three Google fonts are loaded the way plan 765 loads them for the designer preview (one `<link>` per family, added once); until they load the sheet shows the fallback font, never blank text.
- [ ] Design switcher: a toolbar pill (`[data-testid="menu-design-switcher"]`, palette icon + the current design's name) opens the shared search box with the business's designs; picking one sets the form's `designId` (dirty form, saved with the menu). The list ends with "edit designs" that saves first when needed (existing `saveAndWait`) and opens plan 765's designer for the current design.
- [ ] Subtitle and bottom note: a borderless `subtitle` input under the title (max 120) and a borderless `bottomNote` textarea at the end of the sections (max 300), both in `form_`, loaded in `loadEvent`, written in `buildEventFromForm` only when not empty. The internal `notes` log is untouched.
- [ ] Export PDF: a toolbar pill `[data-testid="menu-export-pdf"]` (file-down icon). A new or changed menu is saved first (existing `saveAndWait`); then `MenuPdfService.export(eventId)`; while it runs the pill is disabled with a small `app-loader`; done → the PDF opens in a new tab and a success toast shows; failed → an error toast (`menu_pdf_failed`), the button comes back.
- [ ] Latest export: when the menu has `latestExport`, a small link `[data-testid="menu-latest-export"]` ("PDF אחרון · <date>") opens it (`MenuPdfService` signed URL). When `latestExport.designId` differs from the current design or the menu changed after `latestExport.at`, the link reads "PDF ישן — ייצא מחדש" (the export is not re-run by itself).

### Should Have (P1)
- [ ] A hero-FAB action "PDF" (`module: 'menu_design'`) beside the existing print action, running the same export.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Page recipe: not triggered — no page or route is added and the editor's frame (toolbar, sheet, panels, scroll) stays as plan 717 leaves it; the switcher and export are two more pills in the existing `.pill-row`.
- Behaviour: house-keyboard-focus (switcher popup), no drag, no new scroll area, no animation.
- RTL: the sheet stays `dir="rtl"`; the subtitle / note inputs get `dir="auto"` so an English line reads left to right (D17). Logical properties only.
- New `dictionary.json` keys: `menu_design_switcher_label` ("עיצוב התפריט"), `menu_design_edit_designs` ("עריכת עיצובים"), `menu_subtitle_placeholder` ("כותרת משנה"), `menu_bottom_note_placeholder` ("הערה בתחתית התפריט"), `menu_export_pdf` ("PDF"), `menu_export_pdf_busy` ("מכין PDF…"), `menu_pdf_ready` ("ה־PDF מוכן"), `menu_pdf_failed` ("לא הצלחנו להכין PDF, נסו שוב"), `menu_latest_export` ("PDF אחרון"), `menu_latest_export_stale` ("PDF ישן — ייצא מחדש").
- Icons: `palette`, `file-down` registered in `src/app/app.config.ts` if not already.
- Print (`window.print()`): the designed sheet prints with its background and logo; controls keep `.no-print`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Work out which design a menu wears and turn it into the sheet's style values — sheetDesign (thin call to the shared resolveMenuDesign from 764, map E9) and sheetStyle (designCssVars + --paper-*/--font-serif/--color-ink mappings), with specs — src/app/pages/menu-intelligence/menu-design-sheet.util.ts, src/app/pages/menu-intelligence/menu-design-sheet.util.spec.ts
- [ ] A2: Paint the chosen design onto the existing paper sheet without touching the dish rows — paper--designed and paper--frame-* classes, divider styles, logo / business name / contact line elements, font links, all behind the module check — src/app/pages/menu-intelligence/menu-intelligence.page.ts, src/app/pages/menu-intelligence/menu-intelligence.page.html, src/app/pages/menu-intelligence/_paper-ui.scss, src/app/pages/menu-intelligence/menu-intelligence.page.scss
- [ ] A3: Let the chef switch a menu to another design and jump to the designer from the toolbar — app-menu-design-switcher pill + shared search box, designId in form_, "edit designs" link — src/app/pages/menu-intelligence/components/menu-design-switcher/, src/app/pages/menu-intelligence/menu-intelligence.page.ts, src/app/pages/menu-intelligence/menu-intelligence.page.html, src/app/pages/menu-intelligence/_toolbar.scss
- [ ] A4: Add a subtitle and a bottom note to the menu sheet and save them with the menu — form_ controls, loadEvent, buildEventFromForm — src/app/pages/menu-intelligence/menu-intelligence.page.ts, src/app/pages/menu-intelligence/menu-intelligence.page.html, src/app/pages/menu-intelligence/_paper-ui.scss
- [ ] A5: Give the chef one button that saves the menu and makes its PDF, plus a link to the latest one — export pill, latest-export link with the stale wording, optional hero-FAB action — src/app/pages/menu-intelligence/menu-intelligence.page.ts, src/app/pages/menu-intelligence/menu-intelligence.page.html, src/app/pages/menu-intelligence/_toolbar.scss
- [ ] A6: Add the Hebrew texts and icons the new controls use — dictionary keys from UI/UX Notes, palette and file-down icons — public/assets/data/dictionary.json, src/app/app.config.ts
- [ ] A7: Prove the module gate and the new fields in page specs and three short browser checks — page spec cases from Done-when; the three browser checks switch modules through the admin platform route the way plan 620's browser check does — src/app/pages/menu-intelligence/menu-intelligence.page.spec.ts, e2e/ui/769-1.spec.ts, e2e/ui/769-2.spec.ts, e2e/ui/769-3.spec.ts
- [ ] A8: Update the pages folder map for the new switcher component and sheet helper — src/app/pages/breadcrumbs.md
- [ ] A9: Only businesses with the menu design module may set a default design, like every other menu-design route — add requireModule('menu_design') to PUT /menu-design-default (left ungated by plan 764, run md-0 note) and a module-off 403 test — server/routes/business.js, server/test/business-menu-design.test.js

## Technical Considerations
- M2 guard: `components/menu-dish-row/**` and `components/pricing-meter/**` are deliberately outside the Read-Write Scope, so the runner's scope check refuses any change to them.
- Dependencies: plan 717 (paper skin on tokens — this plan maps the design onto the tokens 717 names; if 717 renamed a `--paper-*` property, map the 717 name), plan 764 (`designCssVars`, `baseDesign`, `MenuEvent` fields), plan 765 (`MenuDesignDataService`, designer route, font loading), plan 768 (`MenuPdfService`).
- If 717 is not merged when 768 merges: the map says Dandan chooses — wait, or run this plan on today's classes (the mapping above already targets the `--paper-*` properties that exist today) and let 717 rebase onto it. Without his answer the plan waits (Depends-on keeps 717).
- New files needed: `menu-design-sheet.util.ts` (+ spec), `components/menu-design-switcher/` (ts, html, scss, spec), e2e specs.
- Model changes: none here (the `MenuEvent` fields come from 764).
- Backend / API: none — saves through the existing generic `menuEvents` PUT/POST; export through plan 768's route.
- Auth and validation: none new — the server already validates the menu write (INV-4) and strips `latestExport`.
- Security surface: none — the logo and background URLs are only `https://res.cloudinary.com/` (C-DESIGN validation); they are bound as CSS `url()` values from `designCssVars`, never as HTML.
- Data / migration: none — a menu without `designId` simply wears the default.
- Project checks: log-query item present; `[ui]` specs under `e2e/ui/769-*.spec.ts` with `signInQa`; Hebrew through `translatePipe`; logical CSS only; breadcrumbs listed; `dictionary.json` append-only.

## Out of Scope
- Any change to `menu-dish-row`, the dish picker, the ₪ / cost fields, the pricing meter, the stage bar, notes, logistics (M2).
- Drag-to-reorder (M9).
- Designing (plans 765, 766) and the PDF engine itself (plans 767, 768).
- Unlinked sections from text menus (plan 770).

## Critical Questions
- Q: If plan 717 is not merged when 768 merges, wait for it or build on today's classes? A: wait for 717 (the default, Planner 2026-11-27); Dandan may switch to "build on today's classes" before `md-3` starts.

## Execution Notes
- behaviour: the subtitle and bottom note show only when the module is on; a menu that has them keeps them stored when the module is switched off (hidden, not deleted).
- behaviour: an export of a menu with unsaved changes saves it first, so the PDF always matches what the chef sees.
- behaviour: a stale latest export is only labelled, never re-made by itself.
