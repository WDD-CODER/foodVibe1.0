# Plan: AI Framework Redundancy Audit & Precision Fix

## Context

Every spawned subagent in Claude Code receives `CLAUDE.md` as part of its system prompt — the same way the main session does. This means the **Mandatory Gate** in `CLAUDE.md` fires for every agent spawn, forcing each subagent to read `agent.md` + `copilot-instructions.md` before doing any work. For most agents this is wasteful. For narrow-purpose agents like UI Inspector it is completely irrelevant.

Beyond the gate problem, additional structural redundancies compound the token waste across the framework.

---

## Redundancy Map — Full Audit

### Problem 1 — Mandatory Gate fires on every subagent spawn (root cause)

| Agent | Uses agent.md? | Uses copilot-instructions.md? | Waste level |
|---|---|---|---|
| **UI Inspector** | No (no branch, no commit, no sync) | No (no CSS, no Angular, no icons) | **100% waste** |
| **Breadcrumb Navigator** | No (no commit, no branch) | Only §4 (folder structure) | **~85% waste** |
| **Security Officer** | No (no commit, no branch, no sync) | Has full rules embedded in its own file | **~70% waste** |
| **Product Manager** | No (no commit, no branch) | Only §1.1, §2, §7 | **~65% waste** |
| **Software Architect** | No (no commit, no branch) | Only §3, §4, §7, §8 | **~60% waste** |
| **QA Engineer** | No (no commit/branch directly) | Only §3, §5 | **~55% waste** |
| **Team Leader** | Partially (orchestrates agents, not code) | Most sections relevant | **~20% waste** |

**Root fix**: One sentence in `CLAUDE.md` exempting spawned subagents from the gate eliminates ALL rows above.

---

### Problem 2 — Duplicate agent index table (two sources of truth)

`agent.md` §Agent System and `copilot-instructions.md` §0.3 contain **identical agent tables**. If one is updated the other silently drifts. Maintenance burden, no value from duplication.

**Fix**: Remove §0.3 from `copilot-instructions.md`. Keep `agent.md` as canonical.

---

### Problem 3 — agent.md preflight has main-session-only steps with no scope label

