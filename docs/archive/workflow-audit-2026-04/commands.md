# Command Files

Files under `.claude/commands/`. Invoked by slash commands or skill routing triggers.

---

### adversarial-template.md

- **Path**: `.claude/commands/adversarial-template.md`
- **Stated purpose**: Generates red-team test fixtures for fix templates. Creates adversarial cases (boundary conditions, edge inputs, ambiguous patterns) to stress-test detection logic. Includes per-case human review step and delta detection to see if new cases expose regression.
- **Inputs / triggers**: Invoked via `/adversarial-template` or from the reflect skill when adding adversarial coverage to a fix template.
- **Outputs**: New fixture files under `.claude/fix-templates/tests/<template>/cases/` and corresponding expected outputs under `.claude/fix-templates/tests/<template>/expected/`.
- **Cross-references**: `.claude/fix-templates/`, `.claude/commands/reflect.md`, `.claude/commands/test-template.md`
- **Approx size**: ~60 lines

---

### audit.md (interface-design:audit)

- **Path**: `.claude/commands/audit.md`
- **Stated purpose**: Check existing code against the design system — verifies that components, tokens, and layout patterns conform to the interface-design system rules.
- **Inputs / triggers**: Invoked via `/audit` when interface-design skill is active. Reads `.claude/skills/interface-design/SKILL.md` first.
- **Outputs**: Audit report listing design system violations with file/line references.
- **Cross-references**: `.claude/skills/interface-design/SKILL.md`
- **Approx size**: ~10 lines

---

### audit-report.md

- **Path**: `.claude/commands/audit-report.md`
- **Stated purpose**: Morning review loop — displays the latest nightly audit report, provides a triage menu (auto-fix, defer, create ticket), and runs template health checks and session log review.
- **Inputs / triggers**: Invoked via `/audit-report` at session start after a nightly audit has run.
- **Outputs**: Formatted display of `.claude/reports/audit/` latest file, triage decisions, and optional auto-fix triggers.
- **Cross-references**: `.claude/reports/audit/`, `.claude/commands/nightly-audit.md`, `.claude/standards-scheduled-reporting.md`
- **Approx size**: ~50 lines

---

### auto-solve.md

- **Path**: `.claude/commands/auto-solve.md`
- **Stated purpose**: 6-phase autonomous plan executor. Finds the next incomplete task in `todo.md` (starting from `## Quick Fixes`, skipping `# Active Tasks` section), applies UI-detection gate, runs plan-implementation and execute-it, and beeps on completion.
- **Inputs / triggers**: Invoked via `/auto-solve` or "start auto-solve" message. Reads this file then follows it.
- **Outputs**: Completed tasks from `todo.md`, files modified per the plan, git commits (after user approval).
- **Cross-references**: `.claude/todo.md`, `.claude/commands/plan-implementation.md`, `.claude/commands/execute-it.md`, gstack `/browse` skill
- **Approx size**: ~80 lines

---

### brief.md

- **Path**: `.claude/commands/brief.md`
- **Stated purpose**: Creates or reconstructs a session brief — the source of truth for the current session. Writes to `.claude/sessions/{session-id}/brief.md`. The brief threads through plan-implementation → execute-it → session-handoff as a scorecard.
- **Inputs / triggers**: Invoked via `/brief` or `/brief <description>`. Invoked automatically by plan-implementation (Step 0).
- **Outputs**: `brief.md` at `.claude/sessions/{session-id}/brief.md` with sections: Goal, Scope, Out of Scope, Success Criteria, Session ID.
- **Cross-references**: `.claude/sessions/`, `.claude/commands/plan-implementation.md`, `.claude/commands/execute-it.md`
- **Approx size**: ~40 lines

---

### critique.md

- **Path**: `.claude/commands/critique.md`
- **Stated purpose**: Design critique post-build — evaluates a completed UI against craft principles (intent-first, subtle layering, domain-appropriate) and proposes targeted improvements.
- **Inputs / triggers**: Invoked via `/critique` when interface-design skill is active. Reads `.claude/skills/interface-design/SKILL.md` first.
- **Outputs**: Critique report with specific improvement recommendations, optionally followed by a rebuild pass.
- **Cross-references**: `.claude/skills/interface-design/SKILL.md`
- **Approx size**: ~20 lines

---

### diary.md

