---
description: Initialize the Claude Workflow SDK in this project — scan codebase, fill placeholders, wire hooks, and produce SETUP-LOG.md
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Command: /init-repo

One-time setup wizard that installs the Claude Workflow SDK into the current project.

> **Run this once.** After setup, delete `claude-workflow-sdk/` or keep it as a reference — the files have been installed to the project root.

---

## Phase 0 — Bootstrap Check

Before anything else, verify the SDK files are present at the project root (not buried in a subfolder).

Check that these exist:
```bash
test -d .claude/commands && echo "commands/ present" || echo "MISSING"
test -d .claude/agents   && echo "agents/ present"   || echo "MISSING"
test -d .claude/skills   && echo "skills/ present"   || echo "MISSING"
```

**If all three are present** → SDK is installed. Proceed to Phase 1.

**If any are missing**, check whether a `claude-workflow-sdk/` subfolder exists:
```bash
test -d claude-workflow-sdk && echo "found subfolder"
```

If `claude-workflow-sdk/` exists:
```
SDK files were not installed correctly. The folder was copied but its CONTENTS were not
extracted to the project root.

To fix this, run (macOS/Linux):
  cp -r claude-workflow-sdk/. .

Or on Windows (PowerShell):
  Copy-Item -Path .\claude-workflow-sdk\* -Destination . -Recurse -Force

Then run /init-repo again.
```
**Stop. Do not proceed until the user re-runs the copy command and re-runs `/init-repo`.**

If neither condition is true (no `.claude/` AND no `claude-workflow-sdk/` subfolder):
```
Cannot find the SDK files. Make sure you copied the contents of claude-workflow-sdk/
into this project before running /init-repo. See README.md for instructions.
```
**Stop.**

---

## Phase 1 — Detect Existing Installation

Check whether any workflow files are already present:

```bash
test -f ./CLAUDE.md && echo "CLAUDE.md exists"
test -f ./agent.md && echo "agent.md exists"
test -d ./.claude && echo ".claude/ exists"
```

If any exist, prompt the user:

```
Existing workflow files detected:
  [list what was found]

How should I proceed?
a. Reinstall — overwrite everything (destructive)
b. Update — preserve customized files, only update SDK-managed files
c. Abort — exit without changes

Recommendation: b (safe default)
```

Wait for user answer. If **c** → stop. If **a** → proceed with overwrite. If **b** → proceed in update mode (skip files the user has customized — use git status to detect modifications).

If nothing exists → proceed directly to Phase 2.

---

## Phase 2 — Scan the Project

Run a structured scan. Collect every value needed to fill the 12 core placeholders. Record each value plus its confidence level (✓ confirmed / ~ guessed / ? unknown) and its source.

### 2.1 Project Identity

```bash
# Project name from package.json
cat package.json 2>/dev/null | grep '"name"' | head -1

# Or from git remote
git remote get-url origin 2>/dev/null

# Or from current directory name
basename $(pwd)
```

Derive `PROJECT_NAME` from the first available source.
Derive `PROJECT_ROOT` as the absolute path of the current working directory.

### 2.2 Claude Data Directory

Determine `CLAUDE_DATA_DIR`:
- Check `$CLAUDE_CONFIG_DIR` environment variable first
- If not set: use `~/.claude` on macOS/Linux, `%APPDATA%\Claude` on Windows (detect OS via `uname -s` or `$env:OS`)

### 2.3 Temp Directory

Determine `TEMP_DIR`:
- macOS/Linux: `/tmp`
- Windows: value of `%TEMP%` env var, fallback `C:/Users/<user>/AppData/Local/Temp`

### 2.4 Framework Detection

Check in this order — stop at first match:

| Check | Framework | How |
|-------|-----------|-----|
| `angular.json` exists | Angular | Read `projects.<name>.architect.build.options.outputPath` for BUILD_OUTPUT |
| `next.config.*` exists | Next.js | BUILD_OUTPUT is `.next` |
| `vite.config.*` exists | Vite (inspect deps) | Check package.json for react/vue/svelte |
| `nuxt.config.*` exists | Nuxt | BUILD_OUTPUT is `.output` |
| `cargo.toml` exists | Rust | BUILD_COMMAND is `cargo build` |
| `go.mod` exists | Go | BUILD_COMMAND is `go build` |
| `pyproject.toml` or `requirements.txt` | Python | |
| Fallback | Inspect `package.json` `dependencies` | |

From `package.json` extract:
- `FRAMEWORK_VERSION` from the framework's version in dependencies
- `BUILD_COMMAND` from `scripts.build`
- `TEST_COMMAND` from `scripts.test`

### 2.5 Dev Server Port

Check in order:
1. Angular: `angular.json` → `projects.<name>.architect.serve.options.port`
2. Next.js default: 3000
3. Vite default: 5173
4. Angular default: 4200
5. Unknown: ask user

