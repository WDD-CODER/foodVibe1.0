# Plan 542 — The local MongoDB MCP server starts from an installed package, with its last outside reach closed

Status: draft
Depends-on: 529
Snapshot: aa354184967783f01cb06782f8acdda9a65a239a

## Problem Statement
Plan 529's `mongodb-local` server (merged 2026-11-10, PR #541) failed on the Human's first try, and three gaps showed up
while fixing it:

1. **It downloads itself at every start.** `scripts/mcp-mongo-local.mjs` runs `npx -y mongodb-mcp-server@3.2.2`. The
   first start downloads 409 packages (~90 s); Claude Code stops waiting for an MCP server after ~30 s, kills it
   mid-install, and the half-written npx cache (`%LOCALAPPDATA%\npm-cache\_npx\<hash>`, missing
   `mongodb-redact/dist/.esm-wrapper.mjs`) is then reused by every Reconnect → `ERR_MODULE_NOT_FOUND`. Even with a good
   cache, `npx` takes 24.7 s to the first MCP reply; the same package started directly with `node` replies in 5.4 s
   (measured 2026-11-10). The Human now carries a user variable `MCP_TIMEOUT=120000` only to work around this.
2. **Tools that reach outside the local database are still on.** `MDB_MCP_DISABLED_TOOLS=atlas` leaves on:
   `connect` (takes any connection string — a way to an Atlas cluster that bypasses the launcher's local-only check),
   `disconnect`, `atlas-local-list-deployments` / `atlas-local-connect-deployment` (Docker "Atlas Local"), and
   `search-knowledge` / `list-knowledge-sources` (send the agent's queries to `knowledge.mongodb.com`). All 20 tools
   the Human's `/mcp` listed are marked read-only, so nothing can write; the gap is reach, not writes.
3. **The setup text sends the Human wrong.** The launcher's refusal message (and plan 529's setup step) says to set
   `FOODVIBE_MCP_MONGO_URI` to `mongodb://127.0.0.1:27017/<db>`. The local MongoDB requires a login, so that value
   fails; the right value is `MONGO_LOCAL_URI` from `server/.env`, login included. And a terminal opened before the
   variable was set (a new tab in an old terminal window, a terminal inside Cursor/VS Code) does not see it — the
   Human lost time on both.

Verified on `origin/main` aa354184: `package.json` (pnpm 10.34.6) has no `mongodb-mcp-server`; `scripts/package.json`
is kit-managed (only `picomatch`); the 3.2.2 package's `bin` is `dist/esm/index.js`; its README says
`MDB_MCP_DISABLED_TOOLS` takes tool names, operation types and categories, comma-separated.

## Goals & Success Criteria
**Primary:** in a fresh checkout after `pnpm install`, `mongodb-local` connects on the first try within Claude Code's
default MCP wait, offers only tools that read the local database, and its messages tell the Human the right value.

- [auto] `node --test scripts/test/mcp-mongo-local.test.mjs` → `# fail 0` (includes the new start test below).
- [auto] `pnpm run test:scripts` exits 0.
- [auto] `node scripts/kit-manifest-check.mjs` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/542-mongodb-local-mcp-starts-from-installed-package.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/542-mongodb-local-mcp-starts-from-installed-package.plan.md` exits 0.
- [auto] `pnpm run build` exits 0 (the root install with the new dev dependency still builds).
- [human] After `pnpm install` in the main folder, the Human removes `MCP_TIMEOUT` (setup step 2 below), starts Claude Code from a new terminal window, and `/mcp` shows `mongodb-local` connected within ~10 s; its tool list has no `connect`, `disconnect`, `atlas-local-*`, `search-knowledge` or `list-knowledge-sources`.

## Execution Mode
- Parallel: yes, after 529 (merged). No open plan shares these files (overlap search 2026-11-10).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/mcp-mongo-local.mjs
scripts/test/mcp-mongo-local.test.mjs
package.json
pnpm-lock.yaml
docs/brain/gotchas/agent-workflow.md
docs/workflow-kit/manifest.json
docs/workflow-kit/manifest.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — the scope reaches no `Touches` glob (a dev-tool launcher, the root dev dependencies and a
  gotcha). D114 (read-only, local-only DB server, never production) is kept and tightened: `connect` is the one tool
  that could reach a non-local database, and it is disabled.

## Reuse Check
- none — no new component, util, pipe, service or `.c-*` class; the existing launcher `scripts/mcp-mongo-local.mjs` changes.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef who also debugs the data, I want the database tool to connect on the first try so that I don't spend an evening on npm caches and timeouts.

## Functional Requirements

### Must Have (P0)
- [ ] `package.json` `devDependencies`: `"mongodb-mcp-server": "3.2.2"` (exact, no `^` — ADR 0028 pins the version; a bump is a plan). `pnpm install` updates `pnpm-lock.yaml`. If pnpm reports a dependency whose build script it skipped and the start test then fails, add that one package to `pnpm.onlyBuiltDependencies` and note it under Execution Notes; if the test passes, add nothing.
- [ ] `scripts/mcp-mongo-local.mjs` — start the installed package, never `npx`:
  - Resolve the entry with `createRequire(import.meta.url).resolve('mongodb-mcp-server/package.json')`, read its `bin['mongodb-mcp-server']`, and spawn `process.execPath` with that absolute file (`stdio: 'inherit'`, no `shell` — this also drops the `DEP0190` warning).
  - Not installed (resolve throws) → stderr `mcp-mongo-local: mongodb-mcp-server is not installed — run pnpm install in this folder` and exit 2. Never download.
  - `MDB_MCP_DISABLED_TOOLS` becomes `atlas,connect,disconnect,atlas-local-list-deployments,atlas-local-connect-deployment,search-knowledge,list-knowledge-sources` (tool names, per the 3.2.2 README; if 3.2.2 also has an `atlas-local-create-deployment` / `-delete-deployment` tool, those are already off in read-only mode — the start test proves the final list).
  - The refusal message for every reason becomes: `mcp-mongo-local: refused (<reason>) — set the user variable FOODVIBE_MCP_MONGO_URI to the value of MONGO_LOCAL_URI in server/.env (login included), then open a NEW terminal window`. Still never prints the URI.
  - The header comment states the same two facts (value = `MONGO_LOCAL_URI`, new terminal window).
- [ ] `scripts/test/mcp-mongo-local.test.mjs` — a source test: `scripts/mcp-mongo-local.mjs` does not contain the text `npx`. And one new start test (keep the existing cases): spawn the launcher with `process.execPath`, env `FOODVIBE_MCP_MONGO_URI=mongodb://127.0.0.1:1/none` (local, nothing listens there), write an MCP `initialize` request then `notifications/initialized` then `tools/list` to stdin; assert a JSON-RPC reply to `initialize` arrives within 15 s, and the `tools/list` names contain `find` and contain none of `connect`, `disconnect`, any name starting with `atlas`, `search-knowledge`, `list-knowledge-sources`, `insert-many`, `delete-many`, `update-many`, `drop-collection`. Kill the child at the end. If the server will not list tools without a reachable database, mark the test `{ skip: 'needs local MongoDB' }` only when `127.0.0.1:27017` refuses a TCP connection, point it at `FOODVIBE_MCP_MONGO_URI`'s host otherwise, and note the choice under Execution Notes.
- [ ] `docs/brain/gotchas/agent-workflow.md`: one entry — "A user environment variable (`FOODVIBE_MCP_MONGO_URI`, `MCP_TIMEOUT`) set with `[Environment]::SetEnvironmentVariable(..., 'User')` is seen only by processes started after it — a new tab in an already-open terminal app or a terminal inside Cursor/VS Code keeps the old values; open a new terminal window. An MCP server that downloads itself on start (`npx -y`) outlives Claude Code's ~30 s wait and leaves a broken npx cache; install it as a dependency instead (plan 542)."

### Should Have (P1)
- [ ] `docs/workflow-kit/manifest.json` / `manifest.md`: only if `kit-manifest-check` asks (e.g. a coupled string in `package.json`).

### Nice to Have (P2)
- [ ] none.

## Atomic Sub-tasks
- [ ] A1: Install the database tool with the project so it never downloads itself at start — exact 3.2.2 dev dependency; onlyBuiltDependencies only if the start test needs it — package.json, pnpm-lock.yaml
- [ ] A2: Start the installed tool directly and say clearly when it is missing — resolve the bin, spawn process.execPath without shell, not-installed message and exit 2 — scripts/mcp-mongo-local.mjs
- [ ] A3: Switch off the tools that can reach beyond the local database — connect, disconnect, atlas-local-*, knowledge tools in MDB_MCP_DISABLED_TOOLS — scripts/mcp-mongo-local.mjs
- [ ] A4: Tell the Human the right value and that only a new terminal window sees it — refusal message and header comment — scripts/mcp-mongo-local.mjs
- [ ] A5: Prove it starts fast, offers only local read tools, and never uses npx — source test plus initialize/tools-list start test — scripts/test/mcp-mongo-local.test.mjs
- [ ] A6: Record the two traps so the next setup does not repeat them — one gotcha entry — docs/brain/gotchas/agent-workflow.md
- [ ] A7: Run every auto check and paste the outputs, and list the three Human setup steps in the hand-off — this plan file (Execution Notes)

## UI/UX Notes
- No app UI. No dictionary keys.

## Technical Considerations
- Dependencies: `mongodb-mcp-server@3.2.2` as a root dev dependency (~409 packages; every `pnpm install` — CI, slots, orchestrator worktrees — installs it). Chosen over a separate folder with its own `npm ci` because slots and orchestrator worktrees already run `pnpm install` at the root, so the server works there with no extra step.
- New files needed: none.
- Model changes: none. Backend / API: none. Data / migration: none.
- Auth and validation: unchanged — the launcher still validates the one URI and refuses anything not local.
- Security surface: narrower — `connect` (could open any connection string) and the knowledge tools (send queries to `knowledge.mongodb.com`) are disabled; no download at start means no unreviewed code fetched per session.
- Project checks: no app or server code, so the log-query item is not needed; Reuse Check present; no dictionary keys.

## Out of Scope
- A version bump of `mongodb-mcp-server`. Editing ADR 0028 (its decision stands: pinned 3.2.2, read-only, local-only; this plan changes how the pinned package is started, not the decision). Plan 529's own file (closed as is). Cursor's `.cursor/mcp.json`. Render MCP.

## Human setup (after merge — never done by an agent)
1. In the main folder: `pnpm install`.
2. Remove the workaround: `[Environment]::SetEnvironmentVariable("MCP_TIMEOUT", $null, "User")`.
3. Open a NEW terminal window, start Claude Code in the main folder, run `/mcp`.

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-10: written from the Human's first use of plan 529 (this session): broken npx cache after a timed-out first start; 24.7 s (npx) vs 5.4 s (direct) to the first reply; 20 tools listed, `connect` and the knowledge tools among them; the `<db>` example lacked the login.
