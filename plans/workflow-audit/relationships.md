# Relationship Map — Master Edge List

Every edge traced from a Cross-references field in the Stage 1 inventory.
Format: `- [source] --(edge-type)--> [target]   [inventory file : entry]`

Node naming: `.claude/` prefix omitted for nodes inside `.claude/`. Gate-chain roots (CLAUDE.md, agent.md) kept as-is. External targets prefixed `[EXT]`.

Edge vocabulary: `invokes` · `delegates-to` · `gates` · `reads` · `writes` · `consumes-skill` · `redirects-to` · `triggered-by` · `references` · `external`

---

## Gate Chain

- CLAUDE.md --(gates)--> agent.md   [gc: CLAUDE.md — "Order: CLAUDE.md → agent.md → .claude/copilot-instructions.md"]
- CLAUDE.md --(gates)--> copilot-instructions.md   [gc: CLAUDE.md — "mandates reading agent.md and .claude/copilot-instructions.md before responding"]
- CLAUDE.md --(references)--> sessions/   [gc: CLAUDE.md — Cross-refs: "checkpoints"]
- CLAUDE.md --(external)--> [EXT] docs/session-state.md   [gc: CLAUDE.md — Cross-refs]
- CLAUDE.md --(external)--> [EXT] scripts/branch-guard.sh   [gc: CLAUDE.md — Cross-refs]
- CLAUDE.md --(external)--> [EXT] ~/.claude/skills/gstack/   [gc: CLAUDE.md — Cross-refs]
- agent.md --(gates)--> copilot-instructions.md   [gc: agent.md — "Read at session start immediately after CLAUDE.md"]
- agent.md --(reads)--> instructions/validation-checklist.md   [gc: agent.md — Cross-refs]
- agent.md --(references)--> agents/   [gc: agent.md — Cross-refs: "all 8 agent files"]
- agent.md --(references)--> commands/   [gc: agent.md — Cross-refs: "all commands"]
- copilot-instructions.md --(references)--> standards-angular.md   [gc: copilot-instructions.md — Cross-refs]
- copilot-instructions.md --(references)--> standards-security.md   [gc: copilot-instructions.md — Cross-refs]
- copilot-instructions.md --(references)--> standards-domain.md   [gc: copilot-instructions.md — Cross-refs]
- copilot-instructions.md --(references)--> standards-git.md   [gc: copilot-instructions.md — Cross-refs]
- copilot-instructions.md --(references)--> standards-backend.md   [gc: copilot-instructions.md — Cross-refs]
- copilot-instructions.md --(references)--> agents/   [gc: copilot-instructions.md — Cross-refs: "all .claude/agents/*.md files"]
- copilot-instructions.md --(references)--> skills/   [gc: copilot-instructions.md — Cross-refs: "all .claude/skills/*/SKILL.md files"]
- copilot-instructions.md --(references)--> commands/   [gc: copilot-instructions.md — Cross-refs: "all .claude/commands/*.md files"]
- copilot-instructions.md --(external)--> [EXT] plans/   [gc: copilot-instructions.md — Cross-refs]

**Gate chain subtotal: 19 edges**

---

## Agents

- agents/breadcrumb-navigator.md --(consumes-skill)--> skills/breadcrumb-navigator/SKILL.md   [ag: breadcrumb-navigator.md — "Reads .claude/skills/breadcrumb-navigator/SKILL.md for the execution protocol"]
- agents/breadcrumb-navigator.md --(references)--> skills/update-docs/SKILL.md   [ag: breadcrumb-navigator.md — Cross-refs]
- agents/end-of-session-agent.md --(delegates-to)--> agents/git-agent.md   [ag: end-of-session-agent.md — "Optionally runs git commit/push via git-agent"]
- agents/end-of-session-agent.md --(consumes-skill)--> skills/techdebt/SKILL.md   [ag: end-of-session-agent.md — Cross-refs]
- agents/end-of-session-agent.md --(consumes-skill)--> skills/update-docs/SKILL.md   [ag: end-of-session-agent.md — Cross-refs]
- agents/end-of-session-agent.md --(consumes-skill)--> skills/worktree-session-end/SKILL.md   [ag: end-of-session-agent.md — Cross-refs]
- agents/end-of-session-agent.md --(references)--> skills/end-session/SKILL.md   [ag: end-of-session-agent.md — Cross-refs]
- agents/end-of-session-agent.md --(reads)--> todo.md   [ag: end-of-session-agent.md — "Requires: outstanding todos"]
- agents/end-of-session-agent.md --(writes)--> todo-archive.md   [ag: end-of-session-agent.md — "Archives completed todos to todo-archive.md"]
- agents/end-of-session-agent.md --(writes)--> sessions/   [ag: end-of-session-agent.md — "Session handoff report written to .claude/sessions/{id}/session-handoff.md"]
- agents/end-of-session-agent.md --(external)--> [EXT] docs/session-state.md   [ag: end-of-session-agent.md — "Writes docs/session-state.md"]
- agents/git-agent.md --(reads)--> standards-git.md   [ag: git-agent.md — "Reads .claude/standards-git.md"]
- agents/git-agent.md --(references)--> copilot-instructions.md   [ag: git-agent.md — Cross-refs]
- agents/git-agent.md --(references)--> CLAUDE.md   [ag: git-agent.md — Cross-refs: "CLAUDE.md (branch rule)"]
- agents/product-manager.md --(reads)--> references/prd-template.md   [ag: product-manager.md — "Reads .claude/references/prd-template.md"]
- agents/product-manager.md --(references)--> commands/new-feature.md   [ag: product-manager.md — Cross-refs]
- agents/product-manager.md --(references)--> commands/plan-implementation.md   [ag: product-manager.md — Cross-refs]
- agents/qa-engineer.md --(reads)--> instructions/validation-checklist.md   [ag: qa-engineer.md — Cross-refs]
- agents/qa-engineer.md --(external)--> [EXT] ~/.claude/skills/gstack/ (/qa)   [ag: qa-engineer.md — Cross-refs: "gstack /qa skill"]
- agents/security-officer.md --(reads)--> standards-security.md   [ag: security-officer.md — "Reads .claude/standards-security.md"]
- agents/security-officer.md --(reads)--> skills/auth-crypto/SKILL.md   [ag: security-officer.md — Cross-refs]
- agents/security-officer.md --(reads)--> skills/auth-and-logging/SKILL.md   [ag: security-officer.md — Cross-refs]
- agents/security-officer.md --(external)--> [EXT] ~/.claude/skills/gstack/ (/cso)   [ag: security-officer.md — Cross-refs: "gstack /cso skill"]
- agents/software-architect.md --(reads)--> references/hld-template.md   [ag: software-architect.md — "Reads .claude/references/hld-template.md"]
- agents/software-architect.md --(reads)--> standards-angular.md   [ag: software-architect.md — Cross-refs]
- agents/software-architect.md --(reads)--> standards-backend.md   [ag: software-architect.md — Cross-refs]
- agents/software-architect.md --(references)--> commands/plan-implementation.md   [ag: software-architect.md — Cross-refs]
- agents/team-leader.md --(reads)--> references/team-leader-output-template.md   [ag: team-leader.md — "Reads .claude/references/team-leader-output-template.md"]
- agents/team-leader.md --(reads)--> copilot-instructions.md   [ag: team-leader.md — Cross-refs: "§0.4, §0.5"]
- agents/team-leader.md --(references)--> agents/   [ag: team-leader.md — Cross-refs: "all other agent persona files"]

