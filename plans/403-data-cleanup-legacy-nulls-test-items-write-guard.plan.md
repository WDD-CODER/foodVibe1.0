# Plan 403 — Data cleanup: legacy null logistics, test items and leftover collections, with a write guard

Status: draft
Track: code — here (not design)
Snapshot: e6feb7f41c27cc9229ae2a58399856aa2f9e4437

## Problem Statement
Saving most recipes and dishes fails with 400 `Validation failed — logistics: expected object,
received null` — from the recipe builder ("שמור מתכון") and from every recipe-book row action
(favorite / rating / approve → `PUT /api/v1/data/recipes/:id`). Reproduced 2026-10-10 on wt-2.
**Production (Atlas) is broken the same way.**

**Cause.** `shared/schemas/entities/recipe.schema.ts:40` has `logistics: dishLogisticsSchema.optional()`,
so `null` is rejected. `server/routes/generic.js` PUT validates `{ ...current, ...updatable }` and
writes with `$set`, so a client that omits the field still fails on the stored null
(`docs/brain/gotchas/backend.md` "A PUT merges over the stored doc"). Plan 340 patched only
`applyCascadeUpdate` (`kitchen-state.service.ts` ~L453); the recipe form already always sends
`logistics` (`recipe-form.service.ts` ~L314), but row actions (favorite/rating/approve) send the
stored doc back and hit the null.

**Planner audit, 2026-10-10 (read-only; `server/migrations/tools/validate-all.js` + an ad-hoc audit).**
The schema check finds exactly one violation class; everything else is clean (0 unmapped v1 keys,
all `schemaVersion: 2`, epochs are numbers).

| # | Collection · path | Issue | Local | Atlas |
|---|---|---|---|---|
| 1 | recipes · `logistics` | stored `null` (schema 400) | 5548 / 6719 | 3322 / 5563 |
| 1 | dishes · `logistics` | stored `null` | 4930 / 6019 | 2958 / 5010 |
| 1 | TRASH_RECIPES · `logistics` | stored `null` (breaks restore) | 299 | 2 |
| 2 | TRASH_RECIPES / TRASH_DISHES · `_masterId` | stored `null` | 4 / 1 | 0 |
| 3 | recipes, dishes, products, suppliers, menuEvents | `createdAt`/`updatedAt` missing | 14+3+15+2+1 | 2+0+1+0+2 |
| 4 | recipes/dishes · `logistics.baseline[].equipmentId` | points at no equipment (old `eq_00x` import ids) | 0 | 3 + 45 |
| 5 | recipes/dishes · `ingredients[].referenceId` | points at no product | 100 + 35 | 30 + 0 |
| 6 | menuEvents · `sections[].items[].recipeId` | points at no recipe/dish | 31 | 56 |
| 7 | KITCHEN_*, MENU_TYPES, MENU_EVENT_TYPES, MENU_SECTION_CATEGORIES, EQUIPMENT_CUSTOM_CATEGORIES | empty v1 registry collections (0 docs; 0004 dropped them, something re-creates them) | 11 | 11 |
| 8 | PRODUCT_LIST, RECIPE_LIST, DISH_LIST, KITCHEN_SUPPLIERS, EQUIPMENT_LIST, MENU_EVENT_LIST, MENU_LIST, VENUE_PROFILES (+ local RECIPE_BOOK_VIEW) | v1 rollback copies from the 2026-10-02 v2 cutover; only `v1-only-guard`ed scripts read them | 9 | 8 |
| 9 | users + all their docs | test accounts | see A0 | see A0 |
| 10 | products/recipes/dishes/suppliers/venues/taxonomyTerms | test items (names like בדיקה / ניסיון / test / empty) | see A0 | see A0 |

Per-user picture: master has 0 null `logistics`; every user clone has ~1105 (cloned before master
was fixed; `_userModified` / sync rules keep them). Atlas admin `UMyJP` has 0 (reset from master).

## Approved discard list (Human, 2026-10-10)

Delete by **exact name** in the given collection, in master and every user copy (plus their
`TRASH_*` / `VERSION_HISTORY` entries). "(empty)" = `nameHebrew` empty or whitespace only.

| Collection | Delete |
|---|---|
| recipes | בדיקה בדיקה 333 · בדיקה חדש חדש · נסיון נוסף · Dish 1 · a1 · ניסיון חדש באמת 2 · ניסיון חדש באמת רק לי 3 · ניסיון חדש לכולם 1 · חדש ניסיון 1 · חדש ניסיון 2 · חדש ניסיון לכולם · חדש ניסיון עבורי · חדש ניסיון רק לי · חדש ניסיון רק ליוזר · ממש חדש · ממש חדש (עותק) · (empty) |
| dishes | אלרגן בדיקה · אלרגן בדיקה1 · (empty) |
| products | AUDIT-quick-test1 · testdebugfix04 · testdebugfix06 · מוצר בדיקה/ · מוצר בדיקה הוספה · מוצר ניסיון 1 · מוצר ניסיון 2 · מוצר ניסיון 3 · טסט 1 · ניסיון 1; · ניסיון 2 · שמיר חדש בדיקה נועם · שמיר חדש בדיקה 2 · חלב שקדים עזים טסט · חציל יפני ירוק טסט · (empty) |
| suppliers | kjh · gsf · ss · scac · א · ספק בדיקה 341 · ספק בדיקה ב 341 · (empty) |
| venues | ccc |
| taxonomyTerms | ingredientCategory `dddd`, `aaa` · allergen `ccc` · label `new`, `aaaa` · eventType `חח` · sectionCategory `new` (match `kind` + `key`; master and user-owned) |

