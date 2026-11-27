# Plan 768 — Customer menu PDF export: one complete A4 file, powered-by line, latest export kept

Status: draft
Depends-on: 764, 767
Snapshot: d34a01068fe2f1b28efd33b753b8a3f69aa8762b

## Problem Statement

A chef who has built a menu in menu intelligence must be able to hand the customer one complete, designed PDF
(D13): logo, business name, title, subtitle, sections, dish names, bottom note and contact line, in the menu's
design, never prices or costs (M3). Plan 764 gives the template (`renderMenuDocument`, `menuDocFromEvent`) and plan
767 the render service (`renderPdf`). Nothing yet turns a saved menu into that file, keeps the latest one (D16),
prints the "Powered by FoodVibe" line (D15) or lets the platform admin switch that line off. This plan builds the
export as the first function of the menu engine (C-ENGINE), so the app now and WhatsApp later call the same code.
The button in the editor is plan 769.

## Goals & Success Criteria

**Primary:** `POST /api/v1/menu-design/export/:eventId` turns a saved menu into one A4 PDF in its design, keeps it
as the menu's latest export, and the platform admin can hide the powered-by line per business.

- [auto] `pnpm run test:server` passes, including `server/test/menu-export.test.js`:
  - owner: 200, `Content-Type: application/pdf`, body starts with `%PDF-`; `latestExport` set with the menu's design id.
  - a second export replaces `latestExport.fileId` and deletes the previous stored file (memory file store).
  - staff who may read the menu (allowed stage): 200; staff for a stage the owner hid: 404.
  - a menu of another business: 404; module `menu_design` off: 403 `MODULE_OFF`; module `events` off: 403 `MODULE_OFF`.
  - `hidePoweredBy: true` on the business → the rendered HTML handed to `renderPdf` has no powered-by line; `false`
    or missing → it has it.
  - the HTML handed to `renderPdf` holds no `sellPrice`, `foodCost` or ₪ value of the menu (render mocked).
  - file store not configured → still 200 with the PDF, `latestExport` not set.
  - `GET /api/v1/menu-design/export/:eventId/latest` → `{ url, at, designId }`, or 404 `NO_EXPORT`.
- [auto] `server/test/menu-export-real.test.js` either passes or prints `SKIP menu-export-real: no chromium`:
  a short fixture menu gives a 1-page PDF; the long fixture (Hebrew, English and mixed names, 9 sections) gives 2 or
  more pages in one file; a section that fits on the next page starts there instead of splitting (the fixture's
  section-break marker text appears on page 2 only).
- [auto] `src/app/core/services/menu-pdf.service.spec.ts` passes in `pnpm run test:ci` (export returns a Blob from
  `API.menuDesign('export/<id>')`, latest returns the link or null on 404).
- [auto] `npm run build` passes.
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan runs `node server/scripts/menu-export-sample.js` (the builder prints the exact line in Execution
  Notes) and opens the PDF it writes for the long fixture: one file, A4, Hebrew right-to-left, English left-to-right,
  mixed names in the right order, no section cut in half, the powered-by line at the end of the last page.
- [human] On the platform dashboard, Dandan opens a business, ticks "hide Powered by FoodVibe" with a reason, saves;
  the business's next export has no powered-by line; unticking brings it back.