**Agents subtotal: 30 edges**

---

## Commands

- commands/adversarial-template.md --(writes)--> fix-templates/   [cm: adversarial-template.md — "New fixture files under .claude/fix-templates/tests/"]
- commands/adversarial-template.md --(references)--> commands/reflect.md   [cm: adversarial-template.md — Cross-refs]
- commands/adversarial-template.md --(references)--> commands/test-template.md   [cm: adversarial-template.md — Cross-refs]
- commands/audit.md --(consumes-skill)--> skills/interface-design/SKILL.md   [cm: audit.md — "Reads .claude/skills/interface-design/SKILL.md first"]
- commands/audit-report.md --(reads)--> reports/audit/   [cm: audit-report.md — "displays the latest nightly audit report"]
- commands/audit-report.md --(references)--> commands/nightly-audit.md   [cm: audit-report.md — Cross-refs]
- commands/audit-report.md --(reads)--> standards-scheduled-reporting.md   [cm: audit-report.md — Cross-refs]
- commands/auto-solve.md --(reads)--> todo.md   [cm: auto-solve.md — "Finds the next incomplete task in todo.md"]
- commands/auto-solve.md --(invokes)--> commands/plan-implementation.md   [cm: auto-solve.md — "runs plan-implementation and execute-it"]
- commands/auto-solve.md --(invokes)--> commands/execute-it.md   [cm: auto-solve.md — Cross-refs]
- commands/auto-solve.md --(external)--> [EXT] ~/.claude/skills/gstack/ (/browse)   [cm: auto-solve.md — Cross-refs: "gstack /browse skill"]
- commands/brief.md --(writes)--> sessions/   [cm: brief.md — "Writes to .claude/sessions/{session-id}/brief.md"]
- commands/brief.md --(references)--> commands/plan-implementation.md   [cm: brief.md — Cross-refs]
- commands/brief.md --(references)--> commands/execute-it.md   [cm: brief.md — Cross-refs]
- commands/critique.md --(consumes-skill)--> skills/interface-design/SKILL.md   [cm: critique.md — "Reads .claude/skills/interface-design/SKILL.md first"]
- commands/diary.md --(external)--> [EXT] MemPalace MCP (mempalace_diary_write)   [cm: diary.md — Cross-refs]
- commands/diary.md --(references)--> skills/session-handoff/SKILL.md   [cm: diary.md — Cross-refs]
- commands/evaluate-me.md --(reads)--> reflect/evaluator.md   [cm: evaluate-me.md — Cross-refs]
- commands/evaluate-me.md --(reads)--> reflect/evaluator-agent-prompt.md   [cm: evaluate-me.md — Cross-refs]
- commands/evaluate-me.md --(writes)--> retrospectives/   [cm: evaluate-me.md — "saves it to retrospectives/"]
- commands/execute-it.md --(reads)--> instructions/validation-checklist.md   [cm: execute-it.md — "Loads @.claude/instructions/validation-checklist.md"]
- commands/execute-it.md --(consumes-skill)--> skills/save-plan/SKILL.md   [cm: execute-it.md — "saves it via save-plan"]
- commands/execute-it.md --(references)--> commands/plan-implementation.md   [cm: execute-it.md — Cross-refs]
- commands/execute-it.md --(reads)--> sessions/   [cm: execute-it.md — Cross-refs: reads session brief]
- commands/execute-it.md --(writes)--> todo.md   [cm: execute-it.md — "updated todo.md"]
- commands/execute-it.md --(external)--> [EXT] plans/   [cm: execute-it.md — Cross-refs: "plans/NNN-slug.plan.md"]
- commands/extract.md --(consumes-skill)--> skills/interface-design/SKILL.md   [cm: extract.md — Cross-refs]
- commands/extract.md --(writes)--> skills/interface-design/references/   [cm: extract.md — "added to the interface-design skill's reference files"]
- commands/git.md --(delegates-to)--> agents/git-agent.md   [cm: git.md — "Delegates all git operations to git-agent.md"]
- commands/init.md --(consumes-skill)--> skills/interface-design/SKILL.md   [cm: init.md — "Reads .claude/skills/interface-design/SKILL.md first"]
- commands/init.md --(consumes-skill)--> skills/cssLayer/SKILL.md   [cm: init.md — Cross-refs]
- commands/mp-wake-up.md --(external)--> [EXT] MemPalace MCP (mempalace_list_wings, mempalace_list_rooms)   [cm: mp-wake-up.md — Cross-refs]
- commands/new-feature.md --(invokes)--> commands/brief.md   [cm: new-feature.md — Cross-refs]
- commands/new-feature.md --(invokes)--> commands/plan-implementation.md   [cm: new-feature.md — Cross-refs; upgraded from `references` per D-12]
- commands/new-feature.md --(external)--> [EXT] MemPalace MCP   [cm: new-feature.md — Cross-refs]
- commands/nightly-audit.md --(consumes-skill)--> skills/nightly-audit/SKILL.md   [cm: nightly-audit.md — "Loads .claude/skills/nightly-audit/SKILL.md and executes"]
- commands/nightly-audit.md --(writes)--> reports/audit/   [cm: nightly-audit.md — "Audit report at .claude/reports/audit/..."]
- commands/nightly-audit.md --(reads)--> standards-scheduled-reporting.md   [cm: nightly-audit.md — Cross-refs]
- commands/plan-implementation.md --(reads)--> instructions/validation-checklist.md   [cm: plan-implementation.md — "Loads @.claude/instructions/validation-checklist.md"]
- commands/plan-implementation.md --(invokes)--> commands/brief.md   [cm: plan-implementation.md — "Captures session brief (Step 0)"]
- commands/plan-implementation.md --(references)--> commands/execute-it.md   [cm: plan-implementation.md — Cross-refs]
- commands/plan-implementation.md --(writes)--> sessions/   [cm: plan-implementation.md — "Session brief at .claude/sessions/{session-id}/brief.md"]
- commands/plan-implementation.md --(external)--> [EXT] MemPalace MCP   [cm: plan-implementation.md — Cross-refs]
- commands/quick-chat.md --(consumes-skill)--> skills/quick-chat/SKILL.md   [cm: quick-chat.md — "Bypasses github-sync and end-of-session triggers"]
- commands/quick-chat.md --(references)--> skills/github-sync/SKILL.md   [cm: quick-chat.md — Cross-refs]
- commands/reflect.md --(reads)--> reflect/evaluator.md   [cm: reflect.md — Cross-refs]
- commands/reflect.md --(reads)--> reflect/evaluator-agent-prompt.md   [cm: reflect.md — Cross-refs]
- commands/reflect.md --(reads)--> reflect/reflect-runner-prompt.md   [cm: reflect.md — Cross-refs]
- commands/reflect.md --(reads)--> reflect/behavior-runner-prompt.md   [cm: reflect.md — Cross-refs]
- commands/reflect.md --(invokes)--> reflect/test-runner.sh   [cm: reflect.md — "mutation testing via test-runner.sh"]
- commands/reflect.md --(writes)--> reflect/reflection-log.tsv   [cm: reflect.md — "entries in reflection-log.tsv"]
- commands/reflect.md --(writes)--> reflect/test-quality-log.md   [cm: reflect.md — "mutation test results in test-quality-log.md"]
- commands/reflect.md --(reads)--> fix-templates/   [cm: reflect.md — Cross-refs]
- commands/reflect.md --(writes)--> skills/   [cm: reflect.md — "Updated SKILL.md files (when improvement score beats baseline)"]
- commands/reflect.md --(writes)--> retrospectives/   [cm: reflect.md — "retrospective entry in retrospectives/"]
- commands/reflect-add-tests.md --(writes)--> fix-templates/   [cm: reflect-add-tests.md — "New fixture files under .claude/fix-templates/tests/"]
- commands/reflect-add-tests.md --(references)--> commands/reflect.md   [cm: reflect-add-tests.md — Cross-refs]
- commands/reflect-add-tests.md --(references)--> commands/test-template.md   [cm: reflect-add-tests.md — Cross-refs]
- commands/reflect-list.md --(reads)--> reflect/failure-log.tsv   [cm: reflect-list.md — "Reads .claude/reflect/failure-log.tsv"]
- commands/reflect-list.md --(reads)--> reflect/tool-failure-hook.ps1   [cm: reflect-list.md — Cross-refs]
- commands/status.md --(consumes-skill)--> skills/interface-design/SKILL.md   [cm: status.md — Cross-refs]
- commands/sweep-stale-todos.md --(reads)--> todo.md   [cm: sweep-stale-todos.md — Cross-refs]
- commands/sweep-stale-todos.md --(writes)--> todo-archive.md   [cm: sweep-stale-todos.md — Cross-refs]
- commands/test-pr-review-merge.md --(delegates-to)--> agents/git-agent.md   [cm: test-pr-review-merge.md — Cross-refs]
- commands/test-pr-review-merge.md --(reads)--> standards-git.md   [cm: test-pr-review-merge.md — Cross-refs]
- commands/test-pr-review-merge.md --(external)--> [EXT] ~/.claude/skills/gstack/ (/ship)   [cm: test-pr-review-merge.md — Cross-refs]
- commands/test-template.md --(reads)--> fix-templates/tests/   [cm: test-template.md — Cross-refs]
- commands/test-template.md --(writes)--> fix-templates/tests/history.jsonl   [cm: test-template.md — "writes results to history.jsonl"]
- commands/test-template.md --(references)--> commands/reflect.md   [cm: test-template.md — Cross-refs]
- commands/test-template.md --(invokes)--> reflect/test-runner.sh   [cm: test-template.md — Cross-refs]
- commands/validate-agent-refs.md --(reads)--> agents/   [cm: validate-agent-refs.md — "verifies every file referenced in agent persona files"]
- commands/validate-agent-refs.md --(reads)--> commands/   [cm: validate-agent-refs.md — Cross-refs]
- commands/validate-agent-refs.md --(reads)--> skills/   [cm: validate-agent-refs.md — Cross-refs]