- **Path**: `.claude/commands/diary.md`
- **Stated purpose**: Write a quick MemPalace diary entry for the current session when skipping the full session-handoff. Captures key decisions, blockers, and outcomes without running the full end-of-session pipeline.
- **Inputs / triggers**: Invoked via `/diary` when the user wants a lightweight session record.
- **Outputs**: Diary entry written via `mempalace_diary_write` MCP tool.
- **Cross-references**: MemPalace MCP (`mempalace_diary_write`), `.claude/skills/session-handoff/SKILL.md`
- **Approx size**: ~15 lines

---

### evaluate-me.md

- **Path**: `.claude/commands/evaluate-me.md`
- **Stated purpose**: Session retrospective — evaluates agent performance against standards, generates a scored report, and saves it to `retrospectives/`. Uses the evaluator scoring rules (exec_score 70% + agent_score 30%).
- **Inputs / triggers**: Invoked via `/evaluate-me` at session end.
- **Outputs**: Retrospective file at `retrospectives/YYYY-MM-DD-HH-MM-{slug}.md`.
- **Cross-references**: `.claude/reflect/evaluator.md`, `.claude/reflect/evaluator-agent-prompt.md`, `retrospectives/`
- **Approx size**: ~30 lines

---

### execute-it.md

- **Path**: `.claude/commands/execute-it.md`
- **Stated purpose**: Execute the implementation plan from the current conversation. Composes a merged plan from session brief + plan-implementation output, saves it via save-plan, then executes atomically with verification-before-completion gate and systematic-debugging protocol for failures.
- **Inputs / triggers**: Invoked via `/execute-it` or "execute-it" message after plan-implementation approval. Requires an architectural brief or plan-implementation output in context. Loads `@.claude/instructions/validation-checklist.md` at the top.
- **Outputs**: Modified/created files per the plan, saved plan at `plans/NNN-slug.plan.md`, updated `todo.md`, git commit summary for user approval.
- **Cross-references**: `.claude/instructions/validation-checklist.md`, `.claude/skills/save-plan/SKILL.md`, `.claude/commands/plan-implementation.md`, `.claude/sessions/`, `plans/`, `.claude/todo.md`
- **Approx size**: ~200 lines

---

### extract.md

- **Path**: `.claude/commands/extract.md`
- **Stated purpose**: Extract design patterns from existing code — identifies and documents recurring UI patterns, tokens, and component structures for use in the interface-design system.
- **Inputs / triggers**: Invoked via `/extract` when interface-design skill is active.
- **Outputs**: Extracted pattern documentation added to the interface-design skill's reference files.
- **Cross-references**: `.claude/skills/interface-design/SKILL.md`, `.claude/skills/interface-design/references/`
- **Approx size**: ~15 lines

---

### git.md

- **Path**: `.claude/commands/git.md`
- **Stated purpose**: Delegates all git operations to `git-agent.md`. Three-line redirect file.
- **Inputs / triggers**: Invoked via `/git` command.
- **Outputs**: Reads and follows `.claude/agents/git-agent.md`.
- **Cross-references**: `.claude/agents/git-agent.md`
- **Approx size**: ~3 lines

---

### init.md (interface-design:init)

- **Path**: `.claude/commands/init.md`
- **Stated purpose**: Build new UI with craft and consistency. Reads `.claude/skills/interface-design/SKILL.md` first, then designs/builds the requested UI component or page.
- **Inputs / triggers**: Invoked via `/init` when user wants to design a new UI page, dashboard, or component.
- **Outputs**: Angular component/template code, SCSS using cssLayer conventions, design token usage.
- **Cross-references**: `.claude/skills/interface-design/SKILL.md`, `.claude/skills/cssLayer/SKILL.md`
- **Approx size**: ~10 lines

---

### mp-wake-up.md

- **Path**: `.claude/commands/mp-wake-up.md`
- **Stated purpose**: Show MemPalace L0+L1 wake-up context for the current session — ~800 tokens of orientation covering the project knowledge graph's top-level structure.
- **Inputs / triggers**: Invoked via `/mp-wake-up`.
- **Outputs**: Prints L0 (wing list) + L1 (room summaries) from MemPalace to conversation context.
- **Cross-references**: MemPalace MCP (`mempalace_list_wings`, `mempalace_list_rooms`)
- **Approx size**: ~20 lines

