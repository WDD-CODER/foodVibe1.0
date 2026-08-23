# Design Port Registry

Tracks the 13-screen port from `.interface-design/source/` onto the Angular app, per
`.claude/commands/design-port.md`. One screen per session. Status values: `todo`, `spec-pending-approval`
(spec written, awaiting Human validation word before code), `in-progress` (spec approved, code underway),
`done` (verified per §6 Step 5, registry updated), `no-design` (no counterpart in the design source — skipped).

| # | Screen | Angular path | Design source file | Status | Spec |
|---|---|---|---|---|---|
| 1 | Dashboard | `src/app/pages/dashboard/` | `Dashboard.dc.html` | done | `01-dashboard.port-spec.md` |
| 2 | Inventory | `src/app/pages/inventory/` | `Inventory.dc.html` | todo | — |
| 3 | Recipe Book | `src/app/pages/recipe-book/` | `RecipeBook.dc.html` | todo | — |
| 4 | Suppliers | `src/app/pages/suppliers/` | `Suppliers.dc.html` | todo | — |
| 5 | Equipment | `src/app/pages/equipment/` | `Equipment.dc.html` | todo | — |
| 6 | Venues (+ VenueDetail) | `src/app/pages/venues/` (incl. `components/venue-detail/`) | `Venues.dc.html` + `VenueDetail.dc.html` | todo | — |
| 7 | Menu Library | `src/app/pages/menu-library/` | `MenuLibrary.dc.html` | todo | — |
| 8 | Metadata Manager | `src/app/pages/metadata-manager/` | `MetadataManager.dc.html` | todo | — |
| 9 | Trash | `src/app/pages/trash/` | `Trash.dc.html` | todo | — |
| 10 | Recipe Builder | `src/app/pages/recipe-builder/` | `RecipeBuilder.dc.html` | todo | — |
| 11 | Cook View | `src/app/pages/cook-view/` | `CookView.dc.html` | todo | — |
| 12 | Menu Intelligence | `src/app/pages/menu-intelligence/` | `MenuIntelligence.dc.html` | todo | — |

Note: §7 lists 13 screens counting Venues + VenueDetail as one combined session (row 6 above), which is
why this table has 12 rows for 13 design-source screens — matches the "13 screens, ~11 sessions" framing
in `design-port.md` §7.
