# Full Project Audit — Plans Folder vs Execution Status

## Scope

- **Plans folder**: 60 `*.plan.md` files in [plans/](plans/) (excluding `recipe-builder-page.md` and `oldCssRule.md` as non-numbered references).
- **Sources of truth**: [.claude/todo.md](.claude/todo.md) (Done / Ahead sections and Plan Index), [plans/052-plan-047-audit-report.plan.md](plans/052-plan-047-audit-report.plan.md) for Plan 047, and direct code checks where needed.

---

## Summary: What's left to execute

| Priority | Item | Plan(s) | Action |
|----------|------|--------|--------|
| **1** | Table carousel columns (mobile) | 056 | **Not started** — implement full plan (excluded per user request) |
| **2** | SCSS cssLayer Group E (shared modals, etc.) | 055 | **Deferred** — optional follow-up |
| **3** | Recipe Builder Polish (4 open items) | 047 / 052 | **Partial** — S1, S4, L3, B3 |
| **4** | Phase 2 & 3 roadmap (suppliers, quick actions, alerts, empty states, print, API, deploy) | 010 | **Planned** — execute when prioritised |

---

## 1. Plans fully executed (verified)

These are marked Done in todo and/or verified in code. No remaining work.

- **002** Recipe Header Scaling — Done (todo + code: unit before quantity, dish unit, chips).
- **003** Recipe Ingredients Table Enhancement — Done.
- **004** Recipe Workflow Enhancement — Done.
- **005** Inventory Page Enhancement — Done.
- **005-1** Inventory List Refactor — Done.
- **006** Recipe Workflow Refactor — Done.
- **006-1** Preparation Global vs Specific — Done.
- **006-2** Preparation Category Change Modal — Done.
- **007** Product Form Enhancement — Done.
- **008** Recipe Book Page — Done.
- **009** Cohesive Add Item Modal — Done.
- **010 Phase 1** — Stabilize & Complete — Done (specs, E2E, docs). Phase 2/3 are planned, not executed.
- **011** Unify Dashboard & Command Center — Done.
- **012, 012-1, 012-2** Kitchen Demo Data — Done.
- **013** Dashboard Recent Activity Refactor ([013-dashboard_recent_activity_refactor_9c01aaca.plan.md](plans/013-dashboard_recent_activity_refactor_9c01aaca.plan.md)) — **Executed** (ActivityLogService, recordActivity from KitchenStateService, dashboard-overview uses getRecentActivity). *Note: Plan Index "013" points to "Recipe Quick Actions" from roadmap; that roadmap item is still planned.*
- **014** Product Form Add/Edit Alignment — Done (in todo Done section).
- **015** Dashboard Activity Change Tags and Popover — In todo Done section.
- **016** AI Agent Usage Pre-Report — **Report only** (no implementation checklist); no code deliverables.
- **017** Recipe Book List UX Overhaul — Done.
- **018** History and Trash ([018-history-and-trash.plan.md](plans/018-history-and-trash.plan.md)) — **Executed** (VersionHistoryService, trash page, version-history-panel). *Note: Plan Index "018" is "Backend API Preparation"; that is a different roadmap item.*
- **019** Recipe Cook View Page — Done.
- **020** Cook View UX Overhaul — Done.
- **021, 023** Cook View Workflow Fix Redesign — Done.
- **022** Recipe Builder Focus and Save — Done.
- **024** Full Project QA Audit — Report; recommendations may be tracked elsewhere.
- **025** Menu Intelligence Module — Done.
- **026** Menu Builder UX Styling — Done.
- **027** Sidebar Filter UX — Done.
- **028** CSS Layer Token Hierarchy Skill Update — Done.
- **029** SCSS Global Tokens Audit Refactor — Done.
- **030** Contextual Logistics Layer — Done.
- **031** Menu Library Style UX — Done.
- **032** Custom Cooking Loader — Done.
- **033** Liquid Glass Design System — Done.
- **034** Recipe Builder UI Fixes — Done (incl. ingredient-search z-index per 053).
- **035** Header and Navigation Refactor — Done.
- **036** Dashboard Control Panel Fixed Tabs — Done.
- **037** Recipe Labels Refactor — Done.
- **038** Inverted-L List Layout — Done.
- **039** List UX Panel and Scroll — Done.
- **040, 041, 042** Menu Intelligence (Layout, UX, Metadata) — Done.
- **043** Reusable Dropdown Scroll Arrows — Done.
- **044** Custom Dropdown for All Selects — Done.
- **045** Logistics Tools and Menu Type Edit — Done.
- **046, 046-1** Cook-view Scale By Ingredient + UX Fixes — Done.
- **048, 049** Menu Intelligence UX Polish / Layout UX Fixes — Done.
- **050** Recipe List Labels, Panel, Header, Menu UX — Done.
- **051** Recipe Builder UX Fixes — Done.
- **052** Plan 047 Audit Report — Done (todo updated, quick wins, B3/B4 criteria).
- **053** Todo Audit and Fixes — Done (ingredient-search z-index, todo/Plan Index updates).
- **054** Unify Modal Styles — Done.

