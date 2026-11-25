# Plan 740 — A new page is built to the house rules from the start: plan check, proposed defaults and lint rules

Status: draft
Depends-on: 739, 742
Track: code
Snapshot: 72a33e4c7cc77199563b28ba9fa9adde21844ebc

## Problem Statement
Dandan (2026-11-25): "if I make a new route right now I shouldn't need to take it through the style QA to see what is
wrong and fix it. Once it starts building, it works according to the rules. If it makes a list, it knows it needs the
list container." Plan 739 writes the rules (`docs/agent/house-style.md`); nothing reads them yet. This plan wires each
rule into the three places a builder already passes: the plan, the product defaults and the diff lint. It is the
FoodVibe pilot of a mechanism that moves to the kit once proven (plan 741), so it writes project-owned files only.

Verified on `origin/main` 72a33e4c:
- `docs/agent/plan-checks.md` is FoodVibe's own planning checklist; `/plan`'s Architect + PM review adds its checks to
  every plan the Planner saves (`AGENTS.md`, "Architect + PM review").
- `_shared/product-defaults.md` holds the product defaults; an `on` default is added to every plan that triggers it.
  Only the Human turns one on (`.claude/skills/product-defaults/SKILL.md`); an agent writes `status: proposed`.
- `scripts/lib/registry-families.mjs` (`REUSE_RULES`) is a project override (`kit.config.json` `overrides`), read by
  `node scripts/reuse-lint.mjs --diff=<base>`, which warns on added lines only; every rule names a family that has a
  `###` heading in `docs/brain/component-families.md` (`--check-registry`).
- `src/styles.scss:156-162` has the easing tokens and three duration tokens (`--dur-fast` 0.15s, `--dur-base` 0.2s,
  `--dur-slow` 0.25s); only Cook View uses the duration tokens. `.interface-design/system.md` "Animation" lists the
  easing tokens and gives the durations in words only.
- Plan 742 (merged first) builds the shared drag look, the scroll area and the focus ring, so every rule in
  `docs/agent/house-style.md` names a piece that exists and no rule is `lint after …`.
- `docs/qa/styleqa-theme.md` is what the Style QA reviewer reads about the project's look.

## Goals & Success Criteria
**Primary:** a plan that adds or reshapes a page cannot be saved without naming its recipe; every behaviour rule is a
product default waiting for the Human's yes; a diff that breaks a lint-checkable rule gets a warning that names the
rule and the piece to use.

- [auto] `grep -c "^## Page recipe" docs/agent/plan-checks.md` prints `1`.
- [auto] for every rule in `docs/agent/house-style.md` with `- check: default`, `_shared/product-defaults.md` has a `### house-<id>` section whose status line is `- status: proposed` (paste the two counts; they are equal). `grep -c "^- status: on" _shared/product-defaults.md` prints the same number before and after this plan (no default turned on by the builder).
- [auto] for every rule with `- check: lint` (not `lint after …`), `scripts/lib/registry-families.mjs` has a rule whose id is `house-<id>` (paste the two counts; they are equal).
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/reuse-lint.mjs --diff=origin/main` prints no `REUSE: warn` line for a file this plan changed.
- [auto] `grep -c "dur-fast\|dur-base\|dur-slow" .interface-design/system.md` prints at least `3`; `git diff --name-only origin/main -- src` prints nothing (no app file changes).
- [auto] `grep -c "^## Pilot log" docs/agent/house-style.md` prints `1`.
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/740-house-rules-enforced-at-build-time.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/740-house-rules-enforced-at-build-time.plan.md` exits 0; `node scripts/scope-check.mjs --diff=origin/main --plan=plans/740-house-rules-enforced-at-build-time.plan.md` exits 0.
- [human] Card — the proposed defaults: read the `### house-…` sections at the end of `_shared/product-defaults.md`; reply `default yes <id>` or `default no <id>` for each (one reply for all).
- [human] Card — the plan check reads right: read the `## Page recipe` section of `docs/agent/plan-checks.md` (one minute); it says what you expect a plan that adds a page to state; reply `done` or the change.

