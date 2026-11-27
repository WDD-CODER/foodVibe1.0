# Plan 741 — Move the proven house-rules mechanism into the workflow kit so every project gets it

Status: draft
Depends-on: 740
Track: code
Snapshot: 72a33e4c7cc77199563b28ba9fa9adde21844ebc

## Problem Statement
Dandan (2026-11-25): the house rules (plans 739, 740) are piloted in FoodVibe first; "if it works correctly then we
build this into the kit so it works in every other project", and "I want a plan for this upgrade to the kit to be
inside this project — if in a week I ask what we have left, this is one of our plans." This plan is that reminder and
the hand-over. The kit work itself is planned in the kit repository (`../ai-workflow-kit/plans/`, its own numbering,
ADR 0021); this plan checks the proof, writes that kit plan, and brings the release back into FoodVibe.

It matches an older decision still in force: D125 (2026-10-22), "the design workflow must become part of the kit,
reusable across projects" (`docs/brain/human-decisions.md`).

**The split.** The kit owns the mechanism: a house-rules template, the rule that a page-adding plan names its recipe,
the gate that checks it, and seed behaviour defaults as `proposed`. Each project owns its rules: its recipes, its
pieces, its look.

**Proof gate — do not start before it is met.** `## Pilot log` in `docs/agent/house-style.md` (created by plan 740)
has at least three rows for plans that added a page after plan 740 merged, each with `fix-up: none`. A row with a
fix-up plan number does not count, and its cause is fixed in the rules first.

Verified on `origin/main` 72a33e4c:
- Kit-owned files reach FoodVibe only by a kit release and `kit-sync -Ref vX.Y.Z -Apply` (`AGENTS.md`, ADR 0021).
- `kit.config.json` `overrides` already lists `docs/brain/component-families.md` and
  `scripts/lib/registry-families.mjs` as FoodVibe's own; `paths.planChecks` points at `docs/agent/plan-checks.md`.

## Goals & Success Criteria
**Primary:** the mechanism is in a released kit version, FoodVibe runs on that version with its own rules untouched,
and a second project can adopt it by filling one template.