---

## 2. Plan 056 — Table carousel columns — NOT EXECUTED (excluded per request)

**Status**: No implementation in codebase. User requested to exclude from this execution.

**Remaining work** (from [plans/056-table-carousel-columns.plan.md](plans/056-table-carousel-columns.plan.md)): Create CellCarouselComponent, wrap columns in recipe-book-list and inventory-product-list, adjust grids at 768px. Execute when prioritised.

---

## 3. Plan 055 — SCSS cssLayer audit fix — PARTIAL (Group E)

**Remaining** — [plans/055-scss-csslayer-audit-fix.plan.md](plans/055-scss-csslayer-audit-fix.plan.md) Group E:

- Apply Five-Group rhythm and root indentation fixes to: **confirm-modal**, **translation-key-modal**, **restore-choice-modal**, **label-creation-modal**, **global-specific-modal**, **unit-creator**, **version-history-panel**, **custom-select**, **loader**.

---

## 4. Plan 047 — Recipe Builder Polish — PARTIAL (4 items open)

**Still open** (from todo and [plans/052-plan-047-audit-report.plan.md](plans/052-plan-047-audit-report.plan.md)):

| Id | Description | How to complete |
|----|-------------|------------------|
| **S1** | Ingredient row style (border, arrows, delete, add-btn match workflow) | Unify recipe-ingredients-table row styling with recipe-workflow (same tokens, borders, button classes where possible). |
| **S4** | Workflow prep rows match ingredient rows | Refactor workflow prep (dish) grid/rows to reuse same row style as ingredients (borders, spacing, action buttons). |
| **L3** | Responsive tablet/mobile | Define one tablet/mobile spec and align recipe-builder page, ingredients table, workflow, and logistics to it. |
| **B3** | Volume conversion fix | N/A until a concrete bug/spec exists (per 052). |

---

## 5. Plan 010 — Product roadmap Phase 2 & 3 — PLANNED

Execute when prioritised: Supplier Management Page, Recipe Quick Actions, Low Stock Alerts, Empty States, Print View, Backend API Preparation, Deployment.

---

## 6. Plan Index vs plan files (discrepancies)

- **013**: Index "013 | Recipe Quick Actions" = roadmap item. File `013-dashboard_recent_activity_refactor_9c01aaca.plan.md` = dashboard activity log refactor (**done**).
- **016**: Index "016 | Print-Friendly Recipe View". File `016-ai-agent-usage-pre-report.plan.md` = AI agent pre-report (report only).
- **018**: Index "018 | Backend API Preparation". File `018-history-and-trash.plan.md` = version history + trash (**done**).

---

## 7. Execution order (for this run: exclude 056)

1. Plan 055 Group E — Five-Group rhythm on shared modals and components.
2. Plan 047 S1, S4, L3 — Recipe Builder polish (S1, S4, L3).
3. Later: Plan 056 (table carousel) and Phase 2/3 roadmap as prioritised.

---

## 8. Quick reference: plans with remaining work

| Plan | Title | Remaining |
|------|--------|-----------|
| **056** | Table carousel columns | Full implementation (excluded from this run) |
| **055** | SCSS cssLayer audit | Group E (shared modals, unit-creator, version-history-panel, custom-select, loader) |
| **047** | Recipe Builder Polish | S1, S4, L3, B3 (B3 needs spec first) |
| **010** | Product roadmap | Phase 2 & 3 |

All other plans in `plans/` are either fully executed or are reports/roadmaps with no remaining implementation checklist.
