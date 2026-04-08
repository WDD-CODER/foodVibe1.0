# Claude-Mem Integration Brief for FoodVibe 1.0

**Date**: 2026-04-08
**Author**: Claude (Session analysis)
**Status**: Research complete — awaiting decision

---

## Executive Summary

claude-mem (v12.0.1) is a persistent memory compression system for Claude Code that captures observations across session lifecycles, stores them in SQLite + Chroma vector DB, and provides MCP-based semantic search. FoodVibe already has a sophisticated 5-layer context preservation system (breadcrumbs, session handoffs, github-sync, todo/plans, reflect loop). This brief analyzes whether claude-mem should **replace**, **augment**, or **coexist** with existing infrastructure, and recommends a targeted augmentation strategy.

---

## 1. Claude-Mem Architecture Overview

### Components

| Component | Technology | Role |
|-----------|-----------|------|
| **6 Hook Scripts** | TypeScript/Bun | Capture data at SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd |
| **Worker Service** | Bun HTTP server (port 37777) | API + web viewer UI, memory retrieval, context injection |
| **SQLite DB** | SQLite 3 | Sessions, observations, summaries, pending messages |
| **Chroma Vector DB** | Python (via uv) | Hybrid semantic + keyword search over observations |
| **MCP Server** | `mcp-server.ts` (580 lines) | 7 tools exposed to Claude Code |
| **Context Builder** | ContextBuilder → ObservationCompiler → TokenCalculator | Generates session-start context injection |

### MCP Tools Provided

| Tool | Purpose | Token Cost |
|------|---------|-----------|
| `search` | Compact index with IDs — full-text + filters | ~50-100 tokens/result |
| `timeline` | Chronological context around observations | ~200-300 tokens/result |
| `get_observations` | Full detail fetch by ID batch | ~500-1000 tokens/result |
| `smart_search` | AST-based codebase symbol search (tree-sitter) | Variable |
| `smart_unfold` | Expand symbol from file — returns source | Variable |
| `smart_outline` | Structural file outline with bodies folded | Variable |
| `__IMPORTANT` | Workflow documentation (3-layer search pattern) | ~200 tokens |

### Hook Lifecycle

```
SessionStart  → Injects context from prior sessions (via hookSpecificOutput)
UserPromptSubmit → Captures user input as observation
PostToolUse   → Records tool execution results as observations
Stop          → Intermediate checkpoint (summarization opportunity)
SessionEnd    → Finalizes session, triggers compression/summarization
```

### Storage Schema (SQLite Modules)

```
sqlite/
├── Sessions.ts        — Session metadata (start, end, project)
├── Observations.ts    — Raw captured data (tool use, user prompts)
├── Summaries.ts       — AI-compressed session summaries
├── Timeline.ts        — Chronological ordering and context
├── SessionSearch.ts   — Full-text search over sessions
├── PendingMessageStore.ts — Queued observations awaiting processing
├── Prompts.ts         — Stored prompts/templates
├── migrations/        — Schema versioning
└── transactions.ts    — ACID transaction support
```

### Dependencies

- **Bun** runtime (auto-installed)
- **uv** Python package manager (for Chroma)
- **Node.js 18+**
- **Anthropic Claude Agent SDK** (^0.1.76)
- **MCP SDK** (^1.25.1)
- **Tree-sitter** grammars (20+ languages)
- **Express** for worker HTTP API
- **React** for web viewer UI

---

## 2. FoodVibe Current Memory Infrastructure

### Five-Layer Preservation System

| Layer | Mechanism | Refresh | Format | Token Cost |
|-------|-----------|---------|--------|------------|
| **Directory Context** | 7 `breadcrumbs.md` at major seams | On structural change | Markdown tables | ~200-400 tokens each, loaded on demand |
| **Session Boundary** | `session-handoffs/*.md` (8 files) | Per session end | Structured markdown | ~500-800 tokens per handoff |
| **Daily Sync** | `github-sync/*.md` (9 files) | Once/day on session start | Status report | ~400-600 tokens |
| **Task Tracking** | `todo.md` + 260+ plan files | Per sub-task completion | Checkbox markdown | ~2000 tokens for todo.md |
| **Self-Improvement** | `/reflect` loop + auto-reflect hook | Per correction cycle | TSV logs + evidence | ~3000 tokens per cycle |

### Key Characteristics

1. **All markdown-based** — human-readable, git-trackable, zero external dependencies
2. **On-demand loading** — context budget managed by copilot-instructions.md §0.2
3. **Deterministic** — breadcrumbs reflect actual code; no AI hallucination risk
4. **Git-integrated** — everything committed, diffable, reviewable
5. **No runtime services** — no background processes, no ports, no databases

