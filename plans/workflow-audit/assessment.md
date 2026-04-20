# Stage 4 Assessment — Claude Workflow Audit

**Date**: 2026-04-19
**Auditor**: Claude Code (claude-sonnet-4-6)
**Input stages**: Stage 1 (inventory), Stage 2 (relationships.md, 268 edges), Stage 3 (usage.md, 44 used-often / 88 used-rarely)
**Node count**: 132

---

## Signals

| Node | Commits | Batch | SIR | On-flow | Sub-iso | Flags |
|------|---------|-------|-----|---------|---------|-------|
| **gate** | | | | | | |
| CLAUDE.md | 14 | N | 0.0 | Y | 0.25 | |
| agent.md | 48 | N | 1.0 | Y | 0.40 | |
| copilot-instructions.md | 38 | N | 0.29 | Y | 0.13 | |
| **agents** | | | | | | |
| agents/breadcrumb-navigator.md | 8 | N | 0.0 | N | 0.00 | off-flow |
| agents/end-of-session-agent.md | 12 | N | 0.12 | Y | 0.06 | SIR<0.2 |
| agents/git-agent.md | 7 | N | 0.8 | Y | 0.12 | |
| agents/product-manager.md | 8 | N | 0.0 | N | 0.00 | off-flow |
| agents/qa-engineer.md | 14 | N | 0.0 | Y | 0.00 | |
| agents/security-officer.md | 8 | N | 0.67 | Y | 0.00 | |
| agents/software-architect.md | 10 | N | 0.0 | N | 0.00 | off-flow |
| agents/team-leader.md | 13 | N | 0.0 | N | 0.25 | off-flow |
| **commands** | | | | | | |
| commands/adversarial-template.md | 1 | N | N/A | N | 0.67 | SIR=N/A, off-flow, c=1+no-rt |
| commands/audit.md | 1 | Y | N/A | N | 0.00 | batch, SIR=N/A, off-flow, c=1+no-rt |
| commands/audit-report.md | 2 | N | 0.0 | N | 0.25 | off-flow |
| commands/auto-solve.md | 6 | N | N/A | Y | 0.67 | SIR=N/A |
| commands/brief.md | 1 | N | 0.5 | Y | 0.57 | c=1+no-rt |
| commands/critique.md | 1 | Y | N/A | N | 0.00 | batch, SIR=N/A, off-flow, c=1+no-rt |
| commands/diary.md | 1 | N | N/A | N | 0.00 | SIR=N/A, off-flow, c=1+no-rt |
| commands/evaluate-me.md | 1 | N | 0.0 | N | 0.00 | off-flow, c=1+no-rt |
| commands/execute-it.md | 9 | N | 0.17 | Y | 0.36 | SIR<0.2 |
| commands/extract.md | 1 | Y | N/A | N | 0.00 | batch, SIR=N/A, off-flow, c=1+no-rt |
| commands/git.md | 1 | N | N/A | N | 0.00 | SIR=N/A, off-flow, c=1+no-rt |
| commands/init.md | 1 | Y | N/A | N | 0.00 | batch, SIR=N/A, off-flow, c=1+no-rt |
| commands/mp-wake-up.md | 1 | N | N/A | N | N/A | SIR=N/A, off-flow, c=1+no-rt |
| commands/new-feature.md | 2 | N | 0.0 | Y | 0.67 | |
| commands/nightly-audit.md | 1 | N | 0.0 | N | 0.25 | off-flow, c=1+no-rt |
| commands/plan-implementation.md | 10 | N | 0.11 | Y | 0.46 | SIR<0.2 |
| commands/quick-chat.md | 1 | N | N/A | N | 0.00 | SIR=N/A, off-flow, c=1+no-rt |
| commands/reflect.md | 8 | N | 0.07 | Y | 0.12 | SIR<0.2 |
| commands/reflect-add-tests.md | 1 | N | 0.0 | N | 0.50 | off-flow, c=1+no-rt |
| commands/reflect-list.md | 1 | N | 0.0 | Y | 0.00 | c=1+no-rt |
| commands/status.md | 1 | Y | N/A | N | 0.00 | batch, SIR=N/A, off-flow, c=1+no-rt |
| commands/sweep-stale-todos.md | 3 | N | 0.0 | N | 0.00 | off-flow |
| commands/test-pr-review-merge.md | 2 | N | N/A | Y | 0.00 | SIR=N/A |
| commands/test-template.md | 1 | N | 0.0 | N | 0.43 | off-flow, c=1+no-rt |
| commands/validate-agent-refs.md | 8 | N | N/A | N | 0.33 | SIR=N/A, off-flow |
| **interface-design** | | | | | | |
| skills/interface-design/SKILL.md | 1 | Y | 0.0 | N | 0.42 | batch, off-flow, c=1+no-rt |
| skills/interface-design/references/critique.md | 1 | Y | N/A | N | 1.00 | batch, SIR=N/A, off-flow, SI>0.9, c=1+no-rt |
| skills/interface-design/references/example.md | 1 | Y | N/A | N | 1.00 | batch, SIR=N/A, off-flow, SI>0.9, c=1+no-rt |
| skills/interface-design/references/principles.md | 1 | Y | N/A | N | 1.00 | batch, SIR=N/A, off-flow, SI>0.9, c=1+no-rt |
| skills/interface-design/references/validation.md | 1 | Y | N/A | N | 0.50 | batch, SIR=N/A, off-flow, c=1+no-rt |
| **skills** | | | | | | |
| skills/add-recipe/SKILL.md | 5 | N | 0.0 | N | 0.00 | off-flow |
| skills/angularComponentStructure/SKILL.md | 7 | N | 0.0 | N | 0.20 | off-flow |
| skills/angular-pipe-logic/SKILL.md | 3 | N | 0.0 | N | 0.00 | off-flow |
| skills/auth-and-logging/SKILL.md | 5 | N | 0.0 | N | 0.00 | off-flow |
| skills/auth-crypto/SKILL.md | 2 | N | 0.0 | N | 0.00 | off-flow |
| skills/breadcrumb-navigator/SKILL.md | 5 | N | 0.67 | Y | 0.60 | |
| skills/context-management/SKILL.md | 1 | N | 0.0 | N | 0.00 | off-flow, c=1+no-rt |
| skills/cssLayer/SKILL.md | 10 | N | 0.0 | N | 0.30 | off-flow |
| skills/cssLayer-workspace/ | 1 | N | 0.0 | N | 0.50 | off-flow, c=1+no-rt |
| skills/deploy-github-pages/SKILL.md | 3 | N | 0.0 | N | 0.00 | off-flow |
| skills/elegant-fix/SKILL.md | 6 | N | N/A | N | 0.00 | SIR=N/A, off-flow |
| skills/end-session/SKILL.md | 9 | N | 0.33 | Y | 0.50 | |
| skills/finalize-docs/SKILL.md | 2 | N | N/A | N | 1.00 | SIR=N/A, off-flow, SI>0.9 |
| skills/github-sync/SKILL.md | 9 | N | 0.0 | N | 0.67 | off-flow |
| skills/mp-search/SKILL.md | 2 | N | N/A | N | N/A | SIR=N/A, off-flow |
| skills/nightly-audit/SKILL.md | 4 | N | 0.0 | N | 0.00 | off-flow |
| skills/quick-chat/SKILL.md | 3 | N | 0.0 | N | 0.67 | off-flow |
| skills/save-plan/SKILL.md | 7 | N | 0.0 | Y | 0.00 | |
| skills/session-handoff/SKILL.md | 8 | N | 0.0 | Y | 0.50 | |
| skills/techdebt/SKILL.md | 7 | N | 0.0 | Y | 0.00 | |
| skills/update-docs/SKILL.md | 6 | N | 0.25 | Y | 0.50 | |
| skills/worktree-session-end/SKILL.md | 8 | N | 0.0 | Y | 0.33 | |
| skills/worktree-setup/SKILL.md | 3 | N | 0.0 | N | 0.60 | off-flow |
| **instructions** | | | | | | |
| instructions/validation-checklist.md | 4 | N | 0.0 | Y | 0.00 | |
| **settings** | | | | | | |
| settings.json | 28 | N | 0.0 | Y | 0.33 | |
| settings.local.json | 15 | N | N/A | N | 1.00 | SIR=N/A, SI>0.9 |
| mcp.json | 2 | N | N/A | N | 0.00 | SIR=N/A, off-flow |
| **standards** | | | | | | |
| standards-angular.md | 1 | N | 0.0 | N | 0.00 | off-flow, c=1+no-rt |
| standards-backend.md | 2 | N | 0.0 | N | 0.00 | off-flow |
| standards-domain.md | 1 | N | 0.0 | N | 0.00 | off-flow, c=1+no-rt |
| standards-git.md | 2 | N | 0.0 | N | 0.00 | off-flow |
| standards-scheduled-reporting.md | 1 | N | 0.0 | N | 0.00 | off-flow, c=1+no-rt |
| standards-security.md | 2 | N | 0.0 | N | 0.00 | off-flow |
| **hooks** | | | | | | |
| hooks/install-hooks.ps1 | 1 | N | N/A | Y | 1.00 | SIR=N/A, SI>0.9, c=1+no-rt |
| hooks/post-commit | 1 | N | 1.0 | Y | 1.00 | SI>0.9, c=1+no-rt |
| hooks/post-merge | 1 | N | 1.0 | Y | 1.00 | SI>0.9, c=1+no-rt |
| **reflect** | | | | | | |
| reflect/auto-reflect.ps1 | 3 | N | 0.0 | Y | 0.75 | |
| reflect/auto-reflection-log.tsv | 6 | N | N/A | N | 0.50 | SIR=N/A, off-flow |
| reflect/behavior-runner-prompt.md | 1 | N | 0.0 | Y | 0.33 | c=1+no-rt |
| reflect/evaluator.md | 2 | N | 0.0 | Y | 0.56 | |
| reflect/evaluator-agent-prompt.md | 1 | N | 0.0 | Y | 0.40 | c=1+no-rt |
| reflect/failure-log.tsv | 16 | N | 0.33 | Y | 0.60 | |
| reflect/failure-log-archive-2026-04.tsv | 1 | N | N/A | N | 1.00 | SIR=N/A, off-flow, SI>0.9, c=1+no-rt |
| reflect/last-session-context.md | 2 | N | N/A | N | N/A | SIR=N/A, off-flow |
| reflect/reflect-runner-prompt.md | 1 | N | 0.0 | Y | 0.00 | c=1+no-rt |
| reflect/reflected-sessions.stamp | 1 | N | N/A | N | 0.50 | SIR=N/A, off-flow, c=1+no-rt |
| reflect/reflection-log.tsv | 4 | N | 0.5 | Y | 0.50 | |
| reflect/test-quality-log.md | 1 | N | 1.0 | Y | 0.33 | c=1+no-rt |
| reflect/test-runner.sh | 1 | N | 0.4 | Y | 0.43 | c=1+no-rt |
| reflect/test-suite-template.md | 2 | N | N/A | N | 0.50 | SIR=N/A, off-flow |
| reflect/test-suites/angularComponentStructure.tests.md | 3 | N | N/A | N | 0.50 | SIR=N/A, off-flow |
| reflect/test-suites/cssLayer.tests.md | 4 | N | 0.0 | N | 0.67 | off-flow |
| reflect/tool-failure-hook.ps1 | 1 | N | 0.0 | Y | 0.40 | c=1+no-rt |
| reflect/coverage/cssLayer.coverage.md | 2 | N | 0.0 | N | 0.33 | off-flow |
| reflect/coverage/.gitkeep | 1 | N | N/A | N | N/A | SIR=N/A, off-flow, c=1+no-rt |
| reflect/evidence/ | 4 | N | N/A | N | 0.50 | SIR=N/A, off-flow |
| **fix-templates** | | | | | | |
| fix-templates/color-token.md | 3 | N | 0.0 | N | 0.67 | off-flow |
| fix-templates/manual-subscription.md | 2 | N | 0.0 | N | 0.67 | off-flow |
| fix-templates/findings.md | 2 | N | N/A | N | 1.00 | SIR=N/A, off-flow, SI>0.9 |
| fix-templates/tests/color-token/cases/ | 1 | Y | 0.0 | N | 1.00 | batch, off-flow, SI>0.9, c=1+no-rt |
| fix-templates/tests/color-token/expected/ | 1 | Y | 0.0 | N | 1.00 | batch, off-flow, SI>0.9, c=1+no-rt |
| fix-templates/tests/manual-subscription/cases/ | 1 | Y | 0.0 | N | 1.00 | batch, off-flow, SI>0.9, c=1+no-rt |
| fix-templates/tests/manual-subscription/expected/ | 1 | Y | 0.0 | N | 1.00 | batch, off-flow, SI>0.9, c=1+no-rt |
| fix-templates/tests/history.jsonl | 2 | N | 1.0 | N | 0.33 | off-flow |
| **references** | | | | | | |
| references/hld-template.md | 1 | N | 0.0 | N | 0.00 | off-flow, c=1+no-rt |
| references/prd-template.md | 1 | N | 0.0 | N | 0.00 | off-flow, c=1+no-rt |
| references/tab-orders.md | 1 | N | N/A | N | 0.00 | SIR=N/A, off-flow, c=1+no-rt |
| references/team-leader-output-template.md | 1 | N | 0.0 | N | 0.00 | off-flow, c=1+no-rt |
| **reports** | | | | | | |
| reports/audit/TEMPLATE.md | 2 | N | 0.0 | N | 0.33 | off-flow |
| reports/audit/2026-04-10-nightly-audit.md | 1 | N | 0.0 | N | 1.00 | off-flow, SI>0.9, c=1+no-rt |
| reports/audit/2026-04-10-plan.md | 1 | N | N/A | N | 1.00 | SIR=N/A, off-flow, SI>0.9, c=1+no-rt |
| reports/audit/archive/ | 1 | N | N/A | N | 0.00 | SIR=N/A, off-flow, c=1+no-rt |
| reports/audit/subscription-audit.md | 1 | N | N/A | N | 1.00 | SIR=N/A, off-flow, SI>0.9, c=1+no-rt |
| reports/audit-sessions/2026-04-14-audit-session.md | 1 | N | N/A | N | 1.00 | SIR=N/A, off-flow, SI>0.9, c=1+no-rt |
| reports/audit-sessions/2026-04-16-audit-session.md | 1 | N | N/A | N | 1.00 | SIR=N/A, off-flow, SI>0.9, c=1+no-rt |
| **sessions** | | | | | | |
| sessions/README.md | 1 | N | 0.0 | N | 0.25 | off-flow, c=1+no-rt |
| sessions/.gitkeep | 1 | N | N/A | N | N/A | SIR=N/A, off-flow, c=1+no-rt |
| sessions/ | 38 | N | 0.67 | Y | 0.10 | |
| **techdebt-reports** | | | | | | |
| techdebt-reports/ | 10 | N | 1.0 | Y | 0.00 | |
| **retrospectives** | | | | | | |
| retrospectives/2026-04-03-10-00-unified-ai-modal.md | 1 | N | N/A | N | 0.00 | SIR=N/A, off-flow, c=1+no-rt |
| retrospectives/.gitkeep | 1 | N | N/A | N | N/A | SIR=N/A, off-flow, c=1+no-rt |
| **docs** | | | | | | |
| docs/end-of-session-analysis.md | 1 | N | N/A | N | 0.00 | SIR=N/A, off-flow, c=1+no-rt |
| **handoffs** | | | | | | |
| handoffs/session-audit-2026-04-12.md | 1 | N | N/A | N | 0.00 | SIR=N/A, off-flow, c=1+no-rt |
| **workflows** | | | | | | |
| workflows/deploy.yml | 1 | N | 0.0 | N | 0.00 | off-flow, c=1+no-rt |
| **task-ledger** | | | | | | |
| todo.md | 80 | N | 0.33 | Y | 0.20 | |
| todo-archive.md | 16 | N | 0.67 | Y | 0.33 | |
| **misc** | | | | | | |
| end-session-agent-brife.md | 1 | N | N/A | N | 0.00 | SIR=N/A, off-flow, c=1+no-rt |
| scheduled_tasks.lock | 1 | N | N/A | N | N/A | SIR=N/A, off-flow, c=1+no-rt |
| .session-state-path | 1 | N | N/A | N | N/A | SIR=N/A, off-flow, c=1+no-rt |
| worktrees/ | 2 | N | N/A | N | 0.00 | SIR=N/A, off-flow |