- [auto] `grep -c "fix-up: none" docs/agent/house-style.md` prints at least `3` (the proof gate; paste the rows).
- [auto] after the sync: `node scripts/kit-manifest-check.mjs` exits 0.
- [auto] after the sync: `git diff origin/main -- docs/agent/house-style.md` shows no removed rule (the project's rules survive the sync).
- [auto] `pnpm run build` exits 0; `pnpm run lint` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/741-promote-house-rules-to-the-kit.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/741-promote-house-rules-to-the-kit.plan.md` exits 0.
- [human] Card — the kit plan: read the kit plan the Planner wrote in the kit repository (the Planner gives its path); it moves the mechanism and none of FoodVibe's own rules; reply `approved` or the changes.
- [human] Card — the gate works here: after the sync, ask the Planner to save a small test plan that adds a page with no `Page recipe:` line; the save is refused with a line that names the missing recipe.

## Execution Mode
- Parallel: no — it ends with a kit sync, which touches many kit-owned files.
- Concurrent plans: none during the sync step (A5).
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating). This plan writes no hotspot.

```scope
docs/agent/house-style.md
docs/agent/plan-checks.md
docs/brain/decisions/**
docs/brain/index.md
kit.config.json
docs/workflow-kit/**
```

The files a kit sync rewrites are written by `kit-sync` itself and shipped as the sync's own change, as every kit
version bump is.

## Read Scope

Entire repo, and `../ai-workflow-kit` (read; its changes go through a kit branch and pull request, never from here).

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — workflow documents, the kit version and kit-owned workflow scripts. No app or server code,
  route, schema, permission, AI call or stored data changes.

## Reuse Check
- none — no app component, util, pipe, service or `.c-*` class is created.

## Defaults

- unsaved-changes-on-leave — exception — why: no form is built.
- confirm-destructive-action — exception — why: no action is built.
- empty-state-on-list — exception — why: no list is built.
- loading-and-error-states — exception — why: no screen is built.
- hints-in-tooltips — exception — why: no control is built.
- unit-dropdown-add — exception — why: no dropdown is built.
- leave-and-return — exception — why: no page flow is built.
- app-list-container — exception — why: no list is built.
- one-breakpoint-set — exception — why: no SCSS is written.
- anchored-popup — exception — why: no floating box is built.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As someone who builds several products with AI, I want every project to learn its own rules and defaults before it builds a page, so that each product feels built by one company.

## Functional Requirements

### Must Have (P0)
- [ ] **Proof gate (Planner):** count the `fix-up: none` rows of `## Pilot log`. Fewer than three → stop, tell the
  Human the count and which page-adding plans are open; nothing else in this plan runs.
- [ ] **What moves (Planner):** from `## Kit needs` in `docs/agent/house-style.md` and from what plan 740 built, list
  for each item `mechanism (kit)` or `content (project)`. Content never moves: FoodVibe's recipes, its `built from`
  pieces, its `house-…` lint patterns and its tokens stay here.
- [ ] **The kit plan (Planner, in the kit repository, kit branch + pull request):** written under
  `../ai-workflow-kit/plans/` with the kit's next number. It covers at least: (1) a seed `house-style.md` template —
  the field shape of plan 739, the five recipe ids and seven behaviour ids as empty sections a project fills, the
  `Pilot log` and no project content; (2) the `Page recipe:` line in the PRD template and the review bullet in
  `/plan`; (3) a gate `scope-check --recipe` that fails a plan that adds a page with no valid `Page recipe:` line,
  and its place in the save-plan checklist; (4) the behaviour rules as seed product defaults with `status: proposed`;
  (5) a trigger row in the kit's `AGENTS.md` template ("before any new page or route"); (6) a config key for the
  house-style path, and `house-style.md` treated like `component-families.md`: seeded once, then project-owned;
  (7) the adoption steps for a project that has no rules yet (write the rules from its best screens, then audit).
- [ ] **Bring it back (Worker, FoodVibe slot):** after the kit release, `kit-sync -Ref vX.Y.Z -Apply`, then remove
  from `docs/agent/plan-checks.md` the `## Page recipe` text the kit now owns, leaving one line that points at the
  kit's check; add the config key to `kit.config.json`; `/ship`.
- [ ] **Record it:** an ADR under `docs/brain/decisions/` with the next free number — the pilot, the proof, the
  kit / project split, the kit version — and its line in `docs/brain/index.md`.

## UI/UX Notes
- Page recipe: none — this plan builds no page.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked. A1–A4 are
Planner steps in the main folder and the kit repository; A5–A7 run in a FoodVibe slot.

- [ ] A1: Check that the rules really worked on three new pages before anything moves to the kit — count the Pilot log rows with no fix-up; stop when fewer than three — docs/agent/house-style.md
- [ ] A2: Sort what the pilot built into what every project needs and what is only FoodVibe's — the mechanism / content list under Execution Notes — this plan file
- [ ] A3: Write the kit's own plan for the mechanism in the kit repository — the seven items of P0, through a kit branch and pull request — ../ai-workflow-kit/plans (the kit's next number)
- [ ] A4: Get Dandan's approval of the kit plan, then build and release it the kit's way — the kit plan card; the release tag under Execution Notes — this plan file
- [ ] A5: Bring the released kit version into FoodVibe and drop the pilot text the kit now owns — kit-sync with the release tag, the plan-checks pointer line, the config key — docs/agent/plan-checks.md, kit.config.json, docs/workflow-kit/**
- [ ] A6: Record the decision so the next project knows how the rules got into the kit — the ADR and its index line — docs/brain/decisions/**, docs/brain/index.md
- [ ] A7: Run every check and hand Dandan the gate card — outputs under Execution Notes — this plan file

## Technical Considerations
- Dependencies: plan 740 merged; the kit repository at `../ai-workflow-kit`; `kit-sync`.
- New files needed: one ADR here; the kit plan and the kit's files in the kit repository.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none.
- Project checks: Reuse Check (`- none`); no app code, so the log-query item does not apply.
- The kit stays private: nothing in a public document links to it or explains it.

## Out of Scope
- FoodVibe's alignment work (the plans drafted from plan 739's audit).
- Moving any FoodVibe rule, recipe content, lint pattern or token into the kit.
- Adopting the mechanism in another project (that project's own plan).

## Critical Questions
- Q: How many clean new pages prove it? A: three, each built after plan 740 with no style fix-up (Dandan approved the design, 2026-11-25).

## Execution Notes