---

## 3. Decision: Replace, Augment, or Coexist?

### Recommendation: **Targeted Augmentation** (not replacement, not full coexistence)

#### What claude-mem does better than current system

| Capability | Current | Claude-Mem | Delta |
|-----------|---------|------------|-------|
| **Cross-session semantic search** | Manual (read handoff files) | Automatic (vector search) | High value |
| **"Why did we do X?"** recall | Grep session handoffs | `search(query="why X")` → instant | High value |
| **Tool use patterns** | Not captured | PostToolUse hook → indexed | Medium value |
| **Session context injection** | SessionStart reads handoff + todo | Auto-injects relevant memories | Medium value |
| **Observation compression** | Not done (raw markdown persists) | AI summarization pipeline | Medium value |

#### What current system does better

| Capability | Current | Claude-Mem | Winner |
|-----------|---------|------------|--------|
| **Directory navigation** | Breadcrumbs at seams | Not addressed | Breadcrumbs |
| **Task tracking** | todo.md + plan files + gatekeeper protocol | Not addressed | Current |
| **Skill self-improvement** | /reflect loop with scoring | Not addressed | Current |
| **Git workflow** | git-agent + session-handoff + github-sync | Not addressed | Current |
| **Zero dependencies** | Pure markdown, no services | Bun + Chroma + SQLite + Express | Current |
| **Deterministic accuracy** | Breadcrumbs verified against code | Observations may drift | Current |
| **Human reviewability** | All files diffable in PR | Binary DB, not in git | Current |

#### What should NOT be replaced

1. **Breadcrumb Navigator** — serves a fundamentally different purpose (directory-level structural navigation vs. temporal memory). These are complementary, not competing.
2. **Session Handoff** — the structured human-readable handoff format is essential for the planning brain workflow and multi-day context continuity.
3. **Todo/Plans** — the gatekeeper protocol and plan ledger are core workflow, not memory.
4. **Reflect loop** — skill self-improvement has no equivalent in claude-mem.

---

## 4. Recommended Integration Architecture

### Phase 1: Observation Capture (Low risk, high value)

Install claude-mem hooks alongside existing hooks to capture observations, but **do not replace** any existing skill.

```jsonc
// .claude/settings.json — hooks section (merged)
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "claude-mem hook session-start"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "claude-mem hook post-tool-use"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "claude-mem hook stop"
          },
          {
            "type": "command",
            "command": "powershell -NoProfile -File .claude/reflect/auto-reflect.ps1"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "claude-mem hook session-end"
          }
        ]
      }
    ]
  }
}
```

**Note on environment**: FoodVibe runs on Windows (PowerShell 5.1 for auto-reflect hook). claude-mem requires Bun and uv (Python). Verify Bun is available or install it: `powershell -c "irm bun.sh/install.ps1 | iex"`. The Linux environment shown here would need the bash equivalent.

### Phase 2: MCP Search Integration

Add claude-mem's MCP server to the project's MCP configuration:

```jsonc
// .claude/mcp.json (new or updated)
{
  "mcpServers": {
    "claude-mem": {
      "command": "claude-mem",
      "args": ["mcp-server"],
      "env": {
        "CLAUDE_MEM_PROJECT": "foodvibe"
      }
    }
  }
}
```

### Phase 3: Skill Integration Points

#### 3a. Session-Handoff Enhancement

Add a claude-mem query step to the session-handoff skill to enrich the handoff with semantic observations:

```markdown
<!-- Add to .claude/skills/session-handoff/SKILL.md, Phase 1 -->

## Phase 1.5 — Memory Enrichment (if claude-mem available)

If claude-mem MCP tools are available:
1. Run `search(query="decisions architecture tradeoffs", dateStart="<session-start>", project="foodvibe", limit=5)`
2. For relevant IDs, run `get_observations(ids=[...])` 
3. Append a **"Key Decisions This Session"** section to the handoff with:
   - What was decided and why
   - Alternatives considered
   - Trade-offs accepted
```

#### 3b. Plan-Implementation Context

Add memory recall to the plan-implementation command:

```markdown
<!-- Add to .claude/commands/plan-implementation.md, before Phase 1 -->

## Phase 0 — Historical Context (if claude-mem available)

Before decomposing the brief:
1. `search(query="<brief-keywords>", project="foodvibe", limit=10)`
2. Review results for:
   - Past attempts at similar work
   - Architectural decisions that constrain this plan
   - Known pitfalls or gotchas
3. Include relevant findings in the plan's "## Context" section
```

#### 3c. Auto-Solve Continuity

