# Plan 529 — A read-only MongoDB MCP server, local database only, for ad-hoc inspection

Status: draft
Depends-on: 528
Snapshot: aa120120a5005d07e35cd64bc3284f9e40daf446

## Problem Statement
Agents inspect the local database with throw-away scripts (a query file, run, deleted). In the MCP review of
2026-10-20 the Human approved a read-only MongoDB MCP server to replace them, connected only to the local database,
never to Atlas. Plan 528 empties `.mcp.json` first (both plans edit it). Render MCP stays deferred.

Verified 2026-11-07: `mongodb-mcp-server` is at 3.2.2 (`npm view`). Its options: `--readOnly` / `MDB_MCP_READ_ONLY`
(write tools are not registered), connection string `MDB_MCP_CONNECTION_STRING` (env preferred over args, which show in
process lists), Atlas tools exist only with `MDB_MCP_API_CLIENT_ID` / `_SECRET` and can be blocked with
`MDB_MCP_DISABLED_TOOLS=atlas`, telemetry off with `MDB_MCP_TELEMETRY=disabled`. It reads only `MDB_MCP_*` variables,
never `MONGO_URI`. Claude Code expands `${VAR}` / `${VAR:-default}` in `.mcp.json`; an unset variable loads as the
literal text with a warning.

## Goals & Success Criteria
**Primary:** in the main folder a Claude Code session can list collections and run find / aggregate / count on the
local database through MCP, cannot write, and cannot be pointed at Atlas.

- [auto] `node --test scripts/test/mcp-mongo-local.test.mjs` → `# fail 0`.
- [auto] `node scripts/kit-manifest-check.mjs` exits 0.
- [auto] `pnpm run lint` exits 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/529-read-only-local-mongodb-mcp-for-db-inspection.plan.md` → `ARCH: ok`; `node scripts/scope-check.mjs --reuse --plan=plans/529-read-only-local-mongodb-mcp-for-db-inspection.plan.md` exits 0.
- [human] After the two setup steps under "Human setup", a new session in the main folder runs `/mcp` and shows `mongodb-local` as connected; asking "list the collections in the local database" returns names such as `taxonomyTerms` and `menuEvents`.
- [human] Asking the session to insert or delete a document through `mongodb-local` fails: no write tool exists.

## Execution Mode
- Parallel: yes, after 528.
- Concurrent plans: none share its files (plan 530 changes `server/.env` handling, not this server's variable).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
scripts/mcp-mongo-local.mjs
scripts/test/mcp-mongo-local.test.mjs
.mcp.json
.claude/settings.json
AGENTS.md
docs/brain/decisions/0028-read-only-local-mongodb-mcp.md
docs/brain/index.md
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

- INV-none: preserves — the scope reaches no `Touches` glob; a dev-tool launcher and docs. The server reads its own variable `FOODVIBE_MCP_MONGO_URI` and never `MONGO_URI` / `MONGO_LOCAL_URI`, so plan 530 (the live URI moves to `server/.env.live`) does not affect it and it cannot pick up the Atlas URI from either file.

## Reuse Check
- `scripts/mcp-mongo-local.mjs` — family: none — rung: 4 — why: a launcher for an external dev tool; the registry covers app and server code. Nothing in `scripts/` starts an MCP server today.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef (and the person who debugs the data), I want the agent to look at the local data directly so that a question about "what is stored" costs one call, not a script written and thrown away.

## Functional Requirements

### Must Have (P0)
- [ ] `scripts/mcp-mongo-local.mjs` (Node built-ins only), exporting `checkLocalUri(uri)` and running only when executed directly (`import.meta.url` check):
  - Reads the URI only from `process.env.FOODVIBE_MCP_MONGO_URI`. Never reads a `.env` file, `MONGO_URI` or `MONGO_LOCAL_URI`.
  - `checkLocalUri(uri)` → `{ ok: true }` only when `new URL(uri)` parses, `protocol === 'mongodb:'` (so `mongodb+srv:` is refused), there is exactly one host (no `,` in the authority), and the hostname is `127.0.0.1`, `localhost` or `[::1]`. Else `{ ok: false, reason }` with reasons `unset`, `not-a-url`, `srv-scheme`, `multi-host`, `not-local`.
  - On `ok: false`: write `mcp-mongo-local: refused (<reason>) — set FOODVIBE_MCP_MONGO_URI to the local mongodb://127.0.0.1:27017/<db> URI` to **stderr** (stdout is the MCP channel), never the URI itself, and exit 2.
  - On `ok: true`: spawn `npx -y mongodb-mcp-server@3.2.2` with `stdio: 'inherit'` (on Windows `npx.cmd` with `shell: true`; every argument is a literal, none comes from input) and a child env = the parent env minus every `MDB_MCP_*` key, plus `MDB_MCP_CONNECTION_STRING=<uri>`, `MDB_MCP_READ_ONLY=true`, `MDB_MCP_DISABLED_TOOLS=atlas`, `MDB_MCP_TELEMETRY=disabled`, `DO_NOT_TRACK=1`. Exit with the child's code; forward SIGINT / SIGTERM to the child.
  - Before writing the spawn, confirm the four `MDB_MCP_*` names in the 3.2.2 README (`npm view mongodb-mcp-server@3.2.2 readme`); if a name differs, use the documented one and note it under Execution Notes.