---

### new-feature.md

- **Path**: `.claude/commands/new-feature.md`
- **Stated purpose**: 5-phase structured feature scoping. Phases: (1) MemPalace orient, (2) forcing questions using Q&A format, (3) landscape search (grep/glob), (4) premise challenge, (5) forced alternatives. Produces a `brief.md` that feeds into `/plan-implementation`. Does NOT write code.
- **Inputs / triggers**: Invoked via `/new-feature` or `/new-feature <description>`.
- **Outputs**: Session brief at `.claude/sessions/{session-id}/brief.md`. Prints the brief to conversation and waits for approval.
- **Cross-references**: `.claude/commands/brief.md`, `.claude/commands/plan-implementation.md`, MemPalace MCP
- **Approx size**: ~60 lines

---

### nightly-audit.md

- **Path**: `.claude/commands/nightly-audit.md`
- **Stated purpose**: Loads `.claude/skills/nightly-audit/SKILL.md` and executes the 8-phase autonomous nightly audit pipeline covering 6 categories: Hebrew strings, component duplication, styling, security, dead code, Angular conventions.
- **Inputs / triggers**: Invoked via `/nightly-audit` or by the scheduled nightly automation. Reads the nightly-audit SKILL.md.
- **Outputs**: Audit report at `.claude/reports/audit/YYYY-MM-DD-nightly-audit.md`, optional auto-fixes for categories C1/E1/E3/F5.
- **Cross-references**: `.claude/skills/nightly-audit/SKILL.md`, `.claude/reports/audit/`, `.claude/standards-scheduled-reporting.md`
- **Approx size**: ~10 lines

---

### plan-implementation.md

- **Path**: `.claude/commands/plan-implementation.md`
- **Stated purpose**: PHASE 1 ONLY — read-only codebase verification against a brief. Captures session brief (Step 0), checks MemPalace for historical context, verifies every file/line/function the brief references against live code, runs neighborhood scan, no-placeholders scan, forced alternatives table, and adversarial subagent review. Produces Merged Execution Plan ready for execute-it.
- **Inputs / triggers**: Invoked via `/plan-implementation` or after `/new-feature` brief is approved. Requires an architectural brief in the user's message. Loads `@.claude/instructions/validation-checklist.md`.
- **Outputs**: Session brief at `.claude/sessions/{session-id}/brief.md`, verification report (✓/✗ per file), Merged Execution Plan, adversarial review summary. Ends with "Ready for approval. Say 'execute-it' when ready."
- **Cross-references**: `.claude/instructions/validation-checklist.md`, `.claude/commands/brief.md`, `.claude/commands/execute-it.md`, `.claude/sessions/`, MemPalace MCP
- **Approx size**: ~180 lines

---

### quick-chat.md

- **Path**: `.claude/commands/quick-chat.md`
- **Stated purpose**: Fast-path startup — skips handoff check and GitHub sync for one turn only. For lightweight queries that don't need the full session gate.
- **Inputs / triggers**: Invoked via `/quick-chat`.
- **Outputs**: Bypasses `github-sync` skill and end-of-session triggers for the current turn.
- **Cross-references**: `.claude/skills/quick-chat/SKILL.md`, `.claude/skills/github-sync/SKILL.md`
- **Approx size**: ~5 lines

---

### reflect.md

- **Path**: `.claude/commands/reflect.md`
- **Stated purpose**: Autonomous self-improvement loop for Claude skills (Karpathy autoresearch pattern). AUTO mode + Path 1 (session retrospective) + Path 2 (skill improvement loop with background dispatch). 6 phases including mutation testing via test-runner.sh. IMMUTABLE scoring rules enforce exec_score(70%) + agent_score(30%).
- **Inputs / triggers**: Invoked via `/reflect` or `/reflect AUTO` for automatic mode. Also invoked by the Stop hook (`auto-reflect.ps1`) after session end.
- **Outputs**: Updated SKILL.md files (when improvement score beats baseline), entries in `reflection-log.tsv`, mutation test results in `test-quality-log.md`, retrospective entry in `retrospectives/`.
- **Cross-references**: `.claude/reflect/evaluator.md`, `.claude/reflect/evaluator-agent-prompt.md`, `.claude/reflect/reflect-runner-prompt.md`, `.claude/reflect/behavior-runner-prompt.md`, `.claude/reflect/test-runner.sh`, `.claude/reflect/reflection-log.tsv`, `.claude/reflect/test-quality-log.md`, `.claude/fix-templates/`, `.claude/skills/*/SKILL.md`
- **Approx size**: ~1010 lines