The auto-solve command benefits most from cross-session memory — if a plan was partially executed in a previous session, claude-mem can recall exactly where things left off:

```markdown
<!-- Add to .claude/commands/auto-solve.md, Phase 1 -->

## Phase 0.5 — Previous Execution Recall

If claude-mem tools available:
1. `search(query="plan <plan-number>", type="tool_use", project="foodvibe", limit=20)`
2. Check if any sub-tasks were attempted but not committed
3. Flag potential conflicts or rework
```

---

## 5. Most Valuable Observations for FoodVibe Sessions

Ranked by impact on session productivity:

| Priority | Observation Type | Why It Matters | Capture Point |
|----------|-----------------|----------------|---------------|
| **P0** | Architectural decisions + rationale | "Why did we choose X over Y?" is the #1 question across sessions | PostToolUse (when editing architecture files) |
| **P0** | Build failures and their fixes | Same error recurring across sessions wastes 10-15 min each time | PostToolUse (ng build failures) |
| **P1** | Plan execution progress | "Did we already try this approach?" prevents rework | Stop checkpoint |
| **P1** | Security Officer findings | Auth/route/storage decisions must persist across sessions | PostToolUse (security audit results) |
| **P2** | CSS layer decisions | Which CSS group/layer was chosen for what component | PostToolUse (SCSS edits) |
| **P2** | Recipe/domain model changes | Hebrew canonical values, translation key patterns | UserPromptSubmit + PostToolUse |
| **P3** | Performance bottlenecks discovered | Lazy-load boundaries, bundle size observations | PostToolUse (build analysis) |
| **P3** | Tool use patterns | Which MCP tools are used most/least efficiently | Aggregated from PostToolUse |

### Observation Tagging Strategy

Configure claude-mem to tag observations by FoodVibe domain:

```typescript
// Suggested observation types for search filtering
const FOODVIBE_OBS_TYPES = [
  'architecture-decision',   // HLD/plan trade-offs
  'build-failure',           // ng build errors + fixes
  'security-finding',        // Security Officer results
  'css-layer-decision',      // cssLayer skill output
  'domain-model-change',     // Recipe/product/equipment schema
  'plan-execution',          // Sub-task completion notes
  'performance-observation', // Bundle size, load times
  'reflect-improvement',     // Skill improvement cycles
];
```

---

## 6. Modifications to Existing Skills/Instructions

### 6a. copilot-instructions.md Additions

```markdown
<!-- Add to §0 Skill Triggers -->

- **Memory search** `[CC]`: When answering "why did we...", "have we tried...", 
  "what happened with...", or recalling past decisions → use claude-mem MCP tools 
  (search → timeline → get_observations) before grepping session handoffs.

<!-- Add to §0.2 Context Budget -->

- claude-mem context injection adds ~500-2000 tokens at SessionStart depending on 
  relevance. The 3-layer search pattern (search → filter → fetch) keeps per-query 
  cost under 1000 tokens for typical lookups.
```

### 6b. No Changes Needed

These skills/files require **zero modification**:

- `breadcrumb-navigator` — orthogonal to temporal memory
- `cssLayer` — self-contained, no memory dependency
- `angularComponentStructure` — self-contained
- `add-recipe` — self-contained
- `elegant-fix` — self-contained
- `reflect` — operates on skill quality, not session memory
- `git-agent` — pure git operations
- `standards-*.md` — reference docs, not memory consumers
- `todo.md` / plan files — task tracking, not memory

### 6c. Priority Hierarchy Update

```markdown
<!-- Update §0.1 Priority Hierarchy -->

1. User's explicit instruction
2. copilot-instructions.md
3. Active SKILL
4. Agent persona file
5. **claude-mem observations** (when answering "why" or recalling decisions)
6. Breadcrumbs (directory-local context)
7. Historical docs and reports
```

---

## 7. Token Cost Analysis

### Current Workflow — Per Session

| Activity | Tokens | When |
|----------|--------|------|
| Preflight (agent.md + copilot-instructions.md) | ~4,500 | Session start |
| GitHub sync (read/write) | ~1,200 | Session start (daily) |
| Session handoff (read last) | ~800 | Session start |
| Todo.md read | ~2,000 | Session start |
| Breadcrumbs (on demand, ~2 reads/session) | ~600 | During work |
| Standards files (on demand, ~1-2/session) | ~1,500 | During work |
| Reflect auto-mode (per correction cycle) | ~3,000 | On error-fix |
| Session handoff (write) | ~800 | Session end |
| **Total baseline per session** | **~14,400** | |

### Claude-Mem Integrated — Additional Costs