---

## Over-engineering findings

### OE-1: Interface-design cluster (10 nodes)

**Nodes**: commands/audit.md, commands/critique.md, commands/extract.md, commands/init.md, commands/status.md, skills/interface-design/SKILL.md, skills/interface-design/references/critique.md, skills/interface-design/references/example.md, skills/interface-design/references/principles.md, skills/interface-design/references/validation.md

**Signals triggered**: batch=Y (all 10 created 2026-03-28, all ≤2 commits, edges only among themselves), off-flow (none appear in any of the 6 traced flows), SI=1.0 for three reference files (critique, example, principles), SIR=N/A for all reference files (0 inbound), c=1+no-rt for 9 of the 10 nodes.

The interface-design cluster was scaffolded as a single batch on 2026-03-28, generating a complete skill directory plus five supporting commands. The stated purpose is UI/dashboard design work. However, none of these 10 nodes appear in any of the 6 formally traced end-to-end flows, and the three core reference files (critique.md, example.md, principles.md) have SI=1.0, meaning every edge they participate in stays within the interface-design subsystem — they are internally self-referential with no connections to the broader workflow. All command nodes (audit, critique, extract, init, status) carry batch=Y, c=1+no-rt, SIR=N/A, and off-flow simultaneously, meeting the 2+ threshold with margin. The skills/interface-design/SKILL.md itself has 1 commit, batch=Y, and off-flow, and its 9 inbound edges are all consumes-skill or reads type (SIR=0.0). The cluster shows every hallmark of a speculative scaffold that was created but never integrated into active daily workflow.