Set `WORKTREE_PORT` = `DEV_PORT + 1`.

### 2.6 Source Structure

```bash
# Find primary source directory
ls -d src/ app/ lib/ 2>/dev/null | head -1

# Find seams under src/
ls src/app/ 2>/dev/null || ls src/ 2>/dev/null
```

Record `SRC_ROOT` and `PROJECT_SEAMS` (key subdirectories: core/, shared/, pages/, components/, features/, modules/).

### 2.7 Auth Files

```bash
# Search for auth-related files
find . -type f \( -name "*auth*" -o -name "*guard*" -o -name "*interceptor*" -o -name "*crypto*" \) \
  -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -10
```

Record first meaningful auth file as `AUTH_FILE`.

### 2.8 Backend Stack

Check for:
- `mongoose` / `mongodb` in package.json → "Node.js + Express + MongoDB"
- `prisma` → "Node.js + Prisma"
- `sequelize` / `typeorm` → add to stack description
- `express` → add Express
- `fastapi` / `django` / `flask` in requirements.txt → Python backend
- No server files found → "frontend-only"

Record as `BACKEND_STACK`.

### 2.9 Build Output

If not already determined by framework detection:
```bash
# Check package.json build script for output flag
cat package.json 2>/dev/null | grep '"build"'
```

Record as `BUILD_OUTPUT`.

### 2.10 Deployment

Check for:
```bash
ls .github/workflows/*.yml 2>/dev/null
test -f vercel.json && echo "Vercel"
test -f netlify.toml && echo "Netlify"
test -f fly.toml && echo "Fly.io"
```

---

## Phase 3 — Present Discovery Report

Output a formatted table:

```
═══════════════════════════════════════════════════════════════
  INIT-REPO DISCOVERY REPORT
═══════════════════════════════════════════════════════════════
  Placeholder         │ Value                  │ Conf │ Source
  ─────────────────────────────────────────────────────────────
  PROJECT_NAME        │ my-app                 │ ✓    │ package.json
  PROJECT_ROOT        │ /home/user/my-app      │ ✓    │ pwd
  CLAUDE_DATA_DIR     │ /home/user/.claude     │ ✓    │ env default
  FRAMEWORK           │ angular                │ ✓    │ angular.json
  FRAMEWORK_VERSION   │ 19.2.0                 │ ✓    │ package.json
  BUILD_COMMAND       │ ng build               │ ✓    │ package.json scripts
  TEST_COMMAND        │ ng test                │ ✓    │ package.json scripts
  DEV_PORT            │ 4200                   │ ✓    │ angular.json
  WORKTREE_PORT       │ 4201                   │ ~    │ DEV_PORT + 1
  SRC_ROOT            │ src/                   │ ✓    │ directory scan
  BUILD_OUTPUT        │ dist/my-app            │ ✓    │ angular.json
  AUTH_FILE           │ src/app/core/auth.ts   │ ~    │ file scan
  BACKEND_STACK       │ Node.js + Express      │ ~    │ package.json deps
═══════════════════════════════════════════════════════════════
  ✓ confirmed (12)  │  ~ guessed (2)  │  ? unknown (0)
═══════════════════════════════════════════════════════════════
```

Then ask the user to choose a fill mode:

```
How should I fill placeholders?

a. Auto-fill now — replace all placeholders automatically (unknown values stay as [PLACEHOLDER])
b. Walk through each — review and confirm each value one by one
c. Write config file first — generate toolkit.config.md, fill it, then apply

Recommendation: a (fastest for first install)
```

Wait for user answer.

---

## Phase 4 — Fill Placeholders

### Mode A — Auto-fill

Replace every `[PLACEHOLDER]` in all SDK files using the discovered values.

**Replacement map:**

| Placeholder | Value to insert |
|-------------|----------------|
| `[PROJECT_NAME]` | discovered PROJECT_NAME |
| `[PROJECT_ROOT]` | discovered PROJECT_ROOT |
| `[CLAUDE_DATA_DIR]` | discovered CLAUDE_DATA_DIR |
| `[TEMP_DIR]` | discovered TEMP_DIR |
| `[FRAMEWORK]` | discovered FRAMEWORK |
| `[FRAMEWORK_VERSION]` | discovered FRAMEWORK_VERSION |
| `[BUILD_COMMAND]` | discovered BUILD_COMMAND |
| `[TEST_COMMAND]` | discovered TEST_COMMAND |
| `[DEV_PORT]` | discovered DEV_PORT |
| `[WORKTREE_PORT]` | discovered WORKTREE_PORT |
| `[SRC_ROOT]` | discovered SRC_ROOT |
| `[BUILD_OUTPUT]` | discovered BUILD_OUTPUT |
| `[AUTH_FILE]` | discovered AUTH_FILE (or leave as placeholder if not found) |
| `[BACKEND_STACK]` | discovered BACKEND_STACK |

