# src/app/pages — breadcrumbs

One folder per lazy-loaded route segment (loaded from `app.routes.ts`). Each page owns its layout and keeps list / form / detail views under its own `components/`.

| Entry | Purpose |
| --- | --- |
| `welcome/` | `/welcome` — the signed-out front door: the mark, the promise, sign-up and sign-in; `/` leads here for a first-time visitor (home-redirect.ts) |
| `dashboard/` | `/dashboard` — overview tabs; also hosts metadata (`/command-center` redirects to `dashboard?tab=metadata`) |
| `report/` | `/report` — the business report: measured start vs latest, monthly trend, findings, one-page A4 print (plan 568); the platform admin opens it with `?businessId=` |
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
| `metadata-manager/` | Categories, allergens, units, preparations, event-logistics questions (`metadata-manager/components/logistics-item-manager/`, plans 523, 581: edit, remove/restore, own sections) (`metadata-manager/metadata-manager.page.component.ts`) |
| `clients/` | Front Desk: the client list (plan 547), profile (`/clients/:id`) from plan 551 |
| `requests/` | `/requests` — Front Desk work queue: one card per request with fit verdict, approve / ask / decline, phone request dialog, day load strip (plan 552) |
| `bookings/` | `/bookings` — Front Desk agenda: day / week bookings with arrival actions (plan 552) |
| `frontdesk/` | `/frontdesk/*` — Front Desk settings screen (`/frontdesk/settings`, plan 553): the owner's profile editor |
| `trash/` | `/trash` — soft-deleted items and restore |
| `platform-dashboard/` | `/platform` — platform-admin-only table of every business (activity, events, internal flag) + the logistics-items list (plan 532: each business's own logistics items grouped, promote to shared) |
| `settings/` | `/settings` — owner-only tabs chosen by `?tab=`; the Team tab adds and removes staff |

## Key exports
`DashboardPage`, `InventoryPage`, `VenuesPage`, `SuppliersPage`, `RecipeBookPage`, `RecipeBuilderPage`, `CookViewPage`, `MenuLibraryPage`, `MenuIntelligencePage`, `MetadataManagerComponent`, `TrashPage`, `PlatformDashboardPage`, `SettingsPage`, `WelcomePage`, `RequestsPage`, `BookingsPage`, `FrontdeskSettingsPage`

---
*Updated by: breadcrumbs*