---

### OE-2: Nightly-audit subsystem (5 nodes)

**Nodes**: commands/nightly-audit.md, skills/nightly-audit/SKILL.md, standards-scheduled-reporting.md, reports/audit/TEMPLATE.md, reports/audit/archive/

**Signals triggered**: off-flow (none appear in any of the 6 traced flows); commands/nightly-audit.md has commits=1 + off-flow + c=1+no-rt; standards-scheduled-reporting.md has commits=1 + off-flow + c=1+no-rt; reports/audit/archive/ has commits=1 + SIR=N/A + off-flow + c=1+no-rt. Only 1 actual nightly audit report exists in reports/audit/ (2026-04-10-nightly-audit.md, 1 commit).

The nightly-audit subsystem was designed as scheduled autonomous automation: commands/nightly-audit.md invokes skills/nightly-audit/SKILL.md, which runs 6 verification checks and writes to reports/audit/. The infrastructure (command, skill, template, archive dir, standards doc) was built completely, but evidence of actual execution is a single report dated 2026-04-10 — 9 days before this audit. Despite 6 inbound references to nightly-audit/SKILL.md indicating the system is referenced as planned automation, consistent automated execution never materialized. This is a skeleton automation that meets over-engineering criteria because the implementation investment (5 node cluster) significantly outweighs demonstrated execution (1 report).

---

### OE-3: Orphan single-use commands (5 nodes)

**Nodes**: commands/mp-wake-up.md, commands/diary.md, commands/quick-chat.md, skills/quick-chat/SKILL.md, commands/git.md

**Signals triggered**: SIR=N/A for all 5 (0 inbound edges from active workflow); off-flow for all 5; c=1+no-rt for all 5 command nodes. commands/quick-chat.md and skills/quick-chat/SKILL.md form a pair where the command simply invokes the skill, and the skill has 0 inbound strong edges (SIR=0.0) and off-flow status despite 3 commits.

Each of these nodes exists as a standalone entry point with no callers and no participation in any formal flow. commands/diary.md (1 commit, SIR=N/A, off-flow) is a MemPalace diary wrapper; commands/git.md (1 commit, SIR=N/A, off-flow) is a shortcut to git-agent; commands/mp-wake-up.md (1 commit, SIR=N/A, off-flow, SI=N/A) is a context display utility. The quick-chat pair (commands + skill, both off-flow) specifically duplicates the bypass-gates pattern that copilot-instructions.md already documents. All five meet the 2+ signal threshold (SIR=N/A + off-flow + c=1+no-rt). They are not harmful, but they add surface area to a user-facing command palette without demonstrable active use.

---

### OE-4: skills/finalize-docs/SKILL.md

**Nodes**: skills/finalize-docs/SKILL.md

**Signals triggered**: SI=1.0 (both outbound edges go to skills/ nodes: breadcrumb-navigator and update-docs); SIR=N/A (0 inbound edges — nothing calls it); off-flow (not in any of the 6 traced flows); 2 commits (low iteration).

skills/finalize-docs/SKILL.md is designed as a global documentation audit — it invokes breadcrumb-navigator and update-docs to refresh navigation maps and project docs. Its SI=1.0 is structural (both targets are sibling skills), but the critical signal is SIR=N/A: no command, agent, hook, or other skill invokes finalize-docs. With 0 inbound edges and off-flow status, the skill exists but nothing routes to it. The 2 commits indicate it was written and revised but never wired into the workflow. Its functional purpose (documentation refresh) is already served by the update-docs skill (SIR=0.25, on-flow=Y, 6 commits), which finalize-docs merely wraps with breadcrumb-navigator as a prefix step.

---

### OE-5: Historical/archived artifacts (6 nodes)

**Nodes**: reflect/last-session-context.md, end-session-agent-brife.md, reflect/failure-log-archive-2026-04.tsv, reflect/coverage/.gitkeep, sessions/.gitkeep, retrospectives/.gitkeep

**Signals triggered**: reflect/last-session-context.md — SIR=N/A (0 inbound from active workflow), off-flow, inventory explicitly states "Legacy... Historical artifact... superseded by docs/session-state.md"; end-session-agent-brife.md — SIR=N/A, off-flow, c=1+no-rt, inventory explicitly states "development brief... now implemented; historical artifact"; reflect/failure-log-archive-2026-04.tsv — SIR=N/A, off-flow, SI=1.0, c=1+no-rt; reflect/coverage/.gitkeep — SIR=N/A, off-flow, c=1+no-rt (directory has real content: cssLayer.coverage.md); sessions/.gitkeep — SIR=N/A, off-flow, c=1+no-rt (sessions/ directory has 38 commits of real content); retrospectives/.gitkeep — SIR=N/A, off-flow, c=1+no-rt (directory has real content).

These six nodes are explicitly dead weight by the project's own Stage 1 inventory. Two (last-session-context.md and end-session-agent-brife.md) are called out verbatim as historical artifacts in the inventory notes. Three (.gitkeep files) are directory placeholders that are redundant because their parent directories contain real committed content — git no longer needs the placeholder to track the directory. The archive TSV has SI=1.0 and 0 inbound, functioning only as a historical record with no workflow connections. None of these nodes break any active flow if removed; removing them reduces inventory noise for future audits.

---

## Under-engineering findings

### UE-1: On-demand agents absent from documented flows

**Nodes**: agents/product-manager.md, agents/software-architect.md, agents/team-leader.md, agents/breadcrumb-navigator.md

**Signals**: These four agents each have 8-13 commits (product-manager.md: 8, software-architect.md: 10, team-leader.md: 13, breadcrumb-navigator.md: 8) — more commits than many on-flow nodes — yet all four are off-flow (not named in any of the 6 traces in flows.md). SIR=0.0 for all four, meaning no strong inbound edge (invokes, delegates-to, triggered-by) exists for them in relationships.md. They are referenced in copilot-instructions.md and agent.md via reads edges but have no documented invocation paths.

The commit history confirms these agents are actively used — 8-13 commits each in a project less than 31 days old represents meaningful iteration. Their absence from flows.md is a documentation deficit, not a behavioral one. copilot-instructions.md describes trigger conditions for each agent in prose form, but no flow trace captures the path from user intent → routing decision → agent invocation → output. This creates an operational blind spot: new users or future automated validation tools will see these agents as orphans despite them being core to the non-automated (on-demand) side of the workflow. The flow documentation is under-engineered for roughly half the active agent roster.

---

### UE-2: Flow 2 weak invocation link and plan-implementation entry point

**Nodes**: commands/new-feature.md, commands/plan-implementation.md

**Signals**: commands/new-feature.md has a `references` edge (not `invokes`) to commands/plan-implementation.md — the connection between the feature-scoping entry point and the planning command is implicit. commands/plan-implementation.md has SIR=0.11 (9 inbound edges total, only 1 strong: auto-solve.md invokes it). Despite being the core planning entry point for Flow 2 (Plan→Execute), 8 of its 9 inbound edges are reference-type (reads, references) rather than invocation-type. commands/execute-it.md similarly has SIR=0.17 (9 inbound total, ~1-2 strong).

The invocation chain for the most-used workflow (a user scoping a new feature through to execution) has no strong-edge path in the relationship graph: new-feature.md references plan-implementation.md, but the actual user action of "run /plan-implementation after /new-feature" is implicit convention, not documented invocation. The only strong inbound to plan-implementation.md comes from auto-solve.md (automated path), not from the human-initiated path. This means Flow 2's human-facing half is structurally invisible to graph analysis. If commands/new-feature.md were to be removed or changed, no graph traversal would surface plan-implementation.md as a downstream consequence.

---

### UE-3: Single hook registration bottleneck

**Nodes**: settings.json

**Signals**: settings.json has 28 commits (highest among settings subsystem) and registers 6 distinct hooks: branch-guard (PreToolUse), session-startup (SessionStart), tool-failure (PostToolUse), context-monitor (PostToolUse), pre-compact-reminder (PreCompact), handoff-check (Stop). SI=0.33. The pre-compact-reminder hook is known to produce invalid JSON (noted in Stage 3). There is no override story or fallback documented for hook registration failure.

All behavioral automation in the .claude/ system routes through a single JSON file. A malformed settings.json disables all 6 hooks simultaneously. The known invalid JSON issue in pre-compact-reminder hook demonstrates that schema errors in this file are possible, and the current tooling has no in-graph mechanism for detecting or recovering from them. The hooks themselves (post-commit, post-merge, tool-failure-hook.ps1, auto-reflect.ps1) each have proper files, but their activation depends entirely on settings.json being correctly formed. There is no documented test or validation step for settings.json prior to commit, no fallback configuration, and no documented procedure for "hooks are not firing" diagnosis.