**Commands subtotal: 71 edges**

---

## Skills

- skills/add-recipe/SKILL.md --(reads)--> standards-domain.md   [sk: add-recipe/SKILL.md — Cross-refs]
- skills/angularComponentStructure/SKILL.md --(reads)--> standards-angular.md   [sk: angularComponentStructure/SKILL.md — Cross-refs]
- skills/angularComponentStructure/SKILL.md --(references)--> skills/cssLayer/SKILL.md   [sk: angularComponentStructure/SKILL.md — Cross-refs]
- skills/angular-pipe-logic/SKILL.md --(reads)--> standards-angular.md   [sk: angular-pipe-logic/SKILL.md — Cross-refs]
- skills/auth-and-logging/SKILL.md --(reads)--> standards-security.md   [sk: auth-and-logging/SKILL.md — Cross-refs]
- skills/auth-and-logging/SKILL.md --(invokes)--> agents/security-officer.md   [sk: auth-and-logging/SKILL.md — "Mandatory Security Officer invocation on completion"]
- skills/auth-crypto/SKILL.md --(reads)--> standards-security.md   [sk: auth-crypto/SKILL.md — Cross-refs]
- skills/auth-crypto/SKILL.md --(invokes)--> agents/security-officer.md   [sk: auth-crypto/SKILL.md — "Mandatory Security Officer sign-off at completion"]
- skills/breadcrumb-navigator/SKILL.md --(references)--> agents/breadcrumb-navigator.md   [sk: breadcrumb-navigator/SKILL.md — Cross-refs]
- skills/breadcrumb-navigator/SKILL.md --(references)--> skills/update-docs/SKILL.md   [sk: breadcrumb-navigator/SKILL.md — Cross-refs]
- skills/context-management/SKILL.md --(writes)--> sessions/   [sk: context-management/SKILL.md — "Checkpoint file at .claude/sessions/..."]
- skills/context-management/SKILL.md --(external)--> [EXT] docs/session-state.md   [sk: context-management/SKILL.md — Cross-refs]
- skills/cssLayer/SKILL.md --(reads)--> standards-angular.md   [sk: cssLayer/SKILL.md — Cross-refs]
- skills/cssLayer/SKILL.md --(references)--> skills/cssLayer-workspace/   [sk: cssLayer/SKILL.md — Cross-refs: "eval data"]
- skills/cssLayer-workspace/ --(references)--> skills/cssLayer/SKILL.md   [sk: cssLayer-workspace/ — Cross-refs]
- skills/cssLayer-workspace/ --(references)--> commands/reflect.md   [sk: cssLayer-workspace/ — Cross-refs]
- skills/cssLayer-workspace/ --(references)--> reflect/coverage/cssLayer.coverage.md   [sk: cssLayer-workspace/ — Cross-refs]
- skills/deploy-github-pages/SKILL.md --(references)--> workflows/deploy.yml   [sk: deploy-github-pages/SKILL.md — Cross-refs]
- skills/deploy-github-pages/SKILL.md --(invokes)--> agents/git-agent.md   [sk: deploy-github-pages/SKILL.md — Cross-refs]
- skills/elegant-fix/SKILL.md --(reads)--> standards-angular.md   [sk: elegant-fix/SKILL.md — Cross-refs]
- skills/end-session/SKILL.md --(delegates-to)--> agents/end-of-session-agent.md   [sk: end-session/SKILL.md — "Delegates entirely to .claude/agents/end-of-session-agent.md via Agent tool"]
- skills/finalize-docs/SKILL.md --(invokes)--> skills/breadcrumb-navigator/SKILL.md   [sk: finalize-docs/SKILL.md — Cross-refs]
- skills/finalize-docs/SKILL.md --(invokes)--> skills/update-docs/SKILL.md   [sk: finalize-docs/SKILL.md — Cross-refs]
- skills/github-sync/SKILL.md --(external)--> [EXT] notes/github-sync/   [sk: github-sync/SKILL.md — Cross-refs]
- skills/github-sync/SKILL.md --(references)--> skills/worktree-setup/SKILL.md   [sk: github-sync/SKILL.md — Cross-refs]
- skills/interface-design/SKILL.md --(consumes-skill)--> skills/cssLayer/SKILL.md   [sk: interface-design/SKILL.md — Cross-refs]
- skills/interface-design/SKILL.md --(consumes-skill)--> skills/angularComponentStructure/SKILL.md   [sk: interface-design/SKILL.md — Cross-refs]
- skills/interface-design/SKILL.md --(reads)--> skills/interface-design/references/   [sk: interface-design/SKILL.md — Cross-refs]
- skills/interface-design/references/critique.md --(references)--> skills/interface-design/SKILL.md   [sk: critique.md — Cross-refs]
- skills/interface-design/references/example.md --(references)--> skills/interface-design/SKILL.md   [sk: example.md — Cross-refs]
- skills/interface-design/references/principles.md --(references)--> skills/interface-design/SKILL.md   [sk: principles.md — Cross-refs]
- skills/interface-design/references/validation.md --(references)--> skills/interface-design/SKILL.md   [sk: validation.md — Cross-refs]
- skills/interface-design/references/validation.md --(references)--> instructions/validation-checklist.md   [sk: validation.md — Cross-refs]
- skills/mp-search/SKILL.md --(external)--> [EXT] MemPalace MCP (mempalace_search, mempalace_kg_query, mempalace_list_wings)   [sk: mp-search/SKILL.md — Cross-refs]
- skills/nightly-audit/SKILL.md --(writes)--> reports/audit/   [sk: nightly-audit/SKILL.md — Cross-refs]
- skills/nightly-audit/SKILL.md --(reads)--> standards-angular.md   [sk: nightly-audit/SKILL.md — Cross-refs]
- skills/nightly-audit/SKILL.md --(reads)--> standards-domain.md   [sk: nightly-audit/SKILL.md — Cross-refs]
- skills/nightly-audit/SKILL.md --(reads)--> standards-security.md   [sk: nightly-audit/SKILL.md — Cross-refs]
- skills/nightly-audit/SKILL.md --(reads)--> standards-scheduled-reporting.md   [sk: nightly-audit/SKILL.md — Cross-refs]
- skills/quick-chat/SKILL.md --(references)--> skills/github-sync/SKILL.md   [sk: quick-chat/SKILL.md — Cross-refs]
- skills/quick-chat/SKILL.md --(references)--> skills/end-session/SKILL.md   [sk: quick-chat/SKILL.md — Cross-refs]
- skills/save-plan/SKILL.md --(writes)--> todo.md   [sk: save-plan/SKILL.md — Cross-refs]
- skills/save-plan/SKILL.md --(external)--> [EXT] plans/   [sk: save-plan/SKILL.md — Cross-refs]
- skills/save-plan/SKILL.md --(external)--> [EXT] MemPalace MCP (mempalace_kg_add)   [sk: save-plan/SKILL.md — Cross-refs]
- skills/session-handoff/SKILL.md --(redirects-to)--> skills/end-session/SKILL.md   [sk: session-handoff/SKILL.md — "Delegates to end-session skill via Skill tool"]
- skills/techdebt/SKILL.md --(writes)--> techdebt-reports/   [sk: techdebt/SKILL.md — Cross-refs]
- skills/techdebt/SKILL.md --(references)--> agents/end-of-session-agent.md   [sk: techdebt/SKILL.md — Cross-refs]
- skills/update-docs/SKILL.md --(invokes)--> skills/breadcrumb-navigator/SKILL.md   [sk: update-docs/SKILL.md — Cross-refs]
- skills/update-docs/SKILL.md --(references)--> agents/breadcrumb-navigator.md   [sk: update-docs/SKILL.md — Cross-refs]
- skills/worktree-session-end/SKILL.md --(references)--> skills/worktree-setup/SKILL.md   [sk: worktree-session-end/SKILL.md — Cross-refs]
- skills/worktree-session-end/SKILL.md --(references)--> agents/end-of-session-agent.md   [sk: worktree-session-end/SKILL.md — Cross-refs]
- skills/worktree-session-end/SKILL.md --(references)--> CLAUDE.md   [sk: worktree-session-end/SKILL.md — Cross-refs: "worktree boundary rule"]
- skills/worktree-setup/SKILL.md --(references)--> CLAUDE.md   [sk: worktree-setup/SKILL.md — Cross-refs]
- skills/worktree-setup/SKILL.md --(references)--> skills/worktree-session-end/SKILL.md   [sk: worktree-setup/SKILL.md — Cross-refs]

