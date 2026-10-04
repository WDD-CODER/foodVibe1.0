# Plan 332 — Recipe edit blocked by "name already in use": diagnose and fix

Status:
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Editing an existing recipe and saving it fails with "שם מתכון זה כבר קיים", even though Dandan didn't create a duplicate. The check is duplicateNameValidator_() in src/app/pages/recipe-builder/recipe-builder.page.ts:593. It already excludes the recipe's own _id, so a second record with the same nameHebrew really exists in allRecipes_() + allDishes_().

Hidden recipes are ruled out: onHideRecipe is never called. That leaves two likely sources:

(a) A master-sync clone (server/services/sync-master.js) that isn't linked by _masterId to the user's own recipe.
(b) A leftover from a recipe↔dish type change, which is delete-then-add in kitchen-state.service.ts:343.

The error doesn't say which record conflicts, so the user is stuck and the cause can't be confirmed.

## Goals & Success Criteria
Primary: the duplicate error identifies the conflicting record and lets the user open it.
Primary: the real root cause is confirmed with Dandan's data and fixed if it's in client scope.
Success: the recipe that failed today can be saved, or its twin opened and removed in one click. A unit test covers the duplicate lookup.

## Execution Mode
Parallel: yes
Concurrent plans: AI-product label registration, and the hidden-recipes removal plan (that one also touches kitchen-state.service.ts, so run it after this one, not alongside it)
Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
docs/session-state-<branch>.md, .claude/sessions/**, .worktree-*, and the append-only
hotspots (src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts
— add to them, never rewrite or remove an existing entry without escalating).

scope
src/app/pages/recipe-builder/**
src/app/core/services/kitchen-state.service.ts
src/app/core/services/kitchen-state.service.spec.ts

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for approved: <path>; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when scope-check.mjs --drift reports REALITY: drift. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories
As a chef, I want to save edits to my recipe without a false "name exists" block.
As a chef, when a name really is taken, I want to see which recipe or dish has it and open it, so I can rename or delete it.

## Functional Requirements
### Must Have (P0)
- [ ] The duplicate lookup is a pure function that returns the conflicting record (_id, nameHebrew, isDish, _masterId), or null.
- [ ] The validator error carries that record: { duplicateName: { _id, isDish, fromMaster } }. Existing truthy checks keep working (recipe-builder.page.ts:694, :1312, recipe-header.component.html:42).
- [ ] Under the name field, the existing message is followed by a link "פתח את הקיים" that navigates to /recipe-builder/<conflicting _id>.
- [ ] A console.warn('[duplicateName]', {...}) logs the full conflicting record for diagnosis.
- [ ] Root cause confirmed with Dandan (A4) before any fix to save logic.

### Should Have (P1)
- [ ] If the cause is (b), the type-change save in kitchen-state.service.ts (~L335–352) becomes add-then-delete, so a failure can't leave two records or zero records.

### Nice to Have (P2)
- [ ] The message says whether the twin is a recipe or a dish, and whether it came from master.

## UI/UX Notes
RTL: the link sits inline after .name-error-msg, using the existing link styling (no new engine class).
New dictionary keys (append only): duplicate_name_open_existing = "פתח את הקיים", duplicate_from_master = "(מהמאגר המשותף)".

## Atomic Sub-tasks
- [ ] A1: Create src/app/pages/recipe-builder/utils/find-duplicate-name.util.ts, exporting findDuplicateName(list: Recipe[], name: string, currentId: string | null): Recipe | null. Trim both sides and exclude currentId. Add a spec covering: same-id excluded, whitespace, a dish/recipe twin, and no match.
- [ ] A2: Change duplicateNameValidator_() (recipe-builder.page.ts:593) to use the util over this.state_.recipes_() (kitchen-state.service.ts:35, the same combined list). Return the detail object and add the console.warn.
- [ ] A3: In recipe-header.component.html around L42, add the "open existing" link (router link to /recipe-builder/ + id) and the optional master tag. Add both dictionary keys.
- [ ] A4: Human gate. Dandan opens the recipe that failed, tries to save, and reports the console line and what the link opens. STOP until he answers.
- [ ] A5: Act on the answer:
  - Cause (b): make the type-change path add-then-delete, with a spec.
  - Cause (a), an unlinked master clone: no client fix. Write a follow-up note in the session-state file for a server-side plan to link master clones by name in sync-master.js.
  - Genuine user duplicate: no code fix; the link is the fix.
- [ ] A6: npm run build and the targeted specs pass. Update the session-state file.

## Technical Considerations
Dependencies: RecipeBuilderPage, RecipeHeaderComponent, KitchenStateService.recipes_.
New files: src/app/pages/recipe-builder/utils/find-duplicate-name.util.ts plus its spec.
Model changes: none (Recipe._masterId already exists at recipe.model.ts:49).
Trash: deleted recipes live under TRASH_KEY and aren't in allRecipes_(). Don't add trash to the lookup.
The cross-collection check (recipe vs dish) is intentional. Keep it.

## Out of Scope
Changing server/services/sync-master.js (follow-up plan if A4 shows cause (a)).
Removing hiddenBy / hide code (separate plan).
Any server-side uniqueness index.

## Critical Questions
When the twin is found, should save be allowed anyway?
a) No, keep blocking, with the link to fix it (default)
b) Allow save with a warning

## Success Criteria
- [auto] npx ng test --watch=false --include=src/app/pages/recipe-builder/utils/find-duplicate-name.util.spec.ts → all specs pass, 0 failures.
- [auto] npx ng test --watch=false --include=src/app/pages/recipe-builder/recipe-builder.page.spec.ts → 0 failures.
- [auto] npm run build → exit code 0, no new errors.
- [human] Open the recipe that failed today and click save. Either it saves, or the error shows "פתח את הקיים" and clicking it opens the conflicting recipe or dish.
- [human] Editing any other recipe without changing its name saves normally.
