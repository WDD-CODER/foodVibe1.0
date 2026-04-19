# Miscellaneous Files

All remaining files under `.claude/` not covered by the other category files.
Organized by subdirectory.

---

## Settings & Configuration

### settings.json

- **Path**: `.claude/settings.json`
- **Stated purpose**: Main Claude Code project settings. Defines hook registrations for PreToolUse, SessionStart, PostToolUse, PreCompact, and Stop events. Lists allowed and denied MCP tool permissions. Disables github and context7 MCP servers.
- **Inputs / triggers**: Loaded by Claude Code at session start.
- **Outputs**: Hook pipeline active for the session; MCP permission list enforced.
- **Cross-references**: `scripts/branch-guard.sh` (PreToolUse hook), `scripts/session-startup.sh` (SessionStart hook), `.claude/reflect/tool-failure-hook.ps1` (PostToolUse hook), `scripts/context-monitor.sh` (PostToolUse hook), `scripts/pre-compact-reminder.sh` (PreCompact hook), `scripts/handoff-check.sh` (Stop hook)
- **Approx size**: ~158 lines

---

### settings.local.json

- **Path**: `.claude/settings.local.json`
- **Stated purpose**: Local (gitignored) Claude Code settings overlay. Adds additional Bash permissions and explicitly denies `mcp__ide__executeCode` and `NotebookEdit` tools.
- **Inputs / triggers**: Loaded by Claude Code at session start; merges with settings.json.
- **Outputs**: Additional permission rules applied on top of settings.json.
- **Cross-references**: `.claude/settings.json`
- **Approx size**: ~20 lines

---

### mcp.json

- **Path**: `.claude/mcp.json`
- **Stated purpose**: MCP server configuration. Registers the MemPalace MCP server with command `python -m mempalace.mcp_server`.
- **Inputs / triggers**: Loaded by Claude Code at session start to initialize MCP connections.
- **Outputs**: MemPalace MCP tools available in session (`mempalace_search`, `mempalace_kg_add`, etc.).
- **Cross-references**: MemPalace MCP tool references throughout copilot-instructions.md and CLAUDE.md
- **Approx size**: ~10 lines

---

## Standards Files

### standards-angular.md

- **Path**: `.claude/standards-angular.md`
- **Stated purpose**: Angular 19 standards: Signals for state, Adapter Pattern for data transformation, CRDUL class section ordering, standalone components with OnPush, inject() for DI, cssLayer for styling. Loaded when creating/refactoring components, pipes, directives, SCSS/CSS, or folder structure.
- **Inputs / triggers**: Loaded on demand per the standards table in copilot-instructions.md.
- **Outputs**: Reference document — shapes implementation decisions for Angular files.
- **Cross-references**: `.claude/skills/angularComponentStructure/SKILL.md`, `.claude/skills/cssLayer/SKILL.md`, `.claude/skills/angular-pipe-logic/SKILL.md`
- **Approx size**: ~120 lines

---

### standards-backend.md

- **Path**: `.claude/standards-backend.md`
- **Stated purpose**: Node/Express/MongoDB/Mongoose backend standards. Defines Entity schema conventions, `entityType` discriminator pattern, `BACKUP_ENTITY_TYPES` registry, and CRUD service patterns. Loaded when adding/modifying persisted entities, new data services, or CRUD changes.
- **Inputs / triggers**: Loaded on demand per the standards table in copilot-instructions.md. Every plan touching persistence must include a `## Backend Impact` section.
- **Outputs**: Reference document — shapes entity schemas, service structure, and API patterns.
- **Cross-references**: `.claude/copilot-instructions.md` (Backend persistence trigger)
- **Approx size**: ~100 lines

---

### standards-domain.md

- **Path**: `.claude/standards-domain.md`
- **Stated purpose**: Domain-specific standards: Hebrew translation via `translatePipe` (never raw strings), Lucide icon usage (canonical icon names only), ingredient ledger conventions. Loaded when adding/editing canonical value flows or Lucide icons.
- **Inputs / triggers**: Loaded on demand per the standards table in copilot-instructions.md. Triggered by "Lucide icons" and "Hebrew canonical values" rules.
- **Outputs**: Reference document — enforces domain-correct Hebrew values and icon names.
- **Cross-references**: `.claude/skills/add-recipe/SKILL.md`, `.claude/copilot-instructions.md` (domain trigger rules)
- **Approx size**: ~80 lines

---

### standards-git.md

- **Path**: `.claude/standards-git.md`
- **Stated purpose**: Git branching rules, Conventional Commits format, permission rule syntax, no force-push to main/master policy. Loaded when committing, pushing, PRs, deploying, or GitHub MCP operations.
- **Inputs / triggers**: Loaded on demand per the standards table in copilot-instructions.md. Read by git-agent.md.
- **Outputs**: Reference document — shapes commit messages, branch names, and PR conventions.
- **Cross-references**: `.claude/agents/git-agent.md`, `CLAUDE.md` (branch rule)
- **Approx size**: ~70 lines

