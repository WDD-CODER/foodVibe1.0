# Agent Brief: Migrate from claude-mem to MemPalace

**Hand this to a fresh Claude Code session on the local Windows machine.**
**Copy everything below the line and paste as your first message.**

---

## Your Mission

You are migrating the FoodVibe 1.0 project from **claude-mem** to **MemPalace**. This is a two-phase job: (1) research MemPalace thoroughly, (2) produce a concrete implementation plan with exact commands and file edits.

## Context You Need to Know

- FoodVibe is an Angular 19 app at `C:\foodCo\foodVibe1.0\`
- We previously installed **claude-mem** (persistent memory system for Claude Code) along with its prerequisites: Bun runtime, uv Python package manager, possibly QMD (embedding tool), possibly ChromaDB
- We are **replacing claude-mem with MemPalace** (`github.com/milla-jovovich/mempalace`)
- The project has a sophisticated existing infrastructure: breadcrumbs, session handoffs, reflect loop, todo/plans, git-agent — **none of these change**
- MemPalace is being added as a **6th memory layer** alongside existing infrastructure
- The existing `.claude/settings.json` may have claude-mem hooks that need removal
- There may be `.claude/mcp.json` or `.mcp.json` entries for claude-mem MCP server
- There may be a `~/.claude-mem/` data directory with SQLite + Chroma databases

## Phase 1: Research MemPalace (do this FIRST)

Use WebFetch / WebSearch to read the following resources. Do NOT skip any:

1. **GitHub README**: `https://github.com/milla-jovovich/mempalace` — read the full README
2. **Raw README**: `https://raw.githubusercontent.com/milla-jovovich/mempalace/main/README.md`
3. **Official docs/site**: `https://www.mempalace.tech/`
4. **MCP server source**: `https://github.com/milla-jovovich/mempalace/blob/main/mempalace/mcp_server.py` — read to understand all 19 MCP tools, their parameters, and return types
5. **Knowledge graph source**: `https://github.com/milla-jovovich/mempalace/blob/main/mempalace/knowledge_graph.py` — understand temporal entity-relationship triples
6. **CLI source**: `https://github.com/milla-jovovich/mempalace/blob/main/mempalace/cli.py` — understand all CLI commands
7. **Independent analysis**: `https://github.com/lhl/agentic-memory/blob/main/ANALYSIS-mempalace.md` — honest technical assessment
8. **Installation guide** (if separate from README): check for `INSTALL.md` or docs/ directory
9. **Hooks implementation**: search the repo for hook files, auto-save, PreCompact
10. **Configuration reference**: search for settings, config, `.mempalace/` directory structure

From this research, document:
- All 19 MCP tools with their exact names, parameters, and what they return
- The complete installation process (pip install, init, mine)
- How the palace structure works (Wings, Rooms, Halls, Drawers, Tunnels, Closets)
- How the knowledge graph works (add_triple, invalidate, query, timeline)
- How auto-save hooks work (every 15 messages, PreCompact)
- The AAAK compression dialect (what it is, when to use it, limitations)
- Token costs per operation (wake-up, search, KG query, diary)
- Storage location and format (`~/.mempalace/` or configurable)
- How to register as MCP server for Claude Code
- Any known issues, limitations, or gotchas

## Phase 2: Audit Current Machine

After researching MemPalace, audit the local machine for ALL claude-mem artifacts:

### 2a. Check for claude-mem installation
```powershell
# Is claude-mem installed?
where.exe claude-mem 2>$null
npm list -g claude-mem 2>$null
Get-ChildItem "$env:USERPROFILE\.claude-mem" -ErrorAction SilentlyContinue

# Is the worker running?
try { Invoke-WebRequest http://localhost:37777/api/health -UseBasicParsing } catch { "Not running" }

# Check for claude-mem in Claude Code config
Get-Content "$env:USERPROFILE\.claude\settings.json" 2>$null | Select-String "claude-mem"
Get-Content "C:\foodCo\foodVibe1.0\.claude\settings.json" | Select-String "claude-mem"
Get-Content "C:\foodCo\foodVibe1.0\.claude\mcp.json" 2>$null
Get-Content "C:\foodCo\foodVibe1.0\.mcp.json" 2>$null
```

### 2b. Check for prerequisites installed for claude-mem
```powershell
# Bun
where.exe bun 2>$null
bun --version 2>$null
Get-ChildItem "$env:USERPROFILE\.bun" -ErrorAction SilentlyContinue

# uv (Python package manager)
where.exe uv 2>$null
uv --version 2>$null

# QMD
where.exe qmd 2>$null
npm list -g qmd 2>$null
pip list 2>$null | Select-String "qmd"
Get-ChildItem "$env:USERPROFILE\.qmd" -ErrorAction SilentlyContinue

# ChromaDB
pip list 2>$null | Select-String "chroma"
pip3 list 2>$null | Select-String "chroma"
```

