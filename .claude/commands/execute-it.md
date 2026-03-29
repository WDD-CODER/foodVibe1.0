---
description: Execute the implementation plan from this conversation
allowed-tools: Read, Write, Edit, Bash
---

# Skill: execute-it

Execute the implementation plan from this conversation, incorporating any findings from plan-implementation verification.

## Step 0: Compose & Save

Before executing, persist the plan so it's tracked in `plans/` and `todo.md`.

1. **Scan the conversation** for two sources:
   - **Architectural brief** — the handoff from the planning brain (has `## Goal`, `## Steps`, `## Rules`, `## Done when`)
   - **Plan-implementation output** — verification results (✓/✗ items, deviations, gaps, corrections)
2. **Compose one concise plan** from both:
   - Frontmatter: `name` (from Goal), `overview` (one sentence), `todos: []`, `isProject: false`
   - Body: brief's Goal as heading, brief's Steps merged with every ✗ fix/amendment from plan-implementation as `# Atomic Sub-tasks` (each `[ ] description`), brief's Rules as constraints, brief's "Done when" as verification
3. **Invoke save-plan**: read `.claude/skills/save-plan/SKILL.md` and follow it — handles numbering, `plans/` write, and `todo.md` sync

**Skip Step 0** if no architectural brief is found in conversation — go straight to Step 1.

---

## Workflow

1. **Build the merged execution list** — combine the original brief's steps WITH every ✗ fix, missing method, injection, or deviation flagged during plan-implementation. Treat verified items (✓) as confirmed context.
2. **Execute atomically** — one logical unit per commit
3. **Stop only on NEW surprises** — if you hit something not covered by the brief OR the plan-implementation findings, stop and report. Do not improvise.
4. **Update progress** — mark completed tasks

## The Rule: Brief + Verification = Full Plan

The original brief is the base. Anything plan-implementation flagged as ✗ or "needs to be created" is an **amendment to the plan**, not a deviation. Execute both together as one unified task list.

Example: if the brief says "add reload calls for three services" and plan-implementation found that two need the method created first — create the methods, then add the calls. Don't stop to ask.

## Tools Available
- `Read` — examine files before modifying
- `Write` — create new files
- `Edit` — modify existing files
- `Bash` — run commands (build, test, git)

## Execution Rules

- **Read first** — always read a file before editing it
- **No auto-commit** — after all file changes are complete, present a summary of what was changed and ask the user for confirmation before running any `git commit` or `git push`
- **Verify** — after each file change, run diagnostics or build checks if applicable
- **Stop on NEW conflict** — if the code differs from what BOTH the brief and plan-implementation expected, stop and report
- **Backend Impact check** — if the plan includes a `## Backend Impact` section with new collections, verify the new `entityType` key is added to `BACKUP_ENTITY_TYPES` in `async-storage.service.ts` before marking the task done

## Output

When complete:
```
✓ Execution complete
- Plan saved: plans/NNN-slug.plan.md (or "skipped — no brief found")
- Brief tasks: [N completed]
- Plan-implementation fixes: [N incorporated]
- Files modified: [list]
- How to verify: [steps/checks]
```