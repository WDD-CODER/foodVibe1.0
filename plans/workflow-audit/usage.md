# Usage Classification

Every named node from the Stage 1 inventory classified by runtime signals.
Evidence-based only. Classification rules applied in order: rule 1 (5+ commits/90d) → rule 2 (invoked by core slash-command workflow) → rule 3 (active flow, strong edge type: invokes/delegates-to/writes). First match wins.

---

## Gate Chain

### CLAUDE.md
- **Path**: `CLAUDE.md`
- **Category**: gate
- **Inbound edges**: 5
- **Outbound edges**: 6
- **Runtime-loaded**: yes (loaded by Claude Code at session start as project-level gate)
- **Last modified**: 2026-04-17
- **Commits touching it (last 90 days)**: 14
- **Commits touching it (all time)**: 14
- **Classification**: used-often
- **Evidence**: 14 commits in 90 days + loaded at every session start.

---

### agent.md
- **Path**: `agent.md`
- **Category**: gate
- **Inbound edges**: 1
- **Outbound edges**: 4
- **Runtime-loaded**: yes (gate-chain, read immediately after CLAUDE.md)
- **Last modified**: 2026-04-15
- **Commits touching it (last 90 days)**: 48
- **Commits touching it (all time)**: 48
- **Classification**: used-often
- **Evidence**: 48 commits in 90 days — highest single-file commit count in the project.

---

### copilot-instructions.md
- **Path**: `.claude/copilot-instructions.md`
- **Category**: gate
- **Inbound edges**: 7
- **Outbound edges**: 9
- **Runtime-loaded**: yes (gate-chain, third mandatory read at session start)
- **Last modified**: 2026-04-17
- **Commits touching it (last 90 days)**: 38
- **Commits touching it (all time)**: 38
- **Classification**: used-often
- **Evidence**: 38 commits in 90 days + 7 inbound references + loaded every session.

---

## Agent Persona Files

### agents/breadcrumb-navigator.md
- **Path**: `.claude/agents/breadcrumb-navigator.md`
- **Category**: agent
- **Inbound edges**: 2
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-14
- **Commits touching it (last 90 days)**: 8
- **Commits touching it (all time)**: 8
- **Classification**: used-often
- **Evidence**: 8 commits in 90 days (rule 1).

---

### agents/end-of-session-agent.md
- **Path**: `.claude/agents/end-of-session-agent.md`
- **Category**: agent
- **Inbound edges**: 8
- **Outbound edges**: 9
- **Runtime-loaded**: no
- **Last modified**: 2026-04-17
- **Commits touching it (last 90 days)**: 12
- **Commits touching it (all time)**: 12
- **Classification**: used-often
- **Evidence**: 12 commits in 90 days + 8 inbound edges including Flow 3 delegation target.

---

### agents/git-agent.md
- **Path**: `.claude/agents/git-agent.md`
- **Category**: agent
- **Inbound edges**: 5
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-13
- **Commits touching it (last 90 days)**: 7
- **Commits touching it (all time)**: 7
- **Classification**: used-often
- **Evidence**: 7 commits in 90 days + delegates-to target from git.md, test-pr-review-merge.md, end-of-session-agent.md, deploy skill.

---

### agents/product-manager.md
- **Path**: `.claude/agents/product-manager.md`
- **Category**: agent
- **Inbound edges**: 1
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-14
- **Commits touching it (last 90 days)**: 8
- **Commits touching it (all time)**: 8
- **Classification**: used-often
- **Evidence**: 8 commits in 90 days (rule 1).

---

### agents/qa-engineer.md
- **Path**: `.claude/agents/qa-engineer.md`
- **Category**: agent
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-14
- **Commits touching it (last 90 days)**: 14
- **Commits touching it (all time)**: 14
- **Classification**: used-often
- **Evidence**: 14 commits in 90 days (rule 1).

---

### agents/security-officer.md
- **Path**: `.claude/agents/security-officer.md`
- **Category**: agent
- **Inbound edges**: 3
- **Outbound edges**: 4
- **Runtime-loaded**: no
- **Last modified**: 2026-04-14
- **Commits touching it (last 90 days)**: 8
- **Commits touching it (all time)**: 8
- **Classification**: used-often
- **Evidence**: 8 commits in 90 days (rule 1).

---

### agents/software-architect.md
- **Path**: `.claude/agents/software-architect.md`
- **Category**: agent
- **Inbound edges**: 1
- **Outbound edges**: 4
- **Runtime-loaded**: no
- **Last modified**: 2026-04-14
- **Commits touching it (last 90 days)**: 10
- **Commits touching it (all time)**: 10
- **Classification**: used-often
- **Evidence**: 10 commits in 90 days (rule 1).

---

### agents/team-leader.md
- **Path**: `.claude/agents/team-leader.md`
- **Category**: agent
- **Inbound edges**: 1
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-14
- **Commits touching it (last 90 days)**: 13
- **Commits touching it (all time)**: 13
- **Classification**: used-often
- **Evidence**: 13 commits in 90 days (rule 1).

---

## Command Files

### commands/adversarial-template.md
- **Path**: `.claude/commands/adversarial-template.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit in 90 days; 0 inbound edges; referenced only from reflect subsystem.

---

### commands/audit.md
- **Path**: `.claude/commands/audit.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-03-28
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; interface-design subsystem only.

---