## Execution Mode
- Parallel: no — writes `_shared/product-defaults.md`, `docs/agent/plan-checks.md` and `scripts/lib/registry-families.mjs`, which other plans append to.
- Concurrent plans: none that write those three files or `docs/brain/component-families.md`.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating). This plan writes no hotspot.

```scope
docs/agent/plan-checks.md
docs/agent/house-style.md
_shared/product-defaults.md
scripts/lib/registry-families.mjs
docs/brain/component-families.md
docs/brain/inventory.md
docs/qa/styleqa-theme.md
.interface-design/system.md
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. A change that needs a kit-owned file
(`docs/workflow-kit/kit-owned.json`) is never asked as `approved:`: write it as one line under
`## Kit needs` in `docs/agent/house-style.md` and go on without it.

## Architecture Impact
- INV-none: preserves — planning documents and lint rule data. No app or server code, route, schema, permission,
  AI call or stored data changes.

## Reuse Check
- none — no component, util, pipe, service or `.c-*` class is created; the plan writes documents and lint rule data.

## Defaults

- unsaved-changes-on-leave — exception — why: no form is built.
- confirm-destructive-action — exception — why: no action is built.
- empty-state-on-list — exception — why: no list is built; the default is only cited.
- loading-and-error-states — exception — why: no screen is built; the default is only cited.
- hints-in-tooltips — exception — why: no control is built.
- unit-dropdown-add — exception — why: no dropdown is built.
- leave-and-return — exception — why: no page flow is built.
- app-list-container — exception — why: no list is built; the default is only cited.
- one-breakpoint-set — exception — why: no SCSS is written.
- anchored-popup — exception — why: no floating box is built.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef who adds screens with AI, I want every new page to be built from the app's own recipe, so that I never run a style clean-up after a feature.
- As a chef, I want to answer once how my app scrolls, drags and moves, so that every later plan keeps it without my asking.

## Functional Requirements

### Must Have (P0)
- [ ] **Plan check — `docs/agent/plan-checks.md`, new section `## Page recipe`** (after `## Reuse Check`): every plan
  that adds a page or a route, or changes the frame of one (header, list, sections, scroll area), has under
  `## UI/UX Notes` one line per page: `Page recipe: <recipe id> — <page>` with the id a `### recipe-…` heading of
  `docs/agent/house-style.md`; the plan's steps build the page from that recipe's `built from` pieces and its
  `states`. `Page recipe: none — <why>` is allowed only for a page with no screen of its own (a print sheet, a
  redirect). A page no recipe fits is `Page recipe: new — <why>`: an `open:` line in the review, the Human decides,
  and a yes adds the recipe to `docs/agent/house-style.md` in the same plan. The section also says: a plan that
  builds a drag, an inner scroll area or an animation names the behaviour rule it follows (`Behaviour: <id>`).
- [ ] **Proposed defaults — `_shared/product-defaults.md`:** for every rule in `docs/agent/house-style.md` with
  `check: default`, append one `### house-<id>` section in the file's field shape: `status: proposed`; `rule` (the
  rule's sentence); `applies when` (`screen`, `list` or `custom` with `plan words` taken from the rule's
  `applies to`); `how` (the rule's `built from`); `check: card`; `card` (the rule's card); `exceptions`. Never
  `status: on` and never a `turned on:` line. A rule whose `existing default` is not `none` gets no new section:
  its house-style entry already points at that default.
- [ ] **Lint rules — `scripts/lib/registry-families.mjs`:** for every rule with `check: lint`, append one entry to
  `REUSE_RULES` with `id: 'house-<id>'`, the `files`, `pattern` and `hint` the rule gives, `exclude` for the shared
  piece's own folder and for `**/*.spec.ts`, and `family` = the registry family in the rule's `built from` (when it
  names tokens only, `engine-classes`). Before adding, run the pattern over the six standard screens' files: a
  pattern that matches a line the rules call correct is narrowed, or the rule's check is changed to `card` with one
  `behaviour:` decision under Execution Notes. After plan 742 no rule is `lint after …`; one that still is, is skipped and
  listed under Execution Notes.