---

### UE-4: reflect/tool-failure-hook.ps1 — runtime-critical, single commit, no test coverage

**Nodes**: reflect/tool-failure-hook.ps1, settings.json (pre-compact-reminder hook)

**Signals**: reflect/tool-failure-hook.ps1 has 1 commit (c=1+no-rt is waived because it is runtime-loaded as a PostToolUse hook in settings.json), on-flow=Y (Flow 6 includes it), SIR=0.0. It fires on every PostToolUse event — one of the highest-frequency triggers in the system. The pre-compact-reminder hook in settings.json has a known invalid JSON schema bug (Stage 3). No test suite or coverage document exists for either hook script. reflect/coverage/ contains only cssLayer.coverage.md; no hook coverage exists.

This hook is the first line of defense for detecting tool failures during active sessions. It fires more often than any other reflect subsystem node yet has never been iterated past its initial creation (1 commit). The known invalid JSON in pre-compact-reminder means one of the 6 registered hooks in settings.json is potentially non-functional. Together these represent a high-frequency, low-tested, never-iterated diagnostic layer. Compare: reflect/failure-log.tsv has 16 commits (the most-iterated reflect node), suggest the failure capture system is used heavily — but the upstream hook that feeds it has 0 documented iterations and 0 coverage.

---

## Redundancy findings

### R-1: Two-hop session-end stub chain

**Nodes**: skills/session-handoff/SKILL.md → skills/end-session/SKILL.md → agents/end-of-session-agent.md

**Signals**: skills/session-handoff/SKILL.md has 8 commits, on-flow=Y, but its sole functional content is a `redirects-to` edge pointing to skills/end-session/SKILL.md. skills/end-session/SKILL.md has 9 commits, on-flow=Y, SIR=0.33, but its primary behavior is a `delegates-to` edge pointing to agents/end-of-session-agent.md. The agent itself (12 commits, SIR=0.12) does the actual work. Two SKILL.md files consume 17 combined commits to perform two consecutive single-step pass-throughs.

The Stage 2 inventory is explicit: session-handoff's entire stated purpose is "redirect to end-session" and end-session's entire stated purpose is "delegate to end-of-session-agent." A user invoking `/session-handoff` traverses: session-handoff SKILL → end-session SKILL → end-of-session-agent. The agent could be invoked directly from any caller. The two intermediary skills add operational surface area (3 names to remember, 3 files to maintain, 2 redirect hops) without adding behavior. The historical reason for session-handoff (it predates the unified end-session approach) is documented but the redirect has never been collapsed.

---

### R-2: reflect/last-session-context.md vs docs/session-state.md

**Nodes**: reflect/last-session-context.md (internal), docs/session-state.md (external target)

**Signals**: reflect/last-session-context.md — 2 commits, SIR=N/A (0 inbound from active workflow), off-flow, SI=N/A. Stage 1 inventory explicitly states it is "superseded by docs/session-state.md." docs/session-state.md is the target written to by agents/end-of-session-agent.md (strong write edge). reflect/last-session-context.md has no active writer in the current workflow.

Two files serve the same stated purpose (carry session state across Claude restarts), but the workflow has migrated entirely to the external docs/session-state.md path. The internal reflect/last-session-context.md has not been written to by any active workflow node — its 2 commits are from before the migration. It has 0 inbound edges from anything in the current flow graph. Keeping it creates ambiguity: any agent or human reading the .claude/ directory sees two session-state files and must determine which is current. The Stage 1 inventory has already made the determination ("superseded"), but the redundant file remains.

---

### R-3: end-session-agent-brife.md vs agents/end-of-session-agent.md

**Nodes**: end-session-agent-brife.md (misc), agents/end-of-session-agent.md

**Signals**: end-session-agent-brife.md — 1 commit, SIR=N/A (0 inbound), off-flow, c=1+no-rt. Stage 1 inventory explicitly states it is "a development brief for end-of-session-agent (now implemented); historical artifact." agents/end-of-session-agent.md has 12 commits and is active (on-flow=Y, 1 strong inbound from end-session/SKILL.md).

The brief file was the planning artifact used to write the agent specification. Once the agent was implemented (evidenced by its 12 commits and active usage), the brief became redundant. It has no active inbound edges, no connection to any flow, and is stated as historical by the inventory. Its presence does not affect any active workflow node — the only risk of removal is losing the historical design rationale, which can be preserved via git history if needed.

---

### R-4: reports/audit-sessions/ vs sessions/

**Nodes**: reports/audit-sessions/2026-04-14-audit-session.md, reports/audit-sessions/2026-04-16-audit-session.md vs sessions/ (38 commits)

**Signals**: Both audit-session files — 1 commit each, SIR=N/A, off-flow, SI=1.0. sessions/ directory — 38 commits, on-flow=Y, SIR=0.67 (4 strong inbound write edges from brief.md, plan-implementation.md, context-management, end-of-session-agent). The audit-sessions/ subdirectory is under reports/, not sessions/, and has 0 inbound edges from any active workflow node.

Two directories both accumulate session artifacts: sessions/ is the active store (38 commits, 4 strong write edges from active workflow) while reports/audit-sessions/ contains 2 one-off files with no workflow connections. The naming overlap (both contain "session" outputs) creates routing ambiguity — a new audit session report has no obvious canonical home. The audit-sessions/ files appear to be manual one-off outputs written directly, not through any skill or command that would enforce a consistent destination. sessions/ has explicit write machinery (4 strong inbound); audit-sessions/ does not.

---

## Gap findings

### G-1: On-demand agent flows undocumented

**Nodes**: agents/product-manager.md, agents/software-architect.md, agents/team-leader.md, agents/breadcrumb-navigator.md; flows.md

**Evidence**: All four agents have 8-13 commits (confirming active use). copilot-instructions.md and agent.md both reference these agents in roster and routing prose (reads edges confirmed in Stage 2). flows.md documents 6 end-to-end flows; none passes through any of these four agents. The gap between "described in copilot-instructions.md" and "traced in flows.md" means the invocation criteria, handoff protocol, and output handling for these agents exist only as prose rules rather than traceable workflow steps.

Absence from flows.md has downstream consequences: validate-agent-refs.md (8 commits, actively used) cannot verify agent reference integrity for agents not in any flow. Stage 3 usage classification would mark these agents as "used-rarely" despite their commit history. Any future automated pruning pass that uses flows.md as its source of truth would incorrectly flag them as candidates for removal. The gap needs to be filled with at minimum a Flow 7 (On-demand Agents) or an addendum to existing flows.

---

### G-2: External script boundary opacity — Stop hook chain

**Nodes**: settings.json → [EXT] scripts/handoff-check.sh → reflect/auto-reflect.ps1 → commands/reflect.md

**Evidence**: settings.json's Stop hook calls scripts/handoff-check.sh (external script, outside .claude/). The edge from handoff-check.sh to auto-reflect.ps1 is in the Unverified section of relationships.md Stage 2. auto-reflect.ps1's invocation of commands/reflect.md IS documented as a verified strong edge (auto-reflect.ps1 invokes reflect.md). The gap is the middle segment: whether handoff-check.sh actually triggers auto-reflect.ps1 is unverified in-graph. hooks/post-commit and hooks/post-merge both have SI=1.0 (all edges stay within hooks subsystem) with no in-graph edge to embed-runner.js or MemPalace MCP confirming the embedding pipeline functions.

The reflect system (Flow 4) depends on this external script chain for automatic post-session invocation. If the handoff-check.sh → auto-reflect.ps1 link is broken, reflect sessions only run manually. There is no in-graph sentinel, health-check output, or log that confirms the external boundary crossing is functioning. reflect/auto-reflection-log.tsv (6 commits) may serve as indirect evidence of execution, but no workflow node reads this log to confirm the chain is live.

---

### G-3: docs/ subdirectory disconnect

**Nodes**: docs/end-of-session-analysis.md (internal), agents/end-of-session-agent.md → docs/session-state.md (external write target)

**Evidence**: agents/end-of-session-agent.md lists docs/session-state.md as a strong write target. docs/session-state.md is an external file at C:\foodCo\foodVibe1.0\docs\session-state.md (outside .claude/). The internal .claude/docs/ subdirectory contains only docs/end-of-session-analysis.md (1 commit, SIR=N/A, off-flow). The internal docs/ has 0 inbound write edges from any active workflow node — the end-of-session-agent writes to the external docs/ path, not the internal .claude/docs/ path.

This creates a naming collision: .claude/docs/ exists but is functionally empty relative to the active workflow. Any developer or agent consulting the .claude/ tree for session continuity documentation would find only an old analysis artifact, not the live session-state.md that the EOA actually updates. The internal docs/ directory needs either a clear README explaining the external write target, an explicit redirect/pointer to the external path, or consolidation (move end-of-session-analysis.md to a more appropriate home like sessions/ or retrospectives/).