### commands/audit-report.md
- **Path**: `.claude/commands/audit-report.md`
- **Category**: command
- **Inbound edges**: 1
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 1 inbound reference from standards-scheduled-reporting.md.

---

### commands/auto-solve.md
- **Path**: `.claude/commands/auto-solve.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 4
- **Runtime-loaded**: no
- **Last modified**: 2026-04-13
- **Commits touching it (last 90 days)**: 6
- **Commits touching it (all time)**: 6
- **Classification**: used-often
- **Evidence**: 6 commits in 90 days (rule 1); core execution orchestrator.

---

### commands/brief.md
- **Path**: `.claude/commands/brief.md`
- **Category**: command
- **Inbound edges**: 4
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-08
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-often
- **Evidence**: Rule 2 — directly invoked (invokes edge) by /plan-implementation and /new-feature; integral to Flow 2.

---

### commands/critique.md
- **Path**: `.claude/commands/critique.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-03-28
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; interface-design subsystem only.

---

### commands/diary.md
- **Path**: `.claude/commands/diary.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-09
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; lightweight alternative to full session-handoff.

---

### commands/evaluate-me.md
- **Path**: `.claude/commands/evaluate-me.md`
- **Category**: command
- **Inbound edges**: 1
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-02
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 1 inbound reference from a retrospective output file.

---

### commands/execute-it.md
- **Path**: `.claude/commands/execute-it.md`
- **Category**: command
- **Inbound edges**: 6
- **Outbound edges**: 6
- **Runtime-loaded**: no
- **Last modified**: 2026-04-13
- **Commits touching it (last 90 days)**: 9
- **Commits touching it (all time)**: 9
- **Classification**: used-often
- **Evidence**: 9 commits in 90 days + 6 inbound edges; core execution skill, Flow 2 step 7.

---

### commands/extract.md
- **Path**: `.claude/commands/extract.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-28
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; interface-design subsystem only.

---

### commands/git.md
- **Path**: `.claude/commands/git.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-03-27
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; thin delegate to git-agent.md.

---

### commands/init.md
- **Path**: `.claude/commands/init.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-28
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; interface-design UI builder.

---

### commands/mp-wake-up.md
- **Path**: `.claude/commands/mp-wake-up.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges (orphan); utility command with no callers.

---

### commands/new-feature.md
- **Path**: `.claude/commands/new-feature.md`
- **Category**: command
- **Inbound edges**: 1
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-14
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 1 inbound reference from product-manager.md.

---

### commands/nightly-audit.md
- **Path**: `.claude/commands/nightly-audit.md`
- **Category**: command
- **Inbound edges**: 1
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 1 inbound reference only.

---

### commands/plan-implementation.md
- **Path**: `.claude/commands/plan-implementation.md`
- **Category**: command
- **Inbound edges**: 9
- **Outbound edges**: 5
- **Runtime-loaded**: no
- **Last modified**: 2026-04-19
- **Commits touching it (last 90 days)**: 10
- **Commits touching it (all time)**: 10
- **Classification**: used-often
- **Evidence**: 10 commits in 90 days + 9 inbound edges; core planning skill, modified same day as today.

---

### commands/quick-chat.md
- **Path**: `.claude/commands/quick-chat.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-23
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; fast-path bypass command.

---

### commands/reflect.md
- **Path**: `.claude/commands/reflect.md`
- **Category**: command
- **Inbound edges**: 15
- **Outbound edges**: 10
- **Runtime-loaded**: no
- **Last modified**: 2026-04-09
- **Commits touching it (last 90 days)**: 8
- **Commits touching it (all time)**: 8
- **Classification**: used-often
- **Evidence**: 8 commits in 90 days + highest inbound edge count (15) in the entire graph.

---

### commands/reflect-add-tests.md
- **Path**: `.claude/commands/reflect-add-tests.md`
- **Category**: command
- **Inbound edges**: 1
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-03
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 1 inbound reference; human-in-the-loop test builder used occasionally.

---

### commands/reflect-list.md
- **Path**: `.claude/commands/reflect-list.md`
- **Category**: command
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; referenced by failure-log.tsv (Flow 6b downstream).

---

### commands/status.md
- **Path**: `.claude/commands/status.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-03-28
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; interface-design status display command.

---

### commands/sweep-stale-todos.md
- **Path**: `.claude/commands/sweep-stale-todos.md`
- **Category**: command
- **Inbound edges**: 2
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-13
- **Commits touching it (last 90 days)**: 3
- **Commits touching it (all time)**: 3
- **Classification**: used-rarely
- **Evidence**: 3 commits; 2 inbound references from todo.md and todo-archive.md.

---

### commands/test-pr-review-merge.md
- **Path**: `.claude/commands/test-pr-review-merge.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-03-19
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 0 inbound edges; CI/ship command with no callers in the workflow graph.

---

### commands/test-template.md
- **Path**: `.claude/commands/test-template.md`
- **Category**: command
- **Inbound edges**: 3
- **Outbound edges**: 4
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit despite 3 inbound references; fixture scorer used during test development, not ongoing.

---

### commands/validate-agent-refs.md
- **Path**: `.claude/commands/validate-agent-refs.md`
- **Category**: command
- **Inbound edges**: 0
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-08
- **Commits touching it (last 90 days)**: 8
- **Commits touching it (all time)**: 8
- **Classification**: used-often
- **Evidence**: 8 commits in 90 days (rule 1); health-check tool run repeatedly during agent development.

---

## Skills

