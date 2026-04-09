# MemPalace Migration Brief for FoodVibe 1.0

**Date**: 2026-04-09
**Status**: Ready for execution
**Supersedes**: `notes/claude-mem-integration-brief.md` (research-only, never installed)

---

## Executive Summary

Install MemPalace as FoodVibe's persistent cross-session memory layer. Clean up leftover research artifacts from the claude-mem evaluation. Remove unused runtimes (Bun, uv) that were installed during research. Integrate MemPalace MCP tools into 3 existing skills.

---

## Phase 0 — Cleanup (remove claude-mem research artifacts + unused tools)

### 0.1 Project Artifacts

```bash
# Remove the superseded research brief
rm notes/claude-mem-integration-brief.md

# The branch claude/analyze-claude-mem-integration-I27X6 can be deleted
# after this brief is merged to a working branch
```

### 0.2 Machine Cleanup — Unused Runtimes

The agent MUST audit the machine first to determine what was installed specifically for claude-mem vs what's used by other tools. Run these checks:

```bash
# CHECK 1: Is Bun used by anything else?
# Look for bun.lockb files, bunfig.toml, or bun-dependent projects
find ~/ -maxdepth 4 -name "bun.lockb" -o -name "bunfig.toml" 2>/dev/null

# CHECK 2: Is uv used by anything else?  
# Look for uv.lock files or pyproject.toml referencing uv
find ~/ -maxdepth 4 -name "uv.lock" 2>/dev/null

# CHECK 3: Is QMD installed anywhere?
which qmd 2>/dev/null
find ~/ -maxdepth 3 -name "*qmd*" -type d 2>/dev/null
npm list -g qmd 2>/dev/null
pip list 2>/dev/null | grep -i qmd
```

**If Bun is unused by other projects:**
```bash
rm -rf ~/.bun
# Remove from PATH in ~/.bashrc, ~/.zshrc, or ~/.profile if added there
```

**If uv is unused by other projects:**
```bash
rm -rf ~/.local/bin/uv
rm -rf ~/.local/bin/uvx
rm -rf ~/.cache/uv
```

**If QMD is installed:**
```bash
# npm global
npm uninstall -g qmd

# pip
pip uninstall qmd -y

# If installed as standalone, find and remove
which qmd && rm "$(which qmd)"
rm -rf ~/.qmd
```

**If ChromaDB was installed globally (for claude-mem testing):**
```bash
pip uninstall chromadb -y 2>/dev/null
pip3 uninstall chromadb -y 2>/dev/null
```

> **IMPORTANT**: The agent must CHECK before removing. Do not blindly delete — Bun/uv may serve other purposes. Ask the user if uncertain.

### 0.3 Verify Clean State

```bash
# Confirm no claude-mem traces remain
which claude-mem          # should return nothing
ls ~/.claude-mem/         # should not exist
curl -s localhost:37777   # should fail (no worker)
grep -r "claude-mem" ~/.claude/ 2>/dev/null  # should return nothing
grep -r "claude-mem" /home/user/foodVibe1.0/.claude/ 2>/dev/null  # should return nothing
```

---

## Phase 1 — Install MemPalace

### 1.1 Prerequisites

```bash
# Python 3.9+ required (check version)
python3 --version

# If Python not available, install it
# Ubuntu/Debian:
sudo apt install python3 python3-pip python3-venv -y

# Verify pip
pip3 --version
```

### 1.2 Install MemPalace

```bash
pip install mempalace
```

This installs:
- `mempalace` CLI
- ChromaDB (embedded, local — NO external server needed)
- PyYAML
- MCP SDK for Python

**No background worker. No open ports. No API keys needed.**

### 1.3 Initialize the Palace for FoodVibe

```bash
# Initialize palace in the project directory
mempalace init ~/foodVibe1.0

# This creates ~/.mempalace/ with:
#   agents/          — agent config files (JSON)
#   palace data      — ChromaDB collection + SQLite KG
```