---

### standards-scheduled-reporting.md

- **Path**: `.claude/standards-scheduled-reporting.md`
- **Stated purpose**: Staging file convention for nightly audit agents — defines how agents write and name staging files before committing audit reports to `.claude/reports/audit/`.
- **Inputs / triggers**: Loaded by nightly-audit skill. Referenced by audit-report command.
- **Outputs**: Reference document — shapes report file naming and staging conventions.
- **Cross-references**: `.claude/skills/nightly-audit/SKILL.md`, `.claude/commands/audit-report.md`, `.claude/reports/audit/`
- **Approx size**: ~30 lines

---

### standards-security.md

- **Path**: `.claude/standards-security.md`
- **Stated purpose**: Security standards: auth guards required on all protected routes, sessionStorage only (no localStorage for sensitive data), no PII in logs, OWASP Top 10 awareness. Loaded when touching auth, routes, storage, crypto, or security surface.
- **Inputs / triggers**: Loaded on demand per the standards table in copilot-instructions.md. Also read by security-officer agent.
- **Outputs**: Reference document — shapes auth guard implementation, storage choices, and logging hygiene.
- **Cross-references**: `.claude/agents/security-officer.md`, `.claude/skills/auth-and-logging/SKILL.md`, `.claude/skills/auth-crypto/SKILL.md`
- **Approx size**: ~90 lines

---

## Hooks

### hooks/install-hooks.ps1

- **Path**: `.claude/hooks/install-hooks.ps1`
- **Stated purpose**: Copies `post-commit` and `post-merge` shell scripts to `.git/hooks/`, fixes CRLF line endings. Run manually to install git hooks into the local repo.
- **Inputs / triggers**: Run manually by developer to set up local git hooks.
- **Outputs**: `.git/hooks/post-commit` and `.git/hooks/post-merge` installed and executable.
- **Cross-references**: `.claude/hooks/post-commit`, `.claude/hooks/post-merge`
- **Approx size**: ~20 lines

---

### hooks/post-commit

- **Path**: `.claude/hooks/post-commit`
- **Stated purpose**: Git post-commit hook. Runs `embed-runner.js` for changed files matching `.ts`, `.html`, `.scss`, `.md`, `.json`, `.yaml`, `.yml`, `.js`, `.plan.md` extensions — triggers MemPalace embedding of changed content.
- **Inputs / triggers**: Fires automatically after every `git commit`.
- **Outputs**: Updated MemPalace embeddings for committed files.
- **Cross-references**: `embed-runner.js` (in project root or scripts/), MemPalace MCP
- **Approx size**: ~15 lines

---

### hooks/post-merge

- **Path**: `.claude/hooks/post-merge`
- **Stated purpose**: Git post-merge hook. Runs `embed-runner.js` unconditionally after every merge.
- **Inputs / triggers**: Fires automatically after every `git merge`.
- **Outputs**: Updated MemPalace embeddings for all merged files.
- **Cross-references**: `embed-runner.js`, MemPalace MCP
- **Approx size**: ~10 lines

---

## Reflect System

### reflect/auto-reflect.ps1

- **Path**: `.claude/reflect/auto-reflect.ps1`
- **Stated purpose**: Stop hook — invokes `/reflect AUTO` mode via `claude --print` after session end. Runs the autonomous self-improvement loop in background.
- **Inputs / triggers**: Registered as the Stop hook in settings.json (`scripts/handoff-check.sh` wraps it). Fires at session close.
- **Outputs**: Triggers `/reflect AUTO` which may update SKILL.md files and write to reflection-log.tsv.
- **Cross-references**: `.claude/commands/reflect.md`, `.claude/reflect/reflection-log.tsv`
- **Approx size**: ~15 lines

---

### reflect/auto-reflection-log.tsv

- **Path**: `.claude/reflect/auto-reflection-log.tsv`
- **Stated purpose**: Append-only log of AUTO-mode reflect runs. Has header row + entries since 2026-04-07.
- **Inputs / triggers**: Written to by `/reflect AUTO` mode each time it runs.
- **Outputs**: TSV record of reflect run timestamps, skill targets, and outcomes.
- **Cross-references**: `.claude/reflect/auto-reflect.ps1`, `.claude/commands/reflect.md`
- **Approx size**: ~20 lines

---

### reflect/behavior-runner-prompt.md

- **Path**: `.claude/reflect/behavior-runner-prompt.md`
- **Stated purpose**: System prompt for the behavior executor subagent (READ-ONLY). Instructs the subagent on how to execute SKILL.md against a test fixture and produce structured output for the evaluator.
- **Inputs / triggers**: Read by the reflect skill when spawning behavior executor subagents. IMMUTABLE — do not edit.
- **Outputs**: Used as system prompt for subagent; not directly written.
- **Cross-references**: `.claude/commands/reflect.md`, `.claude/reflect/evaluator.md`
- **Approx size**: ~40 lines