- [ ] **Motion tokens in the design system — `.interface-design/system.md`:** add `--dur-fast`, `--dur-base` and
  `--dur-slow` (they already exist in `src/styles.scss:160-162`) to the "Animation" table with their values and
  uses, as the `motion` rule of `docs/agent/house-style.md` gives them. `src/styles.scss` is not changed.
- [ ] **Registry — `docs/brain/component-families.md`:** one line under the opening section pointing at
  `docs/agent/house-style.md` ("which pieces make a whole page, and how pages behave"), and under each family a
  recipe uses, a line `- Recipes: <recipe ids>`. Regenerate `docs/brain/inventory.md` with `node scripts/inventory.mjs`.
- [ ] **Style QA reads the behaviour facts — `docs/qa/styleqa-theme.md`:** a `## House rules` section of at most ten
  lines: one line per recipe (what the page frame is) and the visible part of `scroll`, `motion` and `empty`, each
  naming the token or piece.
- [ ] **Pilot log — `docs/agent/house-style.md`:** a `## Pilot log` section with the table header
  `| plan | page added | recipe | style fix-up after the build | date |` and no rows, and one line saying the
  Planner adds a row when a plan that added a page closes (`fix-up: none`, or the plan number of the fix). Plan 741
  reads it.
- [ ] **Kit needs — `docs/agent/house-style.md` `## Kit needs`:** append what this pilot could not do in
  project-owned files, at least: a gate that fails a page-adding plan with no `Page recipe:` line
  (`scope-check --recipe`), the `Page recipe:` line in the PRD template, the review bullet in `/plan`, a trigger row
  in `AGENTS.md`.

## UI/UX Notes
- Page recipe: none — this plan builds no page.
- No dictionary key and no app file: nothing on screen changes.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Make every plan that adds a page name the recipe it is built from — the new Page recipe section — docs/agent/plan-checks.md
- [ ] A2: Offer each behaviour rule to Dandan as a product default he can turn on with one word — one proposed section per rule marked default — _shared/product-defaults.md
- [ ] A3: Warn in the diff when new code breaks a rule a script can see — one house lint rule per rule marked lint, each tried on the six standard screens first — scripts/lib/registry-families.mjs
- [ ] A4: Write the three motion speeds into the design system so builders find them — three rows in the Animation table — .interface-design/system.md
- [ ] A5: Point builders and the style reviewer at the rules where they already look — the registry pointer and Recipes lines, the regenerated inventory, the House rules section — docs/brain/component-families.md, docs/brain/inventory.md, docs/qa/styleqa-theme.md
- [ ] A6: Start the record that proves the rules work, and list what the kit must own — the Pilot log table and the Kit needs lines — docs/agent/house-style.md
- [ ] A7: Run every check of this plan and hand Dandan the two cards — outputs under Execution Notes — this plan file

## Technical Considerations
- Dependencies: `scripts/reuse-lint.mjs` (read only; it is not changed), the product-defaults skill, `/plan`'s review.
- New files needed: none.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: Reuse Check (`- none`); no hotspot written; no app code, so the log-query item does not apply; no
  Hebrew string.
- The gate in this pilot is the Planner's review reading `docs/agent/plan-checks.md`; a script gate is a kit need
  (plan 741). It edits nothing under `.claude/`.

## Out of Scope
- Changing any existing page, style or component to follow the rules (the alignment plans from plan 739's audit).
- Building a missing shared piece (a `needs:` entry), such as a shared drag pattern.
- Any kit-owned file, the PRD template, `scripts/scope-check.mjs`, `scripts/reuse-lint.mjs`, `AGENTS.md`.
- Turning a default on.

## Critical Questions
- Q: Does the pilot stay in project-owned files? A: yes — the mechanism moves to the kit only after it is proven (Dandan, 2026-11-25).

## Execution Notes