**Skills subtotal: 54 edges**

---

## Instructions

- instructions/validation-checklist.md --(references)--> commands/execute-it.md   [in: validation-checklist.md — Cross-refs: "(override)"]
- instructions/validation-checklist.md --(references)--> commands/plan-implementation.md   [in: validation-checklist.md — Cross-refs]

**Instructions subtotal: 2 edges**

---

## Misc

### Settings & Configuration

- settings.json --(external)--> [EXT] scripts/branch-guard.sh   [mx: settings.json — Cross-refs: PreToolUse hook]
- settings.json --(external)--> [EXT] scripts/session-startup.sh   [mx: settings.json — Cross-refs: SessionStart hook]
- settings.json --(references)--> reflect/tool-failure-hook.ps1   [mx: settings.json — Cross-refs: PostToolUse hook]
- settings.json --(external)--> [EXT] scripts/context-monitor.sh   [mx: settings.json — Cross-refs: PostToolUse hook]
- settings.json --(external)--> [EXT] scripts/pre-compact-reminder.sh   [mx: settings.json — Cross-refs: PreCompact hook]
- settings.json --(external)--> [EXT] scripts/handoff-check.sh   [mx: settings.json — Cross-refs: Stop hook]
- settings.local.json --(references)--> settings.json   [mx: settings.local.json — Cross-refs: "merges with settings.json"]
- mcp.json --(references)--> copilot-instructions.md   [mx: mcp.json — Cross-refs]
- mcp.json --(references)--> CLAUDE.md   [mx: mcp.json — Cross-refs]

