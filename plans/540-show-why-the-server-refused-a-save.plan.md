# Plan 540 — Show why the server refused a save

Status: draft
Depends-on: 536, 537, 539
Snapshot: abae4cbe54015a771fc35162751a5374e51ff176

## Problem Statement
The Human asked: "Why don't I receive what's wrong in the product form, as in all forms when an input is missing or
not valid?" A real product carried a stale field `preferredSupplierId` (no schema has it); every save was refused
silently and the chef did not know why.

Root cause (code at abae4cbe):
- The server checks every write against the strict Zod schemas (`server/middleware/validate.js` `checkStoredDoc`,
  `server/utils/schema-check.js` `parseV2`) and answers **400 `{ error: 'Validation failed', issues: [{ path, code,
  message }] }`** (`server/routes/generic.js:515,642`). Other 400s are `{ error: '<English text>' }` only.
- The client never reads `issues`. `src/app/core/interceptors/auth.interceptor.ts` toasts only 429 (data API) and
  403 `messageKey: 'no_permission'` (plan 428); a 400 is only logged as `http.error` with the status.
- What the chef sees after a refused save, per form:
  - Product (`kitchen-state.service.ts` `saveProduct`): the generic "שגיאה בעדכון המוצר" (`product_update_error`), no field marked.
  - Recipe / dish (`kitchen-state.service.ts` `saveRecipe`): the raw English `HttpErrorResponse.message`
    ("Http failure response for …: 400 Bad Request"), and `recipe-builder.page.ts` `saveAndWait` adds a second
    toast `error_saving_recipe`.
  - Supplier (`supplier-form.component.ts` `persist_`): **nothing** — the catch only logs.
  - Venue (`venue-form.component.ts` `persist_`): **nothing** — `catch { return false }`.
  - Equipment (`equipment-form.component.ts` `save_`): generic "השמירה נכשלה" (`save_failed`).
  - Event (`menu-intelligence.page.ts` `save`): no catch — an unhandled rejection; `saveAndWait` shows
    "שגיאה בשמירת התפריט" (`error_saving_menu`).
  - A 403 refusal already gets "אין לך הרשאה לפעולה הזו" from the interceptor, then the caller adds its own generic
    toast on top (two toasts).
- Field marks: every form keeps `validationErrors_: Record<field, translationKey>`, but the templates ignore the
  value and hard-code the key (e.g. `equipment-form.component.html:15`
  `validationErrors_()['nameHebrew'] ? 'field_name_required' : null`), so a server message could not show there today.

## Goals & Success Criteria
**Primary:** when the server refuses a save, the chef always gets one Hebrew toast that says the save failed and why;
on the main forms the refused field is marked red with a message, like the form's own checks; a refused field the
chef cannot see gets a plain "contact support" message and its path is logged.

