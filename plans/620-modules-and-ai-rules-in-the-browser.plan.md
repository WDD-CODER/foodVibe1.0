# Plan 620 — Show each business only the modules it has, and give the platform admin one dialog for modules, AI cap and private mode

Status: draft
Depends-on: 616, 617, 618
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
After plans 616–618 the server refuses a business the areas it does not have (403 `MODULE_OFF`), refuses AI calls over
a monthly cap (429 `ai_monthly_cap_reached`) and treats every business as shared unless the platform admin marked it
private. The browser knows none of it: every business still sees every link, a business without a module would click
into screens that fail, the platform admin has no screen to set modules, the cap or private mode, and the owner still
sees a sharing switch that no longer does anything.

This plan is the browser side: one `ModuleService`, one route guard, the navigation and the AI entry points filtered
through it, no request for data of a module that is off, one platform dialog (modules, cap, private, with a required
reason), two table columns, the Hebrew cap message, and the owner's locked chip. The server stays the gate; the
browser only hides.

Verified on `origin/main` (e916e48e, 2026-11-17):
- No `src/app/core/services/module.service.ts` and no module guard exist. `src/app/core/guards/` holds `auth.guard.ts`,
  `platform-admin.guard.ts` (10 lines, the pattern: `router.createUrlTree(['/dashboard'])`), `pending-changes.guard.ts`,
  `recipe-builder-access.guard.ts`, `welcome.guard.ts`.
- `src/app/core/services/business.service.ts` (136 lines): `business_` is `null` until `_load` answers and stays `null`
  on an error; nothing says whether the load has finished.
- `src/app/core/components/header/header.component.ts` (105 lines): `NAV_LINKS` (lines 13–19) has five links —
  `/dashboard`, `/inventory`, `/recipe-book`, `/menu-library`, `/clients`; `navLinks_` (line 53) adds settings and
  platform. The template uses `navLinks_()` for the desktop pills (line 49) and the drawer (line 83), and has a third,
  hand-written list in the phone bottom bar: `/menu-library` at line 177 and `/clients` at line 181.
  `src/app/core/components/header/header.component.spec.ts` (246 lines): "should have correct router links" (line 52) expects `/menu-library` and
  `/clients`; "should have 5 navigation links" (line 66); the bottom-bar tests (lines 203, 220) read
  `.bottom-nav a[href="/clients"]`.
- `src/app/core/components/tab-chips/tab-chips.component.ts` (178 lines): `CHIPS_BY_GROUP` (lines 47–78) has five
  groups; `venues` is the first chip of `dashboard`; `menus` = `menu-library`, `menu-intelligence`; `frontdesk` =
  `requests`, `bookings`, `clients`, `knowledge`, `settings`. `src/app/core/components/tab-chips/tab-chips.component.spec.ts` (211 lines) asserts the
  dashboard chips at lines 74 and 93 (`/venues` first) and the frontdesk chips at line 128.
- `src/app/app.routes.ts` (315 lines): the routes of gated areas are `venues` (line 32), `clients` (156),
  `clients/:id` (162), `requests` (169), `frontdesk/settings` (175), `frontdesk/onboarding` (181),
  `frontdesk/knowledge` (187), `bookings` (193), `menu-library` (198), `menu-intelligence` (209),
  `menu-intelligence/:id` (222); each has `canActivate: [authGuard]`. The platform route (line 293) loads
  `./pages/platform-dashboard/platform-dashboard.page`.
- The platform page is `src/app/pages/platform-dashboard/platform-dashboard.page.ts` (318 lines; `.html` 248, `.scss`
  251, `.spec.ts` 325) — there is no `platform.page.ts`. The table is a CSS grid (`--platform-grid`, `.scss` lines
  97–99) with 12 sortable columns (`columns`, lines 105–118), five more header cells (front desk, three front desk
  numbers, internal) and a row actions menu holding the report link and the front desk edit button (`pencil`).
  `components/front-desk-admin-dialog/` (component 97 lines, template 58, service 28, spec 108) is the pattern for a
  platform dialog: `app-modal-shell size="sm"`, `app-form-field`, a required reason textarea (`platform_fd_reason`,
  max 200), only changed fields sent, 400 → `field_required` on the reason, success toast `platform_fd_saved`, opened
  through a service built on `ModalController`.
- `src/app/core/services/platform-admin.service.ts` (161 lines): `BusinessRow` (lines 11–32) has no module or AI
  field; `updateFrontDesk` (line 157) saves and reloads the table.
- "Create with AI" entry points in `src/app` (grep for the AI modal services, `GeminiService` and the `sparkles` icon):
  1. `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts` line 450 — action `add_recipe_ai`.
  2. `src/app/pages/recipe-builder/recipe-builder.page.ts` line 527 — action `ai_recipe_edit`.
  3. `src/app/pages/menu-library/menu-library.page.ts` line 37 — action `ai_menu_create_new`.
  4. `src/app/pages/menu-intelligence/menu-intelligence.page.ts` line 260 — action `ai_menu_open` (growth-frozen file).
  5. `src/app/pages/inventory/components/product-form/product-form.component.ts` line 325 — action `ai_product_title_edit`.
  6. `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts` line 219 — action `ai_product_create_new`.
  7. `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.html` lines 36–47 — the `sparkles` button (`onAiFill`, `generate-product`).
  8. The three windows themselves, opened only through `AiRecipeModalService.open`, `AiMenuModalService.open`,
     `AiProductModalService.open` (`src/app/shared/ai-*-modal/*.service.ts`).
  Entries 1–6 are `HeroFabAction` objects (`src/app/core/services/hero-fab.service.ts`, 29 lines: `{ labelKey, icon,
  run }`) shown by `src/app/core/components/hero-fab/hero-fab.component.ts` (`effectiveActions_`, line 34).
  Not "create with AI" and never gated (C-MODULES): the import's match and photo buttons (`product-import`), the
  pasted-ingredients matcher (`recipe-ingredients-table`), the model manager; the knowledge import belongs to `frontdesk`.
- Data of gated types is loaded outside the gated screens: `FrontDeskBadgeService`
  (`src/app/core/services/front-desk-badge.service.ts`, line 29) loads `requests` for every signed-in user; the
  dashboard mounts `app-business-performance`, `app-frontdesk-week-card` (calls `/api/v1/stats/frontdesk`) and
  `app-front-desk-checklist-card` (`dashboard-overview.component.html` lines 9–13) and embeds the venue list under
  `/dashboard?tab=venues` (`dashboard.page.ts` line 59); `setup-checklist-card.component.ts` has an events step with
  path `/menu-intelligence` (line 86). Every generic read goes through `HttpStorageAdapter`
  (`src/app/core/services/http-storage.adapter.ts`, 349 lines: `query`, `queryFiltered`, `search`, `count`, `trash`).
- The logistics panel is mounted once, in `menu-intelligence.page.html` line 243; its own template starts with the
  toggle chip (`event-logistics-panel.component.html` line 4; component 417 lines).
