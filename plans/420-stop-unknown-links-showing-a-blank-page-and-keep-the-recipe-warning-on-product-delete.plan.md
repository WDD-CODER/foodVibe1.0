# Plan 420 — Stop unknown links showing a blank page and keep the recipe warning on product delete

Status: active
Track: code — here (not design)
Snapshot: 8d7997e5b732007392f50cc07f40b2aa430f37d6

## Problem Statement
The first full Code QA review (Cowork agent, 2026-10-20, `C:\dev\foodVibe-qa\bugs\qa-runs\code-qa\2026-10-20`)
found 5 S2 suspects. This plan fixes the two that no active plan touches:

- **SHELL-C15** — `src/app/app.routes.ts` has no `path: '**'` route. Any unknown URL (an old bookmark, a typo,
  `/does-not-exist`) shows the header and an empty page, and the router throws `NG04002 Cannot match any routes`
  (already logged by the sweep as `CODE-SWEEP-191` / `CODE-SWEEP-192`).
- **INV-C11** — deleting a product on `/inventory` counts the recipes that use it from
  `kitchenStateService.recipes_()` (`inventory-product-list.component.ts:543`, bulk delete `:577`). Recipes and
  dishes load lazily (`recipe-data.service.ts:25`, only through `kitchenDataEnsureLoadedResolver`), and the
  `/inventory` routes have no such resolver. On a cold load of `/inventory` the list is empty, so the chef gets
  the plain «האם אתה בטוח שברצונך למחוק חומר גלם זה?» instead of «חומר הגלם הזה בשימוש ב-N מתכונים/מנות…», and
  `cascadeRemoveIngredientForAll` (which reads the same empty list) removes nothing. Recipes are left pointing at
  a deleted product.

The other three S2s go elsewhere: META-C08 → plan 421 (its files are busy in plan 377); INVF-C06 → plan 423 (it rewrites the same product-form
handlers);
TRASH-C04 → plan 407 (it rewrites restore on the new delete model).

User stories:
- As a chef, I want a mistyped or old link to bring me to the dashboard so that I never sit on a blank screen.
- As a chef, I want the "used in N recipes" warning every time I delete a product so that I never break a recipe
  by accident.

## Goals & Success Criteria
**Primary:** an unknown URL lands on `/dashboard`; deleting a used product always warns with the real count and
cleans the recipes, also on a cold load of `/inventory`.

- [x] [auto] `ng build` passes.
- [x] [auto] `npx ng test --watch=false --include='src/app/pages/inventory/components/inventory-product-list/**'`
  passes, including the new specs: with recipes not yet loaded, `onDeleteProduct` and `onBulkDeleteSelected`
  await `ensureLoaded()` on `RecipeDataService` and `DishDataService` before counting, and the confirm text
  carries the count.
- [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Open `/does-not-exist` → the dashboard opens and the address bar shows `/dashboard`.
- [human] With a product that one recipe uses: reload `/inventory` (F5), delete that product → the warning says
  «בשימוש ב-1 מתכונים/מנות»; after the delete the recipe opens without that ingredient row.
- [human] After the merge, the next nightly `pre-qa.md` has no `CODE-SWEEP-191` / `CODE-SWEEP-192` line.

## Execution Mode
- Parallel: yes — no file overlaps plans 377, 407 or 418 (`node scripts/scope-check.mjs --overlap` at save).
- Concurrent plans: 377 (wt-1), 418 (wt-2), 407 (wt-3).
- Isolated DB: no — client-only change.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/app.routes.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside
the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and why it can't be done in-scope;
offer `approved: <path>`; then append the path to the scope block above and retry.

## Architecture Impact

- INV-3: preserves — the existing client-side cascade (`cascadeRemoveIngredientForAll`) is not changed or
  extended; this plan only makes sure the list it reads is loaded. Moving that cascade to the server is a known
  INV-3 gap, out of scope here.
- INV-none for the routes: one appended wildcard route.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: the last entries of `routes` in
`src/app/app.routes.ts`, `onDeleteProduct` and `onBulkDeleteSelected` in `inventory-product-list.component.ts`,
`ensureLoaded` in `recipe-data.service.ts` / `dish-data.service.ts`. Print one line per commit: `ok` or
`conflict: <what>`.

## Design

- **Wildcard route:** append `{ path: '**', redirectTo: 'dashboard' }` as the very last entry of `routes` in
  `app.routes.ts`, after `{ path: '', redirectTo: 'dashboard', pathMatch: 'full' }`. Append only; no other route
  changes. A not-found page is not needed: the dashboard is the home screen and has every way out.
- **Delete warning:** in `inventory-product-list.component.ts`, `inject()` `RecipeDataService` and
  `DishDataService` (private, trailing underscore) and add one private helper
  `private async ensureRecipesLoaded_(): Promise<void>` that runs
  `Promise.all([this.recipeData_.ensureLoaded(), this.dishData_.ensureLoaded()])`. Call it as the first line of
  `onDeleteProduct` and of `onBulkDeleteSelected` (after the empty-ids return), before `recipes_()` is read. A
  failed load is already logged and toasted by the data services; if it throws, stop the delete (do not fall back
  to the plain confirm), because deleting blind is the bug.
- No route resolver on `/inventory`: it would delay the inventory list's first paint for every visit to fix a rare
  action; loading on delete costs one wait only when needed.

## Functional Requirements

### Must Have (P0)
- [x] Unknown URLs redirect to `/dashboard`.
- [x] Single and bulk product delete load recipes and dishes before counting the recipes that use the product.

### Won't Have (this plan)
- A dedicated 404 page.
- Moving the ingredient cascade to the server (INV-3 gap).

## Atomic Sub-tasks
- [x] F1: Send unknown links to the dashboard instead of a blank page — append path '**' redirect as the last route — src/app/app.routes.ts
- [x] F2: Always warn how many recipes use a product before it is deleted, also right after a reload — ensureRecipesLoaded_ before counting in single and bulk delete, stop on load failure, specs — src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts, src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.spec.ts
- [ ] F3: Build, test and hand you the two checks — ng build, the inventory-product-list specs, log-query; Human runs the unknown-link and cold-reload delete checks — this plan file

## Technical Considerations
- Dependencies: none new.
- Backend / API: none.
- Auth and validation: none; the wildcard redirects to `dashboard`, whose own guards still apply.
- Security surface: none.
- Data / migration: none. This stops new broken references; existing recipes that already point at deleted
  products are not repaired here.
- Project checks: log-query Done-when item added (touches app code).

## Out of Scope
- META-C08 (plan 421), INVF-C06 (plan 423) and TRASH-C04 (plan 407).
- The 38 S3 and 12 S4 suspects of the 2026-10-20 review.
- Repairing recipes that already reference deleted products.