### Standards

- standards-angular.md --(references)--> skills/angularComponentStructure/SKILL.md   [mx: standards-angular.md — Cross-refs]
- standards-angular.md --(references)--> skills/cssLayer/SKILL.md   [mx: standards-angular.md — Cross-refs]
- standards-angular.md --(references)--> skills/angular-pipe-logic/SKILL.md   [mx: standards-angular.md — Cross-refs]
- standards-backend.md --(references)--> copilot-instructions.md   [mx: standards-backend.md — Cross-refs: "Backend persistence trigger"]
- standards-domain.md --(references)--> skills/add-recipe/SKILL.md   [mx: standards-domain.md — Cross-refs]
- standards-domain.md --(references)--> copilot-instructions.md   [mx: standards-domain.md — Cross-refs]
- standards-git.md --(references)--> agents/git-agent.md   [mx: standards-git.md — Cross-refs]
- standards-git.md --(references)--> CLAUDE.md   [mx: standards-git.md — Cross-refs: "branch rule"]
- standards-scheduled-reporting.md --(references)--> skills/nightly-audit/SKILL.md   [mx: standards-scheduled-reporting.md — Cross-refs]
- standards-scheduled-reporting.md --(references)--> commands/audit-report.md   [mx: standards-scheduled-reporting.md — Cross-refs]
- standards-scheduled-reporting.md --(references)--> reports/audit/   [mx: standards-scheduled-reporting.md — Cross-refs]
- standards-security.md --(references)--> agents/security-officer.md   [mx: standards-security.md — Cross-refs]
- standards-security.md --(references)--> skills/auth-and-logging/SKILL.md   [mx: standards-security.md — Cross-refs]
- standards-security.md --(references)--> skills/auth-crypto/SKILL.md   [mx: standards-security.md — Cross-refs]

### Hooks