- A 429 from an AI route shows `ai_daily_limit_reached_all` in five places: `ai-recipe-modal.component.ts` line 280,
  `ai-product-modal.component.ts` line 356, `ai-menu-modal.component.ts` lines 336–337 (`ai_limit_reached`),
  `product-import.component.ts` line 224, `recipe-ingredients-table.component.ts` lines 376–377.
- The owner's card after plan 618: `src/app/pages/metadata-manager/components/ai-examples-share/` shows one disabled
  toggle chip and calls no route. `e2e/ui/618-1.spec.ts` (plan 618) expects the card to hold no enabled checkbox.
- `src/styles.scss` line 2131: a read-only chip is `span.c-chip.c-chip--tap.is-locked` (style at line 2283).
- Icons `lock`, `settings`, `sparkles` are registered in `src/app/app.config.ts` (`Lock` line 59, `Settings` line 38,
  `Sparkles` line 48). No new icon is needed.
- None of the dictionary keys this plan adds exists in `public/assets/data/dictionary.json` (2,338 keys; checked each
  name). Existing keys reused: `platform_fd_reason` "סיבה (חובה)", `platform_fd_saved` "השינוי נשמר", `save`, `saving`,
  `cancel`, `field_required`, `save_failed`, `metadata_ai_share_title` "שיתוף דוגמאות AI".
- `platform_ai_shots_desc` and `platform_ai_shots_candidates_hint` say "עסקים שהסכימו לשתף" — no longer true after
  plan 618. `e2e/ui/612-1.spec.ts` expects the description to contain "כאן מופיעות דוגמאות".
- `scripts/breadcrumbs-check.mjs` fails when a direct child of `src/app/core/services/` is not named in
  `src/app/core/services/breadcrumbs.md`.
- The QA user of the `[ui]` specs is a platform admin and the owner of its business (`e2e/ui/600-2.spec.ts` opens
  `/platform` with `signInQa`).
- From earlier plans of the run (must be merged; not added here): `shared/schemas/modules.ts` with `MODULE_KEYS`,
  `DEFAULT_MODULES`, `modulesOf`, `hasModule`, `MODULE_OF_TYPE` (615/616); `Business.modules`, `aiPrivate`,
  `aiMonthlyTokenCap` (615); `PUT /api/v1/admin/businesses/:id/platform` and the new fields of
  `GET /api/v1/admin/businesses` rows (`modules`, `aiPrivate`, `aiMonthlyTokenCap` from 616; `aiTokensThisMonth` from
  617); 429 `{ error: 'ai_monthly_cap_reached', code }` (617). `GET /api/v1/business` leaves out `platformHistory`
  (616); nothing here reads it.

## Goals & Success Criteria
**Primary:** a business sees links, chips, screens and AI buttons only for the modules it has and makes no request the
server would refuse with `MODULE_OFF`; the platform admin changes modules, the monthly AI cap and private mode in one
dialog with a reason; the owner sees whether his business is shared or private and that he cannot change it.

- [auto] `pnpm run test:ci` passes, including the new specs `src/app/core/services/module.service.spec.ts`, `src/app/core/guards/module.guard.spec.ts`,
  `src/app/core/utils/ai-error.util.spec.ts`, `src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.spec.ts` and the new cases named in the sub-tasks.
- [auto] `src/app/core/services/module.service.spec.ts`: a business without `modules` has `events`, `event_logistics`, `frontdesk`,
  `ai_create` and not `consultant_diag`; `modules: ['frontdesk']` has only `frontdesk`; `has(['events', 'frontdesk'])`
  is true when either is on; `ready()` resolves after the business loads, after a failed load, and at once when
  signed out.
- [auto] `src/app/core/components/header/header.component.spec.ts`: with `events` off there is no `a[href="/menu-library"]` in the pills, the drawer
  or the bottom bar; with `events` and `frontdesk` both off there is no `a[href="/clients"]`; with everything on the
  existing "5 navigation links" case still passes.
- [auto] `src/app/core/components/tab-chips/tab-chips.component.spec.ts`: on `/dashboard` with `events` off the chips are `/dashboard?tab=metadata`,
  `/suppliers`, `/trash`; on `/clients` with `frontdesk` off and `events` on no chip row is rendered; with everything
  on the three existing list assertions still pass unchanged.
- [auto] `src/app/core/guards/module.guard.spec.ts`: `moduleGuard(['events'])` returns `true` with the module and the UrlTree
  `/dashboard` without it, and waits for `ready()` before it answers.
- [auto] `src/app/core/services/http-storage.adapter.spec.ts` (new): `query('requests')` with `frontdesk` off returns `[]` and sends no
  request; `query('clients')` sends a request when only `events` is on; `query('products')` always sends one.
- [auto] `src/app/core/services/trash.service.spec.ts`: with `events` off the sections hold no `venues` and no `menuEvents`, and loading
  the Trash sends no request for them.
- [auto] `src/app/core/utils/ai-error.util.spec.ts`: `aiCapErrorKey` returns `ai_monthly_cap_reached` for an error whose body is
  `{ error: 'ai_monthly_cap_reached', code: 'ai_monthly_cap_reached' }` and `null` for any other 429; each of the five
  components has one spec case showing that key for that error.
