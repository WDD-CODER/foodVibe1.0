---
name: Optimize Commit-GitHub Skill
overview: Streamline the commit-to-github skill and command (fewer phases, less repetition, shorter text) without changing safety, approval flow, or execution behavior — same idea as the add-recipe optimization.
todos: []
isProject: false
---

# Optimize Commit-GitHub Skill and Command

## Current state

- **Skill**: `.assistant/skills/commit-to-github/SKILL.md` — 6 phases, ~143 lines
- **Command**: `.cursor/commands/commit-github.md` — 20 lines, restates skill steps
- **Rule**: `.cursor/rules/git-commit-must-use-skill.mdc` — 15 lines, already lean

Safety today: no git writes until user approves the visual plan; no `reset --hard` / force-push; stash used to preserve work. All of that stays.

---

## 1. Merge Phase 2 and Phase 3 (Decide + Build Plan)

**Current:** Phase 2 = "Decide Split" (one vs several branches/commits, naming). Phase 3 = "Build the Plan" (for each branch: name; for each commit: files + message).

**Change:** Combine into one phase: **"Decide & Build Plan"**. Output is the same structure (branches, commits per branch, files + message per commit) that feeds the visual tree. No behavior change; one fewer phase and ~10-15 lines less.

---

## 2. Fold Phase 5 (Confirm) into Phase 4

**Current:** Phase 4 = present visual tree + "No git writes until you approve." Phase 5 = "User approves or denies. If deny, stop. If approve, go to Phase 6."

**Change:** Rename Phase 4 to **"Present Plan & Await Approval"**. Add one sentence for deny behavior. Delete Phase 5.

---

## 3. Shorten Phase 1 (Evaluate) command list

Drop redundant `git status -sb` (branch info is in `git status`). Consolidate into one sentence.

---

## 4. Compress the Phase 4 example

Replace 4-commit example with shorter 2-commit example. Keep the required format template.

---

## 5. Compress End State and Related

End State to one paragraph. Related to one line.

---

## 6. ~~Add session-scope to the skill~~ — REMOVED

**Why removed:** Session-scope ("only files changed in this conversation") belongs in the command only, not the skill. The skill is also triggered by the rule when a user says "commit to GitHub" — in that case they want ALL their changes, not just session changes. Moving session-scope into the skill would break the general-use case.

---

## 7. Slim the command (keep session-scope in command)

Reduce to ~5 lines: (1) follow skill, (2) session-scoped, (3) no git until approved.

---

## Resulting structure (skill)

| Phase | Name                          |
| ----- | ----------------------------- |
| 1     | Evaluate (read-only)          |
| 2     | Decide & Build Plan           |
| 3     | Present Plan & Await Approval |
| 4     | Execute (only after approval) |
| 5     | End state / Todo              |

Execution and safety wording stay verbatim. Only surrounding phases and text are merged and shortened.