- [ ] `.mcp.json` (left as `{ "mcpServers": {} }` by plan 528) gets one server: `"mongodb-local": { "command": "node", "args": ["scripts/mcp-mongo-local.mjs"] }` — no `env` block, so no value lives in git.
- [ ] `.claude/settings.json`: `enableAllProjectMcpServers` stays `false`; nothing is pre-approved (the Human approves it once in `/mcp`).
- [ ] `docs/brain/decisions/0028-read-only-local-mongodb-mcp.md`: context (throw-away inspection scripts), decision (pinned `mongodb-mcp-server@3.2.2`, read-only, local-only launcher, own variable, never Atlas or production), extends ADR 0001 (lean native workflow: one dev tool, no service) and ADR 0002 (file-based memory: the MCP reads data, it stores no memory), rejected (Atlas read-only access; a shared `MONGO_*` variable; `@latest`), consequences (a version bump is a plan).
- [ ] `AGENTS.md` hard rules: one line — "The `mongodb-local` MCP server is read-only and local-only (`scripts/mcp-mongo-local.mjs`, ADR 0028); never point it, or any MCP server, at Atlas or a production URI."
- [ ] `docs/brain/index.md`: one line under decisions for ADR 0028.

### Should Have (P1)
- [ ] `docs/workflow-kit/manifest.json` / `manifest.md`: entries for `scripts/mcp-mongo-local.mjs` and its test (`"tier": "project"`, `"action": "stay"`, notes "Plan 529: local-only read-only Mongo MCP launcher"), and for the ADR if `kit-manifest-check` asks.

### Nice to Have (P2)
- [ ] none.

## UI/UX Notes
- No app UI. No dictionary keys.

## Human setup (the `[human]` steps — never done by an agent; the agent never reads or prints the value)
1. In PowerShell, set the variable once to the same local URI that `MONGO_LOCAL_URI` holds in `server/.env`
   (replace `<db>` with the local database name):
   `[Environment]::SetEnvironmentVariable("FOODVIBE_MCP_MONGO_URI", "mongodb://127.0.0.1:27017/<db>", "User")`
2. Close and reopen the terminal, start Claude Code in the main folder, run `/mcp` and approve `mongodb-local`.

## Atomic Sub-tasks
- [ ] A1: Write the local-only launcher — `checkLocalUri`, the stderr refusal, the spawn with the cleaned env and the four `MDB_MCP_*` settings, signal forwarding; confirm the env names against the 3.2.2 README first — scripts/mcp-mongo-local.mjs
- [ ] A2: Prove the guard — `node:test` cases: `mongodb://127.0.0.1:27017/foodvibe` ok; `mongodb://localhost/foodvibe` ok; `''` → `unset`; `mongodb+srv://x.mongodb.net/db` → `srv-scheme`; `mongodb://a:1,b:2/db` → `multi-host`; `mongodb://10.0.0.5:27017/db` → `not-local`; `not a url` → `not-a-url`; and running the script with `FOODVIBE_MCP_MONGO_URI=mongodb+srv://x.mongodb.net/db` (spawned with `process.execPath`) exits 2 with `refused (srv-scheme)` on stderr and nothing on stdout — scripts/test/mcp-mongo-local.test.mjs
- [ ] A3: Register the server without a value in git — the `mongodb-local` entry; confirm `settings.json` needs no change and leave it untouched if so — .mcp.json, .claude/settings.json
- [ ] A4: Record the decision — ADR 0028, the AGENTS.md hard-rule line, the brain index line — docs/brain/decisions/0028-read-only-local-mongodb-mcp.md, AGENTS.md, docs/brain/index.md
- [ ] A5: Keep the kit manifest true — classify the new files; `node scripts/kit-manifest-check.mjs` exits 0 — docs/workflow-kit/manifest.json, docs/workflow-kit/manifest.md
- [ ] A6: Run every `[auto]` check and paste the outputs under Execution Notes; list the two Human setup steps in the hand-off

## What happens when
- The variable is unset or points anywhere but the local machine: the launcher exits 2 with the reason on stderr; `/mcp` shows `mongodb-local` as failed; nothing connects.
- The local MongoDB is not running: the MCP server starts and its tools return the driver's connection error; nothing else is affected.
- An agent asks for a write: the tool does not exist in read-only mode, so the call is refused by the client.
- A worktree slot session: `.mcp.json` is the same file, so the same rule applies (local only, the variable is user-level).

## Technical Considerations
- Dependencies: `npx` and network access on first start (the package is fetched once into the npm cache); MongoDB on `127.0.0.1:27017` (`scripts/preflight.mjs` already checks the port).
- New files needed: `scripts/mcp-mongo-local.mjs`, `scripts/test/mcp-mongo-local.test.mjs`, `docs/brain/decisions/0028-read-only-local-mongodb-mcp.md`.
- Model changes: none.
- Backend / API: none.
- Auth and validation: the launcher validates its one input (the URI) and refuses anything not local.
- Security surface: a new local tool with read access to the local dev database only; no secret in git (the value is a user-level variable); Atlas unreachable by construction (scheme + host check, its own variable, Atlas tools disabled, `MDB_MCP_*` scrubbed from the inherited env).
- Data / migration: none.
- Project checks: no app or server code, so the log-query item is not needed; Reuse Check present; no dictionary keys.

## Out of Scope
- Render MCP (deferred by the Human). Any Atlas or production connection, read-only or not. Pre-approving the server in `settings.json`. Cursor's `.cursor/mcp.json` (kit `managed`).

## Critical Questions
- none

## Execution Notes
- Planner 2026-11-07 (brief 2, item A6). Chose a launcher script over a plain `.mcp.json` entry so that "cannot reach Atlas even if `MONGO_URI` is set" holds by construction (a `${VAR}` entry passes any string through). The local database name is not in any tracked file (`server/.env.example` has no `MONGO_*` line; plan 530 adds it), so the Human fills `<db>` in setup step 1.