- [auto] `src/app/pages/platform-dashboard/components/platform-business-dialog/platform-business-dialog.component.spec.ts`: nothing is sent without a reason of at least 3 characters; only
  changed fields are sent; unticking `events` also removes `event_logistics`; an emptied cap is sent as
  `aiMonthlyTokenCap: null`; a 400 marks the reason field.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/dashboard`, after the QA business is set to modules `frontdesk`, `ai_create` (no `events`), the header has
  no link "תפריטי אירוע" (`e2e/ui/620-1.spec.ts`; the spec restores the four default modules in `finally`).
- [ui] With the same modules, opening `/menu-library` lands on `/dashboard` and the page shows the heading "לוח בקרה"
  — the dictionary value of `dashboard` at build time (`e2e/ui/620-2.spec.ts`).
- [ui] On `/platform`, pressing the "מודולים ו-AI" action of a business row opens a dialog titled "מודולים ו-AI לעסק"
  (`e2e/ui/620-3.spec.ts`).
- [ui] On `/dashboard?tab=metadata` the owner's card shows the chip "משותף עם FoodVibe" (`e2e/ui/620-4.spec.ts`).
- [human] Dandan switches `event_logistics` off for a test business in the dialog; after one refresh in that business
  an open event has no logistics panel, and after switching it back on the panel returns.
- [human] Dandan sets a cap of 1 token for a test business and, on its next AI action, sees
  "הגעתם לתקרת השימוש החודשית ב-AI. לפרטים פנו ל-FoodVibe."
- [human] The platform dialog and the two new table columns read right in Hebrew on a PC and on a phone.

## Execution Mode
- Parallel: no — the last plan of run `mod-0`: it appends to `public/assets/data/dictionary.json` and edits
  `src/app/app.routes.ts` and `tab-chips.component.ts`, which 623, 624, 628, 629, 630, 632, 634, 636 and 637 also
  touch; it edits `src/app/pages/platform-dashboard/**` (630, 632), `src/app/pages/menu-intelligence/**` (623, 624;
  `menu-intelligence.page.ts` net lines 0) and `product-import` (628, 629). One screen run at a time; none of those
  plans may be live while this one runs.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/module.service.ts
src/app/core/services/module.service.spec.ts
src/app/core/services/business.service.ts
src/app/core/services/business.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/services/http-storage.adapter.spec.ts
src/app/core/services/hero-fab.service.ts
src/app/core/services/platform-admin.service.ts
src/app/core/services/trash.service.ts
src/app/core/services/trash.service.spec.ts
src/app/core/services/breadcrumbs.md
src/app/core/guards/module.guard.ts
src/app/core/guards/module.guard.spec.ts
src/app/core/utils/ai-error.util.ts
src/app/core/utils/ai-error.util.spec.ts
src/app/core/components/header/**
src/app/core/components/tab-chips/**
src/app/core/components/hero-fab/**
src/app/app.routes.ts
src/app/pages/dashboard/**
src/app/pages/platform-dashboard/**
src/app/pages/metadata-manager/components/ai-examples-share/**
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/components/event-logistics-panel/**
src/app/pages/menu-library/menu-library.page.ts
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts
src/app/pages/inventory/components/product-form/product-form.component.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/pages/inventory/components/product-import/product-import.component.ts
src/app/pages/inventory/components/product-import/product-import.component.spec.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.spec.ts
src/app/shared/quick-add-product-modal/**
src/app/shared/ai-recipe-modal/**
src/app/shared/ai-menu-modal/**
src/app/shared/ai-product-modal/**
public/assets/data/dictionary.json
e2e/ui/618-1.spec.ts
e2e/ui/620-1.spec.ts
e2e/ui/620-2.spec.ts
e2e/ui/620-3.spec.ts
e2e/ui/620-4.spec.ts
shared/schemas/modules-pure.ts
shared/schemas/modules.ts
docs/brain/component-families.md
src/app/pages/trash/trash.page.ts
package.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the server stays the only gate (plan 616); the browser hides links and skips requests it knows would be refused, it grants nothing, and no `*-data.service.ts` or `permission.service.ts` file changes.
- INV-3: preserves — the owner's card under `metadata-manager` stops writing altogether; the platform dialog saves in one request and the server applies every consequence (history row, deleted shared copies).
- INV-6: preserves — the AI windows still call only `server/routes/ai.js` through `GeminiService`; this plan hides their buttons and adds one error message, no key and no new AI call in the browser.

## Reuse Check

- `ModuleService` — family: kitchen-state — rung: 4 — why: no service answers "which modules does this business have"; it is a thin computed over `BusinessService.business_` with the shared `modulesOf`, kept apart so header, chips, guard, adapter and AI services ask one place.
- `moduleGuard(keys)` — family: none — rung: 4 — why: a route guard factory; the existing guards test sign-in or the platform admin, none takes a module. It follows `platform-admin.guard.ts`.
- `aiCapErrorKey` in `src/app/core/utils/ai-error.util.ts` — family: helpers — rung: 3 — why: one pure function used by the five places that turn an AI refusal into a message, in `core/utils` with a spec as the family asks.
- `PlatformBusinessDialogComponent` — family: modal-shell — rung: 1 — why: `app-modal-shell size="sm"` with `.c-modal-actions`, the same frame as `front-desk-admin-dialog` beside it.
- `platform-business-dialog` (the folder holding the component and the service of this dialog) — family: modal-shell — rung: 1 — why: the dialog pieces live in `src/app/pages/platform-dashboard/components/platform-business-dialog/`, beside `front-desk-admin-dialog`; not a business-delete piece.
- `PlatformBusinessDialogService` — family: modal-controller — rung: 1 — why: `new ModalController<boolean>(false)` exactly as `FrontDeskAdminDialogService`.
- Module chips and the private chip in the dialog — family: chip — rung: 1 — why: `label.c-chip.c-chip--toggle` with a checkbox inside `.c-chip-group`.
- Cap number field and reason textarea in the dialog — family: form-field — rung: 1 — why: `app-form-field` with a projected `input.c-input[type=number]` / `textarea.c-input`, with `hint` and `error`.
- Owner's locked chip in `ai-examples-share` — family: chip — rung: 1 — why: `span.c-chip.c-chip--tap.is-locked`, the read-only chip the engine already has.
- "מודולים ו-AI" row action button — family: engine-classes — rung: 1 — why: a `c-icon-btn` inside the existing `app-row-actions-menu`, like the front desk edit button.
- Two table columns — family: list-page — rung: 1 — why: two more `appColumnSlide` cells in the page's existing column carousel grid.
- `PlatformAdminService.updatePlatform` — family: http — rung: 3 — why: one more method on the existing admin service, same `API.admin(...)` pattern as `updateFrontDesk`.
- `module` field on `HeroFabAction` — family: none — rung: 4 — why: one optional field on the existing action shape so the six AI actions are filtered in one place instead of six `if`s.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef in a restaurant that bought only the kitchen and invoices, I want no events or front desk links on my screen, so that I am not sent to screens that do not work for me.
- As an owner, I want to see whether my business's AI material is shared or private, and to know whom to ask to change it, so that there is no switch that looks like it works and does not.
- As the platform admin, I want to switch a business's modules, set its monthly AI cap and mark it private in one place, with a reason that is kept, so that I can sell the product in pieces and later see why a business has what it has.
- As a chef whose business reached its monthly AI cap, I want a clear Hebrew message, so that I do not think the AI is broken or that I must wait until tomorrow.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-MODULES (616, 620; used by 624, 631, 633)**
  - `shared/schemas/modules.ts`: `MODULE_KEYS = ['events', 'event_logistics', 'frontdesk', 'ai_create',
    'consultant_diag'] as const`; `DEFAULT_MODULES = ['events', 'event_logistics', 'frontdesk', 'ai_create']`;
    `modulesOf(business) → ModuleKey[]` — the stored list when the field is present, else `DEFAULT_MODULES`;
    `event_logistics` without `events` is dropped (logistics lives on an event); `hasModule(business, key)`.
  - `business.modules?: ModuleKey[]` (unique, ≤ 5). `business.platformHistory?` — ≤ 50 rows
    `{ at, by, byName, reason, changed: string[] }`. Both written only by the platform admin; a new business is
    created without `modules` (A1).
  - `server/middleware/require-module.js`: `requireModule(key | key[])` — after `verifyToken`; any one of the keys is
    enough; reads the business through `getBusiness`; a per-process cache of at most 30 s is allowed and is cleared
    by the platform write (and resettable in tests); answers 403 `{ error: 'MODULE_OFF', module }`.
    `requireHomeModule(key)` — the same test on `req.user.homeBusinessId ?? req.user.businessId` (C-ACCESS).
  - What each module covers:

    | Module | Server | Browser |
    |---|---|---|
    | `events` | `/api/v1/events/**`; generic types `menuEvents`, `venues` | header link `/menu-library`; chip group `menus`; the `venues` chip of the `dashboard` group; routes `menu-library`, `menu-intelligence`, `venues` |
    | `event_logistics` | `PUT /events/:id/logistics`, `PUT /events/:id/loading`, `/api/v1/ai/logistics/**` | the logistics panel and the loading sheet inside the event |
    | `frontdesk` | `/api/v1/requests/**`, `/bookings/**`, `/knowledge/**`; generic `requests`, `bookings`, `frontDeskProfiles`, `knowledgeItems`; `POST /business/front-desk-intake`; `POST /ai/knowledge-import`; `/stats/frontdesk`; the public router answers 404 for the business | chips `requests`, `bookings`, `knowledge`, `settings` of the `frontdesk` group; routes `requests`, `bookings`, `frontdesk/**` |
    | `events` or `frontdesk` | generic `clients`, `/api/v1/clients/**` | header link `/clients`, chip `clients`, routes `clients/**` |
    | `ai_create` | `POST /api/v1/ai/` `generate`, `parse-text`, `generate-from-url`, `generate-from-image`, `patch-recipe`, `generate-menu`, `patch-menu`, `generate-product`, `patch-product`, `generate-product-from-image`, `shots`, `shots/confirm`, `save-menu-shot` | every "create with AI" entry point (the buttons and the AI modals) |
    | `consultant_diag` | `/api/v1/diag/**`, `/api/v1/ai/diag/**` through `requireHomeModule` | the diagnosis entry in the acting banner / inventory group |

    Never gated: products, suppliers, equipment, recipes, dishes, cook view, taxonomy (all kinds stay readable),
    settings, team, Trash, `/stats/business`, `/stats/report`, `/api/v1/product-import/**`,
    `POST /ai/parse-price-list`, `parse-receipt-photo`, `match-product-names`, `/ai/invoices/**`, `/ai/voice/**`,
    `/ai/stock/**`, `/api/v1/stock/**`, `/api/v1/files/**`, every `/api/v1/admin/**` route.
  - The generic API gates by type in one place (`MODULE_OF_TYPE` in `shared/schemas/modules.ts`), before any read or
    write of that type.
  - Platform write: `PUT /api/v1/admin/businesses/:id/platform` body
    `{ modules?: ModuleKey[], aiMonthlyTokenCap?: number | null, aiPrivate?: boolean, reason: string (3–200) }` →
    writes the given fields, appends one `platformHistory` row, clears the module cache; `aiPrivate` goes through
    `setAiPrivate` (C-LEARN). `GET /api/v1/admin/businesses` rows gain `modules` (resolved), `aiPrivate`,
    `aiMonthlyTokenCap`, `aiTokensThisMonth` (C-AICAP).
  - Browser: `ModuleService` (`src/app/core/services/module.service.ts`) — `has(key)` computed from
    `BusinessService.business_()` with the same `modulesOf`; `moduleGuard(keys)` redirects to `/dashboard`; the header
    and the tab chips filter through it. The server gate is the gate; the browser only hides.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-AICAP (617)**
  - `business.aiMonthlyTokenCap?: number` (integer ≥ 0; absent or `null` = no cap, A2).
  - `server/services/ai-cap.js` → `capState(db, businessId, now) → { cap, used, over }`. The month is the calendar
    month in `Asia/Jerusalem` (the `day` field of `aiUsage`); `used` = the sum of `totalTokens` of that month's rows.
    A per-process cache of at most 60 s per business is allowed.
  - Enforced in `callGemini`, before the first HTTP call, when `usage.businessId` is a real business: it returns a
    failure of kind `business_cap`, writes one ledger row `ok: false, errorCode: 'business_cap'` with zero tokens,
    and makes no request. `respondFromGeminiFailure` maps it to 429 `{ error: 'ai_monthly_cap_reached' }`.
    `'__platform__'` calls are never capped. Message key `ai_monthly_cap_reached`.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-LEARN (618; used by 627, 630, 633)**
  - `business.aiPrivate?: boolean` — platform admin only (C-MODULES platform write). Absent = shared (D8).
  - `server/utils/ai-learning.js` → `mayLearnFrom(business) → business?.aiPrivate !== true`. The only test any code
    uses before it (a) copies something into a `'__master__'` pool, (b) lists a business's AI material for the
    platform admin. A private business keeps its own per-business memory and its own drafts.
  - `setAiPrivate(id, value)` in `server/services/business.js` replaces `setShareAiExamples`: turning private on
    deletes the business's promoted `GEMINI_SHOTS` copies (`promotedFrom.businessId`) and calls
    `forgetBusiness` (C-ALIAS; 618 leaves a one-line placeholder and 627 adds the real call).
  - Removed: `PUT /api/v1/business/share-ai-examples`, `shareAiExamplesInputSchema`,
    `BusinessService.updateShareAiExamples`. `business.shareAiExamples` stays in the schema as optional so stored
    documents validate; nothing reads it.
  - `GET /api/v1/admin/ai-shots` candidates and `POST …/promote`: every business with `mayLearnFrom` true.
  - Deleting a business keeps what the platform learned from it (Dandan, 2026-11-17). Always deleted, as the
    business's own records: `priceHistory`, its own `invoiceAliases`, its `storedFiles` and the provider files
    (recordings, invoice files), its `businessAccess` rows. Kept when the business is not private at that moment: its
    contributions to the shared supplier brain, its promoted recipe examples, and its `aiDrafts` rows reduced to
    numbers (`feature`, `model`, `keptRatio`, `status`, `at`, `confirmedAt`, `businessId`; no input, draft, saved text
    or user id). A private business leaves nothing. To erase everything of a business, the platform admin turns
    private mode on, then deletes it (619).
  - The owner's card `ai-examples-share` shows one locked chip (shared / private) and a tooltip from a dictionary
    key saying private mode is arranged by contacting FoodVibe. It calls no route.
- [ ] `BusinessService` (`business.service.ts`): a read-only signal `loaded_` — `false` when the signed-in user
  changes, `true` when `_load` got its answer or its error, `true` when nobody is signed in. Nothing else changes.
- [ ] `ModuleService` (`src/app/core/services/module.service.ts`, new, `providedIn: 'root'`, no HTTP call):
  - `modules_ = computed(() => modulesOf(this.business.business_() ?? {}))` with `modulesOf` imported from
    `@schemas/modules` (the same function the server uses).
  - `has(keys: ModuleKey | readonly ModuleKey[]): boolean` — true when any one of the keys is in `modules_()`. Before
    the business has loaded it answers from `DEFAULT_MODULES` (a business with everything on sees no flicker).
  - `hasType(entityType: string): boolean` — true when `MODULE_OF_TYPE` has no entry for the type, else `has` of its
    entry (`clients` is open with `events` or `frontdesk`).
  - `ready(): Promise<void>` — resolves when `BusinessService.loaded_()` is true (at once when it already is).
- [ ] `moduleGuard(keys)` (`src/app/core/guards/module.guard.ts`, new): a `CanActivateFn` factory. Signed out → `true`
  (`authGuard`, which runs first, decides). Otherwise `await modules.ready()`, then `true` when `modules.has(keys)`,
  else `router.createUrlTree(['/dashboard'])`.
- [ ] `src/app/app.routes.ts`: `moduleGuard(...)` is added after `authGuard` in the `canActivate` of the eleven routes
  — `['events']`: `venues`, `menu-library`, `menu-intelligence`, `menu-intelligence/:id`; `['frontdesk']`: `requests`,
  `bookings`, `frontdesk/settings`, `frontdesk/onboarding`, `frontdesk/knowledge`; `['events', 'frontdesk']`:
  `clients`, `clients/:id`. No path, component, resolver or other guard is removed or reordered (the file is
  append-only: this is one added array item per route and one import).
- [ ] Header: `navLinks_` drops `/menu-library` without `events` and `/clients` without `events` and `frontdesk`; the
  two hand-written bottom-bar links get the same two conditions (`showEvents_`, `showClients_` computed signals).
  Settings and platform links are unchanged.
- [ ] Tab chips: `chips_` filters by module — `venues`, `menu-library`, `menu-intelligence` need `events`;
  `requests`, `bookings`, `knowledge`, `settings` need `frontdesk`; `clients` needs either. The rule is one optional
  field `modules?: readonly ModuleKey[]` on `TabChip`, set on those eight chips. A group left with fewer than two
  chips renders no row (there is nothing to switch to). The dashboard home-chip swap and the recipe chips are unchanged.
- [ ] No request for data of a module that is off: in `HttpStorageAdapter`, the five read methods (`query`,
  `queryFiltered`, `search`, `count`, `trash`) first `await modules.ready()` when `MODULE_OF_TYPE` names the type, and
  when `!modules.hasType(entityType)` return the empty result (`[]`, or `0` for `count`) without a request.
  `restoreAll` and `emptyTrash` of such a type resolve without a request. This one place covers every startup and
  background load of the gated types `menuEvents`, `venues`, `clients`, `requests`, `bookings`, `frontDeskProfiles`,
  `knowledgeItems`: `FrontDeskBadgeService` (`requests` on sign-in), the sign-in reloads in `user.service.ts` (lines
  82–91: venues, menu events, clients), the `*-ensure-loaded` resolvers, `app-front-desk-status-banner` and Trash.
  `ModuleService` is read through the adapter's existing `injector_` at call time (no constructor injection, no cycle).
  Types with no entry in `MODULE_OF_TYPE` are not delayed and not changed. Writes are not touched (the screens that
  write are behind the guard; the server is the gate).
- [ ] Trash: `TrashService` (`src/app/core/services/trash.service.ts`, section list at lines 39–42) leaves a type
  whose module is off out of its sections (`venues` and `menuEvents` need `events`; `clients` needs `events` or
  `frontdesk`), so the Trash screen shows no section for it and "restore all" / "empty Trash" never name it.
- [ ] Dashboard: `app-business-performance` renders only with `events`; `app-frontdesk-week-card` and
  `app-front-desk-checklist-card` only with `frontdesk` (`dashboard-overview.component.html`); the events step of
  `setup-checklist-card` is left out without `events`; `activeTab` in `dashboard.page.ts` answers `overview` for
  `venues` and `add-venue` without `events`.
- [ ] `event_logistics`: `EventLogisticsPanelComponent` renders nothing when `!modules.has('event_logistics')` (its
  whole template inside one `@if`); `menu-intelligence.page.html` and the page class are not edited for it.
- [ ] `ai_create`:
  - `HeroFabAction` gains optional `module?: ModuleKey`; `HeroFabComponent.effectiveActions_` leaves out an action
    whose `module` is off. The six AI actions (entries 1–6 of the Problem Statement) get `module: 'ai_create'`; in
    `menu-intelligence.page.ts` the field goes on the existing line 260 (net lines 0).
  - The `sparkles` button of `quick-add-product-modal` is rendered only with `ai_create`.
  - `AiRecipeModalService.open`, `AiMenuModalService.open` and `AiProductModalService.open` return without opening
    when `ai_create` is off (after the sign-in check).
- [ ] Cap message: `aiCapErrorKey(err: unknown): string | null` in `src/app/core/utils/ai-error.util.ts` returns
  `'ai_monthly_cap_reached'` when `err` is an object whose `error?.error === 'ai_monthly_cap_reached'`, else `null`.
  Each of the five places that map a 429 (Problem Statement) asks it first and shows that key; in
  `product-import.component.ts` `errorKeyFor_` returns the key when `code === 'ai_monthly_cap_reached'`.
- [ ] Labels the platform AI usage table needs after 615 and 617 (this plan owns them; later screen plans append a
  key only if it is absent): `ai_feature_logistics_extract`, `ai_feature_invoice_read`,
  `ai_feature_menu_prices_parse`, `ai_feature_stock_extract` (the table builds `'ai_feature_' + key`, as for the 19
  existing features) and `ai_fail_business_cap` (the failed-calls hover text builds `'ai_fail_' + reason`).
- [ ] `PlatformAdminService`: `BusinessRow` gains `modules: ModuleKey[]`, `aiPrivate: boolean`,
  `aiMonthlyTokenCap: number | null`, `aiTokensThisMonth: number` (each read with a fallback — `DEFAULT_MODULES`,
  `false`, `null`, `0` — when a row lacks it); `PlatformUpdateBody = { modules?: ModuleKey[]; aiMonthlyTokenCap?:
  number | null; aiPrivate?: boolean; reason: string }`; `updatePlatform(id, body)` PUTs
  `API.admin('businesses/<id>/platform')` and then calls `load()`.
- [ ] The platform dialog — `src/app/pages/platform-dashboard/components/platform-business-dialog/`
  (`platform-business-dialog.component.ts`, `.html`, `.spec.ts`, `platform-business-dialog.service.ts`, all new), one
  dialog for modules, cap and private (layout in UI/UX Notes). Rules:
  - Opens on `{ businessId, name, modules, aiPrivate, aiMonthlyTokenCap, aiTokensThisMonth }` of the row.
  - Unticking `events` unticks and disables `event_logistics` (the server drops it anyway); ticking `events` again
    enables it and leaves it unticked.
  - The body holds only what differs from the row: `modules` (in `MODULE_KEYS` order) when the set changed,
    `aiMonthlyTokenCap` (an integer ≥ 0, or `null` when the field was emptied) when it changed, `aiPrivate` when it
    changed; always `reason` (trimmed).
  - Save is disabled while nothing changed or while saving. Pressing save with a reason shorter than 3 characters
    sends nothing and shows `field_required` under the reason; a cap that is not a whole number ≥ 0 shows
    `platform_ai_cap_invalid` under the cap and sends nothing.
  - Success: toast `platform_fd_saved`, the dialog closes, the table reloads. 400: `field_required` under the reason,
    the dialog stays. Any other error: `logging.error({ event: 'platform.business_update_failed', … })`, toast
    `save_failed`, the dialog stays with what was typed.
  - Cancel, the X, Escape and the backdrop close without saving and without a question (as the front desk dialog);
    they do nothing while a save is running.
- [ ] Platform table (`platform-dashboard.page.*`): two cells after the "internal" cell — `platform_col_modules` (the
  short names of the business's modules joined with " · ", in `MODULE_KEYS` order; "—" when none) and
  `platform_col_ai_month` (`<tokens this month> / <cap>` with thousands separators, the cap shown as
  `platform_ai_no_cap` when there is none, followed by a `span.c-chip.c-chip--tag.c-chip--sm` `platform_ai_private_tag`
  when the business is private). Both are plain, not sortable. `--platform-grid` gains two tracks
  (`minmax(10rem, 1.4fr) minmax(9rem, 1.2fr)`) before the last two. The row actions menu gains a `c-icon-btn` with the
  `settings` icon, `aria-label` `platform_biz_edit`, `data-testid="biz-edit"`, shown on every row; it opens the dialog.
- [ ] `PlatformAiShotsComponent`: the description and the candidates hint use the new keys
  `platform_ai_shots_desc_all` and `platform_ai_shots_candidates_hint_all` (the old keys stay in the dictionary); its
  spec's two key assertions follow.
- [ ] The owner's card (`ai-examples-share`): the toggle chip of plan 618 is replaced by one
  `span.c-chip.c-chip--tap.is-locked` with `tabindex="0"`, a `lock` icon (size 14) and the text
  `metadata_ai_state_shared` or `metadata_ai_state_private` (`aiPrivate === true`); `[attr.title]` and
  `[attr.aria-label]` carry `metadata_ai_private_tooltip` (the label is "<state> — <tooltip>"). The card description
  becomes `metadata_ai_learn_desc`. The component injects only `BusinessService` and calls no route. No button, no
  dialog, no request.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; no new `.c-*` class (every piece is an existing engine); numbers inside the
  table cells and the cap field are left-to-right (`.c-num` / `dir="ltr"` on the input).
- Platform dialog, top to bottom (`app-modal-shell size="sm"`, `titleKey="platform_biz_dialog_title"`,
  `[dismissible]="!isSaving_()"`, `data-testid="biz-dialog"`):
  1. The business name (plain line, as `fda-name`).
  2. `app-form-field label="platform_biz_modules"` holding a `.c-chip-group` of five `label.c-chip.c-chip--toggle`
     chips, one per module, in `MODULE_KEYS` order, each `data-testid="biz-module-<key>"`.
  3. `app-form-field label="platform_ai_cap"`, `hint` = `platform_ai_cap_hint`, with `input.c-input type="number"
     min="0" step="1" inputmode="numeric" id="biz-cap"`; under it one line `platform_ai_used_month` with the number.
  4. A `.c-chip-group` with one `label.c-chip.c-chip--toggle` `platform_ai_private`, and the line
     `platform_ai_private_hint` under it.
  5. `app-form-field label="platform_fd_reason" forId="biz-reason"` with `textarea.c-input rows="2" maxlength="200"`.
  6. `.c-modal-actions`: ghost `cancel` (`data-testid="biz-cancel"`), primary `save` / `saving`
     (`data-testid="biz-save"`, `aria-busy` while saving).
- States of the dialog — edit: fields change local signals only, nothing is sent before save. Leave / cancel: closes,
  typed values are dropped, no question. Error: described in the requirements; the typed values stay. Empty: a
  business with no cap shows an empty cap field; a business with all modules off shows five unticked chips. The
  admin's own business: after a save his own navigation follows on the next refresh (the table reloads at once).
- States of the table columns — loading and empty are the page's existing ones; a row from an older server answer
  (no new fields) shows the four default modules and "0 / ללא תקרה".
- The owner's card — there is nothing to edit, save, cancel or fail; before the business loads the chip shows the
  shared state (the default).
- A screen behind a module that is off: the guard sends the user to `/dashboard` with no message (a link to it is
  not shown anywhere); a link from a request card to an event, for a business with `frontdesk` and without `events`,
  also lands on the dashboard.
- New dictionary keys (`public/assets/data/dictionary.json`, section `general`, appended; Hebrew — English meaning):
  - `module_events` "אירועים ותפריטים" — events and menus
  - `module_event_logistics` "לוגיסטיקת שטח" — field logistics
  - `module_frontdesk` "לקוחות והזמנות" — front desk
  - `module_ai_create` "יצירה עם AI" — create with AI
  - `module_consultant_diag` "אבחון יועץ" — consultant diagnosis
  - `platform_biz_dialog_title` "מודולים ו-AI לעסק" — modules and AI for the business
  - `platform_biz_edit` "מודולים ו-AI" — modules and AI (row action)
  - `platform_biz_modules` "מודולים פעילים" — active modules
  - `platform_col_modules` "מודולים" — modules (column)
  - `platform_col_ai_month` "AI החודש / תקרה" — AI this month / cap (column)
  - `platform_ai_cap` "תקרת טוקנים חודשית" — monthly token cap
  - `platform_ai_cap_hint` "ריק = ללא תקרה" — empty = no cap
  - `platform_ai_cap_invalid` "מספר שלם, 0 ומעלה" — a whole number, 0 or more
  - `platform_ai_no_cap` "ללא תקרה" — no cap
  - `platform_ai_used_month` "נוצלו החודש:" — used this month
  - `platform_ai_private` "מצב פרטי" — private mode
  - `platform_ai_private_hint` "במצב פרטי לא לומדים מהעסק. הפעלה מוחקת את מה שכבר שותף ממנו." — in private mode nothing is learned from the business; turning it on deletes what it already shared
  - `platform_ai_private_tag` "פרטי" — private (tag)
  - `platform_ai_shots_desc_all` "כאן מופיעות דוגמאות של מתכונים שנוצרו ב-AI ונשמרו בכל עסק שאינו במצב פרטי. «הוספה למאגר» מלמדת את ה-AI של כל העסקים מהדוגמה. «דיוק ה-AI» אומר כמה הטיוטה של ה-AI הייתה קרובה למה שנשמר בסוף." — examples from every business that is not private
  - `platform_ai_shots_candidates_hint_all` "מכל עסק שאינו במצב פרטי, עוד לא במאגר" — from every business that is not private, not yet in the pool
  - `metadata_ai_learn_desc` "מה שנוצר ב-AI ונשמר אצלכם עוזר לשפר את ה-AI של FoodVibe לכל העסקים, בלי שם העסק." — what you create with AI and save helps improve the AI for every business, without the business name
  - `metadata_ai_state_shared` "משותף עם FoodVibe" — shared with FoodVibe
  - `metadata_ai_state_private` "מצב פרטי" — private mode
  - `metadata_ai_private_tooltip` "מצב פרטי מסדירים בפנייה ל-FoodVibe" — private mode is arranged by contacting FoodVibe
  - `ai_monthly_cap_reached` "הגעתם לתקרת השימוש החודשית ב-AI. לפרטים פנו ל-FoodVibe." — you reached the monthly AI cap; contact FoodVibe
  - `ai_feature_logistics_extract` "לוגיסטיקה מהערות שטח" — logistics from site notes
  - `ai_feature_invoice_read` "קריאת חשבונית" — invoice read
  - `ai_feature_menu_prices_parse` "תפריט עם מחירים" — menu with prices
  - `ai_feature_stock_extract` "ספירת מלאי בקול או בטקסט" — stock count by voice or text
  - `ai_fail_business_cap` "תקרה חודשית" — monthly cap
- Lucide icons: `settings` (row action), `lock` (owner's chip) — both already registered in `src/app/app.config.ts`;
  `pnpm run lint:icons` confirms. No new icon.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Add the one browser service that knows which modules the business has — loaded_ on BusinessService (spec cases: false then true after the answer, true after an error, true when signed out); ModuleService with modules_, has, hasType, ready (spec cases from the Done-when); a row for the new file in the services map — src/app/core/services/business.service.ts, src/app/core/services/business.service.spec.ts, module.service.ts, src/app/core/services/module.service.spec.ts, src/app/core/services/breadcrumbs.md
- [x] A2: Send a user who opens a screen of a missing module back to the dashboard — moduleGuard factory with its spec (true, UrlTree, waits for ready, true when signed out); the guard added to the eleven routes after authGuard — src/app/core/guards/module.guard.ts, src/app/core/guards/module.guard.spec.ts, src/app/app.routes.ts
- [x] A3: Hide the header links and tab chips of modules the business does not have — navLinks_ and the two bottom-bar links; the modules field on eight chips and the fewer-than-two rule; both specs provide a ModuleService stub { has } (all on by default so the existing link-list cases pass unchanged) and gain the cases of the Done-when — src/app/core/components/header/header.component.ts, header.component.html, src/app/core/components/header/header.component.spec.ts, src/app/core/components/tab-chips/tab-chips.component.ts, src/app/core/components/tab-chips/tab-chips.component.spec.ts
- [x] A4: Stop the browser from asking the server for data of a module that is off — the five read methods and the two bulk Trash calls of the adapter with its new spec (HttpTestingController: no request for requests without frontdesk, clients with only events, products always); the Trash section list without the off types (spec case); dashboard cards, the setup step and the venues tabs hidden; dashboard specs gain one case per hidden piece — src/app/core/services/http-storage.adapter.ts, src/app/core/services/http-storage.adapter.spec.ts, src/app/pages/dashboard/dashboard.page.ts, src/app/pages/dashboard/components/dashboard-overview/**, src/app/pages/dashboard/components/setup-checklist-card/**, src/app/core/services/trash.service.ts, src/app/core/services/trash.service.spec.ts
- [x] A5: Hide the logistics panel and every create-with-AI entry when the business lacks the module — the panel's template inside one @if (spec case: renders nothing without event_logistics); module on HeroFabAction and the filter in the FAB (spec case); module ai_create on the six actions (same line in the growth-frozen page); the quick-add sparkles button; the three modal services return early (one spec case each) — src/app/pages/menu-intelligence/components/event-logistics-panel/**, src/app/core/services/hero-fab.service.ts, src/app/core/components/hero-fab/**, the six action files named in the Problem Statement, src/app/shared/quick-add-product-modal/**, src/app/shared/ai-recipe-modal/**, src/app/shared/ai-menu-modal/**, src/app/shared/ai-product-modal/**
- [x] A6: Tell the user in Hebrew when the monthly AI cap is reached — aiCapErrorKey with its spec (the cap body, another 429, a non-object); asked first in the five places (one spec case each); the key ai_monthly_cap_reached, the four AI feature labels and ai_fail_business_cap — src/app/core/utils/ai-error.util.ts, src/app/core/utils/ai-error.util.spec.ts, the three AI modal components, product-import.component.ts, recipe-ingredients-table.component.ts, public/assets/data/dictionary.json
- [x] A7: Give the platform admin one dialog for a business's modules, AI cap and private mode with a required reason — BusinessRow fields, PlatformUpdateBody, updatePlatform; the dialog component, template, service and spec (the five Done-when cases plus cancel closes without a request and a 500 keeps the dialog open with a toast); the module and dialog keys — src/app/core/services/platform-admin.service.ts, src/app/pages/platform-dashboard/components/platform-business-dialog/**, public/assets/data/dictionary.json
- [x] A8: Show each business's modules and its AI use against the cap in the platform table — the two cells and header cells, the two grid tracks, the private tag, the settings action button that opens the dialog, the dialog mounted under @if (isOpen_()); page spec cases (modules text, tokens / cap, no cap, private tag, button opens the dialog on the row); the two new AI examples texts and their spec assertions — src/app/pages/platform-dashboard/platform-dashboard.page.ts, .html, .scss, .spec.ts, src/app/pages/platform-dashboard/components/platform-ai-shots/**, public/assets/data/dictionary.json
- [x] A9: Turn the owner's sharing card into a locked chip that shows shared or private — the locked span with the lock icon, title and aria-label, the new description key; spec rewritten to three cases (shared text by default, private text when aiPrivate is true, title equals the tooltip key and there is no input); e2e 618-1 keeps passing (no enabled input) — src/app/pages/metadata-manager/components/ai-examples-share/**, public/assets/data/dictionary.json
- [x] A10: Write the four browser checks and run every gate — 620-1 and 620-2 set the QA business's modules through PUT /api/v1/admin/businesses/<id>/platform (id from GET /api/v1/business, reason "e2e 620"), reload, assert, and restore the four defaults in finally; 620-1 also fails if any response during the page load has status 403; 620-3 opens the dialog and cancels; 620-4 reads the chip text; each saves screens/620-n.png; then pnpm run test:ci, build, lint, lint:icons, lint:reuse, breadcrumbs-check, log-query, with the result lines in Execution Notes and the three [human] cards handed over — e2e/ui/620-1.spec.ts, e2e/ui/620-2.spec.ts, e2e/ui/620-3.spec.ts, e2e/ui/620-4.spec.ts

## Technical Considerations
- Dependencies: `BusinessService`, `HttpStorageAdapter` (every generic read passes through the new check),
  `HeroFabService`, the three AI modal services, `PlatformAdminService`. `FrontDeskBadgeService`, the data services and
  the resolvers are not edited: they get an empty list from the adapter when their module is off.
- New files needed: `module.service.ts` + spec, `module.guard.ts` + spec, `ai-error.util.ts` + spec,
  `src/app/core/services/http-storage.adapter.spec.ts`, the four files of `platform-business-dialog/`, `e2e/ui/620-1…4.spec.ts`.
- Model changes: `BusinessRow` (four fields), `PlatformUpdateBody`, `HeroFabAction.module`, `TabChip.modules`;
  `ModuleKey` and the module helpers are imported from `@schemas/modules`.
- Backend / API: none added. Used: `PUT /api/v1/admin/businesses/:id/platform` (616, 618), the new fields of
  `GET /api/v1/admin/businesses` (616, 617), 429 `ai_monthly_cap_reached` (617).
- Auth and validation: the dialog is on `/platform` (platform admin guard; the server checks again). The browser checks
  the reason length (3–200) and the cap (whole number ≥ 0) before sending; the server validates both.
- Security surface: none new. Hiding is not the gate: a hidden link or a skipped request grants nothing, and every
  gated route answers 403 on the server whatever the browser shows. No secret, no storage change.
- Data / migration: none.
- Project checks: the `[auto] log-query` item is present; `pnpm run test:ci` is a Done-when item; every new dictionary
  key is named with its Hebrew value (append-only, none exists today); icons named and already registered; Reuse
  Check lists every new piece and every control of the dialog; Hebrew RTL and logical CSS; signals, `inject()`,
  `input()/output()`; no new route (the dialog is part of the lazy `/platform` page); `menu-intelligence.page.ts`
  net lines 0; `app.routes.ts` and `dictionary.json` only gain entries.

## Out of Scope
- The server gates, the cap and the private rule themselves (616, 617, 618).
- The diagnosis entry of `consultant_diag` (633, 634), the business switcher and "enter business" (632), the loading
  sheet (624), the platform learning section (630).
- Showing `platformHistory` (who changed what and why) on a screen.
- A message for a user who types the address of a screen he does not have — he lands on the dashboard.
- A request button or form for private mode on the owner's card (decision D9: tooltip only).
- Removing the unused dictionary keys `metadata_ai_share_desc`, `metadata_ai_share_chip`, `metadata_ai_share_error`,
  `platform_ai_shots_desc`, `platform_ai_shots_candidates_hint` (the file is append-only).
- Hiding write buttons inside screens of an open module that reach another module (for example a request card's link
  to an event): the guard and the server answer.

## Critical Questions
- none

## Execution Notes
- decided: the six AI actions are filtered in the FAB through a `module` field on the action — why: one place instead of six conditions, and the growth-frozen `menu-intelligence.page.ts` changes one existing line (net 0).
- decided: the logistics panel hides itself (its own template) — why: hiding it from the page would add lines to the growth-frozen page class.
- decided: the adapter returns an empty list for a type whose module is off — why: `FrontDeskBadgeService`, the dashboard cards, Trash and several shared pieces read gated types outside the gated screens; without this a business with a module off would log a 403 on every page load.
- decided: before the business has loaded `has()` answers from the default modules, while the guard and the adapter wait for `ready()` — why: no flicker of links for the usual business; nothing wrong is opened or requested for a business with a module off.
- decided: a chip group left with fewer than two chips shows no row — why: a business with `events` and without `frontdesk` would see a row with the single chip "לקוחות" on the clients screen.
- decided: `/dashboard?tab=venues` shows the overview without `events`, and the dashboard's events and front desk cards are hidden — why: they are entries into gated areas and one of them calls a gated route.
- decided: the row action uses the `settings` icon and is shown on every row — why: it is registered already (no `app.config.ts` edit) and, unlike the front desk button, every business has modules.
- decided: the two new columns are not sortable — why: the card asks for columns, not for sorting; a module list has no natural order.
- decided: the owner's tooltip is the `title` and `aria-label` of a focusable locked chip, and the card's description line says what is shared — why: the app has no tooltip component; a `title` alone would say nothing on a phone, so the always-visible line carries the explanation and the tooltip the "contact FoodVibe" part.
- decided: the AI examples section gets two new text keys — why: the existing texts say "businesses that agreed to share" and the dictionary is append-only.
- decided: the dialog asks no question on cancel, Escape or backdrop — why: the front desk dialog beside it does not, and the brief forbids confirmation dialogs nobody asked for.
- decided: the cap message is added in the five places that already translate a 429 — why: they would otherwise show "daily limit, try tomorrow", which is false for a monthly cap.

### Builder run (mod-0, round 2, fresh judgment builder) — evidence
- Restarted from base 76088b05 with the approved scope (answer 620-1). Re-used the reviewed files of the discarded attempt 335fcc4, except `src/app/pages/trash/trash.page.html` (outside the scope): `trash.page.ts` now reads `TrashService.sections_()` through a `sections` getter, so the template is unchanged.
- Fixed: the dialog's cap input now sits on the `appNumberBox` line (the `number-box` debt stays at 68); `e2e/ui/620-1.spec.ts` and `620-2.spec.ts` had lost the backslashes of `/\/$/` and `/\/dashboard/` (a syntax error); `npx playwright test --list` -> 5 tests in 5 files.
- Reuse Check: the `platform-business-dialog` folder declared (kit-checks `reuse-undeclared`).
- `pnpm run build` -> exit 0 (initial 590.71 kB, warning budget 570 kB; base 588.93 kB). `pnpm run lint` -> exit 0 (0 errors, 67 old warnings). `pnpm run test:ci` -> exit 0, 2301 of 2301 SUCCESS.
- `pnpm run lint:icons` -> exit 0. `pnpm run lint:no-native-select` -> exit 0. `node scripts/breadcrumbs-check.mjs` -> BREADCRUMBS: clean. `node scripts/override-check.mjs` -> ok. `node scripts/plan-ledger-check.mjs` -> OK. `node scripts/log-query.mjs --since=plan-start --level=error` -> SKIP: no database configured (no entries). scope-check --diff=origin/orch/mod-0 -> SCOPE: ok. kit-checks -> KIT_CHECKS: ok (6 checks). kit-manifest-check -> ok, 0 unclassified.
- `node scripts/reuse-lint.mjs --diff=origin/orch/mod-0` -> REUSE: ok. `--check-registry` -> exit 1 with 4 missing paths that the base registry has too (lines 23, 164, 197, 312 on origin/orch/mod-0), none from this plan.
- NOT MET: the Done-when `pnpm run lint:reuse` exits 0 — the bare script (`node scripts/reuse-lint.mjs`, no argument) always prints its usage and exits 1, on the base too. Returned as ESCALATE (A10 left open).
- The four `[ui]` specs (e2e/ui/620-1..4.spec.ts) are written, not run (no app, no QA login in this folder).

### Builder run (mod-0, round 2, resume after answer 620-2)
- scope extended: package.json — approved by the Human (answer 620-2): `lint:reuse` is now `node scripts/reuse-lint.mjs --diff=origin/main`; a passed `--check-registry` still wins (checked first), a later `--diff=` overrides.
- `pnpm run lint:reuse` -> exit 0, REUSE: ok. `pnpm run build` -> exit 0. `pnpm run lint` -> exit 0 (0 errors, 67 old warnings). `pnpm run test:ci` -> exit 0, TOTAL: 2301 SUCCESS. `lint:icons`, `lint:no-native-select` -> exit 0. scope-check -> SCOPE: ok. kit-checks -> KIT_CHECKS: ok (6 checks). kit-manifest-check -> ok. override-check, plan-ledger-check, breadcrumbs-check (clean), ci-scope-check -> exit 0. log-query -> SKIP: no database configured (no entries).
- A10 done; the four `[ui]` specs are written, not run, and the three `[human]` cards go to the Human.