| Activity | Tokens | When |
|----------|--------|------|
| SessionStart context injection | ~500-2,000 | Session start (automatic) |
| Search query (compact index) | ~300-500 | On demand (~2-3/session) |
| Timeline query | ~400-600 | On demand (~1-2/session) |
| get_observations fetch | ~500-2,000 | On demand (~1-2/session) |
| `__IMPORTANT` workflow doc | ~200 | First search per session |
| PostToolUse hook overhead | ~0 (async, off-context) | Every tool use |
| SessionEnd summarization | ~0 (async, off-context) | Session end |
| **Total additional per session** | **~2,400-7,300** | |

### Comparison

| Metric | Current | With claude-mem | Delta |
|--------|---------|-----------------|-------|
| Session start tokens | ~8,500 | ~9,000-10,500 | +6-24% |
| Per-session total | ~14,400 | ~16,800-21,700 | +17-51% |
| Background processing | 0 | Worker service (37777) | New process |
| Disk usage | ~2MB (markdown) | +50-200MB (SQLite + Chroma) | Significant |
| External dependencies | 0 | Bun + uv + Chroma | 3 new |

### Cost-Benefit Assessment

- **Best case** (+17% tokens): 2-3 targeted searches per session, catching a recurring build error or recalling an architectural decision that would otherwise take 10+ minutes of manual grep.
- **Worst case** (+51% tokens): Aggressive search usage with full observation fetches. Still within reasonable bounds for a 200k-1M context window.
- **Break-even**: claude-mem pays for itself if it prevents **one** 5-minute context reconstruction per session. Given FoodVibe's 260+ plans and 8+ session handoffs, this is highly likely.

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Worker service crashes mid-session | Medium | Graceful degradation — all existing skills work without it |
| Chroma/Bun dependency conflicts | Medium | Install in isolated environment; pin versions |
| Hook latency slows tool use | Low | Hooks are async (continue: true, suppressOutput: true) |
| Observation drift (stale memories) | Medium | Observation expiry policy; prefer recent results |
| Double context injection | Low | SessionStart hook should detect existing handoff and not duplicate |
| Storage growth | Low | SQLite compaction + Chroma pruning on schedule |
| AGPL-3.0 license concerns | Low | FoodVibe is a private project, not distributed |
| Windows PowerShell compatibility | Medium | Current environment is Linux; Bun runs natively on Linux |

---

## 9. Implementation Roadmap

### Sprint 1: Install and Observe (1 session, ~30 min)

1. Install Bun if not present: `curl -fsSL https://bun.sh/install | bash`
2. Install claude-mem: `npx claude-mem install`
3. Verify worker starts: `curl http://localhost:37777/api/health`
4. Run one full session with hooks active — observe web UI at :37777
5. **Do not modify any existing skills yet**

### Sprint 2: MCP Search Validation (1 session, ~20 min)

1. Add MCP server config to `.claude/mcp.json`
2. Run `search(query="test", project="foodvibe")` to verify connectivity
3. Test 3-layer workflow: search → timeline → get_observations
4. Evaluate observation quality and relevance

### Sprint 3: Skill Integration (1 session, ~45 min)

1. Add Phase 0 memory recall to `plan-implementation.md`
2. Add Phase 1.5 enrichment to `session-handoff/SKILL.md`
3. Update copilot-instructions.md §0 with memory search trigger
4. Update §0.1 priority hierarchy
5. Test end-to-end: start session → plan → execute → handoff

### Sprint 4: Tuning (ongoing)

1. Configure observation types/tags for FoodVibe domains
2. Set token budgets for context injection
3. Establish pruning schedule for old observations
4. Monitor disk usage and worker health

---

## 10. Decision Matrix

| Option | Effort | Value | Risk | Recommendation |
|--------|--------|-------|------|----------------|
| **A. Do nothing** | 0 | 0 | 0 | Baseline |
| **B. Full replacement** | Very High | Medium | High | **Reject** — destroys working infrastructure |
| **C. Full coexistence** | High | High | Medium | Overkill — too many moving parts |
| **D. Targeted augmentation** | Medium | High | Low | **Recommended** — adds semantic search without disrupting workflow |

### Final Recommendation

**Option D: Targeted Augmentation**

Install claude-mem for its **observation capture + semantic search** capabilities only. Keep the entire existing infrastructure (breadcrumbs, handoffs, reflect, todo/plans, git-agent) exactly as-is. Add claude-mem as a **sixth memory layer** that answers the one question the current system cannot: *"What did we do, and why, across all past sessions?"*

The breadcrumb navigator answers "what's here now." Claude-mem answers "what happened before." They are complementary, not competing.

---

*Brief prepared for review. Next step: User decision on whether to proceed with Sprint 1.*
