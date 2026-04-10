## Goal
Perform a comprehensive mobile layout audit (375×812 viewport) across all FoodVibe pages and interactive states, producing a structured defect report ready for fix briefs.

## Scope
- All routes in `src/app/app.routes.ts`
- All page components in `src/app/pages/`
- All shared interactive components in `src/app/shared/`
- Engine classes in `src/styles.scss`
- UI state services in `src/app/core/services/`
- Output artifacts: ROUTE_INVENTORY.md, INTERACTIVE_CATALOG.md, audit/ screenshots, MOBILE_AUDIT_REPORT.md

## Out of Scope
- No code fixes — audit only, fixes come in separate briefs
- No test suite execution
- No architecture changes

## Execution Methodology

### Phase 1: Codebase Investigation (before any browsing)

**Step 1.1 — Route Inventory**
Read `src/app/app.routes.ts` and extract every route path, auth guards, child routes. Create ROUTE_INVENTORY.md with columns: path | requires_auth | has_children | page_component.

**Step 1.2 — Interactive Element Catalog**
For each page in `src/app/pages/*/`: read `.component.html` and log every element that can change layout:
- `(click)` handlers that toggle visibility or open containers
- `*ngIf` / `@if` conditions tied to user interaction
- `[class.*]` bindings that add/remove layout classes
- `<dialog>`, modal patterns, slide-panels
- `<details>`, accordions, expandable sections
- Dropdowns, select menus, autocomplete
- Form validation states that show/hide error messages
- Floating action buttons, bottom sheets
- Any `.c-*` class suggesting layout behavior (`.c-modal`, `.c-panel`, `.c-drawer`, etc.)

Create INTERACTIVE_CATALOG.md with columns: page | element_selector | trigger_action | expected_behavior.

**Step 1.3 — Shared Component Audit**
Scan `src/app/shared/` for reusable interactive components. Note which pages use each. Append to INTERACTIVE_CATALOG.md.

### Phase 2: Mobile Audit Execution (via /browse)

**Step 2.1 — Browser Setup**
Use `/browse` to:
- Launch local dev server at `http://localhost:4200` (start with `npm start` if not running)
- Set viewport to 375×812 (iPhone SE/standard mobile)
- Confirm RTL direction is active

**Step 2.2 — Systematic Page Crawl**
For each route in ROUTE_INVENTORY.md:

**A. Baseline Screenshot**
- Navigate to the route
- Wait for content to stabilize (no spinners)
- Screenshot: `audit/[page-name]-baseline.png`
- Check immediately for:
  - Horizontal scrollbar present (overflow-x issue)
  - Any content visibly cut off or bleeding
  - Text overlapping other text
  - Buttons/inputs extending beyond viewport

**B. Interactive State Testing**
For each interactive element on this page (from INTERACTIVE_CATALOG.md):
- Trigger the action (click, tap, focus)
- Wait 500ms for animation/transition
- Screenshot: `audit/[page-name]-[element]-triggered.png`
- Check for:
  - Modal/panel fits within viewport (no horizontal overflow)
  - Close button is reachable (not off-screen)
  - Touch targets are ≥44px
  - Content inside expanded container is readable
  - No z-index stacking issues (content hidden behind other elements)
- Dismiss/close the element
- Verify page returns to baseline state

**C. Scroll State Testing**
- Scroll to bottom of page
- Screenshot: `audit/[page-name]-scrolled.png`
- Check for:
  - Fixed/sticky elements still visible and not overlapping content
  - Bottom navigation (if exists) not covering content
  - Scroll position doesn't break layout

**Step 2.3 — Auth-Required Pages**
- Complete all public pages first
- Log in as test user (check environment for credentials, or use guest login)
- Repeat Step 2.2 for auth-required pages
- If no test credentials exist, document which pages couldn't be audited and why

**Step 2.4 — Edge Cases**
Test on relevant pages:
- Empty state (no data) — does layout hold?
- Long text content — wrap or overflow?
- Error states — do messages fit mobile?
- Loading states — do skeletons/spinners fit?

### Phase 3: Report Generation

Create MOBILE_AUDIT_REPORT.md with:
- Summary: pages audited, elements tested, issue counts by severity
- Critical issues (blocks functionality or makes content inaccessible)
- Major issues (usable but significantly degraded experience)
- Minor issues (cosmetic, doesn't affect usability)
- Pages with no issues
- Full interactive elements checklist with pass/fail

Each defect entry includes: page name, element, problem description with specific selector/file reference, screenshot path, suggested fix guidance.

## Rules
- Do not fix anything — audit only
- Screenshot everything, even passing states
- Be specific: "header overflows 20px right" not "header looks weird"
- Use /browse not Playwright MCP
- If dev server isn't running, start it first

## Success Criteria
- [ ] ROUTE_INVENTORY.md exists with all routes documented
- [ ] INTERACTIVE_CATALOG.md exists with all interactive elements cataloged
- [ ] audit/ folder contains screenshots for every page × every interactive state
- [ ] MOBILE_AUDIT_REPORT.md exists with all issues classified by severity
- [ ] Report includes specific selector/file references so fix briefs can target exact locations

## Session ID
2026-04-09-mobile-layout-audit