### 1.4 Mine Existing Project Knowledge

```bash
# Mine the codebase (creates embeddings for code + docs)
mempalace mine ~/foodVibe1.0 --mode projects

# Mine session handoffs (existing cross-session memory)
mempalace mine ~/foodVibe1.0/notes/session-handoffs/ --mode general

# Mine plan files (architectural decisions)
mempalace mine ~/foodVibe1.0/plans/ --mode general
```

This runs locally using ChromaDB's built-in `all-MiniLM-L6-v2` embeddings. No API calls. Expect ~1000 chunks/second — should complete in under a minute for FoodVibe's ~260 plan files + 8 handoffs.

### 1.5 Verify Installation

```bash
# Test search
mempalace search "authentication guard"

# Should return results from mined project files
# Verify ChromaDB is working (no errors, results have similarity scores)
```

---

## Phase 2 — Register MCP Server

### 2.1 Add MemPalace MCP to Project Config

Create `.claude/mcp.json` (does not exist yet):

```json
{
  "mcpServers": {
    "mempalace": {
      "command": "python",
      "args": ["-m", "mempalace.mcp_server"],
      "env": {
        "MEMPAL_DIR": "/home/user/foodVibe1.0"
      }
    }
  }
}
```

> **Note**: The existing `.mcp.json` at project root has the GitHub MCP server (using `cmd /c npx` — Windows-style). Leave that untouched. The `.claude/mcp.json` is a separate config that Claude Code also reads.

### 2.2 Add MCP Permissions

Add to `.claude/settings.json` permissions.allow array:

```json
"mcp__mempalace__mempalace_search",
"mcp__mempalace__mempalace_status",
"mcp__mempalace__mempalace_list_wings",
"mcp__mempalace__mempalace_list_rooms",
"mcp__mempalace__mempalace_kg_query",
"mcp__mempalace__mempalace_kg_timeline",
"mcp__mempalace__mempalace_diary_read",
"mcp__mempalace__mempalace_diary_write",
"mcp__mempalace__mempalace_add_drawer",
"mcp__mempalace__mempalace_get_aaak_spec",
"mcp__mempalace__mempalace_traverse",
"mcp__mempalace__mempalace_find_tunnels"
```

### 2.3 Verify MCP Connection

Start a new Claude Code session. The agent should auto-discover the 19 MemPalace tools. Test:

```
Use mempalace_status to check the palace state
Use mempalace_search to find "recipe builder"  
Use mempalace_kg_query to query entity relationships
```

---

## Phase 3 — Configure Palace Structure for FoodVibe

### 3.1 Wing + Room Mapping

Set up the palace to mirror FoodVibe's domain:

| Wing | Purpose | Rooms |
|------|---------|-------|
| `foodvibe` | Main application | `recipes`, `products`, `equipment`, `venues`, `suppliers`, `inventory`, `auth`, `css-layers`, `build-errors`, `architecture` |
| `plans` | Planning & decisions | `active-plans`, `completed-plans`, `architecture-decisions`, `security-decisions` |
| `sessions` | Session continuity | `handoffs`, `github-sync`, `retrospectives` |

### 3.2 Knowledge Graph Seed

Seed the KG with core FoodVibe entities and relationships:

```python
# These would be added via mempalace_kg_add MCP tool or CLI
# Entity relationships that persist across sessions:

("RecipeBuilder", "depends_on", "ProductService", valid_from="2026-01-01")
("RecipeBuilder", "uses", "PendingChangesGuard", valid_from="2026-03-01")
("CookView", "renders", "Recipe", valid_from="2026-02-01")
("Dashboard", "aggregates", "Equipment,Venues,Inventory", valid_from="2026-01-01")
("AuthGuard", "protects", "AllRoutes", valid_from="2026-01-01")
("CssLayer", "enforces", "FiveGroupRhythm", valid_from="2026-03-01")
```

### 3.3 Auto-Save Hook Configuration

