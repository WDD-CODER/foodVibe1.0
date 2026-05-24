---
name: copilot-routing
description: Agent personas, task-force sizing, model routing tables. Lazy-loaded by team-leader.
---

## 0.4 Agent Personas (when to invoke)

Agent persona files live in `.claude/agents/`. Load on demand — do not pre-load.

| Agent | File | Invoke when |
|-------|------|-------------|
| Team Leader | `team-leader.md` | Task spans >2 subsystems; agents conflict; progress report needed |
| Software Architect | `software-architect.md` | PRD exists and needs HLD; architecture trade-offs to evaluate |
| Product Manager | `product-manager.md` | Planning a new feature; writing a plan file; scoping work |
| Breadcrumb Navigator | `skills/breadcrumb-navigator/SKILL.md` | New pages or app subtree; structural changes; after update-docs |
| QA Engineer | `qa-engineer.md` | Spec gaps; diagnosing failing tests; E2E creation |
| Mobile Flow Auditor | `mobile-flow-auditor.md` | Mobile layout regression hunt; pre-release UX sanity check |
| Render Flow Auditor | `render-flow-auditor.md` | Post-deploy production smoke; reproducing a prod-only bug |
| Security Officer | `security-officer.md` | Post-feature review of auth/storage/route changes; pre-deploy |
| Git Agent | `git-agent.md` | All git operations: commit, push, PR creation, merge, branch management |
| End-of-Session Agent | `end-of-session-agent.md` | Session wrap-up: "done", "wrap up", "ship", "handoff", "end session" |

---

## 0.5 Task Force & Documentation Standards

**Task Sizing**
| Size | Agent Count | Typical Use |
|------|-------------|-------------|
| Small | 1–2 agents | Bug fix, single component, docs update |
| Medium | 3–4 agents | New page + service, cross-cutting refactor |
| Large | 5 agents | New subsystem, major architecture change |

**Standard Sequence**: Product Manager → Software Architect → Implementation → QA Engineer → (Security Officer if security surface touched)

**Documentation Gate**: After any structural change to the app's top-level subtrees, run Breadcrumb Navigator to update `breadcrumbs.md` at affected seams.

**Verification Gate:** After any change, agents follow `validation-checklist.md` — show the validation checklist, then ask "Should I verify this myself, or will you check it?" Do not auto-run `/qa`. If the user chooses agent verification and the dev server is unreachable, flag it to the user.

**Build Verification Gate**: After any agent-written code, run `mcp__ide__getDiagnostics` or `[BUILD_COMMAND]` before marking tasks `[x]`. Trust the compiler, not the agent's self-report.

---

## 0.6 Model Routing — Efficiency Tiers

| Agent | High Reasoning (Sonnet) | Procedural (Haiku/Flash) |
|-------|------------------------|--------------------------|
| Team Leader | Task Force Assembly, Conflict Resolution | Quality Oversight, Visual QA Trigger |
| Product Manager | PRD Authoring, Scoping, Dependency Mapping | Milestone Sync (format check) |
| Software Architect | HLD Creation, Entity Modeling, Trade-off Analysis | Pattern Enforcement (grep/checklist) |
| Security Officer | Threat Modeling, Logic-Flow Audit | Vulnerability Grepping, Injection Awareness |
| QA Engineer | Test Strategy, Diagnostic Reasoning | Spec Authoring, Visual QA Verification |
| Breadcrumb Navigator | — (all procedural) | All phases (pure scan/read/write) |
