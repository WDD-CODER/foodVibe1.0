---
description: First-time setup — scan project, fill placeholders, generate missing files, promote toolkit to root
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Command: /init-repo

Onboard the claude-workflow-toolkit into a new project. Runs a 5-phase flow: scan the codebase → report discovered values → fill all placeholders → optionally generate project-specific files → optionally promote toolkit to project root.

---

## Entry Point: Apply Mode

**Before anything else:** check whether the user invoked this as `/init-repo apply` or if the word "apply" appears as the sole input.

If yes → skip to **Phase 3 — FILL (mode C apply)**. Read `claude-workflow-toolkit/toolkit.config.md`, parse all `KEY = value` lines, build the values map, and proceed directly to filling. Do not re-run Phase 1 or Phase 2.

If no → proceed to Phase 1.

---

## Phase 1 — SCAN (silent, no output yet)

Scan the codebase to discover values for every placeholder. Record each finding with its source. Do not output anything during this phase.

Determine the project root: run `pwd` (Unix) or `cd` (Windows). Store as `PROJECT_ROOT`.

### 1.1 — Project Identity

Run these Bash commands, read their output:

```bash
cat package.json 2>/dev/null || echo "NOT_FOUND"
```
```bash
cat README.md 2>/dev/null | head -10 || echo "NOT_FOUND"
```
```bash
cat .git/config 2>/dev/null || echo "NOT_FOUND"
```

Extract:
- `PROJECT_NAME` → `package.json` `.name` field. If missing, use the last segment of the remote origin URL from `.git/config`. If still missing, use the directory name.
- Source for PROJECT_NAME: note which file it came from.

### 1.2 — CLAUDE_DATA_DIR Detection

Run in sequence — stop at first that succeeds:

```bash
echo "${CLAUDE_CONFIG_DIR:-NOT_SET}"
```
```bash
echo "${APPDATA:-NOT_SET}"
```
```bash
echo "$HOME"
```

Logic:
- If `$CLAUDE_CONFIG_DIR` is set → use it as CLAUDE_DATA_DIR
- Else if on Windows (`$APPDATA` is set) → CLAUDE_DATA_DIR = `$APPDATA/Claude` (note: Claude Code actually uses `~/.claude` on all platforms; default to `~/.claude` unless `$CLAUDE_CONFIG_DIR` is explicitly set)
- Else → CLAUDE_DATA_DIR = `$HOME/.claude`
- Status: `~` (guessed)

### 1.3 — Framework Detection

Check in this exact order — stop at first match:

```bash
test -f angular.json && echo "FOUND" || echo "NOT_FOUND"
```
```bash
ls next.config.* 2>/dev/null | head -1 || echo "NOT_FOUND"
```
```bash
ls vite.config.* 2>/dev/null | head -1 || echo "NOT_FOUND"
```
```bash
ls nuxt.config.* 2>/dev/null | head -1 || echo "NOT_FOUND"
```
```bash
test -f cargo.toml && echo "FOUND" || echo "NOT_FOUND"
```
```bash
test -f go.mod && echo "FOUND" || echo "NOT_FOUND"
```
```bash
ls requirements.txt pyproject.toml 2>/dev/null | head -1 || echo "NOT_FOUND"
```

For the matched framework:
- **Angular** (`angular.json` found):
  - Read `angular.json` → extract `projects.<name>.architect.build.options.outputPath` → BUILD_OUTPUT
  - Extract `projects.<name>.architect.serve.options.port` → DEV_PORT (default 4200 if not set)
  - FRAMEWORK = `Angular`, check `package.json` for `@angular/core` version → FRAMEWORK_VERSION
- **Next.js** (`next.config.*` found):
  - BUILD_OUTPUT = `.next/`
  - DEV_PORT = 3000 (default)
  - Check `package.json` `next` version → FRAMEWORK_VERSION
  - FRAMEWORK = `Next.js`