### skills/add-recipe/SKILL.md
- **Path**: `.claude/skills/add-recipe/SKILL.md`
- **Category**: skill
- **Inbound edges**: 1
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-11
- **Commits touching it (last 90 days)**: 5
- **Commits touching it (all time)**: 5
- **Classification**: used-often
- **Evidence**: 5 commits in 90 days (rule 1).

---

### skills/angularComponentStructure/SKILL.md
- **Path**: `.claude/skills/angularComponentStructure/SKILL.md`
- **Category**: skill
- **Inbound edges**: 3
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-11
- **Commits touching it (last 90 days)**: 7
- **Commits touching it (all time)**: 7
- **Classification**: used-often
- **Evidence**: 7 commits in 90 days (rule 1); also has test suite and coverage tracking.

---

### skills/angular-pipe-logic/SKILL.md
- **Path**: `.claude/skills/angular-pipe-logic/SKILL.md`
- **Category**: skill
- **Inbound edges**: 1
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-11
- **Commits touching it (last 90 days)**: 3
- **Commits touching it (all time)**: 3
- **Classification**: used-rarely
- **Evidence**: 3 commits; 1 inbound reference from standards-angular.md.

---

### skills/auth-and-logging/SKILL.md
- **Path**: `.claude/skills/auth-and-logging/SKILL.md`
- **Category**: skill
- **Inbound edges**: 2
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-11
- **Commits touching it (last 90 days)**: 5
- **Commits touching it (all time)**: 5
- **Classification**: used-often
- **Evidence**: 5 commits in 90 days (rule 1).

---

### skills/auth-crypto/SKILL.md
- **Path**: `.claude/skills/auth-crypto/SKILL.md`
- **Category**: skill
- **Inbound edges**: 2
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-25
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; security-only skill, referenced by security-officer.md.

---

### skills/breadcrumb-navigator/SKILL.md
- **Path**: `.claude/skills/breadcrumb-navigator/SKILL.md`
- **Category**: skill
- **Inbound edges**: 3
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-25
- **Commits touching it (last 90 days)**: 5
- **Commits touching it (all time)**: 5
- **Classification**: used-often
- **Evidence**: 5 commits in 90 days (rule 1); invoked by update-docs and finalize-docs.

---

### skills/context-management/SKILL.md
- **Path**: `.claude/skills/context-management/SKILL.md`
- **Category**: skill
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-14
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 1 inbound reference from sessions/README.md.

---

### skills/cssLayer/SKILL.md
- **Path**: `.claude/skills/cssLayer/SKILL.md`
- **Category**: skill
- **Inbound edges**: 8
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-13
- **Commits touching it (last 90 days)**: 10
- **Commits touching it (all time)**: 10
- **Classification**: used-often
- **Evidence**: 10 commits in 90 days + 8 inbound edges (highest among skills); has test suite and coverage tracking.

---

### skills/cssLayer-workspace/
- **Path**: `.claude/skills/cssLayer-workspace/`
- **Category**: skill
- **Inbound edges**: 1
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-13
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; referenced as eval data workspace by cssLayer/SKILL.md.

---

### skills/deploy-github-pages/SKILL.md
- **Path**: `.claude/skills/deploy-github-pages/SKILL.md`
- **Category**: skill
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-25
- **Commits touching it (last 90 days)**: 3
- **Commits touching it (all time)**: 3
- **Classification**: used-rarely
- **Evidence**: 3 commits; 1 inbound reference from workflows/deploy.yml.

---

### skills/elegant-fix/SKILL.md
- **Path**: `.claude/skills/elegant-fix/SKILL.md`
- **Category**: skill
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-11
- **Commits touching it (last 90 days)**: 6
- **Commits touching it (all time)**: 6
- **Classification**: used-often
- **Evidence**: 6 commits in 90 days (rule 1).

---

### skills/end-session/SKILL.md
- **Path**: `.claude/skills/end-session/SKILL.md`
- **Category**: skill
- **Inbound edges**: 3
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-17
- **Commits touching it (last 90 days)**: 9
- **Commits touching it (all time)**: 9
- **Classification**: used-often
- **Evidence**: 9 commits in 90 days + delegates-to end-of-session-agent.md (Flow 3 step 2).

---

### skills/finalize-docs/SKILL.md
- **Path**: `.claude/skills/finalize-docs/SKILL.md`
- **Category**: skill
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-25
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 0 inbound edges; invokes breadcrumb-navigator and update-docs but nothing invokes it.

---

### skills/github-sync/SKILL.md
- **Path**: `.claude/skills/github-sync/SKILL.md`
- **Category**: skill
- **Inbound edges**: 2
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 9
- **Commits touching it (all time)**: 9
- **Classification**: used-often
- **Evidence**: 9 commits in 90 days (rule 1); referenced by quick-chat.md as something to bypass.

---

### skills/interface-design/SKILL.md
- **Path**: `.claude/skills/interface-design/SKILL.md`
- **Category**: skill
- **Inbound edges**: 9
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-03-28
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: Only 1 commit despite 9 inbound references; created once and never updated, referenced only by interface-design commands (audit, critique, extract, init, status) with 1 commit each.

---

### skills/interface-design/references/critique.md
- **Path**: `.claude/skills/interface-design/references/critique.md`
- **Category**: skill
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-03-28
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; reference document read by interface-design/SKILL.md on demand.

---

