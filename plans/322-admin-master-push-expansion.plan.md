# Plan 322 — Admin "Apply to Everyone or Just Me" — Master-Push Expansion

## Context

Today, when a signed-in user edits a recipe or dish that was cloned from the shared
master catalogue, the app asks "save just for you, or push to everyone?" via
`MasterPushService.askScope()`. This is the **only** entity type wired up, and — per an
explicit dev-time TODO comment in `recipe-builder.page.ts` — it currently asks **any**
signed-in user, not just admins. Everything else (products, equipment, suppliers,
venues, menu events, and 9 taxonomy/registry collections like labels, categories,
allergens, units, menu types) has server-side support for master sync (they're all
`cloneable: true` in `server/constants/collections.js`, and every cloned doc already
carries a `_masterId` field stamped generically by `clone-master.js`) but **no push-back
path** — an admin's edit to a product or a label just silently stays on their own
account and never reaches other users. Deletes never propagate to master at all, for
any type.

The goal: make "does this change reach everyone, or just me" a deliberate, admin-only
choice, asked consistently across every entity/taxonomy type, using the plumbing that
already exists (schema `role` field, `requireAdmin` middleware, `syncMasterToUser`'s
generic Rule 1-4 reconciliation, `ConfirmModalService.openTernary()`) rather than
inventing new mechanisms.

**Confirmed decisions (from user, 2026-09-30):**
- Admin delete-to-everyone is **non-destructive**: it only removes the item from the
  master catalogue (so new signups/future clones stop getting it) — existing users who
  already have their own copy keep it. Matches the sync engine's existing Rule 4
  philosophy ("deleted master item → skip, no removal from user"); no client-side
  cascade delete across accounts.
- Full scope in one plan: existing entity types (recipes/dishes/products/equipment/
  suppliers), the two currently-uncovered cloneable entity types (venues, menu events),
  all 9 taxonomy/registry collections, plus new-item creation and delete propagation.
- Add one canonical `isAdmin_` signal to `UserService` and migrate the existing ad hoc
  `computed(() => user_()?.role === 'admin')` copies (recipe-book-list, user-management,
  header, kitchen-state.service) onto it.

**Ship as 5 sequential stages, each its own branch/PR** — this is a large diff; bundling
it risks an unreviewable commit and makes any one piece harder to revert independently.

---

## Full entity/collection inventory (source: `server/constants/collections.js` + service grep)

| # | Collection | Owning client service | Current state |
|---|---|---|---|
| 1 | RECIPE_LIST | `recipe-data.service.ts` | Wired, needs admin-gate only |
| 2 | DISH_LIST | `dish-data.service.ts` | Wired, needs admin-gate only |
| 3 | PRODUCT_LIST | `product-data.service.ts` | Server-pushable, **no client wiring**, model lacks `_masterId` field |
| 4 | EQUIPMENT_LIST | `equipment-data.service.ts` | Server-pushable, **no client wiring** |
| 5 | KITCHEN_SUPPLIERS | `supplier-data.service.ts` | Server-pushable, **no client wiring** |
| 6 | VENUE_PROFILES | `venue-data.service.ts` | Cloneable, **not in server allowlist**, no client wiring |
| 7 | MENU_EVENT_LIST | `menu-event-data.service.ts` | Cloneable, **not in server allowlist**, no client wiring |
| 8 | KITCHEN_PREPARATIONS | `preparation-registry.service.ts` | Cloneable, **not in server allowlist**, no client wiring |
| 9 | KITCHEN_CATEGORIES | `metadata-registry.service.ts` | Cloneable, **not in server allowlist**, no client wiring |
| 10 | KITCHEN_ALLERGENS | `metadata-registry.service.ts` (same file) | Same |
| 11 | KITCHEN_LABELS | `metadata-registry.service.ts` (same file) | Same |
| 12 | MENU_TYPES | `metadata-registry.service.ts` (same file) | Same |
| 13 | KITCHEN_UNITS | `unit-registry.service.ts` | Cloneable, **not in server allowlist**, no client wiring |
| 14 | MENU_EVENT_TYPES | `menu-event-type.service.ts` | Same |
| 15 | MENU_SECTION_CATEGORIES | `menu-section-categories.service.ts` | Same |
| 16 | EQUIPMENT_CUSTOM_CATEGORIES | `equipment-category-registry.service.ts` | Same |

`_masterId` is already present on every cloned doc in Mongo for all 16 (stamped
generically in `server/services/clone-master.js:63`, not type-specific) — server-side
allowlist additions for #6-16 are purely additive `Set` entries, no data migration
needed. Client TS interfaces for #6-16 just need `_masterId?: string` added where
missing so the push-decision code can read it.

**Reusable building blocks (no new UI component needed):**
- `ConfirmModalService.openTernary()` — already gives the exact cancel/save-as-me/
  save-as-everyone 3-button shape; `MasterPushService.askScope()` already wraps it.
- `server/middleware/auth.js`'s `requireAdmin` — already live, already used by
  `admin.js`'s two endpoints.
- `syncMasterToUser`'s Rule 1-4 loop (`server/services/sync-master.js`) — already
  generic across all `CLONEABLE_TYPES`; no changes needed there for stages 1-3.

---

## Atomic Sub-tasks

### Stage 1 — Foundation (admin gating)

- [ ] `src/app/core/services/user.service.ts` — add `readonly isAdmin_ = computed(() =>
      this.user_()?.role === 'admin')`.
- [ ] Migrate existing ad hoc copies to use it: `recipe-book-list.component.ts:137`,
      `user-management.component.ts:26`, `header.component.html:11,146`,
      `kitchen-state.service.ts:310`.