- **Vite** (`vite.config.*` found):
  - Read vite config → extract `build.outDir` → BUILD_OUTPUT (default `dist/`)
  - Extract `server.port` → DEV_PORT (default 5173)
  - Check `package.json` dependencies for `react`/`vue`/`svelte` to determine sub-framework
  - FRAMEWORK = `React` / `Vue 3` / `Svelte` accordingly + Vite
  - FRAMEWORK_VERSION from package.json
- **Nuxt** → FRAMEWORK = `Nuxt`, BUILD_OUTPUT = `.nuxt/`, DEV_PORT = 3000
- **Rust** → FRAMEWORK = `Rust`, BUILD_COMMAND = `cargo build`, TEST_COMMAND = `cargo test`, BUILD_OUTPUT = `target/`
- **Go** → FRAMEWORK = `Go`, BUILD_COMMAND = `go build ./...`, TEST_COMMAND = `go test ./...`, BUILD_OUTPUT = `bin/`
- **Python** → FRAMEWORK = `Python`, check for `pytest` → TEST_COMMAND = `pytest`, BUILD_COMMAND = `python -m build`
- **Fallback**: read `package.json` `.dependencies` and `.devDependencies` for `react`, `vue`, `svelte` → set FRAMEWORK accordingly

### 1.4 — Source Structure

```bash
ls -d src/ app/ lib/ 2>/dev/null | head -1
```

Use the first existing directory as SRC_ROOT.

Then scan for structural seams:

```bash
ls -d src/core/ src/shared/ src/pages/ src/components/ src/features/ src/modules/ src/services/ 2>/dev/null
```
(Adjust prefix to match whatever SRC_ROOT was found.)

Record all found paths as PROJECT_SEAMS (comma-separated relative paths).

### 1.5 — Auth/Security Files

```bash
find . -path ./node_modules -prune -o -name "*auth*" -print -o -name "*crypto*" -print -o -name "*guard*" -print -o -name "*interceptor*" -print 2>/dev/null | head -10
```

Record the first meaningful result (not a node_modules path, not a test file) as AUTH_FILE.

### 1.6 — Build & Test

From `package.json` scripts (already read in 1.1):
- `BUILD_COMMAND` → `scripts.build` → prefix with package manager (`npm run build` / `yarn build` / `pnpm build`)
- `TEST_COMMAND` → `scripts.test` → prefix with package manager

Detect test framework from devDependencies:
- `jest` → TEST_FRAMEWORK = `Jest`
- `jasmine` + `karma` → TEST_FRAMEWORK = `Jasmine/Karma`
- `vitest` → TEST_FRAMEWORK = `Vitest`
- `pytest` → TEST_FRAMEWORK = `pytest`
- `rspec` → TEST_FRAMEWORK = `RSpec`
- None found → TEST_FRAMEWORK = `?`

Detect package manager:
```bash
test -f yarn.lock && echo "yarn" || test -f pnpm-lock.yaml && echo "pnpm" || echo "npm"
```

### 1.7 — Backend Stack

Check dependencies from `package.json` and file tree:

```bash
ls prisma/ 2>/dev/null && echo "prisma"
grep -l "mongoose\|sequelize\|typeorm" package.json 2>/dev/null
grep -l "express\|fastify\|koa" package.json 2>/dev/null
ls requirements.txt 2>/dev/null && grep -E "fastapi|django|flask" requirements.txt 2>/dev/null
```

Compose BACKEND_STACK from what's found. Examples:
- `express` + `mongoose` → `Node.js / Express / MongoDB`
- `express` + `prisma` → `Node.js / Express / Prisma`
- `fastapi` → `Python / FastAPI`
- Nothing found → `?`

### 1.8 — Deployment Config

```bash
ls .github/workflows/ 2>/dev/null
cat vercel.json 2>/dev/null | head -5 || echo "NOT_FOUND"
cat netlify.toml 2>/dev/null | head -5 || echo "NOT_FOUND"
cat fly.toml 2>/dev/null | head -5 || echo "NOT_FOUND"
```

If `.github/workflows/` exists, read each workflow file and scan for `--base-href` or `base_href` → extract as BASE_HREF.
If no deployment config found → BASE_HREF = `~/[project-name]/~` (guessed).

