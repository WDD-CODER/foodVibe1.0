# Plan 184 — Agent System Refactor

## Problem Statement

A full audit of the `.claude/` agent guidance system revealed 14 issues ranging from broken
references that silently misdirect agent behavior, to contradictions between agent persona files
and the canonical rules in `copilot-instructions.md`, to non-portable shell syntax in skills
that run in a bash environment. Left unfixed, these cause inconsistent behavior, wasted turns
diagnosing wrong outputs, and safety gates that fail silently.

CLAUDE.md bootstrap gap was resolved separately (session 2026-03-19) — not in scope here.

## Goals & Success Criteria

- Every skill in `.claude/skills/` can be executed without hitting a broken reference or
  ambiguous instruction
- No agent persona file contradicts `copilot-instructions.md`
- All shell commands in skills and commands use bash syntax, not PowerShell
- `validate-agent-refs.md` can run autonomously and catch real regressions
- Agent invocation is documented so any IDE/agent knows when and how to engage a persona

## Functional Requirements

### Must Have (P0) — CRITICAL

- [ ] **P0-1**: Fix broken `"Explore agent"` reference in `techdebt/SKILL.md`
  - Line 25 says "Use Explore agent for copy-pasted blocks" — no such agent exists in `.claude/agents/`
  - Fix: replace with concrete search instruction (grep/Glob for duplicated blocks)

### Must Have (P0) — HIGH

- [ ] **P0-2**: Resolve QA Engineer conflict with `copilot-instructions.md` Section 3
  - `qa-engineer.md` "When to Invoke" invites test authoring during iterative development
  - Section 3 forbids writing/updating specs during iterative execution (only commit-to-github Phase 0 or explicit ask)
  - Fix: add a clear constraint block to `qa-engineer.md` (see Critical Question Q1)

- [ ] **P0-3**: Replace PowerShell syntax with bash in all three files:
  - `update-docs/SKILL.md` Phase 1 — uses `Get-ChildItem`-style enumeration
  - `test-pr-review-merge.md` — uses `$branch = ...Trim()`, `$pr = ...Trim()`
  - `validate-agent-refs.md` — uses `Test-Path`, `ForEach-Object`
  - Fix: rewrite all shell examples using `git`, `grep`/`rg`, standard bash variable assignment

- [ ] **P0-4**: Make `validate-agent-refs.md` runnable without an external agent table
  - Currently says "check agent.md Agent System table" — but needs to enumerate the expected
    agent and skill set inline so it can self-validate
  - Fix: embed the expected lists directly in the command file

### Should Have (P1) — MEDIUM

- [ ] **P1-1**: Add Hebrew canonical value guidance to `product-manager.md`
  - PM writing a PRD for any add-item/add-unit/add-category flow won't know to flag Section 7.1–7.2
  - Fix: add a "Hebrew-aware features" checklist item to the Quality Checklist and a note in
    Technical Considerations template

- [ ] **P1-2**: Document agent invocation mechanism in `copilot-instructions.md` Section 0
  - Section 0 lists skill triggers but never explains when or how to engage agent personas
  - Fix: add a concise "Agent Personas" block after the Skill Triggers — one line per agent,
    when to invoke, what output it produces

- [ ] **P1-3**: Create `breadcrumb-navigator` SKILL.md
  - The agent persona exists but has no executable workflow (no phases, no file-write protocol)
  - Currently only invoked by `update-docs` Phase 2 with no guidance
  - Fix: create `.claude/skills/breadcrumb-navigator/SKILL.md` with scan → template → write
    → verify phases, mirroring the structure of other skills

- [ ] **P1-4**: Integrate `deploy-angular-github.md` into the skill trigger system
  - The prompt exists in `.claude/prompts/` but is referenced nowhere — effectively invisible
  - Fix: either add a trigger in Section 0 or move/rename as a proper skill under `.claude/skills/`

### Nice to Have (P2) — LOW

- [ ] **P2-1**: Fix HLD file naming inconsistency in `software-architect.md`
  - Template header says `# HLD: [Feature Name]` but file path pattern says `plans/<feature-name>-hld.md`
  - Fix: align the template header to match the file naming convention

- [ ] **P2-2**: Document Engine class locations in `cssLayer/SKILL.md`
  - "Search for existing Engine before creating a selector" but doesn't say where engines live
  - Fix: add one line — engines are `.c-*` classes in `src/styles.scss` and `src/app/shared/`