The preflight checklist includes:
- Step 2: GitHub sync check (subagents must never trigger this — the once-per-day gate works, but an agent can waste time checking)
- Step 3: Check `todo.md` (orchestration context only)
- Step 7: Branch check (non-code agents don't commit)

These silently apply to all agents because nothing says they don't.

**Fix**: Add a one-line scope note to the preflight: "Steps 1–3 and 7 apply to the main session only."

---

### Problem 4 — Breadcrumb Navigator triple-reads at spawn

When spawned, this agent:
1. Reads `agent.md` + `copilot-instructions.md` (mandatory gate)
2. Then its own agent file says: "Read and follow `.claude/skills/breadcrumb-navigator/SKILL.md` first"

That's **3 file reads before any work begins**. After fixing Problem 1, this drops to the one SKILL read — which IS needed.

---

### Problem 5 — "Apply all project standards" is an unbounded read instruction

Agent files for QA Engineer, Product Manager, Software Architect, and Team Leader all say:
> "Apply all project standards from `.claude/copilot-instructions.md`"

Even when the agent only uses 2-3 sections. The phrase has no boundary — it tells the agent to load the whole file. Since `copilot-instructions.md` is ~200+ lines covering Angular, CSS, Translation, Icons, Auth, Git, and QA, most sections are irrelevant to a given agent.

**Fix**: Replace the unbounded phrase with targeted section references in each agent file.

---

### Problem 6 — Security Officer has full rules embedded but still references copilot-instructions

The Security Officer agent file contains a complete, detailed security checklist (170+ lines). It references specific files (`auth-crypto.ts`, `authGuard`, etc.) and doesn't need Angular patterns, CSS rules, Lucide icons, or translation. The instruction "apply project standards from copilot-instructions" adds no value here.

---

## What We Are NOT Changing

- The skills themselves (cssLayer, commit-to-github, etc.) — loaded on-demand correctly
- The content or rules inside copilot-instructions.md (only §0.3 table removal)
- Agent capabilities or responsibilities
- Any Angular source files

---

## Implementation Plan

### Phase 1 — Fix the Root Cause (CLAUDE.md)

**File**: `CLAUDE.md`

Add one sentence to the Mandatory Gate block:

```
> **Spawned subagents** (`.claude/agents/`): exempt from this gate. Their context comes from their agent definition file — not from a full session start.
```

---

### Phase 2 — Scope the Preflight (agent.md)

**File**: `agent.md`

In the Preflight Checklist, add a scope note before Step 1:

```
> **Scope**: Steps 1–3 and Step 7 apply to the **main Claude Code session only**. Spawned subagents skip these steps.
```

---

### Phase 3 — Remove Duplicate Agent Table (copilot-instructions.md)

**File**: `copilot-instructions.md`

Remove §0.3 Agent Personas table entirely. Replace with one pointer line:

```
## 0.3 Agent Personas
See `agent.md` §Agent System for the canonical agent index.
```

---

### Phase 4 — Tighten "Apply all project standards" in agent files

Replace the unbounded phrase with targeted references in 4 agent files:

| Agent file | Replace with |
|---|---|
| `qa-engineer.md` | "Apply §3 (Angular/services) and §5 (Security & QA) from `.claude/copilot-instructions.md`" |
| `product-manager.md` | "Apply §1.1 (Q&A format), §2 (Gatekeeper Protocol), §7 (translation) from `.claude/copilot-instructions.md`" |
| `software-architect.md` | "Apply §3 (Angular), §4 (UI/CSS/folder structure), §7 (translation), §8 (Lucide) from `.claude/copilot-instructions.md`" |
| `team-leader.md` | "Apply §1–§8 from `.claude/copilot-instructions.md` (full context needed for cross-subsystem orchestration)" |

For `security-officer.md` and `breadcrumb-navigator.md`: remove the "Apply all project standards" line entirely — both have their rules embedded or in their SKILL.

---

### Phase 5 — UI Inspector explicit gate skip (belt + suspenders)

**File**: `.claude/agents/ui-inspector.md`

Add a short header note:

```
## Context Scope
This agent is gate-exempt. It does not read `agent.md` or `copilot-instructions.md`.
All instructions are self-contained in this file.
```

---

## Files Modified

| File | Change |
|---|---|
| `CLAUDE.md` | Add subagent gate exemption sentence |
| `agent.md` | Add main-session-only scope note to preflight |
| `.claude/copilot-instructions.md` | Remove §0.3 duplicate table → pointer line |
| `.claude/agents/ui-inspector.md` | Add "Context Scope: gate-exempt" header |
| `.claude/agents/qa-engineer.md` | Targeted section reference |
| `.claude/agents/product-manager.md` | Targeted section reference |
| `.claude/agents/software-architect.md` | Targeted section reference |
| `.claude/agents/team-leader.md` | Targeted section reference |
| `.claude/agents/security-officer.md` | Remove "Apply all project standards" line |
| `.claude/agents/breadcrumb-navigator.md` | Remove "Apply all project standards" line |

**10 files. All are documentation/config — no Angular source touched.**

---

## Estimated Token Savings Per Complex Session

| Scenario | Before | After |
|---|---|---|
| UI Inspector invoked | ~4,000 tokens wasted | 0 |
| QA + Architect + PM pipeline | ~8,000 tokens wasted | ~0 |
| Full 5-agent task force | ~15,000 tokens wasted | ~0 |

---

## Verification

1. Spawn UI Inspector on any page → confirm it navigates and reports without reading agent.md
2. Invoke Product Manager → confirm it asks Q&A format questions without the gate confirmation
3. Grep `copilot-instructions.md` for §0.3 table → should only show pointer line
4. Run `/validate-agent-refs` to confirm all cross-references in agent files remain valid
