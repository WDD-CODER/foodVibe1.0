---
name: Mobile Layout Audit — 375×812 Viewport
overview: Comprehensive mobile layout audit across all FoodVibe pages and interactive states, producing a structured defect report ready for fix briefs.
todos: []
isProject: false
---

# Mobile Layout Audit — 375×812 Viewport

## Goal
Perform a comprehensive mobile layout audit (375×812 viewport) across all FoodVibe pages and interactive states, producing a structured defect report ready for fix briefs.

# Atomic Sub-tasks

## Phase 1: Codebase Investigation

- [ ] 1.1 Create ROUTE_INVENTORY.md from app.routes.ts — all paths, auth guards, children, page components
- [ ] 1.2 Read all page .component.html files — catalog interactive elements (click handlers, ngIf, class bindings, modals, dropdowns, accordions)
- [ ] 1.3 Read shared/*.component.html files — catalog reusable interactive components
- [ ] 1.4 Write INTERACTIVE_CATALOG.md — page | element_selector | trigger_action | expected_behavior

## Phase 2: Mobile Audit via /browse

- [ ] 2.1 Launch /browse at localhost:4200, set viewport 375×812, confirm RTL
- [ ] 2.2 For each public route: navigate, baseline screenshot, scroll screenshot
- [ ] 2.3 For each public route: trigger each interactive element, screenshot triggered state, dismiss, verify return
- [ ] 2.4 Auth pages: log in, repeat steps 2.2–2.3 for auth-required routes
- [ ] 2.5 Edge cases: empty state, long text, error state, loading state on relevant pages

## Phase 3: Report Generation

- [ ] 3.1 Create MOBILE_AUDIT_REPORT.md with summary, critical/major/minor issues, clean pages list, full pass/fail checklist

## Constraints
- Do not fix anything — audit only
- Screenshot everything, even passing states
- Be specific: "header overflows 20px right" not "header looks weird"
- Use /browse not Playwright MCP

## Done when
- ROUTE_INVENTORY.md exists with all routes documented
- INTERACTIVE_CATALOG.md exists with all interactive elements cataloged
- audit/ folder contains screenshots for every page × every interactive state
- MOBILE_AUDIT_REPORT.md exists with all issues classified by severity
- Report includes specific selector/file references so fix briefs can target exact locations
