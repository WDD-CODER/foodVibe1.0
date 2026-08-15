---
name: Tech Debt Execution — April 7 Audit
overview: |
  Executive brief + three-tier execution plan derived from the 2026-04-07 tech debt audit.
  Tier 1: activate two dormant quick-fix plans (214, 215) — zero design work needed.
  Tier 2: extract RecipeAiCoordinator from recipe-builder.page.ts (+291 LOC regression from PR #88).
  Tier 3: flag four CRITICAL large-file refactors as next-cycle work.
todos: []
isProject: false
---

# Executive Brief — Team Leader

## Situation
The 2026-04-07 audit (`.claude/techdebt-reports/techdebt-2026-04-07.md`) revealed:

| Signal | Value | Direction |
|--------|-------|-----------|
| Dead code blocks | 0 | ↓ all 3 cleared ✅ |
| Unused imports | 0 | → stable |
| TODOs | 1 | ↑ (minor, nice-to-have) |
| `as any` casts (prod) | 7 | → stable |
| Refactor candidates (>300 LOC) | 19 | ↑ +1 from 18 |
| Security flags | 0 | → stable |

**Regression flag:** `recipe-builder.page.ts` grew 1006 → 1297 LOC (+291) because the AI recipe modal bridge (PR #88) was wired directly into the page. This reverses the previous extraction cycle.

**All security surfaces are clean. No blocking issues for shipping.**

## Recommended Execution Order

| Priority | Item | Effort | Plan |
|----------|------|--------|------|
| P1 — Quick win | Fix `as any` URL param casts (5 components, 10 casts) | ~30 min | Plan 215 |
| P1 — Quick win | Extract `sanitizeKey` util (3 files, 4 sites) | ~20 min | Plan 214 |
| P2 — Regression fix | Extract `RecipeAiCoordinator` from `recipe-builder.page.ts` | ~2–3 hrs | **Plan 260 (this doc)** |
| P3 — Next cycle | CRITICAL large-file refactors (4 files) | multi-session | See §Tier 3 below |

---

# Tier 1 — Activate Dormant Plans (No new design needed)

Both plans below are fully specified and ready to execute. Pass directly to the agent.

## Plan 214: Extract `sanitizeKey` util
**File:** `plans/214-R-sanitize-key-util-extraction.plan.md`

**What:** Extract the duplicated `trim().toLowerCase().replace(/\s+/g, '_')` pattern
into `core/utils/sanitize-key.util.ts`. Replace 4 inline sites across 3 files.

**Agent brief:**
> Read `plans/214-R-sanitize-key-util-extraction.plan.md` and execute all atomic sub-tasks.
> No design decisions needed — the plan is complete.
> Done when: `sanitize-key.util.ts` exists, all inline expressions replaced, `ng build` clean.

---

## Plan 215: Fix `as any` URL param casts
**File:** `plans/215-R-list-state-param-descriptor-any.plan.md`

**What:** Widen `writeSession` / `useListState` parameter types in `list-state.util.ts`
from `ParamDescriptor[]` to `ParamDescriptor<any>[]`. Removes 10 `as any` casts across
5 list components.

**Affected files:**
- `core/utils/list-state.util.ts` — 2 type changes
- `equipment-list.component.ts` — 3 casts removed
- `inventory-product-list.component.ts` — 2 casts removed
- `recipe-book-list.component.ts` — 2 casts removed
- `menu-library-list.component.ts` — 2 casts removed
- `venues-list.component.ts` — 1 cast removed

**Agent brief:**
> Read `plans/215-R-list-state-param-descriptor-any.plan.md` and execute all atomic sub-tasks.
> No design decisions needed — the plan is complete.
> Done when: all 10 `as any` casts gone, `ng build` produces zero type errors.

---

# Tier 2 — Regression Fix: RecipeAiCoordinator Extraction

## Context
PR #88 added the Gemini AI recipe feature by wiring the modal bridge directly into
`recipe-builder.page.ts`. That file went 1006 → 1297 LOC, undoing the prior extraction cycle.

The three new services (`GeminiService`, `GeminiShotsService`, `AiRecipeDraftService`)
are well-structured and clean — the problem is the **coordination logic** living in the page.

## Goal
Extract all AI recipe coordination into a dedicated `RecipeAiCoordinator` smart component,
reducing `recipe-builder.page.ts` back below ~900 LOC.

## What belongs in RecipeAiCoordinator
- Signal state: `aiDraft_`, `aiWarnings_`, `aiSource_`, `showAiModal_` (or equivalent)
- Methods: `openAiModal()`, `onAiDraftApproved()`, `onAiDraftRejected()`, shot-save calls
- Injection: `GeminiService`, `GeminiShotsService`, `AiRecipeDraftService`
- Template: the `<app-ai-recipe-modal>` binding + any surrounding trigger button if co-located

## What stays in recipe-builder.page.ts
- Recipe form orchestration (`RecipeFormService`)
- Save/load/delete recipe flows
- Route navigation and resolver integration
- `recipe-builder.page.ts` receives the approved draft via `@Output` / output() from coordinator

## Atomic Sub-tasks

- [ ] **Task 1:** Read `recipe-builder.page.ts` — identify all AI-related signals, methods, and template bindings (≥lines 1–100 for imports, search for `ai`, `gemini`, `draft`, `shot` tokens)
- [ ] **Task 2:** Create `src/app/pages/recipe-builder/components/recipe-ai-coordinator/recipe-ai-coordinator.component.ts` — move all AI signals and methods; inject `GeminiService`, `GeminiShotsService`, `AiRecipeDraftService`; expose `draftApproved = output<AiRecipeDraft>()`
- [ ] **Task 3:** Create `recipe-ai-coordinator.component.html` — move `<app-ai-recipe-modal>` binding and trigger button markup from recipe-builder template
- [ ] **Task 4:** Create `recipe-ai-coordinator.component.scss` — stub file; move any AI-specific styles
- [ ] **Task 5:** `recipe-builder.page.ts` — remove extracted AI signals/methods; inject `RecipeAiCoordinatorComponent`; wire `(draftApproved)` output to `onAiDraftApproved()` handler
- [ ] **Task 6:** `recipe-builder.page.html` — replace inline AI markup with `<app-recipe-ai-coordinator (draftApproved)="onAiDraftApproved($event)" />`
- [ ] **Task 7:** `ng build` — confirm zero errors; verify `recipe-builder.page.ts` LOC ≤ 950

## Rules
- Use `output()` / `input()` signal-based API — no `@Output()` / `@Input()` decorators
- `RecipeAiCoordinatorComponent` is standalone; import it directly in `recipe-builder.page.ts`
- Do not change `GeminiService`, `GeminiShotsService`, or `AiRecipeDraftService` internals
- Read `.claude/skills/angularComponentStructure/SKILL.md` before creating the new component

## Done When
- `RecipeAiCoordinatorComponent` exists and handles all AI draft flow
- `recipe-builder.page.ts` is ≤ 950 LOC
- `ng build` clean
- AI recipe modal feature works end-to-end (open modal → generate → approve/reject → recipe form populated)

---

# Tier 3 — Next-Cycle Refactor Watch List (do not execute this session)

These are tracked here for visibility only. Each needs its own plan before execution.

| File | LOC | Priority | Proposed Plan |
|------|-----|----------|---------------|
| `pages/menu-intelligence/menu-intelligence.page.ts` | 1272 | CRITICAL | New plan: extract section panels as child components |
| `pages/cook-view/cook-view.page.ts` | 935 | CRITICAL | New plan: extract step-view, timer, scaling sub-components |
| `pages/inventory/components/product-form/product-form.component.ts` | 838 | CRITICAL | New plan: extract category, supplier, allergen sub-forms |
| `core/services/menu-export.service.ts` | 837 | HIGH | New plan: split by export type (PDF, checklist, shopping) |

> Open these as separate plan briefs once Tier 2 is complete and a session slot is available.