**Files to update** (apply all replacements to each):
- `CLAUDE.md`
- `agent.md`
- `.claude/copilot-instructions.md`
- `.claude/copilot-routing.md`
- `.claude/settings.json`
- `.claude/settings.local.json`
- `.mcp.json`
- `.claude/commands/ship.md`
- `.claude/commands/execute-it.md`
- `.claude/agents/end-of-session-agent.md`
- `.claude/agents/git-agent.md`
- `.claude/agents/mobile-flow-auditor.md`
- `.claude/agents/render-flow-auditor.md`
- `.claude/agents/qa-engineer.md`
- `.claude/agents/team-leader.md`
- `.claude/agents/software-architect.md`
- `.claude/skills/cssLayer/SKILL.md`
- `.claude/skills/worktree-setup/SKILL.md`
- `.claude/skills/preflight/SKILL.md`
- `.claude/skills/nightly-audit/SKILL.md`
- `.claude/workflows/deploy.yml`
- `scripts/branch-guard.sh`

**Rename standards file:**
```bash
mv .claude/standards-FRAMEWORK.md ".claude/standards-${FRAMEWORK}.md"
```

### Mode B — Walk through each

For each placeholder value in the discovery report:
1. Show: `[PLACEHOLDER_NAME]: [current value] (from [source])`
2. Ask: `Accept (press Enter) or enter a new value:`
3. Record the user's answer
4. After all placeholders confirmed → apply Mode A with confirmed values

### Mode C — Config file first

Generate `.claude/toolkit.config.md` with all placeholder values listed. Tell the user:
```
Fill in any ? values in .claude/toolkit.config.md, then say "apply config" to continue.
```
Wait. On "apply config", read the file and proceed with Mode A using the confirmed values.

---

## Phase 5 — Optional Follow-ups

After fill is complete, offer the following setup options:

```
Setup complete. Optional follow-up steps available:

a. Install example skills — activate .EXAMPLE skills as project skills
b. Set up MemPalace — enable semantic memory for this project
c. Wire GitHub Actions — copy deploy workflow to .github/workflows/
d. Done — skip all follow-ups
```

Ask as a multi-select. Wait for user answer.

### Phase 5a — Install example skills

Ask which `.EXAMPLE` skills to activate:
- `angularComponentStructure.EXAMPLE` → Angular component structure rules
- `angular-pipe-logic.EXAMPLE` → Angular pipe and directive rules
- `auth-and-logging.EXAMPLE` → Auth guard and logging patterns
- `auth-crypto.EXAMPLE` → Crypto module patterns
- `deploy-github-pages.EXAMPLE` → GitHub Pages deployment
- `domain-feature.EXAMPLE` → Domain entity add flow (rename to match domain)

For each selected skill: copy the `.EXAMPLE` folder to the non-`.EXAMPLE` name, remove the `> **EXAMPLE SKILL**` notice block at the top, fill in any remaining placeholders in the copied skill.

### Phase 5b — Set up MemPalace

```
MemPalace setup:
1. Install: pip install mempalace
2. Enable in .mcp.json: rename "_mempalace_disabled" key to "mempalace"
3. Restart Claude Code — MemPalace tools will appear in the session
4. On next session, MemPalace auto-starts. Run /mp-search test to confirm.
```

### Phase 5c — Wire GitHub Actions

```bash
mkdir -p .github/workflows
cp .claude/workflows/deploy.yml .github/workflows/deploy.yml
```

Show the user the deploy.yml content and confirm `[BUILD_COMMAND]` and `[BUILD_OUTPUT]` are correct.

---

## Phase 6 — Write SETUP-LOG.md

Write `SETUP-LOG.md` at the project root:

```markdown
# Claude Workflow SDK — Setup Log
Date: YYYY-MM-DD
SDK Version: [from SDK-VERSION file]

## Placeholders Filled

| Placeholder | Value | Source | Confidence |
|-------------|-------|--------|------------|
[one row per placeholder filled]

## Files Modified
[list of files updated]

## Files Still Containing [PLACEHOLDER]
[list any files with unfilled placeholders + remediation note for each]

## Optional Steps Run
[which Phase 5 steps were executed]

## Next Steps
- Review this log and verify all values are correct
- Restart Claude Code to activate hooks
- For any remaining [PLACEHOLDER] items, see remediation notes above
- If MemPalace was not set up: run /init-repo again and choose Phase 5b
```

---

## Phase 7 — Final Report

```
══════════════════════════════════════════════
  INIT-REPO COMPLETE
══════════════════════════════════════════════
  Placeholders filled: N/M
  Files updated: X
  Remaining [PLACEHOLDER]: Y
  SETUP-LOG.md: written to project root
──────────────────────────────────────────────
  Next: restart Claude Code to activate hooks.
═══════════════════════════════════════════���══
```
