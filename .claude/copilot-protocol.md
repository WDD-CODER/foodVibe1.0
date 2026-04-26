---
name: copilot-protocol
description: Priority hierarchy, context budget, context-first protocol. Lazy-loaded.
---

## 0.1 Priority Hierarchy (when guidance conflicts)

1. **User's explicit instruction** in the current conversation
2. **This file** (`copilot-instructions.md`) — single source of truth
3. **Active SKILL** being executed (context-specific rules for the current workflow)
4. **Agent persona** file (role-specific guidance)
5. **MemPalace observations** (when answering "why" or recalling decisions — if MCP tools available)
6. **Breadcrumbs** (directory-local context)
7. **Historical docs and reports** (tech-debt reports, session handoffs, etc.)

---

## 0.2 Context Budget

Load skills and standards files on-demand at the point of need — do not pre-load at session start. Each skill is ~400–1,500 tokens. Each standards file is ~800–1,500 tokens. Load only what the current task requires.

> **Skills are self-contained**: Each skill carries its own inline rules. When a skill is active, its inline rules are authoritative — do not load standards files to supplement them unless the skill explicitly instructs it.

> **MemPalace context** adds ~170 tokens for wake-up (L0+L1). Per-session search cost is ~2,700 tokens for 1 search (5 results). `mempalace_kg_query` adds 50–300 tokens depending on entity connectivity. Diary writes are near-zero read cost. If MemPalace MCP is unavailable, skip silently — do not block on it.

---

## 0.3 Context-First Protocol (All Agents)

**Main Claude runs `mempalace_search` before reading files to understand an existing area.**
Subagents receive MemPalace results injected into their prompts — they do NOT call MemPalace themselves (MCP tools are unreliable in subagent context per [GitHub #13898](https://github.com/anthropics/claude-code/issues/13898)).

| Situation | Use MemPalace | Then |
|-----------|--------------|------|
| Designing or planning | What patterns/decisions already exist? | Grep/Read to confirm |
| Investigating a bug | What's the history of this area? | Grep/Read to locate exact code |
| Writing tests | What's been tested? What has broken? | Read test files |
| Security auditing | What past decisions constrain the surface? | Read auth/guard files |
| Onboarding to an unfamiliar module | What is this thing and why? | Read breadcrumbs |
| Mechanical edit / pattern apply | SKIP MemPalace | Go straight to Read/Grep |

**Pattern (main session):**
1. `mempalace_search(query="<2-3 words from task>", limit=3)` — orient
2. `Grep` / `Read` — confirm, navigate, edit

**Pattern (spawning subagents):**
1. Main Claude runs `mempalace_search(query="<task keywords>", limit=3)`
2. Paste top 3 results into Agent prompt under `## MemPalace Context`
3. Spawn subagent — it receives knowledge, doesn't need MCP

**For unfamiliar modules:** Also call `mempalace_traverse(start_room="<module-name>", max_hops=2)` to discover cross-cutting connections across the codebase.

**If MCP unavailable:** Skip without blocking — but report in your completion message that MemPalace was not consulted, so the orchestrating agent has visibility.
**When spawning subagents:** NEVER include "search MemPalace first" in the prompt. Include `## MemPalace Context` with real results (or "no results found").

---

## 0.3.1 MemPalace Fact Lifecycle

When a plan is **superseded** or an architectural decision is **reversed**:
1. `mempalace_kg_invalidate(subject="<entity>", predicate="decided", object="<old decision>", ended="<today>")` — mark old fact as expired
2. `mempalace_kg_add(subject="<entity>", predicate="decided", object="<new decision>", valid_from="<today>")` — record new fact

This maintains temporal accuracy — the KG knows what was true when, not just what's true now. Skip if MCP unavailable.