---

### reflect/evaluator.md

- **Path**: `.claude/reflect/evaluator.md`
- **Stated purpose**: IMMUTABLE scoring rules for the reflect pipeline. Defines exec_score (70% weight) + agent_score (30% weight) formula. IMMUTABLE — the reflect loop cannot modify its own scoring criteria.
- **Inputs / triggers**: Read by evaluator subagents and by the reflect skill for score calculation.
- **Outputs**: Scoring formula used to determine if a mutated SKILL.md beats the baseline.
- **Cross-references**: `.claude/reflect/evaluator-agent-prompt.md`, `.claude/commands/reflect.md`
- **Approx size**: ~30 lines

---

### reflect/evaluator-agent-prompt.md

- **Path**: `.claude/reflect/evaluator-agent-prompt.md`
- **Stated purpose**: Blind evaluator agent system prompt (READ-ONLY). The evaluator does not know whether it's scoring the baseline or the mutation — prevents bias in scoring.
- **Inputs / triggers**: Read by reflect skill when spawning blind evaluator subagents. READ-ONLY.
- **Outputs**: Used as system prompt for evaluator subagent; not directly written.
- **Cross-references**: `.claude/reflect/evaluator.md`, `.claude/commands/reflect.md`
- **Approx size**: ~35 lines

---

### reflect/failure-log.tsv

- **Path**: `.claude/reflect/failure-log.tsv`
- **Stated purpose**: PostToolUse failure log. Appended to by `tool-failure-hook.ps1` after every failed tool call. Pre-commit hook may dirty this file. Rule: never commit standalone (always part of a feature commit or skip).
- **Inputs / triggers**: Written to by `tool-failure-hook.ps1` after every failed tool use.
- **Outputs**: TSV record of failed tool calls for batch processing by `/reflect-list`.
- **Cross-references**: `.claude/reflect/tool-failure-hook.ps1`, `.claude/commands/reflect-list.md`
- **Approx size**: ~variable (grows during session)

---

### reflect/failure-log-archive-2026-04.tsv

- **Path**: `.claude/reflect/failure-log-archive-2026-04.tsv`
- **Stated purpose**: Archived failure log for April 2026. Contains all failure records rotated out of the active failure-log.tsv.
- **Inputs / triggers**: Created when failure-log.tsv is rotated/archived.
- **Outputs**: Historical record; read by `/reflect-list` for batch processing.
- **Cross-references**: `.claude/reflect/failure-log.tsv`
- **Approx size**: ~variable

---

### reflect/last-session-context.md

- **Path**: `.claude/reflect/last-session-context.md`
- **Stated purpose**: Legacy session context file from 2026-04-09. Superseded by `docs/session-state.md` for rolling continuity and `.claude/sessions/` for point-in-time snapshots.
- **Inputs / triggers**: No longer written to by current workflow. Historical artifact.
- **Outputs**: None (legacy).
- **Cross-references**: `docs/session-state.md`
- **Approx size**: ~30 lines

---

### reflect/reflect-runner-prompt.md

- **Path**: `.claude/reflect/reflect-runner-prompt.md`
- **Stated purpose**: Background reflect runner agent system prompt (READ-ONLY). Used when the reflect skill dispatches a background improvement agent.
- **Inputs / triggers**: Read by reflect skill when spawning background agent. READ-ONLY.
- **Outputs**: Used as system prompt for background reflect agent; not directly written.
- **Cross-references**: `.claude/commands/reflect.md`
- **Approx size**: ~40 lines

---

### reflect/reflected-sessions.stamp

- **Path**: `.claude/reflect/reflected-sessions.stamp`
- **Stated purpose**: Timestamp file marking the last time the reflect pipeline processed sessions. Contains timestamp `2026-04-09 18:35:59`. Prevents double-processing of already-reflected sessions.
- **Inputs / triggers**: Written by reflect pipeline after each run.
- **Outputs**: Timestamp used by auto-reflect to determine which sessions are new.
- **Cross-references**: `.claude/reflect/auto-reflect.ps1`, `.claude/commands/reflect.md`
- **Approx size**: 1 line

---

### reflect/reflection-log.tsv

- **Path**: `.claude/reflect/reflection-log.tsv`
- **Stated purpose**: Append-only experiment history for the reflect pipeline. 9-column schema (since 2026-04-04): session, skill, mutation_id, baseline_score, mutation_score, delta, accepted, rationale, timestamp.
- **Inputs / triggers**: Written to by reflect skill after each evaluation run.
- **Outputs**: Historical record of which mutations improved skills and by how much.
- **Cross-references**: `.claude/commands/reflect.md`, `.claude/reflect/evaluator.md`
- **Approx size**: ~variable (grows over time)