- [auto] `pnpm run test:ci` exits 0, including the new `src/app/core/utils/server-refusal.util.spec.ts` and the new cases in `src/app/core/interceptors/auth.interceptor.spec.ts`, `src/app/core/services/kitchen-state.service.spec.ts`, `src/app/pages/inventory/components/product-form/product-form.component.spec.ts`, `src/app/pages/equipment/components/equipment-form/equipment-form.component.spec.ts`, `src/app/pages/venues/components/venue-form/venue-form.component.spec.ts` and `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.spec.ts` (A2, A4, A5, A6–A9).
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` exits 0 with no entries (or `SKIP: no database configured`).
- [human] On `/suppliers/add`: paste 210 letters into "שם" (paste text below) and press "שמור". A red toast says "השמירה נכשלה. יש לתקן: שם" and under the name box a red line says "הטקסט ארוך מדי". Paste: `אאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאאא`
- [human] Same paste and "שמור" on `/inventory/add` (product name; fill "יחידת בסיס" first), `/inventory/equipment/add` and `/venues/add`: one red toast naming the field, and the name box marked red with "הטקסט ארוך מדי". Only one toast each time.
- [human] On `/recipe-builder`: paste the same text into the recipe name, fill amount and unit, press save. One toast naming "שם", the name marked red with "הטקסט ארוך מדי"; no English text anywhere.
- [human] SETUP (the Worker does it before the cards, local DB only): one supplier named "בדיקת שדה ישן" carries an extra stored field `staleTestField: true`. Open it from `/suppliers/list`, change "טלפון", press "שמור". One red toast: "השמירה נכשלה: בפריט נשמר נתון ישן שהמערכת לא מכירה. פנו לתמיכה — הפרטים נשמרו ביומן". No field is marked red. (The Worker removes the field after.)

## Execution Mode
- Parallel: no — runs after run-536 (536, 537, 539) is merged: shares `recipe-builder.page.ts` (536), `venue-form.component.*` (537), and the toast width (539) matters for the longer texts.
- Concurrent plans: none. Plan 372 (design, draft) also edits `venue-form.component.ts`; whichever runs second rebases on the other (540 changes only `persist_`'s catch and `nameError()`). Plan 471 touches only `recipe-builder-export.service.ts` — no shared file.
- Isolated DB: no (the Human-card SETUP edits one local supplier and reverts it).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/server-refusal.util.ts
src/app/core/utils/server-refusal.util.spec.ts
src/app/core/interceptors/auth.interceptor.ts
src/app/core/interceptors/auth.interceptor.spec.ts
src/app/core/services/kitchen-state.service.ts
src/app/core/services/kitchen-state.service.spec.ts
src/app/core/services/add-supplier-flow.service.ts
src/app/core/services/add-supplier-flow.service.spec.ts
src/app/pages/inventory/components/product-form/product-form.component.ts
src/app/pages/inventory/components/product-form/product-form.component.html
src/app/pages/inventory/components/product-form/product-form.component.spec.ts
src/app/pages/equipment/components/equipment-form/equipment-form.component.ts
src/app/pages/equipment/components/equipment-form/equipment-form.component.html
src/app/pages/equipment/components/equipment-form/equipment-form.component.spec.ts
src/app/pages/suppliers/components/supplier-form/supplier-form.component.ts
src/app/pages/venues/components/venue-form/venue-form.component.ts
src/app/pages/venues/components/venue-form/venue-form.component.spec.ts
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.spec.ts
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
public/assets/data/dictionary.json
docs/brain/component-families.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-3: preserves — `kitchen-state.service.ts` only changes which toast a failed save shows and rethrows the original error; no client-side loop of writes is added.
- INV-4: preserves — the server and the schemas are unchanged; the client only reads the `issues` the server already sends.
- INV-1: preserves — the 403 owner-only answer and its toast stay as plan 428 built them; callers only stop adding a second toast.

## Reuse Check
- `src/app/core/utils/server-refusal.util.ts` (`readServerRefusal`, `refusalShownToUser`, `saveRefusalMessage`, `serverFieldErrors`) — family: helpers — rung: 3 — why: one pure helper file with its spec, like `product-form-errors.util.ts`; read by the interceptor (family http) and by the forms.
- Refusal toast in `auth.interceptor.ts` — family: http — rung: 3 — why: the same branch that already toasts 403 / 429 (plan 428); no new interceptor, no new service.
- Server messages under fields through `app-form-field` `[error]` and the forms' `validationErrors_` — family: form-field — rung: 2 — why: existing input; templates read the key from the map instead of hard-coding it.
- Toast through `UserMsgService.onSetErrorMsg` — family: feedback — rung: 1 — why: use as is.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want a refused save to tell me in Hebrew that it failed and why so that I don't think my change was kept.
- As a chef, I want the field the system refused marked red with a message so that I can fix it the same way I fix a missing name.
- As a chef, I want a plain "contact support" message when the problem is in data I can't see so that I know it is not my mistake and whom to ask.
- As the owner, I want every refused save logged with the field path so that support can find and fix the stored data.

## Functional Requirements

### Must Have (P0)
- [ ] New pure helper `src/app/core/utils/server-refusal.util.ts` (no Angular injection, like `product-form-errors.util.ts`):
  - `readServerRefusal(err: unknown): ServerRefusal | null` — an `HttpErrorResponse` with `status === 400` whose
    `url` contains `API.data('')`; returns `{ issues: { path: string; code: string; message: string }[], error: string }`
    (`issues` empty when the body has none). Anything else → `null`.
  - `refusalShownToUser(err: unknown): boolean` — true for exactly the answers the interceptor already toasted:
    a data-API 400 (above), a 403 with `messageKey === 'no_permission'`, a data-API 429. Callers use it to skip
    their own toast. 409s are **not** in it (their existing messages stay).
  - `PATH_LABEL_KEYS` — top-level schema field → dictionary label key, only keys that exist today:
    `nameHebrew → 'name'`, `baseUnit → 'base_unit'`, `category → 'category'`, `categories → 'category'`,
    `purchaseOptions → 'purchase_units_section'`, `yieldAmount → 'yield'`, `yieldUnit → 'unit'`,
    `phone → 'phone'`, `contactPerson → 'contact_person'`, `deliveryDays → 'delivery_days'`,
    `leadTimeDays → 'lead_time'`, `minOrderMov → 'min_order'`, `ownedQuantity → 'owned_quantity'`,
    `notes → 'notes'`, `environmentType → 'environment_type'`. The first path segment decides
    (`purchaseOptions.0.uom` → `purchaseOptions`).
  - `saveRefusalMessage(refusal, translator)` → the toast text: some issue has a labelled path →
    `save_refused_fields` with `{{fields}}` = the labels, unique, joined by ", "; otherwise some issue exists
    (code `unrecognized_keys`, or a path with no label) → `save_refused_hidden`; no issues → `save_refused_generic`.
  - `serverFieldErrors(err, fieldMap: Record<string, string>)` → `Record<formKey, translationKey>` for the issues
    whose first path segment is in `fieldMap` (schema field → the form's `validationErrors_` key). Message key by Zod
    code: `too_big` → `server_field_too_long`; `invalid_type` whose message contains `received undefined` →
    `field_required`; anything else → `server_field_invalid`. Empty object when not a refusal.
- [ ] `auth.interceptor.ts`: beside the 403 branch, when `readServerRefusal(err)` is not null and the method is
  POST / PUT / PATCH / DELETE: `UserMsgService.onSetErrorMsg(saveRefusalMessage(refusal, translation))` and one log
  line `logging.error({ event: 'save.refused', message: 'HTTP 400', context: { method, url: <path only>, status: 400,
  issues: refusal.issues.map(({ path, code, message }) => ({ path, code, message })) }, requestId })` **instead of**
  the generic `http.error` line for that response (one line, now with the paths; Zod messages name the key, never a value).
- [ ] Callers stop the second toast and show one where none showed:
  - `kitchen-state.service.ts` `saveProduct` (update and add catches): skip the toast when `refusalShownToUser(err)`;
    keep `product_duplicate_name_error` for the 409.
  - `kitchen-state.service.ts` `saveRecipe` catch: skip the toast when `refusalShownToUser(err)`; for any other
    `HttpErrorResponse` show `fallbackErrorKey` (never `err.message`); rethrow the original error when it is an
    `HttpErrorResponse` (so the page can mark fields). Before changing the rethrow, grep every `saveRecipe(` caller
    (`cook-view.page.ts`, `recipe-row-actions.service.ts`, `unlinked-ingredient-link.service.ts`) and confirm none
    reads `err.message`; if one does, escalate.
  - `recipe-builder.page.ts` `saveAndWait` and `saveRecipe` catches: drop the extra `error_saving_recipe` /
    `approval_error` toast when `refusalShownToUser(err)` (kitchen-state already showed one).
  - `equipment-form.component.ts` `save_` catch: skip the toast when `refusalShownToUser(err)`.
  - `supplier-form.component.ts` `persist_` catch: add `save_failed` toast unless `refusalShownToUser(e)`.
  - `venue-form.component.ts` `persist_` catch: same as supplier.
  - `menu-intelligence.page.ts`: `save()` gets a catch that shows `error_saving_menu` unless `refusalShownToUser(err)`
    (today an unhandled rejection); `saveAndWait` skips its toast when `refusalShownToUser(err)`.
  - `add-supplier-flow.service.ts` catch: skip `supplier_add_error` when `refusalShownToUser(err)`.
- [ ] Field marks (forms with field mapping in this plan) — on a refused save, merge
  `serverFieldErrors(err, MAP)` into `validationErrors_`; the next save attempt resets the map as today:
  - Product: `{ nameHebrew: 'productName', baseUnit: 'baseUnit', categories: 'categories' }` — `product-form.component.ts`
    `saveAndWait` catch becomes `catch (err)`; template `nameError` already reads `validationErrors_()['productName']`;
    the `baseUnit` `[error]` (line 96) reads the map value instead of `'field_unit_required'`.
  - Equipment: `{ nameHebrew: 'nameHebrew', category: 'category' }` — both `[error]` bindings
    (`equipment-form.component.html:15,30`) read the map value.
  - Supplier: `{ nameHebrew: 'nameHebrew' }` — `nameError()` returns the map value.
  - Venue: `{ nameHebrew: 'nameHebrew' }` — `nameError()` returns the map value (keeps `duplicate_venue_name` first).
  - Recipe / dish: `{ nameHebrew: 'nameHebrew', yieldAmount: 'yield_amount', yieldUnit: 'yield_unit' }` — new
    `markServerErrors(err: unknown): void` on `RecipeHeaderComponent`, called from both catches in
    `recipe-builder.page.ts` through `recipeHeaderRef_()`; the three `@if` error lines in
    `recipe-header.component.html` (62, 112, 115) print the map value.
  - Event (`menu-intelligence.page.ts`): **toast only** — the menu form has no `validationErrors_` map; its own
    check is `missingMenuFieldsMessage`.
  - Every other save in the app (quick-add / quick-edit product, metadata manager, settings, cook view, list row
    actions, clients): **toast only**, through the interceptor, with no change to their files.
- [ ] Dictionary (`public/assets/data/dictionary.json`, `general`, append only):
  - `save_refused_fields`: "השמירה נכשלה. יש לתקן: {{fields}}"
  - `save_refused_hidden`: "השמירה נכשלה: בפריט נשמר נתון ישן שהמערכת לא מכירה. פנו לתמיכה — הפרטים נשמרו ביומן"
  - `save_refused_generic`: "השמירה נכשלה: המערכת דחתה את הבקשה. נסו שוב, ואם זה חוזר — פנו לתמיכה"
  - `server_field_too_long`: "הטקסט ארוך מדי"
  - `server_field_invalid`: "ערך לא תקין"

### Should Have (P1)
- [ ] Specs (named in the scope): util — each branch of `readServerRefusal`, `refusalShownToUser` (400 / 403 / 429 /
  409 / 500), `saveRefusalMessage` (labelled, `unrecognized_keys` with path `''`, unlabelled path, no issues),
  `serverFieldErrors` (`too_big`, missing, nested path, unmapped path); interceptor — a PUT to `/api/v1/data/products/x`
  answered 400 with issues → one `onSetErrorMsg` call and one `save.refused` log with the paths, no `http.error`;
  a GET 400 → no toast; kitchen-state — a 400 on `saveProduct` → exactly one error toast in total; product, equipment,
  venue, recipe-header — a 400 `too_big` on `nameHebrew` → the name field shows `server_field_too_long`.
- [ ] `docs/brain/component-families.md`: `form-field` entry — one line "Server refusals (plan 540):
  `serverFieldErrors(err, map)` from `@utils/server-refusal.util` fills `validationErrors_`; templates read the key
  from the map." `http` entry — one line "A data-API 400 on a write gets one toast and one `save.refused` log in the
  interceptor; callers skip their own toast with `refusalShownToUser(err)`."

### Nice to Have (P2)
- [ ] none.

## What happens when
- Two issues, one labelled and one unknown key: the toast names the labelled field; the log lists both paths.
- A 400 on a GET (e.g. an unknown list filter): no toast (not a save); logged as today.
- A 400 from a non-data route (AI, auth, events pipeline): unchanged — those screens keep their own messages.
- The chef fixes the field and saves again: `validateForm_()` resets `validationErrors_`, so the red mark clears.
- 403 owner-only: unchanged text "אין לך הרשאה לפעולה הזו"; the second generic toast is gone.
- 409 (same product name, term key taken, "Entity already exists"): unchanged — the caller's existing message.

## UI/UX Notes
- RTL unchanged; the mark is the existing `.c-field-error` / `.c-input--invalid` look. No new icons, no new CSS.
- Five new `general` keys above; field labels reuse existing keys.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Read a refused save in one place — the pure helper with `PATH_LABEL_KEYS` and the four functions — src/app/core/utils/server-refusal.util.ts
- [x] A2: Prove the helper — every branch listed under P1 — src/app/core/utils/server-refusal.util.spec.ts
- [x] A3: Add the five Hebrew texts — public/assets/data/dictionary.json
- [x] A4: One toast and one log line for every refused save — interceptor branch and its two spec cases — src/app/core/interceptors/auth.interceptor.ts, src/app/core/interceptors/auth.interceptor.spec.ts
- [x] A5: Product and recipe saves stop the second toast and the English text; recipe rethrows the original error — src/app/core/services/kitchen-state.service.ts, src/app/core/services/kitchen-state.service.spec.ts
- [x] A6: Product form marks the refused field — src/app/pages/inventory/components/product-form/product-form.component.ts, src/app/pages/inventory/components/product-form/product-form.component.html, src/app/pages/inventory/components/product-form/product-form.component.spec.ts
- [x] A7: Equipment form marks the refused field and stops the second toast — src/app/pages/equipment/components/equipment-form/equipment-form.component.ts, src/app/pages/equipment/components/equipment-form/equipment-form.component.html, src/app/pages/equipment/components/equipment-form/equipment-form.component.spec.ts
- [x] A8: Supplier and venue forms show a toast when a save fails and mark the name — src/app/pages/suppliers/components/supplier-form/supplier-form.component.ts, src/app/pages/venues/components/venue-form/venue-form.component.ts, src/app/pages/venues/components/venue-form/venue-form.component.spec.ts
- [x] A9: Recipe builder marks the refused name / yield and stops the second toast — src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts, src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.html, src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.spec.ts, src/app/pages/recipe-builder/recipe-builder.page.ts
- [x] A10: Event save never fails silently; add-supplier popup stops the second toast — src/app/pages/menu-intelligence/menu-intelligence.page.ts, src/app/core/services/add-supplier-flow.service.ts, src/app/core/services/add-supplier-flow.service.spec.ts
- [x] A11: Registry lines — docs/brain/component-families.md
- [ ] A12: Run every `[auto]` check and paste the outputs under Execution Notes; prepare the Human SETUP (local supplier "בדיקת שדה ישן" with `staleTestField: true`, set through mongosh or a scratch script outside the repo; remove it after the Human replies)

## Technical Considerations
- Dependencies: `UserMsgService`, `TranslationService`, `LoggingService` (already resolved lazily in the interceptor
  through `injector`), `API` map in `http-storage.adapter.ts` (read only), `app-form-field` (unchanged).
- New files needed: `src/app/core/utils/server-refusal.util.ts`, `src/app/core/utils/server-refusal.util.spec.ts`.
- Model changes: none (the `ServerRefusal` type lives in the helper).
- Backend / API: none. The server already returns `{ error, issues: [{ path, code, message }] }`; Zod 4's
  `unrecognized_keys` message already names the key ("Unrecognized key: \"preferredSupplierId\""), so the log has it
  without a server change.
- Auth and validation: none changed. The interceptor is a sensitive path (`kit.config.json` `sensitivePaths`) —
  the change only reads the response body and adds a toast and a log; no token or header logic moves.
- Security surface: the log line holds field paths, codes and Zod messages — no field values, no PII
  (`.claude/skills/auth-and-logging/SKILL.md`).
- Data / migration: none. The stale `preferredSupplierId` was already removed from the 3 local products by the Planner on 2026-11-08 (510 never reached Atlas); the unknown-field card plants its own `staleTestField`.
- Project checks: log-query `[auto]` present; Reuse Check present; five dictionary keys named; dictionary append
  only; no CSS; no new icons.

## Out of Scope
- Removing the stale `preferredSupplierId` field from the stored product(s) — a data clean-up for support; this plan only makes the refusal visible.
- Server changes (a Hebrew `messageKey` per issue, stripping unknown keys on write) — the client maps codes itself.
- A `maxlength` on name inputs (the Human cards use the 200-character server limit as the repro).
- A longer display time for error toasts (`UserMsgService` `ERROR_DURATION_MS` stays 4 s) — see Critical Questions.
- Field marks on the event form, quick-add / quick-edit product popups, metadata manager, settings, clients — toast only.
- Purchase-option rows: a refused `purchaseOptions.N.*` names "יחידות רכש" in the toast but marks no row.

## Critical Questions
- Q: Where does the refusal toast come from — the interceptor (one place, every save in the app, callers skip their own toast) or each form (needs every caller edited, misses unlisted saves)? A: the interceptor (Human 2026-11-08), same place as the 403 / 429 toasts, plan 428.
- Q: Wording for a refused field the chef can't see — "השמירה נכשלה: בפריט נשמר נתון ישן שהמערכת לא מכירה. פנו לתמיכה — הפרטים נשמרו ביומן"? A: this text, as written (Human 2026-11-08).
- Q: Keep refusal toasts at 4 s like every error toast, or 8 s because the text is longer? A: 4 s, no `UserMsgService` change (Human 2026-11-08).

## Execution Notes
- Planner 2026-11-08: drafted from the Human's question and the `preferredSupplierId` case; refusal paths read from the code at abae4cbe, not yet reproduced in the browser. Supplier form has no spec file; it is covered by the helper spec and a Human card.
- Builder: Step 0 drift (536/537/538/539 commits) — no conflict found; symbols named by the plan exist.
- pnpm run build -> exit 0; pnpm run lint -> exit 0 (0 errors); pnpm run test:ci -> exit 0, 1818 of 1818 SUCCESS; reuse-lint --check-registry -> exit 0; log-query -> SKIP: no database configured.
- A12 left open: the Human SETUP (local supplier with staleTestField) is a DB write, not done by the builder. add-supplier-flow.service.spec.ts unchanged (no new case needed).
- supplier-form has no spec; covered by helper spec and Human card.
