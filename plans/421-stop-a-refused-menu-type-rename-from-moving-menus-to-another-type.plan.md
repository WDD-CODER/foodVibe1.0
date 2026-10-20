# Plan 421 — Stop a refused menu-type rename from moving menus to another type

Status: draft
Track: code — here (not design)
Snapshot: 8d7997e5b732007392f50cc07f40b2aa430f37d6

## Prerequisites
- Plan 377 (wt-1) merged into `origin/main`: it writes `src/app/pages/metadata-manager/**`.

## Problem Statement
S2 suspect **META-C08** from the 2026-10-20 Code QA review (`C:\dev\foodVibe-qa\bugs\qa-runs\code-qa\2026-10-20`),
re-checked by the Planner against `main` at `8d7997e5`.

`metadata-manager.page.component.ts:771-772` awaits `metadataRegistry.renameMenuType(oldKey, trimmed)` and then
always runs `menuEventData.updateServingTypeForAll(oldKey, trimmed)`. `renameTerm`
(`metadata-registry.service.ts:299-316`) returns nothing both when the new name already exists (error toast) and
when the write fails. So renaming «בופה» to an existing «מנות אישיות» is refused, yet every menu on «בופה» is
re-pointed to «מנות אישיות»: the menus silently merge into the other type. The client loop is also redundant: the
server already re-keys `menuEvents.servingType` on a menu-type rename (`TERM_REFERENCES.menuType` in
`shared/schemas/entities/taxonomy-term.schema.ts:72`, `renameTermEverywhere` in `server/routes/generic.js:128`),
and a client loop of one write per menu is what INV-3 forbids.

The second S2 originally grouped here (INVF-C06, the unit window writing a number into the unit) moved to plan
423, which rewrites the same product-form handlers.

User story: as a chef, I want a refused menu-type rename to change nothing so that my menus keep their serving style.

## Goals & Success Criteria
**Primary:** a refused or failed menu-type rename changes no menu; a successful one shows the new name on every
menu without a client loop.

- [auto] `ng build` passes.
- [auto] `npx ng test --watch=false --include='src/app/pages/metadata-manager/**' --include='src/app/core/services/metadata-registry.service.spec.ts'`
  passes, including the new specs: rename to an existing menu type → no `menuEventData` write and no reload;
  successful rename → `menuEventData.reloadFromStorage()` called once; `updateServingTypeForAll` no longer exists.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] `/metadata-manager`, menu types: rename a type that a saved menu uses to the name of another existing
  type → the error «סוג תפריט "…" כבר קיים» shows, and the menu (open it in `/menu-intelligence`) still shows its
  old serving style.
- [human] Rename the same type to a new name → the menu shows the new name after you open it again.

## Execution Mode
- Parallel: after the prerequisite, yes — check `node scripts/scope-check.mjs --overlap --plan=<this>` at take time.
- Concurrent plans: 407 (wt-3), 418 (wt-2) — no shared files.
- Isolated DB: no — client-only change; the server rename path already exists and is tested.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
src/app/core/services/metadata-registry.service.ts
src/app/core/services/metadata-registry.service.spec.ts
src/app/core/services/menu-event-data.service.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a Worker needs a file outside
the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and why it can't be done in-scope;
offer `approved: <path>`; then append the path to the scope block above and retry.

## Architecture Impact

- INV-3: preserves — removes a client loop (`updateServingTypeForAll`); the server's existing
  `renameTermEverywhere` stays the one place that re-keys menus.
- INV-5: preserves — `metadata-registry.service.ts` keeps writing terms through `taxonomy-store.service.ts`;
  only its rename methods' return values change.
- INV-1: preserves — `menu-event-data.service.ts` loses one method; no write or auth path changes.

## Step 0 — Reality Check

Runs always (plan 377 changes these files). Check by symbol after 377 merges: whatever calls `renameMenuType` in
`metadata-manager.page.component.ts`, `registryRename`, `renameTerm` / `run` in `metadata-registry.service.ts`,
`updateServingTypeForAll` / `reloadFromStorage` in `menu-event-data.service.ts`. If 377 already fixed the bug,
mark G1 `n/a: fixed by plan 377` and say so. Print one line per symbol: `ok` or `conflict: <what>`.

## Design

- `metadata-registry.service.ts`: `renameTerm` returns `Promise<boolean>` — `false` on the empty / unchanged /
  already-exists returns and when `run` returns `false`; `true` only when `updateByKey` returned `true`. All five
  public `rename*` methods return `Promise<boolean>`; `registryRename` in the page (`:517`) becomes
  `Promise<boolean>` to match (its callers may keep ignoring the value).
- `metadata-manager.page.component.ts` menu-type rename: `const renamed = await
  this.metadataRegistry.renameMenuType(oldKey, trimmed)`; `if (renamed) await
  this.menuEventData.reloadFromStorage()`. Drop the `updateServingTypeForAll` call.
- `menu-event-data.service.ts`: delete `updateServingTypeForAll` (its only caller is gone).

## Functional Requirements

### Must Have (P0)
- [ ] Refused or failed menu-type rename changes no menu; successful rename reloads menus from the server.

### Won't Have (this plan)
- Escape to cancel the inline menu-type rename (META review note, S4).

## Atomic Sub-tasks
- [ ] G1: Change no menu when a menu-type rename is refused, and let the server do the re-pointing — renameTerm returns boolean, page reloads menus only on success, drop updateServingTypeForAll, specs — src/app/core/services/metadata-registry.service.ts, src/app/pages/metadata-manager/metadata-manager.page.component.ts, src/app/core/services/menu-event-data.service.ts, specs
- [ ] G2: Build, test and hand you the two rename checks — ng build, the listed specs, log-query; Human runs the two checks — this plan file

## Technical Considerations
- Dependencies: none new.
- Backend / API: none; relies on the existing server re-key of `menuEvents.servingType`.
- Auth and validation: none.
- Security surface: none.
- Data / migration: menus that this bug already re-pointed are not repaired.
- Project checks: log-query Done-when item added (touches app code).

## Out of Scope
- INVF-C06 (plan 423), SHELL-C15 and INV-C11 (plan 420), TRASH-C04 (plan 407).
- Repairing menus already merged by the bug.
