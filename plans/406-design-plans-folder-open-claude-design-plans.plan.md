# Plan 406 — Design plans folder: open Claude Design plans live in plans/design/

Status: active
Track: code — here (not design)
Snapshot: 34711de5f66c48518097d15b77edbe8e909b98c1

## Problem Statement
The Human wants open **design** plans in their own folder for easy access: `plans/design/`.
"Design" = mostly style and layout — the work you would do in Claude Design (Track `design` or
`split`). Finished plans, design or not, keep going to the general archive (`plans/<range>/`, e.g.
`plans/400-500/`) exactly as today.

Today every plan tool only sees open plans at the flat path `plans/NNN-*.plan.md`, so moving one
into a subfolder makes it un-takeable, unguarded and never auto-closed. All of these files are
kit-owned (`docs/workflow-kit/kit-owned.json`), so the change goes kit-first, then into FoodVibe
as a patch (ADR 0018):

| File | Flat-path assumption |
|---|---|
| `scripts/take-plan.mjs` | ~L206 `^plans/${nnn}-[^/]+\.plan\.md$`; ~L260 prerequisite lookup `plans/${p}-` |
| `scripts/todo-query.mjs` | ~L35/287/292/420 `PLANS_DIR` readdir → `plans/${match}` |
| `scripts/scope-check.mjs` | ~L180–182 readdir `plans/`; ~L265 pathspec `plans/*.plan.md` |
| `scripts/lib/slot.mjs` | ~L50–53 readdir `plans/` |
| `scripts/plan-close.mjs` | ~L25/95–112 flat files only → `plans/<range>/` |
| `scripts/next-plan-number.mjs` | ~L37 local `listPlans` flat (origin side already `ls-tree -r`) |
| `scripts/plan-ledger-check.mjs`, `scripts/plan-name-similarity.mjs` | verify they already recurse; fix if not |
| `scripts/branch-guard.sh` | ~L104 Planner write allowed only for `^plans/[^/]+\.plan\.md$` |
| `.husky/pre-push` | ~L20 Planner push to main allowed only for `^plans/[^/]+\.plan\.md$` |
| `scripts/plan-write-guard.sh` | regex `plans/.+\.plan\.md` — check the NEW-file path handling |
| `.claude/skills/save-plan/SKILL.md` | "Path `plans/<NNN>-<slug>.plan.md`" |

Also on branch `chore/plans-tidy-design-folder` (local, unpushed, commit `c4665aac`): done plan 318
filed from `plans/` to `plans/300-400/` (plan-close skipped it — no archived todo section) + its two
refs in `.claude/todo.md`. Main's pre-push refuses range-folder moves, so it rides this plan's PR.

## Goals & Success Criteria
- Primary: open design plans live in `plans/design/NNN-*.plan.md`; every plan tool treats them
  exactly like flat open plans; on close they go to `plans/<range>/` like any other plan.
- Success:
  - [auto] `npm run test:scripts` passes, with new tests: `take-plan` resolves `plans/design/374-*.plan.md` from a fixture tree; `plan-close` moves a closable `plans/design/NNN-*` to `plans/<range>/`; `next-plan-number` counts a local `plans/design/` plan; `isOpenPlanPath` accepts `plans/design/x.plan.md`, rejects `plans/300-400/x.plan.md` and `plans/archive/x.plan.md`.
  - [auto] `bash scripts/branch-guard.sh` fed a Write to `plans/design/999-x.plan.md` on `main` allows it; a Write to `plans/300-400/999-x.plan.md` is still blocked.
  - [auto] `.husky/pre-push` logic (extracted test or dry run) accepts `plans/design/NNN-*.plan.md` to main and still refuses `plans/<range>/…` and code files.
  - [auto] `git ls-files plans/design` lists `372-…`, `373-…`, `374-…` (+ `README.md`); `node scripts/plan-ledger-check.mjs` ends `PLAN_LEDGER: OK`; `node scripts/todo-query.mjs open` still shows their tasks.
  - [auto] `ls plans/300-400/318-*` exists and `ls plans/318-*` fails.
  - [auto] `node scripts/kit-owned.mjs --check` and `node scripts/kit-manifest-check.mjs` pass; `git grep -n "{{" -- $(git diff --name-only origin/main)` finds nothing.
  - [auto] `ng build` passes.
  - [human] The Human opens `plans/design/` and sees only open design plans; a plan that closes ends up in the range folder.
  - [human] Kit PR reviewed and merged by the Human; FoodVibe commit names the kit sha.

