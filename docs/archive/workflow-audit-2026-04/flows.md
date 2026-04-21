# Named End-to-End Flows

Each flow is traced through edges in `relationships.md`. Every step cites an edge from that file.
If a flow has no supporting edges, it is marked **Not supported by inventory edges**.

---

## Flow 1 — Gate Chain

**Summary:** The mandatory three-file read sequence every main-session Claude completes before acting.

| Step | Node | Edge | Node |
|------|------|------|------|
| 1 | CLAUDE.md | --(gates)--> | agent.md |
| 2 | agent.md | --(gates)--> | copilot-instructions.md |
| 3 | copilot-instructions.md | active — provides skill trigger rules, Gatekeeper Protocol, agent roster, standards load table | (session now governed) |

Supporting edges: `CLAUDE.md --(gates)--> agent.md`, `agent.md --(gates)--> copilot-instructions.md`

Side branches confirmed in relationships.md:
- agent.md --(reads)--> instructions/validation-checklist.md
- copilot-instructions.md --(references)--> standards-* (5 standards files)
- copilot-instructions.md --(references)--> agents/, skills/, commands/

---

## Flow 2 — Plan → Execute

**Summary:** A feature request travels from scoping through planning verification to atomic execution and task tracking.

| Step | Node | Edge | Node |
|------|------|------|------|
| 1 | commands/new-feature.md | --(invokes)--> | commands/brief.md |
| 2 | commands/brief.md | --(writes)--> | sessions/ |
| 3 | commands/new-feature.md | --(invokes)--> | commands/plan-implementation.md |
| 4 | commands/plan-implementation.md | --(reads)--> | instructions/validation-checklist.md |
| 5 | commands/plan-implementation.md | --(invokes)--> | commands/brief.md |
| 6 | commands/plan-implementation.md | --(writes)--> | sessions/ |
| 7 | [user approves Merged Execution Plan] | → | commands/execute-it.md |
| 8 | commands/execute-it.md | --(reads)--> | instructions/validation-checklist.md |
| 9 | commands/execute-it.md | --(reads)--> | sessions/ |
| 10 | commands/execute-it.md | --(consumes-skill)--> | skills/save-plan/SKILL.md |
| 11 | skills/save-plan/SKILL.md | --(writes)--> | todo.md |
| 12 | skills/save-plan/SKILL.md | --(external)--> | [EXT] plans/ |
| 13 | commands/execute-it.md | --(writes)--> | todo.md |

Note: Step 7 (user approval gate) is a human decision point, not a code edge. It is noted for flow completeness; it has no corresponding edge in relationships.md.

Alternate entry via auto-solve:
- commands/auto-solve.md --(reads)--> todo.md [reads next task]
- commands/auto-solve.md --(invokes)--> commands/plan-implementation.md [step 1 of auto-solve]
- commands/auto-solve.md --(invokes)--> commands/execute-it.md [step 2 of auto-solve]

---

## Flow 3 — Session End

**Summary:** Session-end keywords trigger a stub chain that delegates to the end-of-session agent, which runs a 14-phase pipeline writing to sessions/, todo-archive.md, techdebt-reports/, and docs/session-state.md.

| Step | Node | Edge | Node |
|------|------|------|------|
| 1 | skills/session-handoff/SKILL.md | --(redirects-to)--> | skills/end-session/SKILL.md |
| 2 | skills/end-session/SKILL.md | --(delegates-to)--> | agents/end-of-session-agent.md |
| 3 | agents/end-of-session-agent.md | --(reads)--> | todo.md |
| 4 | agents/end-of-session-agent.md | --(consumes-skill)--> | skills/techdebt/SKILL.md |
| 5 | skills/techdebt/SKILL.md | --(writes)--> | techdebt-reports/ |
| 6 | agents/end-of-session-agent.md | --(consumes-skill)--> | skills/update-docs/SKILL.md |
| 7 | skills/update-docs/SKILL.md | --(invokes)--> | skills/breadcrumb-navigator/SKILL.md |
| 8 | agents/end-of-session-agent.md | --(consumes-skill)--> | skills/worktree-session-end/SKILL.md |
| 9 | agents/end-of-session-agent.md | --(delegates-to)--> | agents/git-agent.md |
| 10 | agents/end-of-session-agent.md | --(writes)--> | todo-archive.md |
| 11 | agents/end-of-session-agent.md | --(writes)--> | sessions/ |
| 12 | agents/end-of-session-agent.md | --(external)--> | [EXT] docs/session-state.md |

Note: Step 8 (worktree-session-end) applies only when working directory is inside a worktree — stated in inputs/triggers, not a Cross-references edge.

---

## Flow 4 — Reflect

**Summary:** At session close, auto-reflect.ps1 invokes /reflect AUTO, which reads immutable scoring infrastructure, runs fix-template mutations through test-runner.sh, and writes improved SKILL.md files and log entries.

