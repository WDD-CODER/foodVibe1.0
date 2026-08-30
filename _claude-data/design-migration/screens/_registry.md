# Design Port Registry

Tracks the 13-screen port from `.interface-design/source/` onto the Angular app, per
`.claude/commands/design-port.md`. One screen per session. Status values: `todo`, `spec-pending-approval`
(spec written, awaiting Human validation word before code), `in-progress` (spec approved, code underway),
`done` (verified per §6 Step 5, registry updated), `no-design` (no counterpart in the design source — skipped).

| # | Screen | Angular path | Design source file | Status | Spec |
|---|---|---|---|---|---|
| 1 | Dashboard | `src/app/pages/dashboard/` | `Dashboard.dc.html` | done | `01-dashboard.port-spec.md` |
| 2 | Inventory | `src/app/pages/inventory/` | `Inventory.dc.html` | done | `02-inventory.port-spec.md` |
| 3 | Recipe Book | `src/app/pages/recipe-book/` | `RecipeBook.dc.html` | done | `03-recipe-book.port-spec.md` |
| 4 | Suppliers | `src/app/pages/suppliers/` | `Suppliers.dc.html` | done | `04-suppliers.port-spec.md` |
| 5 | Equipment | `src/app/pages/equipment/` | `Equipment.dc.html` | done | `05-equipment.port-spec.md` |
| 6 | Venues (+ VenueDetail) | `src/app/pages/venues/` (incl. `components/venue-detail/`) | `Venues.dc.html` + `VenueDetail.dc.html` | todo | — |
| 7 | Menu Library | `src/app/pages/menu-library/` | `MenuLibrary.dc.html` | todo | — |
| 8 | Metadata Manager | `src/app/pages/metadata-manager/` | `MetadataManager.dc.html` | todo | — |

> **Concurrent-session note (added 2026-08-26, resolved 2026-08-30):** Suppliers (row 4) and
> Equipment (row 5) were worked in parallel by two separate sessions, each in its own dedicated git
> worktree (`../foodVibe1.0-wt-design-port-suppliers` on `feat/design-port-suppliers`,
> `../foodVibe1.0-wt-design-port-equipment` on `feat/design-port-equipment`). Both shipped as
> expected: the anticipated merge conflict landed on this registry file and (harmlessly, duplicate
> values only) on `.inline-edit-panel`/`.as-modal` tokens in `src/styles.scss` — resolved during
> Equipment's rebase onto `main` post-Suppliers-merge, no functional impact either way.

> **Metadata Manager note:** the mobile/tablet (≤1023px, hidden on desktop) 8-tab jump-nav
> (`.mm-jump-nav-row`/`.mm-jump-nav` — units, product categories, allergens, recipe labels, menu
> types, preparation categories, section categories, user management) was pre-built ahead of this
> row's session (scoped addition, no colors/spacing/card styling touched). Tapping a tab brings
> that section to the front via a real CSS `order` change (page never scrolls) — each section
> carries a stable `#mm-sec-*` id used only for this order-matching, not for scroll targeting.
> Tablet-only (768–1023px) prev/next arrows scroll the tab row itself and hide once there's
> nothing further that way. The future full `/design-port` session for this screen should treat
> this nav + reorder behavior as already done and exclude it from its own spec.
| 9 | Trash | `src/app/pages/trash/` | `Trash.dc.html` | todo | — |
| 10 | Recipe Builder | `src/app/pages/recipe-builder/` | `RecipeBuilder.dc.html` | todo | — |
| 11 | Cook View | `src/app/pages/cook-view/` | `CookView.dc.html` | todo | — |
| 12 | Menu Intelligence | `src/app/pages/menu-intelligence/` | `MenuIntelligence.dc.html` | todo | — |

Note: §7 lists 13 screens counting Venues + VenueDetail as one combined session (row 6 above), which is
why this table has 12 rows for 13 design-source screens — matches the "13 screens, ~11 sessions" framing
in `design-port.md` §7.
