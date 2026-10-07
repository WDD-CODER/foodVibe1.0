# Plan 365 — Admin scope prompt ("רק לי / לכולם"): wording that fits each action, item type and count

Status: draft
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Admins get a three-button prompt ("cancel / only me / everyone") from `MasterPushService.askScope()` and `askDeleteScope()` (`src/app/core/services/master-push.service.ts` L50, L82). Metadata uses its own `resolvePushScope()` (`metadata-manager.page.component.ts` ~L513). All three call `ConfirmModalService.openTernary`. The texts are fixed (`push_to_master_*`, `delete_from_master_*`, `push_registry_master_message`; dictionary ~L334-344) and wrong in several situations:

| Situation | Call site | What's wrong |
| --- | --- | --- |
| Delete metadata | `metadata-manager…ts` ~L337, ~L401 | shows "שמור רק לי / עדכן לכולם" while deleting |
| Add metadata | ~L196, ~L271 | "שמירת השינוי" for an add |
| Save or delete a product | `product-form…ts` ~L931, `inventory-product-list…ts` ~L555, ~L598 | calls it "מתכון-אב" |
| New recipe or product (`forcePrompt`) | `recipe-builder.page.ts` ~L726, ~L1145, product-form ~L931 | "based on a master recipe / the change" isn't true yet; it's a publish |
| Bulk edit or delete | `recipe-book-list…ts` ~L869, ~L897; inventory ~L598 | says "פריט זה" for N items |
| Delete a product for everyone | inventory ~L555, ~L598 | also runs `purgeProductIngredientEverywhere` (removes it from all users' recipes) with no warning |
| Delete a recipe | `recipe-book-list…ts` ~L815, ~L845 | a hard-coded `'האם אתה בטוח שברצונך למחוק?'` confirm, then the scope modal: two dialogs in a row |

## Goals & Success Criteria

- Primary: one scope API that picks header, message and button texts from `{ action: 'save'|'create'|'delete', entity: 'recipe'|'dish'|'product'|'metadata'|'supplier', count?: number }`.
- Primary: every call site passes the right context; deleting a product "for everyone" warns about removal from all recipes.
- Success: no prompt says "save" during a delete, "מתכון-אב" for a non-recipe, or "פריט זה" for multiple items. Admin deletes show one dialog, not two.

## Execution Mode

- Parallel: no. Run after plans 332 (recipe-builder), 340 (metadata-manager) and 348 (recipe-builder).
- Concurrent plans: none touching the call-site files
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/master-push.service.ts
src/app/core/services/master-push.service.spec.ts
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/inventory/components/product-form/product-form.component.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/cook-view/cook-view.page.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As an admin, I want the "only me / everyone" prompt to describe exactly what I'm doing to what, so I never publish or delete for everyone by mistake.

## Functional Requirements

### Must Have (P0)
- [ ] `MasterPushService`:
  - `askScope(item, opts: { entity, isNew?: boolean, count?: number })` and `askDeleteScope(item, opts: { entity, count?: number })`.
  - A private `buildTexts(action, entity, count)` returns `{ headerKey, message, meLabelKey, everyoneLabelKey }`.
  - Keep the existing admin-only and `_masterId` / `forcePrompt` gating exactly as it is today.
- [ ] Text matrix (dictionary, append only):
  - **save**: header `scope_save_header` "שמירת שינויים". Message `scope_save_<entity>` "ה{entity} משותף לכל המשתמשים. לשמור את השינוי רק אצלך, או לעדכן לכולם?" Buttons `scope_me` "רק אצלי" / `scope_everyone_update` "עדכן לכולם".
  - **create**: header `scope_create_header` "פריט חדש". Message `scope_create_<entity>` "להוסיף רק לחשבון שלך, או לפרסם לכל המשתמשים?" Buttons "רק אצלי" / `scope_everyone_publish` "פרסם לכולם".
  - **delete**: header `scope_delete_header` "מחיקה". Message `scope_delete_<entity>` "למחוק רק אצלך, או להסיר מכל המשתמשים?" Buttons `scope_delete_me` "מחק רק אצלי" / `scope_delete_everyone` "מחק מכולם".
  - **product delete**: the message appends `scope_delete_product_warning` "שים לב: מחיקה מכולם תסיר את המוצר גם מכל המתכונים של כל המשתמשים."
  - **count > 1**: the message is prefixed with "{n} פריטים נבחרו. " (number substituted in the service). The entity noun is plural.
  - Entity nouns: `entity_recipe` "מתכון", `entity_dish` "מנה", `entity_product` "מוצר", `entity_metadata` "ערך", `entity_supplier` "ספק".
- [ ] Every call site in the scope passes context:
  - cook-view and recipe-book save, rating, approval: save, recipe or dish by type.
  - recipe-builder: create when `isNewRecipe`, else save.
  - product-form: create or save, entity product.
  - inventory delete (single and bulk): delete, entity product, with count.
  - recipe-book delete and bulk: delete with count. Bulk edit: save with count.
- [ ] metadata `resolvePushScope(type, action)`: create for add, save for rename or text fix, delete for remove, entity metadata.
- [ ] Admin delete in the recipe book shows one dialog. When the scope prompt will appear (admin + master-linked), skip the hard-coded "are you sure" confirm: the scope modal's cancel is the safety. Non-admins keep the plain confirm. Move the hard-coded Hebrew confirm text into a dictionary key `confirm_delete`.

### Should Have (P1)
- [ ] Spec covering `buildTexts` for every action × entity, plus the count prefix and the product warning.

### Nice to Have (P2)
- [ ] Keep the old `push_to_master_*` / `delete_from_master_*` keys in the dictionary (unused) to avoid raw keys in any leftover caller. Grep first; remove a caller only if one remains.

## UI/UX Notes

- Button order stays the same (cancel → everyone → only me), so muscle memory isn't broken.
- The "everyone" button keeps its current emphasis. On delete it uses the danger variant.

## Atomic Sub-tasks

- [x] A1: Service API, `buildTexts`, and spec; dictionary keys (`master-push.service.ts`, spec).
- [x] A2: Update recipe and dish call sites (cook-view, recipe-book, recipe-builder).
- [x] A3: Update product call sites (product-form, inventory), with the product-delete warning.
- [x] A4: Metadata `resolvePushScope(type, action)`.
- [ ] A5: Single dialog on admin delete; `confirm_delete` key. Build, specs. Update session-state.

## Technical Considerations

- Dependencies: `ConfirmModalService.openTernary` (unchanged), `MasterPushService`, and all callers above.
- New files: none.
- Model changes: none.
- Non-admins never see the prompt (unchanged). Server routes are untouched.

## Out of Scope

- Supplier delete scope (plan 366; it reuses `entity: 'supplier'` from here).
- Changing what "everyone" actually does.

## Critical Questions

- Admin delete of a master-linked item:
  a) Only the scope dialog (cancel / only me / everyone) (default)
  b) Keep both dialogs

## Success Criteria

- [auto] `npx ng test --watch=false --include=src/app/core/services/master-push.service.spec.ts` → 0 failures.
- [auto] `rg -n "האם אתה בטוח שברצונך למחוק" src/app` → no matches.
- [auto] `npm run build` → exit 0.
- [human] As admin: delete a label in metadata → the dialog says "מחיקה … מחק רק אצלי / מחק מכולם". Add a label → "פריט חדש … פרסם לכולם". Rename → "שמירת שינויים".
- [human] As admin: delete a product → the dialog mentions "מוצר" and the warning about all recipes. Select 3 recipes → delete → "3 פריטים נבחרו…", one dialog only.
- [human] As a regular user: no scope prompts appear (unchanged).