---

### reflect/test-quality-log.md

- **Path**: `.claude/reflect/test-quality-log.md`
- **Stated purpose**: Populated by PHASE 6 mutation testing in the reflect pipeline. Append-only log of mutation test results showing test suite quality metrics.
- **Inputs / triggers**: Written to by reflect skill Phase 6 (mutation testing).
- **Outputs**: Running record of test suite strength against skill mutations.
- **Cross-references**: `.claude/commands/reflect.md`, `.claude/reflect/test-runner.sh`
- **Approx size**: ~variable

---

### reflect/test-runner.sh

- **Path**: `.claude/reflect/test-runner.sh`
- **Stated purpose**: IMMUTABLE bash scorer for the reflect test pipeline. Executes test cases against a skill version and outputs structured scores. IMMUTABLE — the reflect loop cannot modify its own test runner.
- **Inputs / triggers**: Called by reflect skill during Phase 5/6 test execution.
- **Outputs**: Structured test scores written to stdout for capture by the reflect pipeline.
- **Cross-references**: `.claude/commands/reflect.md`, `.claude/fix-templates/tests/`
- **Approx size**: ~50 lines

---

### reflect/test-suite-template.md

- **Path**: `.claude/reflect/test-suite-template.md`
- **Stated purpose**: Format documentation for test suites used in the reflect pipeline. Defines the structure of `.tests.md` files in the `test-suites/` directory.
- **Inputs / triggers**: Read when creating new test suites via `/reflect add-tests`.
- **Outputs**: Template reference; shapes new test suite files.
- **Cross-references**: `.claude/reflect/test-suites/`, `.claude/commands/reflect-add-tests.md`
- **Approx size**: ~30 lines

---

### reflect/test-suites/angularComponentStructure.tests.md

- **Path**: `.claude/reflect/test-suites/angularComponentStructure.tests.md`
- **Stated purpose**: Test suite for the angularComponentStructure skill. Contains fixture-based test cases that verify correct class section ordering, decorator usage, and DI patterns.
- **Inputs / triggers**: Used by the reflect pipeline when evaluating angularComponentStructure skill mutations.
- **Outputs**: Test case inputs for behavior executor subagents.
- **Cross-references**: `.claude/skills/angularComponentStructure/SKILL.md`, `.claude/reflect/test-runner.sh`
- **Approx size**: ~variable

---

### reflect/test-suites/cssLayer.tests.md

- **Path**: `.claude/reflect/test-suites/cssLayer.tests.md`
- **Stated purpose**: Test suite for the cssLayer skill. Contains fixture-based test cases that verify correct layer grouping, token usage, and logical properties.
- **Inputs / triggers**: Used by the reflect pipeline when evaluating cssLayer skill mutations.
- **Outputs**: Test case inputs for behavior executor subagents.
- **Cross-references**: `.claude/skills/cssLayer/SKILL.md`, `.claude/reflect/test-runner.sh`
- **Approx size**: ~variable

---

### reflect/tool-failure-hook.ps1

- **Path**: `.claude/reflect/tool-failure-hook.ps1`
- **Stated purpose**: PostToolUse hook (PowerShell). Fires after every tool call; appends failed tool calls to `failure-log.tsv` with timestamp, tool name, error type, and input summary.
- **Inputs / triggers**: Registered as PostToolUse hook in settings.json (no matcher = fires on every tool).
- **Outputs**: Appended entries to `.claude/reflect/failure-log.tsv`.
- **Cross-references**: `.claude/settings.json` (PostToolUse hook registration), `.claude/reflect/failure-log.tsv`
- **Approx size**: ~40 lines

---

### reflect/coverage/cssLayer.coverage.md

- **Path**: `.claude/reflect/coverage/cssLayer.coverage.md`
- **Stated purpose**: Coverage map for the cssLayer skill test suite — tracks which skill rules are covered by existing test cases.
- **Inputs / triggers**: Updated when test suites are modified or coverage analysis is run.
- **Outputs**: Coverage report showing tested vs. untested skill rules.
- **Cross-references**: `.claude/reflect/test-suites/cssLayer.tests.md`, `.claude/skills/cssLayer/SKILL.md`
- **Approx size**: ~variable

---

### reflect/coverage/.gitkeep

- **Path**: `.claude/reflect/coverage/.gitkeep`
- **Stated purpose**: Git placeholder to keep the `coverage/` directory tracked.
- **Inputs / triggers**: N/A
- **Outputs**: N/A
- **Cross-references**: N/A
- **Approx size**: 0 lines

---

### reflect/evidence/ (directory)