- [ ] `server/routes/generic.js` — replace the commented-out guard at the push-to-master
      route (~line 298) with a real `requireAdmin` in the middleware chain: `router.put(
      '/:type/:id/push-to-master', verifyToken, requireAdmin, async (req, res) => {...})`,
      consistent with how `admin.js` already gates its two routes.
- [ ] `src/app/core/services/master-push.service.ts` — `askScope()` short-circuits to
      `'me'` (no modal) whenever `!userService.isAdmin_()`, in addition to the existing
      short-circuit when there's no `_masterId`. Non-admins never see the prompt again.

### Stage 2 — Wire existing server support: Products, Equipment, Suppliers

- [ ] `product-data.service.ts` — add `_masterId?: string` to `Product` model (confirmed
      missing), add `pushToMaster(id)` method, wire into product-form save flow.
- [ ] `equipment-data.service.ts` — confirm/add `_masterId?: string`, add
      `pushToMaster(id)`, wire into equipment list/form save flow.
- [ ] `supplier-data.service.ts` — confirm/add `_masterId?: string`, add
      `pushToMaster(id)`, wire into supplier list/form save flow.
- [ ] Each save flow mirrors `cook-view.page.ts:507-523`: if `pending._masterId`, call
      `masterPush.askScope(pending)` before saving; call `pushToMaster` after a
      successful save when scope is `'everyone'`.

### Stage 3 — Extend to Venues, Menu Events, and the 9 taxonomy/registry collections

- [ ] `server/routes/generic.js` — add `VENUE_PROFILES`, `MENU_EVENT_LIST`,
      `KITCHEN_PREPARATIONS`, `KITCHEN_CATEGORIES`, `KITCHEN_ALLERGENS`, `KITCHEN_LABELS`,
      `MENU_TYPES`, `KITCHEN_UNITS`, `MENU_EVENT_TYPES`, `MENU_SECTION_CATEGORIES`,
      `EQUIPMENT_CUSTOM_CATEGORIES` to `PUSHABLE_TYPES`.
- [ ] `venue-data.service.ts` — `_masterId?: string`, `pushToMaster(id)`, wire into save flow.
- [ ] `menu-event-data.service.ts` — same.
- [ ] `preparation-registry.service.ts` — same, wire into register/update/rename/delete
      category and preparation methods.
- [ ] `metadata-registry.service.ts` (covers KITCHEN_CATEGORIES, KITCHEN_ALLERGENS,
      KITCHEN_LABELS, MENU_TYPES) — same, wire into each mutating method per collection.
- [ ] `unit-registry.service.ts` — same.
- [ ] `menu-event-type.service.ts` — same.
- [ ] `menu-section-categories.service.ts` — same.
- [ ] `equipment-category-registry.service.ts` — same.
- [ ] Consider splitting this stage into 2 PRs (recipe-adjacent registries vs.
      menu/equipment registries) if the diff gets unwieldy.

### Stage 4 — New items created as shared from the start

- [ ] `server/services/clone-master.js` — extract the single-doc clone logic (strip
      `_id`/`userId`/`_masterId`/`_userModified`, assign new id + `_masterId` back-
      reference) into a small shared helper usable both at signup-time bulk clone and a
      single new item.
- [ ] New server route `POST /api/v1/data/:type/create-shared`
      (`verifyToken, requireAdmin`, `PUSHABLE_TYPES`-gated): inserts the body as a new
      `__master__` doc, clones it into the admin's own collection via the helper above,
      calls `bumpMasterVersion()`.
- [ ] Client: at each entity/registry's "add new" flow, if `isAdmin_()`, ask scope
      *before* the initial save (new decision point — no `_masterId` exists yet).
      `'everyone'` → call `create-shared`; `'me'` or non-admin → existing `POST /:type`.

### Stage 5 — Non-destructive delete propagation

- [ ] New server route `PUT /:type/:id/remove-from-master`
      (`verifyToken, requireAdmin`, `PUSHABLE_TYPES`-gated, requires `existing._masterId`
      same validation as push-to-master): deletes/tombstones only the `__master__` doc.
      No change needed to `syncMasterToUser` — Rule 4 already leaves existing users'
      copies untouched when a master item disappears.
- [ ] Client: extend each entity's delete confirmation — if admin and the item has
      `_masterId`, offer "delete just for me" vs. "also remove from master" before the
      normal local delete (which always happens regardless of the choice).

---

## Verification (per stage)

- `ng build` clean, existing server/client test suites green (per `AGENTS.md` hard
  rule) before every stage's ship.
- Manual click-through on `dev:local` with two accounts (one `role: admin`, one
  `role: user`): confirm non-admin never sees the ternary prompt anywhere touched by
  that stage; confirm admin's "everyone" choice on one account is picked up by the
  other account after a refresh/re-login (`syncMasterToUser`).
- Stage 5 specifically: after an admin "remove from master", confirm a *third*,
  already-cloned user account still has their copy untouched, while a brand-new
  signup no longer receives it.

## Decision gates

| Gate | Question | Decision |
| --- | --- | --- |
| D1 | Delete-to-everyone: cascade-remove from all users, or non-destructive (master-only)? | Non-destructive (2026-09-30) |
| D2 | Scope: foundation + existing types only, or everything (incl. taxonomy + create flow) in one plan? | Everything in one plan (2026-09-30) |
| D3 | Add canonical `isAdmin_` signal and migrate existing ad hoc copies, or leave existing usages untouched? | Add + migrate (2026-09-30) |
