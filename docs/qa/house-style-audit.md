# House style audit — every route against the house rules

Written by plan 739 on 2026-11-25, from `origin/main` 3f5f24a3. The rules: `docs/agent/house-style.md`.

**How it was measured**
- **Structure and behaviour:** read from the code (`git grep` on the page folders; file and line under Evidence).
- **Look:** Style QA (`/styleqa`), signed in as the QA owner, 29 pages at 375, 768 and 1366 px: 1,735 measured
  findings and 60 visual findings (2 high, 37 medium, 21 low) from 26 reviewed pages.
- **Not measured as themselves:** `diagnosis` and `platform` (the QA user is neither a consultant nor the platform
  admin, so both redirect to the dashboard and their numbers are the dashboard's); `client-detail` (no client record
  to open). The metadata manager has no Style QA page of its own (it is a dashboard tab); its gaps come from the code.
- The Style QA report itself lives in `.claude/styleqa/report.md` (not committed); every finding used here is quoted.

## Order of work

Proposed alignment waves, worst first. A shared piece is fixed once before any page that uses it.

| wave | what is fixed once (rule or family) | pages it changes | why this order |
|---|---|---|---|
| 0 | The three missing shared pieces: one drag look with keyboard reorder, one scroll area with arrows, one focus ring (plan 742; rules `drag`, `scroll`, `keyboard-focus`) | the 4 drag lists, trash history, every page (ring) | already saved; plan 740's checks need these pieces to exist |
| 1 | Two real overlaps on the stock count: the finish button over the date field, a stray chevron under the quantity (the only `high` findings) | stock-count | a broken screen comes before any polish |
| 2 | The chrome every page shares: one framed sideways row with arrows everywhere, the top bar and the metadata manager included (rule `sideways-row`, `app-scroll-rail`); one tooltip box replacing the hand-made tooltips and the browser's `title` hints (rule `tooltip`); tab chips drawn as underlined links (`app-tab-chips`), the floating round button covering rows and cards (`app-hero-fab`), the count badge and add button far from the title on wide screens (`app-page-header`), small tap targets in the top bar (`app-header`) | 5 pages with tab chips, 4 pages under the floating button, every list page, every page (top bar) | seen on almost every route, so it does the most for "one product" per fix |
| 3 | One look for every field: today some inputs are grey and filled, others white with a border (families `form-field`, `number-box`, the date field, the select) | equipment-form, product-form, frontdesk, menu-intelligence | the same form shows two field styles side by side; fixed in the shared pieces |
| 4 | Forms and the detail page on the page header and one button row (recipes `recipe-form`, `recipe-detail`) | product-form, supplier-form, equipment-form, venue-form, venue-view | four forms each draw their own header and get "back" from a hand-made nav; product-form has two primary buttons and no cancel |
| 5 | One empty block and one loader everywhere (rules `empty`, `loading`) | 7 lists with plain "no results" text; dashboard, venue-view, venue-form, cook, menu-intelligence, metadata manager, platform, trash; frontdesk settings and onboarding, public request, AI model manager | mechanical, low risk, and plan 740's lint keeps it from coming back |
| 6 | Motion on the three speed tokens (rule `motion`) | 24 page stylesheets in 11 page folders, and the typed times in `src/styles.scss` | mechanical; no visible change beyond 0.18s and 0.3s becoming 0.2s and 0.25s |
| 7 | The two list pages not on the list container, and name columns that are too narrow (recipe `recipe-list`) | menu-library, trash; inventory, recipe-book | the list container is already the default; these are the last pages outside it |
| 8 | Colours and font sizes typed by hand instead of the tokens (Style QA T1: 799, T2: 226), shared components first: the list column header and cell, `app-form-field`, the dashboard cards | every page | large and mechanical; done per shared component so one fix clears many pages |
| 9 | Popups drawn by hand move onto the shared popup frame (family `modal-shell`, rule `keyboard-focus`) | equipment list, menu-intelligence (5 popups), recipe-builder (1) | they miss the shared Escape, focus trap and focus return |
| 10 | Tap targets under 24 px (G5: 199) and accessibility findings (A1: 76, of which trash has 50) | every page; trash first | needed before a public launch, not for the "one product" feel |
| 11 | The Human decides: the menu builder's paper look (cream sheet, black double border, near-black save button) and the cook view's light footer under the dark kitchen screen — keep as their own identity, or bring to the house look | menu-intelligence, cook | a product decision, not a defect; if redesigned it goes through Claude Design and `/design-port` |

## Pages

`score` = recipe gaps + behaviour gaps + visual high. Visual medium is shown beside it because only one page has a
`high`. Measured = Style QA's script findings on that page (colour, font size and radius off the tokens, tap
targets, overlaps, cut text, accessibility).

