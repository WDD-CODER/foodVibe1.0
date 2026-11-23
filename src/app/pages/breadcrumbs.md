# src/app/pages — breadcrumbs

One folder per lazy-loaded route segment (loaded from `app.routes.ts`). Each page owns its layout and keeps list / form / detail views under its own `components/`.

| Entry | Purpose |
| --- | --- |
| `welcome/` | `/welcome` — the signed-out front door: the mark, the promise, sign-up and sign-in; `/` leads here for a first-time visitor (home-redirect.ts) |
| `dashboard/` | `/dashboard` — overview tabs; also hosts metadata (`/command-center` redirects to `dashboard?tab=metadata`) |
| `report/` | `/report` — the business report: measured start vs latest, monthly trend, findings, one-page A4 print (plan 568); the platform admin opens it with `?businessId=` |
| `diagnosis/` | `/diagnosis` — the consultant's diagnosis: invoice queue, menu with prices, printable margin report (plan 634) |
| `inventory/` | `/inventory` — products list + form; `equipment` child routes live under it |
| `equipment/` | Equipment list + form components, routed under `/inventory/equipment` (no page of its own) |
| `dev-catalog/` | `/dev/catalog` — dev-only page that renders every shared UI family (route absent in production builds) |
| `venues/` | `/venues` — venue list, detail and form |
| `suppliers/` | `/suppliers` — supplier list and form |
| `recipe-book/` | `/recipe-book` — recipe list and filters |
| `recipe-builder/` | `/recipe-builder/:id` — single-recipe editor with local `services/` and `utils/` |
| `cook-view/` | `/cook/:id` — step-by-step cook workflow |
| `menu-library/` | `/menu-library` — menu list and filters |
| `menu-intelligence/` | `/menu-intelligence/:id` — menu editor and costing views; the event-logistics-panel component = collapsed phone-intake / site-visit checklist under the notes log (plan 522; plan 579: questions by event date, hide on one event, one "נדרש" toggle + "עלינו" / "באחריות הלקוח") |
| `metadata-manager/` | (plan 600: owner card ai-examples-share, opt-in to the shared AI example pool) Categories, allergens, units, preparations, event-logistics questions (`metadata-manager/components/logistics-item-manager/`, plans 523, 581: edit, remove/restore, own sections) (`metadata-manager/metadata-manager.page.component.ts`) |
| `clients/` | Front Desk: the client list (plan 547), profile (`/clients/:id`) from plan 551 |
| `requests/` | `/requests` — Front Desk work queue: one card per request with fit verdict, approve / ask / decline, phone request dialog, day load strip (plan 552); plan 672: `requests/components/approve-table-dialog/` opens when an approve answers NO_TABLE (alternative hours, and the owner's free tables) |
| `bookings/` | `/bookings` — Front Desk agenda: day / week bookings with arrival actions (plan 552); plan 671: the third view `floor` (`bookings/components/floor-view/`, only with the `tables` module): the room with live table states, the time strip, summary pills and the owner's confirm-mode switch; plan 686: a tap on a table opens the table sheet (`bookings/components/table-sheet/`: seat, finish, no-show, cancel, move) and "move" is a mode of the floor view; plan 672: the bar buttons open `bookings/components/new-booking-dialog/` (phone booking) and `bookings/components/walk-in-dialog/`, and `bookings/components/service-lists/` holds the "arriving next" and "not assigned" lists beside the room; plan 673: the bar's "waiting list" button opens `bookings/components/waitlist-drawer/` (add a party, the waiting rows, "table is ready", "seated" via the pick-a-table mode, "left") and the table sheet of a free table names the party that fits |
| `public-request/` | `/book/:slug` (the guest request form, three steps) and `/book/:slug/r/:token` (the guest's status page with cancel) — bare routes, no app header (plan 555); `PublicRequestService` is page-scoped; for a restaurant with table service (plan 670) step 2 shows the free hours as chips from the availability read, an area choice, a confirmed or waiting done card, and `services/booking-calendar.util.ts` (`bookingIcs`, add to calendar) |
| `frontdesk/` | `/frontdesk/*` — Front Desk settings screen (`/frontdesk/settings`, plan 553): the owner's profile editor; knowledge base (`/frontdesk/knowledge`, plan 554); the printable onboarding intake form (`/frontdesk/onboarding`, plan 556); the owner's data export card (`frontdesk/frontdesk-settings/components/data-export-card`, plan 557: clients, requests, bookings as CSV); the table settings card (`frontdesk/frontdesk-settings/components/table-service-card`, plan 667: the one-button confirm-mode switch, the nine table settings and the turn ladder; with the booking page QR block, only with the `tables` module); the floor plan editor (`/frontdesk/floor-plan`, plan 665: `frontdesk/floor-plan/`, draw the room from presets, drag, save; needs the `tables` module; plan 684: the table panel and room panel (in the components folder of floor-plan) edit a table, the areas and the room size; the pure editing rules sit beside the page; plan 666: `frontdesk/floor-plan/components/joins-list` lists the joined tables, `frontdesk/floor-plan/floor-plan-joins.util.ts` holds their rules, the table panel has arrow buttons, and under 768 px the panel is a bottom sheet). `platform-dashboard/` also holds the platform admin's front desk dialog (`platform-dashboard/components/front-desk-admin-dialog`, plan 557) |
| `trash/` | `/trash` — soft-deleted items and restore |
| `platform-dashboard/` | (plan 600: platform-ai-shots component, the admin's shared recipe AI example pool) `/platform` — platform-admin-only table of every business (activity, events, internal flag) + the logistics-items list (plan 532: each business's own logistics items grouped, promote to shared); each row can enter the business and give a consultant access (plan 632, `platform-dashboard/components/grant-access-dialog`) |
| `settings/` | `/settings` — owner-only tabs chosen by `?tab=`; the Team tab adds and removes staff; the Access tab (plan 632) lists the consultants who have access and removes it |

## Key exports
`DashboardPage`, `InventoryPage`, `VenuesPage`, `SuppliersPage`, `RecipeBookPage`, `RecipeBuilderPage`, `CookViewPage`, `MenuLibraryPage`, `MenuIntelligencePage`, `MetadataManagerComponent`, `TrashPage`, `PlatformDashboardPage`, `SettingsPage`, `WelcomePage`, `RequestsPage`, `BookingsPage`, `FrontdeskSettingsPage`

---
*Updated by: breadcrumbs*