MemPalace auto-saves every 15 messages. No hook changes needed in `.claude/settings.json` — this is handled internally by the MCP server.

**Optional**: Add a `PreCompact` hook if you want emergency saves before context compression:

```jsonc
// Only add this if you experience context window pressure
// in .claude/settings.json hooks section:
"PreCompact": [
  {
    "matcher": "",
    "hooks": [
      {
        "type": "command",
        "command": "python -m mempalace.hooks.precompact"
      }
    ]
  }
]
```

---

## Phase 4 — Skill Integration (3 files to modify)

### 4.1 copilot-instructions.md — Add Memory Search Trigger

Add to §0 Skill Triggers:

```markdown
- **Memory search** `[CC]`: When answering "why did we...", "have we tried...", 
  "what happened with...", or recalling past decisions → use MemPalace MCP tools 
  (mempalace_search, mempalace_kg_query) before grepping session handoffs.
  3-layer pattern: mempalace_search → review results → mempalace_kg_query for 
  entity context. Wake-up cost: ~170 tokens.
```

Add to §0.2 Context Budget:

```markdown
- MemPalace wake-up injects ~170 tokens (L0+L1). On-demand searches add 
  ~200-500 tokens per query. Knowledge graph queries add ~100-300 tokens.
  Total per-session overhead: ~500-2,000 tokens (demand-driven, not automatic).
```

### 4.2 copilot-instructions.md — Update Priority Hierarchy (§0.1)

```markdown
1. User's explicit instruction
2. copilot-instructions.md
3. Active SKILL
4. Agent persona file
5. **MemPalace observations** (when answering "why" or recalling decisions)
6. Breadcrumbs (directory-local context)
7. Historical docs and reports
```

### 4.3 session-handoff/SKILL.md — Add Memory Enrichment Phase

Insert after Phase 1 (Context Gathering):

```markdown
## Phase 1.5 — Memory Enrichment (if MemPalace available)

If MemPalace MCP tools are available:
1. Run `mempalace_search` with keywords from completed tasks
2. Run `mempalace_kg_query` for entities modified this session
3. Append a **"Key Decisions This Session"** section to the handoff:
   - What was decided and why
   - Knowledge graph updates (new entities/relationships)
4. Run `mempalace_diary_write` with a 2-3 sentence AAAK session summary

If MemPalace is unavailable, skip this phase silently — never error on it.
```

### 4.4 plan-implementation.md — Add Historical Recall Phase

Insert before Phase 1 (Decomposition):

```markdown
## Phase 0 — Historical Context (if MemPalace available)

Before decomposing the brief:
1. `mempalace_search` with keywords from the brief (limit=10)
2. `mempalace_kg_query` for entities mentioned in the brief
3. `mempalace_kg_timeline` for chronological context on related work
4. Review results for:
   - Past attempts at similar work
   - Architectural decisions that constrain this plan
   - Known pitfalls or gotchas
5. Include relevant findings in the plan's "## Context" section

If MemPalace is unavailable, skip — proceed to Phase 1.
```

### 4.5 Files That Do NOT Change

Everything else stays untouched:
- `breadcrumb-navigator` — orthogonal (spatial vs temporal)
- `reflect` — skill quality, not session memory
- `cssLayer`, `angularComponentStructure`, `add-recipe`, `elegant-fix` — self-contained
- `git-agent` — pure git operations
- `auto-solve.md` — reads todo.md directly (no memory search needed)
- `standards-*.md` — reference docs
- `todo.md`, plan files — task tracking
- `github-sync` — remote state sync
- Auto-reflect hook (`.claude/reflect/auto-reflect.ps1`) — completely unrelated, keep as-is

---

## Phase 5 — Verification Checklist

### 5.1 Cleanup Verified

- [ ] `notes/claude-mem-integration-brief.md` deleted or archived
- [ ] No `claude-mem` references in `.claude/settings.json`
- [ ] No `claude-mem` MCP server in any `.mcp.json`
- [ ] Bun removed (if unused by other projects) OR confirmed needed
- [ ] uv removed (if unused by other projects) OR confirmed needed
- [ ] QMD removed (if it was installed)
- [ ] No process on port 37777
- [ ] No `~/.claude-mem/` directory