- hooks/install-hooks.ps1 --(writes)--> hooks/post-commit   [mx: hooks/install-hooks.ps1 — "Copies post-commit and post-merge shell scripts"]
- hooks/install-hooks.ps1 --(writes)--> hooks/post-merge   [mx: hooks/install-hooks.ps1 — Cross-refs]
- hooks/post-commit --(external)--> [EXT] embed-runner.js   [mx: hooks/post-commit — Cross-refs]
- hooks/post-commit --(external)--> [EXT] MemPalace MCP   [mx: hooks/post-commit — Cross-refs]
- hooks/post-merge --(external)--> [EXT] embed-runner.js   [mx: hooks/post-merge — Cross-refs]
- hooks/post-merge --(external)--> [EXT] MemPalace MCP   [mx: hooks/post-merge — Cross-refs]

### Reflect

- reflect/auto-reflect.ps1 --(invokes)--> commands/reflect.md   [mx: reflect/auto-reflect.ps1 — "invokes /reflect AUTO mode via claude --print"]
- reflect/auto-reflect.ps1 --(references)--> reflect/reflection-log.tsv   [mx: reflect/auto-reflect.ps1 — Cross-refs]
- reflect/auto-reflection-log.tsv --(references)--> reflect/auto-reflect.ps1   [mx: reflect/auto-reflection-log.tsv — Cross-refs]
- reflect/auto-reflection-log.tsv --(references)--> commands/reflect.md   [mx: reflect/auto-reflection-log.tsv — Cross-refs]
- reflect/behavior-runner-prompt.md --(references)--> commands/reflect.md   [mx: reflect/behavior-runner-prompt.md — Cross-refs]
- reflect/behavior-runner-prompt.md --(references)--> reflect/evaluator.md   [mx: reflect/behavior-runner-prompt.md — Cross-refs]
- reflect/evaluator.md --(references)--> reflect/evaluator-agent-prompt.md   [mx: reflect/evaluator.md — Cross-refs]
- reflect/evaluator.md --(references)--> commands/reflect.md   [mx: reflect/evaluator.md — Cross-refs]
- reflect/evaluator-agent-prompt.md --(references)--> reflect/evaluator.md   [mx: reflect/evaluator-agent-prompt.md — Cross-refs]
- reflect/evaluator-agent-prompt.md --(references)--> commands/reflect.md   [mx: reflect/evaluator-agent-prompt.md — Cross-refs]
- reflect/failure-log.tsv --(references)--> reflect/tool-failure-hook.ps1   [mx: reflect/failure-log.tsv — Cross-refs]
- reflect/failure-log.tsv --(references)--> commands/reflect-list.md   [mx: reflect/failure-log.tsv — Cross-refs]
- reflect/failure-log-archive-2026-04.tsv --(references)--> reflect/failure-log.tsv   [mx: reflect/failure-log-archive — Cross-refs]
- reflect/last-session-context.md --(external)--> [EXT] docs/session-state.md   [mx: reflect/last-session-context.md — Cross-refs]
- reflect/reflect-runner-prompt.md --(references)--> commands/reflect.md   [mx: reflect/reflect-runner-prompt.md — Cross-refs]
- reflect/reflected-sessions.stamp --(references)--> reflect/auto-reflect.ps1   [mx: reflect/reflected-sessions.stamp — Cross-refs]
- reflect/reflected-sessions.stamp --(references)--> commands/reflect.md   [mx: reflect/reflected-sessions.stamp — Cross-refs]
- reflect/reflection-log.tsv --(references)--> commands/reflect.md   [mx: reflect/reflection-log.tsv — Cross-refs]
- reflect/reflection-log.tsv --(references)--> reflect/evaluator.md   [mx: reflect/reflection-log.tsv — Cross-refs]
- reflect/test-quality-log.md --(references)--> commands/reflect.md   [mx: reflect/test-quality-log.md — Cross-refs]
- reflect/test-quality-log.md --(references)--> reflect/test-runner.sh   [mx: reflect/test-quality-log.md — Cross-refs]
- reflect/test-runner.sh --(references)--> commands/reflect.md   [mx: reflect/test-runner.sh — Cross-refs]
- reflect/test-runner.sh --(reads)--> fix-templates/tests/   [mx: reflect/test-runner.sh — Cross-refs]
- reflect/test-suite-template.md --(references)--> reflect/test-suites/   [mx: reflect/test-suite-template.md — Cross-refs]
- reflect/test-suite-template.md --(references)--> commands/reflect-add-tests.md   [mx: reflect/test-suite-template.md — Cross-refs]
- reflect/test-suites/angularComponentStructure.tests.md --(references)--> skills/angularComponentStructure/SKILL.md   [mx: angularComponentStructure.tests.md — Cross-refs]
- reflect/test-suites/angularComponentStructure.tests.md --(references)--> reflect/test-runner.sh   [mx: angularComponentStructure.tests.md — Cross-refs]
- reflect/test-suites/cssLayer.tests.md --(references)--> skills/cssLayer/SKILL.md   [mx: cssLayer.tests.md — Cross-refs]
- reflect/test-suites/cssLayer.tests.md --(references)--> reflect/test-runner.sh   [mx: cssLayer.tests.md — Cross-refs]
- reflect/tool-failure-hook.ps1 --(references)--> settings.json   [mx: reflect/tool-failure-hook.ps1 — Cross-refs: "PostToolUse hook registration"]
- reflect/tool-failure-hook.ps1 --(writes)--> reflect/failure-log.tsv   [mx: reflect/tool-failure-hook.ps1 — "appends failed tool calls to failure-log.tsv"]
- reflect/coverage/cssLayer.coverage.md --(references)--> reflect/test-suites/cssLayer.tests.md   [mx: cssLayer.coverage.md — Cross-refs]
- reflect/coverage/cssLayer.coverage.md --(references)--> skills/cssLayer/SKILL.md   [mx: cssLayer.coverage.md — Cross-refs]
- reflect/evidence/ --(references)--> commands/reflect.md   [mx: reflect/evidence/ — Cross-refs]
- reflect/evidence/ --(references)--> reflect/evaluator.md   [mx: reflect/evidence/ — Cross-refs]