### 1.9 — Settings Files Scan

Read both settings files:

```bash
cat claude-workflow-toolkit/.claude/settings.json 2>/dev/null || echo "NOT_FOUND"
cat claude-workflow-toolkit/.claude/settings.local.json 2>/dev/null || echo "NOT_FOUND"
```

Scan each file for absolute path patterns:
- Windows: `C:/`, `C:\`, `D:/`, any `[A-Z]:/` pattern
- Unix: `/Users/`, `/home/`, `/root/`

Count how many lines contain such patterns. Store the count as `SETTINGS_PATH_COUNT`.

### 1.10 — Persona (guessed)

- PERSONA_PREFIX = `Ready!` (neutral default — status `~`)
- PERSONA_PREFIX_NEG = `Not ready.` (neutral default — status `~`)
- PERSONA_ROLE = `Senior [FRAMEWORK] Developer` (compose from detected framework — status `~`)
- WORKTREE_PORT = DEV_PORT + 1 (status `~`)

### 1.11 — Unknown Values

Mark these as `?` (cannot be auto-detected):
- DOMAIN_SERVICE_NAME — requires knowledge of project domain
- DB_ENTITY_TYPE — requires knowledge of database schema
- USER_PERSONA — requires knowledge of who uses the app

---

## Phase 2 — DISCOVERY REPORT

Output the discovery report now. Use this exact format:

```
╔══════════════════════════════════════════════════════╗
║           /init-repo — Discovery Report              ║
╚══════════════════════════════════════════════════════╝
Project scanned: <PROJECT_ROOT>

┌─────────────────────┬──────────────────────────────────┬────────┬──────────────────────┐
│ Placeholder         │ Discovered Value                 │ Status │ Source               │
├─────────────────────┼──────────────────────────────────┼────────┼──────────────────────┤
│ PROJECT_NAME        │ <value>                          │ <s>    │ <source>             │
│ PROJECT_ROOT        │ <value>                          │ ✓      │ pwd                  │
│ CLAUDE_DATA_DIR     │ <value>                          │ ~      │ guessed from $HOME   │
│ FRAMEWORK           │ <value>                          │ <s>    │ <source>             │
│ FRAMEWORK_VERSION   │ <value>                          │ <s>    │ <source>             │
│ SRC_ROOT            │ <value>                          │ <s>    │ directory scan       │
│ BUILD_OUTPUT        │ <value>                          │ <s>    │ <source>             │
│ BUILD_COMMAND       │ <value>                          │ <s>    │ package.json         │
│ TEST_COMMAND        │ <value>                          │ <s>    │ package.json         │
│ TEST_FRAMEWORK      │ <value>                          │ <s>    │ package.json         │
│ DEV_PORT            │ <value>                          │ <s>    │ <source>             │
│ WORKTREE_PORT       │ <value>                          │ ~      │ guessed (DEV_PORT+1) │
│ PROJECT_SEAMS       │ <value>                          │ <s>    │ directory scan       │
│ AUTH_FILE           │ <value>                          │ <s>    │ file search          │
│ BACKEND_STACK       │ <value>                          │ <s>    │ <source>             │
│ BASE_HREF           │ <value>                          │ <s>    │ <source>             │
│ PERSONA_PREFIX      │ Ready!                           │ ~      │ guessed              │
│ PERSONA_PREFIX_NEG  │ Not ready.                       │ ~      │ guessed              │
│ PERSONA_ROLE        │ <value>                          │ ~      │ guessed              │
│ DOMAIN_SERVICE_NAME │ ?                                │ ?      │ not detected         │
│ DB_ENTITY_TYPE      │ ?                                │ ?      │ not detected         │
│ USER_PERSONA        │ ?                                │ ?      │ not detected         │
└─────────────────────┴──────────────────────────────────┴────────┴──────────────────────┘

Legend: ✓ confirmed  ~ guessed (review recommended)  ? unknown (placeholder left as-is)

Settings files: <SETTINGS_PATH_COUNT> absolute path(s) found that will be replaced.