---

### G-4: reflect/reflected-sessions.stamp write edge unverified

**Nodes**: reflect/reflected-sessions.stamp, commands/reflect.md

**Evidence**: Stage 2 relationships.md Unverified section lists "reflect.md writes reflected-sessions.stamp" as an unverified edge. The stamp file has 1 commit, SIR=N/A (0 inbound), off-flow. reflect.md has 8 commits and is on-flow (Flow 4). The stamp's stated purpose is deduplication — preventing the same session from being reflected twice.

If reflect.md is not writing the stamp, the deduplication guard for Flow 4 is broken. Every invocation of auto-reflect.ps1 → reflect.md could process already-reflected sessions, producing duplicate reflect entries in reflect/reflection-log.tsv and reflect/failure-log.tsv. The reflect/reflected-sessions.stamp was created (1 commit) but may have never received a verified write edge. Stage 2 did not confirm this edge, and no in-graph mechanism exists to validate it. This is the highest-consequence gap in the reflect subsystem because it silently corrupts reflection data without any error signal.

---

### G-5: Hooks embedding pipeline has no in-graph verification

**Nodes**: hooks/post-commit, hooks/post-merge, hooks/install-hooks.ps1

**Evidence**: hooks/post-commit and hooks/post-merge both have SI=1.0 — every edge they participate in stays within the hooks subsystem. Their external targets (scripts/embed-runner.js, MemPalace MCP server) are outside the .claude/ graph and marked as external. hooks/install-hooks.ps1 writes both hooks (verified) but itself has 1 commit and SI=1.0, meaning it has never been called from any other internal node — there is no in-graph trigger for re-running install-hooks.ps1 after settings changes. No node in the graph reads or verifies that the git hooks are currently installed and functional.

The MemPalace embedding pipeline (which runs on every commit and merge) is the backbone of the MemPalace knowledge base that CLAUDE.md mandates as the first search step for every task. If the git hooks are uninstalled, stale, or failing silently, the MemPalace corpus stops updating — but no workflow node would surface this failure. The only detection mechanism would be noticing that MemPalace search returns stale results, which requires a human to recognize the staleness pattern. A validation step (e.g., a command that checks git hooks are installed and reports embed-runner.js status) would close this gap.

---

## Immutable-by-design nodes

The following nodes have signal profiles that look suspicious (low commits, off-flow, low SIR) but are intentionally stable. They must not be targeted by Stage 5 cleanup recommendations.

### reflect/evaluator.md
**Commits**: 2 | **SIR**: 0.0 | **On-flow**: Y | **Inbound**: 7 (0 strong)

**Reason for immutability**: This is the formal scoring specification for the reflect system — it defines evaluation criteria, score bands, and output format that all reflection runs are scored against. Changing it invalidates historical score comparisons in reflect/reflection-log.tsv. The 2 commits reflect initial creation plus one deliberate spec revision; the stable low commit count is correct for a scoring spec. SIR=0.0 is expected: evaluator.md is a spec document consumed via reads edges by evaluator-agent-prompt.md and behavior-runner-prompt.md, not invoked directly.

**Suspicious-but-intentional signals**: 2 commits (low iteration is desired for a scoring spec to preserve comparability), SIR=0.0 (consumed via reads, not invoked), off-flow classification (flows trace execution paths, not spec documents). 7 inbound edges confirm active consumption.

---

### reflect/evaluator-agent-prompt.md
**Commits**: 1 | **SIR**: 0.0 | **On-flow**: Y

**Reason for immutability**: This is the system prompt for the blind evaluator subagent that scores reflect runs. The subagent receives this prompt verbatim; changes alter scoring behavior and invalidate score comparability. 1 commit is expected for a system prompt that works as specified. SIR=0.0 is expected — it is loaded by the evaluator agent at runtime, not invoked via workflow edges.

**Suspicious-but-intentional signals**: c=1+no-rt would normally fire but this node is runtime-loaded (the evaluator agent reads it at execution time). SIR=0.0 and low commits are intentional stability signals, not neglect.

---

### reflect/behavior-runner-prompt.md
**Commits**: 1 | **SIR**: 0.0 | **On-flow**: Y

**Reason for immutability**: This is the system prompt for the behavior-runner subagent that executes test behaviors during reflect runs. Like evaluator-agent-prompt.md, changes to this prompt alter subagent behavior mid-test-cycle and would invalidate test-result comparability. Runtime-loaded; 1 commit is correct.

**Suspicious-but-intentional signals**: c=1+no-rt flag is nominally triggered but this node is runtime-loaded by the behavior-runner subagent. Stability is correct.

---

### reflect/reflect-runner-prompt.md
**Commits**: 1 | **SIR**: 0.0 | **On-flow**: Y

**Reason for immutability**: This is the system prompt for the background reflect-runner process that orchestrates reflect sessions. Changes to the runner prompt alter the coordination logic of the entire reflect loop. Runtime-loaded by auto-reflect.ps1. 1 commit is correct.

**Suspicious-but-intentional signals**: c=1+no-rt flag nominally triggered; runtime-loaded exemption applies. SIR=0.0 expected (consumed via runtime read, not workflow edge).

---

### reflect/test-runner.sh
**Commits**: 1 | **SIR**: 0.4 | **On-flow**: Y | **Inbound**: 5

**Reason for immutability**: This is the bash script that scores individual fix-template test cases, computing pass/fail against expected outputs. It is invoked directly by commands/reflect.md (1 of the 5 inbound edges is strong: invokes). The scoring algorithm must remain stable across test runs to preserve result comparability; ad-hoc changes to the runner would silently alter all historical benchmark scores. SIR=0.4 (2 strong inbound of 5 total) is healthy for a utility script.

**Suspicious-but-intentional signals**: 1 commit is intentional — the scorer is a fixed algorithm, not an iterating product. c=1+no-rt flag nominally triggered; however, this node is runtime-invoked by reflect.md on every reflect run, making it functionally runtime-loaded.

---

## Decision list

Cards ordered by ascending risk if wrong (lowest-risk first).

---

### D-1: Remove historical artifact — end-session-agent-brife.md
- **Finding**: Redundancy R-3; end-session-agent-brife.md
- **Signals**: commits=1, SIR=N/A (0 inbound), off-flow, c=1+no-rt; inventory states "development brief... now implemented; historical artifact"
- **Options**:
  - a) Keep as-is — preserve historical design rationale in working tree
  - b) Trim — N/A (single file)
  - c) Consolidate — N/A
  - d) Remove — delete end-session-agent-brife.md; content preserved in git history
  - e) Expand — N/A
- **Recommended option**: d
- **Rationale**: The file is explicitly labelled a historical artifact by Stage 1 inventory, has 0 inbound edges, and its content (the design brief) is fully superseded by the implemented agent. Git history preserves it if needed. No active workflow node references it.
- **Risk if wrong**: None — 0 inbound edges means no workflow path breaks. Git history retains the content.
- **Prerequisite**: None

---

### D-2: Remove redundant .gitkeep placeholders
- **Finding**: Over-engineering OE-5; reflect/coverage/.gitkeep, sessions/.gitkeep, retrospectives/.gitkeep
- **Signals**: All three — commits=1, SIR=N/A, off-flow, c=1+no-rt; parent directories have real committed content (sessions/ 38 commits, retrospectives/ has content, reflect/coverage/ has cssLayer.coverage.md)
- **Options**:
  - a) Keep as-is — no meaningful benefit; directories are already tracked
  - b) Trim — N/A (atomic files)
  - c) Consolidate — N/A
  - d) Remove — delete all three .gitkeep files; parent directories remain tracked via their real content
  - e) Expand — N/A
- **Recommended option**: d
- **Rationale**: .gitkeep files serve only to force git to track otherwise-empty directories. All three parent directories now contain real files, making the placeholders functionally inert. Their removal has zero behavioral impact.
- **Risk if wrong**: None — if a directory is accidentally emptied in future, git would untrack it. This is recoverable by re-adding a placeholder at that point.
- **Prerequisite**: None

---

### D-3: Remove reflect/last-session-context.md
- **Finding**: Redundancy R-2; reflect/last-session-context.md
- **Signals**: commits=2, SIR=N/A (0 inbound from active workflow), off-flow, SI=N/A; inventory states "superseded by docs/session-state.md"
- **Options**:
  - a) Keep as-is — preserves historical session state data
  - b) Trim — N/A
  - c) Consolidate — N/A
  - d) Remove — delete reflect/last-session-context.md
  - e) Expand — N/A