- **Path**: `.claude/reflect/evidence/`
- **Stated purpose**: Evidence files (`.evidence.md`) produced by the reflect pipeline — one per skill evaluation run. Captures the behavior executor's output and evaluator's scoring rationale.
- **Inputs / triggers**: Written by reflect skill during evaluation runs.
- **Outputs**: `.evidence.md` files, one per skill/mutation/run. Plus `.gitkeep` placeholder.
- **Cross-references**: `.claude/commands/reflect.md`, `.claude/reflect/evaluator.md`
- **Approx size**: 4 evidence files + .gitkeep

---

## Fix Templates

### fix-templates/color-token.md

- **Path**: `.claude/fix-templates/color-token.md`
- **Stated purpose**: Fix template for CSS color token violations (category C). Version 3, last-score 6/6. DETECT→SCOPE→DECIDE→FIX decision tree with three auto-fix paths (A: direct token replacement, B: semantic token mapping, C: manual review required).
- **Inputs / triggers**: Referenced by nightly-audit category C auto-fix and by `/test-template color-token`.
- **Outputs**: DETECT/SCOPE/DECIDE/FIX decision tree applied to SCSS files with color violations.
- **Cross-references**: `.claude/fix-templates/tests/color-token/`, `.claude/skills/nightly-audit/SKILL.md`, `.claude/skills/cssLayer/SKILL.md`
- **Approx size**: ~80 lines

---

### fix-templates/manual-subscription.md

- **Path**: `.claude/fix-templates/manual-subscription.md`
- **Stated purpose**: Fix template for manual RxJS subscription patterns (category F3). Version 1, last-score 5/5. DETECT→SCOPE→DECIDE→FIX decision tree for replacing manual subscribe() calls with async pipe or takeUntilDestroyed().
- **Inputs / triggers**: Referenced by nightly-audit category F auto-fix and by `/test-template manual-subscription`.
- **Outputs**: DETECT/SCOPE/DECIDE/FIX decision tree applied to TypeScript files with manual subscriptions.
- **Cross-references**: `.claude/fix-templates/tests/manual-subscription/`, `.claude/skills/nightly-audit/SKILL.md`
- **Approx size**: ~70 lines

---

### fix-templates/findings.md

- **Path**: `.claude/fix-templates/findings.md`
- **Stated purpose**: Open findings log for fix templates — tracks template issues discovered during test runs that haven't been fixed yet.
- **Inputs / triggers**: Written to by `/test-template` and `/reflect` when issues are found.
- **Outputs**: Running list of open fix-template issues.
- **Cross-references**: `.claude/fix-templates/color-token.md`, `.claude/fix-templates/manual-subscription.md`
- **Approx size**: ~variable

---

### fix-templates/tests/color-token/cases/ (directory)

- **Path**: `.claude/fix-templates/tests/color-token/cases/`
- **Stated purpose**: Test fixture SCSS files for the color-token fix template. Contains 6 fixture files: `ambiguous-flag.scss`, `fff-in-shadow.scss`, `fff-on-danger.scss`, `path-a-clear.scss`, `path-b-clear.scss`, `path-c-clear.scss`. Plus 2 `.context.md` context files.
- **Inputs / triggers**: Read by `/test-template color-token` and the reflect pipeline.
- **Outputs**: Input cases for behavior executor subagents.
- **Cross-references**: `.claude/fix-templates/color-token.md`, `.claude/fix-templates/tests/color-token/expected/`
- **Approx size**: 8 files

---

### fix-templates/tests/color-token/expected/ (directory)

- **Path**: `.claude/fix-templates/tests/color-token/expected/`
- **Stated purpose**: Expected output `.md` files for color-token test cases. One per fixture case — defines the correct DETECT/SCOPE/DECIDE/FIX output for each scenario.
- **Inputs / triggers**: Read by `/test-template color-token` for diff comparison.
- **Outputs**: Used as ground truth for scoring; not directly written during normal runs.
- **Cross-references**: `.claude/fix-templates/tests/color-token/cases/`, `.claude/fix-templates/color-token.md`
- **Approx size**: 6 files

---

### fix-templates/tests/manual-subscription/cases/ (directory)

- **Path**: `.claude/fix-templates/tests/manual-subscription/cases/`
- **Stated purpose**: Test fixture TypeScript files for the manual-subscription fix template. Contains 5 fixture `.ts` files covering different subscription patterns.
- **Inputs / triggers**: Read by `/test-template manual-subscription` and the reflect pipeline.
- **Outputs**: Input cases for behavior executor subagents.
- **Cross-references**: `.claude/fix-templates/manual-subscription.md`, `.claude/fix-templates/tests/manual-subscription/expected/`
- **Approx size**: 5 files

---

### fix-templates/tests/manual-subscription/expected/ (directory)

- **Path**: `.claude/fix-templates/tests/manual-subscription/expected/`
- **Stated purpose**: Expected output `.md` files for manual-subscription test cases. One per fixture case.
- **Inputs / triggers**: Read by `/test-template manual-subscription` for diff comparison.
- **Outputs**: Used as ground truth for scoring; not directly written during normal runs.
- **Cross-references**: `.claude/fix-templates/tests/manual-subscription/cases/`, `.claude/fix-templates/manual-subscription.md`
- **Approx size**: 5 files