### skills/interface-design/references/example.md
- **Path**: `.claude/skills/interface-design/references/example.md`
- **Category**: skill
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-03-28
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; reference document read by interface-design/SKILL.md on demand.

---

### skills/interface-design/references/principles.md
- **Path**: `.claude/skills/interface-design/references/principles.md`
- **Category**: skill
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-03-28
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; reference document read by interface-design/SKILL.md on demand.

---

### skills/interface-design/references/validation.md
- **Path**: `.claude/skills/interface-design/references/validation.md`
- **Category**: skill
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-28
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; references validation-checklist.md but nothing references it.

---

### skills/mp-search/SKILL.md
- **Path**: `.claude/skills/mp-search/SKILL.md`
- **Category**: skill
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-11
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 0 inbound edges; MemPalace search utility with no callers in graph.

---

### skills/nightly-audit/SKILL.md
- **Path**: `.claude/skills/nightly-audit/SKILL.md`
- **Category**: skill
- **Inbound edges**: 6
- **Outbound edges**: 5
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 4
- **Commits touching it (all time)**: 4
- **Classification**: used-rarely
- **Evidence**: 4 commits; 6 inbound references but not 5+ commits in 90 days; nightly automation infrastructure.

---

### skills/quick-chat/SKILL.md
- **Path**: `.claude/skills/quick-chat/SKILL.md`
- **Category**: skill
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-08
- **Commits touching it (last 90 days)**: 3
- **Commits touching it (all time)**: 3
- **Classification**: used-rarely
- **Evidence**: 3 commits; consumed by quick-chat command for lightweight sessions.

---

### skills/save-plan/SKILL.md
- **Path**: `.claude/skills/save-plan/SKILL.md`
- **Category**: skill
- **Inbound edges**: 2
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-11
- **Commits touching it (last 90 days)**: 7
- **Commits touching it (all time)**: 7
- **Classification**: used-often
- **Evidence**: 7 commits in 90 days (rule 1); called by every execute-it run.

---

### skills/session-handoff/SKILL.md
- **Path**: `.claude/skills/session-handoff/SKILL.md`
- **Category**: skill
- **Inbound edges**: 1
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-17
- **Commits touching it (last 90 days)**: 8
- **Commits touching it (all time)**: 8
- **Classification**: used-often
- **Evidence**: 8 commits in 90 days (rule 1); Flow 3 entry point.

---

### skills/techdebt/SKILL.md
- **Path**: `.claude/skills/techdebt/SKILL.md`
- **Category**: skill
- **Inbound edges**: 2
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-11
- **Commits touching it (last 90 days)**: 7
- **Commits touching it (all time)**: 7
- **Classification**: used-often
- **Evidence**: 7 commits in 90 days (rule 1); consumed by end-of-session-agent in every session close.

---

### skills/update-docs/SKILL.md
- **Path**: `.claude/skills/update-docs/SKILL.md`
- **Category**: skill
- **Inbound edges**: 4
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-25
- **Commits touching it (last 90 days)**: 6
- **Commits touching it (all time)**: 6
- **Classification**: used-often
- **Evidence**: 6 commits in 90 days (rule 1); consumed by end-of-session-agent, invokes breadcrumb-navigator.

---

### skills/worktree-session-end/SKILL.md
- **Path**: `.claude/skills/worktree-session-end/SKILL.md`
- **Category**: skill
- **Inbound edges**: 3
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-08
- **Commits touching it (last 90 days)**: 8
- **Commits touching it (all time)**: 8
- **Classification**: used-often
- **Evidence**: 8 commits in 90 days (rule 1); consumed by end-of-session-agent for worktree cleanup.

---

### skills/worktree-setup/SKILL.md
- **Path**: `.claude/skills/worktree-setup/SKILL.md`
- **Category**: skill
- **Inbound edges**: 3
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-25
- **Commits touching it (last 90 days)**: 3
- **Commits touching it (all time)**: 3
- **Classification**: used-rarely
- **Evidence**: 3 commits; 3 inbound edges but on-demand worktree setup only, not part of regular session flow.

---

## Instructions

### instructions/validation-checklist.md
- **Path**: `.claude/instructions/validation-checklist.md`
- **Category**: instruction
- **Inbound edges**: 5
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-08
- **Commits touching it (last 90 days)**: 4
- **Commits touching it (all time)**: 4
- **Classification**: used-often
- **Evidence**: Rule 2 — @-loaded at top of execute-it.md and plan-implementation.md (mandatory read in every plan+execute cycle); 5 inbound edges.

---

## Settings & Configuration

### settings.json
- **Path**: `.claude/settings.json`
- **Category**: misc
- **Inbound edges**: 2
- **Outbound edges**: 6
- **Runtime-loaded**: yes (loaded by Claude Code at every session start)
- **Last modified**: 2026-04-19
- **Commits touching it (last 90 days)**: 28
- **Commits touching it (all time)**: 28
- **Classification**: used-often
- **Evidence**: 28 commits in 90 days + runtime-loaded at session start + registers all 6 hooks.

---