How would you like to proceed?
  A — Auto-fill everything now (guesses applied, review SETUP-LOG.md after)
  B — Walk me through each value one by one before filling
  C — Write toolkit.config.md now, I'll edit it manually, then run /init-repo apply
```

**Wait for user input.** Do not proceed until user responds with A, B, or C.

---

## Phase 3 — FILL

### If mode A (auto-fill):

1. Build the values map from Phase 1 results.
2. For `?` unknowns: leave the `[PLACEHOLDER]` string unchanged in all files.
3. For `~` guesses: apply the guessed value.
4. For every file in `claude-workflow-toolkit/` (recursively):
   - Read the file
   - Replace each `[PLACEHOLDER_NAME]` string with its mapped value
   - Write back using Edit tool
   - Skip binary files and `.git/`
5. Run settings path replacement (see below).
6. Write `claude-workflow-toolkit/SETUP-LOG.md` (see SETUP-LOG spec below).
7. Output: `✓ All placeholders filled. Review SETUP-LOG.md for guessed values.`

### If mode B (walk through):

For each placeholder in the table order, one at a time:
```
[PLACEHOLDER_NAME]
  Current value: "<discovered value>"
  Status: <✓ confirmed / ~ guessed / ? unknown>
  Source: <source>

Accept this value? Or type a new one:
```
Wait for user response before moving to the next placeholder. Accept "y" / "yes" / blank Enter as acceptance. Any other input replaces the value.

After all confirmed: fill all files and write SETUP-LOG.md same as mode A.

### If mode C (config file):

Write `claude-workflow-toolkit/toolkit.config.md` with this exact structure:

```markdown
# Toolkit Configuration

Edit the values below, then run `/init-repo apply` to fill all placeholders.

## Values

PROJECT_NAME        = <discovered value or ?>
PROJECT_ROOT        = <discovered value>
CLAUDE_DATA_DIR     = <discovered value>
FRAMEWORK           = <discovered value or ?>
FRAMEWORK_VERSION   = <discovered value or ?>
SRC_ROOT            = <discovered value or ?>
BUILD_OUTPUT        = <discovered value or ?>
BUILD_COMMAND       = <discovered value or ?>
TEST_COMMAND        = <discovered value or ?>
TEST_FRAMEWORK      = <discovered value or ?>
DEV_PORT            = <discovered value or ?>
WORKTREE_PORT       = <discovered value or ?>
PROJECT_SEAMS       = <discovered value or ?>
AUTH_FILE           = <discovered value or ?>
BACKEND_STACK       = <discovered value or ?>
BASE_HREF           = <discovered value or ?>
PERSONA_PREFIX      = Ready!
PERSONA_PREFIX_NEG  = Not ready.
PERSONA_ROLE        = <discovered value or ?>
DOMAIN_SERVICE_NAME = ?
DB_ENTITY_TYPE      = ?
USER_PERSONA        = ?
```

Output: `toolkit.config.md written. Edit it, then run /init-repo apply to fill.`

**Stop here. Do not fill yet.**

---

### Settings Files — Always (regardless of mode, skip mode C until apply)

After placeholder fill, process both settings files:

For each of `claude-workflow-toolkit/.claude/settings.json` and `claude-workflow-toolkit/.claude/settings.local.json`:

1. Read the file
2. Find all strings matching: `[A-Z]:/` (Windows absolute) or `/Users/` or `/home/` or `/root/`
3. Replace each occurrence:
   - Paths that are the project root or subpaths → replace prefix with resolved `PROJECT_ROOT` value
   - Paths that are the Claude data dir or subpaths → replace prefix with resolved `CLAUDE_DATA_DIR` value
   - Paths that match neither → flag in SETUP-LOG.md under `⚠ Manual Review Required`
4. Write the file back
5. Re-read and verify: grep again for absolute path patterns. If any remain, add them to SETUP-LOG.md `⚠ Manual Review Required`.

If SETTINGS_PATH_COUNT was 0, skip this step and note "No absolute paths found in settings files" in SETUP-LOG.md.

---

### SETUP-LOG.md spec

Write to `claude-workflow-toolkit/SETUP-LOG.md`:

```markdown
# Toolkit Setup Log