## Execution Mode
- Parallel: yes
- Concurrent plans: 766 (wave 2, run `md-ai`; no shared files)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/menu-engine/**
server/routes/menu-design.js
server/routes/admin.js
server/scripts/menu-export-sample.js
shared/schemas/entities/stored-file.schema.ts
server/breadcrumbs.md
server/test/menu-export.test.js
server/test/menu-export-real.test.js
server/test/fixtures/menu-export/**
server/test/menu-design-route.test.js
server/test/admin-business.test.js
src/app/core/services/menu-pdf.service.ts
src/app/core/services/menu-pdf.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/services/platform-admin.service.ts
src/app/core/services/breadcrumbs.md
src/app/pages/platform-dashboard/components/platform-business-dialog/**
public/assets/data/dictionary.json
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the export reads the menu only through `scopeFilter(req)` plus `withEventVisibility` (staff see
  only stages the owner allowed), so a member exports only a menu they may read and never another business's; the
  `latestExport` write is the server's own field, scoped the same way; `hidePoweredBy` is written only through the
  platform admin route (`requirePlatformAdmin`, with a reason and a platform history row).
- INV-2: preserves — every query in `server/services/menu-engine/**` goes through `server/utils/business-scope.js`;
  nothing touches `__master__` items.
- INV-4: preserves — the new stored-file kind `menu_pdf` is added to the one schema (`stored-file.schema.ts`), and the
  stored-file document is still parsed by `storedFileSchema` before it is written.

## Reuse Check

- menu engine (exportMenuPdf, host.js in server/services/menu-engine/) — family: none — rung: 4 — why: C-ENGINE needs one boundary that the app now and WhatsApp and the outside API later call; no server service builds a document from a menu today; registered as the new `menu-engine` family.
- menu PDF export route in server/routes/menu-design.js — family: server-auth — rung: 1 — why: verifyToken, requireModule twice (menu_design, then events), scopeFilter and withEventVisibility as they are.
- stored PDF of a menu (kind menu_pdf) — family: file-store — rung: 2 — why: putPrivateFile, signedFileUrl and deleteStoredFile take the new kind through the existing FILE_MIME_TYPES table; no new store.
- MenuPdfService in src/app/core/services/menu-pdf.service.ts — family: http — rung: 3 — why: one more client of the API map (API.menuDesign), same pattern as the other page-free services; the family entry gets one line.
- hide powered-by checkbox in the platform business dialog — family: form-field — rung: 1 — why: the dialog's existing app-form-field and checkbox, like aiPrivate.

## Adopt Check

- menu engine (exportMenuPdf, host.js in server/services/menu-engine/) — verdict: skip — why: our own boundary between FoodVibe data and the menu template; no package knows it; the PDF package was adopted in plan 767.

## Defaults

- one-breakpoint-set — exception — why: the only screen change is one checkbox inside the existing platform business dialog; no new @media.
- anchored-popup — exception — why: no new popup; the dialog already exists.
- row-action-icons — exception — why: no list rows added.
- loading-and-error-states — exception — why: the checkbox saves through the dialog's existing save, which already shows its loading and error states; the export button and its states are plan 769.
- confirm-destructive-action — exception — why: replacing the previous PDF is not a user delete (the newer export supersedes it); no delete button is added.
- empty-state-on-list — exception — why: no list is shown.
- unsaved-changes-on-leave — exception — why: the checkbox joins the platform dialog's existing form and its existing save; no new form or route.
- app-list-container — exception — why: no list screen is added or changed; the platform list only returns one more field.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want to turn my menu into one finished PDF in my design, so that I can send my customer a beautiful
  offer in seconds.
- As a chef, I want the menu's last PDF kept, so that I can send it again without making it again.
- As the platform admin, I want to hide the "Powered by FoodVibe" line for a business, so that a paying customer's
  menus carry only their own brand.

## Functional Requirements

### Must Have (P0)
- [ ] C-ENGINE, copied from the map (frozen 2026-11-27):
  `server/services/menu-engine/` is the only code WhatsApp and the outside API will call later:
  - `exportMenuPdf({ businessId, eventId, actor }) → { fileId, url }` (plan 768).
  - `menuFromText({ businessId, text, actor }) → { eventId, linked: string[], plain: string[] }` (plan 770).
  It reaches the rest of FoodVibe only through `server/services/menu-engine/host.js`: resolve business + modules,
  read dishes/categories, `callGemini` (which records AI usage, D28), `putPrivateFile` / delete file, create a menu
  the way a hand-made one is created. Routes are thin callers.
  — extension (see Critical Questions Q2): `exportMenuPdf` also returns `buffer` (the PDF bytes), and `fileId`/`url`
  are `null` when the file store is not configured.
- [ ] `host.js` gives the engine: `loadEvent(ctx, eventId)` (scopeFilter + withEventVisibility; null when not
  visible), `loadDesign(ctx, designId)` (the menu's design, else the business default per C-SETTINGS: missing or
  deleted default → the first live design by `createdAt`, none → `baseDesign('classic')` — computed by 764's shared `resolveMenuDesign`, map E9), `businessSettings(ctx)`
  (`menuDesign.hidePoweredBy`), `dishName(id)` (live `dishes` / `recipes` of the business), `sectionLabel(key)`
  (Hebrew label: `public/assets/data/dictionary.json` base, then the `DICTIONARY_OVERRIDES` global doc, then the
  actor's own — the same chain as `server/routes/generic.js:680` and `server/utils/stock-extract.js`), `storeFile`
  (`putPrivateFile` with a request-like `{ user: { businessId, userId }, log }`), `deleteFile`, `setLatestExport`.
- [ ] `exportMenuPdf`: `menuDocFromEvent(event, { dishName, sectionLabel })` → `renderMenuDocument(design, doc,
  { poweredBy: !hidePoweredBy, fonts: <767's decision> })` → `renderPdf(html)` → store as kind `menu_pdf`
  (`application/pdf`) → `latestExport = { fileId, at, designId }` (one `updateOne`) → delete the previous stored file
  after the new one is saved. Unlinked dish and section names print exactly as written.
- [ ] Paging (M8): A4 portrait; a section that fits on the next page is not split (`break-inside: avoid` from the
  template); a section longer than a page continues on the next page; one file always (D13).
- [ ] Routes on `server/routes/menu-design.js` (the router plan 767 created):
  `POST /export/:eventId` → the PDF bytes (`Content-Type: application/pdf`, `Content-Disposition: attachment;
  filename="<menu name or 'menu'>.pdf"`, name cleaned to letters, digits, spaces, `-`), header `X-Menu-Export-At`;
  `GET /export/:eventId/latest` → `{ url, at, designId }` (signed link, 10 minutes) or 404 `NO_EXPORT`. Both:
  `verifyToken`, `requireModule('menu_design')`, `requireModule('events')`, a limiter of 10 exports a minute per business.
  Render busy → 503 `PDF_BUSY`; render unavailable → 503 `PDF_UNAVAILABLE`.
- [ ] `stored-file.schema.ts`: kind `menu_pdf`, mime `['application/pdf']`; no `deleteAfter` (kept until replaced).
- [ ] Map extension E2: the platform business dialog gets a "hide Powered by FoodVibe" checkbox (default off) saved
  through `PlatformAdminService.updatePlatform` with the dialog's existing reason field; the admin businesses list
  returns `hidePoweredBy` (plan 764 adds the field and the admin route's accept; add the list projection here if 764
  did not).
- [ ] Client `MenuPdfService` (`src/app/core/services/menu-pdf.service.ts`): `export(eventId): Promise<Blob>` and
  `latest(eventId): Promise<{ url: string, at: number, designId: string } | null>` through `API.menuDesign(path)`
  added to the API map. No button (plan 769).

### Should Have (P1)
- [ ] `server/scripts/menu-export-sample.js`: renders the long and the short fixture with `baseDesign('classic')` to
  files in the OS temp folder and prints their paths (no database, no login), for the human check.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Page recipe: none — no page or route is added or reframed; one checkbox joins the existing platform business dialog.
- New dictionary key: `platform_biz_hide_powered_by` ("הסתרת 'Powered by FoodVibe' בתפריטים").
- Hebrew and English in the PDF follow the text (`dir="auto"`, D17).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let the file store keep a menu PDF — new kind menu_pdf with application/pdf, no delete date — shared/schemas/entities/stored-file.schema.ts
- [ ] A2: Give the menu engine one doorway to the rest of FoodVibe — load menu with staff visibility, design with default fallback, settings, dish names, Hebrew section labels, store/delete file, set latest export — server/services/menu-engine/host.js
- [ ] A3: Turn a saved menu into one designed PDF and keep it as the menu's latest — exportMenuPdf, previous file deleted after the new one is kept — server/services/menu-engine/export.js, server/services/menu-engine/index.js
- [ ] A4: Open the export to the app with the module checks and a per-business limit — POST export/:eventId, GET export/:eventId/latest — server/routes/menu-design.js
- [ ] A5: Prove who may export, the latest-only rule, the powered-by switch and no prices with the render faked — server/test/menu-export.test.js, server/test/menu-design-route.test.js, server/test/fixtures/menu-export/**
- [ ] A6: Prove real paging when a browser exists: one page, many pages, a section not cut — server/test/menu-export-real.test.js, server/scripts/menu-export-sample.js
- [ ] A7: Let the platform admin hide the powered-by line for a business — checkbox in the business dialog, list field, dictionary key, test — src/app/pages/platform-dashboard/components/platform-business-dialog/**, src/app/core/services/platform-admin.service.ts, server/routes/admin.js, server/test/admin-business.test.js, public/assets/data/dictionary.json
- [ ] A8: Give the app one client for exporting a menu — MenuPdfService and API.menuDesign — src/app/core/services/menu-pdf.service.ts, src/app/core/services/menu-pdf.service.spec.ts, src/app/core/services/http-storage.adapter.ts
- [ ] A9: Register the menu engine and the new client so later plans reuse them — menu-engine family, http family line, folder maps — docs/brain/component-families.md, docs/brain/inventory.md, server/breadcrumbs.md, src/app/core/services/breadcrumbs.md

## Technical Considerations
- Dependencies: plan 764 (`shared/schemas/menu-design/` — map extension E1 — `renderMenuDocument`, `menuDocFromEvent`,
  `baseDesign`; `menuEvents.designId`, `subtitle`, `bottomNote`, server-owned `latestExport` in `EVENT_SERVER_FIELDS`;
  `businesses.menuDesign`), plan 767 (`renderPdf`, its fonts decision, `server/routes/menu-design.js` mounted).
  Server requires the template from `server/generated/schemas/menu-design/`.
- New files needed: `server/services/menu-engine/{index,host,export}.js`, `server/scripts/menu-export-sample.js`,
  `src/app/core/services/menu-pdf.service.ts` + spec, two server test files, fixtures.
- Model changes: stored-file kind `menu_pdf`; `PlatformBusiness`/`PlatformUpdateBody` gain `hidePoweredBy`.
- Backend / API: `POST /api/v1/menu-design/export/:eventId`, `GET /api/v1/menu-design/export/:eventId/latest`.
- Auth and validation: `verifyToken`; both module gates; the event id must be a menu of the caller's business that
  the caller may read; `:eventId` is a plain string id (no operators).
- Security surface: (1) the PDF carries only names and texts, never money fields — a test asserts it; (2) the stored
  PDF is a private, signed-link file (plan 619 store), link valid 10 minutes; (3) the menu HTML is built only by
  `renderMenuDocument` (escaped text, Cloudinary-only images), printed with JavaScript off (plan 767); (4) no menu
  text, dish names or file links in logs — only `{ event: 'menu_export.done', ms, bytes, pages }`;
  (5) a per-business limit keeps one account from tying up the single browser.
- Data / migration: none (new optional fields come from 764; stored files gain one kind).
- Project checks: log-query `[auto]` item included; `pnpm run test:server` and `pnpm run test:ci`; no `[ui]` card —
  the only screen change is in the platform-admin dialog and the QA login is not a platform admin, so it is `[human]`.
  Hebrew key named above; `dictionary.json` is append-only.

## Out of Scope
- The Export button and the design switcher in menu intelligence (plan 769).
- Export history (D16: latest only); image export (D14).
- Sending the PDF anywhere (WhatsApp stage).
- Deleting a menu's stored PDF when the menu itself is purged from the Trash (it goes with the business delete).

## Critical Questions
- Q: Who may export a menu? A: any member who may read it (owner, consultant, staff for the stages the owner
  allows), because exporting changes nothing the chef typed — logged below as a behaviour decision for Dandan to grade.
- Q: What does exportMenuPdf return when no file store is configured? A: map extension E3 — it also returns `buffer`, and `fileId`/`url` are `null` when nothing was kept; the route always answers with the PDF itself.

## Execution Notes

- behaviour: any member who may read a menu may export it (staff included); export is a read with a server-owned side note.
- behaviour: the POST answers the PDF bytes directly (the app downloads or opens it), and keeping the latest is
  best-effort when the file store is configured.
- behaviour: the previous stored PDF is deleted only after the new one is saved, so a failed export never loses the last good file.
- behaviour: a menu's stored PDF is not deleted when the menu goes to the Trash or is purged; the next export or the business delete removes it.