### 5.2 MemPalace Installed

- [ ] `mempalace` CLI responds: `mempalace --version`
- [ ] Palace initialized: `~/.mempalace/` exists with data
- [ ] Project mined: `mempalace search "test"` returns results
- [ ] MCP server registered in `.claude/mcp.json`
- [ ] MCP permissions added to `.claude/settings.json`
- [ ] Claude Code auto-discovers 19 MemPalace tools on session start

### 5.3 Skills Updated

- [ ] copilot-instructions.md §0 has memory search trigger
- [ ] copilot-instructions.md §0.1 has MemPalace in priority hierarchy
- [ ] copilot-instructions.md §0.2 has MemPalace token budget note
- [ ] session-handoff/SKILL.md has Phase 1.5 memory enrichment
- [ ] plan-implementation.md has Phase 0 historical recall
- [ ] All other skills unchanged

### 5.4 End-to-End Test

- [ ] Start fresh Claude Code session
- [ ] Run `mempalace_status` — palace responds with wing/room counts
- [ ] Run `mempalace_search` with "recipe builder" — returns relevant results
- [ ] Run `mempalace_kg_query` with "RecipeBuilder" — returns entity relationships
- [ ] Execute a plan → session handoff → verify diary entry was written
- [ ] Start another session → verify previous session's diary is discoverable

---

## Token Cost Summary

| Activity | Tokens | Frequency |
|----------|--------|-----------|
| Wake-up (L0+L1) | ~170 | Every session start |
| mempalace_search | ~200-500 | On demand (~2-3/session) |
| mempalace_kg_query | ~100-300 | On demand (~1-2/session) |
| mempalace_diary_write | ~50-100 | Session end |
| **Total per session** | **~520-1,370** | |

Compare to claude-mem's projected ~2,400-7,300 tokens/session. MemPalace is **3-5x cheaper on context**.

---

## Risk Register

| Risk | Severity | Mitigation |
|------|----------|------------|
| MemPalace project stalls (7 commits, early stage) | Medium | Skills use "if available, skip silently" pattern — fallback to existing handoffs |
| ChromaDB embedding quality insufficient | Low | MiniLM-L6-v2 is proven for this use case. Raw mode at 96.6% R@5 |
| No real-time capture (saves every 15 msgs) | Low | Session handoffs still capture everything at end. MemPalace is supplementary |
| O(n) palace graph operations degrade at scale | Low | FoodVibe has ~300 plan files. Performance degradation starts at 10K+ drawers |
| Python dependency adds to stack | Low | Python already available on this machine. No new runtime paradigm |

---

## Atomic Sub-Tasks (for todo.md)

1. `[ ]` Audit machine for Bun/uv/QMD usage and remove if unused
2. `[ ]` Delete `notes/claude-mem-integration-brief.md`
3. `[ ]` Install Python 3.9+ and pip (verify or install)
4. `[ ]` Install MemPalace: `pip install mempalace`
5. `[ ]` Initialize palace: `mempalace init`
6. `[ ]` Mine existing project: code, session handoffs, plan files
7. `[ ]` Create `.claude/mcp.json` with MemPalace MCP server
8. `[ ]` Add MCP permissions to `.claude/settings.json`
9. `[ ]` Seed knowledge graph with core FoodVibe entities
10. `[ ]` Update copilot-instructions.md (§0 trigger, §0.1 hierarchy, §0.2 budget)
11. `[ ]` Update session-handoff/SKILL.md with Phase 1.5
12. `[ ]` Update plan-implementation.md with Phase 0
13. `[ ]` Verify end-to-end: status → search → KG query → diary write
14. `[ ]` Configure wing/room structure for FoodVibe domain

---

*Brief ready for execution. Say "save the plan" to proceed, or ask questions first.*