| slug | route | recipe it should follow | recipe gaps | behaviour gaps | measured | visual high / medium | score |
|---|---|---|---|---|---|---|---|
| menu-intelligence | /menu-intelligence, /menu-intelligence/:id | no recipe (a work surface) | — | motion, scroll, empty, keyboard-focus | 179 | 0 / 7 | 4 |
| recipe-builder | /recipe-builder, /recipe-builder/:id | no recipe (a work surface) | — | motion, drag, scroll, keyboard-focus | 111 | 0 / 4 | 4 |
| trash | /trash | recipe-list | 1: not on the list container | motion, scroll, empty | 87 | 0 / 1 | 4 |
| product-form | /inventory/add, /inventory/edit/:id | recipe-form | 2: own header; own button row with two primary buttons and no cancel | motion | 74 | 0 / 2 | 3 |
| dashboard | /dashboard | recipe-board | 1: hand-made KPI and activity cards | motion, empty | 45 | 0 / 1 | 3 |
| frontdesk | /frontdesk/settings, /frontdesk/onboarding, /frontdesk/knowledge | recipe-settings | 1: static groups use the card that lifts on hover | loading, empty | 26 | 0 / 2 | 3 |
| stock-count | /inventory/count | recipe-list | 0 | 0 | 46 | 2 / 3 | 2 |
| venue-view | /venues/view/:id | recipe-detail | 1: own top bar, not the page header | empty | 66 | 0 / 4 | 2 |
| venue-form | /venues/add, /venues/edit/:id | recipe-form | 1: own header | empty | 78 | 0 / 0 | 2 |
| supplier-form | /suppliers/add, /suppliers/edit/:id | recipe-form | 1: own header and a hand-made back nav | loading | 70 | 0 / 0 | 2 |
| inventory | /inventory/list | recipe-list | 0 | motion, empty | 57 | 0 / 1 | 2 |
| recipe-book | /recipe-book | recipe-list | 0 | motion, empty | 56 | 0 / 1 | 2 |
| equipment | /inventory/equipment | recipe-list | 0 | empty, keyboard-focus | 52 | 0 / 0 | 2 |
| suppliers | /suppliers/list | recipe-list | 0 | motion, empty | 50 | 0 / 0 | 2 |
| venues | /venues/list | recipe-list | 0 | motion, empty | 40 | 0 / 2 | 2 |
| menu-library | /menu-library | recipe-list | 1: not on the list container | motion | 30 | 0 / 0 | 2 |
| cook | /cook, /cook/:id | no recipe (the kitchen screen, dark) | — | motion, empty | 38 | 0 / 2 | 2 |
| platform | /platform | recipe-board | 0 by code | scroll, empty | not measured | not reviewed | 2 |
| equipment-form | /inventory/equipment/add, /inventory/equipment/edit/:id | recipe-form | 1: own header | 0 | 68 | 0 / 4 | 1 |
| clients | /clients | recipe-list | 0 | empty | 41 | 0 / 0 | 1 |
| report | /report | recipe-board | 1: own header | 0 | 18 | 0 / 0 | 1 |
| requests | /requests | recipe-board | 0 | 0 | 31 | 0 / 1 | 0 |
| invoices | /inventory/invoices | recipe-list | 0 | 0 | 24 | 0 / 2 | 0 |
| product-import | /inventory/import | recipe-form | 0 | 0 | 26 | 0 / 0 | 0 |
| bookings | /bookings | recipe-board | 0 | 0 | 25 | 0 / 0 | 0 |
| settings | /settings | recipe-settings | 0 | 0 | 25 | 0 / 0 | 0 |
| welcome | /welcome | no recipe (the public landing page) | — | 0 | 8 | 0 / 0 | 0 |
| client-detail | /clients/:id | recipe-detail | 0 by code | 0 by code | not measured | not reviewed | 0 |
| diagnosis | /diagnosis | recipe-board | 0 by code | 0 by code | not measured | not reviewed | 0 |

**What the table says.** The newer pages (requests, bookings, settings, invoices, clients) are built from the shared
header, panels and empty block and score lowest. The "another product" feel comes from four places: the two work
surfaces (menu builder, recipe builder), the add/edit forms, the shared chrome (underlined tab chips, the floating
button over content), and fields that look two different ways.

## Evidence