---

### reflect-add-tests.md

- **Path**: `.claude/commands/reflect-add-tests.md`
- **Stated purpose**: Human-in-the-loop test suite builder. Presents 10 proposed test cases at a time, waits for human review/approval on each batch before writing fixture files.
- **Inputs / triggers**: Invoked via `/reflect add-tests`.
- **Outputs**: New fixture files under `.claude/fix-templates/tests/<template>/cases/` and expected outputs.
- **Cross-references**: `.claude/fix-templates/`, `.claude/commands/reflect.md`, `.claude/commands/test-template.md`
- **Approx size**: ~40 lines

---

### reflect-list.md

- **Path**: `.claude/commands/reflect-list.md`
- **Stated purpose**: Batch reflection from the tool failure log. Reads `.claude/reflect/failure-log.tsv`, groups failures by type, applies one low-risk fix per failure group.
- **Inputs / triggers**: Invoked via `/reflect-list`.
- **Outputs**: Fixed skill/hook files (one fix per failure group), updated failure-log.tsv entries.
- **Cross-references**: `.claude/reflect/failure-log.tsv`, `.claude/reflect/tool-failure-hook.ps1`
- **Approx size**: ~25 lines

---

### status.md (interface-design:status)

- **Path**: `.claude/commands/status.md`
- **Stated purpose**: Show current design system state — lists active tokens, component inventory, and system health for the interface-design skill.
- **Inputs / triggers**: Invoked via `/status` when interface-design skill is active.
- **Outputs**: Design system status report printed to conversation.
- **Cross-references**: `.claude/skills/interface-design/SKILL.md`
- **Approx size**: ~10 lines

---

### sweep-stale-todos.md

- **Path**: `.claude/commands/sweep-stale-todos.md`
- **Stated purpose**: Archives all-[x] todo sections from `todo.md` to `todo-archive.md` with git verification to confirm work is actually committed before archiving.
- **Inputs / triggers**: Invoked at session end (after all tasks marked [x]) or on explicit request.
- **Outputs**: Updated `todo.md` (completed sections removed), appended `todo-archive.md`.
- **Cross-references**: `.claude/todo.md`, `.claude/todo-archive.md`
- **Approx size**: ~20 lines

---

### test-pr-review-merge.md

- **Path**: `.claude/commands/test-pr-review-merge.md`
- **Stated purpose**: Full CI pipeline: test → push → PR creation → review → merge (trunk merge). Runs tests first, then pushes branch, creates PR via `gh` CLI, triggers review, and merges on passing.
- **Inputs / triggers**: Invoked via `/test-pr-review-merge` when ready to ship a feature branch.
- **Outputs**: Pushed branch, created PR, merge commit on main (or base branch).
- **Cross-references**: `.claude/agents/git-agent.md`, `.claude/standards-git.md`, gstack `/ship` skill
- **Approx size**: ~30 lines

---

### test-template.md

- **Path**: `.claude/commands/test-template.md`
- **Stated purpose**: Score a fix template against its fixture corpus. Spawns per-case subagents, compares actual output to expected, writes results to `history.jsonl` append-only log.
- **Inputs / triggers**: Invoked via `/test-template <template-name>` from the reflect pipeline or manually.
- **Outputs**: Per-case pass/fail scores, summary score written to `.claude/fix-templates/tests/history.jsonl`.
- **Cross-references**: `.claude/fix-templates/tests/`, `.claude/commands/reflect.md`, `.claude/reflect/test-runner.sh`
- **Approx size**: ~40 lines

---

### validate-agent-refs.md

- **Path**: `.claude/commands/validate-agent-refs.md`
- **Stated purpose**: Health check for agent file cross-references — verifies that every file referenced in agent persona files, command files, and skill files actually exists on disk.
- **Inputs / triggers**: Invoked via `/validate-agent-refs` as a maintenance check.
- **Outputs**: Report of broken cross-references with file paths.
- **Cross-references**: All `.claude/agents/*.md`, `.claude/commands/*.md`, `.claude/skills/*/SKILL.md`
- **Approx size**: ~25 lines