| Step | Node | Edge | Node |
|------|------|------|------|
| 1 | reflect/auto-reflect.ps1 | --(invokes)--> | commands/reflect.md |
| 2 | commands/reflect.md | --(reads)--> | reflect/evaluator.md |
| 3 | commands/reflect.md | --(reads)--> | reflect/evaluator-agent-prompt.md |
| 4 | commands/reflect.md | --(reads)--> | reflect/behavior-runner-prompt.md |
| 5 | commands/reflect.md | --(reads)--> | reflect/reflect-runner-prompt.md |
| 6 | commands/reflect.md | --(reads)--> | fix-templates/ |
| 7 | commands/reflect.md | --(invokes)--> | reflect/test-runner.sh |
| 8 | reflect/test-runner.sh | --(reads)--> | fix-templates/tests/ |
| 9 | commands/reflect.md | --(writes)--> | reflect/reflection-log.tsv |
| 10 | commands/reflect.md | --(writes)--> | reflect/test-quality-log.md |
| 11 | commands/reflect.md | --(writes)--> | skills/ |
| 12 | commands/reflect.md | --(writes)--> | retrospectives/ |

Additional confirm nodes (in relationships.md):
- skills/cssLayer-workspace/ --(references)--> commands/reflect.md [eval data read during PATH 2]
- reflect/reflected-sessions.stamp --(references)--> commands/reflect.md [stamp read/written per reflect run — write edge unverified, see relationships.md §Unverified]
- reflect/evidence/ --(references)--> commands/reflect.md [evidence written per run — write edge unverified]

Trigger chain for Step 1: auto-reflect.ps1 is invoked by scripts/handoff-check.sh which is registered as the Stop hook in settings.json. Both scripts/handoff-check.sh and the triggered-by relationship are in Unverified/Implied section of relationships.md (not in Cross-refs fields).

---

## Flow 5 — Browse / gstack

**Summary:** All browser interaction routes through the external gstack skill suite. Multiple internal commands hold external edges to specific gstack entry points; gstack itself is a leaf node.

| Step | Source (internal) | Edge | Target |
|------|-------------------|------|--------|
| 1 | CLAUDE.md | --(external)--> | [EXT] ~/.claude/skills/gstack/ |
| 2 | commands/auto-solve.md | --(external)--> | [EXT] ~/.claude/skills/gstack/ (/browse) |
| 3 | agents/qa-engineer.md | --(external)--> | [EXT] ~/.claude/skills/gstack/ (/qa) |
| 4 | agents/security-officer.md | --(external)--> | [EXT] ~/.claude/skills/gstack/ (/cso) |
| 5 | commands/test-pr-review-merge.md | --(external)--> | [EXT] ~/.claude/skills/gstack/ (/ship) |

All edges terminate at the external boundary. No in-scope nodes follow. The gstack suite is a leaf node — not traversed further per brief rules.

---

## Flow 6 — Hooks

**Summary:** Two kinds of hooks run in this system: git hooks (post-commit/post-merge) installed by install-hooks.ps1, and Claude Code session hooks (PostToolUse) registered in settings.json.

### 6a — Git embedding hooks

| Step | Node | Edge | Node |
|------|------|------|------|
| 1 | hooks/install-hooks.ps1 | --(writes)--> | hooks/post-commit |
| 2 | hooks/install-hooks.ps1 | --(writes)--> | hooks/post-merge |
| 3 | hooks/post-commit | --(external)--> | [EXT] embed-runner.js |
| 4 | hooks/post-commit | --(external)--> | [EXT] MemPalace MCP |
| 5 | hooks/post-merge | --(external)--> | [EXT] embed-runner.js |
| 6 | hooks/post-merge | --(external)--> | [EXT] MemPalace MCP |

Note: The trigger conditions for steps 3–6 (git commit / git merge events) are stated in Inputs/triggers fields, not Cross-references. They appear in the Unverified/Implied section of relationships.md.

### 6b — PostToolUse failure-capture hook

| Step | Node | Edge | Node |
|------|------|------|------|
| 1 | settings.json | --(references)--> | reflect/tool-failure-hook.ps1 |
| 2 | reflect/tool-failure-hook.ps1 | --(references)--> | settings.json |
| 3 | reflect/tool-failure-hook.ps1 | --(writes)--> | reflect/failure-log.tsv |
| 4 | reflect/failure-log.tsv | --(references)--> | commands/reflect-list.md |

Downstream: commands/reflect-list.md --(reads)--> reflect/failure-log.tsv [closes the loop for batch fix processing]

---

## Flow 7 — On-demand Agents

**Summary:** Four specialist agents are invoked on-demand from copilot-instructions.md trigger rules. None are part of a fixed automated flow — each fires when the user's task matches a specific condition.

| Step | Node | Edge | Node |
|------|------|------|------|
| 1 | copilot-instructions.md | --(references)--> | agents/product-manager.md |
| 2 | copilot-instructions.md | --(references)--> | agents/software-architect.md |
| 3 | copilot-instructions.md | --(references)--> | agents/team-leader.md |
| 4 | copilot-instructions.md | --(references)--> | agents/breadcrumb-navigator.md |
| 5 | agents/product-manager.md | --(writes)--> | plans/ |
| 6 | agents/software-architect.md | --(writes)--> | plans/ |
| 7 | agents/team-leader.md | --(invokes)--> | [multiple specialist agents] |
| 8 | agents/breadcrumb-navigator.md | --(writes)--> | src/**/breadcrumbs.md |

**Trigger conditions (from copilot-instructions.md):**
- product-manager: User scopes a new feature or asks for a PRD
- software-architect: HLD authoring or system design review
- team-leader: Multi-agent orchestration, parallel stream coordination
- breadcrumb-navigator: After features ship or directory structure changes

**Note:** These agents had 8–13 commits each at Stage 2 analysis, confirming active use, but were absent from Flows 1–6. Adding Flow 7 closes the G-1 gap and prevents future pruning passes from incorrectly rating them as used-rarely.