### Recipe gaps
- Not on the list container: `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html` (own `app-page-header`, own rows), `src/app/pages/trash/trash.page.html` (`section.trash-section`).
- Forms with their own header (`header.form-header > h2`) instead of `app-page-header`: `product-form.component.html:3-13`, `supplier-form.component.html:2-8`, `equipment-form.component.html:2-8`, `venue-form.component.html:2-8`. "Back" comes from a hand-made nav: `suppliers.page.html:1-11`, `venues.page.html:1-13`.
- Product form button row: `product-form.component.html:423-435` — page-local `div.form-actions`, a "back to list" button and Save both `c-btn-primary`, no ghost cancel.
- Venue view: `venue-detail.component.html:3-18` (`div.detail-topbar` with its own back button). Style QA V7 medium: "The back button looks different from the other buttons".
- Dashboard: hand-made `.kpi-card` and `.activity-section` in `dashboard-overview.component.html`; report: `header.report__head` in `report.page.html`.
- Front desk settings: every static group is `section.fs-card.c-glass-card` (the card that lifts on hover) in `frontdesk-settings.page.html`; the same in `frontdesk-onboarding.page.html` (`ob-card c-glass-card`).

### Behaviour gaps
- `motion` — page stylesheets with their own `transition:` (24 files): cook-view 1, dashboard 2, inventory 2, menu-intelligence 6, menu-library 1, metadata-manager 3, recipe-book 1, recipe-builder 4, suppliers 1, trash 1, venues 2. Only `cook-view.page.scss` uses `var(--dur-*)`. `product-form.component.scss:334` uses `transition: all`. `src/styles.scss` types 0.2s ×26, 0.18s ×8, 0.15s ×8, 0.25s ×2, 0.1s ×1, 0.4s ×1.
- `scroll` — own scroll areas (`overflow(-y): auto|scroll`): `trash.page.scss:212`; `platform-dashboard.page.scss:260, 303`; menu-intelligence `event-closing-dialog`, `menu-export-sheet`, `prep-sheets`, `pricing-meter`, `supplier-orders`; recipe-builder `paste-ingredients-dialog`, `recipe-header`. (`dashboard-overview.component.scss:236-239` already uses `appScrollIndicators`.)
- `drag` — `ai-model-manager.component.scss:140-174`, `recipe-ingredients-table.component.scss:24-46`, `recipe-workflow.component.scss:538-561`, `ai-draft-editor.component.scss:395-419`; no keyboard reorder in any.
- `empty` — plain "no results" text instead of `app-empty-state`: inventory `:150`, recipe-book `:185`, suppliers `:99`, equipment `:109-111`, venues `:84`, clients `client-list.component.html:70`, knowledge `knowledge.page.html:81`. Hand-made empty blocks: dashboard `dashboard-overview.component.html:193`, `business-performance.component.html:71, 127`; venue view `p.detail-empty` (`:96, :115, :134`); venue form `p.infra-empty` (`:200`); cook `cook-view.page.html:666, 822, 853`; menu-intelligence `event-notes-log:28`, `event-stage-bar:62`, `prep-sheets:66`; metadata manager `logistics-item-manager:89`, `taxonomy-kind-manager:77`, `user-management:10, 12`, `metadata-manager.page.component.html:146`, `ai-model-manager:9`; platform `platform-dashboard.page.html:7`, `platform-learning:14`; trash `trash.page.html:33`.
- `loading` — a text line instead of `app-loader`: `frontdesk-settings.page.html:6`, `frontdesk-onboarding.page.html:5`, `public-request.page.html:3`, `public-request-status.page.html:3`, `ai-model-manager.component.html:14`. Supplier form save button has no loader: `supplier-form.component.html:52`.
- `keyboard-focus` — popups drawn by hand (`c-modal-overlay`) instead of `app-modal-shell`: `equipment-list.component.html:183-190`; menu-intelligence `deposit-paid-dialog`, `event-closing-dialog`, `not-closed-dialog`, `prep-sheets`, `supplier-orders`; recipe-builder `paste-ingredients-dialog`. No global `:focus-visible` rule in `src/styles.scss`.
- `feedback` — no page gap. The toast (`app-user-msg`) has no `role` or `aria-live`.

