# Retrospective: Unified Context-Aware AI Modal (Plan 245)
**Date**: 2026-04-03
**Agent(s)**: Software Architect (plan), Execute-It (implementation), Git Agent (commit/merge)
**Verdict**: SUCCESS (with two mid-session bug corrections)

---

## Summary

The session replaced the separate `import-text-btn` (scan-text → Gemini parse flow) with a unified, context-aware AI button: inside the recipe builder it opens in "edit" mode (sparse patch), outside it opens in "create" mode (unchanged). The implementation was completed, both bugs were identified and fixed during the session, build passed, PR #66 was merged to main.

---

## Session Stats
- Files modified: 26 changed (596 insertions, 495 deletions)
- Files deleted: 5 (recipe-text-import-modal ×3, recipe-parser.service, recipe-text-import-modal.service)
- Tool calls: ~60+
- Build failures: 0 (build passed on first run after each change set)
- Rollbacks needed: 0
- Bug corrections mid-session: 2

---

## What Went Well

- **Architecture clarity**: The sparse-patch pattern (only changed fields returned from Gemini) was correctly identified upfront — prevented form overwrite bugs before they happened.
- **Context-aware service design**: Extending `AiRecipeModalService` with a `mode` signal and `onPatch` callback was clean and avoided component coupling.
- **Dead code removal was thorough**: All three import-modal files, the parser service, the `ScanText` lucide icon, the `RecipeTextImportModalComponent` in `app.component`, and all dead dictionary keys were removed in one pass.
- **Retry logic was correctly placed**: `withRetry<T>()` wraps only the HTTP calls, not the entire service methods — correct placement.
- **Build gate was run after every change set** — no surprise failures at the end.
- **Git agent plan was shown to user before executing** — memory rule followed.
- **`findIngredientMatch_` normalization** (`trim().toLowerCase()`) was identified proactively before it caused a bug.

---

## What Went Wrong

### 1. Template gate bug not caught before execute

**Issue**: The `recipe-ingredients-table.component.html` had `@if (group.get('referenceId')?.value)` gates around `col-unit` and `col-quantity`. This was a pre-existing issue, but the plan did not flag it as a risk.
**Impact**: User saw "n/a" / "---" for AI-populated ingredients. Required a second fix pass.
**Root cause**: Plan verification (`plan-implementation`) did not scan the ingredient table template for conditional rendering gates. The template was never read during planning — only the component `.ts` was analyzed.

### 2. "Unresolved ingredient" UX not scoped in original brief

**Issue**: After fixing the template gate, AI-added ingredients with no kitchen match were still showing the search box (because `!referenceId` → show search). The user had to describe the desired behavior (red triangle, like incomplete products) before this was addressed.
**Impact**: One additional iteration after initial fix was deployed.
**Root cause**: The original brief described "add ingredients from AI" but didn't define the UX for the case where a name has no matching product. The agent didn't proactively scope this edge case in the plan.

### 3. `isProductIncomplete` → `isIncompleteRow` rename in same session

**Issue**: The method was renamed mid-session to cover the new "unresolved" case. This is technically correct but could have been the right name from the start if the edge case was anticipated in planning.
**Impact**: Minor — no breakage, but required a template re-read.

---

## Root Cause Analysis

| Issue | Root Cause | Impact |
|-------|------------|--------|
| Template gate not caught | `plan-implementation` never read the ingredient table `.html` file — only `.ts` | Two-pass fix, user frustration |
| Unresolved ingredient UX undefined | Brief didn't scope "name with no match" edge case | Extra iteration after first deploy |
| Method rename mid-session | Incomplete domain modeling during planning | Minor, no breakage |

---

## Suggested File Changes

### 1. `.claude/commands/plan-implementation.md`

**Problem**: The plan-implementation scan misses template files when analyzing component behavior. Only `.ts` files were checked for the ingredient table, so the `@if (referenceId)` gate in the `.html` was invisible during planning.

**Suggested addition** to the "scan checklist" or "what to read" section:
```
- For any component that renders conditional rows or items: read BOTH the .ts AND .html
- Flag any `@if` gates on form control values (referenceId, item_type, etc.) that could
  suppress AI-populated data from rendering
```

### 2. `.claude/copilot-instructions.md` or `standards-angular.md`

**Problem**: No documented standard for "unresolved AI ingredient" UX — the pattern of showing a name-only row with a red triangle is a domain pattern that should be documented so future AI features handle it consistently.

**Suggested addition**:
```markdown
### AI-Populated Ingredient Rows (Unresolved)
When an AI feature adds an ingredient row by name only (no referenceId match found):
- Set `name_hebrew` on the FormGroup; leave `referenceId` null
- Use `isIncompleteRow()` (not `isProductIncomplete()`) to detect and show the warning badge
- Show the ingredient in the display row (not the search input) — user clicks triangle to resolve
- This follows the same visual pattern as products with buy_price_global_ === 0
```

### 3. `.claude/agents/git-agent.md` (minor)

**Problem**: Git agent correctly showed plan before executing, but the output format listed `dist/` files — these are compiled output files that arguably shouldn't be committed to source control. The agent committed them because they were previously tracked.

**Suggested note**:
```
When dist/ files are tracked and modified, flag them to user in the plan summary
with a note: "dist/ files are tracked — confirm these should be included or add to .gitignore"
```

---

## Action Items

- [ ] Add template `.html` scan requirement to `plan-implementation.md` — always read both `.ts` and `.html` for any component under analysis
- [ ] Document "unresolved AI ingredient" pattern in `standards-domain.md` or `copilot-instructions.md`
- [ ] Consider adding `dist/` to `.gitignore` and removing it from tracking (separate task)
- [ ] Add "unresolved ingredient" handling note to `add-recipe.md` skill if it handles AI-prefill paths