## Execution Mode
- Parallel: no (touches the plan tooling every slot uses — run when no other slot is mid-`take-plan`).
- Single Worker in a FoodVibe `wt-N` slot; kit edits by path in `../ai-workflow-kit` on branch
  `feat/406-plans-design-folder` + kit PR (Human merges).
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/lib/plan-paths.mjs
scripts/take-plan.mjs
scripts/todo-query.mjs
scripts/scope-check.mjs
scripts/lib/slot.mjs
scripts/plan-close.mjs
scripts/next-plan-number.mjs
scripts/plan-ledger-check.mjs
scripts/plan-name-similarity.mjs
scripts/branch-guard.sh
scripts/plan-write-guard.sh
.husky/pre-push
scripts/test/**
.claude/skills/save-plan/SKILL.md
.claude/todo.md
plans/design/**
plans/372-venues-b-multiple-contacts-hours-picker.plan.md
plans/373-venues-c-tour-videos-current-location.plan.md
plans/374-venues-d-infrastructure-vs-equipment-groups.plan.md
plans/318-nightly-maintenance-followups-2026-09-27.plan.md
plans/300-400/318-nightly-maintenance-followups-2026-09-27.plan.md
docs/workflow-kit/manifest.json
docs/workflow-kit/kit-owned.json
docs/brain/decisions/0*-plans-design-folder.md
docs/brain/index.md
AGENTS.md
```

Kit side (by path, kit branch): the same files under `../ai-workflow-kit/core/**`, `../ai-workflow-kit/kit.config.json`, kit tests and docs.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — dev/plan tooling only; no app code, routes, schemas or AI calls change.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the Human, I open `plans/design/` and see every open design plan in one place, and nothing
  else breaks: I can still say "execute plan 374", and it still archives itself when merged.

## Functional Requirements

### Must Have (P0)
- [ ] **Kit config:** new key `plans.openDirs` (list, default `["plans"]`) in
      `kit.config.json`; templated into the scripts the way other list keys are (e.g.
      `paths.hotspots`). FoodVibe value: `["plans", "plans/design"]`.
- [ ] **One helper** `scripts/lib/plan-paths.mjs`: `OPEN_PLAN_DIRS`, `isOpenPlanPath(rel)`,
      `listOpenPlans(root)` (rel paths, `*.plan.md` directly inside each open dir — never range
      folders or `archive/`), `findOpenPlan(root, nnn)`, and a regex/string for the shell guards.
      Every script in the table uses it instead of its own `plans/` readdir/regex.
- [ ] `take-plan`: resolves `plans/design/NNN-*` on `origin/main` (and prerequisites there).
- [ ] `plan-close`: closable plans from every open dir → `plans/<range>/<file>`.
- [ ] `branch-guard.sh` + `.husky/pre-push`: Planner may write/push `plans/design/NNN-*.plan.md`
      on `main` like flat plans; range folders and everything else unchanged.
- [ ] `save-plan` skill: "Track `design` or `split` → `plans/design/NNN-slug.plan.md`; otherwise
      `plans/NNN-slug.plan.md`. Closed plans always go to the range folder."
- [ ] Move FoodVibe's open design plans 372, 373, 374 (`git mv`) into `plans/design/`; update
      their `.claude/todo.md` section paths. Add `plans/design/README.md` (3 lines: what goes
      here, what doesn't, closed plans go to the range folder).
- [ ] Bring in commit `c4665aac` from `chore/plans-tidy-design-folder` (plan 318 → `plans/300-400/`).
- [ ] Kit-first per ADR 0018: kit branch + tests green there → patch → `git apply` on the slot
      branch; templated hunks by hand with FoodVibe values; no `{{` in FoodVibe.

### Should Have (P1)
- [ ] ADR `0NNN-plans-design-folder.md` (next free number) + brain index line; one short line in
      `AGENTS.md` hard rules ("open design plans live in `plans/design/`").

### Nice to Have (P2)
- none

## UI/UX Notes
- none (tooling only).

## Atomic Sub-tasks
- [x] A1: Kit: `plans.openDirs` config key + `core/scripts/lib/plan-paths.mjs` + tests — `../ai-workflow-kit/kit.config.json`, `../ai-workflow-kit/core/scripts/lib/plan-paths.mjs` (tests live in FoodVibe `scripts/test/plan-paths.test.mjs`; the kit has no unit-test runner, its gate is `tools/install-check.mjs`)
- [x] A2: Kit: switch take-plan, todo-query, scope-check, lib/slot, plan-close, next-plan-number (+ ledger/similarity if flat) to the helper; tests — `../ai-workflow-kit/core/scripts/**`
- [x] A3: Kit: branch-guard.sh, pre-push, plan-write-guard.sh accept open dirs; save-plan skill text — `../ai-workflow-kit/core/**`
- [x] A4: Kit PR on `feat/406-plans-design-folder`; Human merges — `../ai-workflow-kit` (merged: WDD-CODER/ai-workflow-kit#6, merge c1a015a6)
- [x] A5: Patch into FoodVibe per ADR 0018 (hand-edit templated hunks, `{{` grep clean) — the scripts in scope, `.husky/pre-push`, `.claude/skills/save-plan/SKILL.md`
- [x] A6: Plan 318 filing — done by PR #395; if it is merged, just tick this. Otherwise cherry-pick `512584b0` (plan 318 filed) — `plans/300-400/318-…`, `.claude/todo.md`
- [x] A7: `git mv` 372/373/374 → `plans/design/`, fix their `.claude/todo.md` section paths, add `plans/design/README.md` — `plans/design/**`, `.claude/todo.md`
- [x] A8: ADR + brain index + AGENTS.md line (P1) — `docs/brain/decisions/`, `docs/brain/index.md`, `AGENTS.md`
- [x] A9: `npm run test:scripts`, guard dry runs, `plan-ledger-check`, `kit-owned --check`, `kit-manifest-check`, `ng build`; hand the Human the check list

## Technical Considerations
- `.claude/todo.md` is Planner-owned; this plan's scope allows the Worker to fix only the path
  in the 372/373/374 section headers and the two 318 refs — no other ledger edits.
- After merge, the Planner runs `node scripts/take-plan.mjs 374 --dry-run` (or equivalent) once
  from main to confirm design plans are still takeable.
- Plan 404 (Cook View redesign) lives on its wt-3 branch; it closes to the range folder on merge
  like any plan — no move needed.

## Out of Scope
- Moving closed design plans out of the range folders (the Human wants them in the general archive).
- Plans 392 (kit adoption) — this plan uses ADR 0018 patch mode as it stands.

## Critical Questions
- none
