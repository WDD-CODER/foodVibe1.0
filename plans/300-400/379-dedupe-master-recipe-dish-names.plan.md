# Plan 379 — Dedupe master recipe and dish names

Status: done
Snapshot: 8dad759d

## Problem Statement

Editing "רוטב לסלט איטריות" on the deployed app is blocked with "שם מתכון זה כבר קיים". The
duplicate-name check (plan 332) is correct: the shared `__master__` library itself holds 7
records with that name (5 `recipes`, 2 `dishes`), and every user got a clone of all 7.
Atlas read on 2026-10-05: 2,136 master recipes+dishes, 18 duplicated names, 23 extra docs
(17 pairs + this group of 7). Any of them blocks a save the same way.

Also: every new doc self-links (`_masterId === _id`), so the "(מהמאגר המשותף)" tag shown by
plan 332 is true for every record and tells the user nothing.

## Goals & Success Criteria

Primary: no two master recipes/dishes share a name, and each user's untouched clones match.
Primary: no content lost — only exact duplicates are deleted; differing ones are renamed.
Primary: no dangling references — ingredient / menu references to a removed doc are repointed
to the kept one first.
Secondary: new duplicates can't enter master again.

## Execution Mode
Parallel: yes
Isolated DB: no (the fix is the Atlas data itself; backup first)

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
docs/session-state-<branch>.md, .claude/sessions/**, .worktree-*, and the append-only
hotspots (src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/scripts/dedupe-master-names.js
server/scripts/dedupe-master-names.test.js
server/routes/generic.js
server/services/sync-master.js
server/services/seed-master.js
server/test/**
src/app/pages/recipe-builder/**
src/app/pages/cook-view/cook-view.page.ts
src/app/core/resolvers/recipe.resolver.ts
src/app/core/services/user.service.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for approved: <path>; then
append the path to the scope block above and retry.

## Rules agreed with the Human (2026-10-05)

- Exact duplicate (same content, ignoring ids/owner/timestamps) → delete the extra.
- Differing content under the same name → rename (e.g. suffix "(מנה)" for a dish twin of a
  preparation, " 2"/" 3" otherwise). Nothing with distinct content is deleted.
- Before deleting, repoint every reference (ingredient `referenceId`, menu-event `recipeId`)
  from the removed doc to the kept one — master refs to the kept master, user refs to that
  user's clone of the kept master.
- User clones with `_userModified: true` are never touched; listed in the report.
- Full Atlas backup (`server/scripts/db-backup.js --target=atlas`) before any write.
- Dry-run report first; the Human approves the list before `--write`.

## Atomic Sub-tasks

- [x] A1: `server/scripts/dedupe-master-names.js` — cascading merge across suppliers → equipment → venues → products → recipes+dishes. Identical (after mapping refs; one-sided fields filled into the keeper; dead `eq_*` logistics treated as empty) → merge + repoint + delete; different → rename; `--force-delete=<name>`; dry run by default. Unit tests: `server/test/dedupe-master-names.test.js`.
- [x] A2: Human gate — dry run reviewed and approved 2026-10-05 (April versions of "רוטב לסלט איטריות" force-deleted, Human option 1).
- [x] A3: Atlas backup (`foodvibe-db-backups/atlas-2026-10-05T04-56-29`, 35,220 docs), then `--write`: 2,326 writes (870 deletes, 1,456 updates). Re-run dry run → 0 duplicate names, 0 dangling refs.
- [x] A4: Guard — push-to-master first push returns 409 when master already has the name (recipes+dishes share a namespace) — `server/routes/generic.js` + 2 tests in `push-to-master.test.js`.
- [x] A5: Dropped — signup clone (`clone-master.js`) mirrors master verbatim, so a clean master yields clean clones; push-to-master (A4) is the only runtime path inserting new master docs.
- [x] A6: "(מהמאגר המשותף)" tag only when `_masterId !== _id` (recipe-builder.page.ts).
- [x] A7: `npm run build` exit 0; server suite 81/81; recipe-builder specs 5/5.
- [x] A8: Guest can press the approve stamp (cook-view) — gate it like enterEditMode (sign-in prompt). Human-reported during validation 2026-10-05.
- [x] A9: After sign-in, a page still holding the guest-loaded master copy fails to save (master _id, not owned). Resolver maps a master id to the signed-in user's clone; after login rehydrate, a /cook/:id or /recipe-builder/:id URL on a master id is replaced by the user's clone URL. Scope approved by Human 2026-10-05.
- Follow-up (not this plan, handed to Planner as a brief): 116 master logistics refs still point at equipment ids that never existed (`eq_001`…). Client shows the generic push_to_master_error on the new 409 — a specific message would live in master-push.service.ts (out of scope).

## Success Criteria
- [x] [auto] Dry run after `--write` reports 0 duplicate-name groups in master.
- [x] [auto] `npm run build` exit 0; server test suite passes.
- [x] [human] "רוטב לסלט איטריות" can be approved/saved on the deployed app.
- [x] [human] Signed out on /cook/<id>: tapping the approve stamp asks to sign in and changes nothing.
- [x] [human] Open a recipe signed out, sign in on that page, tap the stamp once: it saves on the first try.
- [x] [human] Dry-run report reviewed and approved before any write.