### settings.local.json
- **Path**: `.claude/settings.local.json`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: yes (merged with settings.json at session start)
- **Last modified**: 2026-03-22
- **Commits touching it (last 90 days)**: 15
- **Commits touching it (all time)**: 15
- **Classification**: used-often
- **Evidence**: 15 commits in 90 days + runtime-loaded (orphan by design — no workflow file references it since it's gitignored locally).

---

### mcp.json
- **Path**: `.claude/mcp.json`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: yes (loaded by Claude Code at session start to initialize MCP connections)
- **Last modified**: 2026-04-09
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: Runtime-loaded = yes (MemPalace MCP tools would be unavailable without it), but only 2 commits; orphan node by design — Claude Code reads it directly, no workflow file cites it.

---

## Standards Files

### standards-angular.md
- **Path**: `.claude/standards-angular.md`
- **Category**: misc
- **Inbound edges**: 7
- **Outbound edges**: 3
- **Runtime-loaded**: no (loaded on demand per copilot-instructions.md table)
- **Last modified**: 2026-03-25
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit despite 7 inbound references; created once and stabilized — high reference count indicates it's loaded often but rarely modified.

---

### standards-backend.md
- **Path**: `.claude/standards-backend.md`
- **Category**: misc
- **Inbound edges**: 2
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-11
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 2 inbound references (software-architect.md, copilot-instructions.md).

---

### standards-domain.md
- **Path**: `.claude/standards-domain.md`
- **Category**: misc
- **Inbound edges**: 3
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-25
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 3 inbound references; loaded on demand for Hebrew/Lucide domain rules.

---

### standards-git.md
- **Path**: `.claude/standards-git.md`
- **Category**: misc
- **Inbound edges**: 4
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-27
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 4 inbound references (git-agent.md, test-pr-review-merge.md, workflows/deploy.yml, CLAUDE.md back-ref).

---

### standards-scheduled-reporting.md
- **Path**: `.claude/standards-scheduled-reporting.md`
- **Category**: misc
- **Inbound edges**: 5
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 5 inbound references from audit subsystem; nightly-audit staging convention spec.

---

### standards-security.md
- **Path**: `.claude/standards-security.md`
- **Category**: misc
- **Inbound edges**: 5
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-03-27
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 5 inbound references; loaded on demand for auth/OWASP surface.

---

## Hooks

### hooks/install-hooks.ps1
- **Path**: `.claude/hooks/install-hooks.ps1`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no (run manually, not by Claude Code)
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; developer setup tool, run once per machine.

---

### hooks/post-commit
- **Path**: `.claude/hooks/post-commit`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: yes (triggered automatically after every git commit)
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: Runtime-loaded = yes (fires on every commit), but only 1 commit to the hook script itself; installed via install-hooks.ps1.

---

### hooks/post-merge
- **Path**: `.claude/hooks/post-merge`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: yes (triggered automatically after every git merge)
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: Runtime-loaded = yes (fires on merges), but only 1 commit to the hook script itself.

---

## Reflect System

### reflect/auto-reflect.ps1
- **Path**: `.claude/reflect/auto-reflect.ps1`
- **Category**: misc
- **Inbound edges**: 2
- **Outbound edges**: 2
- **Runtime-loaded**: yes (registered as Stop hook via scripts/handoff-check.sh)
- **Last modified**: 2026-04-09
- **Commits touching it (last 90 days)**: 3
- **Commits touching it (all time)**: 3
- **Classification**: used-often
- **Evidence**: Rule 3 — referenced in Flow 4 step 1 with invokes edge to reflect.md (strong); runtime-loaded = yes (Stop hook fires at every session close).

---

### reflect/auto-reflection-log.tsv
- **Path**: `.claude/reflect/auto-reflection-log.tsv`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 6
- **Commits touching it (all time)**: 6
- **Classification**: used-often
- **Evidence**: 6 commits in 90 days (rule 1); append-only log of AUTO-mode reflect runs.

---

### reflect/behavior-runner-prompt.md
- **Path**: `.claude/reflect/behavior-runner-prompt.md`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-04
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; IMMUTABLE subagent system prompt, read by reflect pipeline; 1 inbound reference.

---

### reflect/evaluator.md
- **Path**: `.claude/reflect/evaluator.md`
- **Category**: misc
- **Inbound edges**: 7
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-04
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits despite 7 inbound references; IMMUTABLE scoring spec — high reference count indicates importance, but rarely modified by design.

---

### reflect/evaluator-agent-prompt.md
- **Path**: `.claude/reflect/evaluator-agent-prompt.md`
- **Category**: misc
- **Inbound edges**: 3
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-04
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; IMMUTABLE blind-evaluator system prompt; read by reflect pipeline.

---

### reflect/failure-log.tsv
- **Path**: `.claude/reflect/failure-log.tsv`
- **Category**: misc
- **Inbound edges**: 3
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-18
- **Commits touching it (last 90 days)**: 16
- **Commits touching it (all time)**: 16
- **Classification**: used-often
- **Evidence**: 16 commits in 90 days (rule 1); written to by the PostToolUse hook on every tool failure — highest commit count in reflect subsystem.

---

### reflect/failure-log-archive-2026-04.tsv
- **Path**: `.claude/reflect/failure-log-archive-2026-04.tsv`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; rotated archive of the active failure log.

---

### reflect/last-session-context.md
- **Path**: `.claude/reflect/last-session-context.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-09
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; inventory explicitly states "Legacy... Historical artifact... No longer written to by current workflow"; superseded by docs/session-state.md.

---

### reflect/reflect-runner-prompt.md
- **Path**: `.claude/reflect/reflect-runner-prompt.md`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-04
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; IMMUTABLE background-reflect-runner system prompt.

---

### reflect/reflected-sessions.stamp
- **Path**: `.claude/reflect/reflected-sessions.stamp`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; deduplication stamp written by reflect pipeline (unverified write edge in Stage 2).

---

### reflect/reflection-log.tsv
- **Path**: `.claude/reflect/reflection-log.tsv`
- **Category**: misc
- **Inbound edges**: 2
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-06
- **Commits touching it (last 90 days)**: 4
- **Commits touching it (all time)**: 4
- **Classification**: used-often
- **Evidence**: Rule 3 — written by reflect.md in Flow 4 (writes = strong edge type); 4 commits confirm activity.

---

### reflect/test-quality-log.md
- **Path**: `.claude/reflect/test-quality-log.md`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-03
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-often
- **Evidence**: Rule 3 — written by reflect.md in Flow 4 (writes = strong edge type); mutation test results log.

---

### reflect/test-runner.sh
- **Path**: `.claude/reflect/test-runner.sh`
- **Category**: misc
- **Inbound edges**: 5
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-04
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-often
- **Evidence**: Rule 3 — invoked by reflect.md in Flow 4 (invokes = strong edge type); 5 inbound edges; IMMUTABLE bash scorer.

---

### reflect/test-suite-template.md
- **Path**: `.claude/reflect/test-suite-template.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-04
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 0 inbound edges; format template for new test suites.

---

### reflect/test-suites/angularComponentStructure.tests.md
- **Path**: `.claude/reflect/test-suites/angularComponentStructure.tests.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-06
- **Commits touching it (last 90 days)**: 3
- **Commits touching it (all time)**: 3
- **Classification**: used-rarely
- **Evidence**: 3 commits; 0 inbound edges; test suite for angularComponentStructure skill, used during reflect runs.

---

### reflect/test-suites/cssLayer.tests.md
- **Path**: `.claude/reflect/test-suites/cssLayer.tests.md`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-06
- **Commits touching it (last 90 days)**: 4
- **Commits touching it (all time)**: 4
- **Classification**: used-rarely
- **Evidence**: 4 commits; referenced by cssLayer.coverage.md; test suite for cssLayer skill.

---

### reflect/tool-failure-hook.ps1
- **Path**: `.claude/reflect/tool-failure-hook.ps1`
- **Category**: misc
- **Inbound edges**: 3
- **Outbound edges**: 2
- **Runtime-loaded**: yes (registered as PostToolUse hook in settings.json, fires on every tool call)
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-often
- **Evidence**: Rule 3 — writes failure-log.tsv (writes = strong) in Flow 6b; runtime-loaded = yes (fires on every PostToolUse event).

---

### reflect/coverage/cssLayer.coverage.md
- **Path**: `.claude/reflect/coverage/cssLayer.coverage.md`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-06
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; coverage tracking for cssLayer test suite.

---

### reflect/coverage/.gitkeep
- **Path**: `.claude/reflect/coverage/.gitkeep`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 0
- **Runtime-loaded**: no
- **Last modified**: 2026-04-03
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; directory placeholder; coverage/ has real content (cssLayer.coverage.md) so this .gitkeep is functionally redundant.

---

### reflect/evidence/
- **Path**: `.claude/reflect/evidence/`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 4
- **Commits touching it (all time)**: 4
- **Classification**: used-rarely
- **Evidence**: 4 commits; written during reflect evaluation runs (unverified write edge per Stage 2); 0 inbound edges.

---

## Fix Templates

### fix-templates/color-token.md
- **Path**: `.claude/fix-templates/color-token.md`
- **Category**: misc
- **Inbound edges**: 3
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-15
- **Commits touching it (last 90 days)**: 3
- **Commits touching it (all time)**: 3
- **Classification**: used-rarely
- **Evidence**: 3 commits; 3 inbound references; CSS color token fix template, v3 at last-score 6/6.

---

### fix-templates/manual-subscription.md
- **Path**: `.claude/fix-templates/manual-subscription.md`
- **Category**: misc
- **Inbound edges**: 4
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-15
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 4 inbound references; RxJS subscription fix template, v1 at last-score 5/5.

---

### fix-templates/findings.md
- **Path**: `.claude/fix-templates/findings.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-15
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 0 inbound edges; open findings log for fix templates.

---

### fix-templates/tests/color-token/cases/
- **Path**: `.claude/fix-templates/tests/color-token/cases/`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 6 fixture files for color-token scoring runs.

---

### fix-templates/tests/color-token/expected/
- **Path**: `.claude/fix-templates/tests/color-token/expected/`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 6 expected-output files used as ground truth by test-template.

---

### fix-templates/tests/manual-subscription/cases/
- **Path**: `.claude/fix-templates/tests/manual-subscription/cases/`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 5 fixture TypeScript files for manual-subscription scoring.

---

### fix-templates/tests/manual-subscription/expected/
- **Path**: `.claude/fix-templates/tests/manual-subscription/expected/`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 5 expected-output files used as ground truth.

---

### fix-templates/tests/history.jsonl
- **Path**: `.claude/fix-templates/tests/history.jsonl`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-15
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; append-only scoring history written by /test-template.

---

## References

### references/hld-template.md
- **Path**: `.claude/references/hld-template.md`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-03-19
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; read by software-architect.md when producing HLDs.

---

### references/prd-template.md
- **Path**: `.claude/references/prd-template.md`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-03-19
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; read by product-manager.md when producing PRDs.

---

### references/tab-orders.md
- **Path**: `.claude/references/tab-orders.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-03-19
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; keyboard nav reference, referenced only by qa-engineer.md.

---

### references/team-leader-output-template.md
- **Path**: `.claude/references/team-leader-output-template.md`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-03-19
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; read by team-leader.md for output format.

---

## Reports

### reports/audit/TEMPLATE.md
- **Path**: `.claude/reports/audit/TEMPLATE.md`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; shapes nightly audit report format.

---

### reports/audit/2026-04-10-nightly-audit.md
- **Path**: `.claude/reports/audit/2026-04-10-nightly-audit.md`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; historical nightly audit output, not modified after generation.

---

### reports/audit/2026-04-10-plan.md
- **Path**: `.claude/reports/audit/2026-04-10-plan.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-10
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; remediation plan from a past audit run.

---

### reports/audit/archive/
- **Path**: `.claude/reports/audit/archive/`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-17
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; long-term audit archive, populated by nightly-audit when >7 reports exist.

---

### reports/audit/subscription-audit.md
- **Path**: `.claude/reports/audit/subscription-audit.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; one-time targeted subscription audit output.

---

### reports/audit-sessions/2026-04-14-audit-session.md
- **Path**: `.claude/reports/audit-sessions/2026-04-14-audit-session.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-15
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges (orphan); session log from audit session on 2026-04-14.

---

### reports/audit-sessions/2026-04-16-audit-session.md
- **Path**: `.claude/reports/audit-sessions/2026-04-16-audit-session.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-17
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges (orphan); session log from audit session on 2026-04-16.

---

## Sessions

### sessions/README.md
- **Path**: `.claude/sessions/README.md`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-14
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; explains the two artifact types in sessions/; reference document.

---

### sessions/.gitkeep
- **Path**: `.claude/sessions/.gitkeep`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 0
- **Runtime-loaded**: no
- **Last modified**: 2026-04-08
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; placeholder; sessions/ now contains 35+ active directories making .gitkeep functionally redundant.

---

### sessions/ (pattern node — 35 session directories)
- **Path**: `.claude/sessions/{session-id}/`
- **Category**: misc
- **Inbound edges**: 6
- **Outbound edges**: 4
- **Runtime-loaded**: no
- **Last modified**: 2026-04-19
- **Commits touching it (last 90 days)**: 38
- **Commits touching it (all time)**: 38
- **Classification**: used-often
- **Evidence**: 38 commits in 90 days + 6 inbound edges; written by plan-implementation and end-of-session-agent on every planning session.

---

## Tech Debt Reports

### techdebt-reports/
- **Path**: `.claude/techdebt-reports/`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-19
- **Commits touching it (last 90 days)**: 10
- **Commits touching it (all time)**: 10
- **Classification**: used-often
- **Evidence**: 10 commits in 90 days (rule 1); 8 active reports, written at every session close.

---

## Retrospectives

### retrospectives/2026-04-03-10-00-unified-ai-modal.md
- **Path**: `.claude/retrospectives/2026-04-03-10-00-unified-ai-modal.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-03
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; single historical retrospective output, not referenced by active workflow.

---

### retrospectives/.gitkeep
- **Path**: `.claude/retrospectives/.gitkeep`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 0
- **Runtime-loaded**: no
- **Last modified**: 2026-04-02
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; placeholder; the retrospectives/ directory now has active content.

---

## Docs

### docs/end-of-session-analysis.md
- **Path**: `.claude/docs/end-of-session-analysis.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-08
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; 2026-04-08 analysis artifact, not updated automatically.

---

## Handoffs

### handoffs/session-audit-2026-04-12.md
- **Path**: `.claude/handoffs/session-audit-2026-04-12.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; historical session handoff artifact.

---

## Misc (top-level)

### end-session-agent-brife.md
- **Path**: `.claude/end-session-agent-brife.md`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-08
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges; development brief for end-of-session-agent (now implemented); historical artifact.

---

### workflows/deploy.yml
- **Path**: `.claude/workflows/deploy.yml`
- **Category**: misc
- **Inbound edges**: 1
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-03-19
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; GitHub Actions deploy workflow, fires on push to main.

---

## Task Ledgers

### todo.md
- **Path**: `.claude/todo.md`
- **Category**: misc
- **Inbound edges**: 6
- **Outbound edges**: 4
- **Runtime-loaded**: no
- **Last modified**: 2026-04-19
- **Commits touching it (last 90 days)**: 80
- **Commits touching it (all time)**: 80
- **Classification**: used-often
- **Evidence**: 80 commits in 90 days — highest single-file commit count in the .claude/ directory; written by execute-it and save-plan on every task cycle.

---

### todo-archive.md
- **Path**: `.claude/todo-archive.md`
- **Category**: misc
- **Inbound edges**: 3
- **Outbound edges**: 3
- **Runtime-loaded**: no
- **Last modified**: 2026-04-19
- **Commits touching it (last 90 days)**: 16
- **Commits touching it (all time)**: 16
- **Classification**: used-often
- **Evidence**: 16 commits in 90 days (rule 1); written by end-of-session-agent and sweep-stale-todos.

---

## Misc (bottom)

### scheduled_tasks.lock
- **Path**: `.claude/scheduled_tasks.lock`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 1
- **Runtime-loaded**: no
- **Last modified**: 2026-04-12
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: 1 commit; 0 inbound edges (orphan); JSON lock file; typically deleted after scheduled task completes — tracked commit likely reflects initial creation.

---

### .session-state-path
- **Path**: `.claude/.session-state-path`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: yes (written by session-startup.sh hook at session start; read by other hooks to locate session state)
- **Last modified**: 2026-04-17
- **Commits touching it (last 90 days)**: 1
- **Commits touching it (all time)**: 1
- **Classification**: used-rarely
- **Evidence**: Runtime-loaded = yes, but only 1 commit to the file itself; 0 inbound workflow edges (orphan); read by scripts rather than workflow files.

---

### worktrees/
- **Path**: `.claude/worktrees/`
- **Category**: misc
- **Inbound edges**: 0
- **Outbound edges**: 2
- **Runtime-loaded**: no
- **Last modified**: 2026-04-02
- **Commits touching it (last 90 days)**: 2
- **Commits touching it (all time)**: 2
- **Classification**: used-rarely
- **Evidence**: 2 commits; 0 inbound edges (orphan); 5 worktree directories, on-demand only; no recent activity since 2026-04-02.

---

## Summary

### Classification counts
| Classification | Count |
|---|---|
| used-often | 44 |
| used-rarely | 88 |
| never-used | 0 |
| unknown | 0 |
| **Total** | **132** |

### Candidate dead code list
None. All 132 nodes have at least 1 commit within the last 90 days. The project was started on approximately 2026-03-19 — less than 90 days before today (2026-04-19) — so the 90-day window covers the entire git history. Zero nodes qualify for `never-used`.

### Needs manual review list
None. All nodes yielded a deterministic classification from the three-rule hierarchy.

### Hot nodes (top 10 by inbound edge count)
| Rank | Node | Inbound edges | Classification |
|---|---|---|---|
| 1 | commands/reflect.md | 15 | used-often |
| 2 | commands/plan-implementation.md | 9 | used-often |
| 3 | skills/interface-design/SKILL.md | 9 | used-rarely |
| 4 | skills/cssLayer/SKILL.md | 8 | used-often |
| 5 | agents/end-of-session-agent.md | 8 | used-often |
| 6 | copilot-instructions.md | 7 | used-often |
| 7 | standards-angular.md | 7 | used-rarely |
| 8 | reflect/evaluator.md | 7 | used-rarely |
| 9 | sessions/ | 6 | used-often |
| 10 | todo.md | 6 | used-often |

Notable: **skills/interface-design/SKILL.md** (rank 3, 9 inbound edges) and **standards-angular.md** (rank 7, 7 inbound) are both `used-rarely` — high reference counts but single commits. They were established early and stabilized, not iteratively developed.

**reflect/evaluator.md** (rank 8, 7 inbound edges) is `used-rarely` by the commit-count rule despite being the scoring backbone of the reflect pipeline. It is IMMUTABLE by design — low commits is a feature, not a sign of disuse.

---

## Methodology notes

### Git commands used
```bash
# Commits in last 90 days for a path:
git log --oneline --since="90 days ago" -- <path> | wc -l

# All-time commits for a path:
git log --oneline -- <path> | wc -l

# Last modification date:
git log -1 --format="%ci" -- <path>
```
All queries run from the repository root `C:/foodCo/foodVibe1.0`.

Edge counts derived programmatically by parsing `plans/workflow-audit/relationships.md` with a Python regex that extracts `source --(edge-type)--> target` lines and counts per-node inbound/outbound appearances.

### Key constraint: project age within 90-day window
The entire project was created ≥2026-03-19. As of today (2026-04-19), every committed file has its commit date within the last 90 days. The 90-day commit count equals the all-time commit count for every node. This makes the 90-day threshold completely non-discriminating: any node that was ever committed has "5+ commits in 90 days" OR "1-4 commits in 90 days." **Never-used = 0** as a direct consequence.

### Inconclusive git history
No renames or moves detected. All queried paths returned consistent results. No git history was inconclusive.

### Judgment calls (up to 5)
1. **commands/brief.md** (1 commit → would be `used-rarely` by rule 1): classified `used-often` via rule 2. Rationale: directly invoked by /plan-implementation (invokes edge = strong), a core slash command. brief.md is essential to every plan+execute cycle even though the file itself changed only once.

2. **instructions/validation-checklist.md** (4 commits → would be `used-rarely` by rule 1): classified `used-often` via rule 2. Rationale: loaded via `@` reference at the top of execute-it.md and plan-implementation.md — the `@` mechanism is functionally equivalent to invocation; it's mandatory in every plan+execute cycle.

3. **reflect/tool-failure-hook.ps1** (1 commit → would be `used-rarely` by rule 1): classified `used-often` via rule 3. Rationale: appears in Flow 6b with a `writes` edge (strong) to failure-log.tsv; runtime-loaded = yes (PostToolUse hook fires on every tool call this session).

4. **reflect/test-runner.sh** (1 commit → would be `used-rarely` by rule 1): classified `used-often` via rule 3. Rationale: invoked by reflect.md (invokes = strong edge type) in Flow 4; the IMMUTABLE scorer is stable by design — 1 commit reflects intentional immutability, not disuse.

5. **skills/interface-design/SKILL.md** (1 commit, 9 inbound edges): classified `used-rarely` despite highest inbound edge count among skills. Rationale: 9 inbound edges are all `references` or `consumes-skill` from interface-design commands that themselves have 1 commit each; the entire interface-design subsystem was created in a single batch commit on 2026-03-28 and never iterated.