- **Recommended option**: d
- **Rationale**: Stage 1 inventory is explicit that this file is superseded. It has 0 inbound edges from any active workflow node (SIR=N/A). Its presence creates ambiguity for any agent reading .claude/ for session continuity. Removal eliminates the ambiguity and the redundant file.
- **Risk if wrong**: Low — if any undocumented workflow still reads last-session-context.md, that path would find a missing file. However, 0 inbound edges in a 268-edge relationship graph makes this extremely unlikely. The 2 commits predate the migration to docs/session-state.md.
- **Prerequisite**: None

---

### D-4: Archive interface-design cluster
- **Finding**: Over-engineering OE-1; 10 nodes (commands/audit, critique, extract, init, status + skills/interface-design/ + references/*)
- **Signals**: batch=Y (all 10), off-flow (all 10), SI=1.0 (3 reference nodes), SIR=N/A (all reference nodes), c=1+no-rt (9 of 10 nodes)
- **Options**:
  - a) Keep as-is — preserve for future UI/design work if interface-design skill becomes active
  - b) Trim — remove the 5 batch-scaffold commands (audit, critique, extract, init, status) while retaining skills/interface-design/ as a callable skill
  - c) Consolidate — merge skills/interface-design/references/* content into SKILL.md directly (eliminate 4 separate reference files)
  - d) Remove — delete all 10 nodes; gstack /design-review and /design-consultation provide equivalent functionality per CLAUDE.md
  - e) Expand — wire into flows.md and add an inbound invocation path from copilot-instructions.md
- **Recommended option**: b
- **Rationale**: Five commands (audit, critique, extract, init, status) are batch-scaffold, 1 commit, off-flow, and SIR=N/A — they exist only within the cluster's internal edges. Trimming these five reduces the user-facing command palette noise while preserving the interface-design SKILL.md (9 inbound reads edges, indicating it is consulted). The SKILL.md and references can be retained as a consumed reference corpus. Full removal (option d) carries higher risk because the SKILL.md has 9 inbound reads edges suggesting it is loaded when doing UI work.
- **Risk if wrong**: The 5 removed commands could have been invoked by a user workflow not captured in the formal flows. Loss of the commands does not remove the skill — users can still invoke the skill directly. Recoverable from git history.
- **Prerequisite**: None

---

### D-5: Remove orphan single-use commands (OE-3)
- **Finding**: Over-engineering OE-3; commands/mp-wake-up.md, commands/diary.md, commands/quick-chat.md, commands/git.md
- **Signals**: All four — SIR=N/A (0 inbound), off-flow, c=1+no-rt; skills/quick-chat/SKILL.md additionally off-flow
- **Options**:
  - a) Keep as-is — maintain as convenience shortcuts even without formal flow integration
  - b) Trim — retain skills/quick-chat/SKILL.md (3 commits) and commands/mp-wake-up.md as useful utilities; remove commands/diary.md, commands/git.md, commands/quick-chat.md
  - c) Consolidate — merge commands/git.md content into agent.md git-agent routing; merge commands/diary.md note into copilot-instructions.md
  - d) Remove — delete all 5 nodes (4 commands + quick-chat skill)
  - e) Expand — add flows.md entry for each
- **Recommended option**: b
- **Rationale**: commands/mp-wake-up.md (context display) and skills/quick-chat/SKILL.md (3 commits) have marginal utility as convenience tools. commands/diary.md (MemPalace diary wrapper) and commands/git.md (git-agent shortcut) are single-commit stubs whose functionality is accessible via their target tools directly. Trimming the stubs reduces command palette surface area while keeping the two utilities with slightly higher evidence of use.
- **Risk if wrong**: A user who memorized the /diary or /git command shortcuts would lose them. Both shortcuts are easily reconstructable; their targets (MemPalace diary MCP, git-agent) remain available.
- **Prerequisite**: None

---

### D-6: Remove finalize-docs orphan skill
- **Finding**: Over-engineering OE-4; skills/finalize-docs/SKILL.md
- **Signals**: SI=1.0, SIR=N/A (0 inbound), off-flow, 2 commits; both outbound edges go to skills/ siblings (breadcrumb-navigator, update-docs)
- **Options**:
  - a) Keep as-is — available if a workflow later needs to call both breadcrumb-navigator and update-docs together
  - b) Trim — N/A (single file)
  - c) Consolidate — merge its sequential call pattern (breadcrumb-navigator then update-docs) as a note in copilot-instructions.md or end-of-session-agent
  - d) Remove — delete skills/finalize-docs/SKILL.md; callers can invoke breadcrumb-navigator and update-docs directly
  - e) Expand — add an inbound invocation edge from end-of-session-agent or a command
- **Recommended option**: c
- **Rationale**: The skill's only behavior is to call two other skills in sequence. With 0 inbound edges, nothing routes to it. Option e (wire it in) is viable but would require modifying end-of-session-agent.md. Option c (document the pattern as a convention note) preserves the intent without maintaining a dead skill file. If the sequential pattern is valuable, a one-line note in agent.md or copilot-instructions.md is sufficient.
- **Risk if wrong**: If finalize-docs was intended to be wired into the EOA in a future sprint, removing it requires recreating it. Low risk because the skill's logic is trivially reconstructable from its two outbound edges.
- **Prerequisite**: None

---

### D-7: Archive or remove historical artifacts (OE-5 remainder)
- **Finding**: Over-engineering OE-5; reflect/failure-log-archive-2026-04.tsv
- **Signals**: commits=1, SIR=N/A, off-flow, SI=1.0, c=1+no-rt; archive TSV has no active inbound edges
- **Options**:
  - a) Keep as-is — preserves historical failure log data for reference
  - b) Trim — N/A
  - c) Consolidate — N/A (already an archive file)
  - d) Remove — delete reflect/failure-log-archive-2026-04.tsv; data preserved in git history
  - e) Expand — N/A
- **Recommended option**: a
- **Rationale**: Unlike the .gitkeep placeholders, the archive TSV contains historical failure data that may have reference value for pattern analysis or future reflect audits. It has SI=1.0 and 0 inbound, but archive files by definition do not need inbound edges — they are write-once historical records. Keep to preserve failure data lineage; it does not harm the workflow.
- **Risk if wrong**: Keeping it adds 1 file to the inventory without breaking anything. The cost of being wrong is negligible in either direction.
- **Prerequisite**: None

---

### D-8: Collapse session-end stub chain
- **Finding**: Redundancy R-1; skills/session-handoff/SKILL.md, skills/end-session/SKILL.md, agents/end-of-session-agent.md
- **Signals**: session-handoff sole purpose is "redirect to end-session" (8 commits), end-session sole purpose is "delegate to end-of-session-agent" (9 commits, SIR=0.33); two-hop redirect chain with no added behavior
- **Options**:
  - a) Keep as-is — preserves backward compatibility for users who invoke /session-handoff
  - b) Trim — collapse session-handoff into a single-line redirect only (already effectively what it is)
  - c) Consolidate — merge session-handoff and end-session into a single SKILL.md that directly delegates to end-of-session-agent; update any callers from session-handoff to point to the consolidated skill
  - d) Remove — delete both skills/session-handoff/SKILL.md and skills/end-session/SKILL.md; update all inbound edges to invoke end-of-session-agent directly
  - e) Expand — N/A
- **Recommended option**: c
- **Rationale**: The two-hop chain adds no behavior — both skills are pure pass-throughs. Consolidating into a single SKILL.md (e.g., retaining skills/end-session/SKILL.md as the canonical name, making skills/session-handoff/SKILL.md a one-line redirect to it) eliminates one hop without removing the entry point that users may have memorized. Full removal (d) is higher risk because copilot-instructions.md routes users to session-handoff by name.
- **Risk if wrong**: If consolidation is done incorrectly, session-end flows break silently. Must verify inbound edges to session-handoff before collapsing. copilot-instructions.md mentions session-handoff as a trigger — this must be updated.
- **Prerequisite**: G-1 flow documentation should be checked first (D-14) to ensure session-end is fully traced before modifying the chain.

---

### D-9: Resolve reports/audit-sessions/ vs sessions/ routing ambiguity
- **Finding**: Redundancy R-4; reports/audit-sessions/*, sessions/
- **Signals**: audit-sessions/ — 2 files, each 1 commit, SIR=N/A, off-flow, SI=1.0; sessions/ — 38 commits, on-flow=Y, 4 strong inbound write edges
- **Options**:
  - a) Keep as-is — tolerate two output directories
  - b) Trim — move reports/audit-sessions/* into sessions/ and remove audit-sessions/ subdirectory
  - c) Consolidate — define audit-sessions as a canonical subpath within sessions/ (sessions/audit-sessions/); update any references
  - d) Remove — delete reports/audit-sessions/ and its 2 files; content preserved in git history
  - e) Expand — N/A
- **Recommended option**: b
- **Rationale**: sessions/ is the active canonical store with 4 strong write edges and 38 commits. The 2 audit-session files were written manually without workflow routing. Moving them into sessions/ (or deleting them, since their content is audit snapshots from a meta-audit rather than standard session artifacts) eliminates the ambiguity. Option d (delete) is simpler but option b (move) preserves the content without the confusing directory split.
- **Risk if wrong**: If a workflow node writes to reports/audit-sessions/ that was not captured in Stage 2, moving the directory would break that path. However, 0 inbound edges in a 268-edge graph makes this unlikely.
- **Prerequisite**: None

---

### D-10: Nightly-audit subsystem — activate or archive
- **Finding**: Over-engineering OE-2; commands/nightly-audit.md, skills/nightly-audit/SKILL.md, standards-scheduled-reporting.md, reports/audit/TEMPLATE.md, reports/audit/archive/
- **Signals**: All off-flow; commands/nightly-audit.md and standards-scheduled-reporting.md have c=1+no-rt; only 1 nightly report exists in reports/audit/ (2026-04-10)
- **Options**:
  - a) Keep as-is — maintain skeleton automation with intent to activate
  - b) Trim — remove commands/nightly-audit.md and standards-scheduled-reporting.md (1 commit each); keep skill and template
  - c) Consolidate — merge nightly-audit functionality into the reflect subsystem (Flow 4) where automated quality runs already occur
  - d) Remove — delete all 5 nodes; use gstack /qa for on-demand auditing
  - e) Expand — schedule nightly-audit via settings.json (add a scheduled hook); add flow trace as Flow 7
- **Recommended option**: e, but only if there is product intent to run nightly audits. Otherwise b.
- **Rationale**: The infrastructure is complete (command + skill + template + archive + standards). The gap is activation — no scheduled invocation exists in settings.json. If nightly audits are a priority (the 6 inbound refs to nightly-audit/SKILL.md suggest they are anticipated), option e (add a scheduled hook) closes the gap efficiently. If nightly audits are deprioritized, option b trims the command and standards stubs while preserving the skill and template for future activation.
- **Risk if wrong**: Activating (e) without testing the skill end-to-end risks producing malformed audit reports that pollute reports/audit/. Trimming (b) loses the command entry point but preserves the skill.
- **Prerequisite**: D-3 (UE-3 settings.json bottleneck) should be reviewed before adding hooks to settings.json.

---

### D-11: Add docs/ routing clarity (G-3)
- **Finding**: Gap G-3; .claude/docs/ subdirectory vs external docs/ write target
- **Signals**: docs/end-of-session-analysis.md — 1 commit, SIR=N/A, off-flow; agents/end-of-session-agent.md writes to external docs/session-state.md (strong edge to external path)
- **Options**:
  - a) Keep as-is — accept ambiguity
  - b) Trim — move docs/end-of-session-analysis.md to sessions/ or retrospectives/ where one-off analysis artifacts belong; leave .claude/docs/ empty or remove it
  - c) Consolidate — add a README.md to .claude/docs/ explaining that docs/session-state.md is the external write target
  - d) Remove — delete docs/end-of-session-analysis.md
  - e) Expand — route EOA writes to .claude/docs/ instead of external docs/
- **Recommended option**: b
- **Rationale**: docs/end-of-session-analysis.md is a one-off analysis artifact (1 commit, 0 inbound), not a living document. Moving it to sessions/ or retrospectives/ aligns it with where one-off session artifacts live. The .claude/docs/ directory serves no ongoing purpose — all session continuity data goes to the external docs/ path. Removing the confusion is lower cost than adding a clarifying README (option c).
- **Risk if wrong**: Moving docs/end-of-session-analysis.md might break a reference not captured in Stage 2. Given 0 inbound edges, risk is minimal.
- **Prerequisite**: None

---

### D-12: Harden Flow 2 invocation path (UE-2)
- **Finding**: Under-engineering UE-2; commands/new-feature.md → commands/plan-implementation.md weak link; plan-implementation SIR=0.11
- **Signals**: new-feature → plan-implementation is a `references` edge (not `invokes`); plan-implementation SIR=0.11 (9 inbound, 1 strong); SIR=0.17 for execute-it
- **Options**:
  - a) Keep as-is — implicit convention is understood by current team
  - b) Trim — N/A
  - c) Consolidate — N/A
  - d) Remove — N/A
  - e) Expand — update commands/new-feature.md to contain an explicit `Next step: run /plan-implementation` instruction; update flows.md Flow 2 to show the full human-initiated path; upgrade the edge type from `references` to `invokes` in relationships.md
- **Recommended option**: e
- **Rationale**: Plan-implementation has 9 inbound edges and only 1 strong — for the core planning entry point this is a structural weakness. Adding an explicit invocation instruction to new-feature.md converts a convention into a documented invocation, raising SIR for plan-implementation and making Flow 2 traceable end-to-end. This change requires only a text update to new-feature.md and a relationships.md annotation.
- **Risk if wrong**: The explicit instruction might conflict with user-defined workflows that use new-feature.md differently. Low risk — the instruction is advisory text, not a code change.
- **Prerequisite**: None

---

### D-13: Validate and harden tool-failure-hook.ps1 (UE-4)
- **Finding**: Under-engineering UE-4; reflect/tool-failure-hook.ps1; settings.json pre-compact-reminder hook invalid JSON
- **Signals**: tool-failure-hook.ps1 — 1 commit, runtime-loaded (PostToolUse), on-flow=Y; pre-compact-reminder known invalid JSON schema (Stage 3); 0 test coverage for any hook script
- **Options**:
  - a) Keep as-is — accept 1 commit as correct for a working script
  - b) Trim — N/A
  - c) Consolidate — N/A
  - d) Remove — N/A
  - e) Expand — (1) fix known invalid JSON in pre-compact-reminder hook in settings.json; (2) add reflect/test-suites/tool-failure-hook.tests.md; (3) document expected behavior and failure modes in the hook script header
- **Recommended option**: e (partially — fix the JSON bug and add a header comment at minimum)
- **Rationale**: The pre-compact-reminder JSON bug is a known active defect (Stage 3) that makes 1 of 6 registered hooks non-functional. This is the highest-priority action item in UE-4. The tool-failure-hook.ps1 test coverage gap is secondary — the hook fires on every PostToolUse, meaning any silent regression would affect every tool call. Even a minimal test document (expected inputs/outputs) would provide a regression baseline.
- **Risk if wrong**: Fixing the pre-compact-reminder JSON could have side effects if the malformed JSON was intentionally suppressing the hook. The fix should be validated against the hook's intended behavior before committing.
- **Prerequisite**: D-3 (settings.json bottleneck awareness) — any settings.json change should be made with awareness of its role as single failure point.

---

### D-14: Document on-demand agent flows (UE-1 / G-1)
- **Finding**: Under-engineering UE-1, Gap G-1; agents/product-manager.md, software-architect.md, team-leader.md, breadcrumb-navigator.md absent from flows.md
- **Signals**: 8-13 commits each (active use confirmed); off-flow for all four (absent from all 6 traced flows); SIR=0.0 for all four; referenced in copilot-instructions.md prose but not as traceable flow steps
- **Options**:
  - a) Keep as-is — prose routing in copilot-instructions.md is sufficient
  - b) Trim — N/A
  - c) Consolidate — N/A
  - d) Remove — N/A
  - e) Expand — add Flow 7 (On-demand Agents) to flows.md tracing the trigger conditions, invocation path, handoff protocol, and output handling for all four agents
- **Recommended option**: e
- **Rationale**: With 8-13 commits each, these agents represent the non-automated half of the Claude Code workflow. Their absence from flows.md means validate-agent-refs.md cannot check their integrity, Stage 3 usage classification incorrectly rates them as "used-rarely," and any future pruning pass would flag them as candidates for removal. A Flow 7 in flows.md (read-only documentation update) has zero risk and closes multiple downstream analysis gaps.
- **Risk if wrong**: Writing Flow 7 incorrectly could encode wrong trigger conditions for agents, leading Claude Code sessions to invoke the wrong agent. The flow should be drafted from copilot-instructions.md as source-of-truth.
- **Prerequisite**: None

---

### D-15: Verify reflected-sessions.stamp write edge (G-4)
- **Finding**: Gap G-4; reflect/reflected-sessions.stamp; commands/reflect.md
- **Signals**: stamp — 1 commit, SIR=N/A (0 inbound), off-flow; Stage 2 Unverified section lists "reflect.md writes reflected-sessions.stamp"
- **Options**:
  - a) Keep as-is — assume stamp is working; evidence will surface over time
  - b) Trim — N/A
  - c) Consolidate — N/A
  - d) Remove — delete reflect/reflected-sessions.stamp if deduplication is not actually implemented in reflect.md
  - e) Expand — (1) inspect commands/reflect.md to verify stamp-write logic exists; (2) if missing, add the stamp-write step; (3) promote the edge from Unverified to Verified in relationships.md; (4) add inbound edge confirmation
- **Recommended option**: e (verify first, then act)
- **Rationale**: The stamp is the deduplication guard for the entire reflect system (Flow 4). If reflect.md is not writing it, every auto-reflect run could process already-reflected sessions, corrupting reflect/reflection-log.tsv and reflect/failure-log.tsv. This is a silent data integrity risk. Verifying the edge is the lowest-effort first step; if the write logic is missing, adding it is a small change to commands/reflect.md.
- **Risk if wrong**: If the stamp is actively being written (the edge exists but was not captured in Stage 2), adding a duplicate write step would create double-writes. The verify step prevents this.
- **Prerequisite**: None — must read commands/reflect.md to verify before acting.

---

### D-16: Verify hooks embedding pipeline is installed and functional (G-5)
- **Finding**: Gap G-5; hooks/post-commit, hooks/post-merge, hooks/install-hooks.ps1
- **Signals**: post-commit and post-merge — SI=1.0 (all edges internal to hooks subsystem), commits=1 each; install-hooks.ps1 — SI=1.0, 1 commit, no inbound from any active workflow; no in-graph verification mechanism for git hook installation status
- **Options**:
  - a) Keep as-is — assume hooks are installed; MemPalace results would degrade if they weren't
  - b) Trim — N/A
  - c) Consolidate — N/A
  - d) Remove — N/A
  - e) Expand — (1) add commands/check-hooks.md as a diagnostic command that runs hooks/install-hooks.ps1 --verify and reports hook installation status; (2) add an inbound edge from settings.json SessionStart hook to trigger hook verification at session start; alternatively, add a note to agent.md preflight to run install-hooks.ps1 periodically
- **Recommended option**: e (lightweight: add a preflight note to agent.md; full: add check-hooks command)
- **Rationale**: The MemPalace embedding pipeline runs on every commit; if it is silently broken, the primary knowledge base mandated by CLAUDE.md degrades without any signal. CLAUDE.md mandates MemPalace as the first search step for every task — a broken embedding pipeline corrupts all downstream search quality. A lightweight diagnostic (a note in agent.md preflight to check hooks status at session start) costs one line; a full check-hooks command closes the gap completely.
- **Risk if wrong**: Adding a hook verification step that misconfigures the git hooks could break the embedding pipeline it was meant to verify. Verification should be read-only (--dry-run or --status check only).
- **Prerequisite**: D-3 (settings.json bottleneck awareness) if adding a SessionStart hook verification.

---

### D-17: Harden settings.json as single hook registration point (UE-3)
- **Finding**: Under-engineering UE-3; settings.json registers 6 hooks with no override story or validation step
- **Signals**: settings.json — 28 commits, on-flow=Y, registers branch-guard + session-startup + tool-failure + context-monitor + pre-compact-reminder + handoff-check; known invalid JSON in pre-compact-reminder (Stage 3); no documented fallback or validation procedure
- **Options**:
  - a) Keep as-is — accept the single-file risk as a known architectural constraint
  - b) Trim — reduce the number of registered hooks (consolidate PostToolUse hooks; remove pre-compact-reminder until JSON is fixed)
  - c) Consolidate — split settings.json into settings.json (core) + settings.hooks.json (hook config) to isolate hook registration from other settings; merge at runtime
  - d) Remove — N/A (settings.json is runtime-loaded; cannot remove)
  - e) Expand — (1) fix pre-compact-reminder invalid JSON immediately (highest priority); (2) add settings.json schema validation to commands/validate-agent-refs.md or a new validation command; (3) document the "hooks not firing" diagnostic procedure in agent.md
- **Recommended option**: e
- **Rationale**: settings.json is a runtime-loaded file (exempt from c=1+no-rt, highest commit count in settings subsystem at 28). It cannot be removed. Splitting it (option c) requires CLI support for merged configs that may not exist. The pragmatic path is (1) fix the known invalid JSON bug (closes UE-4 simultaneously), (2) add schema validation as part of the existing validate-agent-refs workflow, and (3) document the recovery procedure. This converts a silent failure risk into a detectable and recoverable one.
- **Risk if wrong**: Fixing settings.json JSON without testing could break other hooks if the malformed JSON was parsing successfully in a lenient parser. All settings.json edits should be tested against Claude Code's settings schema before commit.
- **Prerequisite**: D-13 (fix pre-compact-reminder JSON bug first) — D-13 and D-17 share the settings.json JSON fix as a prerequisite action.

---

### D-18: Clarify and verify Stop hook → reflect chain (G-2)
- **Finding**: Gap G-2; settings.json Stop hook → scripts/handoff-check.sh → reflect/auto-reflect.ps1 → commands/reflect.md; middle segment unverified
- **Signals**: settings.json Stop hook calls external scripts/handoff-check.sh (external boundary); handoff-check.sh → auto-reflect.ps1 edge is in Unverified section of relationships.md Stage 2; auto-reflect.ps1 → reflect.md is verified (strong edge); reflect/auto-reflection-log.tsv (6 commits) suggests the chain does execute, but the middle segment is unconfirmed in-graph
- **Options**:
  - a) Keep as-is — the log evidence suggests the chain works
  - b) Trim — N/A
  - c) Consolidate — move the handoff-check.sh logic inline into auto-reflect.ps1 to eliminate the external script hop; update settings.json Stop hook to call auto-reflect.ps1 directly
  - d) Remove — N/A
  - e) Expand — (1) inspect scripts/handoff-check.sh to verify it calls auto-reflect.ps1; (2) promote the edge to Verified in relationships.md; (3) add a line to the stop-hook chain in agent.md preflight describing the expected execution path
- **Recommended option**: e (verify first, document confirmed path)
- **Rationale**: This is a verification task before any structural change. The auto-reflection-log.tsv's 6 commits provide indirect evidence the chain works, but the specific mechanism (whether handoff-check.sh → auto-reflect.ps1) is not confirmed. Verifying the edge is read-only and low-risk. If confirmed, promoting the edge to Verified closes G-2 without any code change. If the edge is missing, option c (direct invocation from settings.json) is the simplest fix.
- **Risk if wrong**: If scripts/handoff-check.sh does more than just call auto-reflect.ps1 (e.g., guards on conditions), consolidating (option c) could remove those guards. Verify the script content before any consolidation decision.
- **Prerequisite**: D-16 (hooks verification) should be resolved concurrently — both involve the same external script boundary question.

---

### D-19: auto-reflect.ps1 pipeline — rewire or remove
- **Finding**: Post-audit investigation (see verification-findings.md D-18 CORRECTED)
- **Signals**: auto-reflect.ps1 not registered in settings.json; stale refs in its own header comment, end-of-session-agent.md line 555, and relationships.md §Unverified #3; auto-reflection-log.tsv has 6 commits predating the Stop-hook switch
- **Options**:
  - a) Keep as-is — dark pipeline, stale docs
  - b) Remove auto-reflect.ps1 + auto-reflection-log.tsv + per-session stamp logic; delete stale references; manual /reflect only
  - c) Rewire — register as Windows scheduled task OR add as additional Stop hook alongside handoff-check.sh; update stale docs to match
- **Recommended option**: Pending user decision
- **Risk if wrong**: Option b removes capability that may be wanted later (recoverable from git history). Option c re-enables expensive every-session reflection; must confirm handoff-check.sh and auto-reflect.ps1 can coexist on Stop.
- **Prerequisite**: User decides manual vs automatic reflection cadence.

---

## Out of scope / deferred

The following items surfaced during analysis but are excluded from Stage 5 action planning:

- **src/ changes** — All assessment findings are limited to .claude/ nodes. No Angular component, service, or module changes are proposed.
- **External scripts** — scripts/branch-guard.sh, scripts/handoff-check.sh, scripts/session-startup.sh, and scripts/embed-runner.js are outside the .claude/ node inventory. Their internal behavior is not assessed here; only their boundary interfaces with .claude/ nodes are noted in G-2 and G-5.
- **MCP configuration strategy** — mcp.json (2 commits, SIR=N/A, off-flow) connects to the MemPalace MCP server. Questions about MCP server selection, fallback MCP configuration, or multi-MCP strategy are a separate architectural concern not addressable by .claude/ file changes.
- **gstack external skill suite** — ~/.claude/skills/gstack/ is an external toolkit. CLAUDE.md integrates it via routing rules but gstack's internal structure is not part of this audit's 132-node inventory.
- **pre-compact-reminder.sh invalid JSON schema bug** — Noted in Stage 3 and referenced in UE-4 (D-13) and UE-3 (D-17) as a prerequisite fix. The actual settings.json edit to fix the JSON schema is deferred to Stage 5 execution; it is flagged here as a prerequisite for D-13 and D-17 but is not resolved in this document.
- **Changes to plans/ or non-.claude/ files** — This assessment is limited to .claude/ workflow infrastructure. Changes to plans/, docs/ (external), src/, or project configuration outside .claude/ are out of scope.
- **worktrees/** — The worktrees/ directory (2 commits, SIR=N/A, off-flow) is a git worktree management artifact. Worktree lifecycle decisions are separate from the .claude/ workflow audit.