**Keep** (explicitly): טסט פינגר פוד · בצק פסטה קלאסי טסט · בצק פסטה בין לבין טסט · רוטב פונזו יפני (טסט 2#) · פשטידת תירס ילדים טסט 2 · רוטב ציר בקר ושיטאקי גלייז  טסט לא מאושר · מוס שוקולד לבן לסיפון בדיקה · supplier גד · supplier דן · the ריטסטרטו products · units kg/ml/cup · allergen soy · category dry.

**Test users — delete the user and every doc with their `userId`:**
- Local: `test1`, `ddd`, `qa369`. Keep `dev-guest`, `danwe`.
- Atlas: `hhhh` (admin), `dan`, `danw`, `dan11` — **all four Atlas accounts.** ⛔ A0b gate below: this leaves production with no user and no admin.

**v1 rollback collections (row 8): KEEP** — F8 is not run.

Rows 5–6 (dangling refs): report only.

## Goals & Success Criteria
- Primary: both databases are clean — no stored value the schema rejects, no test data, no dead
  leftover collections — and a stale stored null can never block a save again.
- Success:
  - [auto] `node server/migrations/tools/validate-all.js --target=local` reports `0 with violations` for every collection.
  - [auto] Same on Atlas (`--target=atlas --confirm-host=<host>`) after the approved `--apply`.
  - [auto] `node server/scripts/cleanup-legacy-data.js --target=local` (dry run) prints 0 for every fixer after `--apply` (idempotent).
  - [auto] `npm --prefix server test` passes, including the new guard test (stored `logistics: null` + PUT without `logistics` → 200 and the field is gone; PUT with `logistics: null` in the body → still 400).
  - [auto] `ng build` passes; `ng test` passes.
  - [human] Atlas dry-run table reviewed and `--apply` approved in chat.
  - [human] On a formerly-null recipe: save from the recipe builder, and favorite / rating / approve from the recipe-book list all work (local, then production).
  - [human] Test items/users from the approved list are gone; real items still there.

## Execution Mode
- Parallel: no — writes to the shared local DB used by every slot.
- Concurrent plans: 399 (wt-2) is waiting on this before its row-action browser checks.
- Isolated DB: no — the point is to fix the real local DB and Atlas. Backups first (A1).
- **Shared local DB:** announce in chat before every local `--apply` (slots wt-1/2/3 use it).
- **Lesson from plan 310:** dry-run on Atlas early (A3), not only locally.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/scripts/cleanup-legacy-data.js
server/scripts/lib/**
server/test/cleanup-legacy-data.test.js
server/test/generic.test.js
server/test/invariants.test.js
server/routes/generic.js
server/db.js
src/app/core/services/kitchen-state.service.ts
src/app/core/services/kitchen-state.service.spec.ts
docs/brain/gotchas/backend.md
docs/brain/gotchas.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `can-write.js` and every ownership filter in `generic.js` are untouched; the guard only changes which stored keys get `$unset` on an already-authorized PUT.
- INV-2: preserves — no change to master/override semantics; the cleanup applies the same fix to master and every user copy.
- INV-3: preserves — no rename or cascade path changes; the cleanup is one server-side script, not a client loop.
- INV-4: preserves — the schema is **not** loosened. A `null` sent by the client is still rejected. The guard only stops a *stale stored* null on an optional key (one the request didn't send) from failing validation: that key is `$unset` in the same write and left out of the merged doc that is validated. `server/test/upgrade-v1-to-v2.test.js` "flags nulls … instead of loosening the schema" stays green.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want every recipe and dish to save, favorite, rate and approve without an error.
- As the Human, I want the database to hold only real data, so what I see in the app is real.

## Functional Requirements

### Must Have (P0)
- [ ] **Backups first:** `node server/scripts/db-backup.js --target=local` and `--target=atlas` before any `--apply`; record both backup folders in session-state.
- [ ] **`server/scripts/cleanup-legacy-data.js`** — one fixer per approved pattern; `--target=local|atlas`
      (Atlas needs `--confirm-host=<host>`, same rule as `migrations/tools/_connect.js`); **dry run by
      default** printing a count per fixer per collection; `--apply` writes; idempotent; runs over
      master and every user. Atlas `--apply` also needs `--backup-dir=<fresh backup>` (refuse otherwise).
      Fixers:
  - F1 `logistics: null` → `$unset` in `recipes`, `dishes`, `TRASH_RECIPES`, `TRASH_DISHES` (`VERSION_HISTORY` snapshots too if any).
  - F2 `_masterId: null` in `TRASH_*` → `$unset`.
  - F3 missing `createdAt`/`updatedAt` → backfill (`updatedAt` = `createdAt` = the doc's `_id` time if derivable, else now).
  - F4 `logistics.baseline[]` entries whose `equipmentId` matches no equipment → remove the entry.
  - F5 drop the empty v1 registry collections (row 7) — only when the collection has 0 docs.
  - F6 delete the Human-approved test items (A0 list), by exact name + collection, in master and every user copy; also their `VERSION_HISTORY` / `TRASH_*` entries.
  - F7 delete the Human-approved test users and every doc whose `userId` is theirs (all collections in `constants/collections.js`), local only unless the Human approves an Atlas account.
  - F8 ~~drop the v1 rollback collections~~ — not approved (Human 2026-10-10: keep). Do not implement.
  - Rows 5–6 (dangling ingredient / menu refs): **report only** — print the list (doc name · user · missing id), no write, unless the Human approves a fix in A0.
- [ ] **Find what re-creates the empty v1 registry collections** (row 7) — likely an index loop in `server/db.js` over an old name list — and stop it.
- [ ] **Server guard** in `server/routes/generic.js` `PUT /:type/:id`: keys of the stored doc whose value is `null` and that the request did not send are removed from the merged doc before validation and `$unset` in the same `updateOne`. Client-sent `null` still 400. Test in `server/test/generic.test.js` (both cases); keep the INV-4 test green.
- [ ] **Client safety net:** `kitchen-state.service.ts` `saveRecipe()` normalizes `logistics: null` → `{ baseline: [] }` (same as `applyCascadeUpdate`), so favorite/rating/approve never send a null.
- [ ] **Brain:** update `docs/brain/gotchas/backend.md` "A PUT merges over the stored doc": "legacy nulls cleaned 2026-10-1x (local + Atlas) by `server/scripts/cleanup-legacy-data.js`; stale stored nulls are now `$unset` by the PUT guard in `server/routes/generic.js`".

### Should Have (P1)
- [ ] `cleanup-legacy-data.js` also prints the full schema check (reuse `utils/schema-check.js` `checkDoc`) at the end, so one run shows "0 invalid docs".

### Nice to Have (P2)
- none

## UI/UX Notes
- No UI change. Test items disappear from lists.

## Atomic Sub-tasks
- [x] A0: Discard list confirmed by the Human 2026-10-10 — see "Approved discard list"
- [ ] A0b: ⛔ Before deleting the Atlas accounts: the Human signs up their real production account first, the Worker sets its `role: admin` (one `updateOne` in the cleanup script, `--promote-admin=<name>`), the Human confirms they can log in as admin — only then F7 deletes `hhhh`, `dan`, `danw`, `dan11`
- [ ] A1: Backups — `server/scripts/db-backup.js` local + Atlas; folders in session-state
- [ ] A2: `server/scripts/cleanup-legacy-data.js` (F1–F7 + report-only rows 5–6) + `server/test/cleanup-legacy-data.test.js` (each fixer on a memory DB: dry run counts, apply, second run = 0)
- [ ] A3: Dry run local + Atlas; paste both count tables in chat
- [ ] A4: Server guard in `server/routes/generic.js` PUT + tests in `server/test/generic.test.js`
- [ ] A5: Client net in `kitchen-state.service.ts` `saveRecipe()` (+ spec)
- [ ] A6: Stop the re-creation of empty v1 registry collections (`server/db.js` or wherever A2 finds it)
- [ ] A7: Announce in chat → local `--apply` → dry run again = 0 → `validate-all --target=local` = 0 violations
- [ ] A8: ⛔ Human approves Atlas `--apply` → apply with `--backup-dir` → `validate-all --target=atlas` = 0 violations
- [ ] A9: Brain gotcha update (`docs/brain/gotchas/backend.md`)
- [ ] A10: `npm --prefix server test`, `ng build`, `ng test` green; hand the Human the click list (save / favorite / rating / approve on a formerly-null recipe, local then production)

## Technical Considerations
- Production fix order: the cleanup (A8) fixes Atlas data immediately; the guard (A4) only helps
  once deployed to Render. Do A8 as soon as the Human approves — don't wait for the deploy.
- Deleting a test product that a real recipe uses would create a dangling ingredient: before F6,
  the script lists every non-test doc referencing a test item and refuses unless that referrer is
  also on the list (local "ממש חדש" / "ממש חדש (עותק)" use test products — they are on the proposed list).
- Use the same host-confirm rule as `migrations/tools/_connect.js`; never print the URI.
- `TRASH_*` / `VERSION_HISTORY` have no Zod schema; F1/F2 there are for safe restores.

## Out of Scope
- Loosening the schema (`.nullish()`) — rejected by INV-4 and the existing test.
- Re-linking dangling ingredient/menu references (rows 5–6) unless approved in A0.
- Render deploy itself (normal `/ship` + merge).

## Critical Questions
- Q: Which items/users/collections to discard? A: see "Approved discard list" (Human, 2026-10-10).