---

### fix-templates/tests/history.jsonl

- **Path**: `.claude/fix-templates/tests/history.jsonl`
- **Stated purpose**: Append-only test run history for all fix templates. Records: template name, run timestamp, per-case pass/fail, overall score.
- **Inputs / triggers**: Written to by `/test-template` after each scoring run.
- **Outputs**: Historical record of fix template test scores over time.
- **Cross-references**: `.claude/commands/test-template.md`, `.claude/fix-templates/`
- **Approx size**: ~variable (grows with each test run)

---

## References

### references/hld-template.md

- **Path**: `.claude/references/hld-template.md`
- **Stated purpose**: HLD (High-Level Design) document template. Used by software-architect agent to produce consistent HLD outputs.
- **Inputs / triggers**: Read by `.claude/agents/software-architect.md` when producing an HLD.
- **Outputs**: Template structure; shapes HLD documents in `plans/` or `docs/`.
- **Cross-references**: `.claude/agents/software-architect.md`
- **Approx size**: ~50 lines

---

### references/prd-template.md

- **Path**: `.claude/references/prd-template.md`
- **Stated purpose**: PRD (Product Requirements Document) template. Used by product-manager agent to produce consistent PRDs.
- **Inputs / triggers**: Read by `.claude/agents/product-manager.md` when producing a PRD.
- **Outputs**: Template structure; shapes PRD documents.
- **Cross-references**: `.claude/agents/product-manager.md`
- **Approx size**: ~60 lines

---

### references/tab-orders.md

- **Path**: `.claude/references/tab-orders.md`
- **Stated purpose**: Keyboard tab navigation reference for the recipe builder and other UI flows. Documents the expected tab order for key interactive components.
- **Inputs / triggers**: Read when implementing or testing keyboard navigation in UI components.
- **Outputs**: Reference document; shapes tab index assignments.
- **Cross-references**: `.claude/agents/qa-engineer.md`
- **Approx size**: ~40 lines

---

### references/team-leader-output-template.md

- **Path**: `.claude/references/team-leader-output-template.md`
- **Stated purpose**: Standard output format template for the Team Leader agent — defines sections: Task Force Plan, Parallel Streams, Conflict Log, Progress Report.
- **Inputs / triggers**: Read by `.claude/agents/team-leader.md` when producing task force plans and progress reports.
- **Outputs**: Template structure; shapes team-leader outputs.
- **Cross-references**: `.claude/agents/team-leader.md`
- **Approx size**: ~40 lines

---

## Reports

### reports/audit/TEMPLATE.md

- **Path**: `.claude/reports/audit/TEMPLATE.md`
- **Stated purpose**: Template for nightly audit reports. Defines sections: Executive Summary, Category Results (A-F), Auto-fixes Applied, Open Items, Next Steps.
- **Inputs / triggers**: Used as template by nightly-audit skill when writing reports.
- **Outputs**: Template structure; shapes nightly audit report files.
- **Cross-references**: `.claude/skills/nightly-audit/SKILL.md`, `.claude/standards-scheduled-reporting.md`
- **Approx size**: ~40 lines

---

### reports/audit/2026-04-10-nightly-audit.md

- **Path**: `.claude/reports/audit/2026-04-10-nightly-audit.md`
- **Stated purpose**: Nightly audit report generated on 2026-04-10.
- **Inputs / triggers**: Generated by nightly-audit skill run.
- **Outputs**: Historical record.
- **Cross-references**: `.claude/reports/audit/TEMPLATE.md`
- **Approx size**: ~variable

---

### reports/audit/2026-04-10-plan.md

- **Path**: `.claude/reports/audit/2026-04-10-plan.md`
- **Stated purpose**: Action plan generated from the 2026-04-10 nightly audit findings.
- **Inputs / triggers**: Created after nightly audit to track remediation tasks.
- **Outputs**: Historical record.
- **Cross-references**: `.claude/reports/audit/2026-04-10-nightly-audit.md`
- **Approx size**: ~variable

---

### reports/audit/archive/ (directory)

- **Path**: `.claude/reports/audit/archive/`
- **Stated purpose**: Archive of nightly audit reports older than the 7-report retention window. Contains 2 archived reports.
- **Inputs / triggers**: Reports moved here by nightly-audit skill when >7 reports exist.
- **Outputs**: Long-term audit history.
- **Cross-references**: `.claude/skills/nightly-audit/SKILL.md`
- **Approx size**: 2 files

---

### reports/audit/subscription-audit.md

