# Plan 086 — AI Tooling Optimization (Portability-First)

Refactor and optimize all AI rules, skills, agents, and entry points for token efficiency and portability across IDEs/agents.

## Execution Order

1. Merge entry points: delete HOW-WE-WORK, reduce AGENTS.md to 2-line pointer, consolidate agent.md
2. Refactor copilot-instructions.md: remove verbose duplicates, add concise portable skill-triggers, fix .cursor/rules contradiction
3. Trim .cursor/rules/*.mdc to bare 3-line pointers (Cursor bonus layer)
4. Inline util-standards and serviceLayer into copilot-instructions, delete skill files
5. Remove restated Angular standards from agent persona files
6. Trim elegant-fix, github-sync, techdebt skills (remove verbose shell examples)
7. Archive old todo entries to todo-archive.md
8. Deduplicate commit-to-github safety reminders
9. Trim add-recipe schema reference
10. (Optional) Consolidate agent personas

## Portability Architecture

- **Layer 1 (portable)**: AGENTS.md → agent.md → copilot-instructions.md → .assistant/skills/*/SKILL.md
- **Layer 2 (Cursor-only)**: .cursor/rules/*.mdc (bare pointers), .cursor/commands/*.md

## Atomic Sub-tasks

- [x] F1: Delete HOW-WE-WORK.md; reduce AGENTS.md to pointer; slim agent.md
- [x] F3: Refactor copilot-instructions (triggers, dedup, fix Section 0)
- [x] F2: Trim all four .mdc files to 3 lines each
- [x] F5: Inline util-standards + serviceLayer into copilot-instructions; delete skill dirs
- [x] F4: Replace Angular restatements in agents with "Apply copilot-instructions Section 3"
- [x] F6+F7: Trim elegant-fix, github-sync, techdebt skills
- [x] F10: Archive completed plans from todo.md into todo-archive.md
- [x] F11: Single safety rule in commit-to-github skill; reference elsewhere
- [x] F8: Trim add-recipe SKILL schema reference to field names only

## Critical Questions

**Q1: Archive depth for todo.md?**
(A) Last 10 plans only in todo.md
(B) Last 20 plans in todo.md, rest in archive
(C) Keep all in todo.md, no archive (skip F10)