Generated: <ISO date>
Mode: <A / B / C-apply>

---

## Applied Values

| Placeholder | Value Applied | Confidence |
|---|---|---|
| PROJECT_NAME | <value> | <✓ / ~ / manual> |
| PROJECT_ROOT | <value> | ✓ |
...all filled values...

---

## Guessed Values (review recommended)

List each `~` value:
- **CLAUDE_DATA_DIR** = `<value>` — guessed from $HOME environment variable. Verify this is where Claude Code stores your data.
- **WORKTREE_PORT** = `<value>` — DEV_PORT + 1. Change if that port is occupied.
- **PERSONA_PREFIX** = `Ready!` — neutral default. Replace with your preferred acknowledgment phrase.
- **PERSONA_PREFIX_NEG** = `Not ready.` — neutral default. Replace with matching negative phrase.
- **PERSONA_ROLE** = `<value>` — composed from detected framework. Adjust to match your actual role.
...etc for any other ~ values...

---

## Unknown Values (placeholders left as-is)

These values require manual replacement:

- **DOMAIN_SERVICE_NAME** — Your key domain service class names (e.g. `CartService`, `UserProfileService`). Search your `src/` for service files.
- **DB_ENTITY_TYPE** — The discriminator field used in your database entity documents (e.g. `entityType`, `type`, `kind`).
- **USER_PERSONA** — Who uses this app in user stories (e.g. `a developer`, `a customer`, `a restaurant manager`).

---

## Settings Files

- settings.json: <N> paths replaced ✓
- settings.local.json: <N> paths replaced ✓

### ⚠ Manual Review Required
<list any unresolved absolute paths here, or "None" if all resolved>

---

## Next Steps

1. Review all guessed values (~ rows) above and correct any that don't match your project
2. Fill the unknown values (DOMAIN_SERVICE_NAME, DB_ENTITY_TYPE, USER_PERSONA) manually in all toolkit files
3. Verify settings files contain no remaining absolute paths
4. Run Phase 4 offer: generate missing project-specific files (standards-domain.md, standards-FRAMEWORK.md, domain skill)
5. Run Phase 5 offer: promote toolkit files to project root so Claude Code picks them up
```

---

## Phase 4 — END OFFER (generate missing files)

After Phase 3 completes (or after `toolkit.config.md` is written in mode C), ask:

```
Would you like me to generate the missing project-specific files?
These are files the toolkit needs but can only be written with your project's actual content:

  standards-domain.md      — your domain constants, entity types, i18n keys
  standards-FRAMEWORK.md   — [FRAMEWORK]-specific coding rules (replacing the Angular template)
  A domain skill stub       — a SKILL.md template for your first domain-specific feature

Options:
  all    — generate all three
  pick   — tell me which ones
  skip   — I'll handle these manually
```

**Wait for user response.**

If `all` or `pick`:

**For `standards-FRAMEWORK.md`:**
1. Scan `src/` (or SRC_ROOT) for component file patterns, naming conventions, file structure
2. Read 3–5 representative source files to infer conventions
3. Generate `claude-workflow-toolkit/.claude/standards-FRAMEWORK.md` — a populated standards file using the real framework name and inferred conventions from the codebase
4. Mark any sections that couldn't be inferred with `[PROJECT_SPECIFIC — fill in manually]`

**For `standards-domain.md`:**
1. Scan `src/` for: entity names, service class names, constants files, enum files, i18n key files
2. Read those files
3. Generate `claude-workflow-toolkit/.claude/standards-domain.md` — populate all discovered domain constants, entity types, service names
4. Mark unknowns with `[PROJECT_SPECIFIC]`

**For domain skill stub:**
Ask: `What's the first domain feature you'll build? (e.g. "add-product", "create-order", "user-profile")`

Wait for response. Then generate `claude-workflow-toolkit/.claude/skills/<feature-name>/SKILL.md` — a phase-structured SKILL.md stub:
- Phase structure: Extract → Validate → Confirm (hard pause) → Write
- Placeholder domain logic replaced with the feature name
- Hard pause gate before writes (following the `domain-feature/SKILL.md.EXAMPLE` pattern)

---

## Phase 5 — PROMOTE OFFER

After Phase 4 (or if skipped), ask:

```
Toolkit is ready. Where should the files live?

  move   — Move CLAUDE.md, agent.md, .mcp.json, .claude/ to project root
           (recommended — this is how Claude Code expects them)
  keep   — Leave everything in claude-workflow-toolkit/ for now (move manually later)