- [ ] **P2-3**: Add new-control guidance to `tab-orders.md`
  - No instruction for what to do when adding a new interactive element to these pages
  - Fix: one-paragraph note at the bottom of each page section

- [ ] **P2-4**: Clarify kitchen-preparations schema in `add-recipe/SKILL.md`
  - "Preserve array-of-one-doc structure" is ambiguous
  - Fix: add an inline JSON example showing the exact structure

## Atomic Sub-tasks

- [x] A1: Fix `techdebt/SKILL.md` — replace "Explore agent" with concrete grep/search instruction
- [x] A2: Update `qa-engineer.md` — add spec-authoring constraint block per Q1 resolution
- [x] A3: Rewrite `update-docs/SKILL.md` Phase 1 — replace PowerShell with bash
- [x] A4: Rewrite `test-pr-review-merge.md` — replace PowerShell variable syntax with bash
- [x] A5: Rewrite `validate-agent-refs.md` — replace PowerShell, embed expected agent/skill lists
- [x] A6: Update `product-manager.md` — add Hebrew canonical checklist item and template note
- [x] A7: Update `copilot-instructions.md` Section 0 — add Agent Personas invocation block (Section 0.3) + deploy trigger
- [x] A8: Create `.claude/skills/breadcrumb-navigator/SKILL.md`
- [x] A9: Promoted `deploy-angular-github.md` to full skill at `.claude/skills/deploy-github-pages/SKILL.md` + `.cursor/commands/deploy-github-pages.md`
- [x] A10: Fix `software-architect.md` HLD template header naming
- [x] A11: Add Engine location note to `cssLayer/SKILL.md`
- [x] A12: Add new-control note to `tab-orders.md`
- [x] A13: Add kitchen-preparations JSON example to `add-recipe/SKILL.md`

## Technical Considerations

- All changes are to `.claude/` markdown files — no `src/` changes, no build impact
- P0 items (A1–A5) unblock broken behavior and should be done first
- A8 (breadcrumb-navigator SKILL.md) should mirror the phase structure of `update-docs/SKILL.md`
  as a reference — it is also invoked from there
- A9 resolution depends on Q2 answer — if promoted to skill, needs its own SKILL.md file and
  a new `.cursor/rules/*.mdc` trigger
- `copilot-instructions.md` is the single source of truth — A7 adds documentation only;
  no rule changes go there without explicit user approval

## Out of Scope

- Adding `.cursor/rules/*.mdc` files for the 6 currently uncovered skills (github-sync,
  angularComponentStructure, auth-and-logging, session-handoff, update-docs, elegant-fix)
  — pending Q3 decision; will be a separate plan if approved
- Any changes to app source code (`src/`)
- Changing the priority hierarchy (Section 0.1) or any existing canonical rules
- Adding new agents beyond breadcrumb-navigator SKILL.md

## Critical Questions

**Q1** — How should the QA Engineer conflict be resolved?
a. Add a constraint block to `qa-engineer.md`: specs are authored only during commit-to-github Phase 0 or on explicit user request — copilot-instructions Section 3 stays unchanged.
b. Relax Section 3 in `copilot-instructions.md`: allow spec authoring for brand-new components/services, restrict the rule to updates of existing specs only.
Recommendation: a.

**Q2** — What should happen to `deploy-angular-github.md`?
a. Add a skill trigger in `copilot-instructions.md` Section 0 and leave it in `.claude/prompts/`.
b. Promote it to a full skill: move to `.claude/skills/deploy-github-pages/SKILL.md`, add phases, add a `.cursor/rules/*.mdc` trigger.
c. Delete it — deployment is out of scope for this project currently.
Recommendation: b.

**Q3** — Should we fill the 6 missing `.cursor/rules/*.mdc` trigger files?
a. Yes — add rules for all 6 missing skills (angularComponentStructure, auth-and-logging, session-handoff, github-sync, update-docs, elegant-fix) in this plan.
b. No — the current 5 rules cover the highest-risk triggers; timing-based and developer-driven skills don't need Cursor automation. Defer or skip.
c. Yes, but only for the two highest-value missing ones: angularComponentStructure and auth-and-logging.
Recommendation: b.