### Fix Templates

- fix-templates/color-token.md --(references)--> fix-templates/tests/color-token/   [mx: color-token.md — Cross-refs]
- fix-templates/color-token.md --(references)--> skills/nightly-audit/SKILL.md   [mx: color-token.md — Cross-refs]
- fix-templates/color-token.md --(references)--> skills/cssLayer/SKILL.md   [mx: color-token.md — Cross-refs]
- fix-templates/manual-subscription.md --(references)--> fix-templates/tests/manual-subscription/   [mx: manual-subscription.md — Cross-refs]
- fix-templates/manual-subscription.md --(references)--> skills/nightly-audit/SKILL.md   [mx: manual-subscription.md — Cross-refs]
- fix-templates/findings.md --(references)--> fix-templates/color-token.md   [mx: findings.md — Cross-refs]
- fix-templates/findings.md --(references)--> fix-templates/manual-subscription.md   [mx: findings.md — Cross-refs]
- fix-templates/tests/color-token/cases/ --(references)--> fix-templates/color-token.md   [mx: cases/ — Cross-refs]
- fix-templates/tests/color-token/cases/ --(references)--> fix-templates/tests/color-token/expected/   [mx: cases/ — Cross-refs]
- fix-templates/tests/color-token/expected/ --(references)--> fix-templates/tests/color-token/cases/   [mx: expected/ — Cross-refs]
- fix-templates/tests/color-token/expected/ --(references)--> fix-templates/color-token.md   [mx: expected/ — Cross-refs]
- fix-templates/tests/manual-subscription/cases/ --(references)--> fix-templates/manual-subscription.md   [mx: cases/ — Cross-refs]
- fix-templates/tests/manual-subscription/cases/ --(references)--> fix-templates/tests/manual-subscription/expected/   [mx: cases/ — Cross-refs]
- fix-templates/tests/manual-subscription/expected/ --(references)--> fix-templates/tests/manual-subscription/cases/   [mx: expected/ — Cross-refs]
- fix-templates/tests/manual-subscription/expected/ --(references)--> fix-templates/manual-subscription.md   [mx: expected/ — Cross-refs]
- fix-templates/tests/history.jsonl --(references)--> commands/test-template.md   [mx: history.jsonl — Cross-refs]
- fix-templates/tests/history.jsonl --(references)--> fix-templates/   [mx: history.jsonl — Cross-refs]

### References

- references/hld-template.md --(references)--> agents/software-architect.md   [mx: hld-template.md — Cross-refs]
- references/prd-template.md --(references)--> agents/product-manager.md   [mx: prd-template.md — Cross-refs]
- references/tab-orders.md --(references)--> agents/qa-engineer.md   [mx: tab-orders.md — Cross-refs]
- references/team-leader-output-template.md --(references)--> agents/team-leader.md   [mx: team-leader-output-template.md — Cross-refs]

### Reports

- reports/audit/TEMPLATE.md --(references)--> skills/nightly-audit/SKILL.md   [mx: TEMPLATE.md — Cross-refs]
- reports/audit/TEMPLATE.md --(references)--> standards-scheduled-reporting.md   [mx: TEMPLATE.md — Cross-refs]
- reports/audit/2026-04-10-nightly-audit.md --(references)--> reports/audit/TEMPLATE.md   [mx: 2026-04-10-nightly-audit.md — Cross-refs]
- reports/audit/2026-04-10-plan.md --(references)--> reports/audit/2026-04-10-nightly-audit.md   [mx: 2026-04-10-plan.md — Cross-refs]
- reports/audit/archive/ --(references)--> skills/nightly-audit/SKILL.md   [mx: archive/ — Cross-refs]
- reports/audit/subscription-audit.md --(references)--> fix-templates/manual-subscription.md   [mx: subscription-audit.md — Cross-refs]
- reports/audit-sessions/2026-04-14-audit-session.md --(references)--> reports/audit/   [mx: 2026-04-14-audit-session.md — Cross-refs]
- reports/audit-sessions/2026-04-16-audit-session.md --(references)--> reports/audit/   [mx: 2026-04-16-audit-session.md — Cross-refs]

### Sessions

- sessions/README.md --(references)--> commands/brief.md   [mx: sessions/README.md — Cross-refs]
- sessions/README.md --(references)--> commands/plan-implementation.md   [mx: sessions/README.md — Cross-refs]
- sessions/README.md --(references)--> skills/context-management/SKILL.md   [mx: sessions/README.md — Cross-refs]
- sessions/ --(references)--> commands/brief.md   [mx: sessions/ — Cross-refs]
- sessions/ --(references)--> commands/plan-implementation.md   [mx: sessions/ — Cross-refs]
- sessions/ --(references)--> agents/end-of-session-agent.md   [mx: sessions/ — Cross-refs]
- sessions/ --(references)--> sessions/README.md   [mx: sessions/ — Cross-refs]

### Task Ledgers

- todo.md --(references)--> skills/save-plan/SKILL.md   [mx: todo.md — Cross-refs]
- todo.md --(references)--> commands/execute-it.md   [mx: todo.md — Cross-refs]
- todo.md --(references)--> commands/sweep-stale-todos.md   [mx: todo.md — Cross-refs]
- todo.md --(references)--> todo-archive.md   [mx: todo.md — Cross-refs]
- todo-archive.md --(references)--> todo.md   [mx: todo-archive.md — Cross-refs]
- todo-archive.md --(references)--> commands/sweep-stale-todos.md   [mx: todo-archive.md — Cross-refs]
- todo-archive.md --(references)--> commands/execute-it.md   [mx: todo-archive.md — Cross-refs]

### Tech Debt & Retrospectives