### Look — Style QA visual findings, grouped by what fixes them
- **Tab chips look like links (5 pages, `app-tab-chips`):** cook "Mode switch chips have underlined link-style text" (low); frontdesk "Tab chip labels are underlined like links" (low); invoices "Tab chip labels are underlined like default browser links" (medium); menu-library "The two sub-navigation tabs show underlined link text" (low); requests "Tab and filter chip labels are underlined and show a stray underscore or mark" (low).
- **The floating round button covers content (4 pages, `app-hero-fab`):** inventory "covers the row actions at the bottom of the list" (low); requests "covers the timestamp on the second card" (medium); stock-count "covers the unit select of the rows beneath it" (medium); suppliers "covers the row actions menu of the last visible row" (low).
- **Fields look two ways (4 pages):** equipment-form "Quantity and notes fields use a grey filled look while name and category are white outlined" (medium); product-form "The price field has a grey fill while the neighbouring fields are white" (medium); frontdesk "Text inputs and the select use different field looks" (medium); menu-intelligence "The date is a filled grey box while the neighbouring fields are bare text" (low).
- **Page header on wide screens (`app-page-header`):** clients "The client count badge is separated from the page title" (low); venues "The count badge and add button are far from the page title" (medium).
- **Name column too narrow:** inventory "Product names are squeezed into a narrow column and wrap onto 2-3 lines" (medium); recipe-book "Recipe names are squeezed into a narrow column" (medium).
- **Stock count:** "The round finish-count button covers the end of the date field" (high, at two widths); "A stray chevron sits under the 0 in the quantity stepper" (medium).
- **Menu builder's own look:** "The save button is near-black, not the teal primary, while a different button is teal" (medium); "The menu sheet has a thick black double border and a cream fill that do not match the light glass cards" (medium); "The cost bar covers the bottom of the menu sheet and its fields and totals are scattered" (medium).
- **Recipe builder:** "A blank pill field beside the add button has no label or placeholder" (medium); "The recipe header card leaves a large empty gap in the middle" (medium); "The star rating and tags box float unaligned in the header card" (low).
- **Single-page findings:** cook "Light footer area below the dark kitchen view" (medium); dashboard "Uneven gap between stacked cards" (medium), "Setup checklist leaves most of the card empty" (low); equipment-form "The two toggle buttons are stacked with a large uneven gap" (medium); invoices "Table card right edge does not line up with the header" (medium); recipe-book "Tag chips at the bottom of the filter panel collide with the scroll chevron" (low); supplier-form "A filled primary 'add supplier' button above the form competes with the form's own save button" (low); trash "Permanent-delete and restore buttons carry equal, heavy weight on every row" (medium), "Deleted-date sits far from the item name" (low); venue-form "The video-tours section has extra empty space below its button" (low); venue-view "The summary card has a large empty area above the title" (medium); venues "The single venue card leaves most of the wide panel empty" (medium), "The filter sidebar is a tall white panel with only a few chips" (low); welcome "Large loose gaps between card icon, title and body text" (low).

### Look — Style QA measured findings (script, no model)
- By check, all pages: colour off the tokens (T1) 799; font size off the tokens (T2) 226; tap target under 24 px (G5) 199; accessibility (A1) 76, of which trash 50, menu-intelligence 14, recipe-builder 8; radius off the tokens (T3) 18; overlapping elements (L4) 18; cut text without an ellipsis (L3) 16; a sideways row with a cut sliver (L6) 4. Typed values in stylesheets: 379 (S2 55, S3 324) in 168 stylesheets.
- Shared components that carry findings on many pages (fix once): `app-header` and `app-hero-fab` (every signed-in page), `app-scroll-rail` (25 pages), `app-page-header` (10), `app-custom-select` (9), `app-list-shell` (8), `app-list-row-checkbox` (6), `app-column-carousel-header` (5), `app-form-field` (5), `app-column-carousel-cell` (4), `app-date-field` (3).

## Needs

Pieces the rules name that do not exist yet, and who waits on them. The first three are built by plan 742; the last two were added by the Human on 2026-11-25 (rules `sideways-row`, `tooltip`) and are built in wave 2.

| piece | rule | waits on it |
|---|---|---|
| one shared drag look, and a keyboard way to reorder | `drag` | recipe-builder (ingredients, steps), the AI recipe draft, the AI model list |
| one shared scroll area with the "more to scroll" arrows | `scroll` | trash, platform, menu-intelligence (5 areas), recipe-builder (2 areas) |
| one global keyboard focus ring | `keyboard-focus` | every page |
| a visible frame on the sideways scroll rail, and the top bar's navigation on that rail | `sideways-row` | the top bar (every signed-in page), tab chips, settings tabs, the metadata manager's jump navigation, the event stage bar, the dish row, the diagnosis workspace |
| one shared tooltip box | `tooltip` | 2 hand-made tooltips (product list, recipe book list) and 76 browser `title` hints in 34 templates; the nutrition box keeps its own look |

## Seen on the way (not part of the rules)

- Style QA measured the signed-out welcome page for every signed-in route until this plan: its read-only guard
  aborted the app's session refresh, and the app then signed the test user out. Fixed for this project in
  `scripts/qa/lib/styleqa-sign-in.mjs`; the proper fix belongs in the kit's sweep (install the guard before the
  sign-in). Earlier Style QA reports of signed-in pages should not be trusted.
- Style QA cannot open `/diagnosis` and `/platform` as themselves: the QA user needs the consultant module and the
  platform-admin flag, or those two pages need their own sign-in.