### 2c. Check for hook entries
```powershell
# Read the full settings.json for hook inspection
Get-Content "C:\foodCo\foodVibe1.0\.claude\settings.json"

# Check global settings too
Get-Content "$env:USERPROFILE\.claude\settings.json" 2>$null
```

### 2d. Check for data artifacts
```powershell
# claude-mem data directory
Get-ChildItem "$env:USERPROFILE\.claude-mem" -Recurse -ErrorAction SilentlyContinue | Select-Object FullName

# Plugin directories
Get-ChildItem "$env:USERPROFILE\.claude\plugins" -ErrorAction SilentlyContinue
Get-ChildItem "$env:USERPROFILE\.claude\marketplace" -ErrorAction SilentlyContinue

# Any running processes
Get-Process | Where-Object { $_.ProcessName -match "bun|claude-mem|chroma" }
```

### 2e. Check for other tools that depend on Bun/uv
```powershell
# Before removing Bun, check if anything else uses it
Get-ChildItem C:\ -Recurse -Filter "bun.lockb" -Depth 4 -ErrorAction SilentlyContinue
Get-ChildItem C:\ -Recurse -Filter "bunfig.toml" -Depth 4 -ErrorAction SilentlyContinue

# Before removing uv, check for uv.lock files
Get-ChildItem C:\ -Recurse -Filter "uv.lock" -Depth 4 -ErrorAction SilentlyContinue
```

## Phase 3: Produce the Implementation Plan

Based on your research AND your audit findings, write a plan with these sections:

### Section A: Removal Checklist
For each item found in the audit:
- Exact command to remove it (PowerShell syntax for Windows)
- What it is and why it's being removed
- Any dependency check needed before removal
- Order matters — remove dependent items first

Must cover:
- claude-mem binary/package (npm global, plugin, marketplace)
- claude-mem hooks in `.claude/settings.json` (both project and global)
- claude-mem MCP server entries in `.mcp.json` / `.claude/mcp.json`
- claude-mem data directory (`~/.claude-mem/`)
- Bun runtime (IF not used by other projects — CHECK FIRST)
- uv Python package manager (IF not used — CHECK FIRST)  
- QMD (if installed)
- ChromaDB Python package (if installed globally — note: MemPalace needs ChromaDB too, so only remove if it's a conflicting version)
- Any running worker processes on port 37777
- Any enabled-plugins.json entries
- The research brief at `notes/claude-mem-integration-brief.md`

### Section B: MemPalace Installation
Exact step-by-step commands (PowerShell/Windows):
- Python verification/installation
- `pip install mempalace`
- `mempalace init` with correct paths
- `mempalace mine` commands for: codebase, session handoffs, plan files
- MCP server registration in `.claude/mcp.json`
- MCP permission entries for `.claude/settings.json`
- Verification commands

### Section C: Palace Configuration
- Wing/Room structure for FoodVibe domain
- Knowledge graph seed entities (recipes, products, equipment, venues, auth, CSS layers)
- Auto-save hook setup (if any hooks needed beyond built-in 15-msg auto-save)
- AAAK settings (recommend raw mode based on research findings)

### Section D: Skill File Modifications
Exact edits (with before/after) for these 3 files only:
1. `.claude/copilot-instructions.md` — add memory search trigger to §0, update §0.1 priority hierarchy, add §0.2 token budget note
2. `.claude/skills/session-handoff/SKILL.md` — add Phase 1.5 memory enrichment
3. `.claude/commands/plan-implementation.md` — add Phase 0 historical recall

**Include the exact text to insert and where to insert it (after which line/section).**

All skills use "if MemPalace available, use it; if not, skip silently" pattern — never hard-depend on it.

### Section E: Verification Checklist
Step-by-step verification:
- [ ] All claude-mem artifacts removed (list each)
- [ ] No process on port 37777
- [ ] MemPalace CLI responds
- [ ] Palace initialized with data
- [ ] MCP server auto-discovered by Claude Code (19 tools)
- [ ] mempalace_search returns results
- [ ] mempalace_kg_query works
- [ ] Session handoff writes diary entry
- [ ] New session discovers previous session's memories

### Section F: Rollback Plan
If MemPalace doesn't work out:
- How to uninstall MemPalace
- How to revert the 3 skill file changes (git checkout)
- Existing infrastructure (breadcrumbs, handoffs, reflect) continues working regardless

## Important Rules

1. **Do NOT modify** any existing skill or agent beyond the 3 files listed in Section D
2. **Do NOT touch** breadcrumbs, reflect, git-agent, cssLayer, angularComponentStructure, or any standards files
3. **ASK the user before deleting** Bun or uv — they might need them for other projects
4. **Windows paths** — use backslashes and PowerShell syntax throughout
5. **No background worker** — MemPalace does NOT need one. If your research says otherwise, flag it
6. **ChromaDB overlap** — claude-mem used Chroma, MemPalace uses Chroma. Don't remove ChromaDB if MemPalace needs it. Check version compatibility
7. **Present the plan for approval BEFORE executing anything** — this follows the FoodVibe Gatekeeper Protocol (Phase 2 hard pause)
