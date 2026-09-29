---
status: accepted
date: 2026-09-29
review-by: 2027-03-29
---

# 0008. Data layer moves to shared-master tenancy, Zod-validated schemas, and a unified taxonomy

## Context

An Architecture Audit (2026-09-29) found FoodVibe's workflow layer (AGENTS.md, ADRs, Plan
Contracts, job validation, CI with lint/build/tests/gitleaks/Semgrep) sitting on a data layer
that grew by patch, not by design: `server/routes/generic.js` is one schemaless `data/:type`
pipe where the client decides document shape and the server does no shape validation; tenancy
is a copy-the-whole-master-catalog-per-user model (`clone-master.js` + `sync-master.js`,
381 lines of 4-rule reconciliation, remapping every ingredient/equipment/supplier id on every
clone because each copy gets a random new id); there are 10+ single-doc `{ items: [] }`
"registries" with near-identical hand-rolled CRUD services; course × protein got welded into
compound `labels_` strings (`starter_chicken`, `main_dish_fish`) because `Recipe` had no course
field; there are three separate soft-delete mechanisms (`TRASH_*` collections, `_userDeleted`
tombstones, `hiddenBy[]`/`favoritedBy_[]` arrays written onto shared documents); persisted
field names use four different conventions; and the server has zero tests despite holding the
riskiest logic in the app (sync, clone, push-to-master, referential-integrity delete).

The real alternative to a structured, phased fix was continuing to patch symptoms as they
surfaced (as `plans/300`, `plans/319` did for dangling sub-recipe refs and orphan labels) —
rejected because the copy-per-user tenancy model and the schemaless write path are the root
cause generating those symptoms, and each new patch script (15 already exist under
`server/scripts/legacy-import/`) makes the eventual real fix larger, not smaller.

## Decision

Adopt `plans/321-professional-foundation-refactor.plan.md`'s 9-phase sequence, each phase ending
in `/ship` + Human validation, each phase starting with a mandatory Reality Check (the repo is
worked on by parallel sessions/worktrees, so no phase may assume the snapshot it was planned
against is still current). Four decisions are locked for the whole plan:

- **D1 — Tenancy → shared master + per-user overrides.** Replace per-user full-catalog clones
  with one master catalog and whole-document override shadows (`baseId` + `baseVersion`).
  Push-to-master becomes admin-only (the guard exists in `generic.js` today but is commented
  out) behind a dedicated confirmation modal, not the generic ternary confirm used today.
- **D2 — Validation → one shared Zod schema package for client and server.** Client TypeScript
  types are inferred from the schemas (`z.infer`), not hand-written, so client and server can't
  drift the way `core/models/*.ts` (client) and `generic.js`'s implicit shape (server) do today.
- **D3 — Taxonomy → `course` (single) + `protein` (single) + `labels` (freeform only).** Ends
  the compound-key weld; menu sections reference `course` instead of holding free-text names.
- **D4 — Naming → rename persisted fields to one convention (camelCase, no trailing `_`) in the
  same migration that introduces `schemaVersion`.**

Five decisions are deliberately left open as named gates (G1–G5) to be asked of the Human at
the specific phase step that needs them, not assumed now:

| Gate | Question | Ask at |
|---|---|---|
| G1 | Merge `RECIPE_LIST` + `DISH_LIST` into one `recipes` collection with `kind`? | Phase 2b Step 0 |
| G2 | Rename collections from `SCREAMING_CASE` to camelCase? | Phase 2b Step 0 |
| G3 | Kosher status (`meat`/`dairy`/`pareve`) as its own `kosherType` axis, separate from `protein`? | Phase 4 Step 0 |
| G4 | Legacy "ideas (preparations/dishes)" categories: a workflow `status`, or a label? | Phase 4 mapping review |
| G5 | Preparation-family legacy categories: labels, or the existing preparation-category registry? | Phase 4 mapping review |

## Consequences

Easier: a new entity type becomes "schema → migration → repo → store" instead of a bespoke
service; adding a classification axis is a config line in `taxonomyTerms`, not a new registry
service; a new signup/login stops triggering bulk writes; server logic finally has a regression
oracle (Phase 0's characterization tests, ≥25 required, cover `generic.js`, `sync-master.js`,
push-to-master as they behave today — including known flaws — so Phase 5's tenancy change has
something to prove itself against).

Harder / accepted: this is the highest-risk sequence of migrations the project has run —
Phase 2b (rename) touches most of `src/app`, and Phase 5 (shared master) changes what every
user's data actually *is*, not just its shape. The plan's mitigations (dry-run-by-default
migrations, Atlas-write-only-after-Human-host-confirm, golden-view diffing before Phase 5's
write, growth-frozen-file line budgets) are load-bearing, not optional ceremony. Five real
product/architecture calls (G1–G5) are deferred rather than guessed at now — phases before
theirs proceed without them; phases that need them block on an explicit Human answer.

## Review

At the review-by date, or at Phase 8 (Governance) if it lands first: check that G1–G5 were
actually answered (not silently defaulted), that the re-run Architecture Audit (P8.5) shows
data-integrity and taxonomy at "Strong" with evidence, and that no phase skipped its Reality
Check or its Human validation gate. If the plan stalled mid-phase, check `.claude/todo.md`'s
Plan 321 entry and `docs/session-state-foundation-refactor.md` for where it stopped and why.
