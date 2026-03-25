# Truly Open Tasks — Verified Incomplete Work

**Date**: 2026-03-25
**Total items**: 42 coding + infrastructure tasks
**Filtered from**: 132 marked-open in todo.md

---

## 🔴 QUICK FIXES (~30min each)

### Plan 182 — toFix Verification (UI/UX Polish)
- [ ] **182.1** Remove chevron up/down in recipe-builder section titles (lines 130, 157, 176 in `recipe-builder.page.html`)
- [ ] **182.2** Recipe-builder: make containers collapsible by clicking anywhere on card (not just header)
- [ ] **182.3** Logistics chips grid: chip width = fit-content so full label visible
- [ ] **182.4** Activity change-tag: show clear "what changed" (values, from → to display)
- [ ] **182.5** Add new category modal: two-case focus flow (Hebrew → English, or prefill Hebrew + focus English)

### Plan 163 — toFix Audit PRD (Remaining Items)
- [ ] **163.2.2** Recipe builder: remove up/down arrows in category title
- [ ] **163.2.3** App-wide: audit category/unit dropdowns for "add new" where applicable
- [ ] **163.2.4** Labels: selectability in delete-label + recipe builder manual selector
- [ ] **163.2.5** Menu-library: keyboard nav (Arrow Up/Down, Enter) on custom-select options
- [ ] **163.2.7** Lists: sidebar aligned to list container at 768px (list-shell)

### Plan 167 — Category/Unit Add-New Audit
- [ ] **167.optional** Cook-view "add new unit" so user can add units from cook-view (optional enhancement)

---

## 🟡 MEDIUM TASKS (1-3 hours each)

### Plan 191 — Dashboard QA (Data-testid + Specs)
- [ ] **191.pre** Add `data-testid` to `dashboard.page.html`, `dashboard-header.component.html`
- [ ] **191.1** Add `data-testid` + migrate `*ngIf`/`*ngFor` → `@if`/`@for` in `dashboard-overview.component.html`
- [ ] **191.2** Fix `dashboard.page.spec.ts` (V1 HttpClientTestingModule, V2 unknown casts) + add 11 new tests
- [ ] **191.3** Fix `dashboard-header.component.spec.ts` (V2–V4 violations) + add 7 new tests
- [ ] **191.4** Create `dashboard-overview.component.spec.ts` with 20 tests

### Plan 174 — Custom Select Chip Variant (Cook-view)
- [ ] **174.1** Cook-view ingredients index: add `variant="chip"` and `typeToFilter` to unit selects (consistency with recipe builder)
- [ ] **174.2** Verify in app: recipe builder and cook-view ingredients unit dropdowns work together

### Plan 169 — List Quick-Edit UX Overlay
- [ ] **169.1** Verify first-click open, carousel dropdown visible, row-blur confirm only (visual/functional test)

---

## 🟠 LARGE REFACTORS (3+ hours each)

### Plan 190 — Master De-Spaghettification (UI Component Extraction)

#### Phase A (Despaghetti — Low Risk)
- [ ] **190.A1** Replace hardcoded Hebrew strings with `translatePipe` keys + dictionary entries (SW-4)
- [ ] **190.A2** Replace orphan button classes with design-system `c-*` tokens in product/metadata flows (HI-1)

#### Phase H (Component Extraction — Medium Risk)
- [ ] **190.HI-6** Consolidate scroll-zone scaffold into shared `app-scroll-zone` component
- [ ] **190.SW-5** Decompose god files: `menu-intelligence`, `recipe-builder`, `product-form` into services + sub-components

#### Phase C (Consolidation — High Risk)
- [ ] **190.C1** Consolidate list-page signal clusters into shared list state base/composable (HI-4)
- [ ] **190.C2** Consolidate scroll-indicator scaffold into shared scroll-zone infrastructure (HI-6)
- [ ] **190.C3** Decompose god files into page services/sub-components (`menu-intelligence`, `recipe-builder`, `product-form`) (SW-5)

---

## 🔵 INFRASTRUCTURE (Agent/Workflow Tooling)

### Plan 198 — Lite Agent Refactor (High Priority)
- [ ] **198.CRIT** Verify Legacy security-officer requirements + 30-item checklist fully migrated to copilot-instructions §5 before retiring
- [ ] **198.HIGH-1** Fix `.claude/toBe/agents/breadcrumb-navigator.md` (Navigator vs Architect mismatch)
- [ ] **198.HIGH-2** Lite QA agent — add prominent spec-authoring callout (no `.spec.ts` during iterative execution)
- [ ] **198.MED-1** One Master-section pointer line per Lite agent (delegation cross-references)
- [ ] **198.ADOPT** Promote `.claude/toBe/` to canonical paths + run `/validate-agent-refs`

### Plan 197 — AI Framework Redundancy Fix
- [ ] **197.1** Add subagent gate exemption to `CLAUDE.md`
- [ ] **197.2** Add main-session-only scope note to `agent.md` preflight
- [ ] **197.3** Remove duplicate §0.3 agent table from `copilot-instructions.md`
- [ ] **197.4** Tighten "Apply all project standards" → targeted section refs in 6 agent files
- [ ] **197.5** Add "Context Scope: gate-exempt" header to `ui-inspector.md`

### Plan 196 — Commit Flow Speed Audit (Implementation)
- [ ] **196.1** Add approved-tree drift check before git write + auto-replan logic
- [ ] **196.2** Rebase/sync branch before commit plan generation when behind origin/main
- [ ] **196.3** Create conflict-resolution policy for known files (auto/manual boundaries)
- [ ] **196.4** Split PR merge + remote branch deletion into explicit verified steps
- [ ] **196.5** Record per-phase timing metrics for each commit workflow run

### Plan 192 — Pillar 3 Reactive Loop Hardening (.mdc files)
- [ ] **192.A13** Modify `.cursor/rules/session-start.mdc` with first-message guard + state decision tree + "wrap up" tip
- [ ] **192.A14** Modify `.cursor/rules/session-end.mdc` with expanded trigger phrases + sweep-first prompt
- [ ] **192.A15** Harden Phase 4 Step 6 in `.claude/skills/commit-to-github/SKILL.md` with archive safety gates
- [ ] **192.A17** Modify `.claude/commands/sweep-stale-todos.md` with deferred filter + precise git verification + 7-day age threshold

---

## Summary by Type

| Type | Count | Effort |
|------|-------|--------|
| **Quick Fixes (UI Polish)** | 10 | 5-6 hours |
| **Medium (Tests + Variants)** | 7 | 7-10 hours |
| **Large Refactors** | 7 | 20-30 hours |
| **Infrastructure** | 18 | 15-20 hours |
| **TOTAL** | **42** | **47-66 hours** |

---

## Next Steps

1. **Start with Quick Fixes** (182, 163 items) — highest ROI, unblock UI polish
2. **Medium tasks** (191, 174) — test coverage + cook-view feature parity
3. **Infrastructure** (197, 198) — foundation for future sprints
4. **Large refactors** (190) — tackle after foundation stabilized
