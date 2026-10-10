# Plan 402 — Dropdown add option, part 3: convention doc and trigger

Status: draft
Track: code — here (not design)
Snapshot: 0ca1ac799a023b3baf09e4382a916b3ffa6f9de9

## Problem Statement
Plans 400–401 make every dropdown's "add" option follow one rule (from plan 398, Human-validated
2026-10-10). The Human wants it to be a standing convention, so every new dropdown follows it
without anyone remembering.

The brief named `docs/agent/conventions.md`, but that file is kit-owned
(`docs/workflow-kit/kit-owned.json`) and kit-generic, and this rule is FoodVibe-specific (Hebrew
labels, `translatePipe`, `KeyResolutionService`, `add_new_<thing>` keys). It goes in
`docs/agent/standards-domain.md` (project-owned; already covers translation keys and Hebrew
values), with the trigger row in `AGENTS.md`.

## Goals & Success Criteria
- Primary: the add-option rule is written once, points at the shared helper, and a trigger
  sends any agent building a dropdown with add to it.
- Success:
  - [auto] `rg -n "add-option rule" AGENTS.md docs/agent/standards-domain.md` prints a hit in each file.
  - [auto] `node scripts/kit-owned.mjs --check` passes (no kit-owned file changed).
  - [auto] `node scripts/kit-manifest-check.mjs` passes.
  - [human] The Human reads the rule section and confirms it matches what they asked for.

## Execution Mode
- Parallel: no
- Run after: plan 400 merged (the doc names its helper and component).
- Concurrent plans: none touching `AGENTS.md` or `docs/agent/standards-domain.md`
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
docs/agent/standards-domain.md
AGENTS.md
docs/brain/patterns/dropdown-add-option.md
docs/brain/index.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — documentation only.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the Human, I want any agent that builds a new dropdown with "add" to follow the add-option
  rule by default, without me re-explaining it.

## Functional Requirements

### Must Have (P0)
- [ ] `docs/agent/standards-domain.md`: an "Add-option rule (dropdowns)" section with the five
      rules (one option; `הוסף "<typed>"` vs `הוסף <thing> חדש/ה`, never bare "הוסף"; search by
      translated label; select the stored key, nothing on cancel; last option, arrows + Enter),
      and "use `core/utils/add-option.util.ts` + `shared/add-option-row`; shared selects already
      do it" (names as merged in plan 400).
- [ ] `AGENTS.md` skill-trigger table: row "New dropdown with add, or changing one → follow the
      add-option rule" → `docs/agent/standards-domain.md`.
- [ ] Brain pattern `docs/brain/patterns/dropdown-add-option.md` (per `docs/agent/brain-capture.md`)
      + index line, pointing at the standard (no duplicated rule text).

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- none (docs only).

## Atomic Sub-tasks
- [ ] A1: Rule section in `docs/agent/standards-domain.md` (helper/component names from merged plan 400)
- [ ] A2: Trigger row in `AGENTS.md`
- [ ] A3: `docs/brain/patterns/dropdown-add-option.md` + line in `docs/brain/index.md`
- [ ] A4: `rg`, `kit-owned --check`, `kit-manifest-check` green (classify the new pattern file in `docs/workflow-kit/manifest.json` via `approved:` if the check asks); Human reads the rule

## Technical Considerations
- `AGENTS.md` is the shared source for Claude and Cursor; keep the row short like the others.

## Out of Scope
- Code changes (plans 400–401).
- Kit-generic wording in `conventions.md` (kit-owned; would need ADR 0018 kit-first flow).

## Critical Questions
- none