- **Path**: `.claude/reports/audit/subscription-audit.md`
- **Stated purpose**: Dedicated audit report for RxJS subscription patterns across the codebase.
- **Inputs / triggers**: Generated by a targeted subscription audit run.
- **Outputs**: Historical record of subscription pattern violations.
- **Cross-references**: `.claude/fix-templates/manual-subscription.md`
- **Approx size**: ~variable

---

### reports/audit-sessions/2026-04-14-audit-session.md

- **Path**: `.claude/reports/audit-sessions/2026-04-14-audit-session.md`
- **Stated purpose**: Audit session log from 2026-04-14 — records what was audited, findings, and actions taken during that session.
- **Inputs / triggers**: Written during audit sessions.
- **Outputs**: Session log; historical record.
- **Cross-references**: `.claude/reports/audit/`
- **Approx size**: ~variable

---

### reports/audit-sessions/2026-04-16-audit-session.md

- **Path**: `.claude/reports/audit-sessions/2026-04-16-audit-session.md`
- **Stated purpose**: Audit session log from 2026-04-16.
- **Inputs / triggers**: Written during audit session.
- **Outputs**: Session log; historical record.
- **Cross-references**: `.claude/reports/audit/`
- **Approx size**: ~variable

---

## Sessions

### sessions/README.md

- **Path**: `.claude/sessions/README.md`
- **Stated purpose**: Explains the two types of session artifacts: (1) plan-session directories (`YYYY-MM-DD-slug/`) containing `brief.md` and `session-handoff.md` — created by plan-implementation; (2) checkpoint flat files — created by `/checkpoint` command for mid-task snapshots.
- **Inputs / triggers**: Read when navigating the sessions directory.
- **Outputs**: Reference document.
- **Cross-references**: `.claude/commands/brief.md`, `.claude/commands/plan-implementation.md`, `.claude/skills/context-management/SKILL.md`
- **Approx size**: ~20 lines

---

### sessions/.gitkeep

- **Path**: `.claude/sessions/.gitkeep`
- **Stated purpose**: Git placeholder to keep the `sessions/` directory tracked.
- **Inputs / triggers**: N/A
- **Outputs**: N/A
- **Cross-references**: N/A
- **Approx size**: 0 lines

---

### sessions/ — session directories (35 directories)

- **Path**: `.claude/sessions/{session-id}/`
- **Stated purpose**: Each directory corresponds to one planning session. Contains up to 3 files: `brief.md` (session source of truth), `session-handoff.md` (end-of-session report), `session-handoff-continuation.md` (continuation report if session spanned multiple context windows).
- **Inputs / triggers**: Created by plan-implementation (Step 0) when a new session-id is generated. `session-handoff.md` written by end-of-session-agent.
- **Outputs**: `brief.md`, `session-handoff.md`, optionally `session-handoff-continuation.md` per session.
- **Cross-references**: `.claude/commands/brief.md`, `.claude/commands/plan-implementation.md`, `.claude/agents/end-of-session-agent.md`, `.claude/sessions/README.md`
- **Approx size**: 35 directories × 1-3 files each (variable per session)

---

## Tech Debt Reports

### techdebt-reports/ (directory)

- **Path**: `.claude/techdebt-reports/`
- **Stated purpose**: Rolling retention of tech debt audit reports (max 7). Files named `techdebt-YYYY-MM-DD.md`. Currently contains 8 files: `techdebt-2026-03-27.md` through `techdebt-2026-04-19.md`.
- **Inputs / triggers**: Written by techdebt skill after each scan. Oldest deleted when >7 exist.
- **Outputs**: 7 most recent tech debt reports (the 8th will trigger deletion of the oldest on next run).
- **Cross-references**: `.claude/skills/techdebt/SKILL.md`, `.claude/agents/end-of-session-agent.md`
- **Approx size**: 8 files × variable

---

## Retrospectives

### retrospectives/2026-04-03-10-00-unified-ai-modal.md

- **Path**: `.claude/retrospectives/2026-04-03-10-00-unified-ai-modal.md`
- **Stated purpose**: Session retrospective for the unified AI modal session from 2026-04-03. Generated by `/evaluate-me` command.
- **Inputs / triggers**: Written by evaluate-me command.
- **Outputs**: Historical session performance record.
- **Cross-references**: `.claude/commands/evaluate-me.md`, `.claude/reflect/evaluator.md`
- **Approx size**: ~variable

---

### retrospectives/.gitkeep

- **Path**: `.claude/retrospectives/.gitkeep`
- **Stated purpose**: Git placeholder to keep the `retrospectives/` directory tracked.
- **Inputs / triggers**: N/A
- **Outputs**: N/A
- **Cross-references**: N/A
- **Approx size**: 0 lines

---

## Docs

### docs/end-of-session-analysis.md