```

**Wait for user response.**

**If `move`:**

Run these operations in sequence:

1. Check that `CLAUDE.md`, `agent.md`, `.mcp.json` do not already exist at project root — if they do, stop and warn: "Files already exist at project root. Aborting to avoid overwrite. Delete them first or use `keep`."
2. Check that `.claude/` does not already exist at project root — same warning if it does.
3. Execute moves (using `cp -r` then `rm -r` pattern, since `mv` may fail across some filesystems):

```bash
cp claude-workflow-toolkit/CLAUDE.md ./CLAUDE.md
cp claude-workflow-toolkit/agent.md ./agent.md
cp claude-workflow-toolkit/.mcp.json ./.mcp.json
cp -r claude-workflow-toolkit/.claude ./.claude
cp claude-workflow-toolkit/SETUP-LOG.md ./SETUP-LOG.md
rm claude-workflow-toolkit/CLAUDE.md
rm claude-workflow-toolkit/agent.md
rm claude-workflow-toolkit/.mcp.json
rm -r claude-workflow-toolkit/.claude
rm claude-workflow-toolkit/SETUP-LOG.md
```

4. If `claude-workflow-toolkit/` is now empty (only README.md and `toolkit.config.md` remain), output a note: "claude-workflow-toolkit/ now contains only README.md. You may delete it or keep it as documentation."
5. Output: `✓ Toolkit promoted to project root. Claude Code will pick up CLAUDE.md on next session start.`

**If `keep`:**
Output:
```
Files remain in claude-workflow-toolkit/. When ready, move these to your project root:
  CLAUDE.md
  agent.md
  .mcp.json
  .claude/
Claude Code will only pick up CLAUDE.md when it is at the project root.
```

---

## Output (on completion)

```
✓ /init-repo complete
- Plan saved: skipped — no architectural brief
- Tasks completed: [N]
- Files written/modified: [list]
- How to verify:
  1. Open any toolkit file and confirm [PLACEHOLDER] strings are replaced
  2. Check SETUP-LOG.md for guessed values and complete unknowns
  3. If promoted: restart Claude Code session — it will read the new CLAUDE.md
```

Then append:

✅ VALIDATION CHECKLIST
├── 📍 File Checks
│   ├── [ ] Open any TEMPLATE file in claude-workflow-toolkit/ and confirm no [PLACEHOLDER] strings remain (except any marked ? in SETUP-LOG.md)
│   ├── [ ] Read SETUP-LOG.md — confirm all guessed (~) values look correct for your project
│   └── [ ] Confirm SETUP-LOG.md "⚠ Manual Review Required" section is either empty or you've handled each item
│
├── 🔧 Settings Checks
│   ├── [ ] Open .claude/settings.json — confirm no absolute paths like C:/ or /Users/ remain
│   └── [ ] Open .claude/settings.local.json — confirm same
│
├── 🗄️ Unknown Values Check
│   ├── [ ] Search all toolkit files for [DOMAIN_SERVICE_NAME] — replace with your actual service names
│   ├── [ ] Search for [DB_ENTITY_TYPE] — replace with your entity discriminator field
│   └── [ ] Search for [USER_PERSONA] — replace with your user story persona
│
└── ⚠️ Edge Cases
    ├── [ ] If promoted (move): restart Claude Code and confirm it reads the new CLAUDE.md on session start
    ├── [ ] If Windows: verify all paths in settings files use forward slashes or are correctly escaped
    └── [ ] Run /validate-agent-refs after setup to confirm all cross-references in agent files are valid