- techdebt-reports/ --(references)--> skills/techdebt/SKILL.md   [mx: techdebt-reports/ — Cross-refs]
- techdebt-reports/ --(references)--> agents/end-of-session-agent.md   [mx: techdebt-reports/ — Cross-refs]
- retrospectives/2026-04-03-10-00-unified-ai-modal.md --(references)--> commands/evaluate-me.md   [mx: retrospective — Cross-refs]
- retrospectives/2026-04-03-10-00-unified-ai-modal.md --(references)--> reflect/evaluator.md   [mx: retrospective — Cross-refs]

### Docs & Handoffs

- docs/end-of-session-analysis.md --(references)--> agents/end-of-session-agent.md   [mx: end-of-session-analysis.md — Cross-refs]
- end-session-agent-brife.md --(references)--> agents/end-of-session-agent.md   [mx: end-session-agent-brife.md — Cross-refs]
- handoffs/session-audit-2026-04-12.md --(references)--> agents/end-of-session-agent.md   [mx: session-audit-2026-04-12.md — Cross-refs]

### Workflows, Locks, Worktrees

- workflows/deploy.yml --(references)--> skills/deploy-github-pages/SKILL.md   [mx: deploy.yml — Cross-refs]
- workflows/deploy.yml --(references)--> standards-git.md   [mx: deploy.yml — Cross-refs]
- scheduled_tasks.lock --(references)--> standards-scheduled-reporting.md   [mx: scheduled_tasks.lock — Cross-refs]
- .session-state-path --(external)--> [EXT] docs/session-state.md   [mx: .session-state-path — Cross-refs]
- .session-state-path --(external)--> [EXT] scripts/session-startup.sh   [mx: .session-state-path — Cross-refs]
- worktrees/ --(references)--> skills/worktree-setup/SKILL.md   [mx: worktrees/ — Cross-refs]
- worktrees/ --(references)--> skills/worktree-session-end/SKILL.md   [mx: worktrees/ — Cross-refs]

**Misc subtotal: 113 edges**

---

## Unverified / Implied

These edges are strongly suggested by Inputs/triggers or Outputs fields but do NOT appear in any Cross-references field. They are excluded from the main list per the brief's rules.

1. hooks/post-commit --(triggered-by)--> git commit event — stated in Inputs/triggers ("Fires automatically after every git commit") but git commit event is not in any Cross-references field.
2. hooks/post-merge --(triggered-by)--> git merge event — same reason.
3. reflect/auto-reflect.ps1 --(triggered-by)--> settings.json Stop hook — stated as "Registered as the Stop hook in settings.json (scripts/handoff-check.sh wraps it)" in Inputs/triggers; neither settings.json nor handoff-check.sh appears in auto-reflect.ps1's Cross-refs.
4. commands/reflect.md --(writes)--> reflect/reflected-sessions.stamp — stated in stamp's Inputs/triggers "Written by reflect pipeline after each run"; not in reflect.md's Cross-refs.
5. commands/reflect.md --(writes)--> reflect/evidence/ — stated in evidence/'s Inputs/triggers "Written by reflect skill during evaluation runs"; not in reflect.md's Cross-refs.
6. skills/nightly-audit/SKILL.md --(writes)--> reports/audit/archive/ — implied by "Oldest deleted when >7 exist" behavior; archive/ Cross-refs only point to nightly-audit/SKILL.md (inbound), not the other direction in nightly-audit's own Cross-refs list.
7. gstack --(references)--> CLAUDE.md, security-officer.md, qa-engineer.md — these edges originate from gstack's Cross-references field, but gstack is an external node. Edges from external to internal are recorded here rather than the main list because the brief stops traversal at the .claude/ boundary.
8. commands/reflect.md --(reads)--> skills/ (for baseline capture) — reflect reads existing SKILL.md files as baseline before mutation; implied by the reflect pipeline description but skills/ appears in Cross-refs only as a write target ("Updated SKILL.md files"), not explicitly as a read target.

---

## Coverage

**Total edges: 291**
_(19 gate-chain + 30 agents + 71 commands + 54 skills + 2 instructions + 113 misc + 2 = note: misc counted separately above)_

Recounted by section: 19 + 30 + 71 + 54 + 2 + 113 = **289 main-list edges** + **8 unverified/implied**

### Edges per source category

| Category | Edge count |
|----------|-----------|
| Gate chain | 19 |
| Agents | 30 |
| Commands | 71 |
| Skills | 54 |
| Instructions | 2 |
| Misc | 113 |
| **Total** | **289** |

### Leaf nodes (zero outbound edges in main list)

These nodes appear only as targets; no outbound edges found in their own Cross-references fields (or they are placeholders):

- reflect/coverage/.gitkeep
- sessions/.gitkeep
- retrospectives/.gitkeep
- reflect/failure-log-archive-2026-04.tsv (one outbound to failure-log.tsv, not zero — see list; actually has 1 edge, so not a true leaf)
- fix-templates/tests/history.jsonl (has 2 outbound references edges)
- reports/audit/2026-04-10-plan.md (1 outbound)
- reports/audit/subscription-audit.md (1 outbound)
- handoffs/session-audit-2026-04-12.md (1 outbound)
- end-session-agent-brife.md (1 outbound)
- docs/end-of-session-analysis.md (1 outbound)

True zero-outbound nodes (no Cross-references at all):
- reflect/coverage/.gitkeep
- sessions/.gitkeep
- retrospectives/.gitkeep

### Nodes with zero inbound edges (never referenced by anything else in the main list)

These nodes are sources only — no other node's Cross-references field names them as a target:

- settings.local.json
- mcp.json
- hooks/install-hooks.ps1
- commands/mp-wake-up.md
- commands/validate-agent-refs.md
- reflect/auto-reflection-log.tsv
- reflect/test-suite-template.md
- reflect/last-session-context.md
- scheduled_tasks.lock
- .session-state-path
- worktrees/
- reports/audit-sessions/2026-04-14-audit-session.md
- reports/audit-sessions/2026-04-16-audit-session.md