- **Path**: `.claude/docs/end-of-session-analysis.md`
- **Stated purpose**: Generated 2026-04-08. Inventory table of the session-end workflow — documents all phases of the end-of-session pipeline as it existed at that date.
- **Inputs / triggers**: Historical analysis document; not updated automatically.
- **Outputs**: Reference document for end-of-session-agent development.
- **Cross-references**: `.claude/agents/end-of-session-agent.md`
- **Approx size**: ~variable

---

### docs/end-session-agent-brife.md

- **Path**: `.claude/end-session-agent-brife.md`
- **Stated purpose**: Development brief used to create the end-of-session-agent. Historical artifact; the agent is now implemented.
- **Inputs / triggers**: No longer active. Historical record.
- **Outputs**: None (historical).
- **Cross-references**: `.claude/agents/end-of-session-agent.md`
- **Approx size**: ~variable

---

## Handoffs (top-level)

### handoffs/session-audit-2026-04-12.md

- **Path**: `.claude/handoffs/session-audit-2026-04-12.md`
- **Stated purpose**: Session handoff for the audit evaluation loop from 2026-04-12.
- **Inputs / triggers**: Written by end-of-session-agent.
- **Outputs**: Historical handoff record.
- **Cross-references**: `.claude/agents/end-of-session-agent.md`
- **Approx size**: ~variable

---

## Workflows

### workflows/deploy.yml

- **Path**: `.claude/workflows/deploy.yml`
- **Stated purpose**: GitHub Actions workflow — triggers on push to `main`, runs `ng build`, deploys to GitHub Pages.
- **Inputs / triggers**: Fires on `git push` to `main` branch via GitHub Actions.
- **Outputs**: Deployed Angular SPA on GitHub Pages.
- **Cross-references**: `.claude/skills/deploy-github-pages/SKILL.md`, `.claude/standards-git.md`
- **Approx size**: ~30 lines

---

## Active Task Ledgers

### todo.md

- **Path**: `.claude/todo.md`
- **Stated purpose**: Active tasks ledger. Sections: `# Active Tasks` (skip in auto-solve), then plan sections (`### Plan NNN`) containing atomic sub-tasks with `[ ]`/`[x]` state.
- **Inputs / triggers**: Written to by save-plan skill (adding tasks), execute-it (marking [x]), sweep-stale-todos (removing completed sections).
- **Outputs**: Current task state; drives auto-solve and execute-it execution order.
- **Cross-references**: `.claude/skills/save-plan/SKILL.md`, `.claude/commands/execute-it.md`, `.claude/commands/sweep-stale-todos.md`, `.claude/todo-archive.md`
- **Approx size**: ~variable (active tasks)

---

### todo-archive.md

- **Path**: `.claude/todo-archive.md`
- **Stated purpose**: Archive of completed task sections. All-[x] plan sections are moved here by sweep-stale-todos and execute-it's auto-archive step.
- **Inputs / triggers**: Appended to by execute-it (when all tasks in a plan section are [x]) and by sweep-stale-todos.
- **Outputs**: Historical record of completed tasks under `## Done` section.
- **Cross-references**: `.claude/todo.md`, `.claude/commands/sweep-stale-todos.md`, `.claude/commands/execute-it.md`
- **Approx size**: ~variable (grows over time)

---

## Miscellaneous

### scheduled_tasks.lock

- **Path**: `.claude/scheduled_tasks.lock`
- **Stated purpose**: JSON lock file preventing concurrent scheduled task runs. Contains: `sessionId`, `pid`, `acquiredAt`.
- **Inputs / triggers**: Written by scheduled task runner before starting; deleted on completion.
- **Outputs**: Lock held during scheduled task execution; prevents double-runs.
- **Cross-references**: `.claude/standards-scheduled-reporting.md`
- **Approx size**: ~5 lines (JSON)

---

### .session-state-path

- **Path**: `.claude/.session-state-path`
- **Stated purpose**: Contains the path to the current session's `docs/session-state.md` variant (e.g., `docs/session-state-audit-268...`). Used by hooks to locate the correct session state file.
- **Inputs / triggers**: Written by session-startup.sh at session start.
- **Outputs**: Path string read by hooks and scripts that need to write session state.
- **Cross-references**: `docs/session-state.md`, `scripts/session-startup.sh`
- **Approx size**: 1 line

---

## Worktrees

### worktrees/ (directory)

- **Path**: `.claude/worktrees/`
- **Stated purpose**: Directory tracking active and recent worktrees for parallel multi-agent work. Contains 5 subdirectories: `auto-solve/`, `fluttering-dreaming-leaf/`, `niget/`, `self/`, `small/`. Each subdirectory corresponds to a named worktree session.
- **Inputs / triggers**: Created/managed by worktree-setup skill on demand.
- **Outputs**: Worktree metadata (port assignments, root paths).
- **Cross-references**: `.claude/skills/worktree-setup/SKILL.md`, `.claude/skills/worktree-session-end/SKILL.md`
- **Approx size**: 5 subdirectories (metadata files within each)
