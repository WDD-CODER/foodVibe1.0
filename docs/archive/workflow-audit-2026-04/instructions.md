# Instructions Files

Files under `.claude/instructions/`. Loaded via `@` reference in skill/command files.

---

### validation-checklist.md

- **Path**: `.claude/instructions/validation-checklist.md`
- **Stated purpose**: Defines the verification gate that runs before and after task execution. Instructs agents to ask "verify myself / I'll check?" BEFORE any tool use on a new task, then show the `✅ HOW TO VALIDATE` checklist after completion. The `execute-it` skill overrides the timing for UI tasks: code verification (build/test) is always automatic; user choice applies only to visual/browser QA.
- **Inputs / triggers**: Loaded via `@.claude/instructions/validation-checklist.md` at the top of `execute-it` and `plan-implementation` skills. Applies to every task that changes files. `execute-it`'s Smart Visual QA Flow section overrides the ask-before timing for UI-touching tasks.
- **Outputs**: Two mandatory outputs — (1) a pre-task question asking user if agent should verify or user will check; (2) a post-task `✅ HOW TO VALIDATE` section listing where to go in the app and what to expect.
- **Cross-references**: `.claude/commands/execute-it.md` (override), `.claude/commands/plan-implementation.md` (loads same file)
- **Approx size**: ~95 lines
